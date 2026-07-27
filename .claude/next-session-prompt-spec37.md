# Next Session — Spec 37 Header/Footer Builder: the client-facing deal-winners

Invoke `/autopilot` before anything else. Then read this file end-to-end.

*Unique next-session-prompt for the Spec 37 header/footer track. NOT the shared LEDGER, and NOT
`.claude/next-session-prompt.md` — concurrent sessions own those. Overwrite this file each time
this track hands off.*

You are the SGS framework builder continuing **Spec 37**. The per-row programme is closed, the
starter-corruption defect is fixed, and residual B2 is built. Your front is the **client-facing
deal-winners** — the work that makes this a product a non-coder can actually use.

---

## State recap (plain English)

**What shipped last session (2026-07-27, D393–D395).** The session went looking for polish and
found a defect that had been silently corrupting the product's most client-facing feature.

1. **The starter library was broken and nobody knew (D393, `ae9b1db4`).** Choosing "Header —
   Centred" did not give you a centred header. `templateLock: 'all'` makes WordPress re-apply a
   container's OWN template on every mount — not just when empty — and it matches rows by **array
   position**, never by `rowSlot`. Measured: **7/8 header + 8/8 footer starters corrupted**, and it
   DESTROYED content (the search-bar starter lost its search bar; the centred footer lost its
   copyright line). Fixed by passing the template only into a genuinely empty container. Verified
   15/16 corrupt → **0/16**, raw-insert seeding intact, row lock still refuses a real move.
2. **A latent fatal surfaced while verifying it (D394, `46749091`).** `sgs/responsive-logo` called
   two shared helpers with no `require_once` — the only such render.php of 81. Order-dependent:
   fine when a sibling block loaded the helper first, **HTTP 500 rendered alone**. The immutable
   default header contains a logo, so clearing the active header could have white-screened a site.
3. **FR-37-41 preview-before-active shipped (D395, `20ec422c`), closing residual B2.** A "Preview
   on site" row action renders an unpublished header/footer on the real homepage for a capable,
   nonce-bearing user. It overrides `get_active_id()`, **not** `render_active()`, so the behaviour
   resolver previews too — sticky/hide-on-scroll/transparent are observable, which was the point.
   Four negative controls, incl. anonymous-with-a-valid-URL and a cross-post replayed nonce.

**⚠ Carry this forward: D377's picker verification was retro-invalidated.** It banked the picker as
live-verified because the saved post carried the right `metadata.patternName`. It did — while the
block tree beneath it had been rewritten. **A pattern verified by its METADATA is not verified by
its CHILDREN.** Anything else banked on metadata-only evidence deserves a second look.

**Where that leaves the product.** The starter library now genuinely works, and a client can see
their header before publishing it. What is still missing is the thing that makes starters *feel*
like a product: **presets** (B3, never started) and a **drawer that is not silently absent** (the
FR-37-26 simplicity test's only hard failure).

---

## Mandatory READING — ⛔ read every item IN FULL before any edit

> Carried forward from the previous prompt (9 items) and EXTENDED to 11. None dropped.

1. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` — the canonical record. §3.3a (row seeding +
   `templateLock`, **now carrying the D393 correction**), §7 constraints, FR-37-7/8 (picker +
   starter library), FR-37-41 (preview), §3.8 the per-device cascade, §5 build-status summary.
2. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + pre-flight ritual (**77 entries**;
   +2 last session, none dropped).
3. `.claude/LEDGER.md` — live status. ⚠ **Two tracks append to it**; read the "ALSO CURRENT"
   Track-2b block, not only the top one. It is currently over its byte cap and owes a sweep (Task 3).
4. `.claude/decisions.md` **D386–D395** — this track's decisions, most-recent-first. D393/D394 are
   `[INCIDENT]` and must not be truncated.
5. `.claude/parking.md` — `P-HEADER-SIMPLICITY-FINDINGS`, `P-THEME-SCROLL-PADDING-SECOND-INSTANCE`,
   `P-ROW-COLLAPSE-RESIDUALS`, in full.
6. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the parent design and
   its 9 must-fixes. **Read the strike reasons.**
7. `reports/fr-37-26-simplicity-test/2026-07-26-operator-simplicity-test.md` — the FAILED verdict
   and its own correction: **≤3 controls is a NUDGE, not a ceiling** (FR-37-27, Bean-confirmed).
   Do not "fix" the control surface by hiding controls a client relies on.
8. **`plugins/sgs-blocks/src/blocks/site-header/edit.js:264-400`** — the `TEMPLATE` const, the
   D393 conditional-template comment block, and the `useInnerBlocksProps` call. Read the comment at
   `:291-295` on why the burger is not in TEMPLATE — it is the precedent for what a TEMPLATE entry
   can safely contain, and it is why the drawer cannot simply be seeded there.
9. **`theme/sgs-theme/patterns/header-*.php`** — all 7, to see how many rows each declares and
   where the drawer sits (always a SIBLING of `sgs/site-header`, never a child).
10. **`plugins/sgs-blocks/includes/class-sgs-active-layout.php`** — `get_preview_id()` +
    `get_active_id()`. The single convergence point for render AND behaviour resolution; any new
    "resolve a different layout" feature belongs there, not in a second mechanism.
11. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md` §1.2 + FR-36-8/FR-36-23** — required before Task 2,
    because the drawer is Spec 36's and §1.2 demands BOTH specs change in the same commit.

---

## First action (≤5 min, zero dependencies)

Confirm the D393 fix still holds before building anything on top of it. One browser call, and it
re-establishes the baseline as measured data rather than an inherited claim.

```js
// In a NEW sgs_header post editor, via Playwright browser_evaluate:
const pats = wp.data.select('core').getBlockPatterns();
const targets = pats.filter(p => p.name.startsWith('sgs/') && /(header|footer)/i.test(p.name));
const shape = bs => bs.map(b => ({ slot: b.attributes?.rowSlot, kids: b.innerBlocks.map(c => c.name) }));
let corrupted = 0;
for (const p of targets) {
  const parsed = wp.blocks.parse(p.content);
  const root = parsed.find(b => b.name === 'sgs/site-header' || b.name === 'sgs/site-footer');
  if (!root) continue;
  const before = shape(root.innerBlocks);
  wp.data.dispatch('core/block-editor').resetBlocks(parsed);
  await new Promise(r => setTimeout(r, 1200));
  const after = shape(wp.data.select('core/block-editor').getBlocks().find(b => b.name === root.name).innerBlocks);
  if (JSON.stringify(before) !== JSON.stringify(after)) corrupted++;
}
wp.data.dispatch('core/block-editor').resetBlocks([]); window.onbeforeunload = null;
return { checked: targets.length, corrupted };   // expect { checked: 16, corrupted: 0 }
```

Expect `corrupted: 0` across 16. If it is non-zero, STOP — something regressed the D393 fix and
that is the whole session.

---

## Task 1 — B3: the preset library (the highest client-facing ROI left on this track)

**What:** a library of ready-made header/footer *looks* a client picks in one click, on top of the
starter structures that now survive insertion.
**Why:** the starter library gives a client the right STRUCTURE; nothing yet gives them a good
LOOK. This is the deal-winner — it makes an SGS site feel designed rather than assembled. FR-37-28
already proved the mechanism is permitted and works (Layout preset: Centred / Split / Minimal,
derived-not-stored, live-verified).
**Estimated time:** ~30 min to design, ~1 build+deploy cycle to ship a first set.

**⛔ Design-gate this before building (project rule 7 + the FR-37-28 precedent).** The open
questions are genuinely Bean's: how many presets, what they cover (colour band? spacing? type
scale? all three?), and whether a preset writes existing attrs only (FR-37-28's rule — **no new
stored shape**, so the converter round-trips unchanged) or needs a new attribute.
`/brainstorming` → ranked menu → Bean sign-off → build.

**Orchestration:**
- Execution: **inline** (Opus). Design judgement on a shared shipped block; not delegable.
- Depends on: the First action passing. Parallel with: Task 2 (different files).
- /qc gate after: **`/qc-council`** (blub.db 255), code-grounded seat mandatory.
- **Acceptance:** a client picks a preset and the header visibly changes on the **frontend**, not
  just the canvas; the preset writes only EXISTING attributes (verified by diffing
  `site-header/block.json` before/after — it must be unchanged, per FR-37-28); the active-state
  indicator is DERIVED so a hand-edited combination shows no preset rather than lying. Measured
  live on the canary, plus Bean's eye (R-31-13).

## Task 2 — The drawer gap: option B, the conditional-mandatory notice

**What:** `sgs/nav-menu` shows a plain-English notice + a one-click "Add the mobile menu" when a
tier shows the burger but no `sgs/nav-drawer` exists.
**Why:** this is the **only hard failure** in the FR-37-26 simplicity test. Seeding (option A)
shipped for the scratch card, but the **raw-block-insert path still has no drawer**, so a header
built that way has a burger that opens nothing. A drawer cannot be seeded from `sgs/site-header`'s
TEMPLATE: its root is a `<dialog>` that promotes to the top layer, it must be a SIBLING of the
header, and the container is locked to exactly three rows. Option B is the only thing that reaches
that path.
**Estimated time:** ~20 min.

**⛔ It crosses the spec boundary.** Spec 37 §1.2 assigns the drawer to **Spec 36**, and §1.2's own
rule requires a change crossing that line to edit **BOTH specs in the same commit**. Read Spec 36
§1.2 + FR-36-8/FR-36-23 first (reading item 11).
**Option C (a hard save-gate) was recommended against and should stay rejected:** FR-37-19's
standing policy is informational, never blocking, and a client blocked from saving with no trail is
the failure P2 designed against.

**Orchestration:**
- Execution: **inline** (Opus) for the notice design + the spec edits; the notice component is
  mechanical enough to delegate to **sonnet** via `/delegate` if the session is running long.
- Depends on: nothing. Parallel with: Task 1 (`nav-menu` vs `site-header` — disjoint files).
- /qc gate after: `/qc-inline`, plus **open the real editor** (D388 class).
- **Acceptance:** a raw-inserted `sgs/site-header` with no drawer shows the notice; clicking the
  action inserts a working `sgs/nav-drawer` as a SIBLING; the burger then opens it at ≤767px on the
  live frontend; a header that already HAS a drawer shows NO notice (negative control); Spec 36 and
  Spec 37 both edited in the same commit.

## Task 3 — Sweep the LEDGER back under its cap

**What:** `.claude/LEDGER.md` is ~30KB against a 24,576-byte cap; both tracks appended on
2026-07-27. Sweep the older CURRENT blocks to dated pointers in `memory/session-*.md`.
**Why:** the cap exists because an append-only ledger is how the old `state.md` reached 66KB and
stopped being read. **Verify the pointed-to detail exists BEFORE trimming** — that is the rule the
last sweep followed.
**Estimated time:** ~10 min.

**Orchestration:** inline. Depends on nothing; do it LAST so this session's own entry is included.
**Acceptance:** LEDGER < 24,576 bytes; every trimmed block's detail confirmed present in
`decisions.md` or `memory/` FIRST; no STOP entry or live-status line lost.

---

## Residuals — carried here because Bean ruled they are neither decisions nor parked

- **B2 preview-before-active — ✅ DONE (FR-37-41, D395).** Removed from this list. The **no-login
  shareable preview link is DROPPED, not deferred** (Bean, 2026-07-27): a client who should see
  work-in-progress either has an account or is shown a test site. Do not re-open it as an obvious
  gap — it would need an expiring-token model, a second access path, and a URL that grants site
  content to whoever holds it.
- **The raw-block-insert path still has no drawer** — Task 2 is the only thing that reaches it.
- **FR-37-26's blind-tester arm** is still outstanding and is the authoritative half of the
  simplicity test (a real non-coder, screen-recorded). The proxy arm ran and FAILED.

---

## Dependency graph

```
First action (16-starter regression check — is D393 still holding?)
        ↓
Task 1 (B3 presets) ── design gate → Bean sign-off → build → /qc-council
        ║  (parallel — disjoint files)
Task 2 (drawer option B) ── Spec 36 + Spec 37 edited in the SAME commit
        ↓
Task 3 (LEDGER sweep — do LAST so this session is included)
        ↓
commit path-scoped + push to main
```

---

## Anti-pattern STOP catalogue — track-specific only; the general ones live in STOP-CATALOGUE.md

> Carried forward from the previous prompt (15 entries) and EXTENDED to 18. No defence was dropped.
> The first two were PREDICTIONS last session; both are now backed by measurement and have been
> extended with the evidence. The general/duplicated entries remain in `.claude/STOP-CATALOGUE.md`
> (reading item 2, uncapped, canonical, **77 entries**), where the D101 count-check runs.

- **`templateLock: 'all'` RE-APPLIES the template over EXISTING children.** WP core:
  `shouldApplyTemplate = currentInnerBlocks.length === 0 || templateLock === "all" || templateLock
  === "contentOnly"`, and `synchronizeBlocksWithTemplate` then matches by **array position + name
  only** — `rowSlot` is never consulted. **NOW MEASURED, not predicted (D393): 15 of 16 starters
  corrupted, with CONTENT DESTROYED.** Fixed by passing the template only into an empty container.
  Never assume a template only seeds an empty block.
- **A pattern verified by its METADATA is not verified by its CHILDREN.** **CONFIRMED (D393):**
  D377 banked the picker as live-verified on `metadata.patternName` — correct metadata, rewritten
  tree. Compare the CHILDREN against the pattern file.
- **A negative result can be a property of the FIXTURE, not the mechanism.** NEW (D393). "Re-opening
  a saved header does not re-corrupt it" was true only because the tested post (CPT 1570) was
  already template-shaped, so the merge was a no-op; a differently-shaped post corrupts. Before
  banking a "this case is safe" result, name what about THAT fixture made it safe.
- **A matching md5 proves CONSISTENCY, not CORRECTNESS.** NEW (D394). PowerShell `Copy-Item
  -Recurse` into an EXISTING directory NESTS it (`build\build`) instead of replacing, so a deploy
  shipped a stale tree while md5 "verified" clean at every step — both sides were the old file.
  Verify deployed CONTENT (`grep` the changed line, check the line count). Remove the destination
  before copying.
- **When a fix appears not to work, prove it SHIPPED before re-opening the diagnosis.** NEW (D394).
  The correct instinct (prove-the-cause) would have been WRONG here: the diagnosis was right and the
  deploy was stale. **A stack trace's line number is the cheapest tell** — if it reports a line your
  edit should have moved, you are looking at the old file.
- **The INSTANCE a finding came from decides its blast radius.** Findings inherited as systemic have
  repeatedly been single-path. Check which path the failing instance came from before generalising.
- **A stuck `beforeunload` dialog jams EVERY Playwright call** (`"does not handle the modal state"`),
  including `navigate` to `about:blank`. Recovery: `browser_handle_dialog {accept:true}` — this
  worked repeatedly last session and is faster than `browser_close`. Before leaving an editor, set
  `window.onbeforeunload = null`.
- **Keep `SGS_Container_Wrapper`.** Never re-open block-private for header/footer (6/6 council, Spec
  37 §7 constraint 2). Add capabilities to the engine, never fork it.
- **CSS tier-gating via a JS-added state class, NOT `[data-attr]` presence** — a presence-only
  selector applies at every tier. Gate on the `is-row-*-active` class the JS adds only on active tiers.
- **`view.js` lives at `src/header-behaviours/`, NOT `src/blocks/`** — the webpack entry is
  hardcoded; a wrong path silently serves stale `src/` on the live site.
- **`sgs_resolve_tier_booleans({desktop:true})` resolves to ALL tiers** (inherit-upward). "Desktop
  only" needs explicit `{desktop:true, tablet:false, mobile:false}`.
- **The collapse path must win by SPECIFICITY, not source order** — its selector is (0,4,0) against
  the translate rule's (0,3,0). If you reorder `header-behaviours.css`, that must stay true.
- **`prefers-reduced-motion` resets must repeat the FULL selector** of whatever set the transition; a
  lower-specificity reset silently loses. The collapse's reduced-motion path is **NOT live-verified**
  (`P-ROW-COLLAPSE-RESIDUALS`) — do not quote it as measured.
- **An absolute value in a SHARED stylesheet cannot know the resting value it modifies** (D386, the
  shrink grow-bug). Gated by `check-shared-css-state-rules.js`; never baseline one of its findings
  without a recorded reason. `0` is exempt by construction.
- **Build-green is ZERO evidence for an editor-surface change.** Two editor-killing crashes shipped
  past webpack + dead-controls + a brand-new gate in ONE session. The crash renders as a tidy
  placeholder that skims past. After ANY `edit.js` / shared `src/components` change: deploy, OPEN
  the editor, read the console.
- **After a scripted multi-file edit, grep EVERY file to confirm it landed.** A script reporting
  success is not proof the file on disk changed.
- **Fact-check your OWN brief before a council decides on it.** Three load-bearing claims in my own
  decision brief were false and all favoured my recommendation. Always seat a code-grounded
  falsifier. **Extended (D393): a code-grounded REVIEWER can also be wrong** — one raised a
  high-severity finding without reading WP core (it said so) and missed the `hasTemplateChanged`
  gate. Test the claim; do not argue it.
- **The full `npm run build` prebuild can be blocked by a co-active track's drift.** Route around it:
  `npx wp-scripts build --experimental-modules --webpack-copy-php` (PowerShell), then deploy from an
  ISOLATED worktree with a copied `build/` + `--skip-build`. Never `--allow-dirty` / `--skip-verify`.

## Pre-flight self-attestation ritual — answer inline before the first Write/Edit

> Carried forward (10 questions) and EXTENDED to 12. None dropped.

1. Have I read Spec 37 in full, plus D386–D395 and the LEDGER, before starting?
2. Did the prior session's work actually LAND? (`git log -1`, not a cached hash.)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Am I verifying on the LIVE page / real editor, not the emit or a green build?
5. Is the config I am measuring the ACTIVE one (header 1570 / footer 1654), checked via the option?
6. D-ceiling (`grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`) + branch
   (`git branch --show-current`) verified in the SAME command as the commit?
7. Am I touching another track's files without checking their state first?
8. Is this criterion still meaningful, or was it written against a model we since rejected?
9. Am I changing a shipped container block's InnerBlocks config (`template` / `templateLock` /
   `allowedBlocks`)? If yes: design-gate first, then deploy and OPEN the real editor.
10. Am I generalising a finding from a single instance? Name the path it came from.
11. **Am I treating a "this case is safe" result as a property of the MECHANISM when it might be a
    property of the FIXTURE I happened to test?** Name what about that fixture made it pass.
12. **Have I verified the deployed CONTENT, not just that two checksums agree?** A stale local file
    and a stale server file match perfectly.

---

## Tool bindings — skills, MCP servers, agents

### Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | MANDATORY — the Task 1 design gate, before any code |
| `/gap-analysis` | MANDATORY — grade output before delivery |
| `/lifecycle` | MANDATORY — before any skill/agent/pipeline change |
| `/research` | MANDATORY — auto-routes tier (`--tier extended` = multi-angle); use it for Task 1's preset roster (what do Kadence / Astra / Elementor actually ship?) |
| `/strategic-plan` | MANDATORY — plan order before writing code |
| `/qc-council` | before the Task 1 commit (blub.db 255) — seat a code-grounded reviewer |
| `/qc-inline` | per-file inline checks (Task 2) |
| `/sgs-wp-engine` + `/wp-block-development` | the block changes themselves |
| `/wp-block-themes` | pattern registration, `style.css` Version bump |
| `/sgs-db` | DB ground truth before any "missing X" claim |
| `/a11y-audit` | any control-surface change (Tasks 1 + 2) |

### MCP Servers & Tools

| Tool | For |
|---|---|
| playwright | the regression check, live DOM, editor automation via `wp.data`, multi-viewport |
| chrome-devtools | same, **but its profile is often locked by a co-active session — Playwright is the working fallback** |
| `sgs-db.py` | DB queries (`~/.claude/skills/sgs-wp-engine/scripts/`) |
| `ssh hd` | canary shell; `wp option get sgs_active_header_cpt_id` before measuring |

### Agents to Delegate To

| Agent | When |
|---|---|
| `feature-dev:code-reviewer` | before the Task 1 deploy — but TEST its findings, do not accept them (D393: it was wrong on its one high-severity claim) |
| `wp-sgs-developer` | mechanical follow-on only; tell it to EXECUTE, not delegate onward |
| `test-and-explain` | plain-English confirmation for Bean after the build |

---

## Guardrails

- Canary `sandybrown-nightingale-600381.hostingersite.com`; creds `.claude/secrets/sandybrown.env`
  (gitignored, always available); WP 7.0.2; **active header CPT 1570, active footer CPT 1654 — check
  the option, never infer from a name.**
- **Deploy is gated on a clean tree — commit BEFORE deploying.** `build-deploy.py --target
  sandybrown [--blocks-only]` is the ONE path. Never hand-roll tar/scp (D336: 2 client sites, ~2.5h
  down). Never `--allow-dirty` / `--skip-verify`.
- **The deploy's own HTTP-200 verify proves nothing** — and neither does an md5 match on its own
  (D394). Verify the deployed CONTENT after every deploy.
- **PHP changes need an OPcache reset:** write `<?php opcache_reset(); ?>` to webroot, curl it,
  delete it. The CLI pool is separate.
- **Bump `theme/sgs-theme/style.css` Version on ANY pattern change** — WP caches the pattern list
  against it. It is not a block version; the no-version-bumps rule does not apply.
- Editor edits go through `wp.data.dispatch('core/block-editor')` + `savePost()` — **never** WP-CLI on
  `post_content` (a PreToolUse hook blocks it, including `wp eval`). clientIds regenerate per session.
- **To capture a PHP fatal when `WP_DEBUG_LOG` is off:** a temporary read-only webroot probe
  (`require wp-load.php` + `display_errors` + a shutdown handler), deleted immediately after. Proven
  last session; `wp eval` is hook-blocked.
- Revert the canary to clean afterwards; delete every test post and confirm no stray `-autosave-v1`
  revisions (check DATES — 5 pre-existing ones are NOT yours).
- All on `main`, commit by EXACT PATH with `git branch --show-current` in the SAME command. **A
  blocked commit can read as SUCCEEDED — always confirm with `git log -1`.** The visual-diff gate
  sanctions `--no-verify` for non-visual changes; never fabricate a PASS report.
- **The uncommitted tree is the co-active track's** — do not commit `lucide-icons.php`,
  `.claude/next-session-prompt.md`, `reports/inline-styling-audit-*`, `.claude/specs/36-*`,
  `.claude/memory/session-2026-07-2*.md`, or any `mega-*` block files.
- **Methodology:** deploy before you measure; root cause before instance fix; outcome ≠ code shipped;
  verify the LIVE rendered output, not internal metrics.
