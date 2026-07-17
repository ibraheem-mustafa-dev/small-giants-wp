# WP Studio vs Local Flywheel vs WP Playground — Sandbox Preview Tool Decision

**Date:** 2026-04-29
**Decision:** Phase 1.5 sandbox-preview tool selection for SGS deploy pipeline
**Source agent:** background research-buddies dispatch during Phase 1c, Step 14a
**Stored to disk by:** parent session (sub-agent had no Write permission)

---

## 1. TL;DR Recommendation

**Use both — but for different roles.** Adopt **WordPress Studio** (Automattic) as the primary sandbox + client-shareable HTTPS preview surface (its Preview Sites give a free, hosted, 7-day demo URL Playwright can hit), and keep **Local by Flywheel** as the round-trip clone-from-Hostinger workhorse via SFTP/MagicSync-style file diff. Neither tool natively pushes back to Hostinger shared hosting, so the existing tar+scp deploy stays — these tools sit in front of it as a verification gate, not a replacement.

---

## 2. Side-by-Side Feature Matrix

| Capability | WP Studio (Automattic) | Local by Flywheel | WP Playground |
|---|---|---|---|
| Pull from live site | Yes for WordPress.com / Pressable; **No native for Hostinger** — manual XML/AIOWPM | Partial — no native pull for Hostinger; SFTP import or migration plugin | Partial — `.zip` import via Playground-specific format |
| Push to live | Yes WP.com/Pressable; **No for Hostinger** — selective push | Yes Flywheel/WP Engine via MagicSync; **No native Hostinger** | No |
| Plugin sync | Yes — selective | Yes — file-level diff (MagicSync) | Manual zip only |
| Theme sync | Yes — selective | Yes — MagicSync diff | Manual zip only |
| DB import | Yes (SQLite default; MySQL via env var) | Yes — MySQL native | SQLite (browser) / MySQL (Node only) |
| **HTTPS preview URL** | **Yes — Preview Sites: free, hosted, 2 GB, 7 days, up to 10 concurrent** | Yes — Live Links tunnel; needs Local running | URL is the Playground instance itself |
| Playwright integration | Yes — Preview URL is regular HTTPS | Yes — but tunnel must be open | **Best-in-class** — official `runCLI` + Playwright guide |
| MCP / AI integration | Yes — official `studio` CLI, repo `Automattic/studio` | Limited — GUI-first, some CLI flags | Yes — `runCLI` Node-native |
| Multi-site | Yes — Blueprints | Yes — strong project switcher | Yes — ephemeral instances |
| Snapshots | Yes (Preview Sites) | Partial — manual export | Yes — full `.zip` export |
| Blueprints | **Yes — reusable site recipes** | No | Yes — JSON Blueprints (the original) |
| Headless API / CLI | Yes — official CLI | Limited | Yes — `@wp-playground/cli` |
| Windows support | **Yes — Microsoft Store + manual** | Yes | Yes (browser or Node) |
| Default DB engine | SQLite (gotcha — Hostinger is MySQL) | MySQL | SQLite (browser) / MySQL (Node) |

---

## 3. Short-Term Setup (this week)

### 3a. WP Studio — wire palestine-lives.org as a sandbox baseline

1. WP Studio → **Add Site → Import from .zip**.
2. On Hostinger: `ssh hd "cd ~/domains/palestine-lives.org/public_html && wp db export ~/pl-db.sql && tar -czf ~/pl-content.tar.gz wp-content/themes/sgs-theme wp-content/plugins/sgs-blocks wp-content/uploads"` then `scp -P 65002 hd:~/pl-db.sql hd:~/pl-content.tar.gz ./`.
3. Studio → fresh site → **Database → Import** the .sql; unpack tarball into `wp-content/`.
4. **Gotcha — SQLite default:** force `DB_ENGINE=mysql` for parity with Hostinger; otherwise visual QA only.
5. **Share → Create Preview Site** → `*.wpcomstaging.com` HTTPS URL valid 7 days. Playwright target.

Windows symlink/path issues are fixed in the post-2025 Studio update.

### 3b. Local by Flywheel — round-trip clone path

1. Add Local Site → blueprint (PHP 8.2, MySQL, WP 6.9).
2. Use **All-In-One WP Migration** plugin on Hostinger to export `.wpress` → drop into Local. Faster than manual SQL+files.
3. **No push back to Hostinger** — keep `tar + scp` deploy. Local stages, doesn't deploy.
4. Live Link tunnel needs laptop on; weaker than Studio Preview for client share.

### 3c. Optional — WP Playground for ephemeral block tests

`npx @wp-playground/cli server --auto-mount` from `plugins/sgs-blocks/` — already in framework CLAUDE.md. Block-only QA, zero state.

---

## 4. Long-Term Workflow

```
[ Local edit (VS Code) ]
        v
[ WP Studio sandbox ]  <- fresh import or blueprint per task
        v   block validation, render check, Interactivity API smoke test
[ Studio Preview Site (HTTPS, 7-day) ]
        v
[ /verify-loop runs Playwright against Preview URL ]
              - 3 breakpoints (375/768/1440)
              - WCAG axe-core
              - Console errors
              - Visual diff vs reference
        v
[ PASS gate ] --> [ tar + scp + opcache reset + LiteSpeed purge ]
                              v
                     palestine-lives.org / Hostinger client site
```

**`/verify-loop` placement:** between Studio Preview and tar deploy. Today it runs against live (the pain point — discovers OPcache/LiteSpeed gotchas after deploy). Post Phase 1.5 it runs against the Preview URL — visual + a11y regressions caught before production change.

**Whose preview URL:** Studio. Free, hosted, HTTPS, survives laptop close. Local Live Links need laptop on. Playground URLs are per-session.

**Trade-off:** Studio SQLite default ≠ Hostinger MySQL. Fine for visual/block QA. For DB-heavy testing (sgs-booking REST, post-grid AJAX) use Local + MySQL.

---

## 5. Phase 1.5 Integration Plan

1. **(15 min)** Pin Studio version + create `sgs-base.blueprint.json` in `theme/sgs-theme/` (PHP 8.2, MySQL flag, sgs-theme + sgs-blocks pre-installed, default content seed).
2. **(20 min)** Document Hostinger → Studio import flow in `CLAUDE.md` under Deploy Commands. Include SQLite-vs-MySQL gotcha.
3. **(25 min)** Wire `/verify-loop` to accept `--target-url` flag (currently hard-codes palestine-lives.org). Default unchanged for back-compat.
4. **(15 min)** Add `studio-preview-up.ps1` helper — calls Studio CLI to spin up Preview Site, prints HTTPS URL. Lets `/verify-loop` chain to it.
5. **(10 min)** Update `deploy-check` skill to require `--studio-pass` flag before tar deploy. Forces the gate.

**Total: ~85 min** to install the gate.

---

## 6. Ranked Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | SQLite-vs-MySQL drift in Studio — MySQL-specific SQL passes Studio QA, breaks on Hostinger | High | Force `DB_ENGINE=mysql` in SGS blueprint; never SQLite default for SGS work |
| 2 | Studio Preview Sites expire after 7 days — long client review (Indus Foods 2-wk cycle) loses URL | Medium | Re-publish weekly via CLI; fallback to Local Live Link for 7+ day reviews |
| 3 | No native push to Hostinger from either tool — pipeline still ends with tar+scp, unverified pre-deploy | Medium | Keep `verification-before-completion` post-deploy; OPcache+LiteSpeed checks remain |
| 4 | Studio is Automattic-aligned — feature-gating risk if Preview Sites move behind paid tiers | Medium | Open-source `Automattic/studio` repo = escape hatch; Local stays as backup |
| 5 | Studio occasionally trails WP releases by 1-2 weeks | Low | Pin version in blueprint; use Local for pre-release WP testing |

---

## Sources

- https://developer.wordpress.com/docs/developer-tools/studio/sync/
- https://wordpress.com/blog/2025/07/14/selective-push-pull-wordpress-studio/
- https://developer.wordpress.com/docs/developer-tools/studio/preview-sites/
- https://wordpress.com/blog/2025/02/24/studio-preview-sites/
- https://developer.wordpress.com/docs/developer-tools/studio/changelog/
- https://github.com/Automattic/studio
- https://apps.microsoft.com/detail/9pntbl35pzvs
- https://localwp.com/help-docs/local-features/magic-sync/
- https://localwp.com/help-docs/local-features/local-connect/
- https://getflywheel.com/layout/all-local-pro-features-now-free/
- https://community.localwp.com/t/upload-to-host-other-than-flywheel/5173
- https://community.localwp.com/t/move-local-by-flywheel-local-wordpress-org-site-to-hostinger/31651
- https://www.realwebcare.com/local-by-flywheel-vs-wordpress-studio/
- https://wptuts.co.uk/localwp-or-studio-best-choice-for-local-wordpress-installation/
- https://wordpress.com/blog/2025/12/19/local-wordpress-dev-workflows-for-agencies/
- https://wpism.com/studio-review-local-wordpress-development/
- https://wordpress.github.io/wordpress-playground/guides/e2e-testing-with-playwright/
- https://github.com/WordPress/wordpress-playground/discussions/601
- https://www.hostpapa.com/blog/wordpress/exploring-wordpress-playground/
- https://wordpress.org/support/topic/studio-by-wordpress-to-hosting-migration/

**Confidence:** Studio Preview Sites + selective push/pull = high (well-documented 2025 features). Studio + Hostinger path = medium (no official docs, inferred from manual export/import patterns). Local + Hostinger SFTP push being manual-only = high confidence negative finding.
