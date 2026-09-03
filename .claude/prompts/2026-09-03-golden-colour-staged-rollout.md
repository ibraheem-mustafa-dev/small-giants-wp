# Golden colour — staged rollout (supersedes the grant.js build prompt)

**Written 2026-09-03.** Invoke `/autopilot` first.

⛔ **The previous prompt for this track (`2026-09-03-golden-colour-grant-build.md`) is
DELETED.** It briefed a `grant.js` codemod build with a ~5.4-hour critical path. A
6-persona `/adversarial-council` returned **NO-GO** on that route on 2026-09-03. Do not
reconstruct it from memory or from `.claude/plans/2026-08-23-colour-capability-grant-PLAN.md`
(which still describes the codemod route and is now historical).

## The governing plan

`.claude/plans/2026-09-03-golden-colour-staged-rollout.md` — read it in full. It carries the
verified baseline, every correction the council found, and the phase order.

## Why the route changed — the four convergent findings

1. **4 of 6 reviewers:** the codemod route was never tested against a cheaper alternative,
   and two cheaper routes exist, both already in the tree.
2. **4 of 6:** the pipeline it extends was **broken** — `adopt.js` emitted an import of
   `borderRow`, deleted at `dd2989ec2`, and its own self-test asserted that broken emit as
   correct. **Fixed in Phase 0; do not reintroduce it.**
3. **Ship-PM:** commit `778879732` left a handover note naming **~78 remaining text-colour
   attributes**. 91 of the non-conformant rows are plain `color`, 90 of which already emit
   colour. That is the largest population and it is a half-finished rollout, not new work.
4. **Efficiency Architect:** `includes/fx-surface-treatment.php:294-308` already injects
   scoped CSS into arbitrary blocks from a `render_block` filter. The four colour helpers
   take `(selector, attributes, map)` and do not care who calls them.

## Bean's rulings, already made — do not re-open

- **Route:** staged. Ship existing-tooling value, deploy, measure, then decide on a codemod.
- **Touch-hover guard:** fix it in the shared helpers, before any rollout (Phase 1).
- **Refused blocks HIDE the control.** Never show a client a control that does nothing.
- **Scope:** the 35 custom-property rows are IN (the full set), per the earlier ruling.
- **D752 is the mandate:** hover + gradient everywhere. Machinery yields to it, not vice versa.

## Where to start

Phase 0 is **DONE** (this commit). Start at **Phase 1** — the touch-hover guard.

⚠ **Re-run the baseline before Phase 2 or 3.** Every count in the plan carries the command
that produces it; a per-block list is explicitly banned from being trusted. `card-grid` was
rewritten on 2026-09-03 after its list entry was taken.

## Standing rules

- One phase = one or more path-scoped commits, filenames enumerated, never a glob.
- `npm run gate:fast` after every change; read the FULL output.
- **No count from this plan may be quoted into a commit message** — paste the tool's output.
- Not rule-31 delta for anything touching `render.php`; rule 31 is a JS-only scanner. It also
  cannot see `SgsBorderControl`'s 44 mounts.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/qc-council` | Any fix touching a shared helper (Phase 1 especially) |
| `/verify-loop` | Two independent attestations per load-bearing claim |
| `/handoff` | Session close |
