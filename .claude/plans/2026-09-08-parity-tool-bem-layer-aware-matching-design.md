# computed-parity.js — BEM layer-aware collision resolution (design)

**Status:** Approved by Bean 2026-09-08. **Implemented, with one confirmed doc/code mismatch
(2026-09-10 re-check)** — the BEM same-family merge, the statistical fallback and the
multi-candidate box comparison are all present in `computed-parity.js`. **Correction:** the
"keyed distinctly" record-keeping this doc describes below (both candidates surviving as
separate scored entries) is NOT what was built — the shipped design merges the family cluster
into ONE record and attributes each CSS property to whichever member's value differs from that
member's default (`mergeFamilyBoxRecords()`). Both approaches satisfy the same goal (nothing
silently dropped), the shipped one was chosen during implementation as simpler and provably
safer (see the file's own v1.3.1/v1.3.2 comments) — read the code as the source of truth for
this detail, not this doc. The Verification section below has still not been recorded as run;
the doc's own text notes it "can no longer be run as written" against a pre-change snapshot —
verify against the draft's live computed styles instead.
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

## Verification

⚠ **The pre/post comparison below can no longer be run as written.** The change is already
in `computed-parity.js`, so the "pre" measurement no longer exists and cannot be recovered
after the fact. **Capture a baseline BEFORE editing a measurement tool, never after** — once
the instrument has changed, there is nothing left to compare it against.

What is still runnable, and is the better test anyway: check the tool's output against the
DRAFT's real computed styles — the ground truth it exists to match — rather than against an
older run of itself. A tool agreeing with its own previous output proves consistency, not
correctness.

Re-run `computed-parity.js` against page 2742:
- Announcement-bar + Trustpilot-bar `border-top-width`: must report the true 1px (currently
  false 0px).
- Footer-row `display`/`justify-content`: must stay correctly matched (no regression) AND the
  footer-row's own border (if any) should now also score correctly rather than being silently
  dropped.
- Spot-check one page with NO composite-wrapper collisions at all to confirm the fallback path
  still produces identical output to before this change (no behaviour change where the BEM
  rule doesn't apply).
