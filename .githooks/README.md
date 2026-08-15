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

### Three visual-diff report types *(intent capture added 2026-08-15)*

A passing report needs `verdict: PASS`, a matching `source_sha:`, and ONE of:

| Field | Fits | Evidence |
|---|---|---|
| `first_paint_capture_passed: true` | Default — a change that could plausibly move rendered output elsewhere too | Before/after diff via `make-visual-diff-reports.py` + the tier-fixture capture pipeline |
| `editor_capture_passed: true` | edit.js/editor.css-only changes (auto-detected, `check-editor-canvas-css.py`) | Editor-canvas capture |
| `intent_capture_passed: true` | A change where "before" isn't meaningful — dead-code removal, a one-off value fix, a new isolated capability — and the real question is just "does the current state match what I intended?" | **One live capture, no before-state.** Always available; it's an author judgement call, not something a file-scope heuristic decides for you. |

**Report shape for `intent_capture_passed`** (convention — the gate doesn't parse
the body, same as the other two types):

1. **Assertion(s)** — state what should be true about the current rendered output,
   BEFORE measuring it.
2. **Live result** — the actual measured value(s) against the live canary, one per
   assertion.
3. **Why before/after doesn't apply** — one sentence.
4. The three frontmatter fields above (`source_sha` from `visual-report-sha.py`,
   same as any other report type).

Worked example: `reports/visual-diff/info-box-2026-08-15.md` — a dead CSS selector
removal, where "before" was a non-rendering state and a diff against it couldn't
prove anything a live check couldn't.

### Scoped visual-diff bypass *(added 2026-08-15)*

`SGS_VISUAL_GATE_SKIP=<block>[,<block>...]` + a mandatory
`SGS_VISUAL_GATE_REASON="..."` skips ONLY the visual-diff gate, ONLY for the named
block(s) — gitleaks, block-uniformity, the F5 gates, the wp-* pre-merge gate and
Gate A all still run. `SKIP` without `REASON` fails closed (the block stays
blocked). Every use is logged to `reports/visual-diff/manual-skips.log`, tracked
in git for a permanent audit trail. Use this instead of `git commit --no-verify`
when a change is genuinely visual but a capture genuinely isn't possible right
now (no canary page for the block, sandbox down) — `--no-verify` turns off six
unrelated working gates to skip one; this turns off only the one.

## `sgs-gates.sh` — the SGS commit gates *(added 2026-08-11, D564)*

Everything the visual-diff gate does (plus its five auto-skip branches), the M1
CSS first-paint audit, the block-uniformity audit, the Stage 0.1/0.5 mockup
lints, the wp-* pre-merge gate and Gate A.

**Why it moved here.** All of that logic used to live *only* in the untracked
`.git/hooks/pre-commit` — around 200 lines of it. So every one of those gates
existed on exactly ONE machine: a fresh clone, a second worktree, or a co-active
session on another box got none of them, while this tracked directory looked
like the whole defence. A comment inside that file had already recorded the
consequence in July 2026 (*"NOTE: .git/hooks/ is untracked, so this fix is LOCAL
ONLY and will not reach other clones"*) without the logic ever being moved.

Three defects were found and fixed in the move, each of which silently weakened
the gates on any machine but this one:

| Defect | Effect before |
|---|---|
| `gitleaks` missing → `exit 0` | Aborted the **entire** hook. No gitleaks meant no SGS gates either, and the commit looked checked. |
| Gate A hardcoded `/c/Python313/python.exe` | Died with "command not found" anywhere else; a missing interpreter and a real fixture regression were indistinguishable. |
| Gate A read `${PIPESTATUS[0]}` under `#!/bin/sh` | `PIPESTATUS` is bash-only; under a POSIX shell it read `sed`'s status instead of pytest's, so Gate A would report **PASS on a real regression**. Worked here only because Git-for-Windows' `sh` *is* bash. |

## Activation (per clone)

`.git/hooks/pre-commit` is per-machine and not version-controlled *by design* —
it holds only the path to the machine's Gitleaks binary. It is a thin wrapper:

```sh
REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK_EXIT=0
# ... gitleaks (machine-specific path, skips ITSELF if absent) ...
sh "$REPO_ROOT/.githooks/sgs-gates.sh" || HOOK_EXIT=1   # SGS gates
sh "$REPO_ROOT/.githooks/pre-commit"   || HOOK_EXIT=1   # commit floor
exit $HOOK_EXIT
```

A fresh clone copies that wrapper (adjusting only the Gitleaks path, or setting
`SGS_GITLEAKS`). **All check logic stays here, version-controlled.**

⛔ **Do not add gate logic to `.git/hooks/pre-commit`.** Untracked means invisible
to review, absent from other clones, and lost on a re-clone. New gates go in
`sgs-gates.sh`.

Note: the gate also runs in WRITE mode automatically on every `npm run build` /
`npm run start` (prebuild/prestart regenerates the file), so a build can never
ship a stale list regardless of hook activation. The pre-commit gate is the
extra catch for commits made without a build.
