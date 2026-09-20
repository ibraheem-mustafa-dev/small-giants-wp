# Script bindings to per-tier block attributes: design and proof of concept

Date: 2026-09-20. Status: design plus a working evaluator. No converter, orchestrator, spec or manifest file was edited; no pipeline run was made; nothing was deployed.

## The answer in five lines

1. Resolve the binding by NAME at the one place the converter already reads an element's inline `style`: `converter/services/styling_helpers.py::collect_css_decls_for_element`, through `converter/services/template_binding.py`. Today that function drops `padding: {{ secPad }}` and records a gap. Instead it substitutes the tier value into the declaration text and returns it as the Desktop (base) value plus Tablet and Mobile overrides, which is the shape it already returns for a classed draft's `@media` rules.
2. The values come from `orchestrator/script_bindings.py::resolve_tier_bindings`, run once by the orchestrator on the draft and handed to the converter as a per-run map `{name: {mobile, tablet, desktop}}`. Same pattern as `styling_helpers.py::configure_colour_resolution_from_run`.
3. Element identity is the element itself. The binding text sits in that element's own `style` attribute, and a binding is a pure function of the viewport width, so a name to tiers map is enough. No boundary id, no element id, no per-element sidecar, and children of a boundary (a heading inside a section) are covered because every reader goes through the same function.
4. It stays inert for Mama's because nothing triggers it: no `{{` in any style value means the evaluator returns nothing, the orchestrator writes no map, and `collect_css_decls_for_element` takes the identical path it takes today.
5. Verify on the real Eye Care page by reading the emitted tier-object attributes, the remaining `unresolved template binding` gaps (expected to fall to the state-driven and loop-item names), and computed padding, columns and font-size at 375, 768 and 1440 on the live clone, then Bean's eye (R-31-13). Steps are in section 6.

Everything below is the evidence and the reasons the other options lose.

## 1. Problem, effect, solution

**Problem.** A Claude Design draft writes layout as `padding: {{ secPad }}`. Its `text/x-dc` script defines `secPad: mob ? '56px 20px' : '104px 52px'`, where `mob` is `effW < 760`. The static HTML the converter reads has only the raw text. `template_binding.py` now refuses to lift it (commit e3ea739ae), so the junk is gone, but so is the value: 0 of the 131 style sites that use a resolvable binding get a real per-device value.

**Effect.** The clone renders Eye Care sections with the framework defaults at every width. Section padding, the two-column and four-column grids, the heading sizes and the gaps all differ from the draft, and the difference is largest exactly where the draft is most responsive.

**Solution.** Read the script's own definitions for the three device tiers, then feed them to the converter's existing tier logic at its single inline-style reader.

## 2. What was built (new files only)

| File | What |
|---|---|
| `plugins/sgs-blocks/scripts/orchestrator/script_bindings.py` | `resolve_tier_bindings(draft_html)`, `template_bindings`, `read_render_scope`, `attribute_value`, `crosscheck_probe`. |
| `plugins/sgs-blocks/scripts/orchestrator/script-bindings-eval.js` | Node `vm` evaluator: empty context, code generation from strings off, static refusal list, timeouts, `S` as a Proxy that throws on any state key except the width. |
| `plugins/sgs-blocks/scripts/tests/test_script_bindings.py` | 33 tests: synthetic drafts, the real draft, the probe cross-check with a negative control. |

How it works: it finds the render function by locating the `const mob = ...` declaration (thresholds are read from the script, never assumed), takes that function's top-level declarations and the object it returns, and evaluates each style-referenced name at 375, 768 and 1440. A name that reads state (`S.filtersOpen`), props (`P.accent`), data (`C.ROWS`), `this`, or anything else that is not the width goes to `unresolved` with the reason. It also sweeps each tier's width range (at every integer literal plus or minus 1, and every 16 px) and reports where a draft breakpoint falls inside a device tier (`intra_tier`).

On the real Eye Care draft: 140 distinct names in style values, 75 resolved (65 genuinely responsive, 10 constant), 65 unresolved (37 loop-item fields such as `s.tileBg`, 28 state or data driven such as `railStyle`, `navPad`, `acc`). 131 of 208 style sites are covered.

## 3. Proof it is right

Three independent sources agree.

**a) The draft's script** (the evaluator's own input): flags read as `mob = effW < 760`, `narrow = effW < 1024`, `wide = effW >= 1280`.

**b) The draft's README** (`design_handoff_ward_end_eye_care/README.md`): "breakpoints at 700 (lens layout stacks), 760 (mobile), 1024 (narrow / filter drawer) and 1280 (wide)"; "Section padding: `104px 52px` desktop / `56px 20px` mobile"; "Page padding `48px 52px 90px` / `28px 20px 60px`"; "Panel padding `68px 60px` / `36px 24px`"; hero `clamp(42px,4.4vw,72px)` / 40. All match the evaluator.

**c) Measured ground truth** (`pipeline-state/_manifest/probe.json`, produced by `orchestrator/draft-responsive-probe.js` rendering the real draft at 375, 768 and 1440). Elements are matched by tag plus normalised static text, and the probe must list the compared property as one that changes with width. Result: 20 element matches, 7 value-only matches, **0 mismatches**, 195 individual comparisons.

| Binding (property) | Probe element | 375 eval v probe | 768 eval v probe | 1440 eval v probe |
|---|---|---|---|---|
| secPad (padding) | section "why buy from me..." (also 5 other sections) | 56/20/56/20 v 56/20/56/20 | 104/52/104/52 v 104/52/104/52 | 104/52/104/52 v 104/52/104/52 |
| heroPad (padding) | div "40 designer brands..." | 0/20/44/20 v same | 0/52/72/52 v same | 0/52/72/52 v same |
| panelPad (padding) | div in "prescription sunglasses..." | 36/24/36/24 v same | 68/60/68/60 v same | 68/60/68/60 v same |
| heroTitle (font-size) | h1 "the same designer shades..." | 40 v 40 | 42 v 42 | 63.36 v 63 |
| heroSub (font-size) | p "im an optician in birmingham..." | 15.5 v 16 | 18 v 18 | 18 v 18 |
| h2 (font-size) | 6 h2 headings | 32 v 32 | 46 v 46 | 46 v 46 |
| twoColWide (tracks) | grids in "why buy" and "prescription sunglasses" | 1 v 1 | 1 v 1 | 2 v 2 |
| opticianCols (tracks) | grid in the clinic section | 1 v 1 | 1 v 1 | 2 v 2 |
| opticianGap (gap) | same grid | 32 v 32 | 32 v 32 | 64 v 64 |
| fourCols (tracks) | reasons grid (value-only) | 1 v 1 | 2 v 2 | 4 v 4 |
| shapeCols (tracks) | shape grid (value-only) | 2 v 2 | 3 v 3 | 6 v 6 |
| gridGap (gap) | shape grid (value-only) | 10 v 10 | 18 v 18 | 18 v 18 |
| reasonPad (padding) | reason cards (value-only) | 28/22 v same | 34/30 v same | 34/30 v same |
| googlePad (padding) | Google reviews box (value-only) | 20/16 v same | 28/26 v same | 28/26 v same |
| tickerItemPad (padding) | ticker items (value-only) | 0/20 v same | 0 v same | 0 v same |

Two differences are not mismatches: the probe rounds fractional pixels (`draft-responsive-probe.js::CAPTURE_SRC` `normVal`), so 63.36 reads 63 and 15.5 reads 16; and it reduces grid tracks to a count, so `minmax(0,1.1fr) minmax(0,1fr)` reads "2". "Value-only" means the element's content comes from a data loop so it cannot be identified by text; it is consistency, not identification. Sixty-one uses are "not probed" because the probe renders the home screen only and covers 39 elements.

**Negative controls.** Breaking the flag derivation (hardcoding 760/1024/1280) fails `test_thresholds_come_from_the_script_not_from_the_code` (tablet resolves `20px`, expected `10px`). Corrupting one evaluated value fails the probe cross-check (`test_crosscheck_negative_control_a_wrong_value_is_reported_as_mismatch`). A bug the tests found while writing them: `count_tracks` treated `repeat(auto-fill, ...)` as one track; fixed.

## 4. What the pipeline does today (facts, cited by symbol)

- `converter/services/styling_helpers.py::collect_css_decls_for_element` is the ONE reader of a node's inline `style` (confirmed by grep of `node.get("style")` across `converter/`; `assembly.py` only pops a block attribute of that name). Its callers include `services/css_pass.py`, `services/root_supports.py` (via `lift_root_supports_to_style`), `resolvers/styling_content.py`, `services/arrangement.py`, `services/assembly.py` and `resolvers/motion_shape.py`.
- It returns `(base_decls, bp_decls)`: Desktop is the base; `bp_decls` holds Tablet and Mobile values only where they differ. `services/css_pass.py` turns those into `Decl(tier="Base")` and `Decl(tier=<bp suffix>)`, which the resolvers write through `services/tier_object.py::tier_object_write`. Tier ranges come from `db_lookup.device_tier_ranges` (Desktop 1024 and up, Tablet 768 to 1023, Mobile up to 767).
- Its only responsive input is `@media` rules in the `css_rules` dict, matched to an element by CLASS or TAG selector (attribute and id selectors do not match). The inline `style` contributes to the base only.
- `services/template_binding.py::drop_unresolved_bindings` is called at that inline read and drops any declaration containing `{{` or `}}`, recording a gap through `content_gap_collector.record_declaration_gap`.
- The tagged mockup (`recogniser/per-section-convention-voter.py::write_tagged_mockup`) carries `data-sgs-boundary-id` on `auto_detect_sections` landmarks and `detect_sc_for_item_boundaries` items only. `sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract` finds the boundary root by that id and gives `converter.entry.convert_section` that element's HTML.

## 5. The options

| | (a) existing bridge | (b) substitute in source HTML | (c) sidecar keyed by element | (d) resolve by name at the single reader (recommended) |
|---|---|---|---|---|
| Touches | Nothing new, only feeds it | Orchestrator rewrites the mockup and the `css` string | Orchestrator, `write_tagged_mockup`, converter reader | Orchestrator (call and write one JSON), `convert_section` (kwarg), `template_binding.py`, `collect_css_decls_for_element` |
| Covers child elements (heading in a section) | No | Yes | Only if every styled element is tagged | Yes |
| Covers every screen of the draft | No (probe renders one route) | Yes | Yes | Yes |
| Keeps authored values (`clamp()`, `repeat(2,minmax(0,1fr))`, `minmax(0,1.1fr) minmax(0,1fr)`) | No (rounded px, track counts) | Yes | Yes | Yes, also when embedded (`min(100%,{{ cardMin }})`) |
| Needs new identity machinery | Yes (hints, correlation) | Yes (synthetic class per element) | Yes (id on every styled element) | No |
| Risk to Mama's | Low (opt-in flag) | Medium: rewrites the mockup and CSS string every run | Medium: widens the tagged mockup | Low: guarded on `{{` in a style value |

**(a) The existing bridge** (`converter/services/sc_var_responsive_bridge.py::bridge_record`, fed by `recogniser/sc_var_responsive_correlator.py::correlate`). Verified limits: `correlate` only joins boundaries that carry `sc_var_hint`, and only the element that roots the boundary (text containment must match exactly one boundary, or a structural signature for `sc-for` items); a record with no hint returns the `no_block_slug` gap; `sgs-clone-orchestrator.py::_patch_block_comment_attrs` patches only the opening block comment at the start of the boundary's markup, so a heading inside a section has no place to receive a value; `db_lookup.box_css_catalogue` requires exactly one candidate attr for the measured property; and the values are the probe's rounded computed values, so an authored `clamp()` or a fractional ratio cannot be reconstructed. It also inherits the probe's documented scope of one route per run (`draft-responsive-probe.js` module docstring). Its virtue is that it measures rather than reads the script. Keep it for what it does (a card's measured padding on a hinted boundary); it cannot carry this job.

**(b) Substitute in the source, then let the converter's tier logic handle it.** The converter has no tier logic for inline styles: inline is base only. To get Tablet and Mobile it would have to write `@media` rules into the `css` string with a selector `collect_css_decls_for_element` can match, which means a synthetic class on every bound element (attribute selectors do not match). The converter preserves source classes on blocks ("the rendered clone preserves the draft class by construction", `styling_helpers.py` residual comment), so a synthetic class would leak into emitted `className`, a rule 1 smell. It also rewrites the mockup for every run. Rejected.

**(c) Sidecar map, element identity to property to tiers, written through `tier_object_write`.** Identity is the hard part: `data-sgs-boundary-id` exists on boundaries only. Reaching children means tagging every styled element, which changes the tagged mockup for every draft including Mama's unless gated. And it is unnecessary: the binding NAME is already on the element. Also `tier_object_write` expects a `ctx`/`decl` pair from the declaration walk (its own docstring, and the bridge's), so a sidecar would need a second writer. Rejected.

**(d) Resolve by name at the single reader.** The map is keyed by binding name because the value depends only on the width, so `{{ secPad }}` means the same wherever it appears. The converter substitutes the tier text into the declaration and reuses everything downstream unchanged. It also handles a binding embedded inside a larger value, which (a) to (c) cannot. This is the "anything better" the brief asked for; it is smaller than (b) and (c) and has no identity problem.

## 6. Recommended wiring: exact changes

Owner of each change is noted because the converter is being edited by another agent. None of this was done here.

1. **`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py::main`**, after Stage -1.5: call `script_bindings.resolve_tier_bindings(text, tier_widths=..., tier_ranges=...)`, passing the converter's own values from `db_lookup.device_tier_samples` and `device_tier_ranges` lower-cased so both sides agree (the converter's Tablet sample is 800; the evaluator's default is 768). If `resolved` is non-empty write `run_dir/script-bindings.json` (`{name: {mobile, tablet, desktop}}` plus the `unresolved` list for the report). Load the module with `_load_module_from_path` as `screen_route.py` is loaded. Log the counts; halt on nothing (fail soft, like Stage -1.5).
2. **`sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract`**: read that JSON once (next to `_sc_var_responsive_by_boundary`) and pass it to `convert_section` as a new keyword argument.
3. **`converter/entry.py::convert_section`**: add optional `tier_bindings: dict | None = None`, install it beside `configure_colour_resolution_from_run`, and clear it in the `finally`. Default `None` keeps every existing caller and test byte-identical.
4. **`converter/services/template_binding.py`**: add `configure_tier_bindings(map)` and `resolve_binding_declarations(decls, node)`. For each declaration containing `{{ name }}` where every name in the value is in the map, produce a Desktop text, a Tablet text and a Mobile text by substituting each tier's value (a plain string replace of the `{{ name }}` token, which is what makes the embedded case work). A declaration with any name not in the map still goes through the existing `drop_unresolved_bindings` gap path, unchanged. Tier names come from `db_lookup.device_tier_ranges` (R-31-1), not a literal.
5. **`converter/services/styling_helpers.py::collect_css_decls_for_element`**: at the inline read, call `resolve_binding_declarations` in place of the bare drop. Desktop text goes into `base_decls`. Tablet and Mobile texts are applied to `tier_effective[tier]` after the media-rule fold and before the loop that builds `out_bp`, so the existing "emit only where it differs from base" rule applies. Honour `include_inline` (state probes must not receive them).
6. **Tests** in `converter/tests/test_unresolved_binding_drop.py`: a bound declaration with a map yields base plus Tablet and Mobile values; with no map it is dropped and gapped exactly as now; a name missing from the map is still dropped; an embedded binding substitutes.

**Element identity** is therefore: the node passed to `collect_css_decls_for_element`, whose own `style` text carries the name. No boundary lookup is involved, so the boundary-only `data-sgs-boundary-id` is not a constraint.

**Inert for Mama's, by three separate layers.** (i) A draft with no `{{` in any style value makes `resolve_tier_bindings` return an empty result with no problem; proven by running it on both Mama's mockups (`sites/mamas-munches/mockups/homepage/index.html` and `annotated-index.html`: 0 bindings referenced) and by `test_a_draft_with_no_style_binding_is_inert_and_reports_no_problem`. (ii) The orchestrator writes no file and passes `None`, so `convert_section` installs nothing. (iii) `drop_unresolved_bindings` already returns the same mapping untouched when no value carries a delimiter. Verify by comparing Mama's emitted block markup with and without the change, the way the screen-route work did (identical 32,767 characters and statuses).

**Verify on the real Eye Care page** (not done here; the brief said no pipeline run):

1. Run `python orchestrator/script_bindings.py "<draft>"`: expect 75 resolved. Run with `--probe pipeline-state/_manifest/probe.json`: expect 0 MISMATCH.
2. Run the pipeline with `--screen Home`. In the Stage 4 output, the "why buy from me" container should carry a tier-object padding of `104px 52px` (desktop and tablet) and `56px 20px` (mobile), the two-column grid `gridTemplateColumns` a `{desktop: 'minmax(0,1.1fr) minmax(0,1fr)', tablet/mobile: 'minmax(0,1fr)'}` shape, and no `{{` anywhere in the markup (`grep -c '{{'`).
3. Content-gaps: `unresolved template binding` gaps should fall from every bound site to the 28 state-driven and 37 loop-item names only.
4. Open the real homepage in Playwright at 375, 768 and 1440 and read computed padding, `grid-template-columns` track counts and h2/h1 font sizes on the matching elements, keyed by text (rule 4a); compare with the probe values in section 3. Run `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` (rule 6, Spec 32). Then Bean's eye (R-31-13). A pixel-diff number alone does not close it.

## 7. Open design question for Bean (not decided here)

58 of the 75 resolved names have a draft breakpoint that falls INSIDE a device tier: the 760 mobile threshold against SGS mobile 375 to 767 (a 760 to 767 sliver), `prodCols` giving 3 columns from 1024 to 1279 and 4 from 1280 inside Desktop, `lensCols` at 700 and 1100, `shopCols` and `railPos` at 1060, `phoneDisplay` at 1160, `optCols` at 620. The three tiers cannot represent these. `collect_css_decls_for_element` already has a name for this class (F-ii residual, D228: "never snapped, never dropped") with `ResidualBand` and `bound_residual_media_conds` for CSS media rules. Recommendation: in the first version record each `intra_tier` band as a tracked gap with reason "draft breakpoint inside a device tier" (rule 4: skipped with reason, never silent), then decide whether to emit residual bands to `sgsCustomCss`. That second step is a product decision and touches a shared mechanism (rule 7).

## 8. What I could not establish

- **End-to-end behaviour.** No pipeline run, so I have not seen the resolvers accept `clamp(42px, 4.4vw, 72px)` as a heading `fontSize` tier value, `repeat(2,minmax(0,1fr))` or `minmax(0,1.1fr) minmax(0,1fr)` as a `gridTemplateColumns` tier value, or a shorthand `56px 20px` on every target block. Those go through the existing classed-draft resolvers, but "should" is not evidence.
- **Whether the design agrees with the converter edit in flight.** I read `styling_helpers.py`, `template_binding.py` and `entry.py` as they stand today; `git status` showed no uncommitted converter changes at the time. Symbols may move.
- **`S.w` equals the viewport width in every draft.** Evidence: the draft's `measure(w)` reads the root element's `clientWidth` through a ResizeObserver, and 195 probe comparisons agree. A framed or scrollbar-narrowed layout could differ; `mobilePreview` is handled by evaluation (a `true` would give every tier 390, all uniform).
- **A second implementation of the draft's semantics.** The Stage -1.5 doctrine (`js_content_resolver.py`) is to render and read what the draft's own runtime produced, not parse its source. This evaluator parses the script's own render function (not `support.js`) and evaluates width-only expressions. It fails closed (state, props, data, `this`, loops and template literals are refused, never guessed), and the probe cross-check is the standing validation, but it is not the runtime. A draft whose values are built by helper functions or class fields will simply come back unresolved.
- **Naming convention.** Only the Eye Care draft was available. The width flag names are the design tool's (`mob`, `narrow`, `wide`), passed as a parameter; a draft using other names resolves nothing and says so. The width state key is assumed to be `S.w`.
- **`<dc-import>` components** (for example `Frame Card.dc.html`) have their own script. Bindings inside a spliced component are not defined in the main draft's render function, so they come back unresolved and stay dropped. Not tested on a real component.
- **Sampling.** The width sweep checks integer literals plus or minus 1 and every 16 px; a threshold moved by arithmetic (`effW - 20 < 300`) could be missed between samples.
- **The probe is home-only.** 61 uses on other screens (`pagePad`, `pdpSecGap`, the lens modal group) have no measured ground truth. Their evidence is the script and the README only.
- **Text bindings** (`{{ r.title }}` as content) are a different problem and are not touched.
- **File size.** `script_bindings.py` is about 740 lines. The project's file-length limits name PHP and TypeScript/JavaScript only, but it is long; splitting the lexer from the resolver is a mechanical follow-up if wanted.
