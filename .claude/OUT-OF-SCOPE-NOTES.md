# What's not done yet — the honest baseline + every item mapped to its Spec 31 stage

**Purpose (STOP-29):** this is a *universal* pipeline, so nothing here is an ad-hoc "out-of-scope
gap." Every item is one of: a **named Spec 31 stage not built/wired yet**, a **DB-data item to
seed**, or **debt being remediated now**. None are permanent exceptions.

**Reframed 2026-06-29 (D249)** after the Task-1 fact-check verified the engine's real wiring state.
The previous version implied the pipeline was "substantially built, a few pieces pending" — that
overstated integration that does not exist. The reality below is the corrected framing.

---

## The honest baseline — READ FIRST

The new modular engine (`plugins/sgs-blocks/scripts/converter/`) is **NOT live**. The **frozen
`convert.py` runs every real clone today** (D-MODULAR). The new engine's parts are built and
test-green but **INERT and DISCONNECTED**:

- `process_element` (the CSS-routing spine) has **zero production callers**.
- `build_block_markup` / `extract_content` (the content emit path) has **zero production callers**,
  and **never calls `process_element`** — the CSS half and content half don't connect.
- There is **no top-level conductor** that walks a whole page start-to-end and drives both halves.
- So wrapper/box/grid CSS (L1–L4) has **no path to a real clone**; every CSS resolver is **WRITTEN,
  never LANDED**. (Verified D249, Finding A.)

"What's not done" therefore = the gap between **"the parts exist"** and **"one wired conductor that
runs both halves and LANDS faithfully."** That conductor is the keystone (Task 3 below), not a
collection of small additions.

---

## 1. Spec 31 stages — build status (the §12.7 stage map, annotated with LIVE status)

| Stage (Spec 31) | What it does | Build status | Closing gate |
|---|---|---|---|
| **F1–F6 foundation** (§12.7) | ledger + oracle + armed cheat gates | DONE + armed (D239–D241) | wired |
| **Stage 2 — recognition** (§12.6 step-3) | section → block slug + variant, name-free | BUILT; LANDED-proven in isolation (D244); **inert in production** | reproduce in live pipeline |
| **CSS branch §3.A** (5 resolvers: outer_box/content_band/grid/grid_area/typography) | L1–L4 box/grid/typography lift → block attrs | WRITTEN + test-green; **never LANDED; inert** (no caller of `process_element`) | LANDED proof (Task 4) |
| **Content branch §3.B** (A scalar / B child-block / Array / Styling) | text/media/rating/array/CSS-on-content lift | WRITTEN; B LANDED-proven in isolation (D245); **inert** (no caller of `build_block_markup`) | LANDED proof |
| **scalar_media + `media_signal`** (§12.7 Stage-3c) | scalar `<img>`/`<video>` object-shaping | NOT BUILT (honest `UNIMPLEMENTED_STUB`; `media_signal` raises by design) | its stage gate |
| **THE KEYSTONE — top-level conductor + CSS↔content unification** (§3 + §12.6 step-3) | one draft walk drives BOTH `process_element` AND `extract_content` into ONE emitted block; the Ctx-builder that populates `area_name` + walks the draft | **NOT STARTED** | Task 3 (design-gated, Rule 7) |
| **A1 media-map loader / A2 content-conservation ledger** (§12.2.1) | remap mockup srcs → WP URLs; extend `declare_input` to content nodes | NOT BUILT (STOP-28 preconditions) | precede production-wiring |
| **Production-wiring** (§8) | switch the new engine on as the live conductor; decommission `convert.py` | NOT STARTED (deliberate — gated on A1+A2 + LANDED) | full fixture-set TRANSFER-and-LAND green |

→ None of these are gaps in the universal *logic* — they are named pipeline stages not yet built or
not yet switched on. The new engine is being built toward the single universal identify→content→CSS
stream; it is not yet that.

## 2. DB-data items to SEED (data, not code — the Path-A "model it in the DB" way)

| Item | The data to add | Owning stage |
|---|---|---|
| **contentBandPadding mapping** (attrs EXIST; CONTENT-layer padding doesn't resolve to them) | seed the `(block, CONTENT, padding-*) → contentBandPadding*` mapping via `property_suffixes` / `attr_for_layer_property` derivation + `/sgs-update` reseed | §3.A.2 / §5 GAP-seed |
| **grid_area FIX-A per-area max-width** (genuine DB-absence, honestly gapped) | add the per-area `<area>MaxWidth` attr to the block + reseed | §5 GAP-seed |
| **scalar branch data** (`slots.standalone_block` = 40/103) | per-slot judgement — seed `standalone_block` for the content slots that need one (NOT a blanket 63) | `/sgs-update` seed |
| **hero `position`/`style`** (two style-switches on one badge element) | add each field's **value-allowlist** to `arrayItemSchema` (enum-aware `css-modifier` handler) | array data-model (D248) |
| **hero `number`+`suffix`** (combined in one span) | a split rule / separate-BEM-element expectation | array data-model |
| **pricing `highlighted`/`period`** (boolean/enum flags) | model as boolean/enum field in `arrayItemSchema` | array data-model |

→ All consistent with the system being fully data-driven — finish the schema in the DB, never a code branch.

## 3. Debt being remediated NOW (this session — D249, not deferred)

- **`_TIER_SUFFIX` hardcoded suffix vocab** (`tier_suffix.py:19`, LIVE R-22-1) → DB-source via `modifier_suffixes('breakpoint')`.
- **className BEM mirror-emit** (`text_leaf.py:239`, quarantined CHEAT) → purge the dead-ported code AND extend the gate set to detect className-mirror (Bean: BOTH).
- **`_BP_SUFFIX_MAP` + side-suffix regex** (`fold_helpers.py`, dead-ported) → DB-source AND add a suffix-vocab-dict gate.
- **Stale `resolvers/__init__.py` docstring** ("6 GAP-stubs" — actually 5 real) → correct it.

## 4. Already solved (kept honest; stale lines removed)

- **Icons drawn as raw SVG** — DONE (`icon-slug` resolves inline SVG; import-ban opened to `icon_resolver`, `305d5396`).
- **Shared handler library** — DONE (one shared `field_extractors.py` both content paths use, `305d5396`).

---

## The honest one-liner
The pipeline is **designed** as the single universal identify→content→CSS stream (Spec 31 §3). Its
**parts are built** (recognition, 5 CSS resolvers, content mechanisms) but **inert and disconnected** —
the CSS and content halves don't connect, nothing is wired to production, nothing has LANDED, and the
frozen `convert.py` still runs every live clone. The **one keystone** that makes it a real pipeline is
the top-level conductor + CSS↔content unification (Task 3); everything else is a DB seed or this
session's debt cleanup.
