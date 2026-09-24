# Git hooks (`.githooks/`)

Version-controlled commit checks. The per-machine wrapper `.git/hooks/pre-commit` (untracked;
it holds the machine-specific Gitleaks path) runs, in order:

1. **Gitleaks** — blocks a commit that contains a secret.
2. **`sgs-gates.sh` — Gate A.** When converter code is staged, runs
   `plugins/sgs-blocks/scripts/tests/test_converter_conformance.py` and blocks if the emit
   diverges from the golden fixtures (~2 minutes).
3. **`pre-commit`:**
   - When extension JS or `includes/extension-attributes.generated.php` is staged, checks the
     generated attribute list is in sync (`node plugins/sgs-blocks/scripts/generate-extension-attributes.js --check`).
     A stale file breaks ServerSideRender previews with "Invalid parameter(s): attributes".
   - When cloning-pipeline code is staged (`converter/`, `orchestrator/`, `ledger/`,
     `cheat-gate/`, `excluded-gate/`, `sgs-clone-orchestrator.py`), runs the seven pipeline gates
     in `--check` mode. Scoped bypass for unrelated shared-DB debt:
     `SGS_F5_SKIP=<script> SGS_F5_SKIP_REASON="..." git commit ...` (logged to `reports/f5-manual-skips.log`).

Do NOT run `git config core.hooksPath .githooks`: it would bypass the wrapper and disable Gitleaks.
Everything else (block uniformity, inspector scan, the fast gate tier) runs in the build's
`prebuild` via `plugins/sgs-blocks/scripts/run-gates.py`.
