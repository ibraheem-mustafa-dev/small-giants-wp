# Wave-gradient: get Bean's verdict on the working version, then close this track out

Invoke `/autopilot` before anything else.

**Your job:** the flowing-gradient hero effect (FR-38-31, canary page 2740) went through two full
diagnose-fix-deploy-verify rounds this session and a real rendering bug just got fixed. Bean's last
words were *"it is now at least working"* — that is NOT yet a verdict on the look, only confirmation
the bug is gone. **Get the actual verdict, then execute whichever branch of the pre-agreed decision
tree it lands on** (below). Do not start a third round of shader tuning without that verdict.

⛔ **This is round 2 of ONE agreed bounded experiment.** Bean has said "we absolutely need to move
on" twice this session. If the verdict is anything short of "good, ship it", the next step is **his
decision** between (a) ship the current version and park further polish, or (b) escalate to the
deferred full rebuild — not a third silent iteration on your own judgement.

---

## 1. Read these, in this order

1. `.claude/decisions.md` **D822 → D828, most-recent-first** (D828 is the regression + fix; D827 is
   the technique change; D822/D823 are the earlier palette/toggle round; D824 is the shader
   colour-pipeline council). This IS the session — read all six before touching anything.
2. `.claude/LEDGER.md` → `## ▶ MOTION TRACK` section — current one-paragraph status.
3. `plugins/sgs-blocks/src/shared/effects/webgl/wave-gradient.js` — the file itself. Its own
   docblock (top of file) restates the full technique-change history; read it in full, not just the
   function bodies.

Do **not** re-read `.claude/reports/2026-08-25-flowing-gradient-technique-spec.md`. It was NO-GO'd
by a six-seat council (D794) and superseded twice since. Building from it is the exact failure mode
this whole track exists to avoid.

---

## 2. What this session already did — do not redo it

- **Palette + toggle contrast + context-loss fix** (D822/D823) — light hue-adjacent palette, Pause
  toggle contrast ~10.7:1, GPU-context-loss recovery. All live-verified on real GPU hardware.
- **A 4-persona adversarial council** (D824) root-caused "reads as cheap 3D" to three specific shader
  bugs (pre-interpolation sharpening, gamma-space blending, mesh fold-over) — fixed, but Bean's
  fuller critique afterward ("aurora", "different opacity", "not globby/pudding") showed the
  colour-maths fixes weren't the real gap.
- **A full technique change** (D827): vertex-displaced mesh → fullscreen-triangle + per-pixel
  drifting noise fields. This is what actually answers "no more mesh, no more pudding, soft edges
  not sharp ones" — do not revert it or reintroduce vertex displacement.
- **The additive-blend regression** (D828): the first cut of D827 blew out to solid white on the
  light palette and read as static on the warm one. Root-caused with a WebGL2 bisection harness
  using the exact live uniform values — not guessed. Fixed with standard alpha-OVER `mix()`.
  Re-verified via actual screenshot pixel sampling (not `readPixels`, which raced the browser's own
  buffer-clear between frames on this canvas config — see §5).
- **Toggle `[hidden]` specificity bug** (D826, a different session) — already fixed, `:not([hidden])`.

---

## 3. Where Bean decides — get this before doing anything else

**The one open call.** Show Bean the live page (URL below) or the last screenshots sent, and ask
plainly: *does the look itself work now, separate from the bug that's fixed?*

| Verdict | Next action |
|---|---|
| "Good, ship it" | Close this track. Update `decisions.md` + `LEDGER.md` with the final verdict, run `handoff-preflight.py --check`, move to the 5 client builds. |
| "Better, but still off" in some SPECIFIC, nameable way | Bring the specific critique back to Bean framed as the same fork as before: one more bounded, measured attempt vs park it. Do not decide this yourself — his fatigue with this topic is explicit and repeated. |
| "Not it, park this" | Revert nothing (the code is fine, just not loved) — leave FR-38-31 defaulted off as it already is, note in `decisions.md` that the experiment concluded without a shipped aesthetic win, and move to client builds. |
| "Go to the full rebuild" | This is Phase 3 (deferred, never started) — needs a fresh `/brainstorming` + `/strategic-plan` session, not a continuation of this file. Say so plainly rather than starting shader work inline. |

Do not spend session time on anything else until this verdict is in hand.

---

## 4. Tools + URL

- **Canary: page 2740** — `https://sandybrown-nightingale-600381.hostingersite.com/?p=2740`
  (`[GATE — DO NOT DELETE] Flowing gradient — FR-38-31`). Two sections: first uses the framework
  default light palette, second is a deliberately different custom warm palette (proves per-instance
  colours still override defaults — do not "fix" the second section to match the first).
- Playwright MCP may be locked by a concurrent session (it was, repeatedly, this session). If so, use
  your own isolated Playwright instance — see the pattern in §5, or ask if the shared browser is free.
- `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` — the deploy
  tool, but **read §5 before running it directly on `main`.**

---

## 5. Hazards this session hit — read before deploying or verifying anything

- ⛔ **`main` is shared by 5+ concurrent tracks and was dirty or actively `git commit`-locked
  multiple times this session.** Deploying straight from the primary worktree failed repeatedly on
  other tracks' unrelated uncommitted work and unrelated gate failures (site-header, multi-button,
  nav-drawer — none related to this effect). **The working pattern:**
  ```
  git worktree add --detach ../sgs-deploy-clean origin/main
  # PowerShell, to reuse installed deps without a slow reinstall:
  New-Item -ItemType Junction -Path "...\sgs-deploy-clean\plugins\sgs-blocks\node_modules" -Target "...\small-giants-wp\plugins\sgs-blocks\node_modules"
  New-Item -ItemType Junction -Path "...\sgs-deploy-clean\plugins\sgs-blocks\vendor" -Target "...\small-giants-wp\plugins\sgs-blocks\vendor"
  # build + gate as normal inside the clean worktree, then:
  python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --skip-build --skip-oldshape-audit --skip-gate-full
  # cleanup — UNLINK junctions before removing the worktree, never `rm -rf` through them:
  Remove-Item "...\node_modules" -Force ; Remove-Item "...\vendor" -Force
  git worktree remove --force ../sgs-deploy-clean
  ```
  Confirm each fast-tier gate failure is genuinely unrelated (check the block/file it names) before
  skipping it — do not blanket-skip without checking.
- ⛔ **A shared `node_modules` package (`@babel/parser`) vanished mid-session** from concurrent
  activity, breaking `check-undefined-refs` with a misleading "not installed" message. Fixed with
  `npm install --no-save` in the primary worktree. If a gate fails with a missing-module error,
  suspect this before suspecting your own code — verify with `node -e "require.resolve('pkg-name')"`.
- ⛔ **Backticks inside a GLSL string that's itself a JS template literal terminate the JS string
  early.** This file already got broken by this once (this session) and had already been fixed for
  it once before that. When editing `SIMPLEX_3D`, `VERTEX_SHADER`, or `FRAGMENT_SHADER` in
  `wave-gradient.js`, never use a backtick inside the template body — including inside `//` GLSL
  comments. `npm run build` will fail loudly if you do; don't ignore that failure as unrelated.
- ⚠ **`gl.readPixels()` from a separate, delayed script call against an already-running,
  continuously-animating canvas is unreliable** (`preserveDrawingBuffer` is not set, so it can race
  the browser's own buffer-clear between frames and read stale/cleared state). This produced a false
  "still solid black" reading that nearly triggered a false "still broken" report. **Use actual
  screenshots (`page.screenshot()` / element `.screenshot()`) and sample pixels from the saved PNG
  with PIL** — that reflects what was genuinely composited. `readPixels()` is fine ONLY inside a
  single synchronous draw-then-read in the same script call (e.g. an isolated bisection test).
- ⚠ **This sandbox's default headless Chromium has no GPU** (SwiftShader/software rendering) unless
  launched with `--use-gl=angle --use-angle=default --ignore-gpu-blocklist --enable-gpu`. Without
  those flags the capability gate correctly declines WebGL and you'll only ever see the CSS
  fallback — do not mistake that for a bug.

---

## 6. Done when

- Bean's verdict from §3 is in hand and acted on (one of the four branches executed, not just noted).
- `decisions.md` has the closing entry (whichever branch fired) with the D-ceiling re-derived
  immediately before commit.
- `LEDGER.md`'s motion-track section reflects the closed state — fold into the existing section,
  don't append; it has been near/over its byte cap most of this session from concurrent tracks.
- `python .claude/hooks/handoff-preflight.py --check` passes (or the only failure is the
  self-healing `decisions-size` check, which is expected per this project's own documented policy —
  do not "fix" it).
- If the verdict was "good, ship it" or "park it": the 5 client builds become the next actual work,
  not more of this track.
