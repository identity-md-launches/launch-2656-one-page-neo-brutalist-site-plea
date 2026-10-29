import { RULES, getFacts, inspectPlea, makeScores, getVerdict, formatClock, type Inputs, type DemoScenario, type Position, type Trend } from './scoring';
import { setupWallet } from './wallet';

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

const form = element<HTMLFormElement>('plea-form');
const amount = element<HTMLInputElement>('amount');
const days = element<HTMLInputElement>('days');
const position = element<HTMLSelectElement>('position');
const profit = element<HTMLInputElement>('profit');
const trend = element<HTMLSelectElement>('trend');
const plea = element<HTMLTextAreaElement>('plea');
const run = element<HTMLButtonElement>('run-simulation');
const split = element<HTMLButtonElement>('split-panel');
const fields = element<HTMLFieldSetElement>('demo-fields');
const seats = element<HTMLOListElement>('seat-grid');
const verdict = element('verdict-area');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let meterVisible = false;
let running = false;
let runNumber = 0;
let resultShown = false;

function readInputs(): Inputs {
  return { amount: amount.valueAsNumber, days: days.valueAsNumber, position: position.value as Position, profit: profit.valueAsNumber, trend: trend.value as Trend };
}

function positionValid(): boolean {
  return amount.checkValidity() && days.checkValidity() && (position.value !== 'profit' || profit.checkValidity());
}

function updateFacts() {
  const isProfit = position.value === 'profit';
  element('profit-field').hidden = !isProfit;
  profit.disabled = !isProfit;
  for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-share]')) {
    const requested = chip.dataset.share === 'max' ? Math.min(RULES.demoBag * .5, RULES.maxSale) : RULES.demoBag * Number(chip.dataset.share) / 100;
    // Max and 25% are equivalent for this bag; retain only the last selected chip.
    if (requested !== amount.valueAsNumber) {
      chip.classList.remove('active');
      chip.setAttribute('aria-pressed', 'false');
    }
  }
  if (!positionValid()) return;
  const facts = getFacts(readInputs());
  for (const key of ['share', 'held', 'pnl', 'trend'] as const) element(`${key}-score`).textContent = `+${facts[key]}`;
  element('share-description').textContent = `${Number(facts.percent.toFixed(4))}% of bag`;
  element('held-description').textContent = `${days.valueAsNumber} ${days.valueAsNumber === 1 ? 'day' : 'days'}`;
  element('pnl-description').textContent = position.value === 'profit' ? `Up ${profit.value}%` : position.value === 'loss' ? 'At a loss' : 'Breakeven';
  element('trend-description').textContent = trend.value === 'up' ? 'Rising >2%' : trend.value === 'flat' ? 'Flat' : 'Falling';
  element('fact-total').replaceChildren(document.createTextNode(String(facts.total)), Object.assign(document.createElement('span'), { textContent: ' / 41' }));
  element('need-fact').textContent = String(facts.total);
  element('need-score').textContent = String(facts.need);
  element('meter-fact').textContent = String(facts.total);
  element('meter-need').textContent = String(facts.need);
  element('marker-value').textContent = String(facts.need);
  element('need-marker').classList.toggle('at-edge', facts.need > 42);
  element('fact-meter').setAttribute('aria-label', `Demo fact score ${facts.total} of 41; required plea score ${facts.need} of 45${facts.need > 45 ? ', above the maximum judge score' : ''}`);
  if (meterVisible) {
    element('fact-fill').style.width = `${facts.total / RULES.maxFact * 100}%`;
    element('need-marker').style.left = `calc(${Math.min(facts.need / 45 * 100, 100)}% - 3px)`;
  }
}

function updatePlea() {
  const check = inspectPlea(plea.value);
  element('byte-count').textContent = `${check.bytes}/280`;
  element('byte-count').classList.toggle('over', check.bytes > 280);
  const checks: [string, boolean, string][] = [
    ['line', check.oneLine, 'One line'],
    ['hidden', !check.hidden, 'No hidden chars'],
    ['score', !check.manipulation, 'No “give me 50” (scores 0)'],
  ];
  for (const [id, good, text] of checks) {
    element(`check-${id}`).textContent = `${good ? '✓' : '×'} ${text}`;
    element(`check-${id}`).classList.toggle('invalid', !good);
  }
  if (check.bytes > 280) plea.setAttribute('aria-invalid', 'true');
  else if (element('plea-error').hidden) plea.removeAttribute('aria-invalid');
}

function resetSeats() {
  seats.replaceChildren(...Array.from({ length: RULES.judges }, (_, i) => {
    const seat = document.createElement('li');
    seat.className = 'seat';
    seat.setAttribute('aria-label', `Judge ${i + 1}: waiting`);
    const number = document.createElement('span');
    number.className = 'seat-number';
    number.textContent = String(i + 1).padStart(2, '0');
    seat.append(number);
    return seat;
  }));
  element('seat-progress').textContent = '00 / 30';
}

function resetResult() {
  if (!resultShown) return;
  resultShown = false;
  resetSeats();
  element('jury-state').textContent = 'PENDING';
  element('jury-instruction').textContent = 'Inputs changed. Play again for a new demo verdict.';
  verdict.replaceChildren(paragraph('The floor is yours.', 'pending-copy'), paragraph('Your next run uses the updated facts.', 'muted'));
}

function paragraph(text: string, className = ''): HTMLParagraphElement {
  return Object.assign(document.createElement('p'), { textContent: text, className });
}

function fieldError(input: HTMLInputElement | HTMLTextAreaElement, message: string) {
  const target = element(`${input.id}-error`);
  target.textContent = message;
  target.hidden = !message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validate(): boolean {
  const bad: (HTMLInputElement | HTMLTextAreaElement)[] = [];
  const numericChecks: [HTMLInputElement, boolean, string][] = [
    [amount, Number.isFinite(amount.valueAsNumber) && amount.valueAsNumber > 0 && amount.valueAsNumber <= RULES.maxSale && amount.valueAsNumber <= RULES.demoBag * .5 && Number.isInteger(amount.valueAsNumber), 'Enter a whole amount from 1 to 2,500,000 PLEA.'],
    [days, days.checkValidity() && Number.isFinite(days.valueAsNumber), 'Enter whole days from 0 to 36,500.'],
    [profit, position.value !== 'profit' || (profit.checkValidity() && Number.isFinite(profit.valueAsNumber)), 'Enter a profit from 0 to 1,000,000%.'],
  ];
  for (const [input, valid, message] of numericChecks) {
    fieldError(input, valid ? '' : message);
    if (!valid) bad.push(input);
  }
  const check = inspectPlea(plea.value);
  const errors: string[] = [];
  if (!plea.value.trim()) errors.push('Write a one-line plea first.');
  if (check.bytes > 280) errors.push(`Remove ${check.bytes - 280} UTF-8 bytes to fit 280.`);
  if (!check.oneLine) errors.push('Keep your plea on one line.');
  if (check.hidden) errors.push('Remove hidden characters or control characters.');
  fieldError(plea, errors.join(' '));
  if (!check.valid) bad.push(plea);
  bad[0]?.focus();
  return bad.length === 0;
}

async function playSimulation(scenario: DemoScenario = 'normal') {
  if (running || !validate()) return;
  const manipulation = inspectPlea(plea.value).manipulation;
  if (scenario === 'split' && !manipulation) {
    amount.value = '1000000'; days.value = '21'; position.value = 'loss'; trend.value = 'up';
    updateFacts(); updatePlea();
  }
  running = true; resultShown = false;
  const currentRun = ++runNumber;
  const scores = makeScores(plea.value, scenario);
  const facts = getFacts(readInputs());
  fields.disabled = true; run.disabled = true; split.disabled = true;
  run.textContent = 'The Cabal is reading…';
  element('jury-state').textContent = 'PENDING';
  element('jury-instruction').textContent = manipulation ? 'Requests for 50 score zero in every seat.' : scenario === 'split' ? 'Demo split: facts set to 41. Fifteen for, fifteen against.' : 'One seat at a time. Every score is simulated.';
  element('jury-panel').setAttribute('aria-busy', 'true');
  verdict.replaceChildren(paragraph('Reading the record…', 'pending-copy'));
  resetSeats();
  for (let i = 0; i < scores.length; i++) {
    if (!motion.matches) await new Promise(resolve => window.setTimeout(resolve, 90));
    if (currentRun !== runNumber) return;
    const seat = seats.children[i] as HTMLLIElement;
    const score = scores[i];
    seat.className = `seat filled ${score < 20 ? 'denied' : score < 35 ? 'appeal' : 'granted'}`;
    seat.textContent = String(score);
    seat.setAttribute('aria-label', `Judge ${i + 1}: ${score} out of 45, ${score >= facts.need ? 'meets' : 'below'} Need ${facts.need}`);
    element('seat-progress').textContent = `${String(i + 1).padStart(2, '0')} / 30`;
  }
  const result = getVerdict(scores, facts.need);
  const stamp = document.createElement('span');
  stamp.className = `stamp ${result.status === 'hung' ? 'appeal' : result.status}`;
  stamp.textContent = result.status === 'hung' ? 'HUNG PANEL' : result.status.toUpperCase();
  const resultText = paragraph(`Mean score ${result.average} / 45 · Need ${facts.need}`, 'verdict-score');
  const agreement = paragraph(`${result.yes} meet Need · ${result.no} below · quorum ${RULES.quorum}`, 'verdict-detail');
  const next = document.createElement('div');
  next.className = 'verdict-result';
  if (result.status === 'granted') {
    next.append(Object.assign(document.createElement('span'), { className: 'tag sold', textContent: 'SOLD' }), paragraph('7 minutes', 'mono'));
  } else if (result.status === 'denied') {
    next.append(paragraph('One appeal. Make it count.', 'verdict-detail'));
  } else {
    next.append(paragraph('Under 17 agree. No verdict. No sale.', 'verdict-detail'));
  }
  verdict.replaceChildren(stamp, resultText, agreement, next, paragraph(result.status === 'granted' ? 'Demo outcome only. No tokens were sold.' : 'Demo verdict. Nothing was sent to the chain.', 'muted'));
  element('jury-state').textContent = result.status === 'hung' ? 'HUNG' : result.status.toUpperCase();
  element('jury-panel').setAttribute('aria-busy', 'false');
  fields.disabled = false; run.disabled = false; split.disabled = false;
  run.innerHTML = 'Play again <span aria-hidden="true">→</span>';
  running = false; resultShown = true;
}

form.addEventListener('submit', event => { event.preventDefault(); void playSimulation(); });
split.addEventListener('click', () => { void playSimulation('split'); });
for (const input of [amount, days, position, profit, trend, plea]) {
  input.addEventListener('input', () => {
    if (running) return;
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) fieldError(input, '');
    updateFacts(); updatePlea(); resetResult();
  });
}
for (const chip of document.querySelectorAll<HTMLButtonElement>('[data-share]')) {
  chip.addEventListener('click', () => {
    amount.value = String(chip.dataset.share === 'max' ? Math.min(RULES.maxSale, RULES.demoBag * .5) : RULES.demoBag * Number(chip.dataset.share) / 100);
    for (const peer of document.querySelectorAll<HTMLButtonElement>('[data-share]')) {
      const active = peer === chip;
      peer.classList.toggle('active', active); peer.setAttribute('aria-pressed', String(active));
    }
    fieldError(amount, ''); updateFacts(); resetResult();
  });
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { meterVisible = true; updateFacts(); observer.disconnect(); }
  }, { threshold: .25 });
  observer.observe(element('fact-meter'));
} else meterVisible = true;

const clockCard = element('countdown').closest('.clock-card') as HTMLElement;
const jump = element<HTMLButtonElement>('jump-clock');
let deadline = Date.now() + 33 * 3600 * 1000;
let clockState = 'running';
function updateClock() {
  const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  element('countdown').textContent = formatClock(seconds);
  const nextState = seconds === 0 ? 'dead' : seconds < 3600 ? 'urgent' : 'running';
  if (clockState !== nextState) {
    clockState = nextState;
    clockCard.classList.toggle('urgent', nextState === 'urgent');
    clockCard.classList.toggle('dead', nextState === 'dead');
    element('clock-status').textContent = nextState === 'dead' ? 'Cabal dead, selling open forever' : nextState === 'urgent' ? 'Less than 1 hour. The Cabal is running out of time.' : 'Time left without a signed verdict.';
    element('clock-dot').classList.toggle('green', nextState === 'running');
    element('clock-dot').style.background = nextState === 'running' ? '' : 'var(--red)';
    jump.disabled = nextState === 'dead';
  }
}
jump.addEventListener('click', () => { deadline = Date.now() + 10_000; updateClock(); });
element('reset-clock').addEventListener('click', () => { deadline = Date.now() + 33 * 3600 * 1000; updateClock(); });
document.addEventListener('visibilitychange', updateClock);
window.setInterval(updateClock, 250);

// Keep each player's three scores visible when the wide table column collapses.
for (const row of document.querySelectorAll<HTMLTableRowElement>('.leaderboard tbody tr')) {
  const best = document.createElement('span');
  best.className = 'mobile-best';
  best.textContent = `Best three: ${row.cells[2].textContent}`;
  row.cells[1].append(best);
}

resetSeats(); updateFacts(); updatePlea(); updateClock(); setupWallet();
