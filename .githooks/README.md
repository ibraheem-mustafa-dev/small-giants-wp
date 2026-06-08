# Git hooks (`.githooks/`)

Version-controlled git hooks for this repo. Activate them once per clone:

```bash
git config core.hooksPath .githooks
```

(`core.hooksPath` is a local setting, not committed — each clone runs the line above once. Verify with `git config core.hooksPath` → should print `.githooks`.)

## Hooks

### `pre-commit`
Runs `node plugins/sgs-blocks/scripts/generate-extension-attributes.js --check` whenever a commit stages extension JS (`plugins/sgs-blocks/src/blocks/extensions/*.js`) or the generated `includes/extension-attributes.generated.php`. It **blocks the commit** if the generated `sgs*` attribute list is out of sync with the JS.

Why: the generated list is registered server-side so WordPress's block-renderer REST route accepts the editor-injected `sgs*` attributes. If the JS gains a new attribute and the generated file isn't regenerated, ServerSideRender-preview blocks (product-card bound, trustpilot-reviews, business-info, content-collection) break with "Error loading block: Invalid parameter(s): attributes". The hook makes that drift impossible to commit. Fix a block: run `node plugins/sgs-blocks/scripts/generate-extension-attributes.js` (or `npm run build` in the plugin), re-stage, commit.
