Invoke /autopilot before doing anything else.

# Track F (the framework), Phase 1: tap areas fit their shape

Context:
- **The plan:** `.claude/plans/2026-10-23-cloning-tool-completion.md` fixes every known issue before a full three-client re-clone.
- **Track F** owns `plugins/` and `theme/` and the block specs they change; Tracks W, R and S run in other sessions (`.claude/queue.md`).
- **Bean's ruling 11 (2026-10-23):** a cloned draft's size overrules the 44px house minimum, which applies only to what SGS makes itself, and a control's tap area fits its own shape.
- **The problem:** today `plugins/sgs-blocks/src/blocks/icon/style.css::.sgs-icon__link` forces a 44px minimum around the icon's shape. On the Indus header that makes 34px social circles sit in 44px boxes, so the group is 206px wide against the draft's 166px and wraps.

Read first: the plan (ruling 11, register row F1), the project `CLAUDE.md` touch-target line, `.claude/skills/migration-method/SKILL.md`.

## Tasks
1. **F1, detector first** (migration-method; more than three blocks are likely). Build the detector, which finds every block CSS or render rule forcing a hard-coded 44px (or other fixed) minimum tap area. Then the fix: the tap area follows the block's own shape or size setting, and 44px stays only the default when no size is set. Use `wp-sgs-developer` through the Agent tool, or `/delegate`.

   **Done when:**
   - the detector's `--check` is registered;
   - a MUST FAIL test shows a 34px shape gives a 34px link, and an icon with no size still gives 44px;
   - the change is deployed with `python plugins/sgs-blocks/scripts/build-deploy.py --target indus-test`, which also runs the gates;
   - the live social icons measure 34px at 375, 768 and 1440;
   - an `F built F1 <sha>` line is in the queue.
2. **F2:** any block behaviour Track R's settings map proves has no SGS home. Expected none, per ruling 14. Each needs Bean's decision before it is built.
3. **Close:** one reviewer, one fix agent, the docs (the block's spec FR, the plan's F rows), `/handoff local`, `/compact`.

## Guardrails
- One reseed, deploy and live check per batch, with `F reseed-start` / `F reseed-done` lines around any reseed.
- Never hand-roll server copies, never `--allow-dirty` or `--skip-verify`.
- Explicit pathspecs with `git branch --show-current` in the same command; never stash or `git add -A`; never touch `.claude/settings.json`.
- Delete this prompt (`git rm`) in the wave's handoff commit.
