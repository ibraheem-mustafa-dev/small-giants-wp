# Single-use prompt: brainstorming council on draft normalisation (2026-09-20)

Invoke /autopilot before doing anything else.

Delete this file (`git rm`) in the commit that finishes or supersedes this session.

## What Bean wants (his words, tidied)

Stop processing "absolutely everything as it comes" in the pipeline. Instead, clean and standardise a draft when it arrives, before conversion:
- tidy custom breakpoints (round anything within about 10px of a device-tier edge to it),
- fix the "weirdness" of classless drafts: missing labels, empty values, raw bindings,
- use the information in the draft's README to insert labels and structure into the draft's main files so it matches the standard shape Mama's homepage has (SGS-BEM classes),
- and write the rules down as a schema / standardisation / architecture document that Claude Design can be told to follow, so future drafts arrive already standardised.

The session opens with a brainstorming council, not with building. Nothing is built until Bean approves a design.

## Read first (in this order)

1. Project rule: read `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` END TO END. Sections 13, 15 and 16 (FR-31-5.2 lives in 13; FR-31-26 to FR-31-30 in 15 and 16) matter most.
2. `.claude/LEDGER.md` Human Summary and the Front F block, then decision D1129 and D1128 in `.claude/decisions.md`.
3. `.claude/specs/00-naming-conventions.md` sections 3 and 3.1: the SGS-BEM standard Bean-authored drafts follow. This is the "standard shape".
4. `.claude/specs/33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md` FR-33-15 (the README token table is already read) and `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` sections 1 and 11.
5. `.claude/reports/2026-09-20-script-binding-tiers-design.md` and `.claude/reports/2026-09-20-eye-care-draft-manifest.md`.
6. The two real drafts side by side: `sites/mamas-munches/mockups/homepage/index.html` (the standard) and `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/` (README.md, `Eye Care Birmingham.dc.html`, `Frame Card.dc.html`).

## What already exists (do not rediscover it)

- Screen route (FR-31-28): a multi-screen draft clones one screen (`--screen`, else the README route `/`). Eye Care homepage: 5 of 8 sections, no other-screen text.
- Draft manifest (FR-31-27): read-only list of a draft's screens, entities, references, build order.
- Guard (FR-31-29): an unresolved `{{ }}` style value is dropped and reported.
- Evaluator (FR-31-30): the draft script's own width expressions turned into mobile, tablet and desktop values. BUILT, NOT WIRED. Bean put the wiring on hold for this council.
- FR-31-5.2: `@media` thresholds are folded into the three device tiers; a non-device threshold goes to `sgsCustomCss` and is "never snapped". Bean's new 10px rule amends "never snap".
- Spec 33 reads the README token table for palette, fonts, layout.
- Spec 44/45: recognisers for classless repeated groups. They exist because drafts arrive classless.

## Evidence the council must use (measured this session)

- A README's structural prose cannot be matched loosely to sections: word-overlap named the wrong section for 5 of 8 homepage boundaries. Exact verbatim phrases labelled 3 of 8.
- The framework database maps a README section name to a block only for "Hero" and "Google reviews".
- The draft's own script states every layout value per breakpoint (`secPad: mob ? '56px 20px' : '104px 52px'`); 75 of 140 style bindings resolve from width alone, 0 mismatches against a measured render.
- 58 of 75 resolved names have a draft breakpoint inside a device tier.
- Live Eye Care page: section padding 0px against the draft's 104px 52px, and a one-column grid where the draft has two, because raw bindings reached the page.
- The pipeline already renders drafts in a browser for several purposes (probe, measure, dc-import, JS content). A draft's rendered DOM has every binding resolved.

## Questions the council must answer (each with a recommendation)

1. **Where does normalisation live and what does it produce?** A normalised COPY beside the untouched original, with a per-edit provenance log and a diff report? Or an in-place rewrite? It must be idempotent and deterministic.
2. **Which approach?** Test at least these four and rank them:
   - A. Render to static: render the draft in a browser at the three device widths, take the resolved DOM as static HTML, then add SGS-BEM labels.
   - B. Source-level rewrite of the `.dc.html` (resolve bindings by evaluation, insert classes and `data-slot` from the README and script).
   - C. Status quo plus more pipeline patches.
   - D. A Claude Design schema so drafts arrive standardised, plus a light normaliser for the rest (third-party and scraped drafts).
3. **What exactly is normalised?** Custom breakpoints (the 10px rule and the `sgsCustomCss` residual), raw bindings and empty values, missing SGS-BEM classes and labels, multi-screen files, README-derived structure. What is deliberately NOT touched?
4. **How is README information turned into structure safely?** Only verbatim, unique phrases? Component names? A required README section format the schema imposes? What happens when it is ambiguous (report, never guess)?
5. **The Claude Design schema document.** What must a draft contain (classes, `data-slot`, README sections list, routes table, token table, breakpoints limited to 768 and 1024, no bindings in style values, screen labels)? How do we test whether Claude Design actually follows it (run it, measure the output against the schema)? Where does the document live and how is it kept in step with Spec 00 section 3.1?
6. **What gets simpler or retired?** Which of the screen route, guard, evaluator, manifest and the Spec 44/45 classless recognisers stay needed for third-party drafts, and which become optional for schema-conforming ones?
7. **Risks to the seven project rules.** Rule 1 (convert, don't mirror), rule 2 (no cheats), rule 3 (universal), rule 4 (no skipping: every draft class's content and CSS transfers or is reported), rule 5 (verify on the real homepage), rule 6 (responsive values in block attributes, never inline CSS), rule 7 (design gate). Does normalising a draft before conversion hide losses? How is fidelity measured against the ORIGINAL draft, not the normalised one?
8. **Phases.** A build order where each phase is verified on the real Eye Care page and leaves Mama's byte-identical, with the smallest first step under a day.

## How to run the council

1. Load `/brainstorming`. Research first (Bean rule 16): use `/search` or `/research` for prior art on design-to-code pipelines that standardise their input (layer naming and auto-layout requirements in Figma-to-code tools, design-token handoff formats, how Claude Design's own handoff bundle is specified). Do not recommend from memory.
2. Draft the options and a ranked recommendation with reasoning: a menu, not a single forced choice, and one recommendation. Full map first, then the smallest first action.
3. Attack it with `/qc-council` (different model families where available, each told to try to break the design against the seven rules and the evidence above). Fix or record every finding.
4. Produce, for Bean's approval: a design document, the outline of the Claude Design schema document, and a phased plan. Show them in plain English (Problem, Effect, Solution) before any code.
5. Guardrails: never change how Mama's Munches or other static drafts behave; no new hardcoded lookups (R-31-1); do not wire the held evaluator until the council decides its place; do not add parking entries without Bean's explicit ask; commit straight to `main`, no PR, no stash, explicit pathspec.

## Open items outside this council (do not start them here)

Sections b3, b4, b6 in the Spec 44 review queue (needs Bean at `operator-review.html`); about 13 raw content bindings; cloning About, Help and Contact with `--screen`; the per-client entity registry; Mama's clones halting at the freshness gate because another session's uncommitted Mama's snapshot carries a different draft's hash; two failing tests (`sgs/hero` headline signature, `multi-button` allowed blocks) on committed block source.
