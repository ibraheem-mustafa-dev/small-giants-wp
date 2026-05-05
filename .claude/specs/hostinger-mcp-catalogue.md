# Hostinger MCP — Endpoints Catalogue

Source: `npm:hostinger-api-mcp@0.1.40` tool registry (`src/core/tools/all.js`).
The OpenAPI YAML at `.scratch/api-1.yaml` is incomplete — it declares Hosting tags `Wordpress`, `NodeJS`, `Files` but defines none. The MCP package itself ships 7 custom file-upload tools that wrap those operations (template-driven, not REST endpoints). All other tools map 1:1 to documented REST paths.

**Total tools shipped: 117** (7 custom hosting + 110 REST-mapped).

## Legend

`SGS` column: `Y` = useful for SGS Framework workflows · `M` = maybe · `N` = not relevant.

---

## Hosting — Custom WordPress / JS / Static (7) — THE MAIN PRIZE

| Tool | SGS | What it does · Replaces |
|---|---|---|
| `hosting_deployWordpressPlugin` | Y | Upload plugin dir, deploy. Replaces `tar+scp+ssh-extract` for `plugins/sgs-blocks` |
| `hosting_deployWordpressTheme` | Y | Upload theme dir + optional `activate`. Replaces same flow for `theme/sgs-theme` |
| `hosting_importWordpressWebsite` | Y | Upload site archive + SQL dump → full WP site provision. Powers `/onboard-client` |
| `hosting_deployJsApplication` | M | Deploy Node app from src archive (server runs build). Future Next.js client work |
| `hosting_deployStaticWebsite` | M | Static HTML bundle deploy. Useful for `playwright`/Gemini mockups before WP build |
| `hosting_listJsDeployments` | Y | List deployments + states (pending/running/completed/failed). Adds verification we lack today |
| `hosting_showJsDeploymentLogs` | Y | Logs by `buildUuid`. Needed when JS deploy fails |

## Hosting — Websites / Domains / Orders (6)

| Tool | SGS | What it does |
|---|---|---|
| `hosting_listWebsitesV1` | Y | List all hosted sites (filter by username/domain). Read-only health check |
| `hosting_createWebsiteV1` | Y | Create new website on existing hosting plan. **Step 1 of `/onboard-client`** |
| `hosting_listAvailableDatacentersV1` | Y | Choose datacenter at create-website time |
| `hosting_generateAFreeSubdomainV1` | Y | Mint a `*.hostingersite.com` for staging/dev. Replaces manual hPanel work |
| `hosting_verifyDomainOwnershipV1` | Y | Verify custom domain pointing — required before TLS |
| `hosting_listOrdersV1` | M | Inventory hosting plan orders (audit only) |

## DNS — Zone records (8)

| Tool | SGS | What it does |
|---|---|---|
| `DNS_getDNSRecordsV1` | Y | Read zone records — diagnostic before changes |
| `DNS_updateDNSRecordsV1` | Y | Upsert records. **Replaces Cloudflare-toolkit for non-CF clients** + can do A/CNAME for new client onboarding |
| `DNS_deleteDNSRecordsV1` | Y | Targeted record removal |
| `DNS_resetDNSRecordsV1` | M | Reset whole zone to template — destructive, useful only on fresh domains |
| `DNS_validateDNSRecordsV1` | Y | Pre-flight check before update — catches errors |
| `DNS_getDNSSnapshotV1` / `DNS_getDNSSnapshotListV1` | Y | History of zone changes |
| `DNS_restoreDNSSnapshotV1` | Y | Roll back DNS — safety net for botched onboarding |

## Domains — Portfolio + WHOIS (16)

| Tool | SGS | What it does |
|---|---|---|
| `domains_getDomainListV1` / `domains_getDomainDetailsV1` | Y | Inventory + per-domain detail |
| `domains_purchaseNewDomainV1` | M | Buy domain via API — only for direct-managed clients |
| `domains_checkDomainAvailabilityV1` | Y | Lookup before purchase / suggest alternatives |
| `domains_createDomainForwardingV1` / `getDomainForwardingV1` / `deleteDomainForwardingV1` | Y | www→root, https-redirects without touching .htaccess |
| `domains_updateDomainNameserversV1` | Y | Point domain at Hostinger or Cloudflare nameservers |
| `domains_enableDomainLockV1` / `disableDomainLockV1` | M | Transfer-lock toggle |
| `domains_enablePrivacyProtectionV1` / `disablePrivacyProtectionV1` | M | WHOIS privacy toggle |
| `domains_create/get/delete/listWHOISProfileV1` + usage | M | WHOIS contact records (compliance only) |
| `v2_getDomainVerificationsDIRECT` | M | Domain ownership verifications |

## Billing (6) — N for SGS work (audit-only)

| Tool | SGS | What it does |
|---|---|---|
| `billing_getCatalogItemListV1` | M | Browse plans/pricing — useful when quoting |
| `billing_getSubscriptionListV1` | M | Audit active subscriptions |
| `billing_getPaymentMethodListV1` / `setDefaultPaymentMethodV1` / `deletePaymentMethodV1` | N | Account ops only |
| `billing_enable/disableAutoRenewalV1` | N | Account ops only |

## Reach (10) — N for SGS dev (transactional email/CRM)

10 tools for contact/segment/profile management. Possibly relevant for *future* Indus Foods marketing automation. Skipped detail.

## VPS (60+) — N for SGS shared-hosting work

VPS toolkit covers virtual machines, Docker projects, firewalls, snapshots, public keys, post-install scripts, recovery mode, metrics. **Not used by SGS — palestine-lives.org and smallgiantsstudio.co.uk are on shared hosting, not VPS.** Relevant only if Bean spins up a VPS for OpenClaw or a Docker workload (separate project — see `vps-deploy` skill).

---

## Top 10 useful for SGS (priority order)

1. `hosting_deployWordpressPlugin` — replaces every plugin tar/scp/ssh deploy
2. `hosting_deployWordpressTheme` — replaces every theme tar/scp/ssh deploy
3. `hosting_listJsDeployments` — first proper deploy verification mechanism
4. `hosting_createWebsiteV1` — step 1 of one-shot client onboarding
5. `DNS_updateDNSRecordsV1` — second step (point domain) without leaving Claude
6. `hosting_generateAFreeSubdomainV1` — staging-domain provisioning
7. `hosting_listWebsitesV1` — read-only health check, safe to call anywhere
8. `hosting_verifyDomainOwnershipV1` — gate before TLS issuance
9. `domains_createDomainForwardingV1` — www→root in one call
10. `hosting_importWordpressWebsite` — full-site migration (existing site → Hostinger)

## Top 5 surprises

1. **`hosting_deployStaticWebsite`** exists — opens a path for shipping pure-HTML mockup previews to a real subdomain before the WP build, replacing the current "ship into WP, hope nothing leaks" flow
2. **No `wp_options` / WP-CLI / file-system mutation endpoints** — every "edit a setting on a live site" still requires SSH+WP-CLI. The MCP cannot replace `wp option update`, `wp litespeed-purge`, or arbitrary file uploads. (Confirms the brief's gap list.)
3. **No LiteSpeed or OPcache control** — explicit gap. Cache purge + OPcache reset still need our existing SSH curl trick
4. **DNS snapshot + restore is built in** — better safety net than Cloudflare's audit log; we should prefer Hostinger DNS for non-CF clients
5. **JS deploy logs by `buildUuid`** — granular failure debugging that our current tar+scp deploy chain has zero of

## Gaps the MCP does NOT cover (still need SSH)

- LiteSpeed page cache purge (`wp litespeed-purge all`)
- LiteSpeed CSS optimiser cache (`rm -rf wp-content/litespeed/css/*.css`)
- PHP OPcache reset (HTTP-pool only — script-and-curl trick)
- WP-CLI commands (`wp option update`, `wp eval-file`, `wp user`, `wp post`, `wp plugin activate`)
- Arbitrary file upload outside `wp-content/themes` and `wp-content/plugins`
- `wp_global_styles` post mutation (the 2026-05-04 lesson)
- Post-deploy verification by reading rendered HTML (use Playwright)

These remain SSH territory. The MCP shrinks but does not eliminate SSH.
