# Theme extractor

Turns a client draft into `sites/<client>/theme-snapshot.json` (Spec 32 Part C format). The requirements are Spec 48's FR-33-n (`.claude/specs/48-CLONING-SYSTEM.md`).

## Run

```bash
python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client <slug> --draft "sites/<slug>/handoff/<entry>.dc.html" \
  --intake sites/<slug>/build/intake/intake.json --merge-onto sites/<slug>/theme-snapshot.json --out <file>
```

Add `--patch <file>` (repeatable) to lay Fill's snapshot-shaped `theme-snapshot.patch.json` over the result (`patch_merge.py`): it runs after the declared-token step, so a patch key wins over everything the run derived for the same path, including `settings.custom.focus` from the token files. Objects merge, scalars and arrays replace, a path the snapshot lacks is created, and the run prints every path the patch set.

`styles.elements.link[':focus-visible']` is written only when the draft declares a bare `a:focus` or `a:focus-visible` rule (in `tokens/*.css` or its CSS); the framework `theme.json` look that the baseline copies in is removed otherwise (`declared_tokens.py::apply_link_focus`).

Measuring needs Playwright: from a worktree without `node_modules`, set `NODE_PATH` to the main checkout's `plugins/sgs-blocks/node_modules`.

## What wins

1. The export's `tokens/*.css` (a Spec 48A handoff): palette colours through Bean's confirmed intake marks (`confirmed_palette.py`), easings (`motion_tokens.py`), and the typography, gutter and focus values each token's name states (`declared_tokens.py`).
2. The rendered draft (`measure.js`): everything the token files leave unsaid, such as button presets, heading weights and the families the draft paints.
3. The client's existing snapshot (`merge.py::merge_onto`): every key this run did not derive.
4. The framework `theme/sgs-theme/theme.json`: the rest.

Section padding is read from the token files but never written; the build route writes each section's own padding.

## Check a snapshot against its draft

```bash
python plugins/sgs-blocks/scripts/theme-extractor/verify_against_draft.py --client <slug> [--snapshot <file>]
```

It compares every declared token value and every confirmed palette colour with the snapshot (preset references resolved) and exits 1 on a difference that `sites/<slug>/build/theme-verify-accepted.json` does not list with a reason. `extract.py` prints the same count after each run. A value no token declares comes from the render and is not checked here.

## Tests

```bash
cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests -q
```
