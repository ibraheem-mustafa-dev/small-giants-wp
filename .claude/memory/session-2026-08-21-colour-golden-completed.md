---
doc_type: session-archive
project: small-giants-wp
date: 2026-08-21
note: "Moved VERBATIM out of LEDGER.md to keep it under its 24,576-byte cap. All COMPLETE work, already single-sourced to decisions.md, the commits and the linked reports. Nothing edited or dropped."
---

# Colour-golden track — completed sections, 2026-08-21

### ✅ CONTAINER + SHOP WORK — COMPLETE 2026-08-21

Full detail: `.claude/reports/2026-08-21-HANDOVER-container-and-shop-completion.md`.
Commits `0843567d` `669bc1e5` `40411532` `f5e184d5` `38fa1324` `1a127c06`, all deployed
and live-verified.

Four defects were ONE bug: band CSS (`max-width` + `margin-inline:auto`) painted on the
container's OUTER box. Fixed by routing band properties to a dedicated band selector.
- **P2-1 CLOSED** — container background no longer capped (`max-width: 1280px` → `none`).
- Product cards 165px → **261px**; shop grid restored (was stacked, cards crushed to 73px).
- Footer column 48px → **400px**; header icon cluster padding 24px → **0**.
- Filter box now level with the cards (was 24px low).
- **Results count + sort control BUILT** and behaviourally verified (5 → 3 on filter;
  prices sort ascending).

⛔ The shop-grid break was NOT from this track's work — it came from `2d291992`, which made
the band render for the first time (0 → 15). Its own note warned only `/shop/` was checked;
`/shop/` at DESKTOP was the unchecked case.

### ✅ COLOUR SURFACE — text colour landed on the two blocks that needed it (2026-08-21)

- **`sgs/container`** (`0f2c167f`) — had NO reachable text control at all: its manifest mapped
  `css:color` to `native:color.text` while `supports.color` is FALSE, a binding pointing at a
  mechanism that cannot exist. Four owned attrs via the shared emitters + a panel row.
  **DEPLOYED + VERIFIED**: resting and hover both paint as TOKENS, child `sgs/text` inherits.
- **`sgs/cta-section`** (`7b9357cc`) — `textColour`/`textColourHover` were rendered but
  EDITOR-UNREACHABLE (zero refs in edit.js). Now exposed + gradients; `supports.color.text`
  off (0 authorings affected) so native UI doesn't compete (rule 31). **DEPLOYED + VERIFIED.**
- **`sgs/site-header`** — correctly NOT changed. Its `colourExemptions.text` gradient exemption
  is gate-enforced and names the real reason: `background-clip:text` would hijack the wrapper's
  background box and destroy the header background this same block paints.
- **Help text fix** — the shipped wording told clients to LOWER THE ALPHA, which is the exact
  token-corrupting step 4 exists to fix. Rewritten. ⛔ The RENAME half of step 3 was CANCELLED:
  it came from D2b, which the design doc marks superseded.
- **D714–D716 pasted** for the Tier-W session, renumbered against the ceiling at paste time.

### ✅ QC GATE 2 — CLOSED on all three blocks (2026-08-21)

`sgs/hero` and `sgs/trust-bar` verified in the EDITOR with a real login, then on the
frontend: colour panel present, swatch picked, attribute stored as a **slug** (token
survives), resting colour paints, and a **real pointer hover** repaints
(hero primary→accent, trust-bar success→cookie-brown). Zero console errors, `isValid:true`.
Fixture page 2588 — safe to delete.

---

*Moved VERBATIM out of `LEDGER.md` on 2026-08-21 to bring that file back under its 24,576-byte cap (it was already at 24,479 before a fourth track was added). The section was CLOSED — shipped, deployed and live-verified. Nothing was edited or dropped.*

### ✅ D724 — the shared wrapper renders a simple section background as a real `<img>` (2026-08-21)

`0eb38ecf` + `5cd873af` + `26d0a1b7`, deployed + live-verified. Evidence:
`reports/visual-diff/d724-img-background-layer-2026-08-21.md`.
⚠ **`0eb38ecf`'s message cites "(D719)" — WRONG, that number is the other session's. Read it as
D724.** I inferred the ceiling from my own last entry instead of re-reading it. Not force-pushing
a shared branch over a citation.

Bean inverted D718's instinct: converge on the BEST implementation, not the incumbent. The
wrapper painted backgrounds as CSS `background-image` (browser can't find it until the selector
matches); hero already used a real `<img>` + `fetchpriority`. Hero's approach is now the shared
one, via the same `sgs_responsive_image()` helper (so `srcset` comes free). Gated to what an
`<img>` can express — no-repeat + cover/contain + no parallax/fixed + no tier overrides; anything
else keeps the CSS path. Branches are exact complements.

**An adversarial QC subagent returned NO-GO and was right on all three:**
1. ⛔ **My error.** I briefed "two" child-positioning reset rules to exclude the new class from.
   There are **SEVEN**. The four missed win on specificity → background paints ON TOP of content
   on any section with a shape divider. **A roster assembled by eye instead of enumerated —
   again.**
2. The scoped `object-fit` rule was gated on a uid nothing requested → a minimal container's
   `contain`/`top left` silently reverted to `cover`/centre on the frontend.
3. Hero's counter and the wrapper's new one each meant "first within MY path" → a page with both
   marked TWO images `fetchpriority=high`, prioritising neither. One shared
   `sgs_next_background_image_index()` now.

⛔ **CROSS-SESSION INCIDENT — `origin/main` was briefly FATAL.** The other session's broad
`git add` swept my uncommitted `hero/render.php` edit into its unrelated commit `87d904a6` and
pushed it. That carried the CALL to the new counter; the DEFINITION sat uncommitted in my tree —
so every page rendering a hero with a background image would fatal on an undefined function.
Repaired in `5cd873af`. **The lesson is sharper than "you might commit their work": it SPLIT ONE
CHANGE ACROSS TWO COMMITS owned by two sessions, and my own `git diff` showed that file CLEAN —
which reads as "nothing to do", not "someone took it".**

**Live (page 2596):** hero img `high`/`eager`, container img `auto`/`lazy` — exactly ONE
high-priority image across two blocks and two code paths; `object-fit:contain` +
`object-position:0% 0%` survived; tiled container correctly still on `::before` with
`repeat`; no double-paint; `style` attr `null`.
