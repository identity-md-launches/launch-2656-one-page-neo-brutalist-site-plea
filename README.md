# PLEA

A one-page, neo-brutalist launch site for **PLEA ($PLEA)**, a sell-gated meme token on Uniswap v4.

**Buying is open. Selling needs a plea.**

The deliverable is [dist/index.html](dist/index.html). Its CSS, JavaScript, four local font files, favicon and interface artwork are embedded. The adjacent [dist/share.png](dist/share.png) is the 1200 × 630 social preview image. There is no framework runtime, backend, analytics, remote image or remote font request. The page works at a static-hosting subpath, including an IPFS gateway path.

## Install, build and preview

Use Node.js 22 or later and npm:

```sh
npm ci
npm run typecheck
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/preview/`. The preview also serves `/`. Set `PORT` to choose a different local port. Publish the **contents of `dist/` together**, without changing the relative `./share.png` URL. No server-side route rewrites are needed; navigation uses section anchors.

The production build uses esbuild to compile TypeScript and inline its output, CSS and local WOFF2 fonts into one HTML file. It needs no network after dependencies are installed. The pinned package versions and full dependency graph are in `package.json` and `package-lock.json`.

For a workspace that prohibits dependency directories inside the repository, install the same manifest and lockfile into an external directory and set `PLEA_TOOLS` to that directory when running the scripts. This was how the worker installed and built the project; no dependency directory or cache is included in the submission.

The original share-card generator is also included. Regeneration is optional; the PNG is already present and ordinary builds do not require a browser:

```sh
npx playwright install chromium
npm run share-card
npm run build
```

## Source map

| Path | Purpose |
| --- | --- |
| `src/index.html` | All nine sections, metadata, original copy, static receipt and demo board |
| `src/style.css` | Tokens, three font families, responsive layouts, interaction states and reduced-motion rules |
| `src/scoring.ts` | Fact thresholds, UTF-8 validation, deterministic demo jury and clock formatting |
| `src/main.ts` | Inputs, seat progression, verdicts, fact meter and countdown |
| `src/wallet.ts` | EIP-6963 discovery, EIP-1193 fallback, read-only request guard, connection lifecycle and ENS |
| `src/assets/` | Local font sources/licenses and the generated share PNG |
| `scripts/` | Build, typecheck, preview and share-card generation |
| `dist/` | Finished static export; retained alongside its source |
| `DESIGN.md` | Implemented design system and responsive behavior |
| `artifacts/validation.md` | Six-domain review, actual checks, fixes, limitations and evidence |

## Try the interactions

1. **Read the rules** jumps to the four rule cards. The full scoring table opens below the fact bar.
2. **Play the simulation** works without a wallet. Initially, 1M PLEA is 10% of a fixed 10M demo bag. At 21 days, a loss and a falling market, the facts total 32 and Need is 37. The default plea produces a granted demo verdict.
3. Change the amount chips, days, position, profit percentage or trend. Fact points and Need update. Both the 50%-of-bag and 2.5M-Token caps apply, making Max 25% for this illustrative bag.
4. The counter measures **UTF-8 bytes**, not characters. Empty, multiline, over-280-byte and hidden-character pleas give field-level errors. A plea containing **“give me 50”** runs but scores zero in every seat, including when trying the split-panel scenario.
5. **Try a hung panel** sets an eligible demo position with Fact 41 / Need 28 and a 15–15 split. It preserves the plea text. Change the inputs or replay to explore another verdict.
6. **Jump to final 10s** demonstrates the dead-man rule. The clock stops at zero and disables jumping; **Reset clock** restarts the 33-hour demo. This is elapsed-time based, including after a background tab resumes.
7. **Connect wallet** opens the read-only picker. Close it with ×, Escape, an outside click, or Tab out. An installed wallet can share its address, display balance/ENS, switch to Ethereum and disconnect. No wallet is needed for the rest of the page.

## Launch status and consequential assumptions

The contract is **coming soon**. No PLEA contract, deployment address, ABI, executable sale calldata, recipient or project ID has been fabricated. **Live at launch** remains disabled. The letter receipt, players, prizes, jury results and countdown are visibly marked as demo data. Protocol constants are presented as the supplied rules, not live measurements. Connected-wallet values come from the chosen wallet/public ENS lookup and are never replaced by sample balances.

The demo uses deterministic illustrative scores, not AI judges. Its stated interpretation of quorum is 17 scores meeting Need for approval, 17 below for denial, and neither for a hung panel. The displayed mean is explanatory, not a claim about the eventual contract’s aggregation method. The brief did not define a trend sampling interval; the simulator labels −2% to +2% as flat and >2% as up. The fact bar states its two scales: hatching is Fact / 41; the marker is Need on the judge’s 0–45 scale, clamped visually at the end if Need exceeds 45.

The WalletConnect row is deliberately unavailable before launch. The pinned connector guidance permits wiring its relay only with a supplied project ID, and none was supplied. Native MetaMask, Rabby, Coinbase and other announced EIP-6963 providers work without one. On a phone, absent-wallet rows offer opening the hosted page in MetaMask/Coinbase or instructions for Rabby’s browser. Coinbase Smart Wallet/passkey creation is not bundled; the brief’s native, read-only provider flow takes precedence over the background wagmi example.

### Wallet boundary

Every app-to-wallet request passes through `readOnlyRequest`. Only accounts, chain ID, balance, chain switching/adding, and permission revocation are allowed. All signature, transaction, permit-related/unknown methods are rejected before reaching the provider, including the complete forbidden-method list in the brief. No token approvals or spending functions exist.

Only the selected wallet’s discovery identifier is stored locally. Reload uses `eth_accounts`, never an automatic connection prompt. Zero accounts or provider disconnection clears local state. Disconnect attempts `wallet_revokePermissions` and explains how to revoke manually if unsupported. ENS is resolved on Ethereum through a public RPC using viem’s Universal Resolver flow; lookup failure falls back to the address and an explicit unavailable state. Balance is read via `eth_getBalance` on Ethereum and rounded to four decimals with integer arithmetic.

## Actual validation

Validation ran against the production export, including a nested gateway path, rather than a development bundle.

| Check | Result |
| --- | --- |
| Production build | Passed, exit 0; self-contained HTML and adjacent PNG generated |
| TypeScript strict typecheck | Passed, exit 0 |
| Clean lockfile install outside the repository | Passed with `npm ci` |
| Pure logic and Chromium interaction groups | 21/21 passed; score boundaries, validation, all verdicts, countdown, wallet guard and lifecycle |
| Additional interaction/layout groups | 5/5 passed; legacy provider, read failures, revoke fallback, keyboard focus, text enlargement and RTL reflow |
| Automated accessibility | No WCAG A/AA violations in axe scans at 390 and 1440, and in the granted state |
| Pinned taste probe | 10/16 raw checks passed; six brief-directed presentation/copy flags reviewed in `artifacts/validation.md` |
| Reflow | No horizontal overflow at 320, 390, 720, 979, 980 and 1440; first-screen product and primary actions present at 390 |
| Startup resources | No script errors, missing local files or external startup requests |
| WebKit | Attempted; browser could not launch because this machine lacks WebKit system libraries |

Worker commands included `PLEA_TOOLS=/tmp/plea-toolchain npm run build`, `PLEA_TOOLS=/tmp/plea-toolchain npm run typecheck`, the bounded Playwright scripts in `test/scratch/`, and:

```sh
IMD_PLAYWRIGHT=/tmp/plea-toolchain/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-browsers \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

The pinned probe and temporary fixtures are assignment inputs/scratch and are removed before submission. Their actual results, review and final screenshots are recorded under `artifacts/`; the screenshots use reduced motion to hold decorative stamps still. These are worker self-checks, not an independent certification.

**Not verified:** Safari/WebKit rendering, physical phones, screen-reader speech, native browser 200% zoom, real extension permissions, mobile deep-link handoff, live ENS/RPC availability, or social-network crawler behavior. The 200% check enlarged CSS text tokens and is not a native browser zoom test. Wallet lifecycle and successful ENS cases used controlled EIP-1193/RPC fixtures; no real wallet signed or transacted.

## Submission budget and attribution

The submission is below the **8,388,608-byte** limit, including source, lockfile, export, font licenses, screenshots and documentation. See `artifacts/export-manifest.json` for final export hashes and the size audit. `.gitignore` has an explicit **256-byte path budget** and is 178 bytes; its rules exclude dependency/cache directories at every nesting level and temporary browser/scratch outputs, while retaining source and `dist/`. No package archives, registry mirror, submodule, node_modules or package-manager cache is delivered. Protected repository paths were not modified.

Design work applied the supplied Better Interface guidance by Jakub Krehel (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and its documentation adaptation from Paul Bakaus’s Impeccable (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Notices are retained in `artifacts/design-guidance-LICENSE.txt`. Fonts retain their OFL notices in `src/assets/`. Bundled dependency notices are in `artifacts/DEPENDENCY-LICENSES.txt`. The gavel, letter artwork and share-card composition are original code-based assets.
