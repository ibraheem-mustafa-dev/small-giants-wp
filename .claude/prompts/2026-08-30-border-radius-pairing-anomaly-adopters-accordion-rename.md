# Next session — radius pairing, the 3 ANOMALY adopters, accordion's `style` collision

Invoke `/autopilot` before anything else.

This replaces `2026-08-29-border-control-rollout-and-doc-sweep.md`, which is done
bar the items carried below. **Read D881 in `.claude/decisions.md` first** — it
carries the mechanism for everything summarised here. Do not ask for it to be
restated.

---

## What closed on 2026-08-29 — do not re-open

| Item | Outcome |
|---|---|
| Shape A (all 8 remaining blocks) | ✅ CLOSED. `PRIVATE_NEEDS_SWAP 8 → 0`, `PRIVATE_DONE 2 → 10`. Deployed + live-verified. |
| Codemod dropped `linked` | Fixed; `colourLinked` prop added; restored on product-card + quote. Self-test 14 → 18. |
| Codemod never imported the component | Fixed; caught by `check-undefined-references`, not by the PROOF assertions. |
| Palette-token border colour painted nothing (container, product-card) | Fixed `82a1c630d`, proven live. |
| D876's button rename had never migrated stored content | Fixed on pages 2742/2849/2884, byte-exact (0-byte delta, 80 differing bytes each). |
| Control reshaped to the native pair | Style now inside the colour popover; radius is the second control when wired. |
| Per-device border WIDTH | ⛔ **CANCELLED by Bean, not deferred.** Plumbing removed at `f5c9b66ae`. Do not rebuild. |

---

## Task 1 — Pair the native radius into `SgsBorderControl`, per block

`SgsBorderControl` already renders `ResponsiveBorderRadiusControl` as the second
control of the pair **when the caller passes `onRadiusChange`**. No block wires it
yet — all 10 still mount their own separate radius control in the Border panel.

Per block: move the existing `<ResponsiveBorderRadiusControl>` call into the
`SgsBorderControl` mount as `radiusValues` / `onRadiusChange` (and
`radiusLabel` / `showRadiusResponsive` where the block used them), and delete the
standalone control. **Read each block's existing radius wiring — it is NOT
uniform:** some route to `style.border.radius` base-only, `icon-list` also writes
`borderRadiusTablet`/`borderRadiusMobile`, and `whatsapp-cta` has its own tier
objects. Preserve each block's own storage exactly; only the mount moves.

This is 10 blocks, so **build the detector first** (`.claude/THE-MIGRATION-METHOD.md`)
— extend `scripts/migrate-border-control.js` with a radius-pairing pass rather than
hand-editing, and add fixtures + a negative control as its existing 18 assertions do.

## Task 2 — The 3 ANOMALY adopters

Triage evidence is in D881; the two exclusions are settled and must not be revisited:
`filter-search` (border belongs to its inner `<input>`) and `social-icons` (border
belongs to a repeated item, and only under the `outlined` style) stay as they are.

Adopt the composite on, in ascending order of work:

1. **`mega-aside`** — smallest. Already has `asideBorderWidth` / `asideBorderColour`
   / `asideBorderColourGradient` on the root; only `borderStyle` is missing, and
   `render.php:109` currently hardcodes `border-style:solid`. Add the style attr,
   mount the composite, stop hardcoding.
2. **`label`** — has `borderRadius` only. ⚠ Its box CSS comes from the SHARED
   `sgs_label_box_css_rule()`, which `sgs/product-card`'s trial tag also uses — so
   adopting here forces the same decision on that tag. Check that coupling before
   building.
3. **`whatsapp-cta`** — radius only; the `<a>` IS the block root. `style.css:13`
   sets `border:none`, so the composite's declarations must come from the
   higher-specificity `.uid` rule (they already would).

## Task 3 — `sgs/accordion`'s `style` attribute collision (Bean approved)

**Verified 2026-08-29:** `accordion/block.json` declares `"style"` as a **string**
(`default: "bordered"`, the visual preset) while ALSO declaring
`__experimentalBorder` with width/color/style/radius. The explicit string
declaration wins, so `$attributes['style']` is `"bordered"` and every
`isset($attributes['style']['color']['text'])`-shaped read in its `render.php`
evaluates a non-numeric string offset → `false`. **Its border, colour and
typography supports have never rendered.**

Bean's call: **rename the preset attribute** to free the native `style` object and
restore those ~8 dead capabilities.

- Check the live count first (was 31 posts containing `wp:sgs/accordion`, 0 of them
  authoring any border) and migrate the stored preset value to the new attribute
  name for every one.
- The rename is NOT length-preserving, so the 0-byte assertion used for the button
  rename does not apply — assert on parsed attributes instead, and back every post
  up to `.claude/backups/` first as that migration did.
- ⛔ Never write `post_content` without `--user=1` (KSES strips CSS), and never to a
  page Bean has open in the editor.
- `sgs/accordion-item` has the identical `__experimentalBorder` declaration but no
  `style` string, so ITS native path is live and functional. Out of scope, but it
  will be inconsistent with its parent afterwards — flag it.

## Task 4 — Close the two unproven blocks

`sgs/container` and `sgs/option-picker` are **not live-proven** (D881). The probe
measures the OUTERMOST `.wp-block-sgs-<name>`, so on container it matches the
header's container, and option-picker returned NOT RUN. Either extend
`scripts/qa/check-border-roundtrip.js` to accept an explicit selector / probe-page
scoping, or verify both in the editor. **NOT RUN is not a pass — do not close
these by assertion.**

---

## Standing hazards — carried forward, never subtract (D101)

1. `main` is shared with several live sessions. `git commit -- <explicit paths>`;
   never a bare commit, never a glob pathspec, never `--amend`.
2. **`index.lock` collisions are frequent** (two on 2026-08-29). Retry in a bounded
   loop; NEVER delete the lock — another session is mid-commit.
3. Never write `post_content` to a page Bean has open in the editor.
4. `wp post update` without `--user=1` silently strips CSS from block attributes.
5. A deploy can report `[ABORTED]` while its payload landed — check the server.
6. Git Bash can show a stale view on Windows; confirm via PowerShell.
7. **A page-HTML grep cannot prove CSS absence** — block CSS is lifted into
   `uploads/sgs-css/`. Read the lifted stylesheet.
8. **Python's `read_text` normalises CRLF**, silently shrinking a file. Use
   `newline=""` on both read and write, and assert on ON-DISK bytes.
9. **`json.dumps` reformats** — never re-serialise stored block attributes to change
   a key; do it textually inside the exact decoded span.
10. Verify subagent and tooling claims, including this prompt's, against ground truth.
11. A dispatched agent's "completed" status is not proof; check for an artefact.
12. Two commit-gate layers, near-identical output, different bypasses:
    `[gates-ok:<reason>]` for the session hook, `--no-verify` for git's native one.
13. **D851 still does not reproduce.** Do not cite page 2884 as evidence of anything.

## Environment notes

- A built deploy worktree is at `C:/tmp/sgs-deploy-wt` (`vendor/` copied in) — reuse
  it to skip a ~5-min `npm ci`. It is NOT auto-cleaned and may be stale; check out
  the commit you intend to deploy and rebuild before using it.
- Deploys currently need
  `--payload plugins/sgs-blocks/includes/extension-attributes.generated.php` (the
  motion track committed `fx` sources without regenerating it) and
  `--skip-gate-full` (two `grayscaleHover` converter tests fail at the pre-session
  commit — proven, not inherited). **Re-prove both before relying on them.**
- `.claude/secrets/sandybrown.env` was recovered on 2026-08-29 from
  `.claude/worktrees/product-archive-p2/`. If it vanishes again, that is the copy.
