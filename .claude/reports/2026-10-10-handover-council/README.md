# Handover council, 2026-10-10 (dated research record)

Six reviewers read the full Indus Foods Claude Design export (`.claude/Indus-Foods-Claude-Design-Files/`, local, not in git)
for the Claude Design handover standard (`.claude/plans/2026-10-10-claude-design-handover-standard.md`). The plan holds the
verified conclusions; these ledgers are the evidence behind them.

| File | Slice |
|---|---|
| `R1-handoff.md` | the `design_handoff_indus_foods_website/` folder, file by file, and the README fact catalogue |
| `R2-design-system.md` | the design-system skill's files (`tokens/`, `guidelines/`, `components/`, `styles.css`, `readme.md`, `SKILL.md`) |
| `R3-project-files.md` | every other file in the zip, and the full-zip verdict |
| `R4-needs-and-specs.md` | what Spec 47's tools read from a draft today; Spec 32 sections classified framework / format / cloning / fat; the framework vocabulary vs Indus's declared tokens. `r4-cites-byfile.txt`: every file citing Spec 32, FR-32 or FR-33 |
| `R5-eyecare-gaps.md` | 29 recorded Eye Care cloning problems, each judged against reading the draft source and against a Claude Design export change |
| `R6-dc-format.md` | the `.dc.html` format, what is readable without rendering, why Spec 47 rule R-47-4 exists, our animation tooling |
| `crash15.mjs` | `node crash15.mjs <handoff folder> 15`: cold headless loads, counts `data-dc-tpl` elements and `removeChild` errors |
| `trace-check.mjs` | `node trace-check.mjs <handoff folder>`: traces home's `animate()` calls at 1440 and matches each to an `animations.json` record |

## Claims in these ledgers that are wrong (corrected after the council)

- R1: "the `-anim.svg` logos are redundant": the reverse. `indus-logo.js` loads only the `-anim.svg` files; `logo-horizontal.svg` and `logo-square.svg` are unused copies.
- R1, R6: "five `style-hover` rules containing `{{ }}` never paint": not observed; Bean sees the hovers work.
- R1, R2: "the About hero SVGs' mesh gradients render flat" is unproven: the files use three mesh gradients each, and the animation works in a browser.
- R2, R4: `tokens/colors.css` holds 34 custom properties (19 colours, 3 gradients, 12 role aliases), not 41.
- R3: the `logo-0N` files on the old Indus site are "logoipsum" placeholders, not accreditation logos.
- R6 §5 "run and record in a browser instead of reading the code": overtaken. Claude Design's `handoff-schema/METHOD.md` inventories every animation and surface from the code alone (the runtime's own template encoder plus the logic class run with stubs); a browser trace only cross-checks.
- The Indus v2 headless crash (R1: 13 of 15 loads) is fixed in the current draft: `crash15.mjs` reads 0 of 15.
