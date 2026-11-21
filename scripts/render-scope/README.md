# Render scope

Answers in seconds, from two built checkouts, the question the render check (`scripts/render-check/`) takes half an hour a site to answer by rendering: which pages can this plugin or theme change alter at all?

```
python scripts/render-scope/render-scope.py --before <checkout> --after <checkout> --mirrors local-mamas,local-indus,local-eye-care
python scripts/render-scope/render-scope.py --self-test
```

Both checkouts need a built plugin (`plugins/sgs-blocks/build`). The script hashes every file a visitor's page can load (the plugin's `build/`, `includes/`, `assets/` and root PHP files, and the theme) on both sides and sorts each file that differs:

| Kind | Files | What can change |
|---|---|---|
| `editor` | a block's `index.js`, `index.asset.php`, `index.css` | nothing a visitor loads |
| `settings` | a `block.json` whose only changes add settings or change editor metadata (descriptions, context lists, examples, variations) | nothing, until a `render.php`, stylesheet or view script reads them, and those are listed on their own |
| `block` | a block's `render.php`, front-end stylesheets and view scripts; a `block.json` that changes or removes an existing setting's type, default, enum or source, or any other key (`supports`, `render`, `style`, `viewScript`) | only pages holding that block |
| `shared` | everything else: plugin includes, assets, shared build chunks, the theme | any page |

A shared file whose only loaders are known blocks can be named with `--used-by <file>=<block>[,<block>]` (an asset one block's `render.php` enqueues); say in the commit message how you know.

## What to do with the answer

Run the shortest check that answers the question, sized to what the change can reach and what a miss would cost (Bean, 2026-11-19 and 2026-11-21). This script gives the reach; the session judges the value of each run before starting it:

- **Narrow `shared` first.** For each shared file, name its real loaders with `--used-by` (say in the commit message how you know). A change that is only additive (a new function, a new class prefix, a CSS fallback equal to the old value, new settings off by default with a test showing an unset block renders byte for byte as before) reaches nothing that renders today. Only a file every page draws through in a changed way (the theme's global styles, the focus system, a default every page uses) leaves the reach at every page.
- **Once per mechanism.** The code is the same on every site, so run on the one mirror that carries most of the affected blocks (Mama's when the live shop's basket, checkout or account is reached). Add another site only for a block, page or saved setting that site alone shows, and then only those states.
- **Only the states that hold the change** (`--only`), unless a template, header, footer or other site-wide post holds it.
- **Read a difference before re-running.** Look at its pair and read both copies; a flip the unchanged copy also shows is an existing fault: record it and move on.
- **Say what ran** in the commit message: which states, on which mirror, and why that was enough.

| Exit | Meaning | Before the change reaches `main` |
|---|---|---|
| 0 | no visitor's page can change | nothing more |
| 1 | only pages holding the named blocks can change | where the change is not provably additive, per mirror, the line the script prints: nothing where no saved post holds them; `render-check.py --only <pages>` where only pages do; the whole check where a template, header, footer, pattern or other site-wide post does |
| 2 | a shared file differs | narrow it with `--used-by`; whatever still reaches every page gets one run, on the mirror that carries the change, plus another site only for what that site alone shows |
| 3 | a checkout has no build | build it |

With `--mirrors`, each mirror is asked read only (`posts-holding.php`, wp-cli in WSL) which published or private posts hold the blocks. The front page is the render check's `home` state and any other page `page-<slug>`.

## Limits

- It reads files, not behaviour: a `block` or `shared` verdict says a page can change, never that it does. Only the render check proves no change.
- A block reached only through another block's server-side render (a pattern printed by PHP, a block rendered inside a shortcode) is not in any post's content: treat a change to such a block as shared.
- A new setting counts as `settings` only while no existing setting changes beside it; a renderer that reads a new setting's default is a changed `render.php`, which is listed.
