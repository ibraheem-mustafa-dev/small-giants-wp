# Framework principles

Binding rules cited by ID from code, specs and skills. `R-22-N` is the same rule as `R-31-N`.

- **R-31-1** DB-first, no hardcoded dicts. Framework facts (blocks, attributes, roles, properties, breakpoints) live in `sgs-framework.db`, seeded by `/sgs-update`. Role classification lives in the `roles` table. No hand-written block or property dicts in code.
- **R-31-4** Aggregate scores are per-commit DIAGNOSTICS, never the closing gate. The closing gate is the live page compared with the draft (rendered computed styles) plus Bean's eye. A parity number never closes a section alone.
- **R-31-5** A walker, architecture or migration phase never ships as a single commit: three or more commits.
- **R-31-6** Output-only inference is a trap. At each milestone verify the draft HTML, the extracted data AND the live DOM.
- **R-31-8** Schema enumeration before "missing X": query `sgs-framework.db` (`/sgs-db`) before claiming any column, table or row gap.
- **R-31-9** Universal mechanisms, no per-block hyperfocus. Over-broad universality (firing where it should not) is also a break. A composite block renders its outer wrapper through `SGS_Container_Wrapper` (Spec 02, Composite wrapper rule).
- **R-31-11** Verify rendered output against the DRAFT, not internal metrics. A rendered-DOM structure assertion is itself an internal metric (a faithful mirror satisfies it); the closing check compares the rendered output with the draft ground truth, not the tree's internal shape.
- **R-31-13** (Bean) Visual sign-off is co-authoritative. Script numbers + Bean's eye + cropped-pair artefacts together close a section. Numbers alone do not close; the eye alone does not close.
- **R-31-14** (Bean P1-locked) A migrated block never carries a server-side legacy fallback. The "render.php reads scalar attrs and builds inner HTML, ignoring `$content`" problem is exclusively SGS-framework debt. NEVER add a legacy-scalar-render fallback (`if empty content and not-empty legacy_attr`) to a migrated render.php. The sanctioned path is the full roster migration plus a WP-CLI batch sweep of existing posts, with no `deprecated.js`.
