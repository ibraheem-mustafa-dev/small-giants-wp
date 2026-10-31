# Theme extractor

Turns a client draft into `sites/<client>/theme-snapshot.json` (Spec 32 Part C format). The requirements are Spec 48's FR-33-n (`.claude/specs/48-CLONING-SYSTEM.md`).

## Run

```bash
python plugins/sgs-blocks/scripts/theme-extractor/extract.py --client <slug> --draft "sites/<slug>/handoff/<entry>.dc.html" \
  --intake sites/<slug>/build/intake/intake.json --merge-onto sites/<slug>/theme-snapshot.json --out <file>
```

Add `--patch <file>` (repeatable) to lay Fill's snapshot-shaped `theme-snapshot.patch.json` over the result (`patch_merge.py`): it runs after the declared-token step, so a patch key wins over everything the run derived for the same path, including `settings.custom.focus` from the token files. Objects merge, scalars and arrays replace, a path the snapshot lacks is created, and the run prints every path the patch set.

`settings.custom.focus` is the draft's own focus effect: an outline on `:focus` / `:focus-visible` with no box-shadow writes `width`, `ring`, `ringOnDark`, `offset`, `style`, `bloom` 0, `ringOnly` 1 and `source` draft (the framework glow layers go inert); a focus box-shadow keeps the glow and writes the ring keys only; no focus outline writes nothing (`declared_tokens.py::apply_focus_effect`).

`styles.elements.link[':focus-visible']` is written only when the draft declares a bare `a:focus` or `a:focus-visible` rule (in `tokens/*.css` or its CSS); the framework `theme.json` look that the baseline copies in is removed otherwise (`declared_tokens.py::apply_link_focus`).

Measuring needs Playwright: from a worktree without `node_modules`, set `NODE_PATH` to the main checkout's `plugins/sgs-blocks/node_modules`.

## The palette is the draft's own shades (Spec 32 FR-32-28)

For an export with `tokens/colors.css`, `shade_palette.py::apply` runs last and replaces `settings.color.palette` with one entry per literal colour token (slug the exact token name, display name without the namespace word most tokens share, so `--mm-cocoa` is "Cocoa"), writes gradient tokens to `settings.color.gradients`, leaves out aliases (`var(--x)`), tokens named for a registry brand (`palette_vocab.py::brand_words`) and one-offs, and writes `settings.custom.colourRoles` (`{role: shade slug}`; a status role the draft has no shade for holds the framework hex). A role's shade comes, weakest first, from the usage proposals the run derived, the draft's alias tokens (`--text-body: var(--ink)` through any chain, named by `scripts/computed-route/data/palette-role-words.json`), then Bean's confirmed intake marks; a role nothing names follows its related role (`palette_vocab.py::ROLE_DEFAULT_TABLE`). A role nothing names is read from what the draft paints in its job (`role_readings.py`, from the intake's `palette.json` usage records and the measured primary button: control borders for `border`, a lighter divider for `border-light`, the primary hover fill for `primary-dark`, the most used pale accent-hue fill for `accent-light`) and points at the shade of that exact colour or holds its raw hex; a role the draft never shows takes the role it renders as. No role is ever a review row. A shade whose name is also a role slug pointing elsewhere is suffixed `-shade`. A reference to a removed palette slug is renamed to the shade of the same colour. A draft with no colour token is untouched. The theme prints the pointers (`theme/sgs-theme/inc/colour-roles.php`).

Palette marks only correct the reading (FR-32-28): `confirmed_palette.py::effective_marks` treats an unmarked or `None` row as accepted and feeds Bean's answer key (`sites/<client>/build/intake/palette-key.json`, read beside the intake) as `role:` marks, so a plain `extract.py ... --intake sites/<slug>/build/intake/intake.json --merge-onto sites/<slug>/theme-snapshot.json --out sites/<slug>/theme-snapshot.json` reproduces the committed palette and `colourRoles`.

## What wins

1. The export's `tokens/*.css` (a Spec 48A handoff): palette colours through Bean's confirmed intake marks (`confirmed_palette.py`), easings (`motion_tokens.py`), and the typography, gutter and focus values each token's name states (`declared_tokens.py`).
2. The rendered draft (`measure.js`): everything the token files leave unsaid, such as button presets, heading weights and the families the draft paints.
3. The client's existing snapshot (`merge.py::merge_onto`): every key this run did not derive.
4. The framework `theme/sgs-theme/theme.json`: the rest.

## Tokens are defaults, presets are the picker scale (Spec 32 FR-32-29)

`token_families.py::apply` runs after the palette step and puts every non-colour literal token in exactly one place. A default: the token's value becomes its job's default (`declared_tokens.py` for body text, headings, line heights, tracking, gutters and the section padding per tier; `token_families.py::apply_defaults` for `settings.custom.borderRadius`, `duration.fast` and `easing.default`). A preset: font sizes `small` to `hero` (at most 6) and spacing `10` to `80` (at most 8) ascend strictly in slot order and span the draft's range (`regular` the body token, `small` the smallest token in use below it, `hero` the largest heading token, the slots between the most used tokens above body, then its most used literal sizes), named for the token, with `settings.custom.presetTokens.<fontSizes|spacing>.<slot>` recording which; two tokens with one value are one step; a heading's narrower-width tokens stay defaults. Everything else is a literal the clone writes where an element uses it. `settings.custom.defaultTokens` lists the default tokens. `token_families.py::accounting` returns each token's place.

## Check a snapshot against its draft

```bash
python plugins/sgs-blocks/scripts/theme-extractor/verify_against_draft.py --client <slug> [--snapshot <file>]
```

It compares every declared token value and every confirmed palette colour with the snapshot (preset references resolved) and exits 1 on a difference that `sites/<slug>/build/theme-verify-accepted.json` does not list with a reason. `extract.py` prints the same count after each run. A confirmed `custom-<name>` slug whose tokens are all aliases is skipped (an alias is no palette entry), and a framework role resolves through its `colourRoles` pointer. A value no token declares comes from the render and is not checked here.

## Tests

```bash
cd plugins/sgs-blocks/scripts/theme-extractor && python -m pytest tests -q
```
