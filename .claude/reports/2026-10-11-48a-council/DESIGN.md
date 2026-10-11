# Spec 48A design draft: the Claude Design handover folder (for adversarial review, 2026-10-11)

Status: design draft, not yet a spec. Decisions (a)-(e) and placement were made by Bean on 2026-10-11; the reader map (f)
is proposed and goes to this council before Bean approves it.

## End goal

Small Giants Studio builds client WordPress sites on its own block framework (SGS). Client designs are drafted in
Claude Design (Anthropic's design tool) as `.dc.html` "Design Component" prototypes. The goal: a draft reaches Claude
Code as ONE guaranteed folder of known files, every file with a named reader in our tooling, so a client site can be
built from a fresh WordPress install with Bean (the non-coder owner) acting only as quality control. The cloning system
itself (Spec 48) is rewritten around this folder afterwards. Wrong or missing information in the folder means a wrong
site and hours of manual correction; a folder that cannot be produced reliably by Claude Design is worthless.

## How a draft works (facts verified 2026-10-10/11)

- A `.dc.html` file = a template inside `<x-dc>` (inline styles, `style-hover`/`style-focus` attributes compiled to
  `!important` pseudo rules, `{{ }}` holes, `sc-if`, `sc-for`, `dc-import` to mount sibling drafts) + a logic class
  (`class Component extends DCLogic`: `state`, `renderVals()`, motion code). The runtime `support.js` compiles and
  renders it with React 18 loaded from unpkg (no network = no render). It has no version string; its SHA-256 is the version.
- The runtime stamps every template element `data-dc-tpl="N"` (pre-order), exposes `__dcAnnotatedTemplate(name)`, and
  its own `encodeCase` encoder lets a tool number the template without rendering.
- Drafts differ per designer: routing (hash routes + `pages` getter; `state.page` + `go()`; one file per page with plain
  links), motion (Web Animations; CSS only; mixed), forms (separate drafts or inline), project scripts (`image-slot.js`,
  `indus-logo.js`, `store.js` with localStorage).
- Claude Design's standalone site closes on 14 December 2026; it moves to an artifact template inside Claude chat whose
  "Handoff to Claude Code" also produces a `.dc.html` draft. Whether that uses the same runtime is untested.
- Claude Design never registers uploaded custom skills; a project `CLAUDE.md` is injected but advisory. We drive the
  export with one pasted prompt (`.claude/claude-design-handoff/PROMPT.txt`) plus an uploaded `handoff-schema/` folder.

## Evidence from comparing three real exports (B1, 2026-10-11)

Indus Foods (single file, 29 routes), Eye Care (single file, 11 routes, near-finished live build), Mama's Munches (14
files, 11 pages). All three: same file set; inventories valid against the schema (0 errors); all 84 manifest hashes
match. Found: each export wrote a different MANIFEST layout (we gave no template); two runtime builds in use (the newer
only adds slide-deck handling); `counts.*.record_ids` in the inventories is not one-to-one with counted occurrences, so
"every occurrence reconciled" is not checkable; Indus logo animation records name wrong elements (40/108/632 instead of
43/114/684); free-text drift (`duration_ms` "per property" vs "per-property"; `nearest_tpl_id` string/list/null); Eye
Care shipped an unrelated planning document as a `.dc.html`; README section sets differ. A runtime trace of each
single-file home page matched every traced effect to a record except the 12 wrong-id logo records (negative control 0).

## Decisions

**(a) Files.** REQUIRED: `MANIFEST.json`, `README.md`, the draft `.dc.html` file(s), `support.js`, `assets/`,
`tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `animations.json`, `surfaces.json`,
`READING-DC-FILES.md`, `handoff-schema/` (`METHOD.md`, `animations.schema.json`, `surfaces.schema.json`,
`manifest.schema.json`, `READING-DC-FILES.example.md`). OPTIONAL: project scripts a draft actually loads (helmet
`<script src>` or `x-import from=`), `handoff-schema/trace/`. REFUSED: anything else, including a `.dc.html` that no
entry draft mounts. The intake check fails and names the file.

**(b) Manifest.** `MANIFEST.json` validated by `handoff-schema/manifest.schema.json`: generated date, project name,
entry draft(s), runtime SHA-256, and per file `{path, bytes, sha256}` for every file except itself.

**(c) README.** Sixteen required `##` sections in order: Overview, Files, Fidelity, Routes, Breakpoints, Global layout,
Pages, Forms, State, Animations and interactions, Business details, Design tokens, Assets, Judgement calls, Open items,
Revision ("None" allowed). No section mapping the design to SGS blocks: block choice is ours, from the code. A missing
section fails the check.

**(d) Runtime.** A known-runtimes list in our tooling. An unknown `support.js` hash triggers an automatic probe
(`encodeCase` and `__dcAnnotatedTemplate` exist, `data-dc-tpl` stamping works, the trace check passes); a pass adds it
to the list with a note, a fail stops intake.

**(e) Inventory.** Our intake step re-derives the inventory from the code by `METHOD.md` (deterministic, validated,
fails loudly); Claude Design's `animations.json` and `surfaces.json` are a cross-check, never trusted alone.

**Placement.** The export is copied byte for byte into `sites/<client>/handoff/` and never edited there, so its manifest
always verifies; a new export replaces `handoff/` wholesale. Our own work stays outside it (`build/`, which already has
an unrelated `build/surfaces.json` mapping surfaces to WordPress posts; `theme-snapshot.json`; a per-client
deliberate-differences list for near-finished sites such as Eye Care, read by the walker so recorded exceptions never
show as gaps).

## (f) Proposed reader map (under review)

| File | Reader | Exists today? |
|---|---|---|
| `MANIFEST.json` | intake check: folder complete, hashes match, no unknown files | no (48A check script) |
| `support.js` | runtime probe; `scripts/computed-route/lib/draft.mjs::serveDraft` serves the draft | probe no, serve yes |
| draft `.dc.html` | intake decodes template and logic (`METHOD.md`); walker and skeleton writer render and measure only what code cannot state (`clamp()`/`vw` values, grid tracks, font metrics, image-slot shadow DOM) | intake no, walker yes |
| project scripts, `assets/` | the runtime while serving; intake adds `assets/` to the media upload list | partly |
| `tokens/*.css` | theme extractor builds the palette from declared tokens; every other colour stays a one-off hex literal | no (Spec 48) |
| `README.md` | intake: required sections present; reads routes, forms, business details, open items into a structured file Bean confirms once; lists README-versus-draft contradictions | no (today `declared_sources.py::read_readme_tokens` finds nothing in it) |
| `animations.json`, `surfaces.json` | intake cross-check against its own re-derived inventory; `trace-check.mjs` runtime check | tracer yes, intake no |
| `READING-DC-FILES.md` | agents working on the draft | n/a |
| `handoff-schema/` | intake validates the inventories and the manifest | no |

A 48A check script will prove: every required file present, no unknown file, every file listed in 48A has a named
reader, with a negative control (a folder missing a required file must fail).

## Known open points

- The artifact-based Claude Design is untested (plan task B0).
- Eye Care's draft embeds a machine-readable `<script type="application/json" data-sgs-manifest>` (pages to WordPress
  slugs, overlays, sections, open items) that the other two do not have; 48A does not yet say whether to require it.
- Indus and Eye Care manifests must be regenerated with the new format.
