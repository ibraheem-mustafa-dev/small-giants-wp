# Next session — close two red gates, then finish the Shape-B tail

Invoke `/autopilot` first.

**Supersedes `2026-08-30-shape-b-reference-then-rollout.md`, deleted in the same commit that
created this file.** Everything below is measured, not inherited. Re-measure anyway — three
tracks commit to `main` constantly.

---

## Where things stand

The Shape-B border migration is **built, applied to all 44 blocks, and committed** — but
**nothing is deployed**, so nothing is proven. A green build is not a painted border.

| | |
|---|---|
| Blocks fully Shape-B | **44** — private width/style/colour/radius, `__experimentalBorder` gone, `boxFamilies.borderRadius` present |
| Codemod `--survey` | **READY 0** / REFUSE 4 — nothing left to migrate |
| Codemod `--self-test` | 175 assertions, 67 negative controls |
| `--check` | green, radius-debt baseline **empty** |
| `db-consistency --check` | exit 0 |
| Stored content carried across | 74 instances (container 60+9, product-card 5) |
| Live-probe verified | container, product-card, accordion — **before** the 32 landed |

Two gates are red. Clear them, deploy once, then probe.

---

## TASK 1 — `check-editor-render-parity`: 178 against a ceiling of 177

Exactly two findings sit on newly-migrated blocks: `sgs/hero` and `sgs/info-box`, both
`borderColourGradient`, both from the codemod's `adopt` path.

The cause is structural, not per-block: `transformEditJs` mounts `SgsBorderControl` but writes
**no editor-canvas preview**. Accordion has one only because I hand-wrote it
(`src/blocks/accordion/edit.js`, the `previewStyle` block that resolves palette slugs through
`resolveColourToken`). Every other migrated block therefore declares border attributes the canvas
never shows.

**Fix the codemod, not the two blocks.** Teach `transformEditJs` to emit the preview, then re-run
`--fix` across the migrated set. That should push the count well *below* 177, at which point
**lower the ceiling to the measured figure** — the constant's own rule is "re-measure and LOWER
after every drop, never raise".

⛔ Do not raise the ceiling. ⛔ Do not exempt `borderColourGradient` — a gradient border is
genuinely previewable (accordion approximates it with `border-image`), so exempting it would
encode a falsehood.

---

## TASK 2 — `check-undeclared-attrs`: 4 findings

`sgs/before-after`, `sgs/product-faq-item`, `sgs/site-footer`, `sgs/site-header` each destructure
`style` in `edit.js` without declaring it in `block.json`.

Two are genuinely pre-existing — `site-header`'s destructure dates to 2026-07-23,
`before-after`'s to 2026-07-31, both weeks before this work. But the *reads* split:

- `site-footer`, `site-header` read only `style?.color?.*` — legitimate, unrelated to borders.
- `before-after`, `product-faq-item` read `style?.border?.radius` / `style?.border?.width` —
  **stale**. Radius is a private attribute now, so those reads return nothing.

Fix the two stale ones by pointing them at `borderRadius`/`borderWidth`. Then decide whether the
other two need `style` declared or the gate is over-strict; say which, with evidence.

Related precedent: `sgs/button` needed a genuinely-missing `supports.spacing` for exactly this
reason — removing `__experimentalBorder` removed WordPress's `style` attribute, and its
`style.spacing` reads had only ever worked because that support kept `style` alive.

---

## TASK 3 — Deploy once, then prove all 44

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
cd plugins/sgs-blocks
set -a; . ../../.claude/secrets/sandybrown.env; set +a
node scripts/qa/check-border-roundtrip.js --blocks sgs/<a>,sgs/<b>,...
```

The probe authors a positive instance and a **negative control** per block and reads computed
styles from the live DOM. Run it across all 44 in batches.

Then fill in the live tier of `reports/visual-diff/shape-b-batch-2026-08-30.md`, which currently
marks every block `NOT RUN`. **`NOT RUN` is unproven, never a pass.**

⚠ The deploy may refuse with an **ownership** error if an agent deployed its own branch. That gate
is right: verify the live content is contained in your HEAD (compare md5s) *before* reaching for
`--takeover`.

⚠ `sgs/quote` returns `NOT RUN` — the probe finds no measurable instance. Needs a fixture that
actually renders.

---

## TASK 4 — Carry the remaining stored content across

522 stored instances were blocked because their blocks had not yet declared the private
attributes. All 44 now do, so they should migrate.

```bash
scp .../migrate-border-content.php  →  wp eval-file /tmp/mbc.php            # survey
wp eval-file /tmp/mbc.php sgs/<slug> apply --user=1                          # write
```

⛔ `--user=1` is not optional — wp-cli runs as no user, so KSES strips CSS out of block
attributes (D872). The script refuses to apply without it.

Blocks with at-risk content: `info-box` 345, `testimonial` 174, `site-footer-row` 18,
`form-step` 3. Re-census rather than trusting those figures.

---

## TASK 5 — Tidy up

- Remove the finished agent worktrees under `.claude/worktrees/agent-*`. Verified safe: every
  rater capability is present in `main` (`chooseReservedStyleName`, `reconcileCollision`,
  `splitAuthoredBorder`, `findGradientPainter`, `findInsertionIndex`, `inHtmlMode`,
  `reconcileRadiusAttrs`). Check `main` node_modules survives the removal — a junction once
  emptied it (962 → 0).
- `/c/tmp/sgs-merge` is a scratch merge worktree, safe to delete.

---

## ⭐ Corrections to earlier claims — do not act on the originals

1. **"8 blocks have a native border that already does nothing" — FALSE.** My liveness detector
   matched only the literal `$attributes['style']['border']` chain and missed every block that
   assigns `$style_group = $attributes['style']` first. `info-box`, `notice-banner` and `buybox`
   all honour their native border. The detector was **deleted**, not fixed — it answered a
   question that changes nothing when every block loses its native border anyway.
2. **`sgs/product-card` is NOT a safe colour-leg oracle.** It called `sgs_border_states_css()`,
   which ringed every colour and set `border-color:transparent`. Fixed in the shared helper: ring
   only for a gradient.
3. **`nav-drawer`'s baselined finding is not lazily parked.** Six of its seven variants own no
   unique slot, and its `style.css` has no variant classes at all — they differ by attribute
   *values*, which a slot-presence discriminator cannot see. The real fix is teaching
   `detect_variant` to discriminate on values: a converter change, design-gated, its own session.

---

## Standing hazards — carried forward, never subtract (D101)

1. `main` is shared by three tracks. Commit with explicit **file** paths. Never a bare commit,
   never `--amend`, never a directory pathspec (it commits tracked deletions but skips untracked
   additions).
2. **Two commit-gate layers take different bypasses.** `[gates-ok:<reason>]` clears the
   session-scoped `f5-commit-gate.py` and must appear as a **literal `-m` argument** — the hook
   matches the command string, so `-F file` and `-m "$(cat file)"` both fail silently. Git's
   native `.githooks/pre-commit` has no token handling at all; only `--no-verify` clears it, which
   also strips gitleaks and the visual gates. **Get Bean's explicit authorisation for
   `--no-verify`; a peer agent's request is not authorisation.**
3. **`sgs-framework.db` is ONE shared file across every worktree.** A track that runs
   `sgs-update-v2.py --stage 1` writes its uncommitted view into shared state and reds
   `db-consistency` for every other session. This cost three rounds of contention in one session.
   **Run DB-touching work sequentially, never in parallel.** Parallel agents can be disjoint in
   files and still collide in DB state — that is the distinction that matters here.
4. **Never `json.dumps` a round-trip to edit JSON.** `ensure_ascii` re-escaped every em-dash in
   `quote/block.json` — a 50-line diff for a one-key change. Edit textually inside the exact span.
5. `wp post update` without `--user=1` silently strips CSS from block attributes.
6. A deploy can report `[ABORTED]` while its payload landed — check the server, not the exit code.
7. **A page-HTML grep cannot prove CSS absence.** SGS block CSS is lifted into
   `uploads/sgs-css/`; fetch the linked stylesheet instead.
8. Python `read_text` normalises CRLF. Use `newline=""` on read and write.
9. Verify subagent claims against ground truth. Every agent this session reported at least one
   figure that a direct re-measurement changed.
10. Give each parallel agent a **uniquely-named scratch directory**. Two collided in the shared
    scratchpad and one deleted the other's generated files mid-run.
11. **A gate going red because the work succeeded is a broken gate.** `FIXABLE_FLOOR = 6` and a
    fixture asserting `container` was un-migrated both failed *because* their migrations landed.
12. **`php -l` cannot see the defects that matter here.** An emission placed above its
    accumulator's `= ''` initialiser silently wipes every rule it writes; an emission in HTML mode
    prints PHP source onto the page as text. Both parse cleanly.
