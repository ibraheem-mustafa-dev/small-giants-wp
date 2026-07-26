# Next Session — Spec 37 Header/Footer Builder: the DEAL-WINNERS

Invoke `/autopilot` before anything else. Then read this file end-to-end.

*Unique next-session-prompt for the Spec 37 header/footer track. NOT the shared LEDGER — concurrent
sessions own that. Overwrite this file each time this track hands off. (Renamed 2026-07-26 from
`next-session-prompt-header-footer-per-row.md`: the per-row work it was named for is finished.)*

You are the SGS framework builder continuing **Spec 37**. The plumbing is done. Your job is the
**client-facing** half — the things that actually win work.

---

## State recap (plain English)

**The whole per-row programme is CLOSED and live-verified.** Phase 1 (per-row transparent +
hide-on-scroll), Phase 2 (per-row shrink + shrink-hides-an-element + footer parity) and Side Track A
(the sticky build) all shipped. FR-37-37, FR-37-38, FR-37-39 and FR-37-40 are **BUILT**. Do not
rebuild any of them — the canonical record of what exists is **Spec 37**, and the live status is
`LEDGER.md`.

What that means concretely: each header and footer row now behaves independently (its own
transparent / hide-on-scroll / shrink, per device tier, inheriting upward), a chosen child can be
hidden when a row shrinks (guarded so the logo, nav and cart can never be the target), and the
header can be sticky — where a row that should disappear now **collapses to nothing** so the header
genuinely shrinks, rather than sliding away and leaving a hole.

**Two decisions from the last session that bind future work:**
1. **Per-row `position: sticky` is REJECTED, permanently** (D389). A row made sticky inside a ~250px
   `<header>` unpins the moment scroll passes the header's height — the short-parent trap. Sticky is
   HEADER-level. The multi-row offset chain is **explicitly not to be built**; there is one sticky
   element, so there is nothing to chain.
2. **The `--sgs-header-height` publisher is gated on MEASURED pinning** (D391), never on the sticky
   body class. Sticky and transparent both set `position` with `!important` at equal specificity, so
   a header carrying both computes `absolute` and scrolls away while still wearing the sticky class.
   If you need "is the header pinned", reuse `isHeaderPinned()` — do not re-derive it.

**Decisions logged D386–D392.** Read **D388** (two editor-killing crashes past all-green gates),
**D391** and **D392** before touching this surface.

**Open, parked, NOT blocking:** `P-THEME-SCROLL-PADDING-SECOND-INSTANCE` (the theme carries its own
copy of the scroll-padding defect — read the entry before "fixing" it, there is a real JS-off
trade-off), `P-ROW-COLLAPSE-RESIDUALS` (reduced-motion not live-verified; collapsed-row focusability
is parity, not a regression), `P-HEADER-SIMPLICITY-FINDINGS` (the FR-37-26 simplicity test FAILED —
findings feed Task 1 below).

---

## Mandatory READING — ⛔ read every item IN FULL before any edit

1. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` — **the canonical record.** FR-37-37/38/39/40 are the
   shipped per-row + sticky behaviours; §7 constraints bind every FR; §3.8 the per-device cascade.
2. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + the pre-flight ritual.
3. `.claude/LEDGER.md` — live status, current fronts, what the co-active tracks are doing.
4. `.claude/decisions.md` D386–D392 — this track's decisions, most-recent-first.
5. `.claude/parking.md` — the three open entries named above, in full.
6. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the parent design and
   its 9 must-fixes, several now marked STRUCK with reasons. **Read the strike reasons** — they are
   the record of which guardrails stopped being meaningful when per-row sticky was rejected.
7. `reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md` — the FAILED simplicity
   verdict that Task 1 acts on.

---

## First action (≤5 min, zero dependencies)

Open the canary header CPT **1570** in the editor and list what a client actually sees on the
Simple tab — count the controls. That single count is the input to Task 2 and it tells you, in
under five minutes, whether the FR-37-27 "≤3 controls" rule currently holds. No build, no deploy,
nothing to set up.

## Task 1 — B3: the preset library (the highest-ROI thing left on this track)

**What:** ready-made, fully-styled header and footer designs a client picks from a gallery —
not blank starters. Pick one, get a finished header.
**Why:** the single biggest client-facing win remaining. It is what makes the builder feel like a
product rather than a construction kit, and it directly addresses the FAILED simplicity test: a
non-coder who picks a finished design never has to assemble one.
**Estimated time:** ~1 build+deploy cycle for 3–4 presets.

**The mechanism already exists — do not build a picker.** FR-37-7 shipped WP's NATIVE "Choose a
pattern" modal for `sgs_header` / `sgs_footer` (D377, live-verified, 8 preview cards). A preset is
therefore **a pattern file**, nothing more. Two rules that bite here, both already learned:
- Patterns register against the theme's `style.css` **Version**, not file mtimes — bump it or a new
  pattern silently never appears.
- A **static** block whose save emits a wrapper div breaks a comment-only starter pattern ("invalid
  content", D379). Structural wrapper blocks must be DYNAMIC. Only a live editor catches this.

**Orchestration:**
- Execution: **delegated** — `wp-sgs-developer`, sonnet via `/delegate`
- Dispatch pattern: single agent (the presets share files; parallel agents would collide)
- Brief: author N header + N footer patterns under `theme/sgs-theme/patterns/`, each a complete
  styled composition using existing SGS blocks and per-row behaviours. Bump the theme version.
  Verify each inserts cleanly in a real editor.
- Context it won't have: the picker is native WP and already works — the task is content, not UI;
  per-row behaviour attrs are `rowTransparent`/`rowHideOnScroll`/`rowShrink`, device-tier objects
  with inherit-upward semantics; `sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers,
  so "desktop only" needs explicit `{desktop:true, tablet:false, mobile:false}`.
- Depends on: none. Parallel with: Task 2.
- /qc gate after: yes — `/qc-inline`, plus a real editor insert of every preset.
- **Acceptance:** each preset appears in the native modal and inserts as real, editable blocks with
  no "invalid content" warning — verified by inserting it in the live editor, not from the file.
  Bean's eye on the designs (R-31-13) is co-authoritative; measurement alone does not close this.

## Task 2 — Trim the Simple control surface (act on the FAILED simplicity test)

**What:** FR-37-26 says a non-coder must set up a header in minutes without opening Advanced. The
test was run 2026-07-26 and **FAILED**. Three findings are parked in
`P-HEADER-SIMPLICITY-FINDINGS`. Act on them.
**Why:** every control added to the Simple surface makes the builder harder to sell. The per-row work
just added several.
**Estimated time:** ~30 min.

**Orchestration:**
- Execution: **inline** (judgement about what a non-coder needs; not mechanical)
- Depends on: none. Parallel with: Task 1 (different files — inspector vs patterns).
- /qc gate after: `/qc-inline`. **Deploy and open the real editor** — see the STOP entry on
  build-green below; this touches `edit.js`.
- **Acceptance:** the Simple surface is ≤3 controls per FR-37-27, with everything else in Advanced,
  and the parked findings are each closed or explicitly re-parked with a reason.

## Task 3 — Decide B2's fate (cheap, do it last)

**What:** the "preview scroll behaviour" button — open the live frontend pre-scrolled at mobile
width so a client SEES sticky/shrunk/hidden before publishing. **Partly delivered already** by the
"Show me the shrunk size" editor toggle shipped in Phase 2.
**Why:** it was the council's biggest ticket-prevention idea, but the cheap half now exists. Decide
whether the rest is still worth building rather than assuming it is.
**Estimated time:** ~15 min to decide; build only if the answer is yes.

**Orchestration:**
- Execution: inline. Depends on: nothing. /qc gate: n/a for the decision.
- **Acceptance:** a recorded decision (build / drop / park with a trigger), not a silent carry-forward.

---

## Dependency graph

```
Task 1 (delegated, sonnet — patterns)  ||  Task 2 (inline, Opus — inspector)
        ↓ /qc-inline + LIVE EDITOR insert        ↓ /qc-inline + LIVE EDITOR open
                          ↓
                    Task 3 (inline — a decision, not a build)
                          ↓
              commit path-scoped + push to main
```

---

## Anti-pattern STOP catalogue — ALL carried forward + 4 added this session

- **Keep `SGS_Container_Wrapper`.** Never re-open block-private for header/footer (6/6 council,
  Spec 37 §7 constraint 2). Add capabilities to the engine, never fork it.
- **CSS tier-gating via a JS-added state class, NOT `[data-attr]` presence** — a presence-only
  selector applies at every tier. Gate on an `is-row-*-active` class the JS adds only on active tiers.
- **Verify per-row behaviour on the LIVE DOM, not the emit** (D375 dead-selector). Smooth-scroll
  pages need `behavior:'instant'` + a real ~300ms wait; a 2-frame wait reads mid-animation.
- **`view.js` lives at `src/header-behaviours/`, NOT `src/blocks/`** (webpack entry footgun).
- **`sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers** (inherit-upward). "Desktop
  only" needs explicit `{desktop:true, tablet:false, mobile:false}`.
- **Shared-tree git:** `git branch --show-current` in the SAME command as the commit; commit with
  explicit `-- <paths>`; a co-active session is often committing concurrently.
- **Deploy:** the full `npm run build` prebuild can be blocked by a co-active track's drift. Route
  around it with `npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell), then
  deploy from an ISOLATED worktree with a copied `build/` + `--skip-build`. **Then md5 the changed
  files local↔server** — the HTTP-200 verify leg proves nothing.
- **Visual-diff gate blocks any block render.php/block.json/edit.js touch.** For additive changes
  whose default render is byte-identical, write an HONEST report at `reports/visual-diff/` +
  `git commit --no-verify` (the gate's own sanctioned bypass). Never fabricate a PASS.
- **No inline `style=""`** (Spec 32); device tiers 768/1024; DB-first (no hardcoded dicts); no
  version bumps / no `deprecated.js` — **except the theme `style.css` Version, which is required and
  is not a block version** (patterns will not register without bumping it).
- **Build-green is ZERO evidence for an editor-surface change.** Two editor-killing crashes shipped
  past webpack + dead-controls + a brand-new gate in ONE session: a lost `useState` import, then a
  TDZ (`const` read above its declaration). A crashed block renders a tidy "This block has
  encountered an error" placeholder that is easy to skim past. After ANY `edit.js` / shared
  `src/components` change: deploy, OPEN the editor, read the console.
- **After a scripted multi-file edit, grep EVERY file to confirm it landed.** A python script
  reporting success is not proof the file on disk changed — that is how the `useState` import was
  lost while the footer twin kept its copy. (Re-earned this session: an off-by-one in a scripted
  LEDGER trim was caught only by an inline assertion.)
- **Verify WHICH config is ACTIVE before measuring.** Testing "Proof Footer" (1571) gave a false
  negative; the active footer is CPT **1654** (`wp option get sgs_active_footer_cpt_id`), the active
  header CPT **1570**. Check the option, never infer from the name.
- **An absolute value in a SHARED stylesheet cannot know the resting value it modifies.** That was
  the shrink grow-bug. Gated by `check-shared-css-state-rules.js`; never baseline one of its findings
  without a recorded reason. (`0` is exempt by construction — a collapse to nothing cannot grow.)
- **Fact-check your OWN brief before a council decides on it.** Three load-bearing claims in my own
  decision brief were false and all favoured my recommendation. Grep-verify before dispatch; always
  seat a code-grounded falsifier.
- **`prefers-reduced-motion` resets must repeat the FULL selector** of whatever set the transition.
  A lower-specificity reset silently loses.
- **NEW — measure the STATE, never the flag that requests it.** A gate on "is X true?" must read the
  computed value. Sticky and transparent both set `position` with `!important` at equal specificity,
  transparent later in source order, so a header with both computes `absolute` while still carrying
  the sticky class. **Corollary:** two `!important` rules at equal specificity are resolved by SOURCE
  ORDER — when you author the winner, prefer higher specificity over position. **Second corollary:**
  every measured gate still has a blind spot (an ancestor's `overflow`/`transform` silently kills
  sticky while `position` still computes `sticky`) — name it, and ship a detector rather than
  pretending the measurement is total.
- **NEW — a criterion written against a REJECTED model must be STRUCK, not built.** When a decision
  rejects a model, many of its acceptance criteria and guardrails become *meaningless*, and a builder
  treating the list as the spec will construct machinery for impossible conditions. Two criteria in
  the sticky design survived the rejection of the model they were written for — in a §4 list that had
  already been rewritten once for exactly this reason. Walk EVERY criterion after a rejection and
  classify it still-required / void / changed; record the void ones as struck **with the reason**.
- **NEW — the collapse path must win by SPECIFICITY, not source order.** The collapse rule is (0,4,0)
  against the translate rule's (0,3,0). If you reorder `header-behaviours.css`, that must stay true.
- **NEW — `prefers-reduced-motion` on the collapse is NOT live-verified.** The harness cannot emulate
  the media query. Correct by construction, but do not quote it as measured.

---

## Pre-flight self-attestation ritual — answer inline before the first Write/Edit

1. Have I read Spec 37 in full, plus D386–D392 and the LEDGER, before starting?
2. Did the prior session's work actually LAND? (`git log -1`, not a cached hash.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Am I verifying on the LIVE page / real editor, not the emit or a green build?
5. Is the config I am measuring the ACTIVE one (header 1570 / footer 1654), checked via the option?
6. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch
   (`git branch --show-current`) verified in the SAME command as the commit?
7. Am I touching another track's files without checking their state first?
8. Is this criterion still meaningful, or was it written against a model we since rejected?

---

## Tool bindings — skills, MCP servers, agents

### Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | MANDATORY — any architectural or design decision |
| `/gap-analysis` | MANDATORY — grade output before delivery |
| `/lifecycle` | MANDATORY — before any skill/agent/pipeline change |
| `/research` | MANDATORY — auto-routes to the right tier (`--tier extended` for multi-angle) |
| `/strategic-plan` | MANDATORY — plan implementation order before writing code |
| `/sgs-wp-engine` + `/wp-block-development` | the block + pattern build |
| `/wp-block-themes` | pattern registration, theme.json, the `style.css` Version bump |
| `/qc-council` | before every deploy on the behaviour surface (blub.db 255) |
| `/qc-inline` | per-file inline checks |
| `/sgs-db` | DB ground truth before any "missing X" claim |
| `/a11y-audit` | any control-surface or contrast change |

### MCP Servers & Tools

| Tool | For |
|---|---|
| chrome-devtools | live DOM **and editor console** verification. **Its profile can be locked by a co-active session — Playwright is the working fallback and was used all of 2026-07-26.** |
| playwright | live DOM, editor automation via `wp.data.dispatch`, multi-viewport measurement |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB queries |
| `ssh hd` | canary shell; `wp option get sgs_active_header_cpt_id` / `..._footer_...` before measuring |

### Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 1 (the preset patterns) — self-contained brief; tell it to EXECUTE, not delegate onward |
| `feature-dev:code-reviewer` | before every deploy — it caught the P1 tier-gating bug AND the reduced-motion specificity bug |
| `test-and-explain` | plain-English confirmation for Bean after the build |

---

## Guardrails

- Canary `sandybrown-nightingale-600381.hostingersite.com`; creds (gitignored, always available)
  `.claude/secrets/sandybrown.env`; WP 7.0.2; **active header CPT 1570, active footer CPT 1654**.
- Editor edits go through `wp.data.dispatch('core/block-editor').updateBlockAttributes` +
  `savePost()` — **never** WP-CLI on `post_content` (a PreToolUse hook blocks it). Note clientIds
  regenerate per editor session; re-resolve blocks by name, not a cached id.
- Revert the canary to clean after testing and confirm it on the frontend. Check for a stray
  `-autosave-v1` revision — it shows the next session a false "newer autosave" banner.
- Everything is on `main` and pushed. The uncommitted tree belongs to the co-active track — do not
  commit `lucide-icons.php`, `.claude/next-session-prompt.md`, `reports/inline-styling-audit-*`, or
  `.claude/memory/session-2026-07-2*.md`.
- **Methodology (do not skip):** deploy before you measure; root cause before instance fix; outcome
  ≠ code shipped; verify the LIVE rendered output, not internal metrics.
