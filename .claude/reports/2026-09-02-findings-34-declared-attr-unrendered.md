# Detector findings — 34 — Declared attribute, never rendered

**Rule:** `34-declared-attr-unrendered` (`plugins/sgs-blocks/scripts/inspector-scan/rules/34-declared-attr-unrendered.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** An attribute is declared in block.json but nothing (render.php/edit.js/anywhere) reads it.

**Effect:** Mostly informational — all 7 are already individually understood (5 are static-scan blind spots on genuinely-consumed dynamic-key reads; 2 are deliberately kept declared for the cloning pipeline's scalar-media role assignment). No action needed on any of the 7 as things stand.

**Validated count:** 7 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] No action** — all 7 are already explained (see effect above); this list is kept unbaselined on purpose so it stays visible, not because it's a real backlog.
2. If you want the detector itself improved so these 5 dynamic-key cases stop appearing at all, that's a `check-dead-controls.js` corpus-widening job (shared with rule 21's `ATOM_CONTROLS[id]` fix above — same root cause).

---

### sgs/hero (7)
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.
- `plugins/sgs-blocks/src/blocks/hero/block.json` — nothing paints it, and the client has no way to set it. This is a dead declaration.

