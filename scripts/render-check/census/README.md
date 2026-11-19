# Custom CSS census and detector

Read-only tools for the `sgsCustomCss` block attribute (the Custom CSS box in the block inspector). Every command takes `--site`, the WSL site folder name under `/var/www` (a local mirror such as `local-mediatest-classa`), and an optional `--out` folder (default `E:/sgs-tmp/render-check/census/<site>/`). Nothing is written to a site or to the repo, and the framework database is opened read-only. Run the three steps in order from this folder.

## export-custom-css.py: the census

`python export-custom-css.py --site local-mediatest-classa`

Exports every post with content through `export-posts.php` (WP-CLI in WSL), parses the block comments with `parse-custom-css.py` into `custom-css.json` (one record per attribute, the CSS split into rules), then recounts independently with `verify-count.php` (WordPress's own block parser). It prints the census line (posts scanned, attributes, characters and bytes, rules, parse errors), the recount `TOTAL` line, and whether the two agree. Exit 0 when they agree. `--no-verify` skips the recount. Characters are UTF-8 characters; the byte total is shown because PHP's `strlen` counts bytes (a curly quote is one character and three bytes).

## build-emit-map.py: the setting-to-selector map

`python build-emit-map.py --site local-mediatest-classa`

Renders each block type that carries Custom CSS with one setting changed at a time (`emit-probe.php`, rendering only: no post, option or meta is saved) and records which selector and property each setting really prints. It writes `emit-map.json` into the output folder and prints one line per block (settings that print CSS, renders, seconds). Run it on a scratch copy of the site, not the site being audited. The detector works without the map, but only on its static routes.

## check-custom-css-has-setting.py: the detector

`python check-custom-css-has-setting.py --site local-mediatest-classa` (`--self-test` plants positives and negatives and needs no site)

Reads `posts-raw.json` and `emit-map.json` from the output folder and flags every Custom CSS declaration that an existing setting of the same block could hold. It prints a per-post table of findings by tier (confirmed, likely, inert, candidate), how many findings name a setting that is unset, saved with the rule's value or saved with another value, and writes every finding to `detector-results.json`. Exit 1 when any confirmed or likely finding exists (`--strict` adds candidates). Candidates are noise by design: read confirmed and likely only.

## Main blind spots of the detector

- It has no DOM. Two selectors that reach the same element by different class names (`.sgs-account__addr-read` and `.woocommerce-Address address`) are not matched, so some real misses appear only as candidates.
- It follows a setting only to the property and selector the probe saw. A setting that prints a custom property (`--sgs-btn-bg-hover`, `--sgs-icon-bg`) that the block's stylesheet consumes elsewhere is found by name or property only.
- It matches the property, not the value. A switch, a colour asked to remove a border, a font size of zero used to hide text, or a keyword the control does not offer all show as findings although the setting cannot hold the rule.
- The emit map is one render per block type, from the saved instance with the most settings. A setting that prints only in another mode, another account view, or beside a companion setting is missing from it, and a block that needs an order or other context (`sgs/order-items`) does not render at all.
- A breakpoint other than the 768 and 1024 device tiers is `off-tier`, because a per-device setting cannot hold it, and a block with no rows in `block_attributes` can never be flagged.
