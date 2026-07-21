---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Spec 37 — the 6-FR minimum core is BUILT + canary-verified (D359, 2026-07-22). A CPT header now goes live. Next = de-client parts/header.html per-site so FR-37-6 fully closes, the FR-36-18 Indus cutover, and the three carried §3 conformance FRs (37-33/34/35)."
generated: 2026-07-22
supersedes: the 2026-07-21 prompt (Spec 37 6-FR core — DONE this session, canary-verified)
---

# Next session — close FR-37-6 per-site + the Indus cutover

Invoke `/autopilot` before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35 track commits between handoffs (`20ea88fe`,
> `553fa9d5` landed mid-session on 2026-07-22). `.claude/mistakes.md`, `next-session-prompt-spec35*.md`,
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*` have UNCOMMITTED changes that
> are **not yours**. Path-scope every commit, re-check `git branch --show-current` in the SAME command
> as the commit, never `git add -A`.

## First action

**Smallest first step, under 5 minutes, zero dependencies:**
`grep -rn '"ref":1467\|Send to Ward\|indus-foods' theme/sgs-theme/patterns/ theme/sgs-theme/parts/ | grep -v build/`

It shows client data still living in *framework* theme files (e.g. `footer-indus-foods.php`). That
leak — one client's data shipping to every install — is the single blocker on FR-37-6 fully closing and
on the Indus cutover. De-clienting it is the day's spine.

## Mandatory READING — before anything else

1. **`.claude/LEDGER.md`** — the single living status (Spec 37 core = done + canary-verified).
2. **`.claude/STOP-CATALOGUE.md`** — 60 STOP entries + the pre-flight ritual. **Answer the ritual
   inline before your first Write/Edit.**
3. **`.claude/specs/37-HEADER-FOOTER-BUILDER.md`** — the governing spec, IN FULL. FR-37-2/3/4/5/25/11
   + §3.3a now `BUILT`/`CANARY-VERIFIED`; §3.9a records the de-client blocker; FR-37-33/34/35 are the
   carried §3 gaps. ⛔ **Spec 17 is DELETED — never cite it.**
4. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** — nav, the extension of Spec 37; owns FR-36-18
   (Indus cutover) + the Site-Info store. Spec 31 remains the standing cloning spec.

## Why this matters (motivation — Rule 7)

**Top USP:** a client edits their own header in a findable admin screen and it appears on their site.
That now WORKS — proven live this session. The remaining work makes it work *per client without leaking
one client's data into the framework*, and retires the last of the old nav. It is the difference between
"the mechanism works on a test post" and "every client site is on it cleanly."

---

## Task 1 — De-client `parts/header.html`'s source, per site (closes FR-37-6)

**What:** split framework-shell vs per-site header/footer content so no client data lives in the repo,
then author each live site's header as a CPT so `parts/header.html` staying a neutral shell is correct.
**Why:** FR-37-6's "done when" = "both sites render from CPTs" — the file gut shipped, but the per-site
CPTs don't exist yet, and `footer-indus-foods.php` + friends still leak client data to every install
(Spec 37 §3.9 / §3.9a). **Estimated time:** ~1–2h. **Parking:** `P-SPEC37-PER-SITE-DECLIENT`.

- Move/delete `theme/sgs-theme/patterns/footer-indus-foods.php` (client-named framework pattern —
  leaks "Indus Foods Footer" + a hardcoded Google Place CID); the CPT is the per-site store now.
- Author the canary (Mama's) header + footer as CPT posts, set active, re-verify live (the D359 flow).
- **Orchestration:** inline (design judgement) + `wp-sgs-developer` for the CPT authoring. **/qc gate:
  `/qc-inline`.** **Depends on:** none. **Parallel with:** Task 2 (read-only recon) but NOT a 2nd deploy.

**Acceptance:** `grep` for client data in `theme/sgs-theme/` returns nothing; the canary renders its
header/footer from a CPT (marker present once, cold cache); no framework file names a client.

## Task 2 — FR-36-18 Indus header cutover (carried; recon plan ready)

**What:** re-author the Indus (palestine-lives.org) header onto `sgs/nav-menu` + `sgs/nav-drawer`.
**Why:** the last thing pinning the old nav; unblocks FR-37-21 retirement. A complete step-by-step
recon plan exists (2026-07-22 — see `memory/` session notes; the attribute traps: `collapsePoint`
defaults to 768 vs adaptive-nav's 1024; `overflowBehaviour` has NO equivalent on `sgs/nav-menu`;
`ref:100` must be explicit). **Estimated time:** 30–45 min. **Parking:** `P-NAV-INDUS-CUTOVER`.

⛔ **Do NOT delete the `sgs/adaptive-nav` registration until this is green** — it is the rollback path.
⛔ **A plain theme deploy would push Mama's header onto Indus** (shared `parts/header.html`) — Task 1
must land first, OR author the Indus-specific header before any `--target palestine-lives` deploy.

**Orchestration:** `wp-sgs-developer`. **/qc gate: yes** — verify on BOTH sites (STOP-VERIFY-EVERY-CLIENT).
**Acceptance:** Indus header renders from the new blocks; 0 overflow at 375/768/1440; drawer axe 0;
crawl PASS with JS off. THEN FR-37-21 retires adaptive-nav + `sgs/mega-menu` + the 7 `mega-menu-*` parts.

## Task 3 — The three carried §3 conformance gaps (FR-37-33/34/35)

**What:** build the three gaps the conformance audit carried (one mechanism each covers both row blocks):
FR-37-33 `layoutMode` first-class control; FR-37-34 promoted-palette inserter steering; FR-37-35
container-query row reflow. **Why:** §3 conformance; none is a blocker to "usable" but each is real
feature work the audit named rather than dropped. **Estimated time:** ~2–3h total. **Parking:**
`P-SPEC37-S3-CARRIED`. **Orchestration:** `wp-sgs-developer`, one FR at a time. **/qc gate: `/qc-inline`.**
**Acceptance:** each clause the audit failed now passes with a `file:line`; a re-audit is clean.

---

## Dependency graph

```
Task 1 — de-client per-site (inline + wp-sgs-developer, /qc-inline)
   ↓  (Task 1 green unblocks a safe Indus deploy)
Task 2 — Indus cutover (wp-sgs-developer, /qc both sites) ──→ FR-37-21 legacy retirement
Task 3 — carried §3 FRs (parallel with 1/2, no deploy contention)
   ↓
commit (path-scoped, branch re-checked in the SAME command)
```

## Methodology guardrails (do not skip)

- **A block-attr filter gate must be proven to FIRE on a live page** (NEW 2026-07-22, D359) — a
  `pre_render_block` gate on `attrs.X` fires only when the markup literally carries `X`; WP-resolved
  values are not in the parsed attrs. The header binding gated on `attrs.area` and never fired on this
  theme (markup uses `slug`) — invisible to code-reads + a mutation harness, caught only by a live
  render. Match by the attr the markup ACTUALLY carries, and verify on a real page (R-31-11).
- **Deploy before measure** — build + deploy + cache clear BEFORE any live test, or you measure stale output.
- **Checksum every deploy** — `build-deploy.py` `[DONE]` + `[verify] HTTP 200, markers present` passes
  on ANY working SGS page including old code; `md5sum` the changed file local↔server BEFORE measuring.
- **On a shared canary a PASS is perishable** — re-assert before quoting an earlier live result.
- **Negative control, or the test is vacuous** — before banking a PASS ask "would this still pass if the
  feature were absent?" (This session a poorly-designed control keyed on "Send to Ward" — a *menu item
  label* present regardless of header — nearly misled; use a marker UNIQUE to the thing under test.)
- **Verify an inherited deferral before executing it** — a queued task is a hypothesis about the world.
- **A spec describing a superseded model misdirects the build** (D358) — amend the governing spec in the
  SAME work as a decision that changes the model.
- **Every council needs a code-grounded seat** (D358) — this session's qc-council caught two real bugs
  precisely because it had a source-verifying seat.
- **Deploy on a shared worktree via an ISOLATED worktree** — copy `build/` (never junction node_modules)
  + `--skip-build`; reset the worktree to the committed HEAD rather than copying loose files into it.
- **A gate firing is evidence about your data** — explain every finding before a baseline/bypass; the
  co-active track's F5/F6 finding is theirs (do NOT baseline). Bypass = `[gates-ok:]` in the command
  (session gate) AND `--no-verify` (git-native gate) — the two-layer bypass Bean approved this thread.
- **Root cause before instance fix** — ask "what CLASS of failure?" before fixing the case.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Do not redefine done.
- **STOP-29 — never "out of scope" on a spec'd surface.** Map every unbuilt part to a named spec STAGE.
- **Shared-worktree git discipline** — re-check branch in the SAME command as the commit; commit by
  EXACT path; if `push` is rejected do NOT stash another session's files — use an isolated worktree.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db 255).
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db 256).
- **WP_DEBUG_DISPLAY must stay false** on staging — debug notices contaminate every pixel-diff.

## Design guardrails — TRIMMED 2026-07-22 (justified: none of Tasks 1–3 authors a design draft)

The full 11-bullet mega-panel design-programme guardrails (brand-accent-as-ground, contrast-as-pairing,
transition-only-transform/opacity, no-hover-only-switching, degrade-to-more-content, recognised-slot-
tokens, real-`<img>`-slots, background-recomputes-contrast, `dialog.close()`-kills-exit-animation,
scrollbar-test-INCONCLUSIVE) live UNCUT in `STOP-CATALOGUE.md` + the 2026-07-21 prompt. **They apply
only when AUTHORING A DESIGN DRAFT** — which the header de-client, the Indus nav cutover, and the §3
conformance FRs do not. **If a task pivots to authoring a draft, load `/frontend-design` first and
re-read that block.** Two that still apply to Task 2's nav work: `dialog.close()` kills exit animations
(the drawer), and never bank a scrollbar-dependent test from the harness (report INCONCLUSIVE).

## Known-open, NOT blockers (do not re-litigate)

- **`P-TRUSTBAR-TRUSTPILOT-ATTR-COLLISIONS`** — the F5/F6 DB-as-code gate blocks commits on
  `sgs/trust-bar` attrs. **Owned by the co-active Spec-35 track.** Bypass with `[gates-ok:]` in the
  command + `--no-verify`. Do NOT baseline it.
- **`.claude/mistakes.md` + `behavioural-analyser/*` + `db-consistency/*` have uncommitted changes that
  are NOT yours** — flag, do not fix or commit.
- **`P-NAV-FEATURED-HOVER-DRAFT-PARITY`** — ⛔ Bean-locked DO-NOT-FIX: the planted TEST CASE for header cloning.
- **`P-NAV-STYLES-TAB-BLANKS-UNREPRODUCED`** — NOT reproduced; Bean deprioritised. Needs his console capture.
- **Spec 37 deferred FRs** (not needed for usable): tri-state behaviours (FR-37-14), scoped behaviour
  CSS (FR-37-15), starter picker (FR-37-7/8), the Simple/Advanced surface + a11y polish (FR-37-26..31).
- **TRIMMED 2026-07-22 (justified: unrelated to the header/nav thread):** the mega-panel + perf + platform
  parked items (`P-MEGA-CONTRAST-DEFERRED`, `P-MEGA-PATTERNS-UNMIGRATABLE`, `P-PALETTE-TOKEN-VOCABULARY-SPLIT`,
  `P-CANARY-PAGE-WEIGHT-BUDGET`, `P-DEPLOY-VERIFY-NOT-CHANGE-SPECIFIC`, `P-CANARY-SHARED-DEPLOY-RACE`,
  `P-WP7-PLATFORM-ALIGNMENT`, `P-DECISIONS-BACKTAG`, docscore debt) all live in `parking.md` — read there
  if a task strays into perf/palette/platform territory. None gates Tasks 1–3.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Any architectural or design decision before building |
| `/gap-analysis` | Grade outputs before delivery |
| `/lifecycle` | Before ANY skill / agent / pipeline change |
| `/research` | Auto-routes to the right research tier |
| `/strategic-plan` | Plan implementation order before writing code |
| `/adversarial-council` | Pre-build stress-test of a spec/plan — **include a code-grounded seat** |
| `/qc-council` | Multi-rater before any converter / pipeline / SGS-block commit |
| `/qc-inline` | Small acceptance gates |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-wp-engine` | Any SGS block / theme / client work |
| `/wp-block-development` | Core WP block-API questions (CPT registration, patterns, `templateLock`) |
| `/frontend-design` | **Before authoring ANY draft** — forces an explicit aesthetic direction |
| `/ui-ux-pro-max` | Design DATA (styles / palettes / tokens) — not direction |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close |

## Tool bindings — MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `playwright` | Live DOM verification on the canary (R-31-11) — the canonical proof |
| `chrome-devtools` | CDP matched-rule provenance if CSS provenance is disputed |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Block attributes, slots, table checks — the DB is authoritative |
| `lints/*.py` | `bem-lint` · `token-lint` · `draft-vocab-lint` |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` (warn-only) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Heavy WP build work in Tasks 1–3; CPT authoring; the Indus cutover |
| `code-reviewer` | Pre-commit review of any binding/converter change |
| `test-and-explain` | Plain-English confirmation for Bean that a CPT header/footer goes live |

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Read the governing spec (Spec 37 in full; Spec 36 for nav; Spec 31 for converter) + LEDGER?
2. Did the prior in-session work actually LAND? (Read the LEDGER's live status.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Verifying colour/contrast on ALL client palettes, not one? (STOP-VERIFY-EVERY-CLIENT.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? Shape freeze respected? (STOP-D328.)
6. Does an SGS block/helper already do this? Did I grep? Did a parallel track already do it?
7. Am I building ahead of reconciling with what already shipped? (rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring? Desktop browser for
   any scrollbar/geometry check? (STOP-SCROLLBAR-LOCK / STOP-HARNESS-CANNOT-SEE-A-CLASSIC-SCROLLBAR.)
9. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch verified in
   the SAME command as the commit?
10. Am I touching another track's files/branches without checking their state first?
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. Is this inherited task's premise still true? (STOP-VERIFY-A-DEFERRAL-BEFORE-EXECUTING-IT.)
13. Am I authoring a design draft without having loaded `/frontend-design` first?
14. Does the governing spec still describe the model we are actually building? (D358.)
15. If I am running a review panel, does it have a seat that verifies claims against live source? (D358.)
16. **Am I trusting a block-attr filter gate without proving it FIRES on a real page?** (NEW 2026-07-22,
    D359 — the header binding gated on `attrs.area` never fired on this theme; the markup uses `slug`.)
