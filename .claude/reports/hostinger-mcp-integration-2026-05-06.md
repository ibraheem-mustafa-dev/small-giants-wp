# Hostinger MCP — Integration Audit (2026-05-06)

## 1. Config installation

- **Written:** `c:\Users\Bean\Projects\small-giants-wp\.mcp.json`
- **Format:** Claude Code project-level MCP config (`mcpServers` block, env-var reference, no token in file).
- **Token reference:** `${APITOKEN}` — matches Hostinger's official tutorial naming (Bean confirmed `APITOKEN`, not `API_TOKEN`).
- **Loaded this session?** No. Project-level `.mcp.json` is read at Claude Code startup. Bean must restart the Claude Code session to load the MCP. The first time the MCP appears, Claude Code will prompt for trust approval — that's expected.
- **Git posture:** safe to commit (no secret in file). `.gitignore` has no rule excluding `.mcp.json` and the only entries are PNG re-includes — recommend committing.
- **Blockers:** none for installation. Loading blocker = session restart only.

## 2. Token verification

- **Env var:** `APITOKEN` set at **User scope** (length 48). Not currently exported into PowerShell session — Bean may need to restart VS Code / terminal so the user-scope variable propagates. Claude Code child processes (npx) inherit user-scope env on Windows, so the MCP should still pick it up after restart even if the current shell doesn't see it.
- **MCP binary:** `npx hostinger-api-mcp@latest --help` works — version 0.1.40 cached at `C:\Users\Bean\AppData\Roaming\npm\node_modules\hostinger-api-mcp`.
- **Live API call:** PASS. `GET /api/hosting/v1/websites?per_page=2` returned `200` with `feldeluxe.com` + `smallgiantsstudio.co.uk`. Token is valid, scoped correctly, and the production API responds (with a slow first request — needed 60s timeout, 20s timed out). Note: factor that latency into any timeout/retry logic when wiring tools.

## 3. Endpoints catalogue summary

Full catalogue: [`.claude/specs/hostinger-mcp-catalogue.md`](../specs/hostinger-mcp-catalogue.md). **117 tools shipped.**

**Top 10 useful for SGS:** `hosting_deployWordpressPlugin`, `hosting_deployWordpressTheme`, `hosting_listJsDeployments`, `hosting_createWebsiteV1`, `DNS_updateDNSRecordsV1`, `hosting_generateAFreeSubdomainV1`, `hosting_listWebsitesV1`, `hosting_verifyDomainOwnershipV1`, `domains_createDomainForwardingV1`, `hosting_importWordpressWebsite`.

**Top 5 surprises:** static-site deploy exists; no `wp_options` / WP-CLI / file mutation endpoints (gap confirmed); no LiteSpeed or OPcache control; DNS snapshot+restore built in; per-build JS deploy logs.

**Important catch:** the OpenAPI YAML in `.scratch/api-1.yaml` is incomplete — it lists `Hosting: Wordpress`, `Hosting: Files`, `Hosting: NodeJS` as tags with zero endpoints. The 7 WordPress/JS deploy tools are MCP-side custom helpers that wrap multipart file uploads + Hostinger's internal deploy endpoints. They are real and shipped — confirmed by reading `node_modules/hostinger-api-mcp/src/core/tools/hosting.js`. Don't trust the OpenAPI file as the source of truth for what the MCP can do.

## 4. File edit list

| Path | Section | Proposed edit | Mins |
|---|---|---|---|
| `CLAUDE.md` (project root) | "Deploy Commands" + new "Hostinger MCP" subsection | Add MCP-first deploy block above the tar/scp block; mark tar/scp as fallback. Add 1-line note: "MCP cannot purge LiteSpeed or reset OPcache — those steps still require SSH." | 6 |
| `CLAUDE.md` (project root) | "Gotchas" | Add gotcha: "MCP env var is `APITOKEN` (not `API_TOKEN`) — Hostinger's GitHub README is wrong, the tutorial is right" | 1 |
| `.claude/skills/deploy/SKILL.md` | All deploy variants (`plugin`, `theme`, `both`) | Add MCP path as preferred, demote tar/scp to fallback. New subsection: "Verification — `hosting_listJsDeployments`" (note: applies only when JS app deploy is in play; for plugin/theme, verification stays Playwright-based). | 12 |
| `.claude/architecture.md` | Deploy flow diagram | Replace tar/scp boxes with MCP boxes; mark cache + OPcache as remaining SSH | 4 |
| `plugins/sgs-blocks/CLAUDE.md` | "Deploy" section | Same: MCP first, tar/scp fallback | 4 |
| `theme/sgs-theme/CLAUDE.md` | "Deploy" section | Same: MCP first, with optional `activate: true` note for client switches | 4 |
| `plugins/sgs-booking/CLAUDE.md` | Deploy notes | Same: MCP first | 3 |
| `plugins/sgs-client-notes/CLAUDE.md` | Deploy notes | Same: MCP first | 3 |
| `.claude/specs/common-wp-styling-errors.md` | Deploy / cache sections | Add note that MCP deploy doesn't auto-purge LiteSpeed (still need SSH purge step after) | 3 |
| `~/.claude/CLAUDE.md` | "Quick Reference: Available Tools" → "Enabled Plugins" + a new MCP servers row | Add `hostinger` MCP to the MCP servers table with one-line scope description | 3 |
| `~/.claude/rules/wp-project-tooling.md` | "MCP Servers" table | Add row: `hostinger` · "Hostinger deploy + DNS + domain ops; project-level `.mcp.json`; APITOKEN env var" | 2 |
| `~/.claude/skills/sgs-wp-engine/` (`SKILL.md` + relevant references) | Deploy + onboarding procedures | Reference Hostinger MCP as primary deploy path; keep SSH instructions as fallback. Add new reference doc: "hostinger-mcp-playbook.md" with the 7 tool workflows | 18 |
| `~/.claude/skills/visual-qa/SKILL.md` | Stage 0 / pre-flight | Add note: "If deploy was via Hostinger MCP, fetch `hosting_listJsDeployments` (JS only) for build status before visual checks" | 2 |
| `~/.claude/skills/deploy-check/SKILL.md` | Pre-deploy checklist | Add MCP-token-set check + "verify MCP loads" check; remove obsolete tar/scp dependency where applicable | 6 |
| `~/.claude/skills/wp-wpcli-and-ops/SKILL.md` | Top of skill | Add "Boundary: MCP doesn't run WP-CLI — anything in this skill still needs SSH" | 2 |
| `~/.claude/skills/cloudflare-toolkit/SKILL.md` | Decision section | Add: "If client uses Hostinger nameservers (not Cloudflare), prefer `DNS_updateDNSRecordsV1` over manual hPanel" | 3 |
| `~/.claude/skills/vps-deploy/SKILL.md` | (no edit needed) | Confirmed not relevant — VPS skill is for the OpenClaw VPS, not shared-hosting clients | 0 |
| `.claude/parking.md` | (skip unless deploy entries exist) | Spot-check only | 1 |
| `.claude/mistakes.md` | 2026-05-04 wp_global_styles entry | Append: "Even with Hostinger MCP, `wp_global_styles` mutation still requires SSH+WP-CLI — not covered by deploy endpoints" | 2 |
| **New file** `~/.claude/skills/sgs-wp-engine/references/hostinger-mcp-playbook.md` | n/a | Document 7 tool workflows: plugin deploy, theme deploy, full onboard, DNS update, subdomain create, full site import, deploy verification | 25 |

**Total estimated edit time: ~104 mins** (sequential). Most edits are 2-6 minute touch-ups; the playbook + sgs-wp-engine integration is the bulk.

## 5. New automation opportunities

### 5a. `/deploy` upgrade (replace tar+scp+ssh with MCP)

**Today:** build → tar → scp → ssh extract → ssh purge → curl OPcache. ~6 commands, 30-60s end-to-end.

**With MCP:**

```
1. cd plugins/sgs-blocks && npm run build
2. hosting_deployWordpressPlugin(domain="palestine-lives.org", slug="sgs-blocks", pluginPath="./plugins/sgs-blocks")
3. hosting_deployWordpressTheme(domain="palestine-lives.org", slug="sgs-theme", themePath="./theme/sgs-theme")
4. ssh hd "wp litespeed-purge all && rm -rf wp-content/litespeed/css/*.css"   # still SSH
5. (curl the OPcache reset trick)                                              # still SSH
6. Playwright verify rendered output
```

**Complexity:** low. Steps 2-3 replace the entire tar/scp/ssh block. Steps 4-5 stay. Net win: fewer moving parts (no nested-dir scp gotchas, no shell quoting bugs, no `mv` clashes), proper error handling, and the deploy is auditable on hPanel.

**Risk:** the MCP zip-uploads the directory. If the WP plugin contains `node_modules` or `src/`, file count balloons. The current tar exclude flags are explicit; the MCP doesn't expose excludes. **Need to verify** what `hosting_deployWordpressPlugin` actually uploads — read `deploy-wordpress-plugin.template.js` before committing the upgrade. (Carrying this as a blocker — see Section 6.)

### 5b. New `/onboard-client <slug>` skill

End-to-end client provisioning:

```
1. hosting_listAvailableDatacentersV1   → pick closest
2. hosting_createWebsiteV1(domain, datacenter_code, order_id)
3. hosting_verifyDomainOwnershipV1(domain)              [skip for hostingersite.com]
4. DNS_updateDNSRecordsV1(domain, [A/CNAME records])    [if Hostinger NS]
5. domains_createDomainForwardingV1(www → root)
6. hosting_deployWordpressTheme(domain, "sgs-theme", "./theme/sgs-theme", activate=true)
7. hosting_deployWordpressPlugin(domain, "sgs-blocks", "./plugins/sgs-blocks")
8. ssh: wp option update → set client style variation slug
9. ssh: wp eval-file global-styles-reset.js               [the 2026-05-04 fix]
10. Playwright: verify hero render
```

Steps 1-7 are MCP. Steps 8-9 are still SSH (no MCP option mutation). Step 10 is Playwright.

**Complexity:** medium. Skill needs a slug→domain→variation lookup, and an idempotency check (re-running shouldn't double-create the website). This is the biggest leverage — turns a 30-60 min manual onboarding into a 5-min scripted run.

### 5c. Deploy verification we currently lack

- `hosting_listJsDeployments` provides build state for **JS apps only** — `pending|running|completed|failed`. Plugin/theme deploys don't return a `buildUuid` so this doesn't apply to SGS today (we're shared hosting + WP, not Node).
- For WP plugin/theme deploys, MCP returns success/failure on the upload itself — better than tar/scp's "no error means it worked". Combined with Playwright assertion of rendered output (per `verify-rendered-output-not-internal-metrics` rule), that's a real two-layer verification.

## 6. Blockers + risks

1. **Session restart required.** MCP only loads at Claude Code startup. Don't try to use it this session.
2. **Plugin/theme upload contents are opaque.** Before swapping tar/scp for the MCP, read `node_modules/hostinger-api-mcp/src/core/tools/templates/deploy-wordpress-plugin.template.js` to confirm it doesn't upload `node_modules`, `.git`, `src/` (the unbuilt JS), or test fixtures. If it doesn't filter, we'll bloat the server and possibly leak source. **High priority — verify before first MCP-based deploy.**
3. **API latency.** First call hit a 20s timeout once and succeeded at 60s. Set generous timeouts. Some upload calls (full WP import) may take minutes — design `/onboard-client` to be re-runnable.
4. **Rate limiting.** Hostinger enforces rate limits (429 on overuse, IP-block on repeated violations per spec). For batch operations don't fan out — sequence calls. No published quota in the spec.
5. **OpenAPI YAML is incomplete.** `.scratch/api-1.yaml` is not a reliable source for what the MCP exposes — use `node_modules/hostinger-api-mcp/src/core/tools/all.js` instead. Replace the stale YAML with a generated index, or delete it.
6. **No rollback for theme/plugin deploys.** Unlike `tar`-based deploys (where the old version still exists in the tar locally), MCP overwrites in place. Pair every MCP deploy with a git tag of the deployed commit so we can re-deploy the previous version if needed.
7. **Token scope unknown.** All 117 tools assume the token has the right scopes. We've only proven `hosting:read` works. Before first mutation, consider a dry-run test against a non-production domain (e.g. a fresh `*.hostingersite.com` subdomain).
8. **MCP and Cloudflare overlap.** If a client's NS sits at Cloudflare (palestine-lives.org likely does), `DNS_updateDNSRecordsV1` won't touch it — Hostinger only manages records when its own nameservers are authoritative. Per-client decision: Hostinger DNS or Cloudflare DNS, not both.

## 7. Recommended next action

Bean's next session should be a **15-minute MCP smoke test**, not a full migration. Step-by-step:

1. Restart Claude Code so the MCP loads. Approve trust prompt.
2. In the new session, ask Claude to call `hosting_listWebsitesV1` and confirm it returns the same 2 domains we just got via curl. That proves MCP→token→API works end-to-end.
3. Have Claude read `node_modules/hostinger-api-mcp/src/core/tools/templates/deploy-wordpress-plugin.template.js` and report what files it uploads (the Section 6 risk #2 question).
4. **Only then** decide whether to wire the MCP into `/deploy`. If the upload filter is sane, do the `/deploy` skill upgrade as the first integration. If not, file a Hostinger issue and stay on tar/scp until they fix it.

Skip the file-edit list (Section 4) until the smoke test passes — there's no point updating 17 docs if the MCP turns out to bloat the server.

---

**Files written this session:**

- `c:\Users\Bean\Projects\small-giants-wp\.mcp.json`
- `c:\Users\Bean\Projects\small-giants-wp\.claude\specs\hostinger-mcp-catalogue.md`
- `c:\Users\Bean\Projects\small-giants-wp\.claude\reports\hostinger-mcp-integration-2026-05-06.md` (this file)
