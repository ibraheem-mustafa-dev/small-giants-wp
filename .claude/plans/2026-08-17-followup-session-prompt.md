---
doc_type: session-prompt
project: small-giants-wp
created: 2026-08-17
status: READY — paste into a fresh session
---

# Follow-up session prompt — two items from 2026-08-17

Paste everything below the line into a fresh Claude Code session.

---

Invoke `/autopilot` before doing anything else.

Two small, independent items left over from the 2026-08-17 session. Both are already diagnosed —
the investigation is done, the causes are proven, and neither needs re-researching. What's left is
a design call on one and a one-line text fix on the other. Read `.claude/LEDGER.md` first for
current state, then `.claude/decisions.md` D650 and D651 for how these two surfaced.

⚠ **This is a SHARED worktree — other sessions commit to `main` concurrently.** Before every commit:
run `git status` and check for files you did not touch, then commit with an explicit pathspec
(`git commit -m "..." -- <paths>`). Never a bare `git commit`, never `git add -A`. If the tree has
another track's uncommitted work in it, leave it completely alone and work around it.

---

## Task 1 — `sgs/mega-group`'s `templateLock:'all'` silently destroys stored child content

**What:** `sgs/mega-group` sets `templateLock: 'all'` in its block.json. WordPress's editor drops a
locked block's stored InnerBlocks children on load when they don't match the declared template, and
that loss becomes permanent on the next save.

**Why it matters:** this is the real, proven cause of Track 2's canary (post 2164) losing a text
node on 2026-08-07 — an incident that was previously recorded as an unexplained one-off content
accident. It is not an accident and it is not one-off: it reproduces by construction. Deleting and
recreating the page loses the text again the moment anyone opens it in the editor. Any client page
using a mega-menu is exposed to the same silent data loss.

**Already established (do not re-derive):**
- The mechanism is confirmed — see `.claude/memory/session-2026-08-07.md` (search "2164"), which
  records the original incident and correctly identified `templateLock:'all'` as the cause even
  then, while treating it as unfixable.
- No build gate covers this class. `check-dead-pattern-attrs.py` checks attributes only; nothing in
  the ~50-gate chain parses stored InnerBlocks children against a block's template.

**What to do:**
1. Read `plugins/sgs-blocks/src/blocks/mega-group/block.json` + `edit.js` and confirm the current
   `templateLock` value and what its `template` declares.
2. Work out the right fix shape. Candidates, in rough order of preference — but investigate before
   choosing, don't assume:
   - Relax `templateLock` to `'insert'` (children can't be added/removed but existing ones survive)
     or drop it entirely.
   - Restructure so the text isn't a re-lockable InnerBlocks child in the first place.
   - Keep the lock but make the template match what's genuinely stored, so nothing is ever dropped.
3. ⛔ **Check with Track 2 before touching anything.** Post 2164 is their canary and
   `sgs/mega-group` may be inside their active scope. Confirm the block is free to change before
   editing it — a collision here is exactly what the 2026-08-17 session had to work around twice.
4. Verify the fix the only way that actually proves it: save a page containing a mega-group with a
   text child, reload it in the editor, save again, and confirm the child survives the round-trip.
   A green build proves nothing about this defect — the whole point is that it passes every gate.

**Acceptance:** a mega-group's stored text child survives an editor load→save cycle, demonstrated on
a real page, not asserted.

**Orchestration:** inline, main thread. Small and judgement-heavy — a design call plus a
cross-session check, not mechanical work. Don't delegate this one.

**Time:** ~20 min once Track 2 confirms it's free to change.

---

## Task 2 — Correct a false justification in `element-manifest-baseline.json`

**What:** the reason text for the two `hero` / `info-box` `css:border-color-gradient (hover)` entries
in `plugins/sgs-blocks/scripts/element-manifest-baseline.json` claims those blocks have *"no resting
border-colour attribute at all"*. That is false.

**The actual truth (verified twice — once by a review agent, once independently at
`hero/block.json:119` and `info-box/block.json:82`):** both blocks declare
`supports.__experimentalBorder.color` and map it at BASE level via
`"css:border-color": "native:__experimentalBorder.color"`. That is a real, wired, client-facing
resting border colour — WordPress's own native Border panel control.

The genuine gap is narrower than the text claims: WordPress core has never supported a resting-state
*gradient* border, so no resting counterpart can exist for that specific manifest member. The
accepted gate COUNT is therefore correct and must NOT be reverted.

**Why it's worth fixing:** the number is right but the reasoning is wrong, and the reasoning is what
a future reader acts on. Someone could take "this block has no resting border concept at all" at
face value and skip a genuine gap elsewhere on that basis.

**What to do:**
1. Read the two entries in `plugins/sgs-blocks/scripts/element-manifest-baseline.json` (search
   `hero` and `info-box` + `border-color-gradient`).
2. Replace only the reason text, along these lines:
   > *"resting border colour is WP-native `__experimentalBorder.color` (flat colour only — WP core
   > has no resting-state border-gradient capability); the hover-only gradient sibling adds a
   > capability that exists only on hover, by design, not because the block lacks a resting border
   > control."*
3. Do NOT change the gated count or the instance list — the count is correct.
4. Run `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js --check` (expect GATE
   PASS, unchanged) and `cd plugins/sgs-blocks && npm run build`.

**Why this was left rather than just done:** edits to `element-manifest-baseline.json` are treated as
needing explicit sign-off, since raising a baseline is normally stop-the-line. This one is text-only
with zero effect on the gate, but the file's own convention was respected rather than quietly
overridden. **Get Bean's go-ahead, then it's a 2-minute fix.**

**Acceptance:** reason text accurately describes the real gap; conformance gate still PASSes with
the same counts; build green.

**Orchestration:** inline. Trivial once approved.

**Time:** ~5 min.

---

## Guardrails

- **Run builds synchronously, never in the background.** Three of five dispatched agents on
  2026-08-17 stalled by backgrounding their own build and ending the turn — background subagents are
  not woken mid-tool-call, so they just sit there. Cost three resume round-trips.
- **A completeness error is invisible to every correctness gate** (STOP-TRUNCATED-SURVEY, new
  2026-08-17). Never pipe a population-defining survey through `head -N`; count first (`| wc -l`).
  Re-query the population at close-out rather than closing against the list you opened with.
- **Verify the effect, not the exit code.** Task 1 in particular passes every existing gate while
  being broken — the only proof is the editor round-trip.
- **`/qc` multi-rater before any commit** touching converter / pipeline / SGS block logic.
- Pre-commit visual-diff gate: if it blocks a genuinely no-op-for-existing-content change, use the
  scoped bypass (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."`), never `--no-verify`.

## Tooling

| What | Use |
|---|---|
| SGS block / theme work | `/sgs-wp-engine`, `wp-sgs-developer` agent |
| Schema / attribute lookups | `/sgs-db`, `/wp-blocks` — never guess an attribute shape from its name |
| Live verification | Playwright MCP; canary creds in `.claude/secrets/sandybrown.env` |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` |
| Session close | `/handoff` |
