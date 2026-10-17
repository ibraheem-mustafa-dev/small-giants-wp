# Brainstorming Skill — Gap Backlog

B and C grade gaps from gap-analysis (2026-04-02). These are real improvements, just not urgent.

---

## B-grade gaps (worthwhile — real improvement over time)

### No worked design mode example
**Gap:** Exploration mode has `references/exploration-example.md`. Design mode has 8 stages but no equivalent example showing how a real session flows from opening question through to spec approval.

**Fix:** Create `references/design-example.md` with a complete worked example — topic introduction, 3 clarifying questions, 2 approaches, design approval, spec save.

**Effort:** Medium (needs a realistic example written).

---

## C-grade gaps (nice to have)

### Frontmatter doesn't distinguish design vs exploration triggers
**Gap:** Both modes listed together in the description. Messages like "help me think through X" and "design X for me" both trigger brainstorming but want different modes.

**Fix:** Add to frontmatter: "For design mode say 'design', 'spec', or 'plan this'. For exploration mode say 'explore', 'think through', or 'help me think about'."

**Effort:** Low.

### No rule blocking invocation during active implementation
**Gap:** If brainstorming is triggered while code is being written for the same topic, it derails in-progress work.

**Fix:** Add to When NOT to Use: "When code is already being written for this topic — brainstorming mid-implementation derails in-progress work."

**Effort:** Low.

### 340-line body over 250 budget
**Gap:** Visual companion section detail could move to references/ to bring SKILL.md under 250 lines.

**Fix:** Move visual companion detail fully to `references/visual-companion.md` (already referenced at the bottom of that section). Keep only the offer prompt and consent check in SKILL.md.

**Effort:** Medium (requires careful restructuring to not lose behaviour).
