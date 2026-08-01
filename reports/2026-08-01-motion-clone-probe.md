# Motion-clone probe — does a draft's `data-sgs-fx-*` grammar survive cloning today?

**Date:** 2026-08-01
**Mode:** Measurement only (read-only on `plugins/sgs-blocks/scripts/converter/`; no converter edits, no deploy, no state-changing git command).
**Question:** does a draft mockup carrying SGS motion attributes (Spec 38 §11.2 `data-sgs-fx-*` grammar) clone into WordPress with the motion intact, as the system stands today?

**Verdict up front:** **No. Zero of the grammar's attributes survive cloning today.** This is not a small gap-fill — the wiring point named in the spec itself (§11.3: "mapped to a named later stage — NOT built in Wave A") has not been built. What D436 seeded is a different layer entirely (see below), and it does not substitute for the missing wiring. Full evidence follows.

---

## 1. What D436 actually seeded — quoted from the DB, not from docs

Ran directly against `sgs-framework.db`:

```
SELECT block_slug, attr_name, css_property, css_element, css_state, css_tier
FROM block_attributes
WHERE attr_name LIKE '%fx%' OR attr_name LIKE '%motion%' OR attr_name LIKE '%anim%' ...
```

Relevant rows (fx-namespace only):

```
sgs/image-sequence   fxStart   fx:start
sgs/image-sequence   fxEnd     fx:end
sgs/image-sequence   fxScrub   fx:scrub
sgs/image-sequence   fxPin     (None)
```

And `fx_effects` (13 rows: `pin-scrub`, `scrub`, `horizontal-panel`, `split-reveal`, `scramble`, `flip`, `draggable`, `draw`, `morph`, `motion-path`, `image-sequence`, `scroll-smoother`, `page-transitions`) — per-effect metadata: `tier`, `plugin_set` (GSAP plugins required), `owns_scroll_transform`, `reduced_motion` policy, `editor_story`, `scope`, `requires`, `pins`, `triggers`. This is a **capability/behaviour registry for the runtime effects system** (which JS module loads, what it degrades to under reduced-motion, how the editor previews it) — confirmed by decision D436's own text: *"regenerates all four motion artefacts"* (Stage 12 of `/sgs-update`, delegating to the fx generator scripts). It is a rendering/runtime artefact generator, not a cloning-time attribute recogniser.

**No `block_attributes` row exists anywhere in the DB for `fx`, `fxTrigger`, `fxHold`, `fxStagger`, `fxDuration`, `fxEase`, `fxShape`, or `fxPath`** — i.e. most of the §11.2 grammar has no destination attribute on ANY block, only `sgs/image-sequence` has 4 of the ~12 named attrs (`fxStart`/`fxEnd`/`fxScrub`/`fxPin`), and even those are block.json-declared editor attributes for that one block, not a generic cross-block fx contract.

**Conclusion on D436:** it seeded the *runtime effects registry* (what plays, how it degrades, what libraries it needs) and *editor attributes for one block*. It did **not** seed, and does not imply, any mechanism for recognising `data-sgs-fx-*` HTML attributes on an arbitrary draft element during cloning.

---

## 2. Spec 38 §11.2/§11.3 — what the cloning contract says

`.claude/specs/38-SGS-MOTION-SYSTEM.md` lines 822-958:

- §11.2 defines the grammar: `data-sgs-fx="<effect>"`, `-trigger`, `-start`/`-end`, `-hold`, `-scrub`, `-stagger`, `-duration`/`-ease`, `-shape` (morph), `-path` (motion-path), `-motion-path-rest[-vh]`, `-pin` (image-sequence only). Attr-per-property, not a JSON blob, explicitly "converter-suffix-compatible."
- §11.3 states the mapping is 1:1 to block attrs (`fx`, `fxTrigger`, `fxStart`, `fxEnd`, `fxHold`, `fxScrub`, `fxStagger`, `fxDuration`, `fxEase`, `fxPin`) — **and says outright: "The lift is an extension of the Spec 31 §3.A dispatch (a routing-unit class alongside CSS decls + content), mapped to a named later stage — NOT built in Wave A (STOP-29: deferral mapped, not dropped)."**
- Skip-with-reason contract (Rule 4) is specified but, per the same sentence, not built either.

So the spec itself already told us this was deferred. The task was to verify whether it had since been picked up incidentally by the generic DB-driven attribute-routing machinery (per R-31-1) — since a generic mechanism could in principle absorb a new namespace without new code.

---

## 3. Code search — is there a live generic mechanism that could pick this up anyway?

Searched `plugins/sgs-blocks/scripts/converter/` (walk.py, recognition.py, services/assembly.py, services/extraction.py, db/db_lookup.py — the entire live conversion path) for any handling of `data-*`/`data-sgs-*` custom HTML attributes.

**Found:** `db_lookup.py:4454` defines `lift_behavioural_attrs(node, slug)` — a generic helper explicitly designed for exactly this: it strips `data-sgs-` from any HTML attribute, checks whether the remaining name exists as a scalar (non-array) attr on the resolved block, and if so lifts the value verbatim (`attr_name = html_attr[len("data-sgs-"):]`, `if attr_name in attrs`). Its own docstring calls it "Helper 2 — lift_behavioural_attrs — FR-31-2 scalar attr lifting" and says it is "consumed by the universal walker (Pass 2)."

**But it is dead code.** Grepped every `.py` file under `scripts/` for `lift_behavioural_attrs(` (a call, not the definition) — the ONLY match is the `def` line itself. `walk.py`, `recognition.py`, and `services/assembly.py` contain **zero** references to `data-`, `data-sgs-`, `node.attrs`, or `node_attrs` anywhere. Nothing in the live path calls this function. It was written (matching the FR-31-2 helper-1/2/3 trio comment block) but never wired into the walker that actually runs.

Separately, even if it *were* wired: the match is a bare-string containment check with **no hyphen/case normalisation** (`if attr_name in attrs`) — contrast with the sibling function `_normalise()` two hundred lines above it in the same file, which exists precisely to handle `max-width == maxWidth` and is used everywhere else in this module. `lift_behavioural_attrs` does not call it. So `data-sgs-fx-trigger` → stripped to `"fx-trigger"` → would need a block attr literally named `"fx-trigger"` to match; the real attr is camelCase `fxTrigger`. Only the bare `data-sgs-fx` (no suffix) would ever have matched as written, and only on a block that declares a plain `fx` attribute — which none do.

There is also a distinct, ACTIVE `ScalarLift` mechanism (`converter/context.py` + `services/extraction.py`) that lifts *content* (text, media) via BEM element classes and DB-declared `scalar-content-lift` capability — confirmed by grep to have no reference to `data-` attributes at all. It's a different system solving a different problem (element content, not behavioural HTML attributes).

---

## 4. The draft I authored and the exact command run

Given the deploy/pipeline constraints of this dispatch (read-only on the converter directory, no deploy), I ran the pipeline's real Stage-4 conversion unit directly in Python — `converter.entry.convert_section()`, the exact function `sgs-clone-orchestrator.py` calls per-section in the live pipeline (verified via grep: `from converter.entry import convert_section as _conv_section` at orchestrator line 1426). This exercises the real recognition + assembly + db_lookup code, unmodified, on hand-authored SGS-BEM HTML — the same code path a full `/sgs-clone` run would hit for these two sections. I did not run the full multi-stage orchestrator (Stage 0 naming gate, Playwright extraction, deploy) because those stages don't affect fx-attribute handling and deploying is out of scope for this dispatch.

**Draft 1 — `sgs/image-sequence` root** (the ONE block with real block.json fx attrs):
```html
<section class="sgs-image-sequence" data-sgs-fx="scrub" data-sgs-fx-trigger="scroll"
     data-sgs-fx-start="top 80%" data-sgs-fx-end="+=150%" data-sgs-fx-scrub="true"
     data-sgs-fx-pin="true">
  <div class="sgs-image-sequence__canvas"></div>
</section>
```

**Draft 2 — `sgs/cta-section` root** (a block with real content, no declared fx attrs — tests whether content still clones normally alongside the (expected-to-drop) fx attrs):
```html
<section class="sgs-cta-section" data-sgs-fx="split-reveal" data-sgs-fx-trigger="scroll"
     data-sgs-fx-duration="0.6" data-sgs-fx-ease="power2.out">
  <div class="sgs-cta-section__content">
    <h2 class="sgs-cta-section__title">Get started today</h2>
    <p class="sgs-cta-section__text">Some body copy for the CTA.</p>
  </div>
</section>
```

Command (run from `plugins/sgs-blocks/scripts`, `converter` package imported normally as the orchestrator does):
```python
from converter.entry import convert_section
result = convert_section(html, "", {}, section_id="test-<name>")
```

---

## 5. Emitted markup — evidence

**image-sequence result:**
```
status: complete
block_markup: <!-- wp:sgs/image-sequence {"align":"full","className":"sgs-test-image-sequence"} /-->
extracted_attributes (fx keys): {}
content_gaps: [{"kind":"dropped","block_slug":"sgs/image-sequence","where":"sgs/image-sequence",
  "detail":"no content arm produced a result — the node carried no extractable content units..."}]
```
Not one of `fx`/`fxTrigger`/`fxStart`/`fxEnd`/`fxScrub`/`fxPin` appears in the emitted attrs — the block emits with only `align` and `className`. The one content_gap recorded is about the missing canvas content, unrelated to fx — **the fx attrs generate no gap entry at all, i.e. they are dropped with no record, not even a skip-with-reason.**

**cta-section result:**
```
status: complete
block_markup:
<!-- wp:sgs/cta-section {"align":"full","className":"sgs-test-cta-section"} -->
<!-- wp:sgs/heading {"content":"Get started today","level":"h2","textWrap":"wrap"} /-->
<!-- wp:sgs/text {"text":"Some body copy for the CTA."} /-->
<!-- /wp:sgs/cta-section -->
extracted_attributes (fx keys): {}
content_gaps: []
```
Content (`heading`, `text`) clones correctly — confirming the pipeline and my test draft are otherwise healthy — but all four fx attrs (`fx`, `fx-trigger`, `fx-duration`, `fx-ease`) vanish with **zero trace anywhere in the result**: not in `block_markup`, not in `extracted_attributes`, not in `content_gaps`.

---

## 6. Per-attribute table

| §11.2 attribute | Declared block-attr destination (per §11.3) | Exists in `block_attributes` DB? | Lifted by any live code path? | Result |
|---|---|---|---|---|
| `data-sgs-fx` | `fx` | No (no block declares plain `fx`) | No — `lift_behavioural_attrs` is dead code | **DROPPED SILENTLY** |
| `data-sgs-fx-trigger` | `fxTrigger` | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-start` | `fxStart` | Yes (`sgs/image-sequence` only) | No | **DROPPED SILENTLY** |
| `data-sgs-fx-end` | `fxEnd` | Yes (`sgs/image-sequence` only) | No | **DROPPED SILENTLY** |
| `data-sgs-fx-hold` | `fxHold` | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-scrub` | `fxScrub` | Yes (`sgs/image-sequence` only) | No | **DROPPED SILENTLY** |
| `data-sgs-fx-stagger` | `fxStagger` | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-duration` | `fxDuration` | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-ease` | `fxEase` | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-shape` | (unassigned — design signed, not built, per D427) | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-path` | (unassigned — design signed, not built) | No | No | **DROPPED SILENTLY** |
| `data-sgs-fx-pin` | `fxPin` | Yes (`sgs/image-sequence` only) | No | **DROPPED SILENTLY** |

No attribute in the grammar produced a "skipped: fx ... — reason" entry as Rule 4 requires; the spec's own drop-reporting requirement is also unbuilt. "Dropped silently" is therefore the accurate classification for every row, not "dropped with a reason."

---

## 7. Verdict

This is a **full build**, not a gap-fill. Nothing in the live cloning path reads `data-sgs-*` custom attributes at all — the one function that was written for this purpose (`lift_behavioural_attrs`) is unwired dead code with a further latent bug (no hyphen/case normalisation, so even if wired it would only catch the bare `data-sgs-fx` case). D436 shipped a real and useful thing — the runtime effects registry (`fx_effects`) plus `/sgs-update` Stage 12 artefact regeneration for the JS/CSS side of motion — but that is orthogonal to cloning; it governs how an already-set `fx` attribute *plays*, not how a draft's HTML gets one in the first place. The remaining work is: (a) wire `lift_behavioural_attrs` (or a corrected version of it, adding `_normalise`-based hyphen/camel matching) into the actual walker path in `walk.py`/`services/assembly.py`; (b) seed `block_attributes` rows for the missing generic `fx`/`fxTrigger`/`fxHold`/`fxStagger`/`fxDuration`/`fxEase` attrs on every fx-qualifying block (only `sgs/image-sequence` has any today); (c) build the Rule-4 skip-with-reason reporting path the spec requires. None of this exists yet.

---

## Files referenced (read-only, no edits made)

- `c:\Users\Bean\Projects\small-giants-wp\.claude\specs\38-SGS-MOTION-SYSTEM.md` (§11.1-11.4)
- `c:\Users\Bean\Projects\small-giants-wp\.claude\decisions.md` (D436, lines 371-410)
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\db\db_lookup.py` (lines 4454-4548, `lift_behavioural_attrs`; lines 470-473, `_normalise`)
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\walk.py`
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\recognition.py`
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\services\assembly.py`
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\services\extraction.py` / `context.py` (`ScalarLift`)
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\scripts\converter\entry.py` (`convert_section` — the function exercised)
- `c:\Users\Bean\Projects\small-giants-wp\plugins\sgs-blocks\src\blocks\image-sequence\block.json`
- `sgs-framework.db` tables: `block_attributes`, `fx_effects`
