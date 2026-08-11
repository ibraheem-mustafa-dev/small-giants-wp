---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-11
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-11 (session 10). The flat-to-object responsive migration is CLOSED.**

- The last 4 padding-family settings (hero's content padding, option-picker's pill padding,
  label's padding, and the shared `contentBandPadding` used by 7 blocks including the header and
  footer) are now all stored the tidy way — one nested setting instead of three separate ones.
- Every place that WRITES those settings (the editor controls) was checked and fixed in the same
  pass — the class of bug that bit this migration twice before (a control still writing the old
  shape, silently losing the value) does not recur here.
- Proved it live on the real site: set values through the actual editor, saved, reloaded, checked
  the stored data — then checked all 10 (setting × block) combinations render correctly on the
  actual page at both desktop and mobile sizes. All matched exactly.
- One unrelated leftover found while re-checking: `sgs/team-member`'s photo setting has a similar
  but different shape (art-direction image tiers, not padding) — flagged, not touched, not part of
  this migration.
- **This session ran concurrently with another session doing unrelated background-image work on
  some of the same files.** Nothing was lost or broken, but it caused three real close calls
  (branch got switched underneath me, a commit picked up their live edits, a test page confused
  their deploy check) — all caught by existing safety checks, all resolved with your sign-off.
  Full detail in `decisions.md` D580 if it's useful context for future sessions on a shared repo.

## ✅ Flat-to-object responsive migration — COMPLETE

All properties that were flat per-device scalars/boxes (`X`/`XTablet`/`XMobile`) are now nested
`{desktop,tablet,mobile}` objects: `gap` (D563), `maxWidth`+`contentWidth` (D568),
`gridTemplateColumns`+`gridTemplateRows` (D569/D570), `columns` (D578), and this session's close —
`contentPadding`/`pillPadding`/`padding`/`contentBandPadding` (D580).

**Verified via `npm run survey:responsive-shape --json` post-migration:** 1 genuine residual found
(`sgs/team-member.photo`, a media art-direction tier — different shape, different migration,
correctly out of scope). `orphan_tier` bucket (94 entries) re-confirmed as classifier noise from
already-migrated properties, not a hidden candidate list.

**Known, unrelated, unscheduled residual:** `sgs/card-grid`'s `maxWidth`/`contentWidth` are still
`type:string` (pass-2 residual, D568). Not touched this session.

**Do not reopen this migration without a genuinely new finding** — the tool gap this session found
(`migrate-tier-object.py` can't classify a box-typed-but-flat-tier base) is documented in
`plugins/sgs-blocks/CLAUDE.md` and does not need fixing for a shape this small; extend it only if
a 6th shape turns up.

---

## Operational incidents this session — read before any future shared-checkout session

Three close calls, all caught by existing structural defences, none destructive. Full detail:
`decisions.md` D580. Summary:

1. **A concurrent session checked out its own branch in this SAME working directory mid-session,**
   silently carrying this session's uncommitted work along with it. `main` itself was never
   touched, so recovery was lossless — but re-check `git branch --show-current` far more often
   than "before every commit" on a shared checkout; check it after any long tool-heavy stretch too.
2. **`git commit -m "..." -- <pathspec>` re-reads the CURRENT working tree at commit time**, not
   whatever was `git add`-ed earlier. With a concurrent session actively rewriting a shared file,
   two commit attempts picked up two different live states. The visual-diff gate's `source_sha`
   staleness check caught both. Fix: compute the SHA from the INDEX immediately before commit, in
   the same shell step, not as a separate earlier check.
3. **A fixture/test page published to the shared canary can look like a schema regression to a
   different session's deploy-time content audit** if that session hasn't pulled the matching code
   yet. Resolved by finishing the commit+push promptly and deleting the fixture page once its job
   was done.

---

## Methodology guardrails (do not skip, next session too)

- **Do not trust a survey/tool's headline verdict without reading what it actually checked.**
- **The `--payload` escape hatch for the commit/deploy deadlock works** — `build-deploy.py
  --payload <path>` (repeatable flag) deploys declared uncommitted files without `--allow-dirty`.
- **querySelector on any WP page returns the FIRST document-order match** — scope every live DOM
  query to a unique uid class, never a bare block-type class (STOP-CATALOGUE.md §B).
- **Root cause before instance fix; verify the EFFECT landed, not the exit code.**
- **`/qc-council` before every commit touching shared-wrapper/SGS block logic** (blub.db 255).
- **`git commit --amend` IGNORES the original pathspec** and flushes the WHOLE index. Amend only
  when the index is empty.
- **`git commit -- <pathspec>` re-reads the WORKING TREE at commit time**, not the index snapshot
  from an earlier `git add` — new this session, see incident 2 above.
- **Re-run the D-ceiling command immediately before writing a decision entry.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Inspector-standardisation Phase 2.1 (opt-in inversion) — CLOSED 2026-08-11 (D579).** hover/
  blockLink flipped to opt-in (executed D551); animation/clickEffects/parallax evaluated and
  deliberately left alone (no targeting defect found). PR #25. Nothing open in this phase.
- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.
- **Concurrent session (not this track):** hero background-panel redesign work was in progress
  throughout this session on `container`/`cta-section`/`hero`/`site-footer`/`site-header`/
  `trust-bar`/`GradientOverlayControl.js`/`ContainerWrapperControls.js`/theme pattern files —
  interleaved into this migration's commit per Bean's explicit sign-off (see D580 incident 1/2).
  Not this track's work; check its own status before touching any of those files further.

---

## State Snapshot

- **Branch:** `main`, pushed. HEAD `5f97079c` (merge of D580 + PR #25/D579).
  ⛔ **Do not trust this line for tree state — run `git status` AND `git branch --show-current`.**
  Commit by EXACT PATH (co-active sessions share `main`, sometimes share this exact checkout).
- **Tests/build:** `npm run build` exit 0 as of this session's HEAD.
- **⛔ THE CANARY IS CONTENDED.** Verify the REGISTERED schema after any deploy, not just HTTP 200.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com. This session's fixture page (post
  2270) was deleted after use — build a fresh one via `build-tier-fixture-page.py` if evidence is
  needed again. ⚠ **11 WP installs share that server** — always name the full path, never glob.
  Credentials `.claude/secrets/sandybrown.env` (always available; do not ask).
- **DB:** snapshot at `~/.agents/skills/sgs-wp-engine/sgs-framework.db.bak-2026-08-10-pre-T0-classifier`.
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| THE migration triad — survey/fix/gate | `plugins/sgs-blocks/CLAUDE.md` §"Tier-object migration triad" + §"S4" |
| THE procedure + the two axes (TIER vs BOX) | `plans/spec-35-flat-to-object-migration-design.md` (status: COMPLETE) + `plans/spec-35-control-type-contract.md` §12 |
| THE GOVERNING SPEC for this track | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0) |
| Decisions (D-numbered) | `decisions.md` — D580 is this session |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

- None for this track — migration is closed.

## Open — carried, not ours to close

- **The two pre-commit hooks are still unreconciled** (`.git/hooks/pre-commit` vs
  `.githooks/pre-commit`). ⛔ Do not `cp` one over the other.
- **`sgs/team-member`'s `photo`/`photoTablet`/`photoMobile`** — a media art-direction cascading
  attribute, found by this session's post-migration survey re-run. Different shape (image tier,
  not padding box), different migration. Not scheduled.
- **`sgs/site-header` / `sgs/site-footer`** — no inert-attribute audit done beyond `gap`/`columns`.
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had
  a value. ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **`card-grid`'s `maxWidth` + `contentWidth` are still `type:string`** — the one measured
  storage-shape residual from pass 2 (D568), unrelated to this session's box-tier finding,
  verified directly 2026-08-11. Not scheduled; note if picking up pass-2-family work again.
- **The fixture builder's own bugs, found session 9, not fixed:** `build-tier-fixture-page.py`'s
  wrapper gives decorative/positioned media no height (collapses percentage `top`); its
  `example.attributes` merge doesn't override `variant` for split-only properties; its
  unit-sibling deriver only matches the exact `{prop}Unit` pattern.
