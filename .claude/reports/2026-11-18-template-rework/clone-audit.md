# How well the route clones a regular page today (2026-11-18)

A fresh run of the cloning route at `b14b92d67` for Mama's Munches Contact and Home, from the handoff folder onto a scratch copy (`local-mediatest-cloneaudit`, http://localhost:8095), compared with the draft and with the hand-finished site. Help was read from the 2026-11-15 lab re-clone (`local-mediatest-mamaslab`, 8091); the route has changed since only by `957e48a8b` and `189c30c33`, neither of which touches recognition, and the lab's Home block tree equals today's. Evidence: `E:\sgs-tmp\template-rework\clone-audit\` (`pairs/` holds draft, fresh clone and hand-finished site side by side at 375, 768 and 1440; `probe.mjs`, `cov.py`, `attrdiff.py` and `outline.php` are the measurements; `run-contact-1.log`, `run-home-1.log`, `run-home-2-walk.log`). The worktree the runs used is `E:\sgs-tmp\wt-clone-audit`. The main session checked G-1, G-4, G-5, G-6 and process bugs 1 and 2 against the code, and G-2 and G-3 against `pairs/home-hero-1440.png`.

The scratch copy is a copy of the hand-finished `local-mamas`, so its header, footer, snapshot and builder flow post are hand-finished; only page content was judged.

## What this run did not exercise (read before trusting the ranking)

The run was `site-run.mjs`'s own six stages (inventory, propose, fill, build, apply, walk) and nothing else. Spec 48's process has more, and three of the missing parts could change the result:

- **The finaliser was not run.** Spec 48 §3.4 has an AI finaliser settle the low-confidence block choices (`scripts/computed-route/prompts/skeleton-finaliser.md`; the session runs it, the scripts never call a model). `propose` reported 13 low-confidence nodes of 52 on Contact and 77 of 251 on Home, and the run built from those proposals as they stood. Whether the committed skeletons carried earlier finalised picks into this run was not checked. G-1 and G-2 are block choices, so they may be this step's job and not a missing rule.
- **Solve's repair rounds were not run** (Spec 48 FR-48-20, `solve.mjs`). Solve corrects measured style differences after the first build, so the value-level gaps (G-3's sizes, G-4, G-10) are a first build's, not a finished run's.
- **Home's run is incomplete:** its apply stage failed its gate on one row (the 51 setting writes appear to land before the gate, not confirmed), and its walk had not finished when the audit stopped.
- Not fresh either: intake and Bean's review of it (the committed records were used, 74 of whose rows carry the route's proposal and not Bean's review), the site build (media, menus, the builder's flow post) and calibration (the shared cache, `sgs/buybox` unmeasured).

What stands whatever those stages do: G-5 and G-6 (read in the code), the process bugs, and G-11. The 2026-11-15 whole-site re-clone that Bean judged not presentable holds the same Home block tree as this run, so this is at least what that run produced.

## Verdict (of the automatic chain alone)

Neither page arrives presentable without hand work.

- **Contact:** 94% of the draft's text is on the page and 37 of 39 text and image elements pair. The hero is broken at every width (its padding is not written, so text touches the screen edge; at 375 the logo covers the header) and the three icon badges are empty rings.
- **Home:** 67% of the draft's 156 text leaves are on the page and 4 of its 8 photos. The hero heading, greeting and photo cluster are missing; the cookie builder shows "This isn't available right now"; the review slider is six stacked columns with "Click Here" buttons; the FAQ is static.
- **The walker cannot see any of it:** Contact's walk leaves 235, 221 and 181 open rows at 1440, 768 and 375, and the hand-finished site's own baseline is 245, 254 and 163.

## Gaps, ranked by what a visitor sees

| ID | What goes wrong | Stage and cause | Proof | Recorded |
|---|---|---|---|---|
| G-1 | Accordions and sliders become static containers: Contact's FAQ, Help's 12 rows, Home's FAQ and review slider | Recogniser. Intake names the parts correctly (`contact.proposal.json` S-59; Home S-09, S-10, S-11), but no `scripts/computed-route/lib/skeleton*.mjs` file names `sgs/accordion`, `sgs/testimonial-slider` or `sgs/buybox` (grep returns nothing) | `fresh-148.outline.txt`, `fresh-154.outline.txt` against `hand-*.outline.txt` | FR-48-102, FR-48-105 |
| G-2 | The Home hero `h1` ("Made for the mum [photo chip] who needs it most") and the greeting are missing | Recogniser. `home.proposal.json` row `Root/14#0` proposes an `h1` holding an inline photo chip as `sgs/container`, which carries no words | no "Made for the" in `fresh-154.content.html`; `pairs/home-hero-1440.png` | new (family of FR-48-97) |
| G-3 | The hero photos are not carried; the "baked to order" disc is a full-width pill | Fill media. Fill's row: "4 media elements show at 1440px and splitSource holds one"; 115 `no-setting` rows on `sgs/decorative-image` | `cov.py` (4 of 8 images); `pairs/home-hero-1440.png` | FR-48-101 |
| G-4 | A value the draft puts on one element but the block paints on an inner part is refused: Contact hero padding (64/40/72/40), the hero logo's size, the icon discs (`shape`, `showBackground`, `shapeSize`) | Resolver. `scripts/computed-route/lib/fill-part-pairing.mjs::unpairedPart` refuses the write; the settings exist and the hand-finished site holds them | `unmapped.json` (14 rows on Contact, 20 on Home); `attrdiff.py`; `pairs/contact-375-pair.png` | new; related to FR-48-101 |
| G-5 | Contact's `h1` carries Home's star spin (loop `A-02`) and a hover rotate | Applier (probable, not isolated). `scripts/computed-route/apply.mjs::main` calls `recordIndex( records, handoff.drafts?.[0]?.dc )`, which renames that one draft to `Root`; in a one-file-per-page handoff Home's `Root/13` lands on Contact's `Root/13` | `sgsCustomCssNote` "Loop A-02" on Contact's heading; `A-02` has `dc: "Home"` | new |
| G-6 | Wordless controls print "Click Here" (10 on Home: the slider's dots and arrows) | Content writer. `sgs/button` with an `ariaLabel` and no `label` takes `block.json`'s default label | 12 "Click Here" strings in the DOM (`home-fresh.probe.json`) | FR-48-97 |
| G-7 | Contact's Email card prints nothing: `displayType` is `address`, the hand-finished site has `email` | Content writer; the choosing function is unproven (probably the Site Info classifier in `lib/skeleton-classify.mjs`) | `attrdiff.py`, `cov.py` | Spec 48 §5.4 Res 38 |
| G-8 | Transitions, hover states and loops listed and not carried: 45 unmapped motion rows on Contact, 52 on Home, 107 "holds its items in sgsTimeText", 53 `timing-no-home` | Recogniser (motion) and Fill (`lib/fill-motion-account.mjs::silentRows`, `lib/fill-timing.mjs`) | `qa/fill/contact/2026-11-18T11-49-31/unmapped.json`, `qa/fill/home/2026-11-18T12-08-34/unmapped.json` | FR-48-102, FR-48-104 |
| G-9 | Home's builder is "unavailable"; its 52 missing text leaves are the builder | Site build. The skeleton proposes `sgs/choice-flow` and the page-map row has `id: null` (no flow post is built) | `fresh-154.content.html` | FR-48-105, FR-48-106 |
| G-10 | About 200 settings on Home that the hand-finished site holds and Fill never wrote (`sgs/media` fit, width, height and ratio; heading `textWrap`; container `minHeight`, `margin`, `contentWidth`) | Fill; not diagnosed per row (the count is rough) | `attrdiff.py hand-154.content.html fresh-154.content.html` | FR-48-101, FR-48-104 |
| G-11 | The walker cannot tell the Contact clone from the hand-finished page (a hero that lost its padding is four rows among 235). Home's walk, finished after the audit, left 8,032 open rows across its six state-and-width runs and took 45 minutes; whether that count separates Home from the hand-finished baseline (1,465, 1,551 and 1,290) was not checked row by row | Walker | the row counts above; `qa/parity/out/home/report.md` in the worktree | Spec 48 §3.6 |

## Process bugs met running it

1. `--site` does not retarget a run: `sites/mamas-munches-redesign/build/surfaces.json` binds every surface to `local-mamas` (48 mentions), the walker files hold `localhost:8084` and `page-map.site` names `local-mamas`, so a run with `--site local-mediatest-…` still builds into `local-mamas` unless those are rewritten first.
2. A worktree cannot read the secrets: `site-run.mjs::liveBase`, `gate-chain.mjs`, `trial.mjs` and `lib/trial-run.mjs` join the env file onto the repo path; only `lib/wp-run-session.mjs::readEnv` honours `SGS_SECRETS_ROOT`.
3. No calibration target exists for a scratch copy (`calibration-targets.json`).
4. The gitignored `intake/facts.json` and `intake/inventories/` are missing in a fresh worktree and the run degrades silently (Contact proposed 67 nodes without them, 52 with them).
5. `--only contact` still builds six template copies (about 6 of the run's 17.5 minutes).
6. A surface run overwrites committed files: the origin files, `qa/divergences.json`, `draft-defects.json`, the `qa/parity` walker files and the skeleton files.
7. One unresolved apply row (`sgs/responsive-logo` `svgParts`, no `build/logo-svgparts.json`) stops Home before its walk.
8. The end-of-run gate chain crashes: `gate-chain.mjs` reads `build/trees/page/contact.json`, which no stage writes.
9. Timings: Contact 1,052 s (inventory 55, Fill 106, build 84, apply 118, walk 565); Home's Fill alone 737 s.

## Reproduce

Worktree at `b14b92d67`, `TMP` and `TEMP` set to `E:\sgs-tmp`, `SGS_SECRETS_ROOT` pointing at the main checkout, the cache copied in (288 MB, about a minute), `surfaces.json`, the walker files and `page-map.site` retargeted to the scratch copy. Then `node scripts/computed-route/site-run.mjs mamas-munches-redesign --site local-mediatest-cloneaudit --only contact --live-base http://localhost:8095`, the same with `--only home`, then `--only home --stages walk`. Draft: `node scripts/computed-route/tools/draft-viewer.mjs mamas-munches-redesign --port 5181`. Measure: `node probe.mjs <name> <draftUrl> <cloneUrl> <outDir>`, then `compare.py` and `cov.py`.
