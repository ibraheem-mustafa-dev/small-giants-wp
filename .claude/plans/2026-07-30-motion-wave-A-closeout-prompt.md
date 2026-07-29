---
doc_type: session-prompt
spec_id: 38
spec_version: 1
status: active
created: 2026-07-30
---

# Wave A close-out — Spec 38 Motion System

Invoke `/autopilot` before anything else. Read `.claude/LEDGER.md` first; it wins over this
file. Spec 38 must read `status: active`. **PLAN MODE first** — investigate, present the plan,
get approval, then build. Co-active tracks share this worktree: path-scope every commit and run
`git branch --show-current` in the same command as each commit.

## State recap (plain English, no assumed pretext)

SGS now has a second motion tier. Tier V is the existing vanilla/CSS animation system; **Tier G**
is GSAP, loaded ONLY on pages that actually use one of its effects (a page using none downloads
zero bytes of it). Wave A built the loader, the shared runtime, the attribute grammar, the DB
registry and four effects: a scroll-scrubbed reveal, a section that pins while its contents
animate, a word-by-word text reveal, and a sideways-scrolling panel section.

All four are live and verified on real SGS blocks on the sandybrown canary. A two-rater
cross-model qc-council then measured the code against a gold standard built from GSAP's own docs
plus the installed gsap 3.15.0 source, and closed several real defects — including a pinned
section sitting hidden behind the sticky site header, and a text reveal that broke silently when
a client chose "Lines".

Five items remain. Item 1 is the only one a visitor would notice, and it is the priority.

---

## Task 1 — Horizontal panel travels ~264px too short

**What:** the sideways-scrolling section's last panel never reaches the position where the first
panel's content began, before the section releases and the page scrolls on.
**Owner's words:** "the 4th panel does show up but it doesn't go all the way across to the left
where the original panel's text was placed before it starts scrolling up again."
**Why:** it is the one remaining visitor-visible defect in Wave A.
**Estimated time:** 20 min.

**READ FIRST:** the block comment above `getTravelDistance()` in
`plugins/sgs-blocks/src/shared/effects/gsap/fx-horizontal-panel.js`. It records every
measurement and BOTH failed fixes. Do not repeat them:

- `track.clientWidth` → computes **0** (the track is `width: max-content`, so client width
  equals scroll width) and kills the effect outright.
- `track.parentElement.clientWidth` → identical to the host width here; changes nothing.

Both were built on a band width of **969px that was INFERRED from `1200-231` and never
measured**. The real value is 1200. Do not trust that number; measure everything.

**Measured facts** (1440×900, four panels): `track.scrollWidth` 4189 · host `clientWidth` 1200 ·
band `clientWidth` 1200 · travel applied 2989 (**the tween DOES reach its target — the target is
what is wrong**) · panel 1 starts at −111 relative to the band · panel 4 ends at +153 · residual
gap ~264px.

**Method:** measure each panel's `offsetLeft`, plus computed `gap` and `padding-inline` on BOTH
the band and the track, and derive the target from where panel N must LAND. Do not subtract one
width from another.

**Orchestration:** inline (main thread, Opus). Shared surface, three prior failures — not
delegable.
**/qc gate after:** yes — `/qc-inline`.
**Acceptance:** panel 4's left edge finishes where panel 1's left edge began (within ~4px),
asserted on the live canary. "It translated" is NOT acceptance — that assertion is what let this
defect survive twice.

## Task 2 — Apply the matchMedia consumer change

**What:** `provider.js` now passes its matchMedia context to `setup` as a second argument.
`fx-horizontal-panel.js` still mints a second `gsap.matchMedia()` inside that context.
**Why:** closes gold-standard item 14 ([MUST]) — nesting reverts the same trigger twice.
**Estimated time:** 5 min.

Take `( gsap, context )`, replace `const mm = gsap.matchMedia()` with
`context.add( '(min-width: 768px)', … )`, and drop `return () => mm.revert()` —
`withMotionAllowed` already reverts. Return any inner cleanup from the `context.add` handler.

**Orchestration:** inline. **Depends on:** Task 1 (same file — sequence them, don't interleave).
**Acceptance:** one matchMedia per page for this effect; panel still pins and translates after.

## Task 3 — Two dead attributes

**Estimated time:** 15 min. **Orchestration:** delegated, Sonnet via `/delegate`, single agent.
**Parallel with:** Task 1 (different files — but it must NOT touch `fx-horizontal-panel.js`).

- **`fxEnd`** — read by scrub, pin-scrub AND horizontal-panel, but has no control. Its meaning
  differs per effect (scroll position vs pin length), so this needs a **design decision before a
  control**: bring Bean ranked options, do not guess.
- **`fxTrigger`** — registered in `fx.js`, emitted by the JS save path AND
  `includes/fx-attributes.php`, reset by the panel, and read by **no** effect module. Either
  wire it or delete it across all three files plus the generated mirror.

**Acceptance:** no attribute in the fx surface is either unreadable or unwritable. State which
of the two you did for `fxTrigger` and why.

## Task 4 — Confirm the desktop + reduced-motion arm of the panel

**What:** one probe showed `overflow-x: hidden`, `scroll-snap-type: none` and the last panel
**unreachable** at 1440px under `prefers-reduced-motion: reduce`.
**Why:** unreachable content is the one failure this wave treats as a defect rather than a
degradation. It may be a Playwright emulation artefact — it was never confirmed either way.
Mobile reachability verified clean.
**Estimated time:** 10 min. **Orchestration:** inline, Playwright MCP.
**Acceptance:** a recorded result either way. "Cannot tell" is a FAIL — extend the measurement.

## Task 5 — Bean's eye on the canaries (R-31-13)

Seven pages at `/motion-canary-*` on sandybrown: control, scrub, pin-scrub, horizontal-panel,
split-reveal, exclusivity, omit-dynamic. **Each page states its own pass/fail criteria in plain
English on the page itself** — that was a fix this session; the first round asked for sign-off
without telling him what correct looked like. Do Task 1 first, or the panel page will fail.

---

## Dependency graph

```
Task 3 (delegated, sonnet)  ∥  Task 1 (inline, Opus) → Task 2 (inline, same file)
                                       ↓ /qc-inline
                                  Task 4 (inline, Playwright)
                                       ↓
                                  Task 5 (Bean's eye)
                                       ↓
                            commit + push (verify git log -1)
```

## Methodology guardrails (do not skip)

- **A check that something CHANGED cannot detect it changing by the WRONG amount.** Assert the
  final value against the required value. This is exactly how Task 1's defect survived two
  rounds of "verification".
- **Never infer a measurement and then build on it.** Task 1's two failed fixes rest on a 969px
  band width that was arithmetic, not observation.
- **`.every()` on an empty array returns `true`** — a vacuous pass. Assert non-empty first. This
  nearly certified accessibility on zero elements this session.
- **Verify on real SGS blocks**, never core blocks or hand-written HTML. Eight of nine canaries
  were rebuilt for exactly this reason (`core/paragraph` and `core/group` are banned).
- **Ship every gate with a `--self-test` that proves it can fail.**
- **Deploy before measure** — `build-deploy.py` runs the build; a probe against a stale deploy
  measures nothing.
- **`git log -1` after every commit** — a gate-blocked commit looks exactly like a successful one.
- **Council findings are hypotheses.** Two rater premises of mine were corrected from source
  this session, and one rater finding was rejected after checking the file.

## Tooling (WordPress project — Gate 5)

| Skill | When |
|---|---|
| `/autopilot` | FIRST (auto-injected) |
| `/brainstorming` | Task 3's `fxEnd` design decision |
| `/strategic-plan` | If Task 1 turns out to need a structural change |
| `/research` | If GSAP behaviour is unclear — prefer the installed source over docs |
| `/gap-analysis` | Grade the close-out before declaring Wave A done |
| `/lifecycle` | Only if a skill/agent/gate changes |
| `/sgs-wp-engine` | All block/extension work |
| `/qc-inline` | After Task 1 and Task 2 |
| `/verify-loop` | Two attestations on Task 1's fix |
| `/delegate` | Model choice for Task 3 |
| `/handoff` | Session close |

| MCP / tool | For |
|---|---|
| Playwright MCP | Tasks 1 and 4 — live DOM measurement is the only acceptance signal |
| `/sgs-db` | Effect registry (`fx_effects`), block roster |
| `/wp-blocks` | Attribute schema before any "missing X" claim |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task 3 if it grows beyond the two attributes |
| `code-reviewer` | Before the Task 1 commit (shared effect surface) |

## Guardrails

Deploy with `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown
--blocks-only`. Never hand-roll tar/scp (D336: two client sites down ~2.5h). **No
`--allow-dirty`** (it was used once this session and should not have been) and no
`--skip-verify`. No CDN references. No `deprecated.js`. UK English. Close with `/handoff`.
