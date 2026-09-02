# Visual diff — sgs/site-header — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: f902b55217bec7bb

## What changed

`sgs/site-header`'s Shadow inspector control was swapped from a coarse `sm`/`md`/`lg`/`glow`
preset `SelectControl` dropdown to the shared `ShadowControl` component — the same component
`sgs/cta-section` already mounts, with the same `attrNames` wiring (`base: 'shadow'`,
`colour: 'shadowColour'`, `hoverColour: 'shadowColourHover'`).

Files: `plugins/sgs-blocks/src/blocks/site-header/block.json` (added `shadowColour` +
`shadowColourHover` attrs — `shadow` itself was already declared) and
`plugins/sgs-blocks/src/blocks/site-header/edit.js` (`SelectControl` → `ShadowControl`, mounted
in the Styles tab's "Shadow" `PanelBody`, matching `sgs/cta-section/edit.js:508-517`).
**No `render.php` change** — `SGS_Container_Wrapper::render()` already reads
`shadow`/`shadowColour`/`shadowColourHover` off `$attributes` (lines 434-459) and composes them
via `sgs_shadow_value_composed()` at line 1080, unconditionally of block type.

## Capture type: `intent_capture_passed`, not `first_paint_capture_passed`

`block.json` is staged alongside `edit.js` (a new attribute was added, not just an editor-only
edit), so `check-editor-canvas-css.py` correctly refuses this change — `block.json` is not in its
`ADMITTED_FILES` set — meaning the gate's automatic `editor_capture_passed` branch does not fire
for this diff (confirmed by running `check-editor-canvas-css.py site-header`, which reports
"gate applies"). A first-paint before/after diff is also not the right instrument here: this is a
**new isolated capability** (an operator-facing control swap on an attribute pair that render.php
was already unconditionally reading) — the "before" state (a coarse dropdown) and the "after"
state (a rich shape/colour builder) aren't comparable via pixel diff; the real question is
"does the current state match what was intended", which is exactly what `intent_capture_passed`
is for (`.githooks/README.md`, "Three visual-diff report types" table).

## Assertions (stated before measuring)

1. `sgs/site-header`'s Shadow inspector control (Styles tab → "Shadow" panel) now shows
   `ShadowControl`'s Normal/Hover tabbed preset picker (None / Subtle / Raised / Floating /
   Brand glow) instead of a plain preset dropdown — identical UI to `sgs/cta-section`'s own
   Shadow panel.
2. Setting a shadow value on `sgs/site-header` writes the same attribute shape
   (`shadow: <preset slug>`) that `sgs/cta-section` writes for the same input, and this reaches
   `SGS_Container_Wrapper::render()` unchanged (proven by `render.php` doing zero transformation
   of `$attributes['shadow']` before the wrapper call).
3. Given (2), the block produces a `box-shadow` declaration on the header wrapper matching what
   `sgs/cta-section` already produces for the same preset — **this assertion is DISPROVEN**, see
   "Discovered defect" below. It is disclosed rather than silently dropped.

## Live result — canary, `sgs-theme//header` template part

Deployed the uncommitted `site-header` payload to the sandybrown canary via
`build-deploy.py --target sandybrown --blocks-only --payload plugins/sgs-blocks/src/blocks/site-header/`
(the documented pre-commit-capture route — full gate chain + payload-verify + motion-QA all green,
exit 0). Logged into the Site Editor, selected the real `sgs/site-header` instance inside the
`sgs-theme//header` template part, opened Styles → Shadow, selected "Raised".

| Assertion | Result |
|---|---|
| 1 — ShadowControl UI renders, matches cta-section | **TRUE** — Normal/Hover tabs + 5-preset picker rendered identically to `sgs/cta-section`'s own Shadow panel (screenshot evidence: preset buttons None/Subtle/Raised/Floating/Brand glow, "Raised" highlighted black once selected). |
| 2 — attribute stored correctly, reaches the wrapper unchanged | **TRUE** — saved template part's stored `post_content` shows `"shadow":"raised"` on the `sgs/site-header` block comment (verified via REST `context=edit`); `render.php` performs no transformation on `shadow` before calling `SGS_Container_Wrapper::render()` (grepped — zero `unset`/reassignment of `$attributes['shadow']`). |
| 3 — frontend box-shadow matches cta-section for the same input | **FALSE** — see below. |

## Discovered defect (pre-existing, not introduced by this diff — disclosed, not hidden)

Live frontend verification (`getComputedStyle` on `.wp-block-sgs-site-header`, and the lifted
`uploads/sgs-css/sgs-*.css` file) showed **no `box-shadow` declaration at all** for
`sgs/site-header` with `shadow:"raised"` saved on the real header template part — despite the
attribute round-tripping correctly through the editor and into stored content (assertion 2, true).

A parallel real-page control test with `sgs/container` (`shadow:"raised"`, same wrapper
mechanism) and `sgs/cta-section` (`shadow:"raised"`, its own block-private shadow emission,
composed identically) **both painted correctly** — `.sgs-container-5a4d9b91{box-shadow:var(--wp--preset--shadow--raised)}`
and `.sgs-cta-section-7a9e4012.wp-block-sgs-cta-section{box-shadow:var(--wp--preset--shadow--raised)}`
respectively, verified in each page's lifted CSS file. So the *general* wrapper shadow mechanism is
sound; the defect is specific to how it interacts with `sgs/site-header`'s call.

Traced via a temporary, non-committed `error_log()` instrumentation of the deployed (uncommitted
copy of the) shared `SGS_Container_Wrapper::render()` on the server (never touched in the local
git tree — confirmed clean via `git status` after, and the server file was restored byte-identical
to the pre-instrumented original, verified with `diff`): `$base_outer_decls` correctly contains
`box-shadow:var(--wp--preset--shadow--raised)`, `$uid` is correctly non-empty, and `$style_tag` is
correctly built (155 bytes, containing the box-shadow rule) immediately before the function's own
`return $style_tag . $element;`. The loss therefore happens **after** `SGS_Container_Wrapper::render()`
returns — somewhere between that return and the final delivered page HTML — for `sgs/site-header`
specifically. Root cause not yet isolated further (out of scope for this diff — see below).

**Why this is not a regression from this commit:** the touched files are only `block.json`
(two new attrs) and `edit.js` (editor control only) — zero `render.php` or
`class-sgs-container-wrapper.php` changes. The wrapper file is confirmed untouched in git
(`git status` clean on it throughout this session). The defect is in shared, pre-existing
plumbing this diff does not modify, and it predates this change — a client could not have
configured a working header shadow before this diff either (the old dropdown wrote the exact
same `shadow` attribute to the exact same broken codepath).

**Recommendation:** file this as a follow-up (root-cause + fix `SGS_Container_Wrapper`'s
`sgs/site-header` interaction) rather than block this control-swap commit on it — the fix belongs
to a different diff (touches shared wrapper/render plumbing, which is Rule 7 design-gate
territory per `CLAUDE.md`), and continuing to trace it live risked further disturbing the shared
production file mid-session.

## Why before/after doesn't apply

The prior state (a preset-only dropdown) and the new state (a shape+colour builder) aren't the
same UI shape, so there is nothing pixel-comparable between them — the meaningful question is
"does the current editor control match the intended design" (yes) and "does it write what the
render layer expects" (yes) — both answered directly above, without a before/after diff.

## Cleanup performed (this session, verified)

- Server copy of `class-sgs-container-wrapper.php` restored via `diff` against a pre-edit backup
  — confirmed byte-identical; local git tree for that file was never touched (`git status` clean
  throughout).
- Temporary debug files (`~/wrapper-debug.php`, `/tmp/sgs-debug.log`,
  `/tmp/class-sgs-container-wrapper.php.orig`) removed from the server.
- `sgs-theme//header` template part's `shadow:"raised"` test value reverted — stored
  `post_content` confirmed to no longer contain `"shadow"` on the `sgs/site-header` block, and the
  live homepage `<header>` element confirmed to carry the same uid (`sgs-sh-5f4b2c34`) as before
  any test edit.
- Probe page (id 3179, "ZZZ-shadow-probe") deleted (`force=true`).

## Risk

No markup change from this diff's own scope — the control swap writes to the same two attribute
names (`shadow`, and the pre-existing `shadowColour`/new `shadowColourHover`) the block already
declared or now declares, consumed by unchanged `render.php`/wrapper code. An operator who never
opens the Shadow panel sees byte-identical output. An operator who does now gets `ShadowControl`'s
richer picker instead of a 4-word dropdown — matching `cta-section` — but will not see a visible
shadow update on the frontend until the discovered defect above is separately fixed.

## Gates

Deploy: `build-deploy.py --blocks-only --payload plugins/sgs-blocks/src/blocks/site-header/` —
`gate:full` (pytest-oracle-converter, inspector-scan-run, audit-block-file-consistency) PASS,
`oldshape-audit` PASS, `payload-verify` 83/83 PASS, post-deploy `motion-qa` 3/3 PASS, exit 0.
