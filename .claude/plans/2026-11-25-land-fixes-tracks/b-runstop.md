# Track B (label b-runstop; plan Task 7): a look the clone cannot place never stops the run

Start now from `main` on your own branch: no fix branch touches `site-run.mjs::applyDetail`, and the small overlaps (rf5 and rf7 in `apply-probes.mjs`; rf5, rf8, rf9 and rf10 elsewhere in `site-run.mjs`) are resolved at merge. Leave the six `sgs/account` hover shadows until Track D's account merge lands, then do them.

Evidence: `i2-stops.out` sections "Headline", "Per surface" (1 to 9) and "Other places a run ends" only.

1. `scripts/computed-route/site-run.mjs::applyDetail` lists unresolved rows in the run report and carries on to verify and walk; `apply.mjs` no longer fails its exit code on `gate.unresolved` alone. Amend Spec 48's sentence "An unresolved row fails a whole run" to Bean's ruling (a look the clone cannot place is listed and never stops the clone).
2. Upstream faults, each with a test that fails on main:
   - `lib/apply-probes.mjs::labelTextHolder` picks an `<option>` when a `<select>` sits in the label: read the label's own text element.
   - `lib/setting-record.mjs::settingEntry` keeps one property of multi-property settings such as `height,width` (36 settings): keep them all. Track D also edits `settingEntry` (it adds `enumReads`); keep your change to the property list.
   - Apply's reads collect `normalLineHeight` as Fill does.
   - The modal pin gate matches `arrowInsetTop`: match the setting that paints the modal's `top`.

Done when: a unit test shows `applyDetail` no longer throws on a log with 3 unresolved rows, and the gate replay `E:\sgs-tmp\general-cloning\investigate\i2-stops\all.mjs` (re-pointed at your worktree) over the nine surfaces' saved plan files lists their rows with no surface failing.
