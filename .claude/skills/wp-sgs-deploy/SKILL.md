---
name: wp-sgs-deploy
description: "Use when deploying sgs-blocks plugin, sgs-theme, or both to an SGS site (sandybrown canary by default; palestine-lives on explicit opt-in). Stage 1 = pre-flight check (absorbed /deploy-check 2026-05-19); Stages 2-5 = build + `build-deploy.py` (the ONE deploy path — hand-rolled tar/scp is RETIRED per D336) + cache + OPcache reset + verify. Invoke as /wp-sgs-deploy plugin, /wp-sgs-deploy theme, or /wp-sgs-deploy both. Optional --skip-check flag for trusted micro-patches (staging only — production rejects the flag). Renamed from /deploy 2026-05-19 to disambiguate from generic deploy contexts. Do NOT invoke for: Next.js projects (use /deploy-nextjs), DB-only refresh after code changes (use /sgs-update), per-page cv2-output deploy to a client's staging site (use /sgs-clone --deploy-target page:<id> — Stage 10 of the cloning pipeline), verification + QA without deploying (use /qc), pre-flight checklist alone without the actual deploy step (still use /wp-sgs-deploy — Phase 1 is the checklist, and decoupling check from execute was the architectural mistake this consolidation fixed)."
---

# SGS Deploy (consolidated)

## Overview

End-to-end deployment for the SGS WordPress framework — pre-flight check + execute in one skill. As of 2026-05-19 this skill absorbs the standalone `/deploy-check` command; the check now runs as Phase 1 of every `/wp-sgs-deploy` invocation. Renamed from `/deploy` to `/wp-sgs-deploy` 2026-05-19 (project-scoped name disambiguates from generic deploy contexts).

## Goal

Land sgs-blocks plugin and / or sgs-theme code on the target site with zero deploy-time regressions: pre-flight check passes; build succeeds; files arrive intact via `build-deploy.py` (dirty-tree gate + fail-closed smoke test + `.bak` rotation); LiteSpeed + OPcache caches flushed via HTTP (CLI pool is a separate process and CLI reset has no effect on web requests); one representative dynamic block returns its render via REST. Stage 1 acts as the operator gate so no deploy runs without explicit acknowledgement of what is shipping and where.

**Stages:** CHECK → BUILD → EXECUTE → CACHE → VERIFY

1. **Stage 1 — CHECK** — automated checks + manual checklist + HARD-GATE on operator approval (default; bypass with `--skip-check` on staging only)
2. **Stage 2 — BUILD** — `npm run build` if plugin in scope (or let `build-deploy.py` do it)
3. **Stage 3 — EXECUTE** — `build-deploy.py` (never a hand-rolled tar/scp — D336)
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

## Stage 3 — EXECUTE (`build-deploy.py` — the ONE deploy path)

> **⛔ The hand-rolled tar + SCP + `ssh 'rm -rf … && tar -xf …'` sequence that used to live here is RETIRED (D336, 2026-07-14).** It deleted the LIVE directory *before* extracting the new one, so any failure between those two steps left the site with no plugin/theme at all — it took **two client sites down for ~2.5 hours**. Never hand-roll a deploy. Never `rm -rf` a live directory. `build-deploy.py` is the only sanctioned path: it carries the scoped dirty-tree gate, a default-ON fail-closed smoke test, and one-generation `.bak` rotation for rollback.

This skill is the **ceremony** (Stage 1 gate + cache + verify). The script **performs** the deploy.

### both (default — theme + plugin)

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
```

### plugin only / theme only

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --theme-only
```

### production (palestine-lives) — explicit opt-in, never the default

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target palestine-lives
```

`--target` defaults to `sandybrown` (the canary) **by design** — production is always an explicit, typed choice.

### Flags (and what each one costs you)

| Flag | Effect | When |
|---|---|---|
| `--target sandybrown\|palestine-lives` | Picks the site. Hostnames + remote WP paths live in the script's `TARGETS` dict (R-31-9 universal — the script's own header still says "R-22-9"; Spec 22 was absorbed into Spec 31 §13, `R-22-N ≡ R-31-N`) — never inline a host here. | Always |
| `--blocks-only` / `--theme-only` | Narrows scope (pick one — you can't pass both) | Scoped deploys |
| `--skip-build` | Reuses existing `build/` | Only when you *just* built |
| `--dry-run` | Prints commands, executes nothing | Rehearsal |
| `--verify-url <url>` | GETs a URL post-deploy as the smoke check | Page-specific confidence |
| `--allow-dirty` | **Removes the dirty-tree gate.** An uncommitted working-tree edit is what caused D336. | Exceptional only |
| `--skip-verify` | **Removes the fail-closed smoke test — the thing that catches a broken deploy.** | Exceptional only |

Stage 2's `npm run build` is what the script runs itself unless you pass `--skip-build`; run it separately only if you want the build isolated from the deploy.

**Single-file quick patch:** there isn't a sanctioned one. Deploy the scope (`--blocks-only` / `--theme-only`) — the script is fast and it verifies. A hand `scp` of one file skips every gate and leaves the tree and the server silently divergent.

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
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --client mamas-munches --page homepage --auto-section \
  --skip-autonomy-gate --skip-register --mode draft \
  --deploy-target page:144
```

---

## Critical Gotchas

| Mistake | What breaks | Fix |
|---|---|---|
| **Hand-rolling any tar / `scp` / `ssh rm -rf` deploy** | `rm -rf` of the live dir before the extract succeeds = site down with no plugin/theme. **This is D336: two client sites, ~2.5 hours.** | `build-deploy.py` only. It never deletes the live directory ahead of a successful transfer, and it rotates a `.bak`. |
| Deploying with an uncommitted working-tree edit | The script tars the WORKING TREE — a stray local edit ships to the client. This was D336's trigger. | Let the dirty-tree gate do its job; do not reach for `--allow-dirty`. |
| Passing `--skip-verify` | Removes the fail-closed smoke test — a broken deploy stays live and silent | Leave verification on |
| Assuming the default target is production | It is **not** — default is `sandybrown` (the canary) | Production requires an explicit `--target palestine-lives` |
| Skipping `npm run build` | Deploys stale JS/CSS | The script builds unless you pass `--skip-build` |
| Theme CSS change without a version bump | Hostinger caches CSS aggressively (`?ver` for ~7 days) | Bump `Version:` in the theme's `style.css`. **No block.json version bumps pre-production (D293).** |
| Measuring live CSS without clearing the CDN | The edge serves the stale `?ver` copy — you measure the old file and misdiagnose | Hostinger MCP `hosting_clearWebsiteCacheV1` before any live CSS measurement (LiteSpeed + OPcache alone leave the edge copy) |
| `wp litespeed-purge all` broken on host | Stage 4 hangs | Clear the LiteSpeed cache directory instead (Stage 4) |
| `--skip-check` on production | Bypasses HARD-GATE | Production deploys MUST run Stage 1; flag is staging-only |

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
| Hand-rolling a tar / `scp` / `ssh` deploy instead of running `build-deploy.py` | Skips the dirty gate, the fail-closed verify and the `.bak` rotation — and the old recipe `rm -rf`'d the live directory before extracting (D336: two client sites down ~2.5h). Stage 3 is one command. |
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
