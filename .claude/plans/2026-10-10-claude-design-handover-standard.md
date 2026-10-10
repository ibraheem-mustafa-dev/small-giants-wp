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

**Bean's decisions (2026-10-10).**
- A draft is exported with Claude Design's "Handoff to Claude Code" skill and its design-system skill in one prompt, never
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

**A1-A3. Verdict per file** (verified in the main thread; Claude Design's corrections applied).

| Source | Verdict |
|---|---|
| Handoff `README.md` | Essential human guide: routes, global layout, breakpoints, state, animations, business details, assets, open items. Prose bullets: `theme-extractor/declared_sources.py::read_readme_tokens` returns `{"found": false}` on it. Claude Design corrected its footer, block types, forms and assets on 2026-10-10. |
| `<draft>.dc.html` (v2) | The source of truth: template (inline styles, `style-hover`, `style-focus`) and the `DCLogic` class (`state`, `pages` with 29 routes, `renderVals()` responsive values, motion code). |
| Form DCs (`TradeApplication`, `EnquiryForm`) | Essential: the only form definitions (steps, fields, conditions, validation). |
| `support.js` (runtime), `image-slot.js`, `indus-logo.js`, `assets/` | Essential to run. `indus-logo.js` loads only the `-anim.svg` logos; the static `logo-*.svg` pair is unused. |
| `animations.json`, `surfaces.json` | Essential: written by Claude Design's `dc-handoff-inventory` skill from the code. Indus: 183 animation records, 60 surface records, 0 schema errors, every code count reconciled, and 43 of 43 traced home animations match a record (negative control 0 of 43; `.claude/reports/2026-10-10-handover-council/trace-check.mjs`). |
| `MANIFEST.md` | Essential: date, runtime version (`support.js` SHA-256) and a hash per file; a copy is current only if its hash matches. |
| `READING-DC-FILES.md` | Essential: how to read and run a draft (boot, template language, logic API, reaching the live logic instance to `setState` any menu, drawer or form step, every element-to-code marker, a determinism recipe for headless runs). |
| `handoff-schema/` (two JSON Schemas, `METHOD.md`, `trace/trace-harness.html`) and `dc-handoff-inventory/` (the skill) | Essential: the fixed format and the method to reproduce the inventory. |
| Design-system `tokens/colors.css`, `typography.css`, `spacing.css` | Essential: the only machine-readable tokens (34 colour properties, fonts with the Google Fonts URL, radii, shadows, gap scale, per-device gutters and section padding, four easings). 33 of the draft's 52 hex values are not tokenised; the draft wins on conflict (body text #1E2A3C). |
| Design-system `readme.md` | Useful for content tone and iconography only. |
| `components/` (Button, Chip, card), `guidelines/*.html`, `styles.css`, `SKILL.md` | Not needed: variant names at most; values come from the draft. |
| Everything else in the full zip (v1 page, mega-menu prototypes, `_feature.dc.html`, `screenshots/`, `uploads/`, root duplicates) | Not needed and hazardous: earlier explorations with different hooks. Never export the full zip for cloning. |

**A4. Export recipe (per project, in Claude Design).**
1. The project has the `dc-handoff-inventory` skill and the project `CLAUDE.md` line that runs it with every handoff
   (Indus has both; copy them into the Eye Care and Mama's Munches redesign projects).
2. One prompt runs "Handoff to Claude Code" and the design-system skill.
3. Download only: the handoff folder (with `animations.json`, `surfaces.json`, `MANIFEST.md`, `READING-DC-FILES.md`),
   the design-system `tokens/`, and `handoff-schema/`.

**Draft fixes Claude Design made (2026-10-10), relevant to every draft.** The runtime passes `componentDidUpdate` only
`prevProps`; drafts written as `(pp, ps)` never ran their update behaviour (Indus: route-change entrance, mega-menu and
drawer entrances, testimonial slide, drawer scroll lock). Eye Care and Mama's keep their own `this._prev` snapshot and are
unaffected. A custom element in `<helmet>` that fills itself caused Indus's intermittent headless `removeChild` crash
(fixed in `indus-logo.js`; `crash15.mjs` 0 of 15).

**A5 (open, after Task B).** Trim the Indus folder to the final architecture and write Spec 48A (what each folder and
file is for, and which tool or step reads it). Waits for B1 so the architecture is not fitted to Indus alone.

**Old-site logos (local only).** `sites/indus-foods/old-site-logos/` holds the real Sanam, Shan, Green Leaf and Lemon Tree
logos, the Indus square logo and the favicon, downloaded from the old Indus site's uploads on lightsalmon-tarsier (now
the Mama's test site). Gitignored image types, so they exist only on this machine; carry them into the new Indus folder
in B3.

## Task B: three exports, clean client folders, the new spec

**B1. Compare the three exports.** Bean exports Eye Care and the Mama's Munches redesign with the A4 recipe into
`.claude/`. Compare equivalent files across Indus, Eye Care and Mama's: README sections, `animations.json` and
`surfaces.json` against the schema and their counts, tokens, MANIFEST, draft structure (Indus: one file with hash routes
and a `pages` getter; Eye Care: one file with a manifest; Mama's: one file per page; hook names and animation techniques
differ per designer: `READING-DC-FILES.md` §7). Output: what is consistent, what differs, and whether any difference
loses information Task A or the cloning process needs. Done when every A1 row is confirmed or amended for all three.

**B2. Cull proposal per client folder.** For `sites/indus-foods/`, `sites/mamas-munches-redesign/`,
`sites/eye-care-ward-end/`: list every file and folder, propose each file worth keeping with its reason (assets missing
from the new export; Eye Care's build files, because that site is nearly finished in SGS), everything else deleted. Bean
reviews; be ruthless. Do not touch `sites/mamas-munches/` (the canary's separate project).

**B3. Replace.** Each `sites/<client>/` becomes the new clean export plus Bean's approved keepers (Indus: the
old-site logos). A client `CLAUDE.md` is kept only if it earns its place (it auto-loads when an agent works in the
folder; a README does not): at most a few lines pointing at the README and Spec 48A. Then delete the export folders in
`.claude/`.

**B4. Spec 48 and 48A, and slim Spec 32.**
- Spec 48A: the handover folder architecture from A1/A5/B1.
- Spec 48: the cloning system around it. Seed requirements, each a testable line:
  - builds a client site from a fresh WordPress install with SGS and the plugins it needs (WooCommerce);
  - the walker compares content, styling and animation accurately, so the gaps list is true and holds only framework gaps;
  - the draft's code is the primary source (A1, `READING-DC-FILES.md`, `handoff-schema/METHOD.md`); measurement only for what code cannot state;
  - every file in the folder has a named reader, every input the process needs maps to a file, and a check script proves both;
  - Spec 47's open route gaps (§5 Residual) and the route-accuracy mechanisms R1-R6 (answer sheet, element-ID skeleton writer, exact ID pairing, "does it paint?", try before write) carry forward or are retired with a reason;
  - the extractor reads declared tokens (`tokens/*.css`, the README) instead of guessing roles from usage;
  - intake (approach B) builds the structured file from README, tokens and code, and lists every README-versus-draft contradiction for Bean.
- Framework vocabulary edits a handover exposes (go to the owning framework spec, not Spec 48; `R4-needs-and-specs.md`
  Part 3): a gradient slot, shadow role names, per-tier section padding and gutter tokens, header-settings keys, extractor
  radius and hover rules plus whether body text maps to `text` or `text-muted`, motion presets (no combined
  move-plus-blur or move-plus-scale entrance, no rounded clip-path reveal, no marquee rule in the skeleton writer),
  selection colours.
- Spec 32: section ledger (keep / move to 48 / cut) from `R4-needs-and-specs.md` Part 2, then a fresh rewrite; cut the
  dated material (§0a, §8, §11, §12.3, §13.3, FR-26-A5) and correct FR-26-D3's shadow names (`whisper` … `diffuse`).
- Retire Spec 47 into 48 the same way; update `specs/README.md` (roster and "Not a live spec" map).

**After B.** Replan setting up and cloning the three drafts against Spec 48 (a fresh plan).

## Open questions for Bean

- Indus footer logo: its wordmark rises as one piece because the square logo SVG has a single letter group (Claude
  Design's `unresolved`). Intended?
- `assets/whatsapp-ink.svg` is not among Bean's uploads in the Indus project: where did it come from?
