# Client-controls track — swept from LEDGER.md 2026-09-03

Verbatim, at the point the track closed. Kept because the LEDGER is byte-capped and this
track is CLOSED; the live pointer lives in LEDGER.md. Detail also in D904-D913, D915, D916.

## ▶ CLIENT-CONTROLS TRACK — 2026-09-02: Waves 6+7 committed, deployed to sandybrown, live-verified

**Detail: D904-D913, D915, D916 (this session's close-out), PR #36 (Wave 5). Design
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 carries full build status +
per-piece comparison against the plan, §18 the panel design. Approved build plan + per-piece
review notes: `.claude/plans/media-element-tingly-stallman.md`. Method rules: STOP-CATALOGUE
**E19** + both CLAUDE.mds. Do not restate history here.**

✅ **All 16 atoms are now adopted by all six in-scope blocks, committed, deployed, and
live-verified.** Wave 5 (`sgs/media`, `sgs/before-after`) merged to `main` at `13286fc69` (PR
#36). Wave 6 (five quality gates) and Wave 7 (`hero`, `container`'s `BackgroundPanel`,
`decorative-image`, `product-card` + `product-card`'s data migration) — committed at `e6acd82d8`
(2026-09-01), pushed. This session (2026-09-02): deployed to sandybrown (`59f86b451`, after
baselining two real deploy-gate findings — see below) and live-verified in the real block editor
+ published pages:
- **`decorative-image`** (probe page 2900) — object-fit/focal-point/overlay all read/write
  correctly; disclosure logic (focal-point/overlay fields disabled until object-fit crops /
  overlay colour is set) reacts live to a real attribute write.
- **`hero`** (probe page 2334 "T3 hero split probe") — the two published instances holding only
  the OLD `splitImage`/`splitSvgMobile` legacy shape confirmed rendering an EMPTY split-media slot
  on both the published page AND the editor canvas (the accepted R-31-14 consequence, confirmed in
  practice not just theory); media-type tabs (Image/Video/SVG, all 3 device tiers) confirmed
  reachable with no image uploaded (closes the `splitImage?.url`-gating bug by construction);
  overlay colour/opacity/blend-mode controls present and interactive. ⚠ **Superseded 2026-09-02
  (D919):** post 2334 (along with 5 other live posts, including the homepage 2742) has since been
  migrated onto the decomposed `splitImageId`/`Url`/`Alt` shape and no longer carries the old
  composite attrs at all — this bullet describes the PRE-migration state, kept for narrative
  history, not the current live state.
- **`container`'s `BackgroundPanel`** (page 2242 "Tier fixture — maxWidth", `cta-section` sampled
  as representative of the 7 non-hero consumers sharing `class-sgs-container-wrapper.php`) —
  Image tab confirmed pixel-identical: pre-existing overlay opacity (30) and colour value
  preserved unchanged; new Video/SVG tabs present and wired.
- **`product-card`** (page 3046, typed mode) — "Image Controls" panel (object position
  focal-point picker + object-fit dropdown + max-width + height-unit) confirmed present and
  functional with correct default values; legacy `imageHeight` plain-string shape confirmed
  round-tripping (shows "220px" placeholder). Bound mode not independently re-clicked this
  session — same shared atom mechanism as typed mode, lower marginal risk, not exhaustively
  re-verified.
- **Migration survey** — `migrate-product-card-image-id.py --survey` run against a full dump of
  every sandybrown page+post (161 files via REST `context=edit`): 9 candidates, 8 matched real
  attachments, 1 NO-MATCH (post 1601 "F3 Oracle sgs-product-card" — a converter golden-test
  fixture with a fabricated `/products/lactation-cookies.jpg` path, never a real upload; correctly
  left unresolved). Reviewed by hand; no `--fix --apply` run (no client sites exist yet on this
  framework — the discipline is precautionary).

⛔ **Two real deploy-gate findings surfaced and were baselined, not worked around** — both are the
DIRECT, predicted consequence of the R-31-14 strict-no-fallback decision, not new bugs:
`oldshape-audit` flagged post 2334's stranded `splitSvgMobile` (WP will strip it on next editor
save — non-lossy, the atom system never read it); `audit-block-file-consistency` flagged 5
`sgs/hero` orphan-attr findings — `splitImage`/`splitImageMobile` (deliberately kept declared for
the cloning pipeline per D915 — ⚠ **superseded 2026-09-02, D919: the pipeline's routing was
re-anchored off these two onto the real `splitMediaType` attrs, and they are now DELETED from
block.json, not baselined-debt any more**) and `splitMediaObjectPosition`(+Tablet/Mobile) (a
dynamic-key false positive — genuinely live via `SGS_Media_Element::style()` server-side and
`HeroSplitMediaPanelLayout`'s `prefix="splitMedia"` control client-side, matching this project's
existing dynamic-key baseline convention). Both baselined with full evidence in
`oldshape-audit-baseline.json` / `block-file-consistency-baseline.json`, committed at `59f86b451`.
A THIRD gate (deploy-ownership) also fired — the live canary carried `3c213dd4`
(`feat/media-panel-wave5` branch tip, deployed 2026-09-01 for pre-merge live QA), not an ancestor
of `main` because Wave 5 SQUASH-merged at `13286fc69`. Verified (not assumed) the squash-merge is
a strict superset — `git diff 3c213dd4 HEAD -- .../BooleanResponsiveControl.js` shows only a
docblock type-annotation difference, the real fix is present — before using `--takeover`.

⛔ **A real cross-subsystem conflict surfaced and was resolved, not worked around.** The plan's
read-time legacy-fallback pattern (already shipped for `sgs/media`'s `thumbnail` and
`sgs/before-after`'s `sgsObjectFit`) collided with a rule `hero` was ALREADY hardened against
(R-31-14, 2026-08-13: no legacy fallbacks, nothing to migrate pre-production). Bean chose the
strict reading. That in turn broke the CLONING PIPELINE's scalar-media role assignment for a
future hero clone (a genuinely different, active subsystem) — Bean chose to fix it properly:
`scripts/converter/services/assembly.py` + `scripts/converter/db/db_lookup.py` now translate the
lift's composite `{id,url,alt}` value into the atom system's own attribute triple at write time,
verified against the full 727-test converter suite. Full account:
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 Wave 7, `hero` entry.

**NEXT — nothing queued.** Commit, deploy and live-verification are DONE (that prompt was deleted on completion, per the supersede-and-remove rule). Three items are deliberately DEFERRED, not forgotten, and were NOT re-opened this
session (live-verification found no real problem triggering any of them) — `hero`'s motion
CSS-emission (stays hero-private, a live clip/specificity risk unverified), `container`'s Image
tab (untouched by design, kept minimal on a shared component), `product-card`'s `box-shape`
adoption (a real CSS-specificity conflict against this block's own hardcoded height fallback,
still needs the load-order test named in the prompt — not run this session, remains open if
anyone wants `box-shape` on this block later). Bound-mode `product-card` (buybox configurator)
was not independently re-clicked this session — flagged above, not a blocker.

⛔ **SCOPE now closed — all SIX blocks done:** media, before-after, hero, container,
decorative-image, product-card. **A BACKGROUND IS NOT A MEDIA ELEMENT** — a block with a
background gets it from the shared `BackgroundPanel`; `site-header`/`site-footer` have nothing to
do with this work (their OWN `BackgroundPanel` mount got the video-tab fix as a side effect of
`container` owning the shared mechanism, not because they're separately in scope). `trust-bar` +
`brand-strip` have real nested media but remain LIMITED follow-on, not started.

