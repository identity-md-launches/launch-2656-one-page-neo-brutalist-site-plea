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
3. Change the amount chips, days, position, profit percentage or trend. Fact points and Need update. Empty, out-of-range or step-invalid numeric fields show an incomplete position and clear the breakdown and meter until corrected. Both the 50%-of-bag and 2.5M-Token caps apply, making Max 25% for this illustrative bag.
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

The current revision was checked against the rebuilt production export at a nested `/preview/` path. All five reviewer findings were reproduced and fixed; per-finding responses are in [.imd-responses.json](.imd-responses.json). Detailed coverage, measurements and limitations are in [artifacts/validation.md](artifacts/validation.md), with machine-readable results in [artifacts/revision/checks.json](artifacts/revision/checks.json).

| Check | Current revision result |
| --- | --- |
| Production build | Passed, exit 0; self-contained HTML and adjacent PNG generated |
| TypeScript strict typecheck | Passed, exit 0 |
| Clean lockfile install outside the repository | Passed with `npm ci`; no manifest or lockfile changes |
| Chromium regression and interaction groups | 12/12 passed; motion overflow, responsive components, tokens, numeric input recovery, all verdicts, UTF-8 validation, keyboard/wallet disclosure, clock and metadata |
| Animation reflow | 201 animation frames at each of 320, 390, 719, 720, 979, 980 and 1440px; no horizontal overflow; natural 4.3-second loops also passed at 320, 390 and 1440px |
| Automated accessibility | Zero axe WCAG A/AA violations in mobile, incomplete-input mobile and desktop states; two manual-review items per scan remain |
| Pinned taste probe | 10/16 raw checks passed; six retained presentation/copy flags evaluated in `artifacts/validation.md` |
| First screen at 390px | Product and Read the rules visible; primary action ends at y=383.14px in an 844px viewport |
| Startup resources | No script errors, failed local files or external startup requests |
| WebKit | Launch attempted; runtime dependencies unavailable, so no WebKit validation claimed |

Commands run for this revision:

```sh
PLEA_TOOLS=/tmp/plea-revision-toolchain npm run build
PLEA_TOOLS=/tmp/plea-revision-toolchain npm run typecheck
PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-revision-browsers \
node test/scratch/revision-checks.mjs
IMD_PLAYWRIGHT=/tmp/plea-revision-toolchain/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-revision-browsers \
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

The bounded regression fixture and pinned probe are temporary assignment inputs/scratch; they are removed before submission. Their actual results and final screenshots are retained under `artifacts/`. Screenshots use reduced motion; the separate animation tests ran with motion enabled. These are worker self-checks, not independent certification. An initial outside-click test targeted text covered by the open wallet panel; using the exposed page gutter corrected that fixture, and all twelve groups passed on rerun without a product change.

**Not verified in this revision:** Safari/WebKit rendering, physical phones, screen-reader speech, native browser zoom, RTL or enlarged text, real extension connections, ENS/RPC responses, mobile deep-link handoff, or social-network crawler behavior. Wallet code was outside the reported defects; this revision checked its disclosure controls only. No real wallet signed or transacted. The original accepted round's broader fixture results are not claimed as fresh checks.

## Submission budget and attribution

The submission is below the **8,388,608-byte** limit, including source, lockfile, export, font licenses, screenshots and documentation. See `artifacts/export-manifest.json` for final export hashes and the size audit. `.gitignore` has an explicit **256-byte path budget** and is 178 bytes; its rules exclude dependency/cache directories at every nesting level and temporary browser/scratch outputs, while retaining source and `dist/`. No package archives, registry mirror, submodule, node_modules or package-manager cache is delivered. Protected repository paths were not modified.

Design work applied the supplied Better Interface guidance by Jakub Krehel (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and its documentation adaptation from Paul Bakaus’s Impeccable (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Notices are retained in `artifacts/design-guidance-LICENSE.txt`. Fonts retain their OFL notices in `src/assets/`. Bundled dependency notices are in `artifacts/DEPENDENCY-LICENSES.txt`. The gavel, letter artwork and share-card composition are original code-based assets.
