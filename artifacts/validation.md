# Contract-address update: validation and design review

Complete for the stated scope. Added the requester's $PLEA contract address to the existing site, preserved its visual system and simulator, and rebuilt the static export. These are worker self-checks, not independent certification.

## Scope and assumptions

- Request: `Add ca $PLEA 0x93fdf8024C69e33F820Bd0f7C90b209dDd447b6c`.
- Ethereum follows the existing project/network. A read-only chain check returned chain ID `0x1`, nonempty contract code and ERC-20 symbol `PLEA`. Public RPC source: `https://ethereum-rpc.publicnode.com`. No transaction was sent. Token mechanics and liquidity were not audited.
- Changed surfaces: metadata, header contract link, hero address/copy/explorer group, final contract action, footer address, and wording that previously implied the token address was unavailable. The existing read-only wallet implementation and demo scoring stay intact.
- The token contract is distinct from the unconfigured CabalGate integration. No ABI, sale calldata, recipient or new contract address was invented. The site continues to label its simulations and illustrative receipt as demos.
- Visual idea: a PLEA court file, using orange actions, paper surfaces, sharp borders, hard offset shadows and stamped jury verdicts.

## Assignment coverage

| Requirement | Result and evidence |
| --- | --- |
| Add the supplied $PLEA address | Met: complete checksummed text in the hero and footer; four exact Ethereum token explorer links; clipboard readback equals the supplied value |
| Usable website and responsive primary interactions | Met: 16/16 interaction groups; preserved navigation, scoring, simulation and wallet disclosure |
| Source, lockfile and static `dist/index.html` with local/relative assets | Met: existing manifest/lockfile preserved; inline CSS/JS/fonts/favicon; adjacent `./share.png` loads at `/preview/share.png` |
| Production build, typecheck and interaction validation | Met: build/typecheck exit 0; script and actual results retained |
| Better Interface six-domain review and fixes | Met for the changed surfaces; coverage and limitations below |
| First screen at 390px, title/favicon/description/OG metadata | Met: 390 × 844 screenshot shows product, primary action, full address and copy; all five metadata fields present |
| Root `DESIGN.md` from final implementation | Met: tokens, typography, contract components, responsive behavior and verification limits documented |
| README install, preview and rebuild instructions | Met: normal and external-toolchain commands included |
| 8 MiB submission and protected paths | Met: conservative whole-tree file audit and exact export hashes are in `export-manifest.json`; protected configuration and dependencies unchanged; `.gitignore` retains evidence within its explicit 256-byte budget |

## Better Interface: six domains

The pinned contents/workflow, core principles of all six domains, document-web-design section, design-critic definitions and wallet reference were read. The wallet reference informed scope assessment; this address update adds no wallet or transaction flow and does not replace the accepted connector.

| Domain | Coverage | Evidence and remaining limits |
| --- | --- | --- |
| Accessibility | Checked | Native button and link, explicitly named group, visible label included in button name, polite persistent feedback, normal Tab order, Enter activation, full-value manual selection/focus, 44px copy target. Axe: zero WCAG A/AA violations in mobile, fallback and desktop states. Screen-reader speech and forced-colors rendering not verified. |
| Layout | Checked | Address and controls remain in normal flow; logical leading border/inset; wrapping action row; full value preserved. No page overflow at 320, 390, 719, 720, 979, 980, 1190, 1440px. Contract also reflows with 26px label text in an RTL document. Native zoom and full-site RTL audit not verified. |
| Writing | Checked | “Copy address”, “View on Etherscan”, “Address copied.” and manual-copy recovery state their actual outcomes. Token “coming soon” claims removed. Letter integration remains explicitly unconfigured. No statement claims the supplied address enables live selling. |
| Typography | Checked | Existing 13px data role, IBM Plex Mono and six-size scale reused. A natural `<wbr>` prevents a one-character orphan; copied `textContent` is unchanged. LTR isolates the address in RTL. No clipping, abbreviation, ellipsis or reduced-size address. Physical iOS input behavior not verified. |
| Colors | Checked | Existing tokens reused. Computed text contrast: address/copy/explorer ink on paper 16.13:1; feedback muted on paper 6.05:1; footer secondary on night 10.28:1. Text accompanies every copy state. No theme was added; existing unrelated color combinations are not a new exhaustive audit. |
| UI | Checked | Existing neutral secondary-action styling, sharp corners, orange leading rule and underlined explorer link. Success does not move the following artwork. Clipboard rejection and absent API select the address, show an instruction and allow retry. No new motion; reduced-motion probe passes. Animation-panel slow-motion replay not performed. |

## Findings, corrections and rechecks

| Severity/domain | Source and finding | Correction and evidence |
| --- | --- | --- |
| Medium / writing | `src/index.html:8`, `:33`, `:57`, `:158`: token metadata, header, hero and footer still described the contract as coming soon | Replaced with current contract copy, full address and exact Etherscan destinations. Export tests confirm all four URLs and no old token-placeholder text. CabalGate's separate status is explicit at `src/index.html:140`. |
| Medium / accessibility and UI | `src/contract.ts:14`: a Clipboard API-only action would fail on denied permissions or insecure static-hosting origins | Catch unavailable/denied clipboard access, focus and select the complete address, explain manual copy and re-enable the button. Both rejection and missing-API branches passed; retry succeeds. Screenshot: `screenshots/copy-fallback-390.png`. |
| Low / typography | `src/index.html:59`, `src/style.css:92`: the initial 390px render wrapped only the final `c` onto its own line | Added a `<wbr>` after the first 20 hexadecimal digits in hero/footer. Final mobile screenshot shows two useful chunks; clipboard and selection still equal the original 42-character address. |
| Low / accessibility | `src/index.html:57`, `:61`: the address grouping needed explicit semantics and the copy name needed the visible label intact | Added `role="group"`; button name is “Copy address for $PLEA”. Browser snapshot exposes the named group, code, button, link and status. Keyboard and axe checks pass. |
| Low / writing | `src/index.html:158`: the probe flagged an inherited footer em dash | Replaced it with the existing middle-dot separator vocabulary. Final `glyphs` probe check passes. |

No unresolved blocking defect was found in the address update. The five raw probe flags below remain recorded rather than being represented as passes.

## Pinned taste probe

Final result: **11/16 raw checks passed**. Passed: render, layout, targets, contrast, tracking, type-sizes, type-faces, glyphs, copy-budget, motion and share. Raw output is `taste-checks.json`.

| Retained flag | Decision and source |
| --- | --- |
| casing | Existing uppercase rule data, case tags and verdict stamps remain part of the established court-document design (`src/index.html:77`, `:88`, `:129`). New contract labels use natural casing and preserve checksum case. |
| eyebrows | The probe identifies the letter salutation, clock label and four fact-data labels (`src/index.html:72`, `:129`, `:156`). They identify the existing illustration/data, not newly added marketing kickers. No heading kicker was added with the contract. |
| slogans | The whole-page heuristic counts short sentences in the inherited rules, demo, quoted plea and tagline. Those sections are retained for this bounded address task. The mobile first screen has 23 prose words, below the 60-word threshold. |
| repetition | The required tagline is repeated at the ending and the illustrative plea appears in both the letter and receipt (`src/index.html:54`, `:73`, `:140`, `:158`). Both retain the established composition. |
| chrome | The original request explicitly asks for “2px borders” and “hard black offset shadows (6px 6px 0)”. These intentional shared treatments remain. The new copy button uses a border without a shadow. |

The probe reports two existing controls below its comfortable 44px threshold; all measured controls meet its 24px/spacing requirement. Both new contract actions are at least 44px high. The six-size/three-family/three-weight system passes. The existing stamp loop stops under reduced motion.

## Actual commands and outcomes

All commands ran from the repository root unless using the explicit external dependency prefix. The exact repeatable commands are in README.

| Command/check | Actual outcome |
| --- | --- |
| `npm ci --prefix /tmp/plea-ca-toolchain --cache /tmp/plea-ca-npm-cache --no-audit --no-fund` after copying the existing manifest/lockfile | Exit 0, 20 packages installed externally; repository dependencies unchanged |
| `PLEA_TOOLS=/tmp/plea-ca-toolchain npm run typecheck` | Exit 0, strict `tsc --noEmit` wrapper |
| `PLEA_TOOLS=/tmp/plea-ca-toolchain npm run build` | Exit 0, final `dist/index.html` 507,210 bytes; `dist/share.png` retained |
| `PLEA_TOOLS=/tmp/plea-ca-toolchain PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-ca-browsers node scripts/validate.mjs` | Exit 0, 16/16 groups, detailed JSON retained |
| `IMD_PLAYWRIGHT=/tmp/plea-ca-toolchain/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/tmp/plea-ca-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | Exit 0, measured 16 checks, 11 passed and five evaluated above; screenshot/measurement run completed |
| Browser tool, final `/preview/` export | Desktop screenshot, named-group snapshot, actual copy success, keyboard navigation, zero console errors/warnings, one successful local startup document request |
| `git diff --check` | Exit 0 |

The initial timer fixture attempted to install a virtual clock after the application's interval existed. Reloading after installing the virtual clock fixed the test; accelerated expiration and reset then passed. No product timer changes were made. The final source was rebuilt and all interaction/probe checks rerun after the last markup correction.

The explorer popup test uses a local interception to assert the exact destination and `noopener`; no external explorer availability claim is made. Clipboard success writes and reads Chromium's real clipboard. Denied permissions and missing APIs are deliberate fixtures. The clock advances virtually; there is no 33-hour real-time wait.

## Rendered evidence

- `screenshots/mobile-390.png`: 390 × 844, final first screen. Read the rules spans y=337.14–383.14; full address y=428.94–470.53; Copy address y=482.53–526.53.
- `screenshots/viewport-320.png`: narrow first screen, no horizontal overflow.
- `screenshots/viewport-1440.png`: desktop first screen, header contract link, complete address and controls.
- `screenshots/copied-390.png`: keyboard-triggered copy success with visible focus and persistent status.
- `screenshots/copy-fallback-390.png`: complete address visibly selected, focused, with manual-copy instruction.

These are actual production screenshots inspected during the task. They use reduced motion; the pinned probe separately checked normal/reduced-motion behavior. The temporary pinned inputs and scratch outputs are not build dependencies.

## Limitations

WebKit installation completed, but launch failed because required host system libraries were missing. Safari rendering and interactions remain unverified. No physical phone, screen reader, native 200% zoom, native wallet handoff, real extension connection, ENS/balance lookup, live sale, external Etherscan content or social crawler was tested. Axe's `aria-prohibited-attr` and `color-contrast` incomplete results still require manual assistive-technology/contrast review outside the changed solid-color contract surfaces. No full accessibility compliance claim is made.

The source/export are complete for adding and using the supplied address. Hosting/publication is performed after this submission; no publish command or on-chain deployment was run.
