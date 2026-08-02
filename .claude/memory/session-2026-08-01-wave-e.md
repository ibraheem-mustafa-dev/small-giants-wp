# Wave E — Track 3 narrative, swept from LEDGER.md on 2026-08-02

Superseded as the live front by Wave D (D459/D460/D463). Kept verbatim for the per-item
verification state, which the LEDGER no longer carries.

### Track 3 (previous) — WAVE E EXECUTED 2026-08-01 (D447–D454, D457)

**16 agents, 21 commits, deployed and verified on the canary.** Verification state is stated PER
ITEM — read it, do not assume a uniform "done".

| Verified LIVE against the SHIPPED bundle | Built, NOT yet live-verified |
|---|---|
| **Morph** — had NEVER animated on ANY block (D452). Attrs sat on the `<svg>` wrapper; MorphSVG refuses a container. Now on the inner `<path>`; `d` travels circle→square, 150 mid-flight samples | `:user-valid` cascade fix (D457 part 2) — proven on a bare-input fixture, not a real `sgs/form` |
| **Motion-path** (D451) — animated once per page load; `onLeave` disabled the trigger whose own `onEnterBack` was the only re-enable. 54/54 matched positions agree across two passes × 3 viewports | Focus-ring `color-mix` at a non-default opacity on a live client page |
| **Keyboard focus reveal** (D453) — pinned/scrubbed content left focusable controls invisible. Fixed in `fx-pin-scrub` (ticker hold), `fx-scrub` (ticker hold), `fx-split-reveal` (**one-shot — no scrub, so no race; deliberately NOT the same shape**) | `fx-scrub`/`fx-split-reveal` probes against the shipped bundle after the final deploy |
| **Focus ring** (D454 + D457) — `opacity` dimmed the WHOLE field including typed text; ring colour was 2.25:1. Now `color-mix` on the outline + `primary-dark` default, clearing 3:1 on all 8 palettes | |
| **Per-tier motion disable** — attrs were emitted and read by NOTHING. Gated at `bootEffect`. At 375px the control block ran 0→0.86 while the disabled one held at 1 (fail-open confirmed) | |
| **Contrast** — placeholder via colour not opacity; muted text ≥4.5:1 on `surface` AND `surface-alt`, all 8 clients; axis files synced so a regeneration cannot revert it | |
| **Grid fold** — `content-collection` → `card-grid` via ONE shared engine, not a copy. Old block still registered and running the same engine, so migrated and unmigrated pages cannot diverge | |
| **Buybox drag** — 1:1 pointer tracking (30→30, 60→60, 90→90), clamps at 96 | |
| **Deploy⇄commit deadlock** broken via `--payload`; **fx panel lint gate** now covers 12 panels | |

**Two results worth more than the fixes themselves:**

- **`fx-horizontal-panel` has NO defect — because a CSS BUG is accidentally providing the rescue.**
  `overflow-x: clip` paired with a non-clip `overflow-y` computes to `hidden`, which IS a scroll
  container, so the browser's native scroll-into-view rescues focus. The module docblock claimed the
  opposite. ⛔ **Do NOT "fix" it to clip on both axes** — that silently deletes the only WCAG 2.4.11
  cover this effect has. Documented in `assets/css/fx-horizontal-panel.css`; regression probe proven
  non-vacuous (forcing genuine clip makes it report FAIL).
- **The WooCommerce gallery bug did not exist.** The canary's `core/query include:[540]` silently
  rendered product **1125** (the newest), whose gallery is genuinely empty. The blocks were correct
  throughout. Trap recorded in `plugins/sgs-blocks/CLAUDE.md` gotchas.

⚠ **8 defects surfaced this session; FIVE were in the MEASURING, not the code.** A regex matching
letters where the values were digits · a DB query assuming a name prefix · a `head -4` hiding
exactly the four rows that mattered · a grep for a literal against a CSS-variable-driven rule (the
offending line was in my own earlier output) · two lint runs that could not fail. None became a
false report only because something checked a second way. **New STOP entries: `STOP-CATALOGUE.md`.**

⛔ **PRODUCTION IS BLOCKED, DELIBERATELY.** `--target palestine-lives` aborts on `oldshape-audit`:
**29 NEW HIGH findings across 28 posts** (real audit output captured at
`reports/2026-08-01-palestine-lives-oldshape-blocker.md` — the handoff QC gate correctly flagged that
this figure was prose-only behind a hard blocker; a number nobody can re-check is not evidence) — live `sgs/hero` blocks carry `ctaPrimaryText`/`ctaPrimaryUrl`
/`ctaSecondaryText`/`ctaSecondaryUrl` that the current block.json does not declare, so **the next
editor save DELETES them** (the D338 class), plus old self-closing blocks whose renderer now expects
InnerBlocks (stranded `headline`, `subHeadline`). Bean approved the production deploy WITHOUT
knowing this existed. `scripts/wp-migrate-oldshape-blocks.js` (dry-run by default) must run first,
with its output in front of him. **The canary is current; production is one build behind and keeps
the field-dimming bug until this is done.**

### Track 2c — header/footer rows + fluid gap: DONE, all live-verified (D455, D456)

Full narrative + lessons: **`memory/session-2026-08-02-track2c.md`**. Commits `18e504b9` `de769386`
`1a747da4` `45f05c2c` `c5327603` `5db76872` `01ee633a`.

Header row never stacks (sweep 109/109, Bean's eye GIVEN). Footer columns are a CEILING, not a
count. Fluid header gap live: served CSS carries the clamp intact, computed gap varies 16px→8.8px,
all on `.sgs-container__inner`. Shared `sgs_css_length_value()` accepts `clamp/min/max/calc/var`
(53/53) and closed a real hole — breakouts hidden INSIDE an allowlisted call. `layout` gained
`enum:[flex,grid]` on both rows so WP coerces a bad value rather than letting `cqi` resolve against
the wrong container. Every dead Spec-17 citation retargeted.

**D462 closed the last item — the object-model path now shares the validator.** Both the flat-scalar
and object paths run one grammar; `repeat` was restored to the allowlist first, because routing
naively would have rejected every `grid-template-columns` in the framework including D456's live
footer value. Verified after deploy: footer grid transitions 1160/1020/860/760px with ZERO overflow
across 109 widths; header gap 16px→8.8px on `.sgs-container__inner`. The `layout` enum is deployed.
**Nothing outstanding on this track.**

