---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-20
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first. Then read, in this order:**

1. `.claude/plans/phase-shop-container-remediation.md` — **the executable plan. Start at
   Phase 1, Wave 1.**
2. `.claude/plans/2026-08-20-shop-archive-remediation-design.md` — the 693-line spec behind it.
   Its "BEAN'S DECISIONS" section is BINDING.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — read IN FULL if touching the
   converter/walker/pipeline surface (session rule).

## ▶ LIVE STATUS — Phase 1 Wave 1 SHIPPED (2026-08-20, commit `3224db10`, deployed + live-verified)

**P1-1 DONE — instant filtering WORKS on the canary `/shop/`.** Root cause was NOT what the
plan assumed and NOT what the subagent proposed: WooCommerce's
`ProductCollection/Controller.php:125-134` checks each inner block's REGISTERED
`supports.interactivity`, not its namespace. `sgs/text` declared neither form; three lines of
`block.json` fixed it. Live-verified: `core/router` absent (probe positively controlled), a
stamped `window` variable survived a filter click (no reload), URL updated client-side,
products 5→4, 2 `fetch` requests. Full evidence: **D702**.

⚠ **FR-38-12 Flip is STILL DORMANT — do not record it as unblocked.** GSAP/Flip loaded 0
resources on `/shop/` after the fix. Client-side navigation was necessary but not sufficient;
the module is not enqueued on this page. Open finding, needs its own diagnosis.

**P1-2 DONE — 42 orphaned colour authorings now visible** (advisory kind
`native-preset-undeclared`, `--check` exit 0, build green). Not ~60: that was a reasoned
estimate; 42 is enumerated, after false positives from blocks with their own `fontSize` attr
were removed. **D703**.

**P1-3 DONE (read-only)** — `brand-strip`'s `backgroundColourHover`/`textColourHover` paint
the INNER TILE (`--sgs-tile-hover-*`), not the root. Root rows must not reuse those names.

**QC GATE 1: PASSED** (build exit 0 · 42 findings under the advisory kind · cause proven).
**P1-4: PASSED** (deployed, payload-verify matched all 83 block.json).

### ⛔ WAVE 2 IS BLOCKED ON BEAN — and P1-6 must be REWRITTEN before it dispatches

Bean's mid-session instruction: *"We have a standardised colour setup that you need to abide
by."* The standard is **Spec 35 PART O §1** (D621 tab / D622 panel / clause 9a-c shape):
one thin swatch row, states as TABS INSIDE its popover (9b explicitly retires side-by-side
`*Hover` controls), never behind a "+" menu, and placement resolved by
`placement-reach.py` + `check-element-manifest-conformance.js` — the spec forbids inventing a
bespoke colour-placement rule.

**P1-6 as written in the plan is defective.** Ground truth resolved per block:

| Block | Reality vs the plan's premise |
|---|---|
| `testimonial-slider` | **Already correct — REMOVE from P1-6.** All four attrs declared AND explicitly bound to root element `slider` with a `hover` state. |
| `hero` | hover pair declared, bound to NO element; base pair missing |
| `brand-strip` | hover pair declared, paints the inner tile |
| `trust-bar` | `textColour` declared, bound to no element |
| `site-header-row` (the plan's "proven recipe") | has **no hover pair at all** — a bad template for this job |

**Use `testimonial-slider` as the template, not `site-header-row`** — it is the block that
already meets the standard (explicit `attrMap` + `states.hover.attrMap` binding to root).

**OPEN QUESTION FOR BEAN (Wave 2 gate):** `brand-strip` root naming — (A) distinct `root*`
names, non-breaking *(recommended)*; (B) rename tile attrs to the `tile` prefix the block
already declares, cleaner but silently drops stored authorings; (C) skip brand-strip.

### Other open follow-ons (NOT parked — Bean has not been asked)
1. **73 blocks lack `supports.interactivity`.** Any inside a product collection reproduce
   D702. Needs a per-block judgement pass — a blanket sweep is refused, the declaration is a
   safety claim.
2. **`check-blockjson-metadata-only.py` needs a CASE 3** for `supports.interactivity`. The
   73-block pass will hit the visual-diff gate every single time otherwise.

---

**The rest of this file is the previous session's handoff, still valid for Phase 2.**

The plan is fly-through ready: every step has a model, exact files, a pre-written cold prompt,
and a four-layer test block.

## The shape of the work

Main agent orchestrates, QCs, deploys and tests — **it writes no implementation code.**

```
WAVE 1 (4 parallel)  → QC-1 → WAVE 2 (parallel) → QC-2   ← Phase 1 ends here
  investigate + gates         independent fixes
                                    ↓
                            CONTAINER SPINE (sequential) → QC-3/4   ← Phase 2
```

`sgs/container` is the bottleneck — four steps touch its files and must run in sequence.
Everything else parallelises around it. Phase 1 needs no design gate and can start cold.

## ✅ Phase 2's design gates (G1/G2) are closed — superseded note: Phase 1 Wave 2 IS blocked

⚠ The heading below was written before Wave 1 ran. It refers to the PHASE 2 gates only. Phase 1
Wave 2 has a live open question (brand-strip colour naming) — see LIVE STATUS at the top.

The G1 council's "third option" was **superseded by Bean's own better answer (R-1)**: the
shared wrapper stays blank (→ CSS `row`), and individual blocks declare their own defaults in
their own `block.json` where their semantics require it. Sharing a render mechanism does not
mean sharing defaults.

**Bean's decisive argument, which no council seat raised:** matching CSS defaults keeps the
cloning pipeline's mapping honest both ways — a draft silent on direction maps to a container
silent on direction, and a draft that stacks must *say* `flex-direction: column`, because
column is not the language default either. Deviating would bake a permanent translation error
into every clone.

**Verification ceremony was CUT (R-2, Bean's call):** no DB census, no formal before/after
capture, no rollback triggers, no blocking triage queue. Pre-production, nothing to preserve.
Kept only what saves time: `npm run build`, one live look after deploy, the one-line
closed-drawer tabbable assertion, and `build-deploy.py` with no bypass flags.

**NEW Phase 1 workstream (R-3): batch enforcement-script fix.** Full register at the end of
`phase-shop-container-remediation.md`. ~60 gates audited. Headline: **the fix already exists
in-tree** — `inspector-scan/core/components.js` `resolveComponentFiles()` already resolves
shared components, and only 4 call sites use it. Every blind script is a missing adopter, not
a missing mechanism. Biggest hole found: **nothing asserts a declared attr is consumed by
`render.php` or the wrapper** — that is the edge that would have caught the `contentWidth`
defect. Also: `editor-render-parity-baseline.json` holds 783 accepted findings that are all
**inert**, because the gate reading them is hardcoded to never fail.

---

## Shipped this session (docs only — no code)

| What | Where |
|---|---|
| **Root-caused the client-side-navigation failure** | `sgs/text` inside `product-collection-no-results` sets `clientNavigationDisabled`. Proved by single-variable swap; 3 consistent variants. **Unblocks instant filtering AND the built-but-dormant FR-38-12 Flip.** Exact line NOT yet found — that is Phase 1 step 1. |
| **Closed D451 + D452** | Both motion fixes live-verified on the canary; outstanding items closed after sitting open since 2026-08-01/06. |
| **Full shop-archive diagnosis** | ~20 reported defects root-caused + 2 found by us (26 keyboard-reachable controls in the closed drawer; no `<main>` landmark). |
| **60 orphaned colour authorings found** | 7 block types, framework + `sites/indus-foods/`. The gate that should catch them runs on every build but has the 3 preset attrs on an unconditional allowlist. |
| **Design doc + phase plan** | `2026-08-20-shop-archive-remediation-design.md` (693 lines) · `phase-shop-container-remediation.md` |

## Decisions taken (all BINDING — do not re-litigate)

| # | Decision |
|---|---|
| **D-1** | A background fills its container's own box and must **NEVER** be capped by content width. `align:"full"` was rejected as patchwork; the fix is the wrapper. |
| **D-2** | `layout` default → `flex`; `flexDirection` stays `""` → **`row`** (CSS default). Bean overruled a `column` recommendation and the council confirmed him right. |
| **D-3** | Gate allowlist fix + template comment/save-markup fixes approved. |
| **D-4** | The 60 orphans get full `SgsColourPanel` standardisation — bg + text, normal + hover, gradient setup 1 for background / setup 2 for text. |
| **D-5** | Editor/frontend parity to be fixed; the parity gate moved to **Phase 1** per D542 (detector first when >3 blocks — this touches 71). |
| **G2** | Container root colour routes through `SGS_Container_Wrapper`. Rule 7 gate satisfied. |
| **Colour** | White-on-pink is Bean's brand call, accepted with the contrast tradeoff. **Per-client only** — the framework default stays compliant; snapshot push WARNS, never gates. |
| **Grid** | Column floor 250px, exposed as an editor setting (`minColumnWidth`), not hardcoded. |
| **Filters** | Mobile = slide-up sheet, one DOM / two presentations. |
| **Dropped** | Child `flex` grow/shrink/basis controls — Bean correctly identified they duplicate `columns`/`gridTemplateColumns`. |

## Corrections made to my own claims (read before trusting older notes)

Five claims stated confidently this session turned out **wrong** and were retracted on evidence:

1. **`stack` is NOT plain block flow.** `.sgs-container--stack` has always been
   `display:flex; flex-direction:column` (`container/style.css:75-78`). Repeating that error
   is what made the `column` recommendation look sensible.
2. **`backgroundColor` is not "silently discarded".** It renders — verified live via
   `has-surface-alt-background-color` + computed style.
3. **The editor "invalid content" error is not the colour attribute.** It is 17 blocks with two
   template authoring bugs (stray comments; self-closing WC leaves).
4. **The Apply button is not a WCAG breach.** That CSS targets selectors that never mount; the
   real button passes at 8.77:1.
5. **The wrapper split did not break the container.** Verified mechanically — a pure move.

**Method note that earned its keep:** every figure derived by *running* something was right;
several derived by *reasoning* were wrong. The Hidden-Decisions pass alone caught 8 real
defects in the first plan draft, including one that would have broken ~280 patterns.

---

## Also shipped today (separate golden-builder / colour-audit thread — parallel, not the
## shop-archive track above; continued through the rest of the day, D700)

Three golden-builder sessions were merged into `main` but never *proved*. Running them found
four real defects, three invisible to every gate:

- **`sgs/heading` inspector crash FIXED** — the redesigned typography panel blanked the whole
  sidebar. Cause: `useSettings()` returns origin-keyed objects, not arrays. Shipped through a
  green build because a green build never opens the editor.
- **Border-style picker made reachable** — wired correctly at both ends, dead in the middle: an
  intermediate layer forwards a hand-written prop list nobody had extended.
- **Shared `flattenPresetSetting()`** — 3rd recurrence of one class; one function now.
- **Duplicate "Font size" label removed.**

**Continued later the same day (D700, commits `f805a400`/`9daf35f6`/`78120ed2`) — the colour
control-type audit's POC is now a single fact-checked artefact, not 8 disconnected reports:**

- Full master traceability table, 24 rows, all 8 colour scanners — every number carries its
  exact source script/command/field and how it was verified. `.claude/reports/2026-08-20-colour-golden-scan-set.md`.
- `bannedLookalikes` axis depth+exclusion fix — real ~34-block reach now, not ~3-18 — plus a
  real-file self-test.
- **4-rater `/qc-council` ground-truth validation** (source code, live Playwright on
  sandybrown, DB cross-check, independent re-trace): 21 of 24 rows confirmed directly, 2 more
  resolved via `/systematic-debugging`, 1 residual named honestly.
- **Two real bugs found + root-caused + fixed + deployed:** `sgs/feature-grid`'s misleading
  "Layout type" dropdown (removed, live on canary) and `compare-reach-depth.py`'s own
  non-deterministic LIFO-traversal race (fixed to BFS, self-tested with a negative control
  that genuinely fails 3-of-5 runs against the old code — proof the bug was real, not
  imagined).

Their standing warning matches this session's: *the instrument, not the code.* A gate failed on
a sentence inside a comment; a survey reported "nothing to see" for 49 real problems because
its pattern could not match an underscore. Determinism is not accuracy either — re-running a
tool and getting the same number twice proved nothing until ground-truth-checked.

### Colour-golden track — what's next (does not block the shop-archive track above)

The POC is honest now, not finished. In priority order:

1. **Switch rule 31 to the wider resolver (`resolveComponentFiles()`).** The single biggest
   remaining gap — its 409-finding count is still blind to ~30 blocks reached only through
   shared wrapper panels, so it's a floor, not a ceiling. Deliberately NOT done same-session:
   it's a load-bearing advisory-gate count change needing its own predicted-vs-measured pass,
   not a bolt-on. Read `.claude/plans/go-c1-c4-lively-zebra.md`'s "C0" section first — the
   wider resolver already exists and is proven; this is wiring it in, not building it.
2. **Gradient mechanism-awareness.** `row-missing-gradient` (193 findings) currently checks
   "does *a* gradient path exist," not "is it the mechanism-correct one for what this row
   paints" — a text row wired to the background mechanism would pass clean while rendering
   nothing. The 3-mechanism model is already specified in the report's ADDENDUM section.
3. **Defect-level matching** between rule 31's 409 and colour-coverage's 120 (block-level
   overlap — 33 of 34 — is done; whether specific findings describe the same bug is not).
4. **Declare colour's own `qualifiesWhen.paintsOwnSurface.cssProperties`** in
   `golden-controls.json` — colour still runs on the hardcoded-regex fallback every other
   undeclared type inherits, backwards from "colour is the reference implementation."

Full detail + exact commands for all four: `.claude/reports/2026-08-20-colour-golden-scan-set.md`
(top status block) and `.claude/decisions.md` D700.

---

## Pointers

| For | Read |
|---|---|
| Executable plan | `.claude/plans/phase-shop-container-remediation.md` |
| Full evidence + decisions | `.claude/plans/2026-08-20-shop-archive-remediation-design.md` |
| Colour-golden master table + status | `.claude/reports/2026-08-20-colour-golden-scan-set.md` |
| Colour-golden raw evidence (8 scanners) | `.claude/reports/2026-08-20-colour-golden-raw/` |
| Structural defences / STOP catalogue | `.claude/STOP-CATALOGUE.md` |
| D-numbered log | `.claude/decisions.md` (ceiling verified via the `^## D[0-9]+` anchored grep) |
| Parked work | `.claude/parking.md` |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — never `--allow-dirty`, never `--skip-verify` (D336) |
