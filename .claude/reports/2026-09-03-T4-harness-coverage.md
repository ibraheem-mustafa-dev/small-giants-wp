# T4 — CSS-effect harness coverage pass

**Date:** 2026-09-03
**Scope:** `plugins/sgs-blocks/scripts/qa/` only (per brief). No `git` commands run. No `render.php`,
`block.json`, or `src/` files touched. No deploy, no `sgs-update-v2.py`, no shared-DB writes.

## Baseline vs brief — measured discrepancy

The brief stated "18 of 39 blocks run". Directly measuring `ls plugins/sgs-blocks/src/blocks | grep
render.php` found **83** blocks with a `render.php`, not 39 — the brief's total was stale. My own
baseline sweep (looping the harness over all 83 with `--attrs '{}'`) measured:

**Baseline: 51 of 83 RUN, 32 NOT RUN.**

This is the actual starting point used for all "before/after" comparisons below — re-read from the
tool output, not carried over from the brief.

## Final coverage

**Final: 81 of 83 RUN** (measured by re-running the identical sweep after every change; the last
sweep is the number reported here).

`node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --self-test` → **ALL SELF-TESTS PASSED**
after every round, including the final one.

## Files changed

- `plugins/sgs-blocks/scripts/qa/lib/wp-stubs.php` — added ~25 function/class stubs + 2
  `require_once`s of real SGS files (see below).
- `plugins/sgs-blocks/scripts/qa/lib/render-css-harness.php` — added 3 real-value constant
  definitions (`SGS_BLOCKS_PATH`, `SGS_ATTRIBUTION_URL`, `SGS_ATTRIBUTION_TEXT`) that mirror the
  real plugin bootstrap, plus the `field-render-helpers.php` require noted below.
- `plugins/sgs-blocks/scripts/qa/lib/google-reviews-settings-stub.php` (new) — thin stand-in class
  for `SGS\Blocks\Google_Reviews_Settings`.
- `plugins/sgs-blocks/scripts/qa/lib/sgs-is-frontend-render-stub.php` (new) — verbatim
  reproduction of `SGS\Blocks\sgs_is_frontend_render()`.

Two new small files exist only because PHP does not allow mixing a namespaced declaration with
this project's unnamespaced global-scope stubs in one file (a genuine parse-error constraint, not a
style choice) — `wp-stubs.php` `require_once`s both.

## SGS-helper loading change (the `field_id` fix)

`plugins/sgs-blocks/includes/forms/field-render-helpers.php` (namespace `SGS\Blocks\Forms`) defines
`field_id()`, `field_open()`, `field_label()`, `field_help()`, `field_error()`, `field_close()`,
`field_input_attrs()` — every form-field-* `render.php` imports these via `use function`. The file
is loaded exactly once, by the plugin bootstrap (`plugins/sgs-blocks/sgs-blocks.php:73`), never by
the individual `render.php` files. The harness has no bootstrap, so `render-css-harness.php` now
`require_once`s this file immediately after `wp-stubs.php` — same pattern the bootstrap uses. This
alone unblocked 13 of 14 form-field-* blocks in one round (the 14th, `form-field-file`, needed
`esc_html__` too).

All functions the file itself calls (`sanitize_key`, `wp_unique_id`, `esc_attr`, `esc_html`,
`get_block_wrapper_attributes`) were already stubbed, so no new stub was needed to support it.

## Stubs added to `wp-stubs.php`, with faithfulness rationale

Every stub below returns the simplest value that lets rendering proceed **without inventing
content** — most return WP's own documented "unset/no-context" default, matching the existing file's
established convention (e.g. `get_post_meta()` already returned empty).

| Function/class | Return value | Why faithful |
|---|---|---|
| `esc_html__` | `esc_html($text)` | Same pattern as the file's existing `esc_attr__` stub; no translation catalogue exists in the harness. |
| `tag_escape` | `strtolower(preg_replace('/[^a-zA-Z0-9_:]/','',$tag))` | Reproduces WP core's real algorithm verbatim (minus the `tag_escape` filter hook, which has no listeners here). |
| `wp_kses` | Input returned unchanged | Matches the file's pre-existing `wp_kses_post()` pass-through convention; every call site passes markup the block itself generated, not untrusted input. |
| `is_singular` / `is_archive` / `is_search` / `is_404` | `false` | No current `WP_Query` exists in a standalone CLI process — this is the true state, not a guess. |
| `get_queried_object_id` / `get_the_ID` | `0` | Same "no current post" reasoning. |
| `wp_get_global_settings` | `array()` | `sgs_resolve_palette_hex()`'s own doc comment states it degrades to the caller's `$fallback` when global settings are unavailable — this is that documented state, not an invented palette. |
| `wp_enqueue_style` | no-op | Matches the file's existing `do_action()` no-op convention. |
| `has_action` | `false` | Same "no listeners registered" convention as `do_action`. |
| `add_action` | no-op, returns `true` | Matches `do_action`'s convention; nothing in the harness ever fires `wp_footer` etc. |
| `_n_noop` | Real WP return shape (`singular`/`plural`/`context`/`domain` keys + numeric `0`/`1`) | Callers read those keys directly via `translate_nooped_plural()`, not just the raw strings — reproduced exactly. |
| `translate_nooped_plural` | Selects singular/plural by `$count`, untranslated | Real WP algorithm's selection logic; no translation catalogue exists (mirrors `__()`'s existing pass-through). |
| `get_theme_mod` | `$default` | No theme mods registered in a bootstrap-less harness. |
| `get_query_var` | `$default` | No global `WP_Query` has run. |
| `get_posts` / `get_pages` / `wp_get_nav_menus` | `array()` | Faithful "nothing found" — every caller in the actual tree is documented to fall through to its next source/fallback on empty. |
| `get_post` | `null` | No current/specified post exists. |
| `get_option` | `$default` | No options table in the harness — every option is genuinely unset. |
| `get_nav_menu_locations` | `array()` | No classic theme menu locations registered. |
| `plugins_url` | `'https://example.test/wp-content/plugins/' . $path` | Same synthetic-domain convention already used by the file's `rest_url`/`admin_url`/`home_url` stubs. |
| `get_theme_file_path` | A path under `/sgs-qa-harness-no-theme-loaded/...` | Deliberately non-existent so the caller's own `file_exists()` check stays honest and falls through to its real empty-string return, instead of fabricating a file that doesn't exist. |
| `human_time_diff` | Real WP threshold ladder (mins/hours/days/weeks/months/years) reproduced, English-only (no i18n catalogue) | google-reviews's own dummy-review fallback (real render.php code, not a harness fabrication — see below) needs a real elapsed-time string to render its `<time>` element. |
| `MINUTE_IN_SECONDS` … `YEAR_IN_SECONDS` | Real WP constant values | Needed by `human_time_diff` above; these are fixed, documented WP core constants, not invented numbers. |
| `is_wp_error` / `class WP_Error` | `false` unless the thing is a `WP_Error` instance / minimal constructor | Standard WP boundary shape; nothing in the harness ever constructs a real `WP_Error`, so `is_wp_error()` is always `false` here — correct, not a shortcut. |
| `SGS\Blocks\Google_Reviews_Settings` (own file) | `get_settings()` returns the real class's own documented defaults (empty `api_key`/`place_id`, `cache_ttl:6`); `fetch_reviews()` returns `array()` | The real class's `init()` registers `admin_menu`/`admin_init`/`wp_ajax_*` hooks and needs `register_setting`/`add_options_page`/etc. at load time — none of that affects CSS output, so a thin stand-in (same convention as the pre-existing `WP_Query` stub class) is more honest than pulling in a large unrelated admin-UI dependency surface. |
| `SGS\Blocks\sgs_is_frontend_render` (own file) | Real logic reproduced verbatim (`is_admin()` / `wp_is_serving_rest_request()` / `REST_REQUEST` checks) | The parent file (`class-sgs-css-registry.php`) also `add_filter()`s a `render_block` CSS-consolidation hook and defines filesystem GC helpers at load time — unrelated to this one function, so the function is reproduced rather than the whole file loaded. |
| `SGS\Blocks\Sgs_Schema` | Real file `require_once`'d (not stubbed) | Small, side-effect-free static JSON-LD encoder — no admin hooks, no filesystem access. Loaded for real so `google-reviews`'s schema output is genuine SGS logic, not a stand-in. |
| `SGS\Blocks\Sgs_Site_Info` | Real file `require_once`'d (not stubbed) | Static-only, no top-level `add_action`/`add_filter`; its `get()`/`get_esc_html()`/`get_esc_url()` paths call only already-stubbed `get_option()`/`esc_html()`/`esc_url()`. Every key resolves to `''` (the stubbed `get_option()`'s "unset" default) — the faithful "no business info configured" state. |

## `render-css-harness.php` constant additions

Three constants defined with their **real production values**, matching the real plugin bootstrap
exactly (not invented):

- `SGS_BLOCKS_PATH` — mirrors `sgs-blocks.php:28`'s `plugin_dir_path(__FILE__)`; needed by
  `google-reviews`'s `plugins_url(..., SGS_BLOCKS_PATH . 'sgs-blocks.php')` asset-URL call.
- `SGS_ATTRIBUTION_URL` / `SGS_ATTRIBUTION_TEXT` — mirror `sgs-blocks.php:45-46` exactly
  (`https://smallgiantsstudio.co.uk/` / `Website by Small Giants Studio`); needed by
  `business-info`'s `attribution` `displayType`, which the block's own code comment states is
  deliberately hardcoded (framework's own constant, not client-configurable).

## True/false discrimination proof (3 newly-unblocked blocks)

Per the guard against fake progress: for each block below, a TRUE claim against a real colour
attribute from that block's `block.json` was asserted to PASS, and a FALSE claim (same attribute,
wrong colour) was asserted to FAIL, both against the **real render.php CSS output**, not a stub.

### 1. `sgs/form-field-tiles` (`textColour`, wrapper `attrMap` → `css:color`)

```
=== form-field-tiles TRUE ===
  PASS  {"selectorContains":"sgs-form-field--tiles","property":"color","value":"#ff00aa"}
        matched: {"selector":".sgs-ft-9d4da033.sgs-form-field--tiles","decls":{"color":"#ff00aa"}}
ALL ASSERTIONS PASSED

=== form-field-tiles FALSE (must FAIL) ===
  FAIL  {"selectorContains":"sgs-form-field--tiles","property":"color","value":"#00ff00"}
        no rule found containing selector "sgs-form-field--tiles" with color:#00ff00
SOME ASSERTIONS FAILED
```

### 2. `sgs/business-info` (`iconColour` → `--sgs-bi-icon-colour`, `displayType:"attribution"`)

```
=== business-info TRUE ===
  PASS  {"selectorContains":"sgs-biz-","property":"--sgs-bi-icon-colour","value":"#123456"}
        matched: {"selector":".sgs-biz-9ae5f4c1","decls":{"--sgs-bi-icon-colour":"#123456"}}
ALL ASSERTIONS PASSED

=== business-info FALSE (must FAIL) ===
  FAIL  {"selectorContains":"sgs-biz-","property":"--sgs-bi-icon-colour","value":"#abcdef"}
        no rule found containing selector "sgs-biz-" with --sgs-bi-icon-colour:#abcdef
SOME ASSERTIONS FAILED
```

(Note: with the block's default `displayType` ("phone"), the block bails out to empty markup on the
harness's simulated frontend because no phone number is configured — real, documented render.php
behaviour, not a harness bug. `displayType:"attribution"` was used because that is the one
`displayType` that never reads client data and always renders, per the block's own code comment.)

### 3. `sgs/google-reviews` (`starColour` → `--sgs-gr-star-colour`)

```
=== google-reviews TRUE ===
  PASS  {"selectorContains":"sgs-container-","property":"--sgs-gr-star-colour","value":"#ffaa00"}
        matched: {"selector":".sgs-container-b212f12f","decls":{"--sgs-gr-star-colour":"#ffaa00"}}
ALL ASSERTIONS PASSED

=== google-reviews FALSE (must FAIL) ===
  FAIL  {"selectorContains":"sgs-container-","property":"--sgs-gr-star-colour","value":"#00aaff"}
        no rule found containing selector "sgs-container-" with --sgs-gr-star-colour:#00aaff
SOME ASSERTIONS FAILED
```

All three: TRUE passed, FALSE failed. No block "ran but emitted no CSS," and no block passed both a
true and a false claim (which would indicate the harness isn't actually discriminating).

## Blocks still NOT RUN (2 of 83), with reason

Both are genuine WP-query/core-block-parsing boundaries the harness's documented scope statement
(`wp-stubs.php`'s own header comment) already excludes — faithfully stubbing either would mean
either fabricating fake post data or running a real block-parsing engine, both of which the task's
"never invent content" instruction rules out.

- **`sgs/buybox`** — `do_blocks()` undefined at `render.php:72`. This block is inherently
  WooCommerce-dependent: with `class_exists('WooCommerce')` false (true in this harness, since no WC
  code is loaded), it *always* takes the core-block fallback path, which calls `do_blocks()` to parse
  and render `<!-- wp:woocommerce/product-image-gallery /-->` etc. — real WP core block-parsing +
  rendering machinery for blocks that are not even registered here. There is no manual/non-WC render
  path in this block to fall back to.
- **`sgs/post-grid`** — `WP_Query::have_posts()` undefined at `render.php:418`. Confirmed by reading
  the file: `$query = new WP_Query($query_args)` at line 218 is unconditional — this block has no
  `source` attribute or manual-mode branch that skips the query. The existing `WP_Query` stub class
  in `wp-stubs.php` is intentionally thin (documented in its own comment as a stand-in for branches
  the harness is "expected to avoid"); making `have_posts()`/`the_post()` return a fabricated post
  would produce CSS assertions against invented content, not real block behaviour.

## Verification

- `node plugins/sgs-blocks/scripts/qa/assert-css-effect.js --self-test` — **ALL SELF-TESTS PASSED**,
  re-confirmed after every round of stub additions (5 separate re-runs during this session).
- Full 83-block sweep re-run after the final edit (not carried over from an earlier round):
  **81 RUN / 2 NOT RUN**, matching the number reported above.
- `php -l` clean on all 4 touched/new PHP files.
