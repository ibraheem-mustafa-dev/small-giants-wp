# Framework principles

Binding rules cited as `FP-<n>` from code, specs and skills (`python scripts/check-rule-labels.py --check` refuses an old label in a live file). Dated reports and archived documents cite older labels: `R-31-<n>` is `FP-<n>`; `R-22-<n>` is `FP-<n>` for 1, 5, 9, 11, 13 and 14; every other old number names a rule that is no longer binding.

- **FP-1** DB-first, no hardcoded dicts. Framework facts (blocks, attributes, roles, properties, breakpoints) live in `sgs-framework.db`, seeded by `/sgs-update`. Role classification lives in the `roles` table. No hand-written block or property dicts in code.
- **FP-4** Aggregate scores are per-commit DIAGNOSTICS, never the closing gate. The closing gate is the live page compared with the draft (rendered computed styles) plus Bean's eye. A parity number never closes a section alone.
- **FP-5** A walker, architecture or migration phase never ships as a single commit: three or more commits.
- **FP-6** Output-only inference is a trap. At each milestone verify the draft HTML, the extracted data AND the live DOM.
- **FP-8** Schema enumeration before "missing X": query `sgs-framework.db` (`/sgs-db`) before claiming any column, table or row gap.
- **FP-9** Universal mechanisms, no per-block hyperfocus. Over-broad universality (firing where it should not) is also a break. A composite block renders its outer wrapper through `SGS_Container_Wrapper` (Spec 02, Composite wrapper rule).
- **FP-11** Verify rendered output against the DRAFT, not internal metrics. A rendered-DOM structure assertion is itself an internal metric (a faithful mirror satisfies it); the closing check compares the rendered output with the draft ground truth, not the tree's internal shape.
- **FP-13** (Bean) Visual sign-off is co-authoritative. Script numbers + Bean's eye + cropped-pair artefacts together close a section. Numbers alone do not close; the eye alone does not close.
- **FP-14** (Bean P1-locked) A migrated block never carries a server-side legacy fallback. The "render.php reads scalar attrs and builds inner HTML, ignoring `$content`" problem is exclusively SGS-framework debt. NEVER add a legacy-scalar-render fallback (`if empty content and not-empty legacy_attr`) to a migrated render.php. The sanctioned path is the full roster migration plus a WP-CLI batch sweep of existing posts, with no `deprecated.js`.
