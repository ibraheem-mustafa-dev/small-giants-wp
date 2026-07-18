---
doc_type: adversarial-council-report
project: small-giants-wp
track: TRACK 2 — Header/Footer/Nav full rebuild
gate: nav-engine build-vs-adopt decision (§15 of the P2 design-gate)
date: 2026-07-18
artefact: .claude/plans/2026-07-18-P2-builder-ux-design-gate.md §15 (re-scoped after this council)
panel: 4 code-grounded critics (Salvage-Sceptic, WP-Platform Realist, Ship-PM, Converter/Pipeline Realist), parallel + blind
verdict: GO on DIRECTION (core nav out as UI engine; wp_navigation as data source) — decision RE-SCOPED before any build; do NOT lock a full rebuild
---

# Nav-engine decision council

## Convergent headline
Direction unanimously endorsed (core `core/navigation` ruled OUT as the UI engine — WP's own release
notes disqualify it; `wp_navigation` kept as data). But **every critic found its worst issue by reading
LIVE CODE** that the 3 research streams — and the v1 §15 — had not. Consensus: the v1 decision was
over-claimed, smuggled a multi-session rewrite of working code, and had no gate + no first slice.

Grades: Ship-PM **C−** (→ A− rescoped) · Salvage-Sceptic **D+** · Converter **D** · WP-Platform **D**.

## Convergence map
| # | Finding | Voices | Fix (folded into §15) |
|---|---|---|---|
| 1 | **"Salvage ≠ patchwork" is a slogan with no test** — every "salvaged" part is then modified | Salvage-Sceptic, Ship-PM | KEEP-VERBATIM-or-REBUILD gate; ban keep-and-modify (§15.1) |
| 2 | **Rewriting the WORKING drawer JS onto the Interactivity API = rabbit hole** (zero user benefit; regresses tested code) | Ship-PM, Salvage-Sceptic, WP-Platform | Drawer = KEEP-VERBATIM, leave alone (§15.1) |
| 3 | **The "adopt WP levers" claim is FALSE** — 4 of 5 are private core-nav internals a bespoke block can't call | WP-Platform (verified vs source), Ship-PM | Reframed to "port the pattern under SGS's own namespace+store"; §15.2 splits general vs core-private |
| 4 | **"One overlay primitive" is undesigned coupling** — disclosure vs dialog have incompatible ARIA contracts; the codebase's own view.js says "do not simplify one into the other" | Salvage-Sceptic, WP-Platform, Converter | Downgraded to a shared open/close/focus/inert UTILITY consumed by distinct blocks (§15.1) |
| 5 | **The mega-menu is broken, not salvageable** — 3 disconnected stores (wp_navigation + duplicated attrs + slug-matched template-part) with a live **always-last ordering bug** (can't place Indus "Brands" at position 4); panels use core blocks (Spec 32 violation) | Converter (code-verified), Salvage-Sceptic | Mega = REBUILD-FROM-SPEC; design the data-shape (ID-ref not slug, interleaving fix, template-part naming) BEFORE P3 (§15.1) |
| 6 | **No prove-the-cause + no named first slice** — the whole "salvage" case rests on a narrated (never measured) "capable, not rotten" claim | Ship-PM, Salvage-Sceptic, Converter | §15.1a prove-the-cause slice (reproduce Mama's + 1 Indus mega panel + converter conformance) + pre-registered exit "close the gap list, don't rebuild the engine" |
| 7 | **The `<dialog>` transform-ancestor constraint forbids a hide-on-scroll header** (which uses `transform`) — fragility-drag from the salvaged drawer into the header it lives in | Salvage-Sceptic | First-class §15.3 requirement: drawer survives a transformed ancestor (body-portal) |
| 8 | **DP6 deferred for the hard 20%** — the mega converter-emit (the defining Indus need) punted to the unscheduled walker — the exact requirement-justifies-but-isn't-a-constraint trap P1 already fixed once | Converter | Converter schema-conformance test in the first slice (§15.1a) |

## Single-voice-but-checkable
- Salvage-Sceptic: `render.php` header comment still describes the OLD `showModal()` model Spec 34 replaced — reconcile before lock. Line counts stale (drawer ~248 not 481).
- WP-Platform: adopting the directive *shape* means SGS owns a net-new Interactivity store; `wp_navigation` CPT block-list may reject arbitrary SGS blocks (live check).
- Converter: create-then-reference emit ordering (wp_navigation post-ID before `ref`; template-part before `menuTemplatePart`) + orphan/idempotence risk.

## GO / NO-GO
**GO on the direction; the decision is RE-SCOPED, not locked-as-a-rebuild.** The honest next nav step is
the §15.1a prove-the-cause slice — reproduce the two client menus on the current trio, measure the real
gap list, then decide rebuild-vs-close-gaps. All convergent must-fixes folded into §15 (v-rescoped).

## Process lesson
A research agent's capability summary is a HYPOTHESIS. Stream B oversold WP "levers"; source-grounded
review proved 4/5 uncallable. Every future Gate on this track requires ≥1 live-source-grounded reviewer.
