---
doc_type: implementation-plan
plan_id: eye-care-review-phase
phase_name: Eye Care - one plan, every surface reviewed, a work plan by surface
project: small-giants-wp
spec_id: client build (Front F, D1149)
status: READY (next session)
header: "[PLAN: opus]"
cost_estimate: "about 1 session; up to 9 Sonnet subagent runs (3 checkers, 1 config author, up to 5 classifiers), the rest inline"
docscore_grade: see Phase Header
---

# Eye Care phase: one plan, every surface reviewed, a work plan by surface

**USP:** Eye Care is the first client site built end to end on SGS. This phase turns six active plan docs, three archived ones and a
cloud handover into one accurate picture, then measures every surface against the draft, so the build that follows
is a straight list of fixes instead of rediscovery.
**Plan label:** [PLAN: opus] (the classification and the work plan are judgement; the runs are delegated)
**Docscore:** see Stage 7 note at the end
**Aggregate cost estimate:** about one session: 3 Sonnet doc checkers, 1 Sonnet walker-config author, up to 5 Sonnet
row classifiers, the rest inline.

**Phase success criteria (done when):**
- [ ] One unified Eye Care doc exists in `.claude/plans/`, with a section per surface, every claim in it checked
      against code or the live site; the nine source docs are in `plans/archive/` and no live doc cites their old path
      (`git grep` command in QA Gate 1 returns nothing).
- [ ] Every surface has a fresh walker report (`sites/eye-care-ward-end/build/qa/parity/out/<surface>/report.md`)
      and Bean's eye check at 375, 768, 1440 and 1920.
- [ ] Every open row is classified (accepted / violation / foundational gap / jitter) and every violation names the
      tree setting or the control that closes it.
- [ ] The work plan (in the unified doc) orders the fixes by surface, and Bean has approved it.

**Entry context (read before starting):**
- `.claude/plans/2026-10-01-eye-care-cloud-handover.md`: what the cloud session built and what is still open (§4).
- `.claude/plans/2026-09-24-eye-care-hand-build-design.md` Status block: the governing build plan (D1149).
- `sites/eye-care-ward-end/CLAUDE.md`: the client, the positioning, what the draft must feel like.
- `scripts/parity/GAP-CHECKLIST.md`: the walker method (exit 0 = lint, 0 open, every shot reviewed).
- `.claude/plans/2026-10-01-header-nav-thread-plan.md` §2.2: the four-way row classification this phase reuses.

**References:**
- Draft: https://mintcream-lyrebird-224487.hostingersite.com/ (source `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/`).
- Test site: https://darkcyan-grouse-898606.hostingersite.com (credentials `.claude/secrets/eye-care-test.env`, key `EYECARETEST`).
- Walker: `scripts/parity/draft-live-walk.mjs`; configs `sites/eye-care-ward-end/build/qa/parity/<surface>.mjs`
  (about, bag, checkout, confirmation, contact, header, help, home, lens, lenses, product, shop; no footer yet).
- Trees: `sites/eye-care-ward-end/build/*.tree.json`, applied only with `scripts/wp-build-page.js`.

**State at the start (2026-10-01):** eye-care-test runs `main` with every cloud-session fix and this session's
header fixes (deploy verified by checksum). Applied with no invalid blocks: header 199, mobile menu 203, megas 165,
176, 183, 186, home 208. All 40 brand logos set (Ferrari tile: attachment 625). Not yet re-walked.

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| skill | /sgs-wp-engine | steps 3, 8 |
| skill | /visual-qa | step 6 |
| cli | node scripts/parity/draft-live-walk.mjs | steps 4, 5 |
| cli | node scripts/wp-build-page.js | step 8 (only to test a fix idea) |
| cli | python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py | steps 7, 8 |
| agent | Sonnet subagents | steps 2, 4, 7 |
| external | Playwright (headed for the canary bot check) | steps 5, 6 |

---

Step 1 — Read the map and the four decisions below
  Model:       inline
  Action:      Read this plan, the Key Judgement Calls at the end, and the handover §4. Confirm with Bean the two
               "known small accepted differences" (drawer stagger brings the four Shop links in together; review
               stars 2px apart) and KJC 3 (test order for the confirmation page).
  Files:       none
  Inputs:      this plan; `.claude/plans/2026-10-01-eye-care-cloud-handover.md` §4
  Outcome:     Bean's answers recorded in this plan's KJC section.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5
  Tooling:     none
  On-Fail:     If Bean is away, proceed with the recommendations and mark them "pending Bean".
  Cold-Entry:  this plan; the handover; `sites/eye-care-ward-end/CLAUDE.md`
  Test:
    Happy:       Bean answers all three → recorded.
    Edge:        Bean defers one → it carries as "pending Bean" into step 8.
    Fail:        Contradicts a doc → the doc is wrong; note it for step 3.
    Integration: standalone

Step 2 — Check every Eye Care plan doc for accuracy (3 checkers in parallel)
  Model:       sonnet (x3)
  Action:      Dispatch the three prompts below in one message. Each checker reads its docs, lists every claim of
               "built / done / live / open / parked", and verifies each against the code (grep by symbol) and, where
               the claim is about the live page, by fetching the test site. Output: a claim table per doc with
               TRUE / STALE (with the current truth) / OPEN.
  Files:       writes only `C:\Users\Bean\AppData\Local\Temp\eye-care-doc-check-{a,b,c}.md` (scratch)
  Inputs:      the nine docs (split below)
  Outcome:     three claim tables; every STALE row carries the evidence (command or URL) that shows the current truth.
  Exec:        PARALLEL (three agents; no shared files)
  Deps:        step 1
  Marker:      (none)
  Time:        10
  Tooling:     Agent (sonnet), Grep, curl
  On-Fail:     A checker that cannot reach the site marks those rows UNVERIFIED and continues.
  Prompt (template; fill DOCS and OUT per checker):
    > Read-only. Repo C:\Users\Bean\Projects\small-giants-wp. Check these Eye Care plan docs for accuracy: DOCS.
    > For every claim that something is built, done, live, deployed, open, parked or decided, verify it: code claims
    > by grepping the named symbol or file (cite as path::symbol, never line numbers); live claims by fetching
    > https://darkcyan-grouse-898606.hostingersite.com (pages are public; use a browser user agent). Mark each claim
    > TRUE, STALE (give the current truth and the evidence) or OPEN (still to do). Note any two docs that disagree.
    > Do not edit any repo file. Write the result to OUT as one table per doc: claim | doc section | verdict |
    > evidence. Under 1,200 words. Final reply: counts per verdict per doc, and the list of disagreements.
    - Checker A: DOCS = `.claude/plans/2026-09-24-eye-care-hand-build-design.md`,
      `.claude/plans/2026-09-24-eye-care-findings-1-8-9-design.md`; OUT = `...\eye-care-doc-check-a.md`
    - Checker B: DOCS = `.claude/plans/2026-09-25-eye-care-product-page.md`,
      `.claude/plans/2026-09-28-eye-care-product-page-parity.md`, `.claude/plans/archive/2026-09-25-eye-care-product-card.md`,
      `.claude/plans/archive/2026-09-26-eye-care-shop-parity.md`; OUT = `...\eye-care-doc-check-b.md`
    - Checker C: DOCS = `.claude/plans/2026-09-25-eye-care-bag-checkout-prescription.md`,
      `.claude/plans/2026-10-01-eye-care-cloud-handover.md`, `.claude/plans/archive/2026-09-28-eye-care-resume-tracker.md`;
      OUT = `...\eye-care-doc-check-c.md`
  Test:
    Happy:       three files, every claim with a verdict.
    Edge:        a claim about a page the site serves from cache → re-fetch with `?cb=<random>`.
    Fail:        a checker returns verdicts without evidence → send it back for the evidence column.
    Integration: feeds step 3.

Step 3 — Write the one unified Eye Care doc and retire the nine
  Model:       inline
  Action:      Spot-check five STALE verdicts from step 2 yourself (re-run the evidence). Then write
               `.claude/plans/<today>-eye-care-plan.md` with: Status; Decisions (Bean's, from every doc and the
               handover §5); Surfaces, one section each: header, mega menus (Sunglasses, Brands, Lenses, Help), phone
               drawer, the two nav menu blocks, bag drawer, footer, home, shop, product, lens configurator, lenses,
               about, help, contact, checkout, confirmation. Each section: what is built (TRUE claims only), what is
               open, and a "Review" sub-heading that step 7 fills. Carried items: colourway photos, clinic and Fatima
               photos, the buybox and animation-observer splits, lens height and frame diagrams. `git mv` the six active
               docs into `plans/archive/` (the three already there stay), and repoint every live reference.
  Files:       new plan doc; the nine source docs (moved); `.claude/LEDGER.md` Front F pointer; any live doc that cites them
  Inputs:      step 2 outputs
  Outcome:     one doc that a cold reader can trust; no live reference to an old path.
  Exec:        SEQUENTIAL
  Deps:        step 2
  Marker:      (none)
  Time:        20
  Tooling:     /sgs-wp-engine, git
  On-Fail:     If a spot-check disagrees with the checker, re-verify that whole doc's STALE rows inline.
  Test:
    Happy:       every section has built / open / Review.
    Edge:        two docs disagree → the code or the live site decides; record the decision in the section.
    Fail:        a claim with no evidence → it goes under "open: unverified", never under built.
    Integration: LEDGER Front F points at the new doc.

QA Gate 1 — No live reference to a retired Eye Care doc
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 2-3
  Check:   `git grep -n -E "plans/2026-09-2[4-8]-eye-care|plans/2026-10-01-eye-care-cloud-handover" -- . ':!.claude/plans/archive/' ':!.claude/archive/' ':!.claude/plans/2026-10-01-eye-care-review-phase-plan.md'`
  Pass:    no output; `python .claude/hooks/handoff-preflight.py --check` exits 0.
  Fail:    repoint each hit (dated reports → the archive path; live docs → the new doc), re-run.
  Marker:  QA

Step 4 — Write the footer walker config
  Model:       sonnet
  Action:      Write `sites/eye-care-ward-end/build/qa/parity/footer.mjs` on the pattern of `home.mjs` (same draft and
               live URLs, `auto: false`), pairing every footer element in the draft (the footer markup in the draft's
               `dc.html`, the `<footer>` block) with its live counterpart: the brand block (wordmark and tagline),
               each column heading, each link, the address, the hours line, the three social boxes, the bottom bar,
               its hairline and the Privacy and Terms links. The draft footer is the `<footer class="sgs-footer">` in
               `Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html` (not the line range the handover
               gives). Run `--self draft` to prove the config reads 0 against itself.
  Files:       `sites/eye-care-ward-end/build/qa/parity/footer.mjs` only
  Inputs:      `home.mjs` (pattern), the draft's footer markup, the live footer (`sgs_footer` post; find its ID with
               `wp post list --post_type=sgs_footer`)
  Outcome:     `node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/footer.mjs --self draft` exits 0.
  Exec:        PARALLEL with step 2
  Deps:        none
  Marker:      (none)
  Time:        10
  Tooling:     Agent (sonnet), node
  On-Fail:     If the live footer still uses `core/list` and an element has no counterpart, pair what exists and list
               the rest as presence rows (that is the finding, not a config error).
  Prompt:
    > Repo C:\Users\Bean\Projects\small-giants-wp. Write ONE new file:
    > sites/eye-care-ward-end/build/qa/parity/footer.mjs, a parity-walker config for the Eye Care footer. Copy the
    > structure of sites/eye-care-ward-end/build/qa/parity/home.mjs (draft URL, live URL, states, pairs, review,
    > accept) and read scripts/parity/GAP-CHECKLIST.md for the pair options. The draft footer is the <footer> in the
    > Eye Care draft (the <footer class="sgs-footer"> in sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html); the live
    > footer is on https://darkcyan-grouse-898606.hostingersite.com/. Pair: the brand block (wordmark, tagline), each
    > column heading, each column's links, the address, the hours line, each social box, the bottom bar, its
    > hairline, and the Privacy and Terms links; include hover on links and social boxes. Then run
    > `node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/footer.mjs --self draft`
    > and fix the config until it exits 0. Touch no other file. Reply with the exit code and the pair count.
  Test:
    Happy:       `--self draft` exits 0.
    Edge:        an element missing live → a presence row, not a crash.
    Fail:        a selector matches nothing in the draft → the self-run reports it; fix the selector.
    Integration: step 5 runs it.

Step 5 — Walk every surface
  Model:       inline (runs are commands; the main thread copies each report)
  Action:      From the repo root, run `node scripts/parity/draft-live-walk.mjs sites/eye-care-ward-end/build/qa/parity/<s>.mjs`
               (reports land in `out/<config name>`) for bag, footer, home, shop, product, lens, lenses, about, help,
               contact, checkout and confirmation. The header is two runs, exactly as `header.mjs`'s own header comment
               gives them: `--widths 1440 --states mega-shop,mega-brands,mega-lenses,mega-help`, then
               `--widths 375 --states drawer-open`; copy `out/header/report.md` aside between them (the second run
               overwrites it). The confirmation page needs the test order from KJC 3; with no test payment method
               enabled, mark confirmation "unreviewed" and carry on.
  Files:       `sites/eye-care-ward-end/build/qa/parity/out/**` (gitignored)
  Inputs:      configs; step 4
  Outcome:     a report.md and contact sheet per surface; the open count per surface in a table in the unified doc.
  Exec:        SEQUENTIAL (one headed browser; runs share the site)
  Deps:        steps 3, 4
  Marker:      (none)
  Time:        30
  Tooling:     node, Playwright headed
  On-Fail:     A run that hits the host's browser check: reload in the headed window, re-run that surface only.
  Test:
    Happy:       every surface has a report.
    Edge:        cache serves an old page → the walker's `{cb}` cache-buster; purge with `wp litespeed-purge all`.
    Fail:        a walker crash → note the surface and the error; carry on with the rest.
    Integration: feeds steps 6 and 7.

Step 6 — Bean's eye check at four widths
  Model:       inline + Bean
  Action:      Put each surface's contact sheet in front of Bean (SendUserFile), at 375, 768, 1440 and 1920, plus the
               these states: the £ signs, full-width megas, the Lenses boxes, the mega fonts and grids,
               the bag "0" bubble, the bag drawer empty and with an item, the shrunk header and its unshrink, the gap
               under the trust bar. Record what Bean flags per surface.
  Files:       the unified doc's Review sub-headings
  Inputs:      step 5 contact sheets
  Outcome:     Bean's notes recorded per surface.
  Exec:        SEQUENTIAL
  Deps:        step 5
  Marker:      (none)
  Time:        15 (Bean's time)
  Tooling:     /visual-qa, SendUserFile
  On-Fail:     Bean disputes a walker "match" → follow `~/.claude/rules/measurement-vs-eye.md` (pixel evidence).
  Test:
    Happy:       every surface has Bean's verdict.
    Edge:        1920 is not a walker width → screenshots at 1920 by hand.
    Fail:        none; this step records.
    Integration: feeds step 7.

Step 7 — Classify every open row, per surface
  Model:       sonnet (up to 5 in parallel: header+drawer+menus; megas+bag; footer+home+shop; product+lens+lenses;
               about+help+contact+checkout+confirmation)
  Action:      Dedupe each report's open rows (keep one row per unique pair, kind, key, draft and live value, listing
               the states and widths it was seen in; a short Python pass over each report's `**open**` table lines) and dispatch the classification prompt below per group. Then QC inline: re-check every
               "foundational gap" and five random "same paint" accepts against the files.
  Files:       scratch only; the result goes into the unified doc's Review sub-headings (step 8)
  Inputs:      step 5 reports; step 6 notes
  Outcome:     every row in one class; violations name a fixing setting or "no setting found".
  Exec:        PARALLEL (five agents, disjoint surfaces)
  Deps:        steps 5, 6
  Marker:      (none)
  Time:        15
  Tooling:     Agent (sonnet), sgs-db.py
  On-Fail:     counts that do not add up to the row total → send back.
  Prompt (template; the one used for Gate 3C on 2026-10-01, with SURFACES and paths filled):
    > Read-only. Classify every open parity row in ROWS_FILES (Eye Care draft vs the SGS copy on eye-care-test) into
    > exactly one of: ACCEPT-BLIND (the walker cannot judge it: script-driven motion, timeline samples, host
    > console errors); ACCEPT-SAME-PAINT (structure differs, a visitor sees the same, nothing hardcoded: inner vs
    > outer padding, transition shorthand naming, display variants with the same layout, a transition on a property
    > that never changes, a border style on a 0px border); VIOLATION (a visible difference; name the block and the
    > existing block.json attribute and value that fix it, or "no setting found"); FOUNDATIONAL-GAP (no block
    > setting can produce it and any client would need it); JITTER (sub-0.2 timing samples that move between runs).
    > Bean's eye notes: NOTES. When unsure between same paint and violation, choose violation and say why. Group
    > rows with one cause. Write to OUT; reply with the counts per class and the foundational gaps.
  Test:
    Happy:       counts add up per surface.
    Edge:        a Bean note with no walker row → a violation row of its own.
    Fail:        a "same paint" that Bean flagged → it is a violation.
    Integration: feeds step 8.

QA Gate 2 — Every surface reviewed and classified
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    steps 5-7
  Check:   the unified doc's table "Surface | report path | open rows | accepted | violations | foundational | jitter"
           has a row per surface and each row's classes sum to its open count.
  Pass:    every surface present; sums match.
  Fail:    re-run the missing surface's step 5 or 7.
  Marker:  QA

Step 8 — Write the work plan, by surface
  Model:       inline
  Action:      In the unified doc, a "Work plan" section: surfaces in build order (header, phone drawer, nav menus,
               mega menus, bag drawer, footer, home, shop, product and lens, then the other pages). For each: the
               violations grouped by fix (tree setting / existing control / new control), the foundational gaps first,
               each with its file (cite path::symbol) and a low time estimate. The footer's `core/list` replacement
               and the cloud screenshot gap list (handover §4.2) go in the footer section. Then `/handoff`.
  Files:       the unified doc; `.claude/LEDGER.md` Front F
  Inputs:      step 7 results; KJC answers
  Outcome:     Bean approves the work plan; the next session starts at its first surface.
  Exec:        SEQUENTIAL
  Deps:        QA Gate 2
  Marker:      HANDOFF
  Time:        20
  Tooling:     /sgs-wp-engine, sgs-db.py (check the block library before calling anything a new control)
  On-Fail:     A gap whose fix is unclear → it becomes a design question for Bean in the KJC section, not a guess.
  Test:
    Happy:       every violation has a fix path.
    Edge:        one fix closes rows on several surfaces → listed once, under the first surface, cross-referenced.
    Fail:        a fix that needs a hardcode → rejected; find the setting or name the control.
    Integration: LEDGER Front F points at the work plan's first surface.

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Where the unified doc lives and what it replaces.
  - **Options:** A) a new dated `eye-care-plan.md` that replaces all nine; B) extend the hand-build design plan.
  - **Recommendation:** A.
  - **Why:** the hand-build plan's Status block has grown into a history log; a fresh doc states current truth only.
  - **Cost of wrong choice:** B keeps stale history in the governing doc and the next reader trusts it.
  - **Who decides:** architect (recommendation stands unless Bean objects).
- **Decision:** The two "known small accepted differences" (drawer stagger brings the four Shop links in together, to
  keep the nav landmark; review stars 2px apart).
  - **Options:** accept both / fix one / fix both.
  - **Recommendation:** accept both; record them as accepted with the reason.
  - **Why:** both are below what a visitor notices and the stagger split would cost the nav landmark.
  - **Cost of wrong choice:** small either way.
  - **Who decides:** Bean (step 1).
- **Decision:** A real order for the confirmation page.
  - **Options:** A) place a test order on eye-care-test with WooCommerce's test payment method, then cancel it; B) skip
    the confirmation page this phase.
  - **Recommendation:** A, on the test site only.
  - **Why:** the confirmation page cannot render its real state without an order; the test site holds no real data.
  - **Cost of wrong choice:** B leaves one surface unreviewed.
  - **Who decides:** Bean (step 1).
- **Decision:** 1920 coverage.
  - **Options:** add 1920 to every walker config / eye check only.
  - **Recommendation:** eye check only, with screenshots.
  - **Why:** the walker's widths are 375/768/1440; the 1920 question is "does anything break wide", which a screenshot
    answers.
  - **Cost of wrong choice:** a wide-screen defect is caught by Bean's eye anyway.
  - **Who decides:** architect.

### Pre-emptive decisions (Hidden Decisions pass: Sonnet and Haiku cold reviewers, 2026-10-01)

- **Decision:** How to classify the gap-line grids. **Flagged by:** Bean, 2026-10-01. **Recommendation:** the
  divider lines on home "Why buy", about, help, prescription-lenses and the product template are the container's
  `separators` setting (native gap decorations in Chromium, a small overlay script in Safari and Firefox; the
  walker reads `column-rule` there, not a background), so a background-colour row on those grids is expected, not a
  violation. Those five trees were moved from the retired `gapColour` to `separators` on 2026-10-01
  (`plans/2026-10-01-separators-plan.md`); step 8's work plan rebuilds the five pages from them.

- **Decision:** Which STALE verdicts to spot-check in step 3. **Flagged by:** haiku. **Recommendation:** the first
  STALE claim on each of header, bag, footer, home and product (one per checker group at least). **Why:** those
  surfaces carry the most build work next.
- **Decision:** The six docs to move. **Flagged by:** both. **Recommendation:** exactly
  `2026-09-24-eye-care-hand-build-design.md`, `2026-09-24-eye-care-findings-1-8-9-design.md`,
  `2026-09-25-eye-care-product-page.md`, `2026-09-25-eye-care-bag-checkout-prescription.md`,
  `2026-09-28-eye-care-product-page-parity.md` and `2026-10-01-eye-care-cloud-handover.md`.
- **Decision:** The live files that cite them. **Flagged by:** sonnet. **Recommendation:** four, found by QA Gate 1's
  command (plus LEDGER's Front F pointer): `.claude/reports/2026-09-24-eye-care-gap-map-recheck.md` (dated report: archive path),
  `.claude/specs/43-SGS-CHOICE-FLOW.md`, `plugins/sgs-blocks/includes/choice-flow-chrome.php` and
  `plugins/sgs-blocks/src/blocks/choice-flow/block.json` (current truth: the unified doc). A code-file comment edit
  needs no deploy; say so in the commit.
- **Decision:** "Carried items" in step 3. **Flagged by:** haiku. **Recommendation:** open items that are not this
  phase's review (photos to source, file splits owed, data-gated features); each gets one line under the surface it
  belongs to, marked carried, so the work plan can schedule it.
- **Decision:** Review sub-headings. **Flagged by:** haiku. **Recommendation:** step 3 writes each surface's empty
  "Review" heading; step 7's results go under it.
- **Decision:** A stale Bean decision. **Flagged by:** sonnet. **Recommendation:** the code or live site states
  current truth; the unified doc records the earlier decision as overtaken and lists it for Bean at step 8.
- **Decision:** A violation with "no setting found". **Flagged by:** sonnet. **Recommendation:** check the framework
  DB (`sgs-db.py sql "SELECT block_slug, attr_name FROM block_attributes WHERE css_property='<prop>'"`); a capability
  any client would need is a foundational gap; otherwise "new control, Bean to decide" in this section.
- **Decision:** LEDGER near its byte cap. **Flagged by:** sonnet. **Recommendation:** the Front F edit replaces text
  rather than adding; `handoff-preflight.py --check` reports the size.
- **Decision:** 1920 screenshots. **Flagged by:** sonnet. **Recommendation:** the chrome-devtools MCP (`…__emulate`
  to 1920x1080, `…__take_screenshot` full page), one headed window.
- **Decision:** The host's browser check returns 403 under load. **Flagged by:** sonnet. **Recommendation:** a checker
  marks those rows UNVERIFIED (step 2 On-Fail); a walker run reloads in the headed window (step 5 On-Fail).

- **Decision:** What counts as the draft when the draft file and the live draft site differ.
  - **Recommendation:** the live draft site (mintcream-lyrebird) the walker configs already point at.
  - **Why:** the configs were proven against it; switching references mid-review would invalidate every count.

## Stage 7 note

Docscore runs at `/handoff` on this file together with the session's other docs.
