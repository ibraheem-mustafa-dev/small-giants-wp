---
doc_type: plan
title: "Claude Design handover standard and the unified cloning spec"
spec: .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md (to be replaced by a new Spec 48 + 48A)
created: 2026-10-10
status: in progress
---

# Claude Design handover standard and the unified cloning spec

**Purpose.** A Claude Design draft (a `.dc.html` "Design Component" prototype) reaches Claude Code as one guaranteed folder
of known files, every file with a named reader in our tooling; then the cloning system is rewritten as one spec around it.
Today the drafts arrived as zip or standalone downloads with no README, each client folder is laid out differently, and
the tools read almost nothing from a draft beyond its rendered pixels.

**Platform change (verified on Anthropic's help pages, 2026-10-10).** The standalone Claude Design site
(claude.ai/design) closes on **14 December 2026** and its projects are then deleted; only design systems migrate.
Each project must be downloaded by hand before then: open it, Share > "Project HTML" > keep "Project archive" > Export
(a .zip with every file). Claude Design now lives in Claude chat as an artifact template, with `/design` and
`/design-sync` in Claude Code and "Handoff to Claude Code" in its Export menu. In the new Claude Design, "Handoff to Claude Code" generates a standalone `.dc.html` draft by design (Bean, 2026-10-11); whether it runs on the same `support.js` runtime is untested. Custom skills uploaded into a Claude Design project
are never registered (its skills are a fixed built-in list); a root `CLAUDE.md` is injected into every conversation and
can name a procedure file, but only advisorily. Research record:
`~/.claude/memory/research/2026-10-10-claude-design-custom-skills-and-sunset.md`.

**Bean's decisions (2026-10-10).**
- A draft is exported with Claude Design's "Handoff to Claude Code" skill and its design-system skill in one standard
  pasted prompt (A4), never
  the zip or standalone download (recorded in Spec 47 §2, `dev-setup.md` "Client drafts", `CLAUDE.md` Sites).
- The machine-readable layer is built in Claude Code by an **intake** step (approach B): it reads the handoff README, the
  design-system `tokens/` and the draft's own code into one structured file Bean confirms once. Designed after Task B.
- **The draft's code is the primary source** (template plus logic class, read and run); rendering and measuring the page
  supplements it only for what the code cannot state (final `clamp()`/`vw` values at a width, grid track sizes, font
  metrics, image-slot shadow DOM). This reverses the spirit of Spec 47 rule R-47-4 ("measured, not copied") and is a
  design input for the new spec, not yet a rule.
- One new cloning spec replaces Spec 47 and absorbs the cloning-only parts of Spec 32 (Part D, the extractor, and the
  client-palette material §12.5-12.7). Working numbers: **Spec 48** (the cloning system) and **Spec 48A** (the handover
  folder architecture), following the roster's letter-suffix convention (Spec 35A). Spec 32 is slimmed to framework only
  (styling contract, token vocabulary, the `theme-snapshot.json` format, which six of nine client snapshots use without
  the extractor). Neither old spec is edited in place: each section gets a keep / move-to-48 / cut ledger, then a fresh
  rewrite, and a script proves every FR ID and every cited rule landed somewhere. Keep the FR-33-n IDs inside Spec 48
  (about 26 code files cite them; `.claude/reports/2026-10-10-handover-council/r4-cites-byfile.txt` lists every citer).
- The Mama's Munches stage 5 run on a zip export is not resumed; setting up and cloning the three drafts is replanned
  after the new spec.

**Evidence.** `.claude/reports/2026-10-10-handover-council/` (six reviewer ledgers; its README lists the ledger claims
later found wrong). The Indus export under review is local only: `.claude/Indus-Foods-Claude-Design-Files/` (Bean has
the zip; not in git).

## Task A: what a handover must contain (Indus), done 2026-10-10 except A5

**A1-A3. Verdict per file** (verified in the main thread; Claude Design's corrections applied; every row re-checked
against all three exports in B1, 2026-10-11).

| Source | Verdict |
|---|---|
| Handoff `README.md` | Essential human guide: routes, global layout, breakpoints, state, animations, business details, assets, open items. Prose bullets: `theme-extractor/declared_sources.py::read_readme_tokens` returns `{"found": false}` on it. Claude Design corrected the Indus footer, block types, forms and assets on 2026-10-10. Its section list differs per export (Eye Care and Mama's add Routes, Forms, Business details and an SGS mapping section; only Indus has Revision), so Spec 48A fixes the required sections. |
| The draft file(s) | The source of truth: template (inline styles, `style-hover`, `style-focus`) and the `DCLogic` class (`state`, routes, `renderVals()` responsive values, motion code). One file with hash routes and a `pages` getter (Indus, 29 routes); one file with `state.page` and `go()` (Eye Care, 11 routes, plus an embedded `<script type="application/json" data-sgs-manifest>` mapping pages to WordPress slugs, overlays, sections and open items); or one file per page plus mounted components (Mama's: 11 pages, `SiteHeader`, `SiteFooter`, `ProductCard`, plain `X.dc.html?id=` links). |
| Form definitions | Essential: steps, fields, conditions, validation. Separate form DCs on Indus (`TradeApplication`, `EnquiryForm`); inline in the page drafts on Eye Care and Mama's (Checkout, Contact, SignIn, Account). |
| `support.js` (runtime), project scripts, `assets/` | Essential to run. Project scripts vary: Indus `image-slot.js` and `indus-logo.js` (which loads only the `-anim.svg` logos; the static `logo-*.svg` pair is byte-identical and unused); Mama's `store.js` (`window.MM`: catalogue, basket, account and orders in `localStorage`); Eye Care none. Two runtime builds are in use: Indus `c60c4908…` (66,404 bytes), Eye Care and Mama's `8fe7df74…` (69,150 bytes). The newer build only adds slide-deck handling in `compile.ts`; the encoder, `__dcAnnotatedTemplate` and `data-dc-tpl` are unchanged, so tooling keeps a list of known runtime hashes. |
| `animations.json`, `surfaces.json` | Essential: written by Claude Design from the code by `handoff-schema/METHOD.md`. All three validate with 0 errors (jsonschema, Draft 2020-12). Indus 217 animation / 61 surface records (29 routes), Eye Care 213 / 52 (11), Mama's 195 / 58 (11). Home-page trace (`scripts/computed-route/trace-check.mjs`, Web Animations plus CSS animation and transition events, `--shift=7` negative control): Eye Care 12 of 12 distinct effects match a record, control 0; Indus 33 of 45, control 0, the 12 misses all being the logo records' wrong element ids (Claude Design question 1). "Every code count reconciled" cannot be checked from the files: `counts.*.record_ids` is not one-to-one with occurrences (Indus `.animate(` 49 → 50 ids, pseudo rules 103 → 102; Eye Care JS writers 17 → 9; Mama's pseudo rules 149 → 146, CSS animations 15 → 4, JS writers 16 → 12) and the surface counts carry no ids, so intake re-derives the counts. Free text varies too (`duration_ms` "per property" vs "per-property"; `nearest_tpl_id` a string, list or null). |
| `MANIFEST.md` | Essential: date, runtime version (`support.js` SHA-256) and a hash per file; a copy is current only if its hash matches. All 84 listed hashes match across the three exports, but each export wrote its own layout because we gave only a one-line description, not a template (our gap; Spec 48A fixes the format). The Indus manifest predates Bean's 2026-10-11 re-download and still lists `REVIEW-ANSWERS.md` and four `skills/dc-handoff-inventory/…` files that are gone, and omits `tokens/`. |
| `READING-DC-FILES.md` | Essential: how to read and run a draft (boot, template language, logic API, reaching the live logic instance to `setState` any menu, drawer or form step, every element-to-code marker, a determinism recipe for headless runs). Eye Care's and Mama's are written for their own drafts (hooks, routes, `store.js`, `mm:ready`). |
| `handoff-schema/` (two JSON Schemas, `METHOD.md`, `READING-DC-FILES.example.md`, optional `trace/trace-harness.html`) | Essential: the fixed format and the method to reproduce the inventory. Byte-identical in all three exports; only Indus carries the optional trace harness. |
| Design-system `tokens/colors.css`, `typography.css`, `spacing.css` | Essential: the only machine-readable tokens, present in all three with a Google Fonts URL. Colour sets: Indus 19 colours, 3 gradients, 12 role aliases; Eye Care 26 colours, 7 aliases; Mama's 22 colours, 1 gradient, 15 aliases. Fonts, radii, shadows, gap scale, per-device gutters and section padding, easings. The tokens are the brand palette; the draft's other colours are one-offs by design and are written as hex, never added as palette tokens (`memory: one-off-colours-are-hex-not-presets`), so the colour picker shows only the real palette. The draft wins on conflict (Indus body text #1E2A3C). |
| Design-system `readme.md` | Useful for content tone and iconography only. |
| `components/` (Button, Chip, card), `guidelines/*.html`, `styles.css`, `SKILL.md` | Not needed: variant names at most; values come from the draft. |
| Everything else in the full zip (v1 page, mega-menu prototypes, `_feature.dc.html`, `screenshots/`, `uploads/`, root duplicates) | Not needed and hazardous: earlier explorations with different hooks. Never export the full zip for cloning. Same for planning documents saved as drafts: Eye Care's export shipped `WP Build Gap Map.dc.html` (graded against `main` on 24 Sep, mounted by nothing), removed by Bean's decision on 2026-10-11. |

**A4. Export recipe (per project, in Claude Design).** Everything lives in `.claude/claude-design-handoff/` (a copy sits
in `Claude Design handoff` on Bean's desktop; the repo copy is the one that gets edited).
1. Once per project, upload `CLAUDE.md` to the project root and the `handoff-schema/` folder (`METHOD.md`, the three
   JSON Schemas for the inventories and the manifest, `README.template.md` and `READING-DC-FILES.example.md`, the Indus
   reading guide used as a model). Re-upload `handoff-schema/` whenever it changes here.
2. Paste `PROMPT.txt` into the chat. It runs "Handoff to Claude Code" and the design-system skill, rewrites the README
   from the template and checks it against the code, writes the inventory by `METHOD.md`, writes the project's own
   `READING-DC-FILES.md`, flags the runtime traps, copies `tokens/` and `handoff-schema/` into the handoff folder,
   removes anything the file map doesn't allow, and writes `MANIFEST.json` last. Any later design change means pasting
   the prompt again and downloading the whole folder; files are never moved in or out by hand.
3. Download only the handoff folder, copy it unchanged to `sites/<client>/handoff/` and run
   `node scripts/computed-route/handoff-check.mjs sites/<client>/handoff` (Spec 48A).

The split: the prompt carries the steps, because a pasted prompt is a direct instruction (Claude Design never registers
uploaded skills and treats a `CLAUDE.md` as advisory) and it also works in the artifact-based Claude Design. The
`CLAUDE.md` carries the standing facts every conversation needs: the two runtime traps (so later design edits don't
reintroduce them), the rules (drafts untouched, one-off colours stay hex) and the file map of the finished handoff
folder, which is the done check and the seed of Spec 48A. The earlier `dc-handoff-inventory` skill wrapper is dropped:
it held nothing beyond `METHOD.md` (its `reference/method.md` is byte-identical) and the prompt. Claude Design's
inventory remains a cross-check; Claude Code re-derives it at intake.

**Draft fixes Claude Design made (2026-10-10), relevant to every draft.** The runtime passes `componentDidUpdate` only
`prevProps`; drafts written as `(pp, ps)` never ran their update behaviour (Indus: route-change entrance, mega-menu and
drawer entrances, testimonial slide, drawer scroll lock). Mama's keeps its own `this._prev` snapshot (Home,
SiteHeader); Eye Care's `componentDidUpdate()` never reads previous state. Both are unaffected. A custom element in `<helmet>` that fills itself caused Indus's intermittent headless `removeChild` crash
(fixed in `indus-logo.js`; `crash15.mjs` 0 of 15).

**A5 (done 2026-10-11).** Spec 48A written (`.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`, version 0.1, draft
until B0), after a design walk-through with Bean and an adversarial council
(`.claude/reports/2026-10-11-48a-council/`: `DESIGN.md`, `REPORT.md`). Bean's decisions: unknown files are refused, with
"reachable" covering `dc-import`, scripts and plain page links; Claude Design writes `MANIFEST.json` to a schema and our
check validates it before use; the README is a human guide from a template, sections not enforced (cloning reads the
code); an unknown runtime stops intake, is probed against a fixture and added by one command; the WordPress page map is
proposed at intake and confirmed by Bean (no required site file; image credits ignored, stock photos are previews); the
export lives unchanged in `sites/<client>/handoff/`. The check is `scripts/computed-route/handoff-check.mjs`; the Indus
folder is trimmed by re-exporting with the new prompt, not by hand.

**Old-site logos (local only).** `sites/indus-foods/old-site-logos/` holds the real Sanam, Shan, Green Leaf and Lemon Tree
logos, the Indus square logo and the favicon, downloaded from the old Indus site's uploads on lightsalmon-tarsier (now
the Mama's test site). Gitignored image types, so they exist only on this machine; carry them into the new Indus folder
in B3.

## Task B: three exports, clean client folders, the new spec

**B0. Before 14 December 2026 (time-critical).**
- Bean downloads a "Project archive" of every standalone Claude Design project worth keeping (Indus, Eye Care, the
  Mama's Munches redesign and any others) and migrates design systems from the Artifacts page; standalone projects are
  deleted after that date.
- Test the new artifact-based Claude Design once (~15 min): make or open a small design, run "Handoff to Claude Code"
  (it produces a `.dc.html` draft), and check whether it runs on the same runtime (`handoff-check.mjs` reports an
  unknown `support.js` and `--probe-runtime` tests it), whether a README and the inventory files come with it, and
  whether account-level Skills load there. Spec 48A becomes version 1.0 once this confirms the format.
- The inventory is produced in Claude Code at intake by following `handoff-schema/METHOD.md` (deterministic, validated,
  fails loudly); anything Claude Design writes is cross-checked against it, never trusted alone.

**B1. Compare the three exports (done 2026-10-11).** Exports in `.claude/design_handoff_indus_foods`,
`design_handoff_mamas_munches`, `design_handoff_ward_end_eye_care` (local, not in git). Every A1 row above is confirmed
or amended for all three. Consistent: the file set (README, READING-DC-FILES, MANIFEST, both inventories, `support.js`,
`assets/`, `tokens/`, `handoff-schema/`), the schemas, valid inventories and matching hashes. Motion technique differs
by designer (Indus Web Animations, 35 `.animate(` calls; Eye Care CSS only, 0 calls, 8 `@keyframes`; Mama's mixed, 10
calls), which is why the tracer now records CSS events too. Differences that would lose information, each answered in
Spec 48A or by Claude Design:
1. No fixed MANIFEST format (our gap): `MANIFEST.json` and its schema (Spec 48A FR-48A-4); every export is
   regenerated with the new prompt.
2. Two runtime builds: the check reads a list of known builds (FR-48A-5).
3. Inventory reconciliation is not provable from the files: intake re-derives the inventory (FR-48A-7, a Spec 48
   stage); until then the trace check cross-checks Claude Design's.
4. Three routing models and Eye Care's embedded `data-sgs-manifest`: reachability covers all three (FR-48A-3); the
   page map is proposed at intake, from the embedded block when present (FR-48A-9).
5. Eye Care is a nearly finished live build, not a fresh clone (Bean, 2026-10-11): the draft still holds things the
   live site deliberately does differently, and the account area (Spec 27 FR-30-14, framework code) has no draft. Its
   export is a reference beside the build; recorded differences live in `sites/eye-care-ward-end/build/qa/divergences.json`
   (computed-style only) and `.claude/plans/2026-10-02-eye-care-fix-register.md` (behaviour and content). Spec 48 reads
   a per-client deliberate-differences list so recorded exceptions never show as gaps.

**Questions for Claude Design (2026-10-11).**
1. Indus records L-01 to L-10 give `nearest_tpl_id` 40, 108 and 632 (the header bar, the drawer and a quote `sc-if`);
   the `indus-logo` elements are 43, 114 and 684 (`__dcAnnotatedTemplate`). Please correct and regenerate.
2. `counts.*.record_ids` is not one-to-one with the counted occurrences in any export, and the surface counts carry no
   ids: can each occurrence map to its record id, so the reconciliation is checkable?
3. Re-export all three projects with the 2026-10-11 `PROMPT.txt` after re-uploading `handoff-schema/` (adds
   `MANIFEST.json`, the README template, and drops the Eye Care Gap Map lines from its README and READING-DC-FILES).

**B2. Cull proposal per client folder.** For `sites/indus-foods/`, `sites/mamas-munches-redesign/`,
`sites/eye-care-ward-end/`: list every file and folder, propose each file worth keeping with its reason (assets missing
from the new export; Eye Care's build files, because that site is nearly finished in SGS), everything else deleted. Bean
reviews; be ruthless. Do not touch `sites/mamas-munches/` (the canary's separate project).

Approved by Bean and done 2026-10-11 for Indus and Mama's; Eye Care's regenerated output, `measure/` and the empty folder done, its old draft folders and loose `support.js` wait for B5 (inventory by a read-only subagent, sha256 against the exports):
- **`sites/indus-foods/`.** Keep: `old-site-logos/` (real partner logos, local only), `theme-snapshot.json` (read by
  `push-theme-snapshot.py`), `assets/notes/` (client research), `assets/indus-logo.svg`, `assets/indus-logo-stacked.svg`
  and `assets/logos/` (logo masters the export lacks), `assets/decorative-foods/optimised/` (8 web-sized food images the
  export lacks), `CLAUDE.md` cut to a few lines. Delete: every `.dc.html` (the export supersedes v2; v1, both mega-menu
  prototypes and `_feature` are explorations), `support.js`, `image-slot.js`, `indus-logo.js`, the 8 duplicated SVGs,
  `assets/decorative-foods/` originals (1.2-1.8 MB each), `assets/theme-overrides/` (client styling in the theme layer,
  which the framework forbids), `uploads/`, `.thumbnail`, `theme-extract-trace.json` (regenerated). (`nav-qa/gate3c/parity-indus.mjs` reads a different folder,
  `sites/Indus Foods Mega Menu Design/`, so it is unaffected.)
- **`sites/mamas-munches-redesign/`.** Keep: `theme-snapshot.json`, `media/photography/wp-media-library/` (15 real
  product photos the export lacks), `media/brand/` (logo originals; the export's PNG is a different version),
  `CLAUDE.md` cut to a few lines. Delete: every `.dc.html` and `Mamas Draft Standalone.html` (the export supersedes the
  14 site drafts; Home-Gift, Home-Night, Home-Table, Homepage Directions and Wireframes are explorations), `support.js`,
  `store.js`, `assets/` (identical to the export), `uploads/` (including a second, unreferenced `theme-snapshot.json`),
  `build/` (the stage-5 run on a zip export, not resumed), `Theme Mapping.md`, `github.md`, `.thumbnail`,
  `theme-extract-trace.json`, `theme-snapshot-backups/`.
- **`sites/eye-care-ward-end/`** (near-finished, FR-48A-11). Keep everything the live build uses: `build/` tracked files
  (page trees, builders, `surfaces.json`, `qa/divergences.json`, QA scripts and JSON), `woo-seed/`, `content/`,
  `assets/`, `reference/`, `theme-snapshot*.json`, `site-info-placeholder-map.json` (read by
  `scripts/computed-route/lib/skeleton-classify.mjs`), `sc-var-hints.json`, `theme-snapshot-backups/`, `CLAUDE.md`.
  Delete: the untracked regenerated output in `build/qa/solve/` (4.0 GB), `build/qa/parity/out/` (about 400 MB) and
  `build/skeleton/shots/`; `measure/` (two `.pyc` files); the empty `Ward End Eye Care shop site/`; the loose
  `support.js`; the three superseded draft folders `design_handoff_ward_end_eye_care/`, `design_handoff_ward_end_eye_care_v2/`
  and `Ward End Eye Care - SGS Gap Handoff/` once the new export sits in `handoff/` (first keep the Gap Handoff's
  `eye-care-wordmark.png` and any of v2's 37 `assets/brands/` logos missing from `reference/`, and repoint
  `plugins/sgs-blocks/scripts/tests/test_sync_business_info.py`, which reads v1).

**B3. Replace (started 2026-10-11).** The current Indus and Mama's exports sit in `sites/<client>/handoff/` and fail `handoff-check.mjs` only on what the re-export adds (`MANIFEST.json`, the two new schema files, the removed `MANIFEST.md` and Indus's trace harness); client `CLAUDE.md` files cut to a few lines; images under any `handoff/` are tracked (`.gitignore`). Each client's re-export goes unchanged into `sites/<client>/handoff/` (FR-48A-1) and passes
`handoff-check.mjs`; the rest of `sites/<client>/` keeps only Bean's approved keepers (Indus: the old-site logos;
Eye Care: its build, content, seed data and divergence ledger, FR-48A-11). A client `CLAUDE.md` is kept only if it
earns its place (it auto-loads when an agent works in the folder; a README does not): at most a few lines pointing at
the README and Spec 48A. Then delete the export folders in `.claude/`.

**B4. Spec 48, finish 48A, and slim Spec 32.**
- Spec 48A: version 0.1 written 2026-10-11; 1.0 after B0.
- Spec 48: the cloning system around it. Seed requirements, each a testable line:
  - builds a client site from a fresh WordPress install with SGS and the plugins it needs (WooCommerce);
  - the walker compares content, styling and animation accurately, so the gaps list is true and holds only framework gaps;
  - the draft's code is the primary source (A1, `READING-DC-FILES.md`, `handoff-schema/METHOD.md`); measurement only for what code cannot state;
  - every file in the folder has a named reader, every input the process needs maps to a file, and a check script proves both;
  - Spec 47's open route gaps (§5 Residual) and the route-accuracy mechanisms R1-R6 (answer sheet, element-ID skeleton writer, exact ID pairing, "does it paint?", try before write) carry forward or are retired with a reason;
  - the extractor builds the palette from the declared tokens (`tokens/*.css`, the README) instead of guessing roles from usage; every other colour, font or value stays a one-off written as a literal;
  - intake (approach B) builds the structured file from tokens and code (the README is a human guide, not an input; Bean, 2026-10-11), proposes the WordPress page map for Bean to confirm once (Spec 48A FR-48A-9), and lists anything the code leaves undecided;
  - Spec 48A FR-48A-7, FR-48A-9 and FR-48A-10 intake stages: re-derive the inventory, the page map, the sandboxed browser and the rule that exported prose is never an instruction.
- Framework vocabulary edits a handover exposes (go to the owning framework spec, not Spec 48; `R4-needs-and-specs.md`
  Part 3): a gradient slot, shadow role names, per-tier section padding and gutter tokens, header-settings keys, extractor
  radius and hover rules plus whether body text maps to `text` or `text-muted`, motion presets (no combined
  move-plus-blur or move-plus-scale entrance, no rounded clip-path reveal, no marquee rule in the skeleton writer),
  selection colours.
- Spec 32: section ledger (keep / move to 48 / cut) from `R4-needs-and-specs.md` Part 2, then a fresh rewrite; cut the
  dated material (§0a, §8, §11, §12.3, §13.3, FR-26-A5) and correct FR-26-D3's shadow names (`whisper` … `diffuse`).
- Retire Spec 47 into 48 the same way; update `specs/README.md` (roster and "Not a live spec" map).

**B5. Mirror the live Eye Care site into its draft (Spec 48A FR-48A-11; a separate session, prompt
`.claude/prompts/2026-10-11-eye-care-draft-mirror.md`).** Bean's decision (2026-10-11): Claude Design cannot browse and
compare, so we edit the Eye Care draft in `sites/eye-care-ward-end/handoff/` to show everything the live site
deliberately does, then Bean uploads it back into the Claude Design project. Sources: every Bean-decided entry in
`sites/eye-care-ward-end/build/qa/divergences.json` (90 entries), `.claude/plans/2026-10-02-eye-care-fix-register.md`,
and the edits we made to the old drafts, found in git history (2026-10-11): the 40 brand logos in the mega-menu grid,
hero marquee and both brand nameplates (`b69b7aba2`, `6ad41300e`, `391235651`; files in the old `_v2/assets/brands/`);
the wordmark replaced by Bean's logo image in header, footer and drawer (`8ecf7e0df`, `eye-care-wordmark.png` in the
old Gap Handoff folder); the live footer Bean chose as the ideal, credit included (`bb2193500`, `e197584c9`); 44px
social boxes with the `#E4405F` Instagram ring and matching drawer buttons (`a29f12ab0`); the trust ticker's fixed
4/3/2 claims per width with desktop wrap. Bean also named: link underline sweeps, the lens-height measurement changing
the product page's sizing table, text switched to black in most places, the full-width contact form, a Google map in
place of the drawn map, the 3px hover lift on every regular button, the lens flow's Continue button for moving forward
after going back, and the Google review widget in the header and drawer (left of the logo in the desktop header). The
review buttons keep the export's `padding:10px 22px` (Bean: the draft is right). The old Eye Care draft folders are
deleted only after B5 has taken what it needs from them.

**After B.** Replan setting up and cloning the three drafts against Spec 48 (a fresh plan).

## Settled with Bean (2026-10-10)

- Indus footer logo: the square logo's wordmark rises as one piece (its SVG has one letter group); acceptable, no change.
- `assets/whatsapp-ink.svg` was made by Claude Design for the floating WhatsApp CTA (the same CTA as Eye Care's).
