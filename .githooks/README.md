# Git hooks (`.githooks/`)

Version-controlled commit checks. The per-machine wrapper `.git/hooks/pre-commit` (untracked; it holds the machine-specific Gitleaks path) runs, in order:

1. **Gitleaks** — blocks a commit that contains a secret.
2. **`sgs-gates.sh`** — the slot for commit-time gates. It runs the Spec 49 Stage B folder freeze (`python scripts/check-stage-b-freeze.py`) when a file under `plugins/sgs-blocks/src/blocks/` is staged: once `feature/media-stage-b` exists (local or `origin`), a commit that stages a file in a block folder named in `plugins/sgs-blocks/scripts/data/media-adoption.json` is refused unless it is made on that branch or on a detached HEAD above its tip. It reads local refs only and is silent when the branch does not exist.
3. **`pre-commit`** — when extension JS or `includes/extension-attributes.generated.php` is staged, checks the generated attribute list is in sync (`node plugins/sgs-blocks/scripts/generate-extension-attributes.js --check`). A stale file breaks ServerSideRender previews with "Invalid parameter(s): attributes". When a `.md` file is staged, refuses one that is hard-wrapped (`python scripts/check-md-wrap.py --check`; every paragraph and list item is one line) and prints the `--write` command that fixes it.

Do NOT run `git config core.hooksPath .githooks`: it would bypass the wrapper and disable Gitleaks. Everything else (block uniformity, inspector scan, the fast gate tier) runs in the build's `prebuild` via `plugins/sgs-blocks/scripts/run-gates.py`.
