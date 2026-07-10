---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-10
thread: effective-value typography-lift MECHANISM (pipeline robustness) — the general safety net Bean directed
---

# NEXT SESSION — effective-value typography-lift mechanism (`P-EFFECTIVE-VALUE-TYPOGRAPHY-LIFT`)

Invoke `/autopilot` first. **D303 shipped both fidelity tasks** (residual render-precedence — hero H1 58px
LANDED; pills; section-heading letter-spacing fixed theme-side). Bean's remaining directive: *"we should
have a mechanism that can deal with it if necessary."* The pipeline still only lifts EXPLICITLY-declared
typography — an INHERITED or CSS-initial (`normal`) draft value is never lifted, so any theme default that
differs silently wins. Build the general mechanism so a clone ALWAYS matches the draft's typography.

## State recap (plain English)
`main` pushed @ `83d133aa` (D303 core) + `da58ea48` (snapshot M2) + handoff docs. Build green (440 tests +
all gates). Sandybrown page 8 = fresh D303 clone + snapshot; verified live 375/768/1440. Both prior Tasks DONE.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D303 session) + `.claude/decisions.md` head (D303 + D301/D302).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3 F-fork + §13.4 **FR-31-5.1** (inherited-value
   resolution — the mechanism EXTENDS this from text-align to letter-spacing/line-height) + **FR-31-5.2**
   (D303 bounding + class-match architecture) + §7b (verify vs draft).
3. `.claude/parking.md` head — **`P-EFFECTIVE-VALUE-TYPOGRAPHY-LIFT`** (the task, fully specified) +
   `P-SNAPSHOT-ARBITRARY-LETTER-SPACING` (other 5 snapshots).
4. Surfaces you WILL touch: `converter/services/styling_helpers.py` (`collect_css_decls_for_element`),
   `converter/resolvers/typography.py`, the conformance goldens (`tests/`).

## ⛔ ANTI-PATTERN STOPs (carry forward + this session's)
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `npm run build` (PowerShell);
  `python -m pytest plugins/sgs-blocks/scripts/converter/tests -q --import-mode=importlib` (440).
- **STOP-21 (reinforced HARD this session)** — emit-green ≠ LANDED. D303's multi-button rendered `display:block`
  with a fully GREEN build because `$uid` was an id not a class; only the live 375/768/1440 computed-style check
  caught it. LANDED = deploy + OPcache reset + live computed-style at 3 breakpoints. Memory
  `normalise-scope-needs-uid-as-class-not-just-selector`.
- **STOP-60** — the effective-value lift will add explicit `letterSpacing`/`lineHeight` attrs to many elements →
  conformance goldens change. Re-seed deliberately, per-section, LANDED-proof-cited (NOT a blanket re-seed).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; the dependable signal =
  direct Playwright content-matched computed-style comparison + Bean's eye.
- **STOP-67** — pre-commit visual-diff gate needs `reports/visual-diff/<block>-<date>.md` (EXACT name,
  `verdict: PASS` + `first_paint_capture_passed: true`) per CHANGED block. The commit hook BLOCKS without it.
- **safecss strips functional colours** — any INLINE colour VALUE must be hex/named/var (D302).
- **Harness/node runs via PowerShell** (nvm4w shim broken in Git Bash). Python works in Bash.
- **Path-scoped commits** — `git commit -m <msg> -- <paths>` (message BEFORE `--`); `git add <file>` for NEW
  files first (commit -- won't stage untracked). Never `git add -A` (two threads share main). Don't pipe git to tail.

## The task — effective-value typography lift (route by DB role, D301)
In `collect_css_decls_for_element`, after collecting the element's own declarations: for each inheritable
typography prop (letter-spacing, line-height) ABSENT from the collection, resolve the EFFECTIVE value by
walking the draft node's ancestor chain (else CSS initial `normal`) and emit it as a base declaration so the
typography resolver lifts it → the block's own (0,2,0) rule overrides ANY theme default. Scope to genuine text
elements; "always emit even `normal`" is correct (that's what overrides the theme); route by DB `role`, never a
property-name list (D301). Design-gate + `/qc-council` (shared extraction). Acceptance: a heading whose draft
letter-spacing differs from the theme renders the DRAFT value live at 375/768/1440.

## Skills | MCP | Agents
- `/systematic-debugging` (trace one element), `/brainstorming` (fix shape), `/qc-council` (shared-render),
  `/gap-analysis` (grade), `/sgs-clone` `/sgs-db` `/wp-blocks` (ground truth), `/handoff` `/capture-lesson` (close).
- Playwright / chrome-devtools (live computed-style 375/768/1440); Hostinger MCP (cache); REST app-pwd
  `.claude/secrets/sandybrown.env` (user `Claude`, `--app-password` flag, spaces stripped — NOTE the env file
  has unquoted specials, pass creds inline don't `source` it).
- general-purpose (Sonnet, SOLO, read-only-parallel-fine) for traces; feature-dev:code-reviewer pre-commit.

## Methodology guardrails
- Read the governing spec IN FULL. Root cause before fix. Deploy + purge + live computed-style BEFORE measure.
- Design-gate the shared-extraction change + Bean approval. Branch `main`; path-scoped commits. No version bumps.
