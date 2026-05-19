# Task 3 — Systematic Debugging on Three-Piece Plan

**Date:** 2026-05-20
**Methodology:** `systematic-debugging` skill, all four phases per issue.
**Issues debugged:** C (Stage 10 variation activation), A (Stage 4.5 token-snap), B (Stage 0.7 verbatim dump).
**Iron Law respected:** every root cause is grep-verified before fix sketch.

---

## Issue C — Stage 10 patches markup but never activates the style variation

### Phase 1 — Root Cause Investigation

**Hypothesis:** `upload_and_patch.py` posts new block markup to the WP page via REST but never sets `active_theme_style` theme_mod. The variation CSS file written by Stage 0.7 sits on disk and never loads, so the rendered page falls back to base theme tokens.

**Evidence (all grep-verified):**

1. `plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py` (full file read, 174 lines) — flow is: load `extract.json` → upload images via `/wp-json/wp/v2/media` → patch image URLs in `block_markup` → POST `{content: new_bm}` to `/wp-json/wp/v2/pages/{id}`. **No call to anything theme-mod related.** Zero grep matches for `variation|active_theme|theme_mod|set_theme_mod` in the file.

2. `theme/sgs-theme/functions.php:222-238` — variation CSS enqueue is gated:
   ```php
   $active_variation = get_theme_mod( 'active_theme_style', '' );
   if ( $active_variation ) {
       $variation_css_path = get_theme_file_path( "styles/{$active_variation}.css" );
       if ( file_exists( $variation_css_path ) ) {
           wp_enqueue_style( "sgs-variation-{$active_variation}", ... );
       }
   }
   ```
   If `active_theme_style` is empty (default), the whole block is skipped. The variation CSS never enqueues.

3. Live page `--wp--style--global--wide-size: 1200px` (base theme `theme.json`), NOT `1280px` (`theme/sgs-theme/styles/mamas-munches.json:205`). This proves the variation isn't loaded — base wideSize is what's resolving.

4. Live page HTML search for `mamas-munches.css` — no `<link rel="stylesheet">` references the file. Only appears in oEmbed permalink URL fragments.

5. Font preload at `functions.php:171-191` — same gating; Fraunces from the variation would preload only if `active_theme_style === 'mamas-munches'`. Currently base theme's `inter-variable-latin.woff2` preloads (which we confirmed in the curl output earlier).

### Phase 2 — Pattern Analysis

**Working examples on the live system:**
- HelpingDoctors variation has been activated successfully (confirmed via project CLAUDE.md commit `f18889a`) — but via WP Admin UI ("Appearance → Editor → Styles → Browse styles → HelpingDoctors"), not the pipeline. So the activation mechanism *works*; the pipeline just doesn't trigger it.

**Differences between working manual flow and broken pipeline flow:**
- Manual: WP Admin UI dispatches `update_theme_mod_active_theme_style` internally (WP block editor's Global Styles save handler).
- Pipeline: `upload_and_patch.py` only touches `wp/v2/pages/<id>` → never the theme_mod.

### Phase 3 — Hypothesis Confirmed

Root cause: Stage 10's REST surface (`/wp-json/wp/v2/pages/<id>` with `{content: ...}`) is page-level only. It doesn't touch site-level state (theme mods, options). Adding variation activation to Stage 10 is correct in shape; the question is *which* WP surface to call.

### Phase 4 — Implementation Plan

**Architecture fork resurfaces (per earlier checkpoint with Bean):**

- **Path A — site-wide activation.** Stage 10 sets `active_theme_style` for the entire WP install. Fastest fix (~30 LOC). Breaks if multiple clients share the WP install (e.g. sandybrown hosts multiple client canaries). Mama's-only scenarios fine.
- **Path B — per-page variation override.** New `_sgs_page_variation` post meta. Theme's variation-resolution chain at `functions.php:171, 227` reads post meta first, falls back to site-wide theme_mod. Stage 10 sets the meta only. Multiple clients coexist. ~150 LOC across theme + Stage 10.
- **Path C — defer R1, ship A + B first.** Won't show pixel-diff improvement (variation still inactive).

**Fix sketch — Path B (recommended):**

1. **`theme/sgs-theme/inc/variation-resolver.php`** (NEW, ~40 LOC) — single function `sgs_resolve_active_variation()`:
   ```php
   function sgs_resolve_active_variation(): string {
       // 1. Per-page override (new) — only on singular page/post views
       if ( is_singular() ) {
           $page_meta = get_post_meta( get_queried_object_id(), '_sgs_page_variation', true );
           if ( $page_meta && is_string( $page_meta ) ) return sanitize_key( $page_meta );
       }
       // 2. Site-wide theme_mod (existing behaviour, unchanged)
       return (string) get_theme_mod( 'active_theme_style', '' );
   }
   ```

2. **`theme/sgs-theme/functions.php`** — replace 4 occurrences of `get_theme_mod( 'active_theme_style', '' )` with `sgs_resolve_active_variation()` (lines 171, 227, plus the 2 in font-preloading.php + style-variation-indus-foods.php). Existing site-wide behaviour preserved as fallback.

3. **WP REST endpoint** — new `POST /wp-json/sgs/v1/page-variation` registered in plugin, `manage_options` capability, accepts `{page_id, variation_slug}`, validates slug against existing `theme/sgs-theme/styles/<slug>.json` file existence, calls `update_post_meta($page_id, '_sgs_page_variation', $variation_slug)`. ~30 LOC.

4. **`upload_and_patch.py`** — after the existing page-content POST, before the print, add ~20 LOC:
   ```python
   # Activate matching style variation on this page
   client_slug = ... # already available (passed via orchestrator) or derive from extract.json metadata
   variation_endpoint = f"{WP_URL}/wp-json/sgs/v1/page-variation"
   payload = json.dumps({"page_id": args.target_id, "variation_slug": client_slug}).encode()
   req = urllib.request.Request(variation_endpoint, data=payload, method="POST",
       headers={"Authorization": AUTH, "Content-Type": "application/json"})
   try:
       resp = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", errors="ignore")
       print(f"  [variation] activated {client_slug} on page {args.target_id}")
   except urllib.error.HTTPError as e:
       print(f"  [variation] HTTP {e.code}: {e.read().decode('utf-8','ignore')[:200]}")
   ```

5. **Plumbing** — `sgs-clone-orchestrator.py` already passes `--deploy-target page:144` to Stage 10. Add `--client {slug}` to the subprocess call (orchestrator already has `args.client`).

**Failing test case before fix:**
- `curl <live-url> | grep -oE 'wide-size:[^;]+'` returns `1200px` (base) — should return `1280px` (mamas-munches variation) after fix.
- `curl <live-url> | grep -E 'mamas-munches\.css'` returns 0 matches — should return ≥1 after fix.

**Regression risk:**
- Per-page override defaults to fallback when post-meta empty — site-wide canaries (e.g. HelpingDoctors set via WP Admin) keep working.
- New REST endpoint is capability-gated to `manage_options` — same as variation activation via WP Admin.
- Theme file changes are additive: a new function + 4 replace-call sites. Failure mode: if `sgs_resolve_active_variation()` doesn't load, fall back to `get_theme_mod` direct (or wrap in `function_exists()` guard).

**Ship decision:** SHIP NOW (path B). Surgical, contained, reversible.

**Cross-pattern impact:** Universal — every future client clone runs this same Stage 10 + theme glue. No per-client patches.

---

## Issue A — Stage 4.5 token-snap returns empty for every section

### Phase 1 — Root Cause Investigation

**Hypothesis (initial):** `token_resolver.resolve_batch()` is being called with the wrong shape, or the confidence threshold is too tight, or the `design_tokens` registry is too sparse to match common values.

**Evidence (grep-verified):**

Repo-wide grep for `resolve_batch` and `.resolve(` calls:

```
plugins/sgs-blocks/scripts/orchestrator/test_token_resolver.py:128:    out = mod.resolve_batch(items, theme)
plugins/sgs-blocks/scripts/orchestrator/token_resolver.py:225:def resolve_batch(...)
plugins/sgs-blocks/scripts/orchestrator/token_resolver.py:249:    out = resolve_batch(items, theme, min_confidence=args.min_confidence)
plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:538:# token_resolver.resolve_batch (Gemini Flash QC panel finding 2026-05-14).
plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py:553:    so the next section's token_resolver.resolve_batch can snap matching
```

**FINDING:** the only production references to `token_resolver.resolve_batch` in `sgs-clone-orchestrator.py` are in **comments** (lines 538, 553). Zero actual invocations. The hypothesis is wrong — the resolver isn't called with bad inputs; it isn't called *at all*.

`token_resolutions = []` appears as a hard-coded literal initialisation at 4 sites in the orchestrator (lines 1195, 1296, 1353, 1394) — every per-section result is born with empty token_resolutions and never gets populated.

**The wiring is declarative-only:**
- `TOKEN_RESOLVER_SCRIPT` path constant: defined ✅
- `token_resolver()` lazy-loader function: defined ✅
- `_reflect_new_token_in_theme_json()` helper: defined ✅
- `_TOKEN_RESOLVER_ROLE_TO_THEME_JSON_REGISTRY`: defined ✅
- A call site that invokes `token_resolver().resolve_batch(...)` on extracted attrs: **ABSENT**

So the flow doc claim "WIRED 2026-05-14 (Phase 6 v2 Step 4a)" is partially true (infrastructure wired) but the dispatch call was never added.

### Phase 2 — Pattern Analysis

**Working example exists:**
- `test_token_resolver.py:128` calls `mod.resolve_batch(items, theme)` against a fixture theme — passes (per state.md: "8 pytest tests still green"). So `resolve_batch` works when called.
- `token_resolver.py:239 main()` provides a CLI for the same path.

**Reference implementation for the call site:** `token_resolver.py:225-236`:
```python
def resolve_batch(items, theme_json, min_confidence=0.6, run_dir=None):
    return [resolve(i.get("block_slug",""), i["attr_name"], i.get("raw_value"),
                    theme_json, min_confidence=min_confidence, run_dir=run_dir)
            for i in items]
```
Input shape: list of `{block_slug, attr_name, raw_value}` dicts.

**What needs to happen in the orchestrator:** after cv2 produces `extracted_attributes` for a section, convert that flat dict into the items shape, call `resolve_batch`, and store the result as the section's `token_resolutions`. Optionally: for each `snapped=True` result, replace the literal value in `extracted_attributes` with the `css_var` reference.

### Phase 3 — Hypothesis (revised)

Real root cause: when the cv2 dispatch branch was added (commit history in `sgs-clone-orchestrator.py`), the Stage 4.5 invocation step was specified in Spec 16 §FR6 D1 but never implemented at the call site. Per-section result dicts get `token_resolutions: []` initialiser; no later code mutates that list. The function `token_resolver()` is loaded lazily on first call — but nothing in production *makes* that first call.

### Phase 4 — Implementation Plan

**Fix sketch (where to insert the call):**

After the cv2 branch lifts attrs into `extracted_attributes` for a section (in `stage_4_5_6_7_8_extract`, around line ~1290 where `per_section_results.append({..., "extracted_attributes": <cv2 output>})` happens), insert:

```python
# Stage 4.5 — token-snap. Convert extracted_attributes flat dict to resolver items,
# call resolve_batch, store as token_resolutions. For each snapped result,
# OPTIONALLY rewrite the literal value to the css_var token reference.
items = [
    {"block_slug": target_block, "attr_name": k, "raw_value": v}
    for k, v in extracted_attrs.items()
    if k != "className" and not k.startswith(f"{target_block.split('/')[-1]}.")
]
try:
    resolutions = token_resolver().resolve_batch(items, theme_json, min_confidence=0.6, run_dir=run_dir)
except Exception as e:  # noqa: BLE001
    aggregate_warnings.append(f"{boundary_id}: token-snap failed: {e}")
    resolutions = []
# Reflect any newly minted tokens into in-memory theme_json (already-wired _reflect helper)
for r in resolutions:
    if r.get("token_slug") and r.get("css_var"):
        # Replace literal in extracted_attrs with the token slug (or css_var depending on attr schema)
        extracted_attrs[r["attr_name"]] = r["css_var"]
```

Then change the `per_section_results.append({..., "token_resolutions": []})` literal at the cv2 branch to `"token_resolutions": resolutions`.

**Failing test case before fix:**
- Run `/sgs-clone` on Mama's, then `python -c "import json; print(sum(len(s.get('token_resolutions',[])) for s in json.load(open('pipeline-state/<run>/extract.json',encoding='utf-8'))['per_section_results']))"` returns `0`.
- After fix: should return >0 (Mama's mockup uses palette colours like `var(--surface-pink)` that should snap to theme.json palette slugs).

**Regression risk:**
- `_reflect_new_token_in_theme_json` already exists for newly-minted tokens; nothing else assumes `token_resolutions` is empty.
- The `extracted_attrs[k] = css_var` rewrite COULD break downstream cv2 markup serialisation if the markup was already serialised with literals. Check call ordering: token-snap MUST run before markup serialisation, OR rewrite the markup string too. Per Spec 16 D1: "lift the (possibly snapped) value into the typed attribute" — the value lift includes the snap. So in a perfect implementation the snap happens *inside* `convert.py` walker, not after.
- Safer first step: store resolutions WITHOUT mutating extracted_attrs. Surface the snap decisions to operator-review.html. Bean's "cascade-on-edit" property doesn't apply until the value is actually written as the token reference; this first step only proves the snap fires. A follow-up patch wires the value rewrite into convert.py.

**Ship decision:**
- Step 1 (just call `resolve_batch` and store resolutions, no mutation): SHIP NOW — low risk, gives diagnostic visibility into what *would* snap.
- Step 2 (mutate extracted_attrs OR move snap inside convert.py per Spec 16 D1): REQUIRES SCOPE — proper place is inside cv2's value-lift call site, ~50-100 LOC inside `convert.py:_lift_root_supports_to_style`. Queue for /strategic-plan.

**Cross-pattern impact:** Universal — every cv2-eligible section gets snap once Step 1 ships. Token diversity (colour vs spacing vs font-size) all flow through one function.

---

## Issue B — Stage 0.7 verbatim CSS dump

### Phase 1 — Root Cause Investigation

**Evidence (already grep-verified earlier in this session):**

- `sgs-clone-orchestrator.py:313-398` `stage_0_7_css_lift` — reads every mockup `<style>` block + every `<link rel="stylesheet">` and writes the entire payload verbatim to `theme/sgs-theme/styles/<client>.css`. Zero filtering. Zero routing.
- `cloning-pipeline-flow.md:248` — flow doc itself flags: `STATUS: LIVE - working but wrong-architecture`. Tracked as architecture debt since 2026-05-XX.
- Spec 16 §FR6 prescribes four-destination routing (D0/D1/D2/D3) with token-snap, attr-lift preferred, variation CSS reserved for unanchored rules — exactly Bean's mental model. Implementation skips this and dumps everything to D2 fallback.

### Phase 2 — Pattern Analysis

No working reference for the four-destination routing exists in the codebase yet. Spec 16 §FR6 is design-only. Phase 3 of Spec 16 ("Orchestrator wiring") was listed as next-session work; some of it shipped (cv2 dispatch, --debug-trace, expected-rules baseline) but the CSS routing rewrite of Stage 0.7 didn't.

### Phase 3 — Hypothesis

Root cause: Stage 0.7 was added as a stopgap during Phase 5h.1 (commit `3dce6084`) before Spec 16 §FR6 routing was specified. It's been load-bearing ever since because:
- It produces the variation CSS file that the variation activation expects.
- No replacement has been built.
- Until issues C and A are fixed, the dump-and-pray approach "works" (defaulting variation activation just shifts the failure).

### Phase 4 — Implementation Plan

**NOT a single surgical fix.** Architectural rewrite. ~300-500 LOC across:

- New module: `plugins/sgs-blocks/scripts/orchestrator/css_router.py` — implements four-destination policy. Inputs: parsed mockup CSS (via `tinycss2` or `cssutils`). Outputs: per-rule destination assignments.
- D0 (global/reset) bucket → variation CSS unscoped.
- D1 (typed-attr) bucket → feeds `convert.py` walker so values lift into block attrs with token-snap.
- D2 (wrapper) bucket → variation CSS scoped to `.page-id-N` selector.
- D3 (gap candidate) bucket → writes to `attribute_gap_candidates` table + ALSO ships to D2 as temp fallback.
- Stage 0.7 retired (rules deleted); new stage 0.7b (or rename) consumes mockup CSS and dispatches per-rule.
- `convert.py` walker reads D1 assignments to know which CSS values to snap into block attrs (instead of re-deriving via `_collect_css_decls_for_element`).

**Ship decision:** QUEUE FOR /strategic-plan. Too large for systematic-debugging single-fix scope. Best done as a multi-phase plan:
- Phase 1: build `css_router.py` standalone with unit tests (no orchestrator integration).
- Phase 2: wire as Stage 0.7b alongside existing Stage 0.7 (both fire; new path is gated behind a flag).
- Phase 3: cv2 reads D1 assignments; remove redundant `_collect_css_decls_for_element` paths.
- Phase 4: retire Stage 0.7 verbatim path.
- Phase 5: extract.json schema versioning so old runs don't break.

**Cross-pattern impact:** This is THE architectural unlock for Bean's mental model. Until Issue B ships, the pipeline can never produce "values in block attrs as tokens where they match defaults, literals otherwise" — Stage 0.7 short-circuits that decision by lifting everything to CSS.

---

## Summary table

| Issue | Root cause | Fix complexity | Ship decision |
|-------|-----------|----------------|---------------|
| **C** — Stage 10 doesn't activate variation | Zero theme-mod calls in `upload_and_patch.py`; theme requires `active_theme_style` to be set | ~150 LOC (path B per-page meta) across theme + plugin REST + Stage 10 | **SHIP NOW** |
| **A** — Stage 4.5 token-snap empty | `token_resolver().resolve_batch()` never called in production; only commented references | ~30 LOC (Step 1: call + store) NOW; ~100 LOC (Step 2: integrate into cv2 value lift) QUEUE | **SHIP Step 1 NOW; Step 2 to /strategic-plan** |
| **B** — Stage 0.7 verbatim dump | Architectural debt; Spec 16 §FR6 routing never implemented | ~300-500 LOC across new module + cv2 integration + retirement | **QUEUE /strategic-plan** |

## Predicted pixel-diff impact (per-section cropped, 1440 viewport)

| Section | Today | After C only | After C + A Step 1 | After C + A + B (full) |
|---------|-------|--------------|---------------------|------------------------|
| hero | 99% | 50-70% (variation CSS loads — gradient/colours/typography apply) | 50-70% | ≤5% |
| social-proof | 99.9% | 50-70% | 50-65% | ≤5% |
| trust-bar | 32% | 8-15% (already simple; CSS loading closes most of the gap) | 8-15% | ≤2% |
| brand | 64% | 25-35% | 25-30% | ≤5% |

Predicted because: today the variation CSS isn't loading at all, so ~90% of mockup styling is missing. Once C lands, the Stage 0.7 verbatim CSS dump applies (with all its dead-selector limitations from R2 / dead CSS). That alone closes ~30-50 points. A Step 1 doesn't move pixel-diff directly but proves token-snap fires (foundation for B). B closes the dead-selector gap by routing values into block attrs where render.php emits the correct class names, bypassing the mockup-vs-render class drift entirely.
