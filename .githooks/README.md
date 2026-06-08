# Git hooks (`.githooks/`)

Version-controlled hook **logic** for this repo. The scripts here hold the
checks; how they get invoked depends on the machine's existing hook setup.

> ⚠️ Do NOT run `git config core.hooksPath .githooks` on this repo. The active
> `.git/hooks/pre-commit` is a Gitleaks secret-scanner (installed by Blub) plus
> several SGS audit gates. Repointing `core.hooksPath` would DISABLE all of
> those. Instead, the existing `.git/hooks/pre-commit` *delegates* to the
> scripts here (see below).

## `pre-commit`

Runs `node.exe plugins/sgs-blocks/scripts/generate-extension-attributes.js --check`
whenever a commit stages extension JS (`plugins/sgs-blocks/src/blocks/extensions/*.js`)
or the generated `includes/extension-attributes.generated.php`. It **blocks the
commit** if the generated `sgs*` attribute list is out of sync with the JS.

Why: the generated list is registered server-side so WordPress's block-renderer
REST route accepts the editor-injected `sgs*` attributes. If the JS gains a new
attribute and the generated file isn't regenerated, ServerSideRender-preview
blocks (product-card bound, trustpilot-reviews, business-info, content-collection)
break with "Error loading block: Invalid parameter(s): attributes". Fix:
`node plugins/sgs-blocks/scripts/generate-extension-attributes.js` (or `npm run
build` in the plugin), re-stage, commit. (Uses `node.exe` so it runs even when
the bare `node` shim is broken under nvm4w on Windows git-bash.)

## Activation (per clone — one line appended to the existing hook)

`.git/hooks/pre-commit` is per-machine and not version-controlled. On this
machine it already delegates here via, before its final `exit`:

```sh
# Extension-attribute drift gate (logic version-controlled in .githooks/)
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ -f "$REPO_ROOT/.githooks/pre-commit" ]; then
    sh "$REPO_ROOT/.githooks/pre-commit" || SGS_EXIT=1
fi
```

A fresh clone that wants this gate adds the same delegation line to its
`.git/hooks/pre-commit` (keeping whatever secret-scan / audit hooks it already
has). The check logic itself stays here and is version-controlled.

Note: the gate also runs in WRITE mode automatically on every `npm run build` /
`npm run start` (prebuild/prestart regenerates the file), so a build can never
ship a stale list regardless of hook activation. The pre-commit gate is the
extra catch for commits made without a build.
