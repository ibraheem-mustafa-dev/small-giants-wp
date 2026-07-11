---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-11
thread: page-8 discrepancy programme — 3 remaining (Fix 5 universal hover, Fix 2 product-card CTA, Fix 4 labels)
---

# NEXT SESSION — finish the page-8 discrepancy programme (3 remaining)

You are the SGS cloning-pipeline developer. D307 (4 CSS-layer fixes) + D308 (sgs/text disclaimer box) shipped + LANDED this arc. Three converter/shared-surface fixes remain, each designed below. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D307+D308) + `.claude/decisions.md` head (D308, D307, D306).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §2.9 Axis 1 layers, §3.A CSS routing (incl. the D308 OUTER fallback at step 2 + slug-validation at step 6), §3 F-fork, §13.4 FR-31-5.2, §13.5 variant, §13.6 composite-mirror + D294, §7b, the cheat catalogue.
3. Spec 32 §6.1 (box-object / no-inline) — for any block styling work.
4. `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` — the register. **⚠ Its stated MECHANISMS were WRONG on 3 of 4 D307 fixes + Fix 6.** Use it for the item list ONLY; verify every cause on the LIVE DOM / a real-node converter trace before building (STOP-34, STOP-VERIFY-CLAIM).

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's)
- **STOP-REGISTER-MECHANISMS-UNRELIABLE (NEW, D307/D308)** — the page-8 register's stated causes were wrong on most fixes. NEVER build from the register's mechanism; prove the cause on the live DOM (Playwright computed-style + matched-rule enumeration) OR a real-node converter trace (`recognise_section` + `build_block_markup` on the actual draft node) FIRST.
- **STOP-CDN-STALE-CACHE (NEW, D307)** — a block CSS change at an UNCHANGED `?ver` serves stale to a browser that cached it (origin/CDN was fine). When a CSS change "doesn't land" live, verify via `fetch(url,{cache:'no-store'})` or force-reload the `<link>`; don't conclude the deploy failed.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (445 pass, 1 skip); `npm run build` (PowerShell — nvm4w shim broken in Git Bash; Python works in Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + **CDN clear (`hosting_clearWebsiteCacheV1`, user u945238940, domain sandybrown-…hostingersite.com)** + live computed-style at 375/768/1440.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, never static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture (a synthetic trace missed the disclaimer border-colour `:root` snap this session).
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT value is a CHEAT to REMOVE/GATE. Universal, never per-block (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core's style engine if the property's definition lacks `css_vars` (shorthand `border-color` drops `var:preset|color|`). Emit a form WP serialises (direct `var(...)` / concrete).
- **STOP-COLOUR-SLUG-VALIDATION (NEW, D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette; an undefined `var(--wp--preset--color--X)` → `currentColor` (dark). Emit valid token / hex / honest gap (Spec 31 §3 step 6). D306 bug class.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / doesn't target Y / the block lacks Z" from a failed grep or inference. Bean caught this repeatedly (find-out-more IS a button; iconSize IS universal; sgs/text ALREADY has bg/border attrs). Verify against emitted markup / render code / block editor / live DOM first.
- **STOP-60** — a converter change adding new attrs to cloned output changes conformance goldens. Re-run the suite; re-seed deliberately + cited, never blanket (D308 corrected 2 tests in-place, no blanket reseed).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; signal = direct Playwright content-matched computed-style + Bean's eye. IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md`; `--no-verify` for logic-only.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is not filtered.
- **Path-scoped commits** — `git commit -m <msg> -- <paths>`; `git add <file>` for NEW files; never `git add -A`. No version bumps / deprecations (pre-production). No co-author line. Verify branch + D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row / `ATTR_CLASSIFICATION_OVERRIDES` entry needs `/sgs-update --stage 1` (or a `migrations/*.py`) to reach the DB. `property_suffixes`/`modifier_suffixes` are seeded by dated migration scripts, NOT sgs-update.
- **One writer per file** — parallel coding subagents only across DISJOINT files; never 2+ concurrent writers on one file (cascade-fail). Read-only agents parallel freely. Haiku for mechanical, Sonnet/Opus for architectural.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (after `npm run build`).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | fix-shape design for the shared-surface changes (hover collector + helper; CTA button channel; label detection) |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference if needed (auto-routes tier) |
| `/strategic-plan` | order the 3 fixes + shared-surface design-gates |
| `/systematic-debugging` | prove each cause on the live DOM/real node before fixing |
| `/qc-council` | shared-surface fixes (converter collector / shared typography helper / shared button helper) before dispatch (blub.db 255) |
| `/qc-inline` | per-fix QC (Spec 31/32 compliance + no cheats + universal) |
| `/subagent-driven-development` `/dispatching-parallel-agents` | orchestrate (one writer per file) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (property_suffixes, css_property, box_family, block schema) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style 375/768/1440 + matched-rule enumeration (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on converter/shared-surface fixes |

---

## Task 1 — Fix 5: universal hover (Bean-directed)
**What:** cloned draft `:hover` typography (e.g. the announcement "Find out more" `.sgs-button:hover{text-decoration:underline}`) doesn't transfer. Make hover a UNIVERSAL capability.
**Why:** faithful hover on every cloned + authored element; future hover properties self-populate.
**Estimated time:** ~60–90 min (multi-part shared-surface build).

**Bean-directed design (do NOT deviate to a new route):**
1. **Modify the EXISTING collector** `styling_helpers.py collect_css_decls_for_element` to bucket `:hover`/state-pseudo decls: strip the pseudo → match the base element → return a HOVER bucket (like the existing `@media`/`bp_decls` bucket). It currently EXCLUDES `:hover` (`styling_helpers.py:~590`). This is Bean's "remove the exclusion in the current route".
2. **Universal across BOTH CSS families** (R-31-9 — Bean flagged this): the collector-based path (`styling_content.py`) AND the per-declaration dispatch resolvers (`typography.py`, fed by `css_pass`/`root_supports`). Both must carry the hover bucket → `*Hover` attrs. Do NOT fix only the collector.
3. **Deterministic DB derivation:** a `/sgs-update` derivation pass (or dated migration) that, for every `property_suffixes` row with `role IN ('typography','color')`, auto-derives a `{suffix}Hover` companion (same `css_property`, `role`) — generic loop, no hardcoded list (R-31-1). `Hover` already exists in `modifier_suffixes(kind='state')` but is unused; nothing consumes it today.
4. **Shared helper hover:** `helpers-typography.php sgs_typography_css_rule` gains a hover pass — read `{prefix}{Prop}Hover` attrs, emit a `:hover` rule on the selector (mirror the base read at lines ~61-132). Base text-decoration/font-style ARE already emitted; only hover is missing.
5. **Editor controls:** `TypographyControls.js` exposes text-decoration + text-transform + letter-spacing + hover (currently only font size/weight/style/line-height).
6. **Wire button to the helper:** `sgs/button/render.php` currently HAND-ROLLS typography (base decls ~289-300 + responsive ~365-391) — replace with `sgs_typography_css_rule($attributes,'', ".{$uid}.sgs-button")` so it inherits hover for free (its attr names already match).

**Orchestration:** `/brainstorming` fix-shape + `/qc-council` (shared collector + helper) BEFORE build; then solo implementer(s) one-writer-per-file (DB migration ‖ helper.php ‖ button.php ‖ editor.js are disjoint; the collector + typography.py + css_pass are the coupled converter core — one implementer). `/qc-inline` after.
**Depends on:** merge D308 first (Fix 5 touches `styling_helpers.py` + `css_pass.py` which D308 changed).
**/qc gate after:** yes — `/qc-inline` (Spec 31 §3.B.0 universality + §3 step 5 + Spec 32).
**Acceptance:** announcement "Find out more" shows the draft's underline-on-hover LIVE; a NON-button block's hover typography also works (regression-verify one); the `{suffix}Hover` rows exist in `property_suffixes` (DB check); button renders via the shared helper.

## Task 2 — Fix 2: product-card CTA = full button capability
**What:** the featured-card CTA renders white-text-primary, the trial-card CTA renders primary not the draft's secondary. The CTA is a NESTED composite element (`product-card` renders it), not a real `sgs/button` block, so it's hard-set.
**Why:** faithful CTA styling + full client customisation (variant + raw colour, editor + pipeline).
**Estimated time:** ~45–60 min.
**Design:** make the product-card CTA mirror `sgs/button`'s capability via the shared button-preset channel (`--wp--custom--button-presets--*` / `sgs_button_element_style_css`) — NOT the private `--sgs-product-card-btn-text,#ffffff` channel (that divergence is the R-31-9 cheat). Render emits `sgs-button--{$sgs_cta_preset}` at the 5 hardcoded `sgs-button--primary` sites (530/1141/1157/1484/1500; the `$sgs_cta_preset` var already exists, only drives a data-attr today); converter lifts the child button's `--variant` BEM modifier → `ctaPreset` (`db_lookup.inherit_style_presets()` → {primary,secondary,outline}) + a raw hex when no preset. Editor exposes both.
**Orchestration:** `/brainstorming` + `/qc-council` (shared button channel) → solo implementer. **Acceptance:** featured CTA dark-on-token, trial CTA secondary, a custom-hex CTA renders that hex; live 375/768/1440.

## Task 3 — Fix 4: gift + trial labels padded pill box
**What:** gift + trial labels clone as bare eyebrows, not the draft's padded rounded capsules. `sgs/label` padding is structurally PILL-GATED (`label/render.php:96-107` — paints only for `is-style-pill-fill`/`is-style-pill-wrap`).
**Why:** faithful label rendering.
**Estimated time:** ~30–45 min.
**Design:** converter detects a padded-box label (draft bg+padding+radius) → sets the pill block-style (`is-style-pill-fill` full-width trial / `is-style-pill-wrap` capsule gift) + transfers the real padding/bg/radius values (block-style IS required — padding structurally gated to it).
**Orchestration:** `/brainstorming` fix-shape (label detection) → solo implementer. **Acceptance:** trial label full-width padded, gift labels padded rounded capsule, live.

## Dependency graph
```
Merge D308 (feat/text-box-and-universal-hover → main) FIRST
  ↓
Task 1 (Fix 5 hover — coupled converter core solo; DB/helper/button/editor disjoint parallel; /qc-council before build)
  ↓ /qc-inline + LAND
Task 2 (Fix 2 CTA — /qc-council before build) ‖ Task 3 (Fix 4 labels — /brainstorm)
  ↓ deploy + reclone + verify 375/768/1440 + visual-diff reports
Commit each (path-scoped) → merge to main
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building (register mechanisms are unreliable — STOP-REGISTER-MECHANISMS-UNRELIABLE).
- Deploy/reclone + OPcache + **CDN clear** + live computed-style BEFORE any measure (STOP-21); force fresh CSS if a change seems not to land (STOP-CDN-STALE-CACHE).
- Design-gate + `/qc-council` on shared-surface changes (converter collector / shared typography helper / shared button helper) before building (blub.db 255).
- Every fix universal (R-31-9), no cheat (Spec 31 catalogue), no unvalidated colour slug (STOP-COLOUR-SLUG-VALIDATION). Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13). Never assert a fact from a failed grep/inference (STOP-VERIFY-CLAIM).
- Branch appropriately; path-scoped commits; no version bumps / deprecations; no co-author line. `/qc-inline` per fix; end with `/handoff`.
