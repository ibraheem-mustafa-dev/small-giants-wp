# Visual-diff report — buttons now use the SGS preset system (Bean-directed), 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## Bean's questions answered
**"Which number is correct — 18px or 15px?"** → **15px.** That is the SGS button
design: every one of the 3 presets AND the bare `.sgs-button` block define
15px / 600. 18px was `theme.json styles.elements.button`, which styles WP's CORE
button classes (`.wp-element-button`) only — it never reached `.sgs-button`.

**"Why did it restyle?"** → core buttons rendered via `elements.button`; SGS
buttons render via the block + presets. Swapping the block swaps the spec.

**"You recommended building theme button tokens."** → **My recommendation was
uninformed — the tokens already exist.** `theme.json settings.custom.buttonPresets`
(and every client `theme-snapshot.json`) defines primary / secondary / outline,
and `sgs/button` already reads them via `.sgs-button--{preset}` → `--wp--custom--
button-presets--{preset}--*`. Nothing to build.

## What I fixed
The core/button sweep emitted `inheritStyle:"custom"` + explicit colours for the
primary buttons, which **bypassed the preset system** (no designed hover, bare
padding). `upgrade-button-presets.py` (theme-driven, matches a button's
background against the preset backgrounds resolved from theme.json) upgraded the
**8 primary-background buttons → `inheritStyle:"primary"`**, dropping the now-
redundant colours. The **3 accent buttons stay `custom`** (no preset has an
accent background — their exact colour is preserved). The **4 outline** buttons
were already `inheritStyle:"outline"`.

## Live proof (canary 1487 core vs 1488 preset, OPcache cleared, theme ?ver bumped)
The primary button now renders **Mama's designed primary preset**, confirmed by
the rendered class `sgs-button sgs-button--primary … data-preset="primary"`:

| property | before (core `elements.button`) | after (Mama's `primary` preset) |
|---|---|---|
| element | `<a>` (no href → not focusable) | `<button type="button">` |
| background | `#e68a95` pink | `#e68a95` pink ✅ |
| text | `#fbf3dc` cream | `#3a2e26` (Mama's preset text) |
| font-size / weight | 18px / 700 | 15px / 600 |
| min-height | 0 | **48px** (preset) |
| hover | none | **Mama's designed hover** (#41322b bg / #f7f1ec text) |

The text colour, size and weight now come from **Mama's own preset definition**
(`sites/mamas-munches/theme-snapshot.json` → `settings.custom.buttonPresets.
primary`: bg `#e68a95`, text `#3a2e26`, 15px/600, min-height 48px, designed
hover). This is the design-system-correct result: the button looks like Mama's
primary button, and will track any change Bean makes to the preset — instead of
the generic core styling it had before.

`<a>` → `<button>` is correct: the core markup has no `href` (a pattern
placeholder), and an hrefless `<a>` is not keyboard-focusable whereas
`<button>` is.

Gate: `check-dead-pattern-attrs.py` unchanged (6 known hands-off findings). No
overflow at 375/768/1440. Screenshot: `button-preset-upgrade-2026-07-16-*.png`.

## Note for later (not Track C)
Mama's primary preset is dark text (`#3a2e26`) on pink (`#e68a95`) — worth a
contrast check on Mama's designed preset, but that is a preset-design question
(Bean/the snapshot owns it), pre-existing and independent of this migration.
