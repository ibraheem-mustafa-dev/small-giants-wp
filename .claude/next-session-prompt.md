---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-11
thread: page-8 discrepancy programme — Fix 4 (labels: pill + fullWidth + block↔nested MIRROR) + Fix 9 (inline-styles investigation)
---

# NEXT SESSION — finish the page-8 programme: Fix 4 (labels) + Fix 9 (inline-styles investigation)

You are the SGS cloning-pipeline developer. D310 (product-card CTA mirror) shipped + LANDED + hover-verified this arc. Two items remain: Fix 4 (labels) and Fix 9 (inline-styles, read-only). Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D310) + `.claude/decisions.md` head (D310, D309, D308).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §2.9 Axis-1 layers, §3.A CSS routing (incl. §3.A.3b box-object accumulator + step-2 OUTER fallback + step-6 slug-validation), §3.B/§3.B.0 content branch, §13.3 content fork (FR-31-2.6 emit_shape), §13.5 preset-modifier detection, §13.6 composite-mirror + D294, §7b, the cheat catalogue.
3. Spec 32 §6.1 (box-object / no-inline) — for Fix 4 label render + the Fix 9 investigation.
4. `.claude/reports/2026-07-11-page8-discrepancy-diagnosis.md` — the register. **⚠ Its stated MECHANISMS have been WRONG on most fixes.** Item list ONLY; prove every cause LIVE first.
5. `.claude/plans/go-gentle-tulip.md` — the approved page-8 plan (Fix 4 design incl. the fullWidth parent-flex detection).

## ⛔ ANTI-PATTERN STOPs (carried forward + this session's — NEVER subtract, D101)
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (NEW, D310)** — verifying a cloned button/label/CTA colour = measure REST **and** HOVER (trigger with Playwright `.hover()`; dispatching mouseover does NOT apply `:hover`) and compare EVERY value to the DRAFT's exact rule — never resting-contrast-only. Bean caught D310 shipping a wrong hover + secondary border after I claimed success on contrast alone. A hidden third colour system is the usual culprit: a composite's OWN `style.css .block .sgs-x--y` rules (0,2,0) override the shared channel — enumerate matched rules (rest + `:hover`) to find which wins. (`feedback_verify_button_colour_hover_and_border_vs_draft_not_contrast_only`.)
- **STOP-CSS-VER-CACHE-BUST (NEW, D310)** — a `style.css`-only change is served STALE to any cached browser (incl. Playwright + real returning visitors) because the block stylesheet `?ver` is pinned to `block.json` version (registered via `register_block_type`). CDN clear + OPcache do NOT fix a cached browser; you must BUMP the block version (or switch to filemtime `?ver`) to change the URL. Render-side changes (block.json default → inline `<style>` in the page HTML) DO land fresh; FILE-CSS changes do not. Symptom: deployed file is correct (fresh `fetch(url,{cache:'no-store'})`) + the vars resolve right, but the live computed value is stale. (Extends STOP-CDN-STALE-CACHE.)
- **STOP-PARITY-NOT-A-MEASURE (D309)** — the computed-parity % (`computed-parity.js` / Stage 11.6) is NOT a fidelity measure (over-counts font-stacks + clone-only props). NEVER cite the aggregate number as an outcome. Signal = direct per-element computed-style matched by CONTENT + Bean's eye. (Extends STOP-48/49.)
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — when a mechanism depends on a naming convention, STANDARDISE it across the ecosystem FIRST, then build. A modifier (tier/state) is a SUFFIX on the base attr; recognise capability by whether the block DECLARES the attr (block.json source), never a name-guess.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — the register's stated causes are wrong on most fixes. Prove the cause on the live DOM (Playwright computed-style + matched-rule enumeration) OR a real-node converter trace (`recognise` + `build_block_markup` on the actual draft node) FIRST.
- **STOP-CDN-STALE-CACHE** — a block CSS change at an UNCHANGED `?ver` serves stale to a cached browser. Verify via `fetch(url,{cache:'no-store'})`; don't conclude the deploy failed. Always `hosting_clearWebsiteCacheV1` + OPcache before any live CSS measure.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib` (448 pass, 1 skip); `npm run build` (PowerShell — nvm4w shim broken in Git Bash; Python works in Bash).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy/reclone + OPcache + CDN clear (+ version bump if style.css changed, per STOP-CSS-VER-CACHE-BUST) + live computed-style.
- **STOP-static-vs-live** — for "does this class/style land?" use the LIVE DOM, never static PHP/CSS parsing.
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture. (D310 held: the `ctaStyle` lift was proven on the real trial-card node BEFORE claiming it fired — the first synthetic assumption was a no-op.)
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal, never per-block (R-31-9). **This is the Fix 4 crux — removing the label pill-gate so padding/bg paint on value-presence.**
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core's style engine if the property's definition lacks `css_vars`. Emit a form WP serialises (direct `var(...)` / concrete).
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette (undefined preset var → `currentColor` dark). Emit valid token / hex / honest gap.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / doesn't target Y / lacks Z" from a failed grep or inference. Verify against emitted markup / render code / block editor / live DOM first. (D310: a rater claimed `content_attrs_for_identity` returns `ctaStyle` — it does NOT, verified by running it; nearly a no-op.)
- **STOP-60** — a converter change adding new attrs to cloned output changes conformance goldens (property-based here — re-run the suite; re-seed deliberately + cited, never blanket).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; IGNORE header/footer + the accepted testimonial static-grid→slider.
- **STOP-67** — pre-commit visual-diff report per CHANGED block at repo-ROOT `reports/visual-diff/<block>-<date>.md` with frontmatter `verdict: PASS` + `first_paint_capture_passed: true` (the commit gate greps these; filename MUST be `<block>-<date>.md`, no extra suffix, or the block-name parse fails). `--no-verify` for logic-only with Bean's ok.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (heredoc-on-stdin gets consumed by hooks → empty message → abort; use a message FILE via `cat > file << 'EOF'`). `git add <file>` for NEW files; never `git add -A`. On Windows, commit via PowerShell if Bash git misbehaves. No version bumps / deprecations pre-production — EXCEPT a cache-bust patch bump when a `style.css`-only change must reach cached browsers (STOP-CSS-VER-CACHE-BUST; flag it to Bean). No co-author line. Verify branch + D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) before commit.
- **DB seed not in git** — a new block.json attr / `property_suffixes` row needs `/sgs-update --stage 1` (or a dated `migrations/*.py`) to reach the DB. `property_suffixes`/`modifier_suffixes` are seeded by dated migration scripts, NOT sgs-update.
- **One writer per file** — parallel coding subagents only across DISJOINT files; never 2+ concurrent writers on one file (cascade-fail). Read-only agents parallel freely. A SOLO coding subagent (or inline) is optimal for a coupled surface.
- **Re-clone command:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup "sites/mamas-munches/mockups/homepage/index.html" --auto-section --client mamas-munches --page homepage --media-map sites/mamas-munches/research/sandybrown-media-map.json --deploy-target page:8`. Deploy plugin first if render/CSS changed: `python plugins/sgs-blocks/scripts/build-deploy.py --skip-build --allow-dirty` (after `npm run build`).

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | Fix 4 design (the block↔nested mirror mechanics + the fullWidth detection) |
| `/gap-analysis` | grade before delivery |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | gold-standard reference if needed (auto-routes tier) |
| `/strategic-plan` | order Fix 4 sub-parts + the Fix 9 investigation |
| `/systematic-debugging` | prove each cause on the live DOM/real node before fixing |
| `/qc-council` | any shared-surface change (a shared label/render helper) before dispatch (blub.db 255) |
| `/qc-inline` | per-fix QC (Spec 31/32 compliance + no cheats + universal) |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | ground truth (block schema, box_family, css_property, presets) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | live computed-style + matched-rule enumeration + `.hover()` (THE landed gate) |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live CSS measure (user u945238940, domain sandybrown-…hostingersite.com) |
| REST app-pwd `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (env has unquoted specials — don't `source`) |

## Agents to Delegate To
| Agent | When |
|---|---|
| general-purpose (Sonnet) | solo coding subagent (one writer, named files) + read-only traces/raters (parallel) |
| feature-dev:code-reviewer | pre-commit cross-model review on any shared label/render helper |

---

## Task 1 — Fix 4: labels attribute-driven pill + fullWidth + the block↔nested MIRROR
**What:** the label renders wrong in two places that MUST be functionally identical (Bean-flagged): (a) the STANDALONE `sgs/label` block in the GIFT section (two hug-content padded capsules), and (b) a NESTED label element baked into the TRIAL PRODUCT CARD ("New? Start here", full-width). The nested version must be an **EXACT FUNCTIONAL MIRROR** of the block — the SAME pattern as D310's CTA↔`sgs/button` mirror.
**Why:** faithful label rendering + one consistent label capability whether standalone or nested, client-editable.
**Estimated time:** ~60–75 min (bigger than the earlier estimate — it now has the mirror dimension).
**Proven ground truth (from D310-arc investigation + `go-gentle-tulip.md`):**
- `sgs/label` render.php GATES padding (L250–284) + background (L142–144) behind `is-style-pill-fill`/`-wrap` (STOP-D228 structural gate). A cloned label has no pill class → bare eyebrow. The converter ALREADY transfers padding/bg/radius into the label's attrs (DB routing confirmed) — the render gate is what drops them.
- block.json defaults are NOT empty: `padding={top:4px,right:12px,bottom:4px,left:12px}`, `borderRadius=6`, `backgroundColour="primary"`. Pill styles registered in `includes/variations/sgs-label-variations.php`.
- **Full-width vs hug is EFFECTIVE (parent-flex aware), NOT the element's own `display`:** trial tag = a `<div>` (`inline-flex`) stretched by the flex-column `.sgs-product-card__body` → full-width; gift tags = `<span>` (`inline-block`) in a non-flex card → hug. Detect via the extract's computed `width` ≈ parent content-width (preferred, measurement-vs-eye), NOT the own `display`.
- **THE MIRROR (Bean, this handoff):** find how the trial product-card renders its nested label element vs how the standalone `sgs/label` renders — they must produce identical output. Same mechanism as D310 (a nested built-in element mirroring a standalone block). Read the block files (product-card render + `sgs/label` render) to see whether the nested tag reuses the label's render or duplicates it; make it a faithful mirror.
**The fix (design in `go-gentle-tulip.md`, verify LIVE first):**
1. **Render** ([label/render.php](../../plugins/sgs-blocks/src/blocks/label/render.php)): flip the `is_pill` gate on padding + background to a VALUE-PRESENCE check (paint when set). Add a `fullWidth` boolean → display logic: `fullWidth`→`display:block;width:100%`; else box present→`inline-block` (capsule); else `inline` (bare).
2. **block.json:** `padding` default `{}`, `borderRadius` `0`, **`backgroundColour` `""`** (critical — else every plain label paints a primary bg); add `fullWidth` boolean.
3. **edit.js:** ungate the bg picker + padding/radius controls; add a "Stretch to full width" toggle; keep pill presets as one-click value-seeders.
4. **variations:** make `pill-fill`/`pill-wrap` seed values, not gates.
5. **Converter:** verify (real-node trace) it transfers bg+padding+radius + emits NO `is-style-pill`; ADD `fullWidth` from the EFFECTIVE computed width (parent-flex aware). On page 8: trial → `true`, gift → `false`.
6. **The product-card nested label:** make it an exact functional mirror of `sgs/label` (the D310 mirror pattern — likely reuse the label's render/style so the trial tag == a standalone label).
**Orchestration:** `/brainstorming` (mirror mechanics + fullWidth detection) → `/qc-council` IF a shared label/render helper is touched → solo implementer → `/qc-inline`.
**Acceptance (live, 375/768/1440 — REST + any hover, per STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT):** trial "New? Start here" = padded rounded coloured highlight FULL-WIDTH across the card; gift labels = padded hug-content capsules; a genuinely-plain label = bare text (no accidental box); the nested trial label and a standalone `sgs/label` with the same settings render IDENTICALLY. Bump the label block version if a `style.css`-only change is made (STOP-CSS-VER-CACHE-BUST).

## Task 2 — Fix 9: inline-styles / Spec-32 investigation (read-only)
**What:** find every place page 8 still outputs inline `style="…"` PROPERTY declarations (Spec 32 forbids these), classify vs Spec 32 §6.1 (permitted = a CSS custom-property VALUE / the `sgsCustomCss` residual channel; violation = an inline property declaration), map each violation to its converter/render source, present a diagnosis-first register — Bean picks scope.
**Why:** Spec 32 no-inline contract; Bean's standing concern across the page-8 fixes.
**Estimated time:** ~30 min (read-only).
**Orchestration:** inline read-only Playwright enumeration → present register → Bean picks scope. NO fixing this session.
**Acceptance:** a classified register of live inline-style declarations with per-item source + Spec-32 verdict.

## Dependency graph
```
Fix 4 (labels — /brainstorm the mirror + fullWidth; ONE writer; deploy + reclone + version-bump-if-css + CDN clear + live REST+hover + visual-diff report + commit)
  ↓
DOC + SPEC update stage (Bean's directive — after each successful deploy: decisions.md + Spec 31/32 + state.md + /sgs-update DB)
  ↓
Fix 9 (inline-styles — read-only; present register; Bean picks scope)
  ↓
Close: /handoff + /capture-lesson + /sgs-update --stage 10 prune (drops the orphaned ctaPreset row from D310 + old prefix-hover/team-member rows from D309)
```

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Prove the cause on the LIVE DOM / real node before building (register mechanisms unreliable). NEVER cite computed-parity % as a measure.
- **Verify colour REST + HOVER, every value vs the draft — never contrast-only** (STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT). Enumerate matched rules (rest + `:hover`) to find the winning declaration + any hidden per-block `style.css` divergence.
- **A `style.css`-only change needs a `?ver` change to reach a cached browser** (STOP-CSS-VER-CACHE-BUST) — bump the block version; render-side inline `<style>` lands fresh. Deploy/reclone + OPcache + CDN clear BEFORE any measure (STOP-21).
- **The mirror pattern (D310 + Fix 4):** a nested built-in element that duplicates a standalone block should REUSE the shared mechanism, not diverge (composite-mirror R-31-9). The faithful values often live in a shared channel already — REMOVE the per-block divergence rather than lift more.
- Design-gate + `/qc-council` on shared-surface changes before building (blub.db 255). Every fix universal (R-31-9), no cheat, no unvalidated colour slug (STOP-COLOUR-SLUG-VALIDATION). Verify the LIVE painted value (STOP-44). Bean's eye co-authoritative (R-31-13).
- Branch appropriately; path-scoped commits (message FILE); no co-author line. `/qc-inline` per fix; end with `/handoff`.
- **Open policy question for Bean:** switch block-style `?ver` to filemtime so `style.css` redeploys auto-bust without a version bump. **Housekeeping:** MEMORY.md ~24.7KB (compact → MEMORY-archive.md).
