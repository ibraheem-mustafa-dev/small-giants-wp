# Media element — commit, deploy, and live-verify Waves 6-7

**Invoke `/autopilot` before anything else.**

Waves 6 (five quality gates) and 7 (`hero`, `container`'s `BackgroundPanel`, `decorative-image`,
`product-card` + its data migration) are BUILT and independently re-verified in the working tree —
full `npm run build` 83/83 gates green, inspector-scan clean, media atom JS/PHP parity clean across
all 16 atoms, cloning-pipeline `check_value_identity.py` clean, all 727 converter tests green. **They
are not yet committed, and nothing has been deployed to the canary or opened in a real editor.**
Every verification so far has been static (build/gate/test output) — this session's job is the part
static checks cannot do: commit the work, deploy it, and confirm it actually behaves correctly on the
real sandybrown canary (R-31-11/R-31-13 — script measurement + Bean's eye, never the numbers alone).

Full account of what shipped, every deviation from the original plan, and every bug caught in review:
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 (Wave 6/7 entries) — read it in full
before touching anything. Approved build plan + per-piece review notes:
`.claude/plans/media-element-tingly-stallman.md`. Session record: `.claude/LEDGER.md`
`▶ CLIENT-CONTROLS TRACK`, `.claude/decisions.md` D915.

## Read these first, in full

| # | File | Why |
|---|---|---|
| 1 | `.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 | exactly what Waves 6-7 shipped, every real bug caught, the R-31-14/cloning-pipeline resolution |
| 2 | `.claude/decisions.md` D915 | the compressed incident record for the same session |
| 3 | `.claude/plans/media-element-tingly-stallman.md` | the approved build plan this session's work followed |

Skip the cloning-pipeline spec (Spec 31) unless you land on the `db_lookup.py`/`assembly.py`
`emit_as` change specifically (D915 names the exact files) — it governs a different track and will
mislead you elsewhere in this session.

## Task 1 — Commit and push

`git status` first — confirm the working tree still matches what D915/§17 describe (roughly 30-something
tracked files modified, several new files under `plugins/sgs-blocks/scripts/inspector-scan/rules/` +
`fixtures/`, three new `src/components/media/*PanelLayout.js` files, `migrate-product-card-image-id.py`).
Commit by explicit path (never `git add -A` — this project's hook enforces it). One commit is fine
given the whole body of work was already reviewed and integrated together; split it only if you find a
reason to.

⚠ Two untracked/modified files are NOT part of this work and should NOT be swept into the commit —
check `git status` for anything under `.claude/backups/` or unrelated to the media-atom track before
committing, and leave it alone if so.

## Task 2 — Deploy to sandybrown

`python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the only sanctioned path,
never a hand-rolled tar/scp. Confirm the deploy's own fail-closed verify step passes before moving on.

## Task 3 — Live-verify every migrated surface in the real editor + published page

For each of the four Wave 7 surfaces, open the real block editor on sandybrown and confirm:

- **`decorative-image`** — object-fit/focal-point/overlay controls read and write correctly; the
  editor preview and the published page now agree for a video slot (the divergence D915 fixed).
- **`hero`** — the media-type tabs are reachable BEFORE an image is uploaded (the `splitImage?.url`
  gating bug this migration was supposed to close by construction); overlay opacity/blend-mode/hover
  now work (they didn't before); object-fit/focal-point on the split image; confirm an EXISTING
  published hero instance that only has the OLD `splitImage`/`splitVideo`/`splitSvg` shape now shows
  an empty split-media slot (the accepted, Bean-chosen consequence of the strict no-fallback
  decision — confirm it's accepted in practice, not just in theory) and can be fixed by re-uploading
  through the new picker.
- **`container`'s `BackgroundPanel`** — test ALL 8 consuming blocks individually, not just container:
  `container`, `cta-section`, `hero`, `multi-button`, `physics-canvas`, `site-footer`, `site-header`,
  `trust-bar`. For each: confirm the Image tab's existing behaviour is pixel-identical to before
  (`measurement-vs-eye.md` — pixel-sample if there's any doubt, not just computed-style), and confirm
  the NEW video-tab Size/Position controls actually change how a video background fits/positions.
- **`product-card`** — object-fit/focal-point on the main product image, across typed AND bound modes,
  across all the image roles named in D915 (typed built-in, bound read-only, bound configurator,
  thumbnail strip). Confirm `imageHeight`'s legacy plain-string shape still round-trips.

## Task 4 — Run product-card's migration survey against real content

`python plugins/sgs-blocks/scripts/migrate-product-card-image-id.py --survey` against real sandybrown
`sgs/product-card` content (prepare the dump per the script's own docstring — `wp post list` +
`wp post get --field=post_content` per id). Review the no-match bucket by hand. Do NOT run
`--fix --apply` against any client site without that review — there are none yet on this framework,
but the discipline still applies the moment one exists.

## Three items deliberately deferred — re-open only if live-verification below finds a real problem

These aren't blocking Waves 6-7's own definition of done; they're specific, named risks that only a
live check can settle. Do not treat any of them as "still to build" unless the check below finds a
real issue.

1. **`hero`'s ken-burns/parallax CSS stays hero-private, not atom-driven.** The editor control is
   real and atom-owned; the CSS-emission path was deliberately left as hero's own code because its
   existing motion CSS has a clip/specificity interaction with its hover-zoom rule
   (`overflow:hidden` toggling on a compound selector) that was too risky to reproduce without a live
   check. **During Task 3's hero verification:** confirm ken-burns and parallax both still animate
   correctly and the hover-zoom interaction is unaffected. If it is, this is closed — nothing to
   build. If you find a real regression, THEN route the CSS through the shared `.sgs-media-el`
   marker like every other surface.

2. **`container`'s `BackgroundPanel` Image tab keeps its own hand-rolled Size/Position controls**,
   separate from the Video tab's new atom-driven ones, even though both write into the same
   `backgroundSize`/`backgroundPosition` attributes. Deliberate — replacing the Image tab risked
   losing its 9-option keyword dropdown (the backdrop-scope atom control has no equivalent, and
   passes no preview) across a component shared by 8 blocks, too large a diff to justify without a
   live check. **During Task 3:** if the duplication causes any actual bug (the two controls
   disagreeing, one not reflecting the other's value), fix it then. Otherwise it's cosmetic
   duplication only, not a defect — leave it.

3. **`product-card` did NOT adopt the `box-shape` atom** (Height/Shape/Border/MaxWidth — would also
   cover the existing `imageHeight` control). Confirmed cause: the atom's marker class
   (`.sgs-media-el`) declares `height:var(--sgs-media-height,auto)` unconditionally, at the SAME CSS
   specificity as this block's own `height:var(--sgs-product-card-image-height,220px)` — genuinely
   conflicting fallback values (`auto` vs `220px`). **During Task 3's product-card verification, run
   a load-order test:** force each stylesheet to win in turn (e.g. via `<link>` order or cache-busting)
   and screenshot the result. If no visible shrink/regression appears either way, `box-shape` can be
   adopted safely the same way as the other three surfaces. If it does regress, the marker class needs
   a specificity fix (e.g. a block-scoped override rule) before `box-shape` is safe here.

## Guardrails

- `npm run build` must stay green (83/83 gates) after the commit — re-run it once more post-commit as
  a sanity check, since a commit can occasionally surface a gate that only runs against tracked files.
- Never hand-roll a deploy. Never run `--fix --apply` on the migration script against unreviewed data.
- If live-verification finds a REAL regression anywhere (not just one of the three named re-open
  triggers above), stop and fix it before moving to the next surface — do not batch fixes to the end.
- Commit any live-verification fixes separately from the Task 1 commit, so the "built, tested,
  deployed, live-verified" story stays traceable in git history.
