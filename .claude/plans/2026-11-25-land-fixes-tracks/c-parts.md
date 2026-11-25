# Track C (label c-parts; plan Task 3): every block part findable

Evidence: `i15-parts.out` sections "Findings first", 3 and 4 (skip 1 and 2); `i5-pairing.out` case table only.

1. Repair the setting-record fixtures in `plugins/sgs-blocks/scripts/setting-record/fixtures.json`: `sgs/nav-drawer-menu` variants 1 and 2 use menu `ref` 9101 (absent) and an icon map keyed by the unfilled placeholder `id:{{menuItem}}`, so 726 of 1,088 renders are empty. Then check business-info, social-icons and trust-bar's empty renders for the same cause and repair them. Run `check.py` one block at a time, as heavy runs (a code change re-renders that block's instances: about 3.5 minutes for nav-drawer-menu).
2. Add a check (in `setting-record/check.py` or its self-test) that fails any fixture variant whose render is empty.
3. `plugins/sgs-blocks/scripts/site-look/site_look.py::build_block`: record part paths seen on non-default renders that `elements` lacks, under `conditionalParts` (with parent and siblings). Route side: `scripts/computed-route/lib/setting-record.mjs::readRecord` exposes it, and `lib/skeleton-context.mjs::calPartsFor` hands it to `lib/skeleton-part-pairing.mjs::partModel`, offered only after the default parts fail. Track D edits `site_look.py::record_facts` and `setting-record.mjs::settingEntry`, and Track B the property list in `settingEntry`: do not touch those.
4. The plain-versus-accordion filter (`i5`): when no loop element is a summary row, parts under `accordion*` cannot hold its elements. Also drop parts the block never displays.
5. A completeness check: every part the record places appears in at least one render, or it is listed.
6. Pick the block mode from the draft before pairing where modes draw different parts. First case: `sgs/trust-bar` bare against circled icon (Mama's trust-strip icon colour).

Done when: `node E:\sgs-tmp\general-cloning\investigate\i5-pairing\run1.mjs E:/sgs-tmp/wt-c-parts <client> <surface> <tag>` on `mamas-munches-redesign drawer-menu` and `eye-care-ward-end drawer-eye-care-birmingham` prints 0 `paint pairing:` lines (Eye Care's `no logoSource` and Mama's `paint conservation` lines are other faults and stay), and Mama's trust-strip icon colour is written in the offline Fill of `mamas-munches-redesign/home`.
