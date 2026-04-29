# Spec 08: Structural Fixes
**Target:** Cerebras | **Time:** 15 min

Create missing hooks/, scripts/ dirs with README for: animation-harvest, sgs-discover, build-website (all in C:/Users/Bean/.claude/skills/).

hooks/README.md: Enforcement hooks. Currently empty. External enforcement via pipeline-stage-gate.py.

scripts/README.md: Reusable scripts. Currently empty. Shared scripts in .agents/skills/shared-references/.

Also create shared-references symlinks in references/ for animation-harvest and build-website.

**Rules:** No SKILL.md edits, no deletions, idempotent.

**Verify:** skillscore ARCH score improves.