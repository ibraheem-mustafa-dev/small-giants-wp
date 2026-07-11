---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-11
thread: page-8 discrepancy programme — Fix 2 (CTA), Fix 4 (labels), Fix 9 (inline-styles investigation)
---

# NEXT SESSION — finish the page-8 programme: Fix 2 + Fix 4 + the inline-styles investigation

You are the SGS cloning-pipeline developer. D309 (universal hover) shipped + LANDED this arc, plus Part F editor controls + a team-member duplicate-control cleanup. Two page-8 fixes + one investigation remain. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D309) + `.claude/decisions.md` head (D309, D308, D307).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §2.9 Axis-1 layers, §3.A CSS routing (incl. §3.A.4a state re-append + §3.A step 2 OUTER fallback + step 6 slug-validation), §3 F-fork, §13.4 FR-31-5.2, §13.5 variant, §13.6 composite-mirror + D294, §7b, the cheat catalogue.
3. Spec 32 §6.1 (box-object / no-inline) — for the Fix 9 inline-styles investigation + any block styling work.
4. `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` — the register. **⚠ Its stated MECHANISMS have been WRONG on most fixes.** Use it for the item list ONLY; verify every cause on the LIVE DOM / a real-node converter trace before building.
5. `.claude/plans/go-delegated-scroll.md` — the approved plan (Fix 2 + Fix 4 verified designs).

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-PARITY-NOT-A-MEASURE (NEW, D309)** — the computed-parity % (`computed-parity.js` / Stage 11.6) is NOT a fidelity measure (over-counts font-stacks + clone-only props). NEVER cite the aggregate number as an outcome. Signal = direct per-element computed-style matched by CONTENT + Bean's eye. (Extends STOP-48/49.)
- **STOP-STANDARDISE-NAMING-FIRST (NEW, D309)** — when a mechanism depends on a naming convention, STANDARDISE the naming across the ecosystem FIRST, then build the mechanism (the 17-block hover rename unlocked zero-per-convention converter routing). A modifier (tier/state) is a SUFFIX on the base attr; recognise capability by whether the block DECLARES the attr (block.json source), never a name-guess/derivation.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — the register's stated causes are wrong on most fixes. Prove the cause on the live DOM (Playwright computed-style + matched-rule enumeration) OR a real-node converter trace (`recognise` + `build_block_markup` on the actual draft node) FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale to a cached browser (origin/CDN fine). Verify via `fetch(url,{cache:'no-store'})` or force-reload; don't conclude the deploy failed. Always `hosting_clearWebsiteCacheV1` + OPcache before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (448 pass, 1 skip); `npm run build` (PowerShell — nvm4w shim broken in Git Bash; Python works in Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN clear + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, never static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal, never per-block (R-31-9). (This is the Fix 4 crux — removing the label pill-gate.)
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core's style engine if the property's definition lacks `css_vars`. Emit a form WP serialises (direct `var(...)` / concrete).
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette (undefined preset var → `currentColor` dark). Emit valid token / hex / honest gap.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / doesn't target Y / lacks Z" from a failed grep or inference. Verify against emitted markup / render code / block editor / live DOM first.
- **STOP-60** — a converter change adding new attrs to cloned output changes conformance goldens (property-based here, not snapshots — but re-run the suite; re-seed deliberately + cited, never blanket).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md`; `--no-verify` for logic-only (editor-only / pure rename / redundant-attr removal) with Bean's ok.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (heredoc-on-stdin gets consumed by hooks → empty message → abort; use a message FILE). `git add <file>` for NEW files; never `git add -A`. On Windows, commit via PowerShell if Bash git misbehaves (captured lesson). No version bumps / deprecations (pre-production). No co-author line. Verify branch + D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB. `property_suffixes`/`modifier_suffixes` are seeded by dated migration scripts, NOT sgs-update.
- **One writer per file** — parallel coding subagents only across DISJOINT files; never 2+ concurrent writers on one file (cascade-fail). Read-only agents parallel freely. A SOLO coding subagent (or inline) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (after `npm run build`).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | fix-shape design for the shared-surface changes (Fix 2 CTA channel; Fix 4 label ungate) |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference if needed (auto-routes tier) |
| `/strategic-plan` | order Fix 2 + Fix 4 + the Fix 9 investigation |
| `/systematic-debugging` | prove each cause on the live DOM/real node before fixing |
| `/qc-council` | shared-surface fixes (Fix 2's shared button channel) before dispatch (blub.db 255) |
| `/qc-inline` | per-fix QC (Spec 31/32 compliance + no cheats + universal) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, box_family, css_property, presets) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style + matched-rule enumeration (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940, domain sandybrown-…hostingersite.com) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on the shared button channel |

---

## Task 1 — Fix 2: product-card CTA = full button capability
**What:** the featured-card CTA renders white-text-primary, the trial-card CTA renders primary not the draft's secondary. The CTA is a nested built-in element (`product-card` renders it), hard-set to `sgs-button--primary`.
**Why:** faithful CTA styling + full client customisation (variant + raw colour, editor + pipeline).
**Estimated time:** ~45–60 min.
**Verified design (Explore-confirmed):** render emits `sgs-button--{$sgs_cta_preset}` at the 5 hardcoded `--primary` sites ([product-card/render.php](../../plugins/sgs-blocks/src/blocks/product-card/render.php) L530/1141/1157/1484/1500; `$sgs_cta_preset` defined L361-363, today only a data-attr). Purge the private `--sgs-product-card-btn-text,#ffffff` divergence from **product-card/style.css** (L246, NOT render.php — the R-31-9 cheat + WCAG footgun). Converter: extend the foreign-identity arm ([walk.py](../../plugins/sgs-blocks/scripts/converter/walk.py) L295-324, lifts only ctaText/ctaUrl today) to lift the child anchor's `sgs-button--{preset}` modifier → `ctaPreset` (via `db_lookup.inherit_style_presets()`) + a raw hex → `ctaColour*`. block.json already has `ctaPreset` (L144) — **reconcile the overlapping `ctaStyle` attr (L290) first** (design-gate). Spec fit: §13.6 FR-31-21.1 composite-mirror + §13.5 preset-modifier detection (D252).
**Orchestration:** `/brainstorming` (incl. ctaPreset/ctaStyle reconciliation) + `/qc-council` (shared button channel) → solo implementer → `/qc-inline`.
**Acceptance (live, direct computed-style — NOT parity %):** featured CTA dark-on-token, trial CTA secondary, a custom-hex CTA renders that hex; no WCAG contrast regression.

## Task 2 — Fix 4: labels attribute-driven pill (Option B, research-settled)
**What:** gift + trial labels clone as bare eyebrows, not the draft's padded rounded coloured capsules. `sgs/label` render GATES padding+bg behind `is-style-pill-*` (a STOP-D228 structural gate).
**Why:** faithful label rendering + standard attribute-driven setup (Bean-directed; `/research-check` confirmed no mature library gates whether the pill paints — always-on base styling, variants only for colour/shape).
**Estimated time:** ~45 min.
**Locked design (Option B):** ungate painting in [label/render.php](../../plugins/sgs-blocks/src/blocks/label/render.php) (flip the `strpos(is-style-pill)` gate at L96-100/142-144/250-284 to a value-presence check); set block.json `padding`/`borderRadius` defaults to empty/`0` so a plain label stays box-free; keep pill-fill/pill-wrap as editor PRESETS that seed values (not gates); converter transfers the real draft bg+padding+radius (+display/width) straight into attrs — NO `is-style-pill` emit. Verify `sgs/label` `property_suffixes`/`block_attributes` route `border-radius→borderRadius` + `padding→padding` object via `/sgs-db` first. Spec fit: §3.A + Spec 32 §6.1 (no-inline).
**Orchestration:** `/brainstorming` (mechanics) → solo implementer → `/qc-inline`.
**Acceptance (live):** trial + gift labels render the draft's padded rounded coloured capsules; a genuinely-plain label still renders as bare text (no accidental box).

## Task 3 — Fix 9: inline-styles / Spec-32 investigation (Bean-raised)
**What:** investigate the remaining inline-styles issue Bean raised across all these page-8 fixes.
**Why:** Spec 32 (no-inline contract) — surface where cloned/authored output still renders inline `style="…"` property declarations.
**Estimated time:** ~30 min (read-only first).
**Approach:** read-only — enumerate live inline `style` declarations on page 8 (Playwright), classify each against Spec 32 §6.1 (which are permitted vs which are contract violations), map each violation to its converter/render source. Present a diagnosis-first register (Problem/Effect/Solution) BEFORE proposing fixes. Do NOT fix inline; scope it.
**Orchestration:** inline read-only investigation → present register → Bean picks scope.
**Acceptance:** a classified register of live inline-style declarations with per-item source + Spec-32 verdict.

## Dependency graph
```
Fix 2 (CTA — /qc-council before build)  ‖  Fix 4 (labels — /brainstorm)   [disjoint blocks, but ONE writer each]
  ↓ each: deploy + reclone + OPcache + CDN clear + live computed-style + visual-diff report + commit (path-scoped)
Fix 9 (inline-styles investigation — read-only, present register)
  ↓
Close: /handoff + /capture-lesson
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building (register mechanisms unreliable). NEVER cite computed-parity % as a measure.
- Deploy/reclone + OPcache + CDN clear + live computed-style BEFORE any measure (STOP-21); force fresh CSS if a change seems not to land (STOP-CDN-STALE-CACHE).
- Design-gate + `/qc-council` on shared-surface changes (the shared button channel) before building (blub.db 255).
- Every fix universal (R-31-9), no cheat, no unvalidated colour slug (STOP-COLOUR-SLUG-VALIDATION). Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13). Never assert a fact from a failed grep/inference (STOP-VERIFY-CLAIM).
- Branch appropriately; path-scoped commits (message FILE, not heredoc); no version bumps / deprecations; no co-author line. `/qc-inline` per fix; end with `/handoff`.
- **DB housekeeping:** a `/sgs-update --stage 10` prune clears the orphaned prefix-hover + team-member rows left from D309 (non-blocking; do it opportunistically).
