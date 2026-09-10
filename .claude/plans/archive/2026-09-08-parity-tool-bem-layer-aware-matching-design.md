# computed-parity.js — BEM layer-aware collision resolution (design)

**Status:** Approved by Bean 2026-09-08. **Implemented AND verified (2026-09-10)** — the BEM
same-family merge, the statistical fallback and the multi-candidate box comparison are all
present in `computed-parity.js`, and a live re-run + the tool's own self-test confirm the
mechanism does what this doc set out to build (full evidence in the Verification section
below). **Correction:** the "keyed distinctly" record-keeping this doc describes below (both
candidates surviving as separate scored entries) is NOT what was built — the shipped design
merges the family cluster into ONE record and attributes each CSS property to whichever
member's value differs from that member's default (`mergeFamilyBoxRecords()`). Both approaches
satisfy the same goal (nothing silently dropped), the shipped one was chosen during
implementation as simpler and provably safer (see the file's own v1.3.1/v1.3.2 comments) —
read the code as the source of truth for this detail, not this doc.
**Owning file:** `plugins/sgs-blocks/scripts/parity/computed-parity.js`
**Context:** Clone-fidelity programme, Phase 1 (fix the parity tool). Follows the qc-council
run that validated a purely statistical "keep all candidates, best match wins" fix for the
`boxElsRaw` text-collision bug (see the council's Stage 6 experiment in the session that
produced this doc). Bean asked whether the fix could instead use the same layer knowledge the
CONVERTER already has, rather than guessing statistically — this doc is that design.

## Problem (recap, plain English)

The parity tool matches draft elements to clone elements by their visible text. When several
nested elements share identical text — e.g. a wrapper `<section>` whose sole child is an
`<div class="…__inner">` holding 100% of the text — the tool can only keep ONE of them per
text key. It currently keeps the deepest. That silently discards whichever element the LOST
candidate actually painted (proven live: a real `border-top:1px` on the outer `<section>`
vanishes because the tool keeps the borderless `__inner` div instead).

## Root architectural fact (verified this session)

Every composite block that mirrors `sgs/container` (hero, trust-bar, cta-section, container
itself, plus block-private composites like form/modal/post-grid) renders its "layer 2" content
band as a child element named `sgs-<own-block-name>__inner` — e.g. `sgs-container__inner`,
`sgs-form__inner`, `sgs-modal__inner`, `sgs-post-grid__inner`. Confirmed via grep across
`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` and each block's own
`render.php`. This is NOT one shared literal string — each block names its own inner layer
after itself, per this project's standard `sgs-<block>__<element>--<modifier>` BEM convention
(Spec 00 §3.1).

The general, no-hardcoded-list version of the signal: **a collision candidate is a structural
sub-layer of an ancestor candidate (not an independently authored block) when its own BEM
`<block>` token matches the ancestor's BEM `<block>` token.** A genuinely nested block (someone
deliberately placing a real `sgs/container` inside an `sgs/hero`) has a DIFFERENT block token
in its own root class and is correctly NOT treated as a sub-layer.

## Design

Three-tier resolution order for a `boxElsRaw` collision:

1. **BEM same-family match (new, deterministic).** Parse every candidate's class list with a
   small JS port of the `sgs-<block>__<element>--<modifier>` pattern (mirrors
   `db_lookup.parse_sgs_bem()`'s regex — Spec 00 §3.1 — re-implemented in-browser since
   `CAPTURE_SRC` runs in the page context with no Python access). If a descendant candidate's
   `block` token equals an ancestor candidate's `block` token, they are the SAME component's
   own layers, not competing boxes:
   - The ancestor (outer) is kept as the record for border/background/section-level box
     properties.
   - The descendant (`__<element>`) is kept as the record for content-width/band-level
     properties (max-width, margin-auto centring, band padding).
   - Both survive as separate `boxEls` entries (keyed distinctly, not collapsed to one) so
     BOTH get scored on their own real properties — nothing is silently dropped on either
     side.
2. **Statistical fallback (the qc-council-validated fix, unchanged).** When no BEM
   same-family relationship is found among the colliding candidates, keep every candidate,
   compare the draft record against each, and keep whichever pairing has the fewest
   mismatches.
3. **Last resort.** If the fallback still can't discriminate (a genuine tie), keep today's
   deepest-wins behaviour — not a regression, since that's the current behaviour for every
   case already.

## Why this over a pure statistical fix

- Deterministic where the architecture is known — no risk of the best-match heuristic
  picking wrong on an untested shape (the council already falsified one heuristic that looked
  plausible and picked the wrong element on the real footer case).
- Correctly distinguishes a genuine nested container block from an auto-generated layer —
  something no amount of text/property matching can know, because it's a question about
  authorial intent, not computed style.
- Both layers get scored, not just the "winner" — closes the open question from the qc-council
  report about whether a losing candidate's own properties should still count.

## Build scope

Single file: `plugins/sgs-blocks/scripts/parity/computed-parity.js`.
- Add a small BEM parser inside `CAPTURE_SRC` (regex port, no new dependency).
- Change the `boxElsRaw` collision branch: on a same-family match, keep BOTH candidates under
  distinct keys instead of collapsing to one. On no match, switch from unconditional
  overwrite to array-of-candidates (per the qc-council Stage 6 experiment already written).
- Update the box-comparison consumer (`runTier`'s box branch) to try multiple candidates per
  key and keep the best match, per the same experiment.

## Relationship to the 37 conformance goldens — a different system, easily confused

Both are "snapshots", and conflating them wastes a session. They share nothing.

| | This tool (`computed-parity.js`) | The conformance goldens |
|---|---|---|
| Measures | RENDERED fidelity: the live clone's computed styles vs the draft's | The CONVERTER's emitted block markup vs a frozen expected output |
| Ground truth | The draft, measured fresh every run | A file on disk, saved once |
| State | Live, runs on every clone at Stage 11.6 | 37 of 39 quarantined as `xfail(strict=True)` since 2026-08-24 |
| Unblocked by | Nothing — it runs today | Spec 31's tier-migration upgrade, then a landed deploy, then a re-seed |

Fixing this tool unquarantines no golden, and re-seeding the goldens validates nothing here.

## Verification — RUN 2026-09-10, against real evidence

**Command actually run** (draft = mama's-munches homepage source; clone = the production
homepage, page 2742 on the sandybrown canary):

```
node plugins/sgs-blocks/scripts/parity/computed-parity.js \
  --draft "sites/mamas-munches/mockups/homepage/index.html" \
  --clone "https://sandybrown-nightingale-600381.hostingersite.com/?page_id=2742" \
  --out <report.json>
```

Re-run repeated against page 3448 (the fresh re-clone of the identical content) at 1440px only,
to confirm the result isn't an artefact of one specific clone instance — materially identical
(CONTENT 100%, STRUCTURE 93%, LAYOUT 75-76%, PAINT+TYPE 76-77% on both; same properties
matched/mismatched on the announcement-bar and trustpilot-bar). Also ran
`node computed-parity.js --self-test` — **all fixtures pass**, including the two most relevant
to this design (Fixture 5b: independent same-family box failures on `border-top-width` AND
`border-left-width` both survive scoring, not silently dropped; Fixture 8: page-level chrome
`<footer>`/`<header>`/`<nav>` excluded from BOTH sides symmetrically, while a content-area
`<footer>` — e.g. a testimonial card's own `<footer>` — is correctly NOT blanket-excluded and
still scores real diffs).

**Result 1 — Announcement-bar `border-top-width`: MATCH, confirmed at the CSS-source level.**
Draft: `.sgs-announcement-bar--send-to-ward { border: 1px solid var(--primary); }` (source
line 589). Clone: the lifted stylesheet
(`wp-content/uploads/sgs-css/sgs-3497-*.css`) carries
`.sgs-cst-dcc1884a.wp-block-sgs-container{border-style:solid;border-width:1px 1px 1px 1px;}` —
1px, all four sides. The tool's own mismatch list for this element (`classes.draft:
["sgs-announcement-bar--send-to-ward"]`) lists only `font-size`/`line-height`/`max-width`
diffs — `border-top-width` is absent, i.e. scored as a match. (A live
`getComputedStyle` read in one ad-hoc browser session returned `0.8px` for all four border
sides uniformly — traced to that session's own rendering artefact, not a real 0.8px: the
authored CSS and the lifted stylesheet both say `1px`, and the parity tool's own capture browser
runs `deviceScaleFactor: 1` with no zoom, matching the draft. Not used as evidence; the
CSS-source match above is.) **PASS** — this is the exact case the design doc set out to fix:
previously the tool paired the collision to the borderless `__inner` div and reported a false
0px; it now correctly attributes the border to the outer/`sgs-container` layer and it matches.

**Result 2 — Trustpilot-bar `border-top-width`: MATCH, same method.** Draft:
`.sgs-social-proof__trustpilot-bar { border: 1px solid var(--border); }` (source line 628).
Clone: same lifted stylesheet,
`.sgs-cst-656afed8.wp-block-sgs-container{border-style:solid;border-width:1px 1px 1px 1px;}`.
Tool's mismatch list for `classes.draft: ["sgs-social-proof__trustpilot-bar"]` again lists only
`font-size`/`line-height`/`max-width` — no `border-top-width` diff. **PASS.**

**Result 3 — Footer-row `display`/`justify-content` + border: NOT RUNNABLE AS WORDED, and this
is a doc-wording gap, not a tool bug.** The mama's-munches homepage's real "footer row"
(`.sgs-footer__bottom` — `display:flex`, `justify-content:space-between` at ≥768px,
`border-top:1px solid`) sits inside `<footer class="sgs-footer">` at the page's TOP level. The
tool by design excludes page-level `<header>`/`<footer>`/`<nav>` from scoring on BOTH sides —
matching this project's R-31-3 top-level chrome-skip convention — so `.sgs-footer__bottom`
never enters the scored map at all; it neither matches nor mismatches, it's simply out of scope.
Confirmed directly: `© 2026 Mama's Munches. Registered Food Business, Birmingham.` and
`Made with love for breastfeeding mums` (the footer-row's actual text) appear nowhere in the
tool's JSON output for this run. This is deliberate, self-tested behaviour (Fixture 8, both
controls pass — see above), not a regression from the BEM-merge change; a genuinely
content-area footer (a testimonial card's own `<footer>`) is proven NOT to be excluded by the
same fixture's positive control. **Verdict: the mechanism behaves correctly; the original
Verification wording assumed a footer element that turns out to be page chrome on this specific
page, so the specific check as worded can't be exercised against live content here — the
self-test fixture is the correct proof for this claim instead, and it passes.**

**Result 4 — No-collision spot-check: the gift-section cards, PASS, no accidental behaviour
change.** `.sgs-gift-section__card` (draft) maps one-to-one to a single clone `sgs/info-box`
instance with ordinary, specific diffs (`font-size 16px->15px`, `line-height 26px->25px`) — no
candidate-array/collision artefacts, no duplicate or merged records. This block has no
composite-wrapper BEM family collision (a single card, not a container/inner pair), and it
scores exactly like the pre-existing statistical/direct-match path (matching Fixture 6b/6c's
passing ambiguous-pairing and reordered-list controls in the self-test) — confirms the BEM
same-family branch is additive, not a blanket behaviour change.
