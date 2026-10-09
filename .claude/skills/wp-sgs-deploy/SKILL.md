---
name: wp-sgs-deploy
description: "Use when deploying sgs-blocks plugin, sgs-theme, or both to an SGS site (sandybrown canary by default; indus-test and eye-care-test on explicit opt-in). Stage 1 = pre-flight check; Stages 2-5 = build + `build-deploy.py` (the ONE deploy path, never hand-rolled tar/scp) + cache + OPcache reset + verify. Invoke as /wp-sgs-deploy plugin, /wp-sgs-deploy theme, or /wp-sgs-deploy both. Optional --skip-check flag for trusted micro-patches on the default canary only. Do NOT invoke for: Next.js projects (use /deploy-nextjs), DB-only refresh after code changes (use /sgs-update), building a client page or surface from a draft (use /sgs-clone, the computed route), verification + QA without deploying (use /qc), pre-flight checklist alone without the actual deploy step (still use /wp-sgs-deploy — Phase 1 is the checklist and always runs with the deploy)."
---

# SGS Deploy (consolidated)

## Overview

End-to-end deployment for the SGS WordPress framework — pre-flight check + execute in one skill. The check runs as Phase 1 of every `/wp-sgs-deploy` invocation.

## Goal

Land sgs-blocks plugin and / or sgs-theme code on the target site with zero deploy-time regressions: pre-flight check passes; build succeeds; files arrive intact via `build-deploy.py` (dirty-tree gate + fail-closed smoke test + `.bak` rotation); LiteSpeed + OPcache caches flushed via HTTP (CLI pool is a separate process and CLI reset has no effect on web requests); one representative dynamic block returns its render via REST. For targets that require explicit opt-in, Stage 1 acts as the operator gate so no deploy runs without explicit acknowledgement of what is shipping and where.

**Stages:** CHECK → BUILD → EXECUTE → CACHE → VERIFY

1. **Stage 1 — CHECK** — automated checks + manual checklist; the typed-approval HARD-GATE applies to opt-in targets only (`--skip-check` is for the default canary only)
2. **Stage 2 — BUILD** — `npm run build` if plugin in scope (or let `build-deploy.py` do it)
3. **Stage 3 — EXECUTE** — `build-deploy.py` (never a hand-rolled tar/scp)
4. **Stage 4 — CACHE** — LiteSpeed (if active) + OPcache HTTP-reset
5. **Stage 5 — VERIFY** — site responds + one representative file check

## Mandatory References

Before invoking this skill, load:
1. `~/.agents/skills/shared-references/communication-standards.md` — plain English rules
2. `references/` (this skill) — per-target deploy variants

## Arguments

| Argument | What deploys |
|---|---|
| `plugin` | sgs-blocks plugin only (Phase 2 runs `npm run build` first) |
| `theme` | sgs-theme only |
| `both` | sgs-theme + sgs-blocks (most common after a full session) |

**Flags:**
- `--skip-check` — bypass the Phase 1 checklist and gate. Default canary (`sandybrown`) only; opt-in targets always run Phase 1.

---

## Stage 1 — CHECK

Identify the target from the user's argument; the default is `sandybrown`. Targets are the keys of `TARGETS` in `plugins/sgs-blocks/scripts/build-deploy.py`; a target with `explicit_opt_in_required: true` needs explicit written confirmation at the HARD-GATE.

### Automated checks (report pass / fail / needs-manual)

**Security:** nonces on all forms; capability checks on admin actions; `WP_DEBUG` false; no hardcoded credentials; SSL valid + HTTPS enforced; `.htaccess` configured.

**Performance:** images optimised (WebP); CSS/JS minified; caching configured; no render-blocking above-the-fold resources.

**SEO + Accessibility:** meta titles + descriptions on key pages; XML sitemap + robots.txt + canonical URLs; schema markup; WCAG 2.1 AA plus 2.2's cheap wins (visible focus, 44px targets; full 2.2 AA per public-sector/EU client) — alt text, 44px touch targets, 4.5:1 contrast, keyboard nav, skip-to-content.

**WordPress:** plugins up to date; no PHP syntax errors; permalinks correct; backup taken; staging tested before production.

### Manual checklist (operator verifies)

Site loads on mobile + desktop; forms submit correctly; contact details correct; social links work; analytics + search console active.

### HARD-GATE — operator approval

<HARD-GATE id="operator-deploy-approval">
For a target whose `explicit_opt_in_required` is true in `build-deploy.py::TARGETS`, do NOT run any deploy command until the operator has explicitly typed "deploy" or "confirmed" in response to a clear summary of what will be deployed and to which target.

Present: target URL, files changed, any failed checklist items. Wait for explicit approval before Phase 2. Failed items require the operator to acknowledge each failure before approval.
</HARD-GATE>

The default canary deploys without the typed gate: `build-deploy.py`'s dirty-tree gate, fail-closed verify and `.bak` rotation are the safety net. `--skip-check` is accepted for the default canary only and is rejected for opt-in targets.

---

## Stage 2 — BUILD (plugin scope only)

```bash
cd plugins/sgs-blocks && npm run build && cd ../..
```

`--webpack-copy-php` flag copies render.php to build/ automatically. Required for dynamic blocks.

---

## Stage 3 — EXECUTE (`build-deploy.py` — the ONE deploy path)

> **⛔ Never hand-roll a tar + SCP + `ssh 'rm -rf … && tar -xf …'` deploy.** It deletes the LIVE directory *before* extracting the new one, so any failure between those two steps leaves the site with no plugin/theme at all. Never hand-roll a deploy. Never `rm -rf` a live directory. `build-deploy.py` is the only sanctioned path: it carries the scoped dirty-tree gate, a default-ON fail-closed smoke test, and one-generation `.bak` rotation for rollback.

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

### opt-in targets (`indus-test`, `eye-care-test`)

```bash
python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test
```

`--target` defaults to `sandybrown` (the canary) **by design** — a target with `explicit_opt_in_required` is always an explicit, typed choice.

### Flags (and what each one costs you)

| Flag | Effect | When |
|---|---|---|
| `--target sandybrown\|indus-test\|eye-care-test` | Picks the site. Hostnames + remote WP paths live in the script's `TARGETS` dict (R-31-9, universal) — never inline a host here. | Always |
| `--blocks-only` / `--theme-only` | Narrows scope (pick one — you can't pass both) | Scoped deploys |
| `--skip-build` | Reuses existing `build/` | Only when you *just* built |
| `--dry-run` | Prints commands, executes nothing | Rehearsal |
| `--verify-url <url>` | GETs a URL post-deploy as the smoke check | Page-specific confidence |
| `--allow-dirty` | **Removes the dirty-tree gate.** An uncommitted working-tree edit ships to the site. | Exceptional only |
| `--skip-verify` | **Removes the fail-closed smoke test — the thing that catches a broken deploy.** | Exceptional only |

Stage 2's `npm run build` is what the script runs itself unless you pass `--skip-build`; run it separately only if you want the build isolated from the deploy.

**Single-file quick patch:** there isn't a sanctioned one. Deploy the scope (`--blocks-only` / `--theme-only`) — the script is fast and it verifies. A hand `scp` of one file skips every gate and leaves the tree and the server silently divergent.

---

## Stage 4 — CACHE + OPcache reset

`build-deploy.py` purges OPcache (over HTTP, because the CLI pool is a separate process and a CLI reset does nothing for web requests), the LiteSpeed page cache and the theme pattern cache. Do not repeat this by hand.

---

## Phase 5 — VERIFY

`build-deploy.py` verifies the deploy by default and fails closed. For extra confidence on one page, pass `--verify-url <url>` (see Flags).

---

## Per-page deploy (DIFFERENT, handled by `/sgs-clone`)

For a **single client page or surface**, DO NOT use this skill. Use `/sgs-clone`: the computed route (Spec 47) builds the tree onto the client's own test site through `scripts/wp-build-page.js` and Solve writes the settings. Per-client tokens deploy with `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client <slug> --target <ssh-host>`. This skill ships the plugin and theme build only.

---

## Critical Gotchas

| Mistake | What breaks | Fix |
|---|---|---|
| **Hand-rolling any tar / `scp` / `ssh rm -rf` deploy** | `rm -rf` of the live dir before the extract succeeds = site down with no plugin/theme. | `build-deploy.py` only. It never deletes the live directory ahead of a successful transfer, and it rotates a `.bak`. |
| Deploying with an uncommitted working-tree edit | The script tars the WORKING TREE — a stray local edit ships to the client. | Let the dirty-tree gate do its job; do not reach for `--allow-dirty`. |
| Passing `--skip-verify` | Removes the fail-closed smoke test — a broken deploy stays live and silent | Leave verification on |
| Assuming the default target is a client site | It is **not** — default is `sandybrown` (the canary) | `indus-test` and `eye-care-test` require an explicit `--target` |
| Skipping `npm run build` | Deploys stale JS/CSS | The script builds unless you pass `--skip-build` |
| Theme CSS change without a version bump | Hostinger caches CSS aggressively (`?ver` for ~7 days) | Bump `Version:` in the theme's `style.css`. **No block.json version bumps pre-production.** |
| Measuring live CSS without clearing the CDN | The edge serves the stale `?ver` copy — you measure the old file and misdiagnose | Hostinger MCP `hosting_clearWebsiteCacheV1` before any live CSS measurement (LiteSpeed + OPcache alone leave the edge copy) |
| `--skip-check` on an opt-in target | Bypasses HARD-GATE | Opt-in targets MUST run Stage 1; the flag is for the default canary only |

---

## Upgrade deploy expectations

When deploying a change to `class-sgs-safety-guard.php` or `class-sgs-migrations.php`:

- `Sgs_Safety_Guard::maybe_arm_on_upgrade()` fires on plugin/theme activation — writes `sgs_seeding_armed_at` = now + 60s. Seeding will NOT fire for 60 seconds, preserving existing operator headers/footers.
- Admin notice for `edit_theme_options` users: *"SGS header/footer architecture upgraded. Your current header and footer are preserved. To re-seed from the current style variation pattern, use SGS → Site Info → Reset Header/Footer or `wp sgs reset-template-parts`."*
- Verify the framework version with `wp sgs migrations status` or `wp option get sgs_framework_version`.

---

## When NOT to use

- **Next.js projects** → `/deploy-nextjs`
- **DB-only refresh** → `/sgs-update`
- **Per-page client builds** → `/sgs-clone` (the computed route)
- **Verification + QA without deploying** → `/qc`

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping Phase 1 on an opt-in target | The Phase 1 HARD-GATE is mandatory for any target with `explicit_opt_in_required`. `--skip-check` is rejected for those targets. |
| Forgetting `npm run build` before plugin deploys | Phase 2 must run for plugin / both scopes. Skipping it ships stale build/ output. |
| Hand-rolling a tar / `scp` / `ssh` deploy instead of running `build-deploy.py` | Skips the dirty gate, the fail-closed verify and the `.bak` rotation, and a hand-rolled `rm -rf` of the live directory before the extract succeeds takes the site down. Stage 3 is one command. |
| Resetting OPcache via WP-CLI | CLI runs in a separate OPcache pool and has no effect on web requests. `build-deploy.py` resets it over HTTP (Stage 4). |
| Mistaking `/wp-sgs-deploy` for `/sgs-clone` | This skill is framework-wide (sgs-blocks + sgs-theme to a test site). `/sgs-clone` builds one client page or surface. Use the right one. |
| Running on a fresh CC session without WP context | Phase 1 needs the operator to see what's being deployed. Do not invoke from a context that has not read the diff. |
| Adding `Co-Authored-By:` to deploy commit messages | Banned globally. Deploy commits never carry co-author attribution. |

