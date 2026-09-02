# Detector findings — 07 — Preset-only shadow control

**Rule:** `07-preset-only-shadow` (`plugins/sgs-blocks/scripts/inspector-scan/rules/07-preset-only-shadow.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** A block offers a shadow preset dropdown (sm/md/lg/glow) instead of the shared, full-featured `ShadowControl` (X/Y/blur/spread/colour+alpha/inset).

**Effect:** Client on this one block gets a coarser shadow control than every other block using the shared component.

**Validated count:** 1 genuine finding(s)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] Swap to the shared `ShadowControl`** — `src/components/ShadowControl.js`, already used elsewhere (e.g. `src/components/media/atoms/shadow.control.js`). One-block fix.
2. Leave as-is if the preset-only shape is deliberate for this block.

---

### sgs/site-header (1)
- `plugins/sgs-blocks/src/blocks/site-header/edit.js:677` — <SelectControl label="Shadow"> — likely a preset select; consider the shared ShadowControl real builder

