# Git hooks (`.githooks/`)

Version-controlled commit checks. The per-machine wrapper `.git/hooks/pre-commit` (untracked;
it holds the machine-specific Gitleaks path) runs, in order:

1. **Gitleaks** — blocks a commit that contains a secret.
2. **`sgs-gates.sh`** — the slot for commit-time gates. It currently runs none and exits 0.
3. **`pre-commit`** — when extension JS or `includes/extension-attributes.generated.php` is
   staged, checks the generated attribute list is in sync
   (`node plugins/sgs-blocks/scripts/generate-extension-attributes.js --check`). A stale file
   breaks ServerSideRender previews with "Invalid parameter(s): attributes".

Do NOT run `git config core.hooksPath .githooks`: it would bypass the wrapper and disable Gitleaks.
Everything else (block uniformity, inspector scan, the fast gate tier) runs in the build's
`prebuild` via `plugins/sgs-blocks/scripts/run-gates.py`.
