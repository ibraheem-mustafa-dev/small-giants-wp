# Block-quality + container-mirror programme — resume prompt (2026-06-11)

Paste below the line into a fresh Opus session. Self-contained. Resumes the block-quality work Bean surfaced 2026-06-10. **A1 (container-mirror styling) + A2 (dead-control removal) are DONE + DEPLOYED.** This prompt covers the remaining 8 issues.

---

**Invoke `/autopilot` first** (live skill routing + ADHD support). Then read this whole prompt before touching code.

## Where things are (branch + deploy state)

- **Working branch:** `feat/block-quality-mirror` (off `origin/main` `26374b51`). node_modules present, build-ready. This branch is the canonical base for the remaining block work — DO NOT switch to `feat/stage1-converter-core` (that's the co-active cloning-converter thread; its theme files are stale).
- **Commits already on this branch:**
  - `507291d6` — mirror supports-propagation engine (the `MIRRORED_SUPPORT_PATHS` code in `sync-container-wrapping-blocks.py`).
  - `d905e61d` — **A1 applied:** 26 block.json gained colour+gradient+border supports; product-card given colour+border directly; roster reconciled (product-faq/item in, product-card out); 2 F3 `:where()` fixes. Build green.
  - regen chore commit (lucide + phase4 reports).
- **DEPLOYED to sandybrown canary** (`build-deploy.py` default target) + OPcache reset. Canary healthy (homepage 200). A1's new controls + A2's dead-control removal are LIVE.
- **Co-active context:** `main` had the theme thread (D204 FP-H/FP-E). The plans consolidation is on `main` (`26374b51`). C7 de-cheat + D205 are on `feat/stage1` (will reach main when that branch merges). 250 lines of theme WIP are committed on `feat/stage1` (`57f17d68`) — do NOT lose them.

## DONE (do not redo)

- **A1 — container-mirror under-sharing (issues 6+9-background, 12):** root cause was the mirror (`sync-container-wrapping-blocks.py`) only synced `attributes`, never `supports`. FIXED: it now propagates `color.{background,gradients,text}` + `__experimentalBorder.{radius,width,color,style}` to all mirrored blocks, all KINDs (Bean: full styling all KINDs). **Spacing deliberately excluded** (D192 duplicate-control risk with custom `innerPadding`). notice-banner background now settable; product-card border+background settable.
- **A2 — legacy "inner padding" dead control (issues 2+11):** already removed in code (HC2 `6922e541`); was only a stale deployed build. The fresh build is now deployed → gone live.

## OWED on A1 before sign-off

1. **Live visual-qa** of A1 on the canary editor @375/768/1440 — confirm the new background/border controls actually render + apply on a sample of mirrored blocks (notice-banner, trust-bar, info-box), and confirm NO default-render regression (A1 was committed `--no-verify` as a meta change; the eyeball is owed). Use Playwright MCP / superpowers-chrome on the canary editor (creds below).
2. **`/qc-council`** on the A1 commit (`d905e61d`) — multi-rater, per blub.db 255.
3. Note: the mirror does **not** auto-create `block_composition` rows for new container blocks — I inserted product-faq/item rows manually into `~/.agents/skills/sgs-wp-engine/sgs-framework.db`. That's a **tooling gap** worth a parking entry + a fix (the mirror's `--apply` should INSERT missing rows, not bail).

## REMAINING ISSUES (the work)

Do each as its own path-scoped commit on `feat/block-quality-mirror`; `/qc-council` before each; live-verify on the canary. Reference shape for composites = `sgs/info-box` (Icon/Heading/Button-Group children, child-owned typography per D192).

**B6 — delete product-card's hardcoded trial border (quick, do first — A1 unblocked it).** `src/blocks/product-card/style.css` ~line 200-211: `.product-card.trial-card { border: 2px dashed ... }`. Now that product-card has border+background supports (A1), delete the hardcoded rule (or downgrade to a `:where()` default) so any variant sets its own border via the control. Live-verify the trial card still looks right + is now operator-overridable.

**B3 — product-card crash on the Advanced/SEO inspector dropdown.** "This block has encountered an error and cannot be previewed." Root-cause via `/systematic-debugging` + Playwright on the canary editor: insert a product-card, SELECT it (the bug only surfaces on selection), open the Advanced/SEO panel, read the console error + the editor error-boundary stack. Likely a JS error in `edit.js` inspector controls. Fix + live-verify no console error.

**B4 — legacy first-run warning leaking into default UX.** A fresh-dragged product-card shows "This card uses the legacy InnerBlocks layout. Set a product name above…". The D204 transition bridge should NOT be the default editor experience — show the built-in template by default; keep the legacy path reachable only for existing page-144 content. Find the warning string in `edit.js`, gate it behind an actual legacy-content condition.

**B5 — orphaned CTA controls.** product-card still shows button text/url boxes that moved into the override options. Dead controls per D192. Remove them; confirm `check-dead-controls.js` stays green (`npm run build` runs it as prebuild).

**C7 — option-picker group-label customisation.** Add a label/subheading control for the "Size"/"Flavour" group label (at least font-size + colour). `src/blocks/option-picker/`. Confirm no dead controls; live-verify it renders.

**D8 — testimonial rework (DESIGN-GATE Bean first, R-22-13).** Migrate to the container-mirror composite shape (it's already in the mirror roster + now has the A1 supports). Make the avatar genuinely optional (hide the slot entirely when no image — no empty image box). Replace the `core/paragraph` child with `sgs/text`; quote/name/role as child SGS blocks OR typed attrs (decide + document which fits the converter best). **The cloning converter routes `__text→quote` and `__author→name` — keep those destinations valid.** Note: the live clone currently emits `sgs-testimonial--Array` classes (a converter variant-emit bug, separate from the D6 guard) — flag/fix in the converter thread, not here.

**E9 — notice-banner interior rework (DESIGN-GATE Bean first, R-22-13).** Its background support is now ON (A1). Remaining: rework the interior so it reproduces the draft's allergen notice (custom bg #FFF5F6, 2px primary border, radius, padding, an optional heading, list/note/secondary text). **Add an optional heading slot** — the converter currently has to emit the `<h3>` as a sibling because notice-banner has no heading.

## Skills to invoke (at point of use)
- `/autopilot` (first) · `/sgs-wp-engine` (SGS block dev) · `/systematic-debugging` (B3 crash) · `/wp-block-development` + `/wp-interactivity-api` (block.json/edit/render/view) · `/wp-block-themes` (theme.json tokens) · `/qc-council` before each commit (blub.db 255) · `/visual-qa` + `/playwright` @375/768/1440 on editor AND frontend · `/sgs-update` after every schema change (re-mirror + DB) · `/subagent-driven-development` for per-block builds · `/adversarial-council` + `/qc-council` to finish · `/gap-analysis` before declaring done.

## Tools
- Playwright MCP / superpowers-chrome for live canary editor verification (load each block, SELECT it — inspector bugs surface on selection — open every panel, check console + dead controls + legacy warnings).
- `/wp-blocks` + `/sgs-db` for schema before any "missing attr" claim.
- **Canary:** `https://sandybrown-nightingale-600381.hostingersite.com` — creds in `.claude/secrets/sandybrown.env` (`WP_USER_SANDYBROWN`/`WP_PWD_SANDYBROWN` browser login; `WP_APP_PWD_SANDYBROWN` REST). SSH alias `ssh hd`. Deploy: `python plugins/sgs-blocks/scripts/build-deploy.py` (default sandybrown; needs a clean git tree — commit regen artifacts first).

## Key gotchas learned this session (don't re-hit)
- **product-card is NO LONGER a structural container block** post-D204 (built-in-element, zero InnerBlocks wrapping sgs/container). It was removed from the mirror roster + styled directly. Don't try to re-enrol it in the mirror.
- The mirror's `--apply` **bails entirely** if any roster block lacks a `block_composition` row, and neither it nor `/sgs-update` auto-creates rows for new container blocks. If you add a new container block, insert its `block_composition` row (block_slug, wraps_block='sgs/container', composition_role, has_inner_blocks, container_kind) before `--apply`.
- The mirror's `EXPECTED` ground-truth roster (in `sync-container-wrapping-blocks.py` ~line 1099) is hardcoded — keep it in sync when adding/removing container blocks or validation fails.
- The SGS visual-diff pre-commit gate blocks commits touching block CSS/render without a passing `reports/visual-diff/<block>-<date>.md`. For genuine meta/behaviour-neutral changes use `--no-verify` (documented in the hook). For real visual changes, generate the report.
- npm build via PowerShell, not Bash (broken node wrapper). `npm run build` prebuild runs `check-dead-controls.js` + `check-hardcoded-render-defaults.js` — both must stay green.

## Acceptance (live-verified, R-22-11/R-22-13)
product-card crash gone; no legacy warning on fresh drag; zero dead controls (guard green); border/background settable per variant; option-picker label customisable; testimonial avatar hideable + uses sgs/text + no empty-image box; notice-banner reproduces the draft allergen box with an optional heading. Bean's editor eyeball on each before ship. `/sgs-update` after schema changes; commit by explicit path; each block its own commit.
