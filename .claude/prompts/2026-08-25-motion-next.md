# Motion track — next session

Invoke `/autopilot` before anything else.

**This session starts in PLAN MODE and stays there until Bean has answered §2.** The whole point
of that stage is to ask every question at once, so the build afterwards runs without stopping.
Do not begin §3 until §2 is answered.

---

## 1. Mandatory reading, in this order

1. `.claude/plans/2026-08-24-spec38-motion-register.md` — the session-close audit is at the top.
   It states what closed, what opened, and four method failures worth not repeating.
2. `.claude/specs/38-SGS-MOTION-SYSTEM.md` — **in full**. Not a grep. Issues surface in sections
   you did not plan to touch, and the whole spec in context is what lets you diagnose them.
3. `.claude/decisions.md` **D766** and **D767** — the two decisions this track added.
4. `.claude/LEDGER.md` — establish which of the live tracks you are before touching anything.

**Pre-conditions, checked in the same command as any commit:**
`git branch --show-current` (expect `main`) and
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
⚠ The D-ceiling moved mid-session last time. Re-check immediately before writing any D reference.

⛔ **The worktree is SHARED and another track commits into it constantly.** Commit by exact path,
never `git add -A`. Deploy with `--payload <your paths>`, never `--allow-dirty`. Expect `build/`
to vanish under you — the other track's `clean:build` deletes it, and their prebuild ratchet may
be red for reasons that are not yours. Prove a gate failure is yours before acting on it.

**Canary: page 2721** — five looks, three controls, one page. 2716 and 2717 are deleted.
The four gate-wired fixtures are 2103 / 2109 / 2113 / 2603; 2721 is not one of them.

---

## 2. PLAN MODE — put these six decisions to Bean in one pass

Three research agents surveyed award-winning cursor work. The findings are below so nobody
re-researches them. Each decision carries a recommendation; Bean picks from the menu.

### The research, compressed

- **Lerp/momentum** — the universal pattern is `current += (target - current) * factor`.
  **0.1-0.2 reads as heavy drag, 0.3-0.5 as snappier but still eased.** Already shipped as TRAIL.
- **Custom cursor replacement** — the accessibility camp is **unanimously against** it as
  commonly built: Eric Bailey (*"Don't use custom CSS mouse cursors"*), dbushell, Funka
  Foundation. It overrides OS cursor size and contrast settings that users deliberately chose,
  and it obscures what they are looking at. **No WCAG criterion bans it.** No accessibility
  specialist gave it a clean bill of health even when mitigated. Known mitigations: gate on
  `(any-hover: hover) and (pointer: fine)`, honour `prefers-reduced-motion`, match native cursor
  size, keep semantic cursor states over interactive elements.
- **Magnetic buttons** — sourced as genuinely current in 2026. Small vanilla JS, no library.
  Canonical reference `codrops/MagneticButtons`.
- **Particle/spark trails** — Canvas 2D suffices at moderate counts (Codrops' Mark Appleby
  tutorial builds it with no library); WebGL only once blending and volume grow.
- **WebGL image distortion** — still a genuine differentiator, not commoditised. Every real
  implementation uses three.js, PixiJS or OGL. **three.js is banned here at 182KB gzip.**
- **Basic "dot follows mouse"** — probably dated. ⚠ The researcher flagged this as inferred from
  an absence of recent coverage, not a direct claim. Treat it as weak.

### D1 — Magnetic buttons?
An element nudges toward the pointer within a radius. Small vanilla JS, no library, degrades to
nothing on touch. **Recommend BUILD.** Question for Bean: which blocks — `sgs/button` only, or
`sgs/multi-button` and `sgs/icon` too?

### D2 — Custom cursor replacement?
**Recommend NOT BUILDING it as a cursor replacement.** The accessibility objection is real and
unanimous, and the framework's clients are SMEs and charities with procurement and accessibility
obligations. If Bean wants it anyway, that is his call to make with the evidence in front of him —
and the four mitigations above become mandatory, not optional.

### D3 — Spark / particle trail?
Bean asked for this by name. It is autonomous motion, so it owes an **SC 2.2.2** answer that
`prefers-reduced-motion` does not supply. Canvas 2D at moderate particle counts. **Recommend
BUILD, with a hard particle cap and a stop-on-idle rule** — decide the cap in the design gate,
not mid-build.

### D4 — WebGL image distortion as the second Tier W effect?
Tier W is a CLOSED list holding one entry (`surface-treatment`). Admitting a second needs a
D-number and the five-part §1.2b test. ⚠ The current single-pass renderer **cannot express
multi-pass**, which is the same wall the fluid field hit — `webgl/README.md:53-58` records an
agent nearly being dispatched against a contract that could not detect the mismatch.
**Recommend DEFER** until something needs it commercially.

### D5 — `floating-objects`, the fifth field type?
Blocked on one question nobody has answered: **which children become floating objects?** Every
other field type paints a shared background layer; this one moves discrete elements, so it needs
an opt-in marker crossing block boundaries. **Recommend a design gate, not a build.**

### D6 — Should TRAIL default change from 0?
It currently defaults to 0, so nothing authored changed. A gentle default (≈40-60) would make all
five looks feel better out of the box. **Recommend asking Bean after he has moved his mouse across
page 2721** — this is a feel judgement, not a technical one.

---

## 3. BUILD — after §2 is answered

### Task A — open the editor. Do this first, whatever else Bean picks.
**Every verification on this feature is frontend. Nobody has opened the block editor.** §9's
cursor-field row is honestly flagged *"reasoned, not observed"*, and that flag is correct.

Log in with `/playwright` using `.claude/secrets/sandybrown.env`, open a page carrying a
cursor-field block, and confirm by looking:
- the Field style dropdown lists **all five** looks,
- Field shape and Trail render and change the canvas or say plainly that they do not,
- no console errors, no block-validation banners.

⛔ This project has shipped **0 of 6 blocks rendering in the editor while 5 of 5 rendered live**.
A frontend pass is not an editor pass. Update §9's row to "observed" ONLY if you observed it.

### Task B — build whatever Bean chose in §2.
Every new field type must satisfy invariant **I8**: read `--sgs-cursor-local-x/y` in its mask and
declare `--sgs-cursor-field-participant-layer: none`. The gate fails the build otherwise, and its
self-test proves it can fail.

### Task C — Bean's eye (R-31-13).
Numbers do not close a fidelity question. Send screenshots; ask directly.

---

## 4. Method — earned in the last session, not theory

- **Render it before claiming it.** Three "seamless by construction" tiling claims were made and
  all three were wrong. A screenshot refuted each one.
- **An absence verdict is only as wide as its search.** Twice a feature was reported "never built"
  after searching for the name or file expected rather than the capability.
- **A commit body is not a living doc.** A live defect sat in one for hours while the session's
  decision entry congratulated itself for repairing stale claims elsewhere.
- **Assert every scripted edit.** One CSS edit without an assert matched nothing, did nothing, and
  reported success. The computed style caught it; the script did not.
- **A green gate proves nothing until you have seen it fail.** I8, I6 and the seam detector were
  each proven by planting the defect and watching them fire. Do the same for anything new.
- **Verify BOTH surfaces.** Frontend and editor are different, and only opening the editor finds
  what the editor breaks.

## 5. Tooling

| Use | For |
|---|---|
| `/delegate` | every dispatch — route before spawning |
| `/qc-council` | validating a fix-shape before building it. It earned its place last session: it killed a preferred option, settled a rater's challenge, and found a dead control |
| `/playwright` | all live verification, frontend AND editor |
| `build-deploy.py --target sandybrown --blocks-only --payload <paths>` | every deploy |
| `check-fx-list-drift.py --check` / `--self-test` | after any field-type or fx-attribute change |
