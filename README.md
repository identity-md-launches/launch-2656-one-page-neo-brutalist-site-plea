# PLEA

A one-page, neo-brutalist launch site for **PLEA ($PLEA)**, a sell-gated meme token on Uniswap v4.

**Buying is open. Selling needs a plea.**

$PLEA contract on **Ethereum**: [`0x93fdf8024C69e33F820Bd0f7C90b209dDd447b6c`](https://etherscan.io/token/0x93fdf8024C69e33F820Bd0f7C90b209dDd447b6c). The page displays the full address, offers **Copy address**, and links to Etherscan from the header, address block, final action and footer.

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
| `src/contract.ts` | Exact-address clipboard copy, persistent feedback and manual-copy recovery |
| `scripts/validate.mjs` | Reproducible production-export interaction and accessibility checks |
| `src/wallet.ts` | EIP-6963 discovery, EIP-1193 fallback, read-only request guard, connection lifecycle and ENS |
| `src/assets/` | Local font sources/licenses and the generated share PNG |
| `scripts/` | Build, typecheck, preview and share-card generation |
| `dist/` | Finished static export; retained alongside its source |
| `DESIGN.md` | Implemented design system and responsive behavior |
| `artifacts/validation.md` | Six-domain review, actual checks, fixes, limitations and evidence |

## Try the interactions

1. **Copy address** copies the full checksummed $PLEA address. If clipboard access is denied or unavailable, the page selects the full address and explains how to copy manually. **View on Etherscan** opens the Ethereum token page in a separate tab.
2. **Read the rules** jumps to the four rule cards. The full scoring table opens below the fact bar.
3. **Play the simulation** works without a wallet. Initially, 1M PLEA is 10% of a fixed 10M demo bag. At 21 days, a loss and a falling market, the facts total 32 and Need is 37. The default plea produces a granted demo verdict.
4. Change the amount chips, days, position, profit percentage or trend. Fact points and Need update. Empty, out-of-range or step-invalid numeric fields show an incomplete position and clear the breakdown and meter until corrected. Both the 50%-of-bag and 2.5M-Token caps apply, making Max 25% for this illustrative bag.
5. The counter measures **UTF-8 bytes**, not characters. Empty, multiline, over-280-byte and hidden-character pleas give field-level errors. A plea containing **“give me 50”** runs but scores zero in every seat, including when trying the split-panel scenario.
6. **Try a hung panel** sets an eligible demo position with Fact 41 / Need 28 and a 15–15 split. It preserves the plea text. Change the inputs or replay to explore another verdict.
7. **Jump to final 10s** demonstrates the dead-man rule. The clock stops at zero and disables jumping; **Reset clock** restarts the 33-hour demo. This is elapsed-time based, including after a background tab resumes.
8. **Connect wallet** opens the read-only picker. Close it with ×, Escape, an outside click, or Tab out. An installed wallet can share its address, display balance/ENS, switch to Ethereum and disconnect. No wallet is needed for the rest of the page.

## Launch status and consequential assumptions

The supplied $PLEA token address is now displayed throughout the site. A read-only Ethereum RPC check returned chain ID 1, nonempty bytecode and symbol `PLEA`. This check establishes the address/network match; it does not verify the token economics or CabalGate integration. The page remains a read-only launch site: **Live at launch** is disabled, and CabalGate’s address/ABI/calldata are not configured. The letter receipt, players, prizes, jury results and countdown remain labelled as demo data. This address update does not require a wallet connection or prompt a signature.

The demo uses deterministic illustrative scores, not AI judges. Its stated interpretation of quorum is 17 scores meeting Need for approval, 17 below for denial, and neither for a hung panel. The displayed mean is explanatory, not a claim about the eventual contract’s aggregation method. The brief did not define a trend sampling interval; the simulator labels −2% to +2% as flat and >2% as up. The fact bar states its two scales: hatching is Fact / 41; the marker is Need on the judge’s 0–45 scale, clamped visually at the end if Need exceeds 45.

The WalletConnect row is deliberately unavailable before launch. The pinned connector guidance permits wiring its relay only with a supplied project ID, and none was supplied. Native MetaMask, Rabby, Coinbase and other announced EIP-6963 providers work without one. On a phone, absent-wallet rows offer opening the hosted page in MetaMask/Coinbase or instructions for Rabby’s browser. Coinbase Smart Wallet/passkey creation is not bundled; the brief’s native, read-only provider flow takes precedence over the background wagmi example.

### Wallet boundary

Every app-to-wallet request passes through `readOnlyRequest`. Only accounts, chain ID, balance, chain switching/adding, and permission revocation are allowed. All signature, transaction, permit-related/unknown methods are rejected before reaching the provider, including the complete forbidden-method list in the brief. No token approvals or spending functions exist.

Only the selected wallet’s discovery identifier is stored locally. Reload uses `eth_accounts`, never an automatic connection prompt. Zero accounts or provider disconnection clears local state. Disconnect attempts `wallet_revokePermissions` and explains how to revoke manually if unsupported. ENS is resolved on Ethereum through a public RPC using viem’s Universal Resolver flow; lookup failure falls back to the address and an explicit unavailable state. Balance is read via `eth_getBalance` on Ethereum and rounded to four decimals with integer arithmetic.

## Actual validation: contract-address update

Production build and strict TypeScript typecheck both passed, exit 0. The final export was tested at a nested `/preview/` path with Chromium. `scripts/validate.mjs` passed **16/16** groups: metadata and exact links; responsive reflow; keyboard order/focus; real clipboard write/read; denied and absent clipboard recovery; explorer popup navigation; rule/disclosure navigation; granted/denied/hung simulations; input recovery and UTF-8 bytes; wallet disclosure; accelerated clock expiration/reset; automated accessibility; measured contract text contrast; doubled-label/RTL address reflow; and startup resources.

At **390 × 844**, Read the rules ends at **383.14px** and Copy address ends at **526.53px**. The product, full contract and main actions are visible on the first screen. Reflow checks found no horizontal scroll at **320, 390, 719, 720, 979, 980, 1190 and 1440px**. Axe found zero WCAG A/AA violations in mobile, clipboard-fallback and desktop states; each scan also reported two items needing manual review. These automated results do not establish full accessibility compliance.

The pinned taste probe passed **11/16 raw checks**. Five retained flags concern the existing document/stamp vocabulary, repeated required tagline/example, and mandated border-plus-shadow style. Each is evaluated in [artifacts/validation.md](artifacts/validation.md); the raw output is [artifacts/taste-checks.json](artifacts/taste-checks.json). The six-domain Better Interface review, corrections and limitations are also recorded there. [artifacts/checks.json](artifacts/checks.json) contains interaction measurements and [artifacts/screenshots/](artifacts/screenshots/) contains actual final-state screenshots.

To repeat the delivered interaction checks after a normal install:

```sh
npx playwright install chromium webkit
node scripts/validate.mjs
```

The script starts and closes its own local static server, runs Chromium against the production export, and attempts WebKit. It writes `artifacts/checks.json` and screenshots. The pinned taste script is an assignment input and is not retained as a dependency of the site.

Actual worker commands used an external installation of the unchanged manifest/lockfile:

```sh
mkdir -p /tmp/plea-ca-toolchain
cp package.json package-lock.json /tmp/plea-ca-toolchain/
npm ci --prefix /tmp/plea-ca-toolchain --cache /tmp/plea-ca-npm-cache --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-ca-browsers \
  /tmp/plea-ca-toolchain/node_modules/.bin/playwright install chromium webkit
PLEA_TOOLS=/tmp/plea-ca-toolchain npm run typecheck
PLEA_TOOLS=/tmp/plea-ca-toolchain npm run build
PLEA_TOOLS=/tmp/plea-ca-toolchain PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-ca-browsers \
  node scripts/validate.mjs
IMD_PLAYWRIGHT=/tmp/plea-ca-toolchain/node_modules/playwright/index.mjs \
  PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-ca-browsers \
  node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

**Limitations:** WebKit was downloaded but could not launch because required host system libraries are absent; Safari behavior was not checked. Physical phones, screen-reader speech, native browser zoom, real extension connections, ENS/balance responses, mobile wallet handoff, live trades, and social crawler behavior were not checked. The explorer navigation test intercepted its destination locally and did not validate Etherscan’s remote content. Clipboard success used Chromium’s real API; permission rejection and absent-API cases were deliberately simulated. The first clock fixture installed its virtual clock after the page’s timer already existed; installing before reloading corrected that fixture and the final run passed. No product timer change was required.

## Submission budget and attribution

The final source, existing manifest/lockfile, runtime assets and committed static export fit within the **8,388,608-byte** submission limit. Exact export hashes, file sizes and a repository file-budget audit are in [artifacts/export-manifest.json](artifacts/export-manifest.json). `.gitignore` has an explicit **256-byte path budget**. Its artifact exceptions retain the required validation outputs; the dependency/cache exclusions follow those exceptions and apply at every nesting level. See the manifest for the final ignore-file size. Dependencies and browser binaries used for this work are outside the repository. No package archives, registry mirror, caches, submodules, private credentials or dependency directories are delivered. Protected repository paths are unchanged.

Design work applied the pinned Better Interface guidance by Jakub Krehel (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and its documentation adaptation from Paul Bakaus’s Impeccable (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Their licenses are retained in `artifacts/design-guidance-LICENSE.txt`. Fonts retain their OFL notices in `src/assets/`. The gavel, letter artwork and share-card composition are existing code-based assets.
