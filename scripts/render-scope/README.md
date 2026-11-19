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

The render check runs only when a change's risk and reach warrant it (Bean, 2026-11-19): this script gives the reach, and the session judges the risk. A block-scoped change that is provably additive (new settings that are off by default, with a test showing an unset block renders byte for byte as before) needs no slow check; say in the commit message which level was chosen and why. One mirror's clean result can stand for the same mechanism on the others.

| Exit | Meaning | Before the change reaches `main` |
|---|---|---|
| 0 | no visitor's page can change | nothing more |
| 1 | only pages holding the named blocks can change | where the change is not provably additive, per mirror, the line the script prints: nothing where no saved post holds them; `render-check.py --only <pages>` where only pages do; the whole check where a template, header, footer, pattern or other site-wide post does |
| 2 | any page can change | the render check, on the live shop's mirror at least and on every mirror for a change to how existing settings render |
| 3 | a checkout has no build | build it |

With `--mirrors`, each mirror is asked read only (`posts-holding.php`, wp-cli in WSL) which published or private posts hold the blocks. The front page is the render check's `home` state and any other page `page-<slug>`.

## Limits

- It reads files, not behaviour: a `block` or `shared` verdict says a page can change, never that it does. Only the render check proves no change.
- A block reached only through another block's server-side render (a pattern printed by PHP, a block rendered inside a shortcode) is not in any post's content: treat a change to such a block as shared.
- A new setting counts as `settings` only while no existing setting changes beside it; a renderer that reads a new setting's default is a changed `render.php`, which is listed.
