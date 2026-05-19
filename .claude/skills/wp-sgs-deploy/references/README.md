# wp-sgs-deploy — references

Reserved for per-target deploy recipes (per-host SSH variations, alt cache plugins, multi-environment matrices). Currently empty — single-target framework deploy is documented inline in SKILL.md.

When extending: add one reference file per deploy variant, e.g. `references/staging-vs-production.md` or `references/multi-site-deploy.md`.

Shared references inherited from `~/.agents/skills/shared-references/` (communication-standards, correction-ledger). The deploy skill loads correction-ledger entries from blub.db on Phase 1 entry — see Stage 1 in SKILL.md.
