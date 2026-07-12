---
doc_type: design
project: small-giants-wp
generated: 2026-07-12
status: DESIGN-APPROVED (Bean 2026-07-12) — build /qc-council-gated
parking_ref: P-STYLE-TAG-CONSOLIDATION
spec_ref: 32-COMPONENT-STYLING-TOKEN-CONTRACT.md §6.2 / FR-32-11
---

# Design — `P-STYLE-TAG-CONSOLIDATION` (per-block `<style>`-tag bloat)

**Status:** DESIGN-APPROVED (Bean 2026-07-12). Build gated by `/qc-council` on the shared render surface. Governing specs: Spec 31 (§3.A, §13.4 FR-31-5.2, §13.6), Spec 32 §6.1 + §6.2/FR-32-11 (this design, now encoded).

---

## Context (why this change)

Every SGS block prints its own scoped `<style>` tag into the page **body**. Live page 8: **144 `<style>` tags total — 107 in the body, 83 of them SGS block-scoped, ~33KB** across ~100 tags. Valid (Spec 32 §6.1(b) sanctions the scoped `<style>`) but bloat + non-cacheable. Bean flagged it during Fix 9 (2026-07-12).

Industry-settled fix (WP core, Kadence, Spectra, GenerateBlocks): each block **registers** its CSS into a central collector during render; **one** flush near end-of-page prints it as a single stylesheet. ~100 tags → **1** (or 0 body tags + 1 head `<link>` in file mode).

**Bean's decisions (2026-07-12):** (1) mechanism = **plain SGS CSS buffer** (universal — 100% of SGS CSS verbatim); (2) output = two phases in ONE programme — Phase 1 inline footer `<style>`, **Phase 2 cached external file built immediately after and made the DEFAULT**; inline stays as the always-correct fallback.

---

## The lucky architectural fact (emitter map, 2026-07-12)

- **~60 block `render.php`** emit their scoped tag via one identical shape: `printf('<style id="%s">%s</style>', esc_attr($uid), wp_strip_all_tags($css))`.
- The **one** shared helper that materialises a tag is `SGS_Container_Wrapper::render()` (`includes/class-sgs-container-wrapper.php:1462`) — prepends the `<style>` to returned wrapper HTML.
- **Every other CSS helper already returns a bare CSS string** — `sgs_typography_css_rule`, `sgs_label_box_css_rule`, `sgs_responsive_css_rule`, `sgs_button_element_style_css`, `sgs_colour_value`/`sgs_shadow_value`. Only the render.php **tail** wraps them.
- `wp_style_engine_get_styles()` used heavily but **only with `selector`** — store/`context` path untapped.
- **No existing footer CSS flush, no `wp_add_inline_style`** — greenfield enqueue target. `wp_footer` collector precedent exists (`sgs_emit_faq_page_jsonld`).

**⇒ Consolidation is a "tail-only" change** — CSS generation is untouched; only the emit destination redirects.

---

## The design

### 1. Collector (`includes/class-sgs-css-registry.php` — NEW)

```php
sgs_collect_css( string $uid, string $css ): void   // every emit-site calls this (frontend)
sgs_flush_collected_css(): void                      // wp_footer flush (inline mode / cold load)
sgs_is_frontend_render(): bool                        // not is_admin / not block-renderer REST
sgs_css_output_mode(): string                         // 'file' (default) | 'inline' via filter
sgs_enqueue_page_css_file(): void                      // wp_enqueue_scripts (head) — file mode
```

- `static $buffer` keyed by `$uid` → deduped (identical instances share deterministic `md5(attributes)` uid). Insertion order preserved → residual-last per uid (Spec 31 FR-31-5.2 / D303).
- Registered on `wp_footer` (~priority 20) for the block-theme frontend. All dynamic render.php run during `the_content`/template render (before `wp_footer`) → buffer fully populated at flush.

### 2. Emit-site shim (tail-only, ~60 blocks + wrapper + custom-css)

Swap `printf('<style ...>', $uid, $css)` → `sgs_collect_css($uid, $css)` **on the frontend**; keep inline `<style>` **in the editor**. Container wrapper line 1462 → `sgs_collect_css()` (stop prepending the tag). `custom-css.php` `render_block` filter registers into the collector (keep APPEND-last / uid-doubling residual semantics, D303).

### 3. Editor parity (CRITICAL, highest-risk)

ServerSideRender / block-renderer REST has **no `wp_footer`** → editor MUST keep inline per-block emission; only the **frontend** consolidates. Gate: `if ( sgs_is_frontend_render() ) sgs_collect_css(...); else <inline as today>;`. Verify the editor canvas still styles correctly at build time.

### 4. Output — inline (Phase 1) → external file DEFAULT (Phase 2)

**Phase 1 — inline footer `<style id="sgs-blocks-collected">`.** 1 tag not 100. Always-correct fallback, not the end state.

**Phase 2 — cached external file, DEFAULT. Generate-then-serve** (naive footer-enqueue re-introduces a flash; the mature fix):
1. **Head enqueue from a stored pointer.** `wp_enqueue_scripts` reads post-meta `_sgs_css_file={hash,url}` (singular) / a hash transient (non-singular). Present + hash current → `wp_enqueue_style('sgs-page-css',$url,[],null)` in the head. No FOUC, browser-cacheable, HTML ~33KB lighter.
2. **Generate on cold/changed load.** No pointer OR hash changed → THIS load emits inline footer `<style>` (correct) AND writes `/uploads/sgs-css/<content-hash>.css` (`WP_Filesystem` + `wp_mkdir_p`) + stores pointer. Next load serves from head.
3. **Invalidation.** `save_post` clears the pointer → regenerate next visit. Content-hash filename self-busts.
4. **Fallback-safe.** Uploads not writable → stay inline permanently for that site; never a broken page.
5. **Default = file; `sgs_css_output_mode` filter** flips to `inline` if needed.

Content-hash = md5 of the concatenated buffer (deterministic → CDN/cross-request cache hits).

### 5. FOUC note
Layout-critical base CSS lives in each block's enqueued `style.css` (head); collected CSS is per-instance overrides/tiers. File mode (default) loads in head → no flash. Inline fallback applies after first paint (minor, WP-core-accepted for block-supports). Output-buffer head-injection = proven-need-only escalation.

---

## Change surface

| File | Change |
|---|---|
| `includes/class-sgs-css-registry.php` | **NEW** — Phase 1: collector + `sgs_is_frontend_render` + `wp_footer`. Phase 2: `sgs_css_output_mode` (default `file`), `sgs_enqueue_page_css_file` (head), `WP_Filesystem` write, pointer store, `save_post` invalidation |
| `includes/render-helpers.php` | `require_once` the registry |
| `includes/class-sgs-container-wrapper.php` (~1453–1462) | emit via `sgs_collect_css` on frontend; stop prepending `<style>` to returned HTML |
| `includes/custom-css.php` | `render_block` filter registers into collector (keep D303 residual semantics) |
| `src/blocks/*/render.php` (~60) | swap `<style>`-emit tail → `sgs_collect_css($uid,$css)` frontend, inline editor. Representative: hero, label, button, product-card, quote, trust-bar, heading, testimonial-slider, info-box, feature-grid, cta-section, card-grid, form |

**uid caveat:** `feature-grid` + `filter-search` use non-deterministic `wp_unique_id()` — won't dedupe across identical instances (minor; optionally migrate to deterministic md5 uids).

---

## Guardrails (what does NOT change)

- **No CSS generation changes** — helpers build the same strings. Not a converter/walker/pipeline change → no conformance golden moves (render-side, STOP-60).
- **Spec 32 no-inline compliance unchanged + improved** — still scoped CSS, zero inline `style=` declarations.
- **No block version bumps / no deprecations** (D270/D293) — render-side output lands fresh on reclone.

---

## Verification (build session — end-to-end, on the REAL page)

1. Deploy plugin → OPcache reset + `hosting_clearWebsiteCacheV1` (STOP-CDN) → re-clone page 8.
2. **Headline metric (Playwright, live page 8):** body `<style>` count. Phase 1 → ~100 → **1** footer tag. Phase 2 (default) → **0 body tags** + one head `<link href="/uploads/sgs-css/<hash>.css">`, HTML ~33KB lighter. `fetch(url,{cache:'no-store'})` returns the SGS rules; 2nd load serves from head not inline.
3. **Zero visual regression at 375/768/1440** — per-element computed-style matched by CONTENT vs pre-change baseline (label capsules, hero, product-card trial tag, buttons, testimonials). Bean's eye co-authoritative (R-31-13). NEVER cite computed-parity % (STOP-PARITY-NOT-A-MEASURE).
4. **Editor parity** — editor ServerSideRender canvas still styled (inline retained in editor). Highest-risk check.
5. **`:hover` + residual precedence intact** — preset button hover fires; a `sgsCustomCss` residual band still wins at its breakpoint (D303).
6. `python -m pytest converter/tests -q` (449 pass / 1 skip — unchanged) + `npm run build` green.

---

## Sequencing

```
design (DONE, approved) → /qc-council on collector + editor-parity + file-generate/invalidation (blub.db 255)
      ↓
Task 0: UPDATE SPEC 32 (DONE — §6.2 / FR-32-11, v1.2)
      ↓
Phase 1: inline collector (~60 blocks + wrapper + custom-css), per-block LANDED verify
      ↓ (Phase 1 landed + zero regression)
Phase 2: external-file generate-then-serve, made DEFAULT
      ↓
LANDED verify Phase 2 default on page 8
```

Solo implementer, one writer per file. Phases 1+2 = one continuous programme, single `/qc-council` up front covering both. Build session reads Spec 31 IN FULL first (Bean-locked).

---

## `/qc-council` corrections (2026-07-12, 3 cross-model raters) — FOLDED IN, mandatory for the build

Verdict: **GO-WITH-FIXES.** All 3 raters agree the direction is correct; none said "don't". Each found the same class of gap — under-specified implementation details that would break silently. The corrections below are now part of the contract.

### C1 — The collector is an emit-site AUDIT, not a mechanical find/replace (Rater A)
The "~60 blocks, one identical shape" premise is FALSE — there are **6+ distinct emit shapes**. The build handles each:
- **Shape A** — `printf/sprintf('<style id=…>', $uid, $css)` echoed immediately (~17 confirmed: hero, cta-section, icon, text, post-grid, gallery, feature-grid, tabs, tab, content-collection, accordion, accordion-item, trustpilot-reviews, google-reviews, breadcrumbs, pricing-table). The clean case.
- **Shape B** — inline `<style><?php echo wp_strip_all_tags(implode('', $scoped_css)); ?></style>`, **no id** (label:348, quote:571, heading:562, audio:241, counter:372).
- **Shape C** — `echo '<style>'.wp_strip_all_tags($css).'</style>'`, no id (button:822).
- **Shape D** — variable reassigned at **3 sites** then concatenated INTO `$inner` before the wrapper call (product-card:291/344/383 → used 351/453). **Collect at the point of FINAL USE, not each reassignment**, else one uid gets multiple partial calls.
- **Shape E** — variable prepended OUTSIDE the wrapper call: `echo $var . SGS_Container_Wrapper::render(...)` (testimonial-slider:432/442, trust-bar:400, multi-button:173).
- **Shape F** — the wrapper's own internal emit (`class-sgs-container-wrapper.php:1462`), a private prepend.
- **Shape G** — `custom-css.php:55-66` is NOT a render.php tail — it's a **separate `render_block` global hook** with its **own content-derived uid** (`md5($custom_css.$blockName)`) that MUST stay appended-last for D303 residual precedence. Needs its own collector call in its own uid namespace, not the generic shim.

### C2 — Editor-parity gate: the predicate is load-bearing and the obvious one is WRONG (Rater A)
`!is_admin()` is **false during REST**, so it would misclassify the 8 confirmed `ServerSideRender` blocks' editor previews as frontend → their CSS buffers, never flushes on that REST request → **editor canvas renders those blocks unstyled**. Correct predicate (build MUST use this exact form):
```php
function sgs_is_frontend_render(): bool {
    return ! is_admin() && ! wp_is_serving_rest_request(); // WP 6.5+; site floor is 6.9–7.0
}
```
Blanket-REST exclusion verified safe — no other plugin REST route (`class-post-grid-rest.php`, `class-product-search-rest.php`) calls `render_block()`/`SGS_Container_Wrapper::render()`.

### C3 — Buffer ordering invariant (Rater C)
Flush = **pure insertion-order `foreach($buffer)`** — NO `ksort`, NO group-by-block, NO `unset()`+re-insert (which reorders PHP arrays). State it as an inline code comment + a QC check. D303 order (block rule before its residual) is preserved by WP's execution order (render_callback before render_block filter) ONLY IF the flush never reorders. Collector must be **append-safe OR provably single-call-per-uid** (`$buffer[$uid] = ($buffer[$uid] ?? '').$css`) so a legitimate second call for one uid never drops the first payload.

### C4 — uid-dedup audit widens to 4 blocks (Rater A)
Non-deterministic `wp_unique_id()` scoping uids: **feature-grid, filter-search, trust-bar (`:28`), multi-button (`:85`)** — they still consolidate, just don't dedup identical instances (minor). **EXCLUDE pricing-table's `$block_id` (`:81`)** — that's a legitimate non-deterministic FORM id (radio `for`/`id`/`name`), not a CSS scope; its CSS uid (`:94`) is already deterministic. Do not "fix" it.

### C5 — Universality completeness (Rater C)
The "~60 blocks" list is illustrative. Before calling the migration done, **diff the converted set against the DB-authoritative block roster (`/sgs-db`)** so no block is silently left emitting the old inline tag (R-31-9).

### C6 — Phase 2 external-file: UNSOUND as first specified; 7 soundness fixes REQUIRED to ship as default (Rater B)
Rater B proved the naive Phase-2 is unsafe under this site's actual stack (LiteSpeed full-page cache **freezes the cold inline response**, so "next load serves from head" is often FALSE; a single non-singular transient **collides** across archive/search views). BUT Rater C proved **Phase 2 IS the genuine fix** to Bean's parking item-F concern ("CSS still inline, just relocated") and Phase-1-alone would REPEAT that cheat. So Phase 2 must ship — **built soundly**, reusing the project's own existing pattern (`includes/class-cart-cache-purge.php` render-time staleness guard + `litespeed_purge_post`). Required (all 7):
1. **Global CSS-epoch** baked into the pointer/filename — bumped on `save_post`, template/template-part save, **global-styles / snapshot push**, and plugin deploy — so a bump orphans all stale pointers by construction (save_post alone is insufficient: token/global-styles changes don't fire it).
2. **Non-singular key = hash of request identity** (URL path + normalised query vars), never one shared transient.
3. **Atomic file write** (tmp + `rename`) — no truncated-file race.
4. **Explicit `litespeed_purge_post`** on invalidation (mirror `Cart_Cache_Purge`) — else the frozen full-page cache serves stale for the whole TTL.
5. **Immutable `Cache-Control` headers** on `/uploads/sgs-css/*.css` (`.htaccess`/LiteSpeed rule) — content-hash filenames are safe-forever.
6. **GC/expiry policy** for orphaned hashed files.
7. **Cached (not per-request) writability check**; not writable → permanent inline fallback.
Plus **cascade order** (Rater C): `wp_enqueue_style('sgs-page-css', …)` needs explicit `$deps` on the page's block-style handles OR a later priority than WP's block-style auto-enqueue — **verified LIVE** (Playwright `<head>` `<link>` order), not by code inspection.

### C7 — LANDED bar (Rater C) — prevents a Phase-1-only "relocated not fixed" false-done
LANDED verification MUST assert **0 body `<style>` tags + 1 head `<link>`** (default file mode), not merely "≤1 tag" — Phase-1-alone satisfies "≤1" but is exactly the cheat Bean flagged. Plus a live D303 residual-win check + the C6 head-order check.

**Net:** GO-WITH-FIXES. The collector + editor gate (Phase 1) is well-proven (2 in-codebase precedents: `product-faq-schema.php`, `class-product-item-list.php`); Phase 2 is the real fix and ships with the 7 soundness fixes reusing `class-cart-cache-purge.php`. Build is larger + better-specified than first scoped — a per-emit-shape audit, not a find/replace.
