# Close four owed debts on the media track

**Invoke `/autopilot` before anything else.**

Four items were named as owed across two sessions and never closed. Each is small and
independent. None depends on the others, so they can run in any order — but all four share
one theme: **each is a claim that has never been executed.**

⛔ **Do NOT start the media-atom control work.** That is a separate session with its own
prompt (`2026-09-01-media-control-comparison.md`). These four are debts, not features.

⛔ **Do NOT re-fix the two atom-layer bugs.** They are DONE and gated:
four atom controls compared against a non-vocabulary word (`61432d337`), and five atom PHP
twins were never `require`d (`eea5fb990`). `node scripts/check-media-atom-purity.js
--self-test` covers both with negative controls — 20/20. If a doc still describes either as
open, fix the doc.

---

## 1. `sgs/button`'s SVG allowlist is narrower than the shared one

**Where:** `src/blocks/button/render.php:768` declares a local `$allowed_svg` array
(`svg`, `path`, `circle`) used by `wp_kses()` at `:839`.

**The problem.** D905 unified six SVG allowlists into `sgs_allowed_svg_tags()`
(`includes/helpers-tier-media.php:78`, delegating to `sgs_svg_kses_allowed_tags()`) and left
button's alone. So the framework has one canonical allowlist plus a private narrower copy,
and a divergence between them is invisible until an icon silently loses an element.

**What to do.** Compare button's local array against `sgs_allowed_svg_tags()` element by
element and attribute by attribute, then either adopt the shared helper or record — in code,
at the declaration — exactly which elements button deliberately excludes and why.

⚠ **Narrower is not automatically wrong.** A button icon may legitimately want a smaller
surface than a full media SVG. The defect is the SILENT divergence, not the narrowness. If
you keep it narrow, it must say so and say why.

⚠ `render.php` contains **7** `wp_kses` calls. Establish which are SVG allowlists and which
are something else before touching any of them — D905 said "two" and that figure has not
been re-verified.

**Done when:** button either calls the shared helper, or its local array carries a comment
naming each deliberate exclusion. Either way a reader can tell divergence from accident.

---

## 2. The SMIL bypass is REASONED, NOT EXECUTED

**The claim.** `<a><animate attributeName="href" to="javascript:…">` can bypass an SVG
sanitiser that allows `<animate>`, because SMIL can rewrite an `href` after sanitisation.

**The problem.** Nobody has run it. It was reasoned about during D905's XSS work and written
down as a residual risk. A security claim that has never been executed is a hypothesis.

**What to do.** Build a canary probe that attempts the bypass against the real sanitiser on
the live canary, and read the result in a browser.

⛔ **THE POSITIVE CONTROL IS NOT OPTIONAL AND IS THE HARD PART.** "No alert fired" is exactly
what a probe that cannot see anything also reports. Before trusting a negative result, prove
the harness CAN observe a real execution — land a deliberately-unsanitised payload by the
same path and watch it fire. Without that, "safe" and "blind" are the same output.

This is the same failure shape as the two bugs closed last session, and as
`a-check-with-no-positive-control-passes-against-a-dead-feature`.

**Done when:** a committed probe reports either "bypass blocked, and here is the control
firing" or "bypass succeeded" — with the control's output shown either way. If it succeeds,
STOP and report rather than patching under time pressure.

---

## 3. The three no-JS autoplay cases

**Where:** `reports/visual-diff/media-2026-08-30.md` closes with three cases it explicitly
owes. The `render.php` fix is real and PHP-verified; the browser check does not exist.

Quoted from that report:

1. A `sgs/media` block with **autoplay on and muted off**, published, inspected in the
   browser: the `<video>` carries `autoplay muted playsinline` **with JavaScript disabled**.
   That is the case that was broken.
2. The negative control alongside it: **autoplay off, muted off** must still render an
   unmuted video with no `autoplay`. *"If both cases produce a muted video, the fix has
   over-applied and the first check alone would not reveal it."*
3. Both at desktop **and** at a tablet width, since the coupling is per-tier.

⛔ **JavaScript genuinely disabled.** The whole defect was that `view.js` repaired the markup
on hydration, so a JS-enabled check passes whether or not the server fix works. Disable JS in
the browser context; do not merely avoid interacting.

**Done when:** all three run live, with the negative control's result shown, and the report
updated from "must verify" to measured values.

---

## 4. Video and SVG were never captured live

**Where:** `reports/visual-diff/media-2026-08-31.md` records this under "Not covered".

The `object-fit` proof used three IMAGES. Two things follow that nobody has looked at:

- **A `<video>` now resolves `object-fit: cover` where it previously rendered at the browser
  default `fill`.** The deleted `style.css` rule matched `__img` only, so video never had that
  default. This is a real, deliberate behaviour change reasoned from the census — **not
  measured on a rendered `<video>`.**
- **The SVG path deliberately gets NO object-fit**, because it is not a replaced element.
  Confirm the SVG element does not carry the marker and does not resolve a fit — the atom
  emitting it there would be, in hero's words, "a lie about what the property actually
  affects".

**What to do.** Extend probe page **3145** (already a `[GATE — DO NOT DELETE]` fixture) with a
video block and an SVG block, then read computed styles on both.

⚠ Read the PAINTED result, not just the computed value. Every property resolves fine on a
zero-area box — assert non-zero geometry, as the image check did.

**Done when:** `media-2026-08-31.md`'s "Not covered" section shrinks by these two items, with
measured values replacing them.

---

## Standing constraints

- **Commit by exact path.** A hook rejects a pathspec-less commit. Two others take a literal
  token IN THE COMMAND: `[repeat-ok:<reason>]`, `[batch-ok:<reason>]`.
- Never `git checkout --` a file to undo an edit — it reverts to the last commit and takes
  unrelated uncommitted work with it. Save bytes, patch, restore, verify md5.
- **Deploy is one path:** `python plugins/sgs-blocks/scripts/build-deploy.py --target
  sandybrown`. Never hand-roll tar/scp (D336 took two client sites down ~2.5h). No
  `--allow-dirty`, no `--skip-verify`. It refuses a dirty tree, so commit first.
- ⛔ Never write `verdict: PASS` for a check you did not run. The scoped skip
  (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="…"`) exists and logs the reason.
- ⛔ Zero attribute renames; no inline `style=""`; no deprecations or version bumps.
- **Every number you write must come from a command you just ran.** State the command beside
  it or omit the number.

## First action (< 5 min)

Item 1, because it needs no browser. Open `src/blocks/button/render.php:768` and
`includes/helpers-tier-media.php:78`, and diff the two allowlists element by element. That
tells you in minutes whether button's copy is a deliberate narrowing or an accident — and it
is the only one of the four you can settle without deploying.
