# Session Handoff — 2026-06-11 (theme/blocks thread)

## Completed This Session
1. **R-22-13 block-quality remediation — all 12 of Bean's review points shipped + merged to main** (D209). Three waves on `feat/block-quality-mirror`, fast-forwarded to `main` (`26374b51..bd850804`).
2. **Shared `TypographyControls` component built** (`src/components/TypographyControls.js`) + **`sgs_typography_css_rule()`** PHP helper (`includes/helpers-typography.php`, auto-loaded via render-helpers). Canonical sgs/text UI: responsive size slider + unit dropdown, weight/style dropdowns, line-height. Replaces the blank-box/token controls.
3. **6 blocks migrated to the component** (string fontSize → number+unit+responsive, blank-box controls removed, helper-driven uid-scoped `<style>`, legacy-string back-compat): counter, whatsapp-cta, mobile-nav, option-picker, trust-bar, product-card. Found via a `/wp-blocks` audit.
4. **Wave-1 bug fixes:** trust-bar icon circle invisible→overridable default border (live-DOM root-caused); trust-bar title placeholder leak; badge-size hidden for icon-circle; testimonial quote stuck-italic; notice-banner iconColour control; sgs/icon left/centre/right alignment toolbar.
5. **announcement-bar RETIRED → notice-banner announcement mode** (#11): `displayMode=announcement` (sticky top/bottom, full-width, z-1000) + accessible close button + WP-Interactivity dismiss (session/permanent storage) + pre-paint anti-flash script. Live interaction-tested (pages 1080 + 1096). announcement-bar block deleted.
6. **qc-council finishing gate** (2 cross-model raters + inline): security MERGE-OK; 1 false-positive blocker (verified), 1 real blocker (dismiss key was per-request `wp_unique_id()` → fixed with content-hash fallback, live-verified).
7. **Typography component documented MANDATORY** in `plugins/sgs-blocks/CLAUDE.md` Block Customisation Standard.
8. **`/sgs-update` run:** DB reconciled — 70 SGS blocks, +72 attrs, announcement-bar + 25 orphan attrs pruned, `02-SGS-BLOCKS-REFERENCE.md` regenerated.

## Current State
- **Branch:** `main` at `bd850804` (block-quality work merged; `feat/block-quality-mirror` still exists — co-active cloning thread also commits to it).
- **Tests:** no test suite run this session; build green (dead-control + F3 guards pass) on every wave.
- **Build:** passes. Deployed to sandybrown canary throughout; live-verified.
- **Uncommitted:** phase4 reports + `02-SGS-BLOCKS-REFERENCE.md` (sgs-update regen) + lucide-icons.php (never-stage) — doc artifacts committed with this handoff.

## Known Issues / Blockers
- 1 live `sgs/announcement-bar` instance on the canary homepage now shows the deleted-block placeholder (clone fixture — needs re-clone or manual swap to notice-banner announcement mode).
- Co-active hazard persists: `feat/block-quality-mirror` shared with the cloning thread; `main` checked out in their worktree `C:/tmp/sgs-p4`. `git branch --show-current` before every commit; merge via FF-push or temp worktree.

## Next Priorities (in order)
1. **WooCommerce page-type build (Spec 30 / D208)** — the theme thread's delegated work: `add_theme_support('woocommerce')` + single-product/archive templates + custom SGS search+filter blocks + option-picker→WC variation binding + Mini-Cart drawer styling + schema audit.
2. **Parked polish** (Bean's choice): announcement-bar homepage fixture swap; trust-bar `gridItemPadding` dead-on-split note (cosmetic); option-picker `labelFontWeight` block.json position NIT.
3. **Optionally refactor the 5 canonical blocks** (text/heading/button/label/quote) to use the shared `TypographyControls` (they duplicate the pattern inline) — pure consistency, low priority.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/src/components/TypographyControls.js` | NEW shared typography component |
| `plugins/sgs-blocks/includes/helpers-typography.php` | NEW `sgs_typography_css_rule()` helper |
| `plugins/sgs-blocks/src/blocks/{counter,whatsapp-cta,mobile-nav,option-picker,trust-bar,product-card}/*` | typography migration |
| `plugins/sgs-blocks/src/blocks/{trust-bar,testimonial,notice-banner,icon}/*` | Wave-1 bug fixes |
| `plugins/sgs-blocks/src/blocks/notice-banner/{block.json,edit.js,render.php,style.css,view.js}` | announcement mode |
| `plugins/sgs-blocks/src/blocks/announcement-bar/` | DELETED |
| `plugins/sgs-blocks/CLAUDE.md` · `.claude/decisions.md` · `.claude/CLAUDE.md` | typography MANDATORY note + D209 + pointer |
| `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` · `reports/phase4-*.txt` | sgs-update regen |

## Notes for Next Session
- The hero "padding triple-routed" defect is the **converter's** `_process_container_children` fold logic (D207, convert.py:4435), NOT a hero-block fault — the WS-4 hero remodel (section IS an sgs/container) is correct; hero needs zero block changes. That fix belongs to the cloning thread.
- The typography component honours a **legacy string fontSize** verbatim (helper back-compat) — existing content never breaks despite the string→number type change. All 6 migrated blocks are dynamic (no deprecated.js needed).
- F3 guard requires font-weight/line-height literals in `var(--x, default)` form once a `*FontWeight`/`*LineHeight` attr exists — do NOT clean them to plain literals (re-triggers the guard).

## Next Session Prompt

~~~
You are continuing the SGS theme/blocks thread. The R-22-13 block-quality remediation is COMPLETE + merged to main (D209). The next major work is the WooCommerce page-type build (Spec 30, delegated from the cloning thread's D208).

Invoke /autopilot first. This is the THEME/BLOCKS thread (NOT the cloning pipeline — sibling `.claude/next-session-prompt.md`). Read `.claude/handoff-theme.md` + `.claude/decisions.md` (D209/D208) + `.claude/specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md`.

## READ BEFORE ANYTHING ELSE — warm-start + STOP catalogue (carried forward, do NOT subtract)
- **STOP — verify the branch before EVERY commit.** `git branch --show-current` + `git log origin/main --oneline -5`. `main` is checked out in the cloning thread's worktree `C:/tmp/sgs-p4`; `feat/block-quality-mirror` is shared. Commit path-scoped (`git commit -m "..." -- <paths>`, never `git add -A`); merge to main via FF-push or temp worktree, never disrupt the co-active tree. Leave never-stage artefacts untouched: `lucide-icons.php`, `sgs-framework.db`, `theme-snapshot.json`, `.parity-golden.json`, phase4 reports, build/.
- **STOP — deploy `*.asset.php` with ANY viewScriptModule JS change; scp the WHOLE block set; opcache-reset; verify the served `?ver`.** WP reads each block's `style.css`, not `style-index.css`.
- **STOP — bump block.json version with ANY style.css change** (Hostinger CDN caches block CSS 7 days on the ?ver URL).
- **STOP — typography controls use the shared `TypographyControls` + `sgs_typography_css_rule()` (D209), NEVER bespoke blank-box font controls** (plugins/sgs-blocks/CLAUDE.md Block Customisation Standard).
- **STOP — a guard on ONE write path is not a guard; enumerate every path. show_in_rest:false on PHP-authored metas; strict '1'===(string)$v casts.**
- **STOP — REST/one-shot gates CANNOT see admin/editor defects; a visual pass (Playwright 375/768/1440) is MANDATORY for any new admin/editor/shop UI.**
- **STOP — clean up superseded controls when changing a block** (one control per setting; no dead/duplicate/render-without-control/vestigial attrs).
- **STOP — WC products edit in the CLASSIC screen, not Gutenberg** (`use_block_editor_for_post_type('product')` FALSE).
- **STOP — a file-scope `extends \WC_*` class fatals the whole site if required before WC loads; require inside woocommerce_loaded + parse-time class_exists guard.**
- **STOP — CPT capability maps use PLURAL primitives; singular meta-caps break the mapped cap site-wide.**
- **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), not theme.json on disk.**
- **STOP — public product/text/XML endpoints: enumerate WC visibility states (visibility=>catalog), raw post_password, entity-decode display strings, ?cb= CDN-bust when verifying.**
- **STOP — schema/OG/feed price ALWAYS inc-VAT + from the MANIFEST; FAQPage is dead (drop it); ONE Product node per PDP.**
- **STOP — passing automated gates ≠ DONE; expect Bean's R-22-13 eye to catch more.**
- **STOP — fact-check every subagent claim against live ground truth; rater findings are HYPOTHESES.**
- **STOP — build via PowerShell (`npm run build`), NOT Bash; WP guard-blocked ops via token-gated webroot one-shot (native PHP, quoted literals).**

## Pre-flight self-attestation (answer before first action)
1. Which thread am I? (theme/blocks — NOT cloning.) 2. What branch is the tree on? (`git branch --show-current`.) 3. Has main moved? (`git log origin/main --oneline -5`.) 4. Is Spec 30 read end-to-end before proposing a build sequence? 5. What's the measurable acceptance for the task I'm about to start?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/brainstorming` | architectural/feature decisions (Spec 30 build sequencing) |
| `/gap-analysis` | grade any unit vs its FR acceptance |
| `/strategic-plan` + `/phase-planner` | plan the Spec 30 build before code |
| `/research` (+ `/library-docs`) | WC block APIs (Store API, @woocommerce/block-data variation selectors), 2026 WC block ecosystem |
| `/sgs-wp-engine` + `/wp-block-development` + `/wp-rest-api` + `/wp-plugin-development` | the WP build |
| `/qc-council` | MANDATORY before any WC-write / converter / SGS-block commit (blub.db 255) |
| `/verify-loop` | 2-attestation on load-bearing claims |
| `/ui-ux-pro-max` + chrome-devtools/Playwright | MANDATORY visual pass on any new editor/admin/shop UI |
| `/dispatching-parallel-agents` + `/subagent-driven-development` | disjoint build pieces / implementer→review loops |
| `/sgs-update` | after any block add/change |
| `/delegate` | model per dispatch (sonnet default; haiku = 2nd council family; Gemini account-blocked) |
| `/capture-lesson` | any new architectural rule |
| `/handoff` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| chrome-devtools / Playwright (often HELD by the co-active session) | live editor/shop verification + screenshots + 3-breakpoint |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs |
| WooCommerce Store/REST + `/wc/v3` (app-password Basic auth) | products + variations |
| SSH + token-gated webroot one-shot | guard-blocked WC ops; `ssh -p 65002 u945238940@141.136.39.73`; creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | disjoint WP build pieces (templates, blocks, bindings) — NO commit/deploy authority, return uncommitted |
| general-purpose (haiku) | security / 2nd-council-family review |

## Task 1 — WooCommerce page-type build (Spec 30 / D208)
**What:** build the WC page-type chassis the cloned product page needs. **Why:** the product-page clone is GATED on D-1 (deploy to the single-product block template, not a WP Page) — outcome = a working product template + the differentiated SGS UX on it. **Estimated:** multi-session; first session = /strategic-plan + /phase-planner the build, then start the theme-support + template chassis.
**Orchestration:** plan inline (Opus); delegate disjoint build pieces to sonnet subagents (no commit authority) via /subagent-driven-development; /qc-council before any WC-write commit.
**Brief:** read Spec 30 (FR-30-1..12) + D208 end-to-end. Build: `add_theme_support('woocommerce')` + single-product/archive block templates + custom SGS search+filter blocks (framework asset, no per-client licence) + option-picker→WC variation binding via Store API add-item (confirm `@woocommerce/block-data` variation-read selector first) + Mini-Cart drawer styling (core block, style only) + price-display + schema per the D-8 table (Product+Offer+returnPolicyCountry, aggregateRating/genuine reviews, ONE Product node; shop = BreadcrumbList + URL-only ItemList; drop FAQPage). All responsive 375/768/1440. NO static fake reviews (DMCC illegal — Trustpilot/verified-buyer only).
**Acceptance:** FR-30 acceptance criteria met + Bean R-22-13 visual sign-off at 3 breakpoints.

## Guardrails
- Build via PowerShell (`npm run build`), not Bash. Deploy whole block set + opcache-reset + verify served ?ver. Live-verify on the canary before declaring done (R-22-11).
- /qc-council (cross-model: sonnet + haiku + inline; Gemini account-blocked) before every converter/WC-write/SGS-block commit.
- WCAG 2.2 AA, mobile-first, 44px targets, 4.5:1 contrast. UK English everywhere.
- Outcome vs completion: code shipped ≠ outcome achieved. Don't mark a task done until its FR acceptance + Bean's eye pass.
~~~
