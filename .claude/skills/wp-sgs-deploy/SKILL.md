---
name: wp-sgs-deploy
description: "Use when deploying sgs-blocks plugin, sgs-theme, or both to palestine-lives.org (the SGS framework dev site). Phase 1 = pre-flight check (absorbed /deploy-check 2026-05-19); Phases 2-5 = build + tar + SCP + SSH extract + cache + OPcache reset + verify. Invoke as /wp-sgs-deploy plugin, /wp-sgs-deploy theme, or /wp-sgs-deploy both. Optional --skip-check flag for trusted micro-patches (staging only — production rejects the flag). Renamed from /deploy 2026-05-19 to disambiguate from generic deploy contexts. Do NOT invoke for: Next.js projects (use /deploy-nextjs), DB-only refresh after code changes (use /sgs-update), per-page cv2-output deploy to a client's staging site (use /sgs-clone --deploy-target page:<id> — Stage 10 of the cloning pipeline), verification + QA without deploying (use /qc), pre-flight checklist alone without the actual deploy step (still use /wp-sgs-deploy — Phase 1 is the checklist, and decoupling check from execute was the architectural mistake this consolidation fixed)."
---

# SGS Deploy (consolidated)

## Overview

End-to-end deployment for the SGS WordPress framework — pre-flight check + execute in one skill. As of 2026-05-19 this skill absorbs the standalone `/deploy-check` command; the check now runs as Phase 1 of every `/wp-sgs-deploy` invocation. Renamed from `/deploy` to `/wp-sgs-deploy` 2026-05-19 (project-scoped name disambiguates from generic deploy contexts).

## Goal

Land sgs-blocks plugin and / or sgs-theme code on palestine-lives.org with zero deploy-time regressions: pre-flight check passes; build succeeds; files arrive intact via tar+SCP (no nested-dir trap); LiteSpeed + OPcache caches flushed via HTTP (CLI pool is a separate process and CLI reset has no effect on web requests); one representative dynamic block returns its render via REST. Phase 1 acts as the operator gate so the SCP/SSH dance cannot run without explicit acknowledgement of what is shipping and where.

**Stages:** CHECK → BUILD → EXECUTE → CACHE → VERIFY

1. **Stage 1 — CHECK** — automated checks + manual checklist + HARD-GATE on operator approval (default; bypass with `--skip-check` on staging only)
2. **Stage 2 — BUILD** — `npm run build` if plugin in scope
3. **Stage 3 — EXECUTE** — tar + SCP + SSH extract
4. **Stage 4 — CACHE** — LiteSpeed (if active) + OPcache HTTP-reset
5. **Stage 5 — VERIFY** — site responds + one representative file check

## Mandatory References

Before invoking this skill, load:
1. `~/.agents/skills/shared-references/communication-standards.md` — plain English rules
2. `~/.agents/skills/shared-references/correction-ledger.md` — past deploy mistakes (also see this skill's Correction ledger integration section)
3. `references/` (this skill) — currently empty; reserved for per-target deploy variants

## Arguments

| Argument | What deploys |
|---|---|
| `plugin` | sgs-blocks plugin only (Phase 2 runs `npm run build` first) |
| `theme` | sgs-theme only |
| `both` | sgs-theme + sgs-blocks (most common after a full session) |

**Flags:**
- `--skip-check` — bypass Phase 1 checklist. STAGING ONLY. Production deploys reject this flag and always run Phase 1.

---

## Stage 1 — CHECK (was `/deploy-check`)

Identify target site + environment from the user's argument or ask. Confirm `staging` vs `production`. Production needs explicit written confirmation at the HARD-GATE.

### Automated checks (report pass / fail / needs-manual)

**Security:** nonces on all forms; capability checks on admin actions; `WP_DEBUG` false; no hardcoded credentials; SSL valid + HTTPS enforced; `.htaccess` configured.

**Performance:** images optimised (WebP); CSS/JS minified; caching configured; no render-blocking above-the-fold resources.

**SEO + Accessibility:** meta titles + descriptions on key pages; XML sitemap + robots.txt + canonical URLs; schema markup; WCAG 2.2 AA — alt text, 44px touch targets, 4.5:1 contrast, keyboard nav, skip-to-content.

**WordPress:** plugins up to date; no PHP syntax errors; permalinks correct; backup taken; staging tested before production.

### Manual checklist (operator verifies)

Site loads on mobile + desktop; forms submit correctly; contact details correct; social links work; analytics + search console active.

### HARD-GATE — operator approval

<HARD-GATE id="operator-deploy-approval">
Do NOT run any deploy command until the operator has explicitly typed "deploy" or "confirmed" in response to a clear summary of what will be deployed and to which environment.

Present: target URL, environment (staging / production), files changed, any failed checklist items. Wait for explicit approval before Phase 2.

Production deploys with failed items require the operator to acknowledge each failure before approval.
</HARD-GATE>

Skip the entire phase ONLY when invoked with `--skip-check` AND target environment is staging. Production with `--skip-check` is rejected.

---

## Stage 2 — BUILD (plugin scope only)

```bash
cd plugins/sgs-blocks && npm run build && cd ../..
```

`--webpack-copy-php` flag copies render.php to build/ automatically. Required for dynamic blocks.

---

## Stage 3 — EXECUTE (tar + SCP + SSH)

### plugin

```bash
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv plugins/sgs-blocks $WP/plugins/ && rm -rf plugins sgs-deploy.tar'
rm sgs-deploy.tar
```

### theme

```bash
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' theme/sgs-theme
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && rm -rf theme sgs-deploy.tar'
rm sgs-deploy.tar
```

### both

```bash
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar
```

### Single-file quick patch (no tar)

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 path/to/file u945238940@141.136.39.73:domains/palestine-lives.org/public_html/wp-content/path/to/file
```

Still run Phase 4 cache + OPcache reset.

---

## Stage 4 — CACHE + OPcache reset (ALWAYS)

```bash
# LiteSpeed cache (only if plugin is active — check first: wp plugin list | grep litespeed)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# OPcache HTTP-reset (CLI pool is separate — CLI reset does nothing for web requests)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

---

## Phase 5 — VERIFY

```bash
# Site responds
curl -sI https://palestine-lives.org/ | head -1

# Plugin file present + readable
ssh hd "ls -la ~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/sgs-blocks.php"

# One representative dynamic block returns dynamic render
curl -s "https://palestine-lives.org/wp-json/wp/v2/types/sgs%2Flabel" | head -3
```

---

## Per-page deploy (DIFFERENT — handled by `/sgs-clone --deploy-target`)

For deploying a **single client page** (cv2 output → live URL), DO NOT use this skill. Use `/sgs-clone` with the `--deploy-target page:<id>` flag — Stage 10 of the cloning pipeline runs `plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py` to upload images + patch the target page via REST. Different scope (per-page) and cadence (per-clone-run).

Example:
```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage --auto-section \
  --skip-autonomy-gate --skip-register --mode draft \
  --deploy-target page:144
```

---

## Critical Gotchas

| Mistake | What breaks | Fix |
|---|---|---|
| Using `scp -r` | Creates nested dirs (`sgs-blocks/sgs-blocks/`) | Always use tar method |
| SSH with double quotes | `$WP` expands locally to empty | Always single quotes around SSH command |
| Moving before deleting | `mv` fails "Directory not empty" | `rm -rf` old dir BEFORE `mv` new one |
| Skipping `npm run build` | Deploys stale JS/CSS | Phase 2 runs build first for plugin deploys |
| CSS changes without version bump | Hostinger caches CSS aggressively | Bump version in `style.css` |
| `wp litespeed-purge all` broken on host | Phase 4 hangs | Use `rm -rf litespeed/cache/*` instead |
| `--skip-check` on production | Bypasses HARD-GATE | Production deploys MUST run Phase 1; flag is staging-only |

---

## Spec 17 Deploy Expectations

When deploying after a Spec 17 upgrade (includes `class-sgs-safety-guard.php`, `class-sgs-migrations.php`, or Wave 2/3 class set):

- `Sgs_Safety_Guard::maybe_arm_on_upgrade()` fires on plugin/theme activation — writes `sgs_seeding_armed_at` = now + 60s. Seeding will NOT fire for 60 seconds, preserving existing operator headers/footers.
- Admin notice for `edit_theme_options` users: *"SGS header/footer architecture upgraded. Your current header and footer are preserved. To re-seed from the current style variation pattern, use SGS → Site Info → Reset Header/Footer or `wp sgs reset-template-parts`."*
- `wp_options['sgs_framework_version']` updates to `1.1.0`. Verify: `wp sgs migrations status` or `wp option get sgs_framework_version`.
- Deprecated blocks notice: if any `sgs/back-to-top` or `sgs/reading-progress` blocks remain in post content (Polish 1b retirement), operators see a deprecation notice. Search + remove before production deploy.

---

## When NOT to use

- **Next.js projects** → `/deploy-nextjs`
- **DB-only refresh** → `/sgs-update`
- **Per-page client deploys** → `/sgs-clone --deploy-target page:<id>` (Stage 10)
- **Verification + QA without deploying** → `/qc`

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping Phase 1 on production | Phase 1 HARD-GATE is mandatory in production. `--skip-check` is staging-only and rejected for production targets. |
| Forgetting `npm run build` before plugin deploys | Phase 2 must run for plugin / both scopes. Skipping it ships stale build/ output. |
| Using `scp -r` instead of tar | Creates nested directories (`sgs-blocks/sgs-blocks/`) on Hostinger. Always use the tar method in Phase 3. |
| Double-quoted SSH command with `$WP` variable | `$WP` expands locally to empty, silently breaking the remote command. Always single-quote the SSH command body. |
| Resetting OPcache via WP-CLI | CLI runs in a separate OPcache pool and has no effect on web requests. Use the HTTP-curl pattern in Phase 4. |
| Forgetting to clear LiteSpeed CSS optimiser cache | LiteSpeed page cache + CSS optimiser cache are separate. Phase 4 clears both. |
| Mistaking `/wp-sgs-deploy` for `/sgs-clone --deploy-target` | This skill is framework-wide (sgs-blocks + sgs-theme to palestine-lives.org). The clone Stage 10 is per-page on a client staging site. Use the right one. |
| Running on a fresh CC session without WP context | Phase 1 needs the operator to see what's being deployed. Do not invoke from a context that has not read the diff. |
| Adding `Co-Authored-By:` to deploy commit messages | Banned globally (captured 2026-05-18). Deploy commits never carry co-author attribution. |

## Correction ledger integration

Past deploy incidents the framework has captured — cross-reference before running:

- **2026-04-30** — Hostinger `scp -r` nested-dir trap (captured in Critical Gotchas)
- **2026-05-05** — LiteSpeed cache plugin removed from palestine-lives + sandybrown; Phase 4 needs `wp plugin list | grep litespeed` guard
- **2026-05-18** — `Co-Authored-By` git footer banned globally — never include in deploy commit messages
- **2026-05-19** — Stage 9c placement bug (related: cv2 pipeline observability) — lesson #273 captured; pattern is "wire BEFORE early-return paths, verify against the live pipeline"
- **2026-05-19** — `/deploy` → `/wp-sgs-deploy` rename + `/deploy-check` absorption — this skill's consolidation (project decision logged in `.claude/decisions.md`)

## Consolidation notes (2026-05-19)

This skill absorbed the standalone `/deploy-check` command on 2026-05-19. Reasons:

1. Check + execute are naturally paired — splitting them meant operators could (and did) skip the check.
2. Three deploy concepts had been conflated (framework deploy, per-page deploy, pre-flight check). Per-page deploy moved to `/sgs-clone --deploy-target` Stage 10. Check + framework deploy consolidated here.
3. `--skip-check` flag preserves the freedom for trusted micro-patches without losing the default safety.

`/deploy-check` command remains as a redirect stub at `~/.claude/commands/deploy-check.md`. Future sessions should invoke `/deploy <scope>` (Phase 1 runs by default) or `/deploy <scope> --skip-check` (staging only) — never `/deploy-check` standalone.
