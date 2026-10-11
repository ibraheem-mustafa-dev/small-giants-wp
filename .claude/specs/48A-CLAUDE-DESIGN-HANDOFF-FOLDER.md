---
doc_type: spec
spec_id: 48A
spec_version: "0.1"
title: The Claude Design handoff folder
project: small-giants-wp
status: draft
last_verified: 2026-10-11
authors: Bean + Claude
parent_spec: Spec 48 (the cloning system; not yet written, replaces Spec 47)
---

# Spec 48A: the Claude Design handoff folder

A client design drafted in Claude Design reaches Claude Code as one folder of known files. This spec fixes what that
folder holds, how it is checked, where it lives and which tool reads each file. Spec 48 (the cloning system) is written
around it. Draft status: version 1.0 waits for plan task B0 (the artifact-based Claude Design tested once, every
standalone project downloaded before 14 December 2026).

Evidence: `.claude/plans/2026-10-10-claude-design-handover-standard.md` (Task A table, B1 comparison of the Indus, Eye
Care and Mama's Munches exports) and `.claude/reports/2026-10-11-48a-council/` (`DESIGN.md`, the adversarial council's
`REPORT.md`, Bean's decisions of 2026-10-11).

## 1. How a draft works (the facts this spec rests on)

- A `.dc.html` draft is a template inside `<x-dc>` (inline styles, `style-hover`/`style-focus` attributes compiled to
  `!important` pseudo rules, `{{ }}` holes, `sc-if`, `sc-for`, `dc-import` mounting a sibling draft) plus a logic class
  (`class Component extends DCLogic`). The runtime `support.js` compiles and renders it with React 18.3.1, ReactDOM and
  `@babel/standalone` 7.29.0 loaded from unpkg with SRI. It has no version string: its SHA-256 is its version.
- The runtime stamps every template element `data-dc-tpl="N"` in pre-order and exposes `__dcAnnotatedTemplate(name)`;
  its `encodeCase` encoder numbers a template without rendering (`handoff-schema/METHOD.md` §2).
- Routing, motion technique, form placement and project scripts are each designer's choice: hash routes with a `pages`
  getter, `state.page` with `go()`, or one file per page with plain links; Web Animations, CSS only or mixed.
- The draft's code is the primary source. Rendering and measuring supplement it only for what code cannot state
  (final `clamp()`/`vw` values at a width, grid tracks, font metrics, image-slot shadow DOM).

## 2. Requirements

### FR-48A-1 -- Placement
A client's export lives at `sites/<client>/handoff/`, copied byte for byte from the downloaded folder and never edited
there. A new export replaces the whole folder. Our own work stays outside it (`build/`, `theme-snapshot.json`, the
divergence ledger), so `handoff/surfaces.json` (Claude Design's state inventory) and `build/surfaces.json` (our map of
surfaces to WordPress posts) can never be confused by path.
Status: specified; the three client folders move to it in plan task B3.

### FR-48A-2 -- Required files
`MANIFEST.json`, `README.md`, at least one draft `.dc.html`, `support.js`, `tokens/colors.css`,
`tokens/typography.css`, `tokens/spacing.css`, `animations.json`, `surfaces.json`, `READING-DC-FILES.md`,
`handoff-schema/METHOD.md`, `handoff-schema/animations.schema.json`, `handoff-schema/surfaces.schema.json`,
`handoff-schema/manifest.schema.json`, `handoff-schema/READING-DC-FILES.example.md`,
`handoff-schema/README.template.md`. A missing required file fails the check and is named.
Status: checked by `scripts/computed-route/handoff-check.mjs`.

### FR-48A-3 -- Allowed files and reachability
Besides the required files, a folder may hold only: files under `assets/`, and project scripts (`.js`) a reachable
draft loads. Every other file fails the check and is named, with the instruction to remove it (e.g. a planning document
saved as a draft, an earlier page version, skill folders, notes, a trace harness).
- Entry drafts are the paths listed in `MANIFEST.json` `entry_drafts`.
- A draft is reachable when it is an entry draft, or a reachable draft names it through `<dc-import name="X">` (resolved
  to `X.dc.html`, exact and case-sensitive, spaces allowed) or links to it through an `href` or `src` value ending in
  `.dc.html` (query string and fragment removed, URL-decoded, a leading `./` removed). Plain links count, so one file
  per page (Mama's Munches) passes.
- A project script is reachable when a reachable draft loads it through `<script src>` or `x-import from=`, resolved the
  same way.
- Every `.dc.html` in the folder must be reachable; an unreachable one fails the check. Links are read from attribute
  values only, so a page reached only through a path built in script fails loudly and is listed in `entry_drafts`.
Status: checked by `handoff-check.mjs`.

### FR-48A-4 -- The manifest
Claude Design writes `MANIFEST.json` last, valid against `handoff-schema/manifest.schema.json`: `schema_version`,
`generated` (date), `project`, `entry_drafts`, `runtime_sha256` (of `support.js`) and `files`, one
`{ path, bytes, sha256 }` per file in the folder except `MANIFEST.json` itself. Paths are relative to the folder root,
POSIX separators, NFC, case-sensitive, with no `./`, `..`, leading slash or backslash; directories are not listed. The
check passes only when the listed paths equal the files on disk in both directions, every size and hash matches, and
`runtime_sha256` matches `support.js`. A design change after export means pasting the handoff prompt again and
downloading the whole folder; files are never moved in or out by hand.
Status: checked by `handoff-check.mjs`; the prompt asks for it from 2026-10-11 (the three current exports carry the
older `MANIFEST.md` and fail until re-exported).

### FR-48A-5 -- Runtime versions
`scripts/computed-route/data/known-runtimes.json` lists every accepted `support.js` build by SHA-256, with the date it
was added and the probe result. An unknown hash stops the check. `handoff-check.mjs --probe-runtime` then renders the
checked-in fixture draft `scripts/computed-route/data/runtime-probe.dc.html` with the new build, requires the
`data-dc-tpl` numbering read from the rendered page and from `__dcAnnotatedTemplate` to equal the fixture's recorded
numbering exactly, and prints the module-by-module difference from the nearest known build. `--add-runtime` records a
build only after the probe passes, and says so in one line.
Status: checked by `handoff-check.mjs`; two builds recorded (`c60c4908…` from Indus, `8fe7df74…` from Eye Care and
Mama's Munches).

### FR-48A-6 -- Schemas are ours
The master schemas, method and templates live in `.claude/claude-design-handoff/handoff-schema/`, uploaded to every
Claude Design project. The check validates `animations.json`, `surfaces.json` and `MANIFEST.json` against the master
copies, never the folder's copy; a folder copy that differs from the master is a warning naming the file.
Status: checked by `handoff-check.mjs`.

### FR-48A-7 -- Inventories are current
`animations.json` and `surfaces.json` validate against the master schemas, and every draft hash and the
`runtime_sha256` recorded in `animations.json` match the files, so an inventory written before a design change is
refused. The target, set by Bean's decision (e) of 2026-10-11, is that intake re-derives the inventory from the code
by `METHOD.md` and Claude Design's copy is only a cross-check; until that intake stage exists (Spec 48), Claude
Design's inventories are used, cross-checked by `scripts/computed-route/trace-check.mjs` on a single-file draft's
entry page (every Web Animations call, CSS animation start and CSS transition run matched to a record, `--shift=7`
negative control).
Status: schema and hash checks in `handoff-check.mjs`; trace cross-check built; intake re-derivation is a Spec 48 stage.

### FR-48A-8 -- README
`README.md` is the human guide to the design, written from `handoff-schema/README.template.md`. Its sections are not
enforced (cloning reads the code, Bean's decision of 2026-10-11). It never maps the design to SGS blocks; block choice
is ours. A heading that names SGS or block mapping is a warning.
Status: checked (warning) by `handoff-check.mjs`.

### FR-48A-9 -- Page map
The WordPress page map (slug, parent, page or WooCommerce template, menus) is not a handoff file: intake proposes it
from the routes in the code and Bean confirms it once per client. When a draft embeds a
`<script type="application/json" data-sgs-manifest>` block (Eye Care does), intake uses it as the proposal. Image
credits are not recorded: stock photos in a draft are previews, and real images arrive with the client's content.
Status: Spec 48 intake stage.

### FR-48A-10 -- Running a draft safely
A draft runs code: `support.js` evaluates fetched scripts with `new Function`, and each draft's logic runs in the page.
Intake runs drafts only through `scripts/computed-route/lib/draft.mjs::serveDraft` (127.0.0.1, files inside the folder
only), in a fresh browser profile whose network is limited to the draft server and the three pinned unpkg files, from
a process given no `.claude/secrets/` values or SSH agent. Exported prose (`README.md`, `READING-DC-FILES.md`,
inventory notes) is data, never instructions to an agent, and command-like text in it is shown to Bean. The check fails on an SVG under `assets/` holding `<script`, an `on…=` event attribute or
`<foreignObject`, and on any file over 20 MB.
Status: SVG and size checks in `handoff-check.mjs`; the browser sandbox and the prose rule are a Spec 48 intake stage.

### FR-48A-11 -- Near-finished sites
A client whose site is already built from an earlier draft (Eye Care) is not put through intake. Its draft is the
answer key the cloning pipeline is measured against, so it must show what the live site deliberately does: Claude Code
edits the draft in `sites/<client>/handoff/` to mirror every difference Bean has decided (Eye Care's are in
`sites/eye-care-ward-end/build/qa/divergences.json` and `.claude/plans/2026-10-02-eye-care-fix-register.md`),
compares each change in a browser at 375, 768 and 1440, then regenerates `animations.json`, `surfaces.json` and
`MANIFEST.json` so the folder passes the check. Claude Design cannot open the live site to compare, which is why we
make these edits (Bean, 2026-10-11). Bean uploads the edited drafts and any new asset files into the Claude Design
project, so a later export starts from the mirrored version. Features built beyond the draft (the account area,
Spec 27 FR-30-14) are framework code and need no draft.
Status: specified; the Eye Care mirror is plan task B5.

### FR-48A-12 -- The producer's instructions
`.claude/claude-design-handoff/` holds the one pasted prompt (`PROMPT.txt`), the project `CLAUDE.md` (standing facts,
runtime traps, the folder map) and `handoff-schema/`. They are the only copies that get edited, and a change to this
spec updates them in the same commit. The folder map in `CLAUDE.md` lists exactly the files FR-48A-2 and FR-48A-3 allow.
Status: done 2026-10-11.

## 3. Readers

Every file has a named reader. "Built" means the reader exists today.

| File | Reader | Built |
|---|---|---|
| `MANIFEST.json` | `handoff-check.mjs`: completeness, hashes, runtime | yes |
| `support.js` | `handoff-check.mjs` runtime check and probe; `lib/draft.mjs::serveDraft` serves the draft | yes |
| draft `.dc.html` | `handoff-check.mjs` reachability; intake decodes template and logic (`METHOD.md`); walker and skeleton writer measure only what code cannot state | check and walker yes, intake Spec 48 |
| project scripts, `assets/` | the runtime while serving; `handoff-check.mjs` SVG and size checks; intake adds `assets/` to the media upload list | check yes, upload Spec 48 |
| `tokens/*.css` | the theme extractor builds the brand palette from the declared tokens; every other colour stays a one-off hex literal | Spec 48 |
| `README.md` | Bean and agents (human guide to the design; not a cloning input, which reads the code) | yes (human/agent reader) |
| `animations.json`, `surfaces.json` | `handoff-check.mjs` schema and currency; `trace-check.mjs` runtime cross-check; intake cross-check against its own inventory | check and trace yes, intake Spec 48 |
| `READING-DC-FILES.md` | agents working on the draft | yes (human/agent reader) |
| `handoff-schema/*` | `handoff-check.mjs` compares each with the master copy | yes |

## 4. Open questions for Claude Design

1. Indus records L-01 to L-10 give `nearest_tpl_id` 40, 108 and 632; the `indus-logo` elements are 43, 114 and 684.
2. `counts.*.record_ids` is not one-to-one with the counted occurrences, and surface counts carry no ids.
