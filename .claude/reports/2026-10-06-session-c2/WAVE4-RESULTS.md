# Wave 4 results — the route cleanup, verified

**2026-10-06.** All 17 Eye Care surfaces, **measure-only** (`solve.mjs --rounds 0`), triaged and swept.
Live block code `578a8830b` (read from `~/.sgs-deploy-marker-eye-care-test.json`). Sweep reports **no stale
reports and no measurement caveats**, and `git status --porcelain -- 'sites/eye-care-ward-end/build/*.tree.json'`
came back empty, so **no write reached a client tree**.

---

## The headline: F 193 → 173

| | Value |
|---|---|
| Baseline F (2026-10-06 morning, measure-only) | **193** |
| Now | **173** |
| Fall | **20 rows** |
| Revised band, committed BEFORE measuring (`2cf9ab4c3`) | **155–175 — INSIDE** |
| Original band | 148–168 — **OUTSIDE** |

**The band revision is the point, not a detail.** The original 148–168 counted only the fixes that remove
rows and missed that R1 and P3d *add* them by unmasking rows that were always F. Had it not been revised
before the sweep ran, **173 would have been read as a failure** and the next session would have hunted a
cause that does not exist. 173 sits at the top of the revised band, which is where a result dominated by
two opposing forces should sit — said plainly rather than dressed up.

### Full class counts

| Class | Count |
|---|---|
| W | 957 |
| **F** | **173** |
| T | 233 |
| U | 35 |

F by surface: home 50, help 28, lens 26, footer 21, contact 17, product 15, contact-form 6, shop 5,
mega-lenses 2, mobile-menu 2, header 1.

---

## R1 measured on fresh data

The `canvasSettable` emission-selector fix, checked by counting verdicts rather than by reading source:

| | Before | After |
|---|---|---|
| `canvas-settable` claims | 209 | **168** |
| Families of (cited block, setting, row property) | 69 | **63** |
| Claims citing `bgHoverZoom*` | 20 | **0** |

**The named masking class is fully closed.** All 20 claims citing `sgs/container::bgHoverZoomDuration`,
`::bgHoverZoomEasing` or `::bgHoverZoomScale` sat on form inputs, social icon items, tab buttons, a buybox
gallery div and filter inputs — never on the background layer
`container-bg-hover-zoom.php::sgs_container_bg_hover_zoom_css` paints, since it emits only to
`.<uid> > .sgs-container__image-bg` and `.<uid>::before`. They are no longer classed `W/canvas-settable`.

**168 claims across 63 families remain unconfirmed against the live DOM** — still owed, and still best
tested by family rather than by row (2 reads per family is 126 readings against 168). Families span
surfaces, so surface is the wrong sampling axis. Table: `WAVE4-CANVAS-FAMILIES.md` (regenerate it; the
counts there are the pre-R1 69/209).

---

## The pairing gate: 0 refusals, and that is the right answer

378 hand pairs across the 17 surfaces: **256 judged, 122 not judged, 0 refused.** Every config lints clean.

The plan expected ~6 refusals. **The honest answer is 0**, because P2b2 had already corrected the one real
mispair and the remaining configs are right. P2a's value is the standing gate, not a row count.

Getting there took a fix. On its first real run the gate **refused 7 of 378 pairs and blocked 6 surfaces**,
because `lintConfig` exits 1 before a browser opens — `shop`, `product` and the four mega panels would not
have been walked at all. Both causes were over-refusals: six pairs declared `text: false` (the author
stating the two sides are not expected to hold the same words — `shop/card-7` pairs the draft's made-up
stars against live's "No reviews yet", as its own accept note records), and the seventh split on a single
incidental word. Fixed in `4615ecd5c`: a `text: false` pair is never judged, and `MIN_CHECKED` (3) matched
words are needed before a refusal. **The floor is on the evidence base, never on how large a share splits** —
the real `about-step` mispair this gate exists for splits only 1 of 9, so any majority rule would have let
the one true mispair through while blocking correct configs.

---

## Session C's three owed host jobs

### 1. The C3.5 confirmation walk — DONE, and it had never run

Order 652 on eye-care-test verified first: `status=processing`, `is_paid()` true, £289.00 GBP, order key 22
characters. The key was read with `wp eval` into a shell variable, used in one command and **never
recorded** — the walk wrote to a scratchpad directory outside the repo, and `grep` for
`order-received/652` across the tree finds only the URL *pattern* in Session C's plan and **0** real keys
anywhere, including the older worktree reports.

**Result: the confirmation surface walks — 300 open rows, 0 accepted, 0 live console errors.** It exits 1
on the open rows, which is the walk's finding rather than a crash.

Its first attempt died on `page.goto` with a `networkidle` timeout, and that was **not** a defect: the page
answers HTTP 200 in 0.7s with title "Order Confirmation", a plain Playwright context reaches
`networkidle` on it **in 2 seconds**, and zero websockets are opened. The walk had simply started minutes
after 17 solves — the same host browser-challenge signature as the `editor did not load` failures. It
succeeded on retry. **Nothing was changed to make it pass**, which matters: the temptation was to loosen
`helpers.mjs::goto`'s wait strategy for a page that did not need it.

### 2. The `sgs/media` recalibration — DONE, and it answers the question

`sgs/media`: 38 settings, **0 dead**, 0 oneWidth, 1 noMarker, 0 rejected. **L7's content reads work on real
data, not only in fixtures:** the cache records `text` → `caption` at `.sgs-media__caption`, reached at
375, 768 and 1440, and `link` → `linkUrl` at `.sgs-media__link` via `href`.

**And `sgs/hero` recording nothing across its 17 qualifying settings is legitimate — because hero's words
are not hero's.** (Bean, 2026-10-06; verified here.) Hero is a container: `hero/edit.js` says "FR-22-6:
content column uses InnerBlocks (label + heading + text + buttons)" and `hero/render.php` renders that
column "via InnerBlocks ($content)". Its copy therefore lives in child `sgs/heading`, `sgs/text` and
`sgs/multi-button` blocks, and the route reads each block's OWN settings — so those text and link reads
belong to the children and must not appear on hero. `sgs/media` owns its caption and its link, which is
exactly why it records both.

The rest of hero's 17 fits the same picture: the DB shows 10 `boolean-visibility`, 6 `content` settings
that are the `splitMediaImageUrl`/`VideoUrl` triples (media sources, not text or link reads), and 1
`text-content` (`label`), which the InnerBlocks label child carries in practice.

Measured rather than assumed: hero's cache was taken at 01:17 and lacked the `text` and `link` keys
entirely, so it could not be compared with media's — **so hero was recalibrated at HEAD** (19:16) and
still carries neither key. An earlier draft of this note said only "hero emits no content read", which was
true and explained nothing.

⚠️ **New finding from that run: `sgs/hero` reports 34 of its 47 settings DEAD**, against 0 for
`sgs/media`. A dead calibration is a marker or declaration gap, so 34 is worth its own look — not
investigated here, and not previously recorded.

### 3. `benchmark.mjs --noise` — STOPPED at 4 of 10 runs, still owed

Started 20:17 on a quiet host and **stopped deliberately at 20:54**, about an hour short, to release the
host to the two sessions that had been holding it for nearly three hours (Bean's call). It blocks nothing.

**It could not have run alongside them.** A `build-deploy.py` purges OPcache, the LiteSpeed page cache and
the theme pattern cache and adds host load — which is precisely the variable this run exists to measure —
and an `sgs-update` reseed rewrites the shared framework DB. So the choice was this figure or their
progress, not both.

What the partial run did produce, for whoever picks it up (10 runs total: 6 cases a–f, 2 noise injections,
and a control per config):

| Run | Duration | Result |
|---|---|---|
| `shop-control` | 983s | 2571 open, 314 accepted, 0 live console errors |
| `case-a` | 565s | 1029 open, 61 accepted |
| `case-b` | 469s | 1086 open, 41 accepted |
| `case-c` | — | in flight when stopped |

**No catch-rate or noise figure can be read from this.** Scoring (`benchmark/score.mjs`) runs at the end
over the whole set, and the noise cases — the entire point — had not started. The standing position is
unchanged: **catch rate 5 of 5, noise figure unproven in both directions.**

⚠️ **Run it on the local WSL mirror next time, not the remote host** — but understand what that changes.
`dev-setup.md` §"Local WordPress mirrors (WSL)" documents `http://localhost:8081` (Eye Care) and `:8082`
(Sandybrown) as WSL copies of the two Hostinger test sites, explicitly "for browser-heavy runs Hostinger's
edge would challenge". They were **down** throughout this session (both ports time out); start them with
`wsl -d Ubuntu -u root -- bash -lc 'service mariadb start; service apache2 start'`, and note
`scripts/local-wp/sync-build.sh` wants a build first.

**But a local run answers a different question.** This benchmark's open question is "were the 22 noise rows
walker flakiness or host load?", and the 0-noise baseline it must be compared against was measured
REMOTELY. Localhost removes host load rather than measuring it, and breaks comparability with that
baseline. So: use the mirror for the browser-heavy runs that keep getting challenged (pairing, solve,
calibration — `calibrate.mjs` takes `--site local-eye-care`), and keep the noise benchmark remote, or run
both and treat the local result as the discriminator rather than as the figure.

## What is still owed

1. **The 168 canvas claims across 63 families**, live-confirmed by family.
2. **`mobile-menu` cannot be paired.** `pairs.mjs` dies with "the pair root for this state was not found on
   the page" during the width recheck, so that surface has **no `handScope` and is "not yet judged"**, which
   is not the same as passing. Not a regression from this session: the error predates it (`d605bb5ba`) and
   W2-E's only change to that file was 19 added lines. The drawer's pair root is absent at a recheck width on
   the current live site where it was present on 2026-10-05.
3. **Session C's three owed host jobs** — the C3.5 confirmation walk, an `sgs/media` recalibration, and
   `benchmark.mjs --noise` with control and noise back to back.
4. The four items left open in Spec 47 §5 Residual (`solve.mjs::writeRound`'s unchecked `canvasSettable`,
   emission read by string search, `chrome-compare.mjs::hoverEffects` ignoring `loops`, and a live-side
   `reveal-unfired` never being persisted).

## What this run cost, and what it taught

The first attempt at this sweep ran `solve.mjs` **without `--rounds 0`**, so the route wrote 18 settings into
`home.tree.json`, 13 into `lenses.tree.json` and a partial set into `footer.tree.json` and rebuilt those
three pages on eye-care-test. Reverted with `git restore` and the three pages rebuilt from the restored
trees, all `ok:true` with no invalid blocks. Then 13 of 17 solves failed with `editor did not load` while
`wp-admin` answered HTTP 200 in 3.2s — the host edge-challenging automated browsers after a burst of ~25
sessions, cleared by waiting. And the sweep printed **"no stale reports"** over a sweep where every surface
was stale, because the CLI read `aggregate`'s surface-keyed object as an array: fixed in `774da11a4`, with a
test that spawns the command and reads its output. R3 then correctly reported 17 of 17 stale, which is what
proved that attempt's 1589 figure was not a measurement.
