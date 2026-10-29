# PLEA design system

## Overview

PLEA is a launch page for a sell-gated meme token. Its visual idea is a paper case file brought before a jury: large type, numbered rules, plain form fields, a seat grid, receipts and sharply stamped verdicts. The interface uses the brief’s neo-brutalist direction throughout. Documentary detail sits below the marketing headline; controls and simulated data are explicitly labelled.

The source of truth is `src/style.css`, supported by the static markup in `src/index.html` and state handlers in `src/main.ts` and `src/wallet.ts`. The export in `dist/index.html` inlines those sources after compilation.

## Colors

Primary tokens are declared at `src/style.css:6`.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#F3F1E7` | Page, neutral buttons, input and jury backgrounds |
| `--ink` | `#151515` | Main text, structural borders, clock and receipt data surfaces |
| `--orange` | `#FF6A1F` | Logo, primary actions, selected percentage chip, fact hatching, clock shadow |
| `--green` | `#1FBF5B` | Granted stamps, connected dot, high judge scores, paid prize |
| `--red` | `#E5484D` | Denied/overruled surfaces, low scores, urgent clock, footer disclaimer |
| `--violet` | `#8B5CF6` | Appeal/hung states and middle judge-score tier |
| `--sky` | `#38BDF8` | Sold chip and keyboard focus on dark surfaces |
| `--surface` | `#FFFDF7` | Paper cards, form, receipt and leaderboard |
| `--muted` | `#5B5B52` | Secondary text on light backgrounds |
| `--line` | `#D3D0C4` | Receipt/table separators and decorative filler lines |
| `--soft` | `#E7E4D8` | Section grouping, inactive seats and disabled launch control |
| `--night` | `#121212` | Final section |
| `--error` | `#AD1E27` | Readable field and wallet errors on light backgrounds |

The appeals section uses `#EAE6F2`; the winning table row uses `#EFEFE0`. Dark secondary text is `#C3C0B5` or `#BBB8AF`. Status labels use ink; the violet variant uses `#000` to keep small score text legible while preserving the exact violet fill. Colors always have text/numeric counterparts; green alone does not mean approval.

Measured examples: ink/orange 6.38:1, ink/green 7.53:1, ink/red 4.67:1, ink/sky 8.52:1, muted/paper 6.05:1, error/surface 6.90:1. The exact rendered contrast checks and the violet correction are documented in validation. The page has one light theme and a deliberate dark ending, not a theme switch.

## Typography

All four WOFF2 sources live in `src/assets/` and are embedded as data URLs by the build. No font service runs in the browser.

| Family | Weights used | Role |
| --- | --- | --- |
| Space Grotesk | 700 | Logo, headings, quote, major figures, stamps |
| Inter | 400, 600, 700 | Prose, navigation, inputs and action labels |
| IBM Plex Mono | 400, 600 | Labels, case data, score readouts, addresses, table numbers, countdown and footer |

Inter’s variable file supplies its used weights. Fallbacks are Arial/sans-serif and monospace. There are no synthesized italics. `font-synthesis:none` and root font smoothing are applied. The receipt footnote returns to Inter for readable prose.

The desktop type scale has six values: label **13px**, body **16px**, lead **20px**, card **28px**, title **48px**, display **96px**. Display changes to 80px at 1190px, 72px below 980px, and 48px below 720px. Below 720px, section titles become 28px and card titles 20px. Fixed 28px paper/stamp/logo details reuse that scale. Inputs remain 16px or greater. The timer uses the display step.

Body line-height is 1.6; hints use 1.5; heading line-height is 1.01–1.2. Display tracking is −.065em/−.06em; section headings −.05em; card headings −.035em. Body text is naturally spaced. Headings balance their lines; prose uses pretty wrapping. Changing numbers use tabular figures. Wallet addresses wrap in the detail view; only the compact header address is shortened, with the full address immediately available in the dropdown.

## Layout

`.wrap` centers content at a maximum outer width of 1280px. Inline gutters are 40px on desktop, 32px below 980px, 20px below 720px, and 16px below 360px. The header has its own 1440px maximum. Section padding is 100px, 76px and 56px at the same broad desktop/tablet/mobile tiers. Common gaps are 8, 12, 16, 20, 24, 32 and 40px; paper/card interiors use 18–32px.

| Breakpoint | Behavior |
| --- | --- |
| Above 1190px | Full header including contract pill; 96px hero; two-column feature areas |
| 1190px and below | Header contract pill hides; 80px display; more compact card/panel spacing |
| Below 980px | Hero, demo, letter, objection block and clock stack; main content order remains copy/form before artwork/results |
| Below 720px | Navigation hides; rule, appeal and fact-example cards stack; receipt key/value rows stack; 48px hero; 28px section headings |
| Below 720px, board | Best-three column becomes a labelled line under each player; all eight records and all three scores remain visible |
| Below 360px | 16px gutters, smaller internal gaps; decorative case number hides |

Fact-example cards use four columns at 980px and above, two from 720px to 979px, and one below 720px. The six-column jury seat grid remains legible at 320px. The table uses fixed column proportions and wraps player names rather than clipping them. On phones, the rotated PRIZE PAID stamp has a 48px width and wraps at its space into two readable words. The contract badge, rule tags, objection timeline and demo marker can wrap under enlarged text. The wallet dropdown stays under the trigger, fits within the viewport and scrolls internally on short screens. It is a nonmodal disclosure, not a backdrop dialog.

Revision checks covered widths 320, 390, 719, 720, 979, 980 and 1440, including every 20ms of the four-second hero animation and the 390px first screen. The accepted initial round recorded separate CSS-token text-enlargement and RTL reflow checks at 390px; this revision did not repeat them. Native 200% browser zoom and physical mobile devices were not verified.

## Elevation & depth

`--border` is `2px solid #151515`; `--shadow` is `6px 6px 0 #000`. Borders establish the page’s structure, and hard offset shadows deliberately coexist with them. No gradient, blur or soft shadow is used.

The logo, stamps and clock buttons reuse the 2px border and 6px hard black shadow tokens. The black clock card retains its orange shadow at 6px 6px with zero blur. The hero has an offset orange backing sheet and a paper layer rotated 3° on desktop / 2° on mobile. Its container clips horizontal decorative overflow while preserving the 2.3→1 stamp animation and four-second loop. The logo rotates −2.5°, verdict stamps −9°, appeal stamps −7°, and the receipt 1° on larger screens. Header stacking is 10, wallet panel 30, skip link 100; the header itself is not sticky.

## Shapes

Surfaces, fields, tags and actions have sharp corners. The only circles are the requested tiny status dots. A badge called a “pill” in the brief is implemented as a square bordered badge to preserve the no-rounding direction. Timeline markers are 18px squares. All icons are inline SVG with no icon font or external image.

## Components

| Pattern/source | Use and states |
| --- | --- |
| `.button`, `src/style.css` | Orange primary, neutral secondary, dark outlined secondary; 48px baseline height; press translates 3px and reduces shadow to 1px over 100ms; hover and visible keyboard focus |
| `.logo`, `src/index.html` | Orange rotated wordmark, white gavel, hard shadow; links to the top |
| `.contract-pill`, `.tag` | Static launch information, rule data and labelled statuses; status hue never replaces a textual label |
| `.rule-card`, `.number-square` | Number-first rule explanation, body copy, then tag group; two to one columns |
| `.field`, `.amount-chips` | Real labels, native selects/required number fields; selected chip uses orange and `aria-pressed`; errors are associated with inputs and focus the first invalid control; incomplete or invalid numeric positions clear all points and Need, hide the meter fill/marker and display a completion hint until valid values return |
| `.plea-field`, `inspectPlea` | Multilingual entry with UTF-8 byte count, format checklist and recoverable errors; a score-manipulation phrase yields zero scores rather than a fake success |
| `.seat-grid`, `playSimulation` | Ordered 30-seat list; 90ms fill cadence with 180ms seat pop; red below 20, violet 20–34, green 35+; every filled seat has its numeric score and accessible label |
| `.verdict-area` | Polite atomic live region; pending, granted, denied and hung states; score, Need and quorum counts accompany the stamp; SOLD is explicitly demo-only |
| `.fact-meter-panel` | SVG hatch pattern, thick Need marker, plain-language scale description and numerical readouts; 1.1s width/position transition after scroll entry |
| `.receipt` | Key/value receipt illustration, green plea string on ink, non-executable demo addresses and method |
| `.leaderboard` | Semantic table with header scopes, eight sample rows, orange first rank and green prize stamp; no actual payout implied |
| `.clock-card`, `updateClock` | Tabular elapsed-time countdown; under one hour the timer is red and its red indicator blinks; zero clamps and stops jumping; reset is explicit |
| `.wallet-panel`, `setupWallet` | Discovery, absent-wallet help, pending, error, connected details, wrong-chain warning and disconnect; letter chips; closes on ×/Escape/outside/Tab out |

Keyboard focus is a 3px ink outline with 4px offset, replaced by sky on dark actions. The wallet close target is 44px and receives focus on opening; Escape returns focus to the trigger. Unsupported revocation is explained without keeping the page connected. Requests never pass the wallet guard unless allowlisted.

The hero stamp loops every 4 seconds from scale 2.3 to 1. Seat/chip transitions take 150–180ms. With `prefers-reduced-motion:reduce`, all animations/transitions and smooth scrolling stop; the jury completes without stagger delays. Values and verdicts still update. No meaning depends on motion.

## Do’s and don’ts

- Begin another content block with `.wrap` / `.section`, a sentence-case heading and one explanatory paragraph. Reuse the six type roles and existing gutters.
- Use orange for a primary action or selected chip, and the status colors for their named verdicts. Put black text on violet score tiles.
- Keep protocol rules, simulations and real connected-wallet data distinct. Preserve “coming soon” until an actual contract is supplied.
- Preserve all three score values when adapting the board. Preserve full addresses in wallet details.
- Do not add rounded cards, gradients, blurred shadows, icon fonts, remote font loaders, decorative kicker headings or a new color system.
- Do not add signing, approval, permit or transaction methods to the pre-launch wallet allowlist.

For another section, add semantic markup to `src/index.html`, reuse the nearest existing component, keep new interaction state in a TypeScript module, then rebuild the self-contained export and check its mobile layout. The current system is a set of CSS/DOM patterns, not a React component library.
