---
doc_type: report
title: Rule 34's 319 — measured against the trusted gate, and the three-surface fix
date: 2026-08-27
status: DIAGNOSIS COMPLETE — fix shape recommended, not built
---

# Rule 34 (`declared-attr-unrendered`) — why 319 is not 319 defects

## The headline measurement

Two instruments in this repo answer nearly the same question. They disagree by two orders of
magnitude, and **nothing anywhere compares them**:

| Instrument | Wiring | Question | Answer |
|---|---|---|---|
| `check-dead-controls.js` | **BLOCKING** prebuild gate (D192) | attr with no render consumption | **2** |
| `inspector-scan` rule 34 | advisory, ratcheted | attr declared but not rendered | **319** |

`dead-controls-baseline.json` holds `accepted: 0` — **no hidden debt**. The blocking gate genuinely
believes exactly two attributes in the tree are unrendered.

**Joined per `(block, attr)`:**
- Rule 34: 319 findings = 319 unique pairs across 39 blocks (no counting-unit inflation).
- Trusted gate: 2 pairs — `sgs/before-after::maxWidthUnit`, `sgs/button::fontFamily`.
- **Overlap: exactly those 2.** The instruments agree perfectly on the real ones, which is the
  positive control proving the join is meaningful.
- **317 of 319 name attributes the blocking gate believes ARE rendered.**

## Why rule 34 is wrong — it scans ONE corpus where the trusted gate scans six

`check-dead-controls.js` states its render corpus in its own output: *"own `.php` / `save.js` /
`*view*.js`, **shared `includes/*.php`**, a **prefixed-helper call**, or **live block context**"*.

It carries three resolvers rule 34 has none of:

| Resolver | What it catches |
|---|---|
| `isDynamicPrefixConsumed` | attrs reached by a computed key |
| `PREFIXED_HELPER_SUFFIXES` | a helper that builds `prefix + suffix` names internally |
| structural `$attributes[ $var . 'Suffix' ]` discovery | the dynamic-prefix convention, **without a per-block dict** |

### The two families, both verified against source

**223 of 319 carry `computed-key-unresolved` in their own finding key.** The rule is labelling its
own blind spot: a shared include reading `$attributes[ $sgs_attr ]` cannot be resolved statically.

**96 have no marker**, dominated by the form-field family (~80), `brand-strip` (10), `counter` (6),
`whatsapp-cta` (4). Worked example, read from source rather than inferred:
`brand-strip.nameFontSize` is flagged as unrendered, but `brand-strip/render.php:412` calls
`sgs_typography_css_rule( $attributes, 'name', … )` — the helper builds `nameFontSize` from the
prefix. It renders on the live page. One helper call explains all ten `brand-strip` findings.

## THE ACTUAL FIX — three surfaces, not one question (Bean, 2026-08-27)

⛔ **The root cause is not a missing resolver. It is that "is this attribute used?" is THREE
questions, and rule 34 asks one blunt one.** Conflating them manufactures false positives AND false
negatives, and produces output nobody can act on because every row still needs hand-verifying and
hand-categorising before it means anything.

| # | Surface | The question | The script that knows its fingerprint |
|---|---|---|---|
| **S1** | **Live page render** | does it paint on the published page? | `check-dead-controls.js` (6-corpus + dynamic-key resolvers) |
| **S2** | **Editor canvas render** | does it paint in the block-editor preview? | `check-editor-render-parity.js` (D639/2026-08-13 — built for exactly this: *"a control set up correctly on ONE side (editor OR live-page rendering) but not the other"*). Also `check-editor-canvas-css.py` — **UNWIRED, 0 aliases** |
| **S3** | **A wired, working control** | can the client actually change it? | `check-dead-controls.js` CHECK 1/2, `check-inert-controls.py` (attr OVERWRITTEN in render before use), `check-empty-inspector-containers.js`, `check-duplicate-controls.js`, `inspector-scan` rule 21 |

**Each combination has a DIFFERENT action**, which is the whole reason the distinction pays:

| S1 live | S2 canvas | S3 control | Verdict | Action |
|:--:|:--:|:--:|---|---|
| ✗ | ✗ | ✗ | fully dead | DELETE from `block.json` (the trusted gate's 2) |
| ✗ | ✗ | ✓ | dead control | client sets something that paints nowhere — REAL bug |
| ✗ | ✓ | ✗/✓ | editor-only | paints in canvas, not live — REAL, and invisible to a frontend-only check |
| ✓ | ✗ | ✓ | canvas desync | live-correct, preview lies to the client — REAL |
| ✓ | ✓ | ✗ | no control | rule 21's territory, not rule 34's |
| ✓ | ✓ | ✓ | healthy | **rule 34 false positive — 317 of 319 land here** |

## Recommended shape

1. **PROMOTE the resolvers, do not copy them.** `check-dead-controls.js` has **no `module.exports`**
   — it cannot be reused as a library, which is precisely why a second instrument drifted 317 apart
   from it with no way to arbitrate. Lift `isDynamicPrefixConsumed`, `PREFIXED_HELPER_SUFFIXES` and
   the structural suffix discovery into shared machinery both consume. Copying re-creates the drift.
2. **Split rule 34 into the three surfaces** and emit the surface in the finding `kind`, so a
   verdict is machine-readable instead of hand-derived. (`kind` is currently `null` on all 319.)
3. **Wire `check-editor-canvas-css.py`** — S2 is the least-covered surface and its only dedicated
   script runs nowhere.
4. **Add the reconciliation as a gate.** Two instruments answering one question with no comparison
   between them is how 317 phantom findings survived for months. The comparison itself should fail
   closed.

⚠ **Not yet proven:** that all 317 are false positives. What IS proven is that the blocking gate
believes they are rendered, that it has zero accepted debt, that it owns the exact mechanisms rule
34's own notes blame for its false positives, and that one sampled case resolved to a real helper
call. Treat 317 as a strong hypothesis and confirm per-surface — the same discipline that took rule
21 from an untrusted 211 to a trusted 83.

## Why this matters beyond the audit

The same three-surface distinction governs the **migration**. A migration that moves an attribute
without knowing which surfaces consume it will silently break the one it did not check — and a
single-corpus detector will report the result as clean.
