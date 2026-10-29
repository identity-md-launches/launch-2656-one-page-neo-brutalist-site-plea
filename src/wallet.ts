import { createPublicClient, http, type Address } from 'viem';
import { mainnet } from 'viem/chains';

export type RpcRequest = { method: string; params?: readonly unknown[] | Record<string, unknown> };
export type Provider = {
  request: (request: RpcRequest) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean; isRabby?: boolean; isCoinbaseWallet?: boolean; providers?: Provider[];
};
type Wallet = { id: string; name: string; provider: Provider };
type Discovery = { info: { uuid: string; name: string; rdns: string }; provider: Provider };

const ALLOWED_METHODS = new Set(['eth_accounts', 'eth_requestAccounts', 'eth_chainId', 'eth_getBalance', 'wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_revokePermissions']);
export const BLOCKED_METHODS = Object.freeze(['personal_sign', 'eth_sign', 'eth_signTypedData', 'eth_signTypedData_v3', 'eth_signTypedData_v4', 'eth_sendTransaction', 'eth_sendRawTransaction', 'eth_signTransaction', 'wallet_sendCalls', 'wallet_grantPermissions']);

export async function readOnlyRequest(provider: Provider, request: RpcRequest): Promise<unknown> {
  // Fail closed: unknown methods are also blocked, including future signing or spending methods.
  if (BLOCKED_METHODS.includes(request.method) || !ALLOWED_METHODS.has(request.method)) {
    throw new Error(`PLEA is read-only before launch. Blocked wallet method: ${request.method}`);
  }
  return provider.request(request);
}

export function formatEtherBalance(hex: unknown): string {
  if (typeof hex !== 'string' || !/^0x[0-9a-f]+$/i.test(hex)) throw new Error('Invalid balance response');
  const wei = BigInt(hex);
  // Round with integer arithmetic; do not lose precision by converting wei to Number.
  const units = (wei + 50_000_000_000_000n) / 100_000_000_000_000n;
  return `${units / 10_000n}.${String(units % 10_000n).padStart(4, '0')} ETH`;
}

const STORAGE_KEY = 'plea:read-only-wallet';
const MAINNET_RPC = 'https://ethereum-rpc.publicnode.com';
const CHAIN_NAMES: Record<string, string> = { '0x1': 'Ethereum', '0xa': 'Optimism', '0x89': 'Polygon', '0xa4b1': 'Arbitrum One', '0x2105': 'Base', '0x38': 'BNB Smart Chain', '0xaa36a7': 'Sepolia', '0x64': 'Gnosis' };
const ethClient = createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC, { timeout: 5000, retryCount: 0 }) });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const shorten = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const normalizeChain = (value: unknown) => {
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) throw new Error('Wallet returned an invalid network.');
  return `0x${BigInt(value).toString(16)}`;
};
const validAccounts = (value: unknown): string[] => Array.isArray(value) ? value.filter((a): a is string => typeof a === 'string' && /^0x[0-9a-f]{40}$/i.test(a)) : [];

export function setupWallet() {
  const trigger = el<HTMLButtonElement>('wallet-trigger');
  const panel = el('wallet-panel');
  const options = el('wallet-options');
  const details = el('wallet-details');
  const message = el('wallet-message');
  const wallets: Wallet[] = [];
  let active: Wallet | null = null;
  let address = '';
  let chain = '';
  let ens = '';
  let ensState = 'Looking up…';
  let balance = 'Reading balance…';
  let busy = false;
  let epoch = 0;
  let restoreStarted = false;
  let restoreId = '';
  try { restoreId = localStorage.getItem(STORAGE_KEY) || ''; } catch { /* Private mode: connection still works. */ }

  const setMessage = (text: string) => { message.textContent = text; };
  const persist = (id: string) => {
    restoreId = id;
    try { if (id) localStorage.setItem(STORAGE_KEY, id); else localStorage.removeItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
  };

  function setOpen(open: boolean, returnFocus = false) {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) { render(); el<HTMLButtonElement>('wallet-close').focus(); }
    else if (returnFocus) trigger.focus();
  }

  function row(name: string, sublabel: string, action: (() => void) | null, letter = name[0]) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'wallet-row';
    const chip = Object.assign(document.createElement('span'), { className: 'wallet-letter', textContent: letter });
    chip.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.append(Object.assign(document.createElement('span'), { className: 'wallet-row-name', textContent: name }), Object.assign(document.createElement('span'), { className: 'wallet-sublabel', textContent: sublabel }));
    const arrow = Object.assign(document.createElement('span'), { className: 'wallet-row-arrow', textContent: '↗' }); arrow.setAttribute('aria-hidden', 'true');
    button.append(chip, copy, arrow);
    button.disabled = busy || !action;
    if (action) button.addEventListener('click', action);
    return button;
  }

  function openInWallet(name: string) {
    const here = window.location.href;
    if (!/^https?:/.test(here)) { setMessage('Open the hosted page in your wallet browser to connect.'); return; }
    const url = name === 'MetaMask' ? `https://link.metamask.io/dapp/${here.replace(/^https?:\/\//, '')}` : name === 'Coinbase Wallet' ? `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here)}` : 'https://rabby.io';
    if (name === 'Rabby') { setMessage('Open Rabby’s browser and paste this page’s URL. Rabby’s site opens in a new tab.'); }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function render() {
    const connected = Boolean(active && address);
    trigger.classList.toggle('connected', connected);
    el('wallet-dot').classList.toggle('green', connected);
    const label = el('wallet-label');
    if (connected) {
      label.replaceChildren();
      if (ens) label.append(Object.assign(document.createElement('span'), { className: 'wallet-name', textContent: ens }));
      label.append(Object.assign(document.createElement('span'), { className: 'wallet-address', textContent: shorten(address) }), Object.assign(document.createElement('span'), { className: 'wallet-balance', textContent: balance }));
      trigger.setAttribute('aria-label', `${ens ? `${ens}, ` : ''}${shorten(address)}, ${balance}. Wallet details`);
    } else {
      label.textContent = busy ? 'Connecting…' : 'Connect wallet';
      trigger.removeAttribute('aria-label');
    }
    el('wallet-title').textContent = connected ? 'Wallet details' : 'Connect a wallet';
    el('network-warning').hidden = !(connected && chain && chain !== '0x1');
    el('network-name').textContent = CHAIN_NAMES[chain] || `Chain ${chain}`;
    options.hidden = connected; details.hidden = !connected;
    if (connected) {
      const data = document.createElement('dl'); data.className = 'wallet-data';
      for (const [name, value] of [['Address', address], ['ENS', ens || ensState], ['Balance', balance], ['Network', CHAIN_NAMES[chain] || `Chain ${chain}`], ['Wallet', active!.name]]) {
        const group = document.createElement('div');
        group.append(Object.assign(document.createElement('dt'), { textContent: name }), Object.assign(document.createElement('dd'), { textContent: value }));
        data.append(group);
      }
      const disconnectButton = Object.assign(document.createElement('button'), { type: 'button', className: 'button disconnect-button', textContent: 'Disconnect' });
      disconnectButton.addEventListener('click', () => { void disconnect(); });
      details.replaceChildren(data, disconnectButton);
    } else {
      options.replaceChildren();
      for (const wallet of wallets) options.append(row(wallet.name, busy ? 'Waiting for wallet…' : 'Detected · read-only', () => { void connect(wallet, false); }));
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
      const names = [
        ['MetaMask', 'io.metamask'], ['Rabby', 'io.rabby'], ['Coinbase Wallet', 'com.coinbase.wallet'],
      ];
      for (const [name, id] of names) {
        if (wallets.some(wallet => wallet.id === id || wallet.name.toLowerCase().includes(name.split(' ')[0].toLowerCase()))) continue;
        options.append(row(name, isMobile ? 'Open this page in the wallet app' : 'Not detected · install or unlock wallet', () => {
          if (isMobile) openInWallet(name);
          else setMessage(`${name} is not detected. Install or unlock its extension, then reopen this page. You can play the demo without a wallet.`);
        }));
      }
      options.append(row('WalletConnect', 'Unavailable before launch · use a browser wallet', null, 'W'));
    }
  }

  function detach() {
    if (!active) return;
    active.provider.removeListener?.('accountsChanged', onAccounts);
    active.provider.removeListener?.('chainChanged', onChain);
    active.provider.removeListener?.('disconnect', onDisconnect);
  }

  function clear() {
    ++epoch; detach(); active = null; address = ''; chain = ''; ens = ''; balance = ''; busy = false;
    persist(''); render();
    el('network-error').textContent = '';
  }

  async function refresh() {
    if (!active || !address) return;
    const version = ++epoch;
    const wallet = active;
    const account = address as Address;
    ens = ''; ensState = 'Looking up…'; balance = chain === '0x1' ? 'Reading balance…' : 'Switch to Ethereum';
    render();
    const jobs: Promise<void>[] = [];
    if (chain === '0x1') jobs.push((async () => {
      try {
        const value = await readOnlyRequest(wallet.provider, { method: 'eth_getBalance', params: [account, 'latest'] });
        if (version === epoch) balance = formatEtherBalance(value);
      } catch { if (version === epoch) balance = 'Balance unavailable'; }
    })());
    jobs.push((async () => {
      try {
        // Viem's Universal Resolver performs forward verification of the reverse record.
        const result = await ethClient.getEnsName({ address: account });
        if (version === epoch) { ens = result || ''; ensState = 'No primary name'; }
      } catch { if (version === epoch) ensState = 'Lookup unavailable'; }
    })());
    await Promise.allSettled(jobs);
    if (version === epoch) render();
  }

  async function connect(wallet: Wallet, restore: boolean) {
    if (busy || active) return;
    busy = true; setMessage(''); render();
    const version = ++epoch;
    try {
      const accounts = validAccounts(await readOnlyRequest(wallet.provider, { method: restore ? 'eth_accounts' : 'eth_requestAccounts' }));
      if (version !== epoch) return;
      if (!accounts.length) {
        busy = false;
        if (restore) persist(''); else setMessage('No account was shared. Unlock your wallet and try again.');
        render(); return;
      }
      const network = normalizeChain(await readOnlyRequest(wallet.provider, { method: 'eth_chainId' }));
      if (version !== epoch) return;
      detach(); active = wallet; address = accounts[0]; chain = network; busy = false;
      wallet.provider.on?.('accountsChanged', onAccounts);
      wallet.provider.on?.('chainChanged', onChain);
      wallet.provider.on?.('disconnect', onDisconnect);
      persist(wallet.id); render();
      if (!restore) setOpen(false, true);
      void refresh();
    } catch (error) {
      if (version !== epoch) return;
      busy = false;
      if (restore) persist('');
      else setMessage(walletError(error));
      render();
    }
  }

  async function disconnect() {
    const previous = active;
    clear(); setMessage('Disconnected from this page.');
    const version = epoch;
    if (previous) {
      try { await readOnlyRequest(previous.provider, { method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); }
      catch { if (version === epoch) setMessage('Disconnected here. This wallet cannot revoke permissions automatically; remove PLEA in its connected-sites settings if needed.'); }
    }
    if (version === epoch) el<HTMLButtonElement>('wallet-close').focus();
  }

  function onAccounts(value: unknown) {
    const accounts = validAccounts(value);
    if (!accounts.length) { clear(); setMessage('Wallet disconnected. Connect again when ready.'); return; }
    address = accounts[0]; void refresh();
  }
  function onChain(value: unknown) {
    try { chain = normalizeChain(value); el('network-error').textContent = ''; void refresh(); }
    catch { clear(); setMessage('Wallet returned an invalid network. Reconnect to try again.'); }
  }
  function onDisconnect() { clear(); setMessage('Wallet disconnected. Reconnect to try again.'); }

  async function switchNetwork() {
    if (!active) return;
    const wallet = active;
    const version = epoch;
    const button = el<HTMLButtonElement>('switch-network');
    button.disabled = true; el('network-error').textContent = '';
    try {
      try { await readOnlyRequest(wallet.provider, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] }); }
      catch (error) {
        if (errorCode(error) !== 4902) throw error;
        await readOnlyRequest(wallet.provider, { method: 'wallet_addEthereumChain', params: [{ chainId: '0x1', chainName: 'Ethereum Mainnet', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [MAINNET_RPC], blockExplorerUrls: ['https://etherscan.io'] }] });
        // Adding a network does not guarantee switching to it.
        await readOnlyRequest(wallet.provider, { method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
      }
      if (active !== wallet) return;
      chain = normalizeChain(await readOnlyRequest(wallet.provider, { method: 'eth_chainId' }));
      if (chain !== '0x1') el('network-error').textContent = 'Still on another network. Select Ethereum in your wallet and try again.';
      void refresh();
    } catch (error) {
      if (active === wallet && version <= epoch) el('network-error').textContent = walletError(error);
    } finally { button.disabled = false; }
  }

  function discover(detail: Discovery) {
    if (!detail?.provider || typeof detail.provider.request !== 'function' || !detail.info || typeof detail.info.name !== 'string' || typeof detail.info.rdns !== 'string') return;
    const known = wallets.find(wallet => wallet.provider === detail.provider);
    if (known) return;
    const wallet: Wallet = { id: detail.info.rdns || detail.info.uuid, name: detail.info.name.slice(0, 80), provider: detail.provider };
    if (!wallet.id) return;
    wallets.push(wallet);
    if (!panel.hidden) render();
    if (!restoreStarted && restoreId === wallet.id) { restoreStarted = true; void connect(wallet, true); }
  }

  window.addEventListener('eip6963:announceProvider', event => discover((event as CustomEvent<Discovery>).detail));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  function discoverLegacy() {
    const ethereum = (window as Window & { ethereum?: Provider }).ethereum;
    if (!ethereum) return;
    for (const provider of ethereum.providers || [ethereum]) {
      if (wallets.some(wallet => wallet.provider === provider)) continue;
      const name = provider.isRabby ? 'Rabby' : provider.isCoinbaseWallet ? 'Coinbase Wallet' : provider.isMetaMask ? 'MetaMask' : 'Browser wallet';
      const id = provider.isRabby ? 'io.rabby' : provider.isCoinbaseWallet ? 'com.coinbase.wallet' : provider.isMetaMask ? 'io.metamask' : 'browser-wallet';
      discover({ info: { name, rdns: id, uuid: id }, provider });
    }
  }
  window.setTimeout(discoverLegacy, 200);
  window.addEventListener('ethereum#initialized', discoverLegacy);
  trigger.addEventListener('click', () => { discoverLegacy(); window.dispatchEvent(new Event('eip6963:requestProvider')); setOpen(Boolean(panel.hidden)); });
  el('wallet-close').addEventListener('click', () => setOpen(false, true));
  el('switch-network').addEventListener('click', () => { void switchNetwork(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); setOpen(false, true); }
  });
  document.addEventListener('pointerdown', event => {
    if (!panel.hidden && !panel.contains(event.target as Node) && !trigger.contains(event.target as Node)) setOpen(false);
  });
  // This is a nonmodal dropdown: Tab can leave it, then it closes without stealing focus.
  document.addEventListener('focusin', event => {
    if (!panel.hidden && !panel.contains(event.target as Node) && !trigger.contains(event.target as Node)) setOpen(false);
  });
  render();
}

function errorCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'code' in error) return Number(error.code);
  return undefined;
}
function walletError(error: unknown): string {
  const code = errorCode(error);
  if (code === 4001) return 'Request cancelled in your wallet. You can try again.';
  if (code === -32002) return 'A wallet request is already open. Check your wallet extension.';
  return 'The wallet request failed. Unlock your wallet, check its network, and try again.';
}
