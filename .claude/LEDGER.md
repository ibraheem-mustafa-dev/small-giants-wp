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

**Nothing was implemented this session. It was all investigation, decisions and planning.**
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

## ⚠ One open question before Phase 2 (Phase 1 is unblocked)

The G1 council surfaced a **third option nobody had considered**, and Bean has not ruled on it:

> Keep the `layout` default as `""` and have the **editor insert `layout:"flex"` explicitly on
> newly-inserted containers.** New authorings get flex; every stored instance — repo *and*
> database — keeps its current rendering; the converter path is untouched. Same goal, **zero
> retroactivity.**

Bean's `row` ruling settled *direction*, not *whether to change the default at all*. Ask him.

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

## Also shipped today (separate golden-builder thread — carried forward, not mine)

Three golden-builder sessions were merged into `main` but never *proved*. Running them found
four real defects, three invisible to every gate:

- **`sgs/heading` inspector crash FIXED** — the redesigned typography panel blanked the whole
  sidebar. Cause: `useSettings()` returns origin-keyed objects, not arrays. Shipped through a
  green build because a green build never opens the editor.
- **Border-style picker made reachable** — wired correctly at both ends, dead in the middle: an
  intermediate layer forwards a hand-written prop list nobody had extended.
- **Shared `flattenPresetSetting()`** — 3rd recurrence of one class; one function now.
- **Duplicate "Font size" label removed.**

Their standing warning matches this session's: *the instrument, not the code.* A gate failed on
a sentence inside a comment; a survey reported "nothing to see" for 49 real problems because
its pattern could not match an underscore.

---

## Pointers

| For | Read |
|---|---|
| Executable plan | `.claude/plans/phase-shop-container-remediation.md` |
| Full evidence + decisions | `.claude/plans/2026-08-20-shop-archive-remediation-design.md` |
| Structural defences / STOP catalogue | `.claude/STOP-CATALOGUE.md` |
| D-numbered log | `.claude/decisions.md` (ceiling verified via the `^## D[0-9]+` anchored grep) |
| Parked work | `.claude/parking.md` |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — never `--allow-dirty`, never `--skip-verify` (D336) |
