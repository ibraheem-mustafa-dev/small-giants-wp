# Final adversarial council on the written specs (2026-10-11, dated record)

Five reviewers in parallel, read-only, on Spec 48 (`d9a158730`), slim Spec 32, Spec 27 FR-30-16/17 and Spec 38 §4.7: a
spec-lawyer, a cynic, a ship-PM, a day-two (client) realist and a cold implementer asked to build stages 0 and 1 for
Indus from the spec alone. Bean asked for this council once both specs were written. Cap (plan): apply the must-fixes
that touch IDs, correctness or work order; the rest goes to the plan's backlog.

## Headline

GO, after the register below. The value-matrix design holds (all five), but Appendix B as written cannot be executed:
stage 0 depends on stage 1 and 3 outputs and on an Indus mirror nobody creates, the sandbox blocks the fonts the harness
waits for, the harness freezes a clock the motion check needs to move, and the code-to-code check has no algorithm.

Claim checked and set aside: "Claude Design cannot write correct SHA-256 hashes" (cynic). B1 found all 84 Claude
Design hashes matched across the three exports. A route-side seal on receipt goes to the backlog as cheap insurance.

## Register (convergence count in brackets; letter = fix item)

| # | Finding | Fix | Where |
|---|---|---|---|
| A | Stages are circular: stage 0's block list needs the page map (stage 1) and skeletons (stage 3); no Indus mirror or `calibration-targets.json` entry; stage-0 default paint goes stale when stage 2 pushes the new snapshot; one cache file per block lets Indus overwrite Eye Care's default paint (5) | Stage 0 = handoff check + slot-map calibration of a fixed block set (census block roster and surface kinds; for Indus the named list) on an existing mirror; create `local-indus` and its calibration target in Appendix A/B; default-paint recalibration becomes stage 2's exit step after the snapshot push and framework edits; default paint keyed per site (`cache/<site>/<block>.paint.json`), slot map site-independent; skeleton inventory and proposal run inside stage 1 so its table is in the one review | Spec 48 FR-48-3, §8, §3.2, §3.4, App. A/B |
| B | Sandbox allowlist blocks `fonts.googleapis.com`, `fonts.gstatic.com`, `images.unsplash.com`, Google Maps; fonts can never load (3) | Record-and-replay cache per manifest hash (fonts and stock images fetched once, replayed with Playwright `routeFromHAR`); any other request is a review row | FR-48-23, FR-48-28 |
| C | Harness: frozen clock vs motion sampling at three times; intervals and rAF never settle; observer reveals never fire; "readings" undefined (4) | Virtual clock advancing in fixed steps (Playwright `clock`); two modes, rest and sample; intervals run N ticks, rAF a fixed frame count, one scroll pass to the end and back; define the reading record | FR-48-28, FR-48-47, §3.6 item 10 |
| D | Indus matches two routing adapters (pages getter + `go()` writing the hash) so intake refuses it (1, cold implementer) | Precedence: hash and pages getter wins when `go()` only writes `location.hash`; Indus hybrid is a fixture | FR-48-26 |
| E | Runtime-only census cannot see code that never runs; METHOD.md uses a regex boundary cut and runs logic in Node (1) | Static census parses the logic class to a syntax tree (no regex), runtime trace confirms; boundary cutting as the runtime does is allowed; all logic runs in the sandboxed page | FR-48-24, FR-48-25 |
| F | Palette proposal at intake needs the extractor, which R-47-1 forbids importing, which reads the README not tokens, and runs on `file://` (1) | New route module `lib/tokens.mjs` parses `tokens/*.css` without a render; the extractor reads tokens later in stage 2 | FR-48-31, §11, App. B |
| G | No schema or path for the baseline, `intake.json`, construct registry, page map, readings; no mark format or read-back; no carry-over of Bean's marks across a re-export (3) | Appendix C schemas; mark values per row type and `intake.mjs --apply-review`; marks carried across a re-export by draft ID and content hash | FR-48-17, FR-48-35, new App. C |
| H | Code-to-code check has no algorithm: how is "emitted" computed; which disagreement gives which verdict (3) | For Indus, emitted = the live paired element's measured value (walker read); a predictive emitter is its own later requirement; a verdict table for declared vs emitted, emitted vs live, declared vs rendered draft | §10 intro, FR-48-36 |
| I | "Draft defect" has no operational test; G2 has no class for a render-wins disagreement (2) | Defect only when the declared value holds unresolved `{{ }}` or the state/motion is unreached at every tested width under a forced state; G2 failure class `render-wins` | R-47-4 text, FR-48-34, FR-48-64 |
| J | Breakpoint snap contradicts Spec 32 FR-32-13 and `.claude/rules/cloning-pipeline.md` ("never snapped"), and FR-48-45's ±1px flip check fails every snap by design (4) | Keep Bean's snap: amend FR-32-13 and the rule file; each snap writes a ledger entry automatically (`breakpoint-snap` rule with its distance); the flip is checked at the written tier | FR-48-45, FR-48-50, Spec 32 FR-32-13, rules file |
| K | `sgsCustomCss` hardening is aimed partly wrong (SGS blocks' style is already lifted to the head; core blocks' is not) and has no Spec 32 requirement; uid is hashed from content; route-written CSS is opaque to the client (4) | New Spec 32 FR-32-20 (scope every rule, uid from the instance, lift core blocks too, editor parity, label route-written CSS); a structured breakpoint override preferred; correct FR-48-50's text | Spec 32, FR-48-50, FR-48-60 |
| L | 1920 walks turn fluid values into false `shape` gaps (`lib/resolve.mjs` maps 1440 and 1920 to desktop) (1) | Desktop tier from 1440; 1920 confirm-only; a 1440/1920 difference goes to the fluid path or I-calibration, never `shape` | §3.1 (new FR) |
| M | Stale `hover-lift` key in FR-33-4, §16 and Appendix B (2) | Use `buttonPresets.default.hover-transform` (Spec 32 FR-32-19) | Spec 48 |
| N | Appendix B misses steps and underestimates (3) | Reorder; add mirror creation, Spec 32 framework halves with deploy and reseed loop, accepted forms, binding grouping, intake 4a/4b, answer-sheet sample, Bean's mailbox task; honest total; header vertical slice first | App. B |
| O | 90% F-precision as a publish blocker brings back human labelling (1) | Precision is a report metric on a fixed random sample labelled by an independent agent from the gate evidence; Bean confirms disagreements only | FR-48-70 to FR-48-73 |
| P | Batched review is the bottleneck (about 150 rows on Indus) (2) | Sections with accept-all plus exceptions; flags accepted as flagged by default; stage 2's environment work may start before stage 1 exits | FR-48-17 |
| Q | Two Site Info writers (2) | `provision-site-info-from-draft.py` is the one writer; `sync-business-info.py` tier 1 becomes a proposal source | FR-33-14, FR-48-32, FR-48-59 |
| R | Mama's: no product fixture for the shop proofs; buy-box split risks stalling it (3) | §16 row "minimum fixture products" (Spec 27, Blocks Mama's); Mama's may ship on the composite plus listed custom CSS if the split is not ready | §16, FR-48-60 |
| S | Snapshots replace `theme.json` wholesale, so new slugs and tokens reach no client until every snapshot gains them; slug names undefined; client name inside a gate; alias mechanism undefined; `clamp()` handled three ways (2) | FR-32-14 names the slugs and adds them to every snapshot in one migration with values equal to today's rendering, plus a push guard; the completeness rule is "framework roster is a subset, extras allowed" (no client named); old slugs kept as CSS-variable shims, never duplicate picker entries; a content survey; `clamp()` kept verbatim, `fluid {min,max}` only for tiered drafts | Spec 32 FR-32-14 to FR-32-18, §14.2 |
| T | Buy-box parts: two sources of truth; store shared with product cards; editor preview of a part with no product (3) | The composite renders through the parts' own render functions; store named; editor fallback and no-product state | Spec 27 FR-30-16 |
| U | Drawer extras lose interactivity (the drawer is re-parented to `<body>` and its items node re-rendered); save output risks block recovery (2) | Extras mount outside the re-rendered node and hydrate after the move; save stays dynamic; done-when with an interactive block and zero recovery prompts | Spec 27 FR-30-17 |
| V | Spec 38 §4.7 credits the wrong file and points agents at `animation_tokens`, which lacks `blur-in`, `reveal-up`, `scale-in` (1) | `lib/fill-entrance.mjs` writes values; query the enum in `src/blocks/extensions/animation.js` | Spec 38, Spec 48 §16 |
| W | Route dependencies come from `plugins/sgs-blocks/node_modules` (Playwright, ajv, saxes) (1) | Route `package.json` with pinned versions; lint bans the plugin path; record the browser version per cache | Spec 48 (new FR) |
| X | Toast with no controls versus "every customisable property has a control" (1) | State it as site chrome styled only by tokens the client edits in Global Styles (Bean's decision) | FR-48-63 |

Backlog (not applied): manifest seal on receipt; route tests pinned to Eye Care build files (copy fixtures); one bridge
adapter for runtime internals with a contract test; README function index generated from JSDoc; vendor the three unpkg
files; throughput tripwire per client; concurrency rules; instrument-debt owner and SLA; lightweight path for brochure
sites; editor round-trip check per surface; framework-update runbook across nine snapshots; global-styles edit policy;
snapshot rollback; WCAG contrast check on new token pairs; status honesty sweep (gate red means partly built).
