# Generative background engine — Phase 1: pick the reference

Invoke `/autopilot` before anything else.

**Your job:** produce ONE side-by-side comparison page so Bean can point at a single reference.
Then stop. Do not write engine code, and do not start Phase 2.

This is a decision-gathering session, not a build session.

---

## 1. Mandatory reading

1. `.claude/plans/2026-08-27-generative-background-engine.md` — the whole plan. Read the section
   headed "What the SIX-STYLE VARIANT work established" before Phase 1; it settles several
   questions you would otherwise argue from scratch.
2. `.claude/decisions.md` **D871** — closes the six-style engine. Establishes what shipped, what
   was cancelled and why, and two deploy hazards that will bite you.
3. `.claude/decisions.md` **D781** — the rule this phase exists to obey, recorded in capitals
   after three attempts were built against a reference nobody had looked at:
   **VERIFY THE REFERENCE, NOT JUST THE IMPLEMENTATION.**

⛔ **Two separate tracks. Never merge them.** The shipped `fx-wave-gradient` six-style engine is
CLOSED. This POC rebuild is a different piece of work. They shared one plan file once and it cost
a full session (D838).

---

## 2. Why this phase exists

Three aurora attempts and a full Tier W build were made against a reference nobody had chosen.
Every round since has steered *away from what Bean rejected* without ever steering *toward* a
defined target. The plan's own verdict on what that produces: "blurry random shapes".

⛔ **The six shipped styles do NOT satisfy this phase.** That shortlist chose the shipped styles.
It did not choose this rebuild's reference. Do not treat Phase 1 as done.

---

## 3. First action — under 5 minutes

Open canary page **2740** (`[GATE — DO NOT DELETE] Flowing gradient — FR-38-31`) and screenshot it
at 1440px. That screenshot is the "current state" cell of your comparison. Everything else in this
session is assembled around it.

---

## 4. The deliverable

One Artifact page. Each candidate sits beside the current page-2740 effect at the same size, so
Bean compares like for like and points at one.

⛔ **Not a wall of links.** A list of URLs is what previous rounds produced, and it is why no
reference was ever chosen.

Candidates already gathered (2026-08-27):

| Candidate | Technique |
|---|---|
| [Aceternity aurora](https://ui.aceternity.com/components/aurora-background) | CSS gradients, dark ground |
| [shadcn aurora](https://www.shadcn.io/background/aurora) | CSS, emerald/teal |
| [Lightswind aurora shader](https://lightswind.com/components/aurora-shader) | WebGL, pointer-reactive |
| [21st.dev aurora-blur](https://21st.dev/@unlumen/components/aurora-blur) | WebGL drift |
| [Superdesign Aurora UI](https://superdesign.dev/styles/aurora) | The style definition + canonical palette |

Add candidates if you find better ones. Say why each earns its place.

**The canonical recipe**, for whatever gets built: near-black base (~`#05010f`); soft flowing bands
from layered radial/conic gradients blurred together; **three to four hues maximum** (indigo, teal,
pink, violet — beyond four it muddies to brown); slow cycle, about 18 seconds in the CSS form.

**Known failure modes, which the comparison must make visible:** body text over the raw gradient
can drop below 4.5:1 as colours move; it fails behind tables, forms and long-form reading; it needs
a reduced-motion fallback.

---

## 5. The gate

⛔ **Bean names a reference. Nothing else starts until he has.**

When he picks one, stop. Phase 2 (finishing the technique spec) is a separate session and depends
entirely on his answer.

---

## 6. What is already settled — do not re-litigate

- **CSS cannot render an aurora.** Three attempts failed three different ways: bars, ovals, haze.
  Filaments need per-pixel noise and domain warping; CSS has neither. A ceiling, not a tuning
  problem.
- **Bean's aesthetic target is known and measured.** He rejected dark saturated attempts and
  approved a mid-luminance pastel field: mean luminance 157, hues running lavender → blue-grey →
  mint → violet.
- **One shader can carry two looks.** Measuring the base colour and crossfading between additive
  and darkening compositing gives an aurora on dark and drifting pigment on light. Ground is a
  control, not a fixed choice.
- **The theme palette contains no violet.** Measured across all 21 presets.
- ⭐ **The "recolours itself from per-client theme tokens" differentiator belongs to THIS rebuild**,
  not to the shipped variants. That is what this engine is for.

---

## 7. Licence — read before choosing

- ⛔ **nimitz's Shadertoy "Auroras" is CC BY-NC-SA — NON-COMMERCIAL.** Must not be used, referenced
  or derived from. Most aurora shaders in the wild descend from it, so check any candidate's
  ancestry before recommending it.
- paper-design is Apache-2.0 but ships no aurora.
- **An aurora must be WRITTEN.**

Carried for Bean's decision (KJC-4, detail in the plan): three overstatements in the technique
spec's legal framing need correcting before anyone relies on it. The recommendation is an hour of a
UK IP solicitor's time. ⚠ Not legal advice. The money risk sits in the indemnity — the client
publishes the site, and small-agency IP indemnities are often uncapped.

---

## 8. Deploy hazards, if you deploy anything at all

You probably will not this session. If you do:

- ⛔ **Never run `composer install` without `--no-dev` on a tree you then deploy.** It rewrites the
  autoloader to require dev packages the tarball excludes, and the site 500s on every request
  through every green gate. This took the canary down on 2026-08-27. `build-deploy.py` now guards
  it (`4494e6e1d`, phar resolution `62809c801`) — the tree's correct resting state is dev-included.
- ⛔ **`git commit -- <paths>` commits the WORKING TREE state of those paths and discards a partial
  `git apply --cached` stage.** It swept another track's work today. After a partial stage, use a
  bare `git commit`.
- ⛔ **Never run `git stash`, `git clean`, `git checkout -- .` or `git restore .` in the shared
  tree.** A `git stash -u` destroyed an hour of a peer's uncommitted work today. Several sessions
  share this worktree.
- Deploy from an isolated worktree when the shared tree is dirty. Precedent: **D822**.

---

## 9. Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` | Framing the comparison, if the shape is unclear |
| `/ui-ux-pro-max` | Design intelligence and palette work |
| `/sgs-discover` | Finding further reference sites |
| `/research` | Auto-routes to the right research tier |
| `/delegate` | Pick the model for every dispatch |
| `/dispatching-parallel-agents` | If candidates are gathered in parallel |

| Tool | For |
|---|---|
| Playwright MCP | Capturing candidates and page 2740 like-for-like |
| Artifact | The comparison page itself |

**Canary credentials** are at `.claude/secrets/sandybrown.env` and are always available — do not
ask. ⚠ The values are single-quoted; strip the quotes when parsing.

⚠ Headless Chromium has no GPU unless launched with
`--use-gl=angle --use-angle=default --ignore-gpu-blocklist --enable-gpu`. Without those the
capability gate correctly declines WebGL and only the CSS fallback renders. Assert the browser IS
WebGL-capable before trusting any "no canvas" result — otherwise a vacuous pass looks like a real
one.

---

## 10. Done when

- One comparison page exists, each candidate beside the current page-2740 effect at the same size.
- Every candidate's licence ancestry is checked and stated.
- Bean has named a reference, or has said he wants different candidates.
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit.
- `LEDGER.md`'s motion section reflects the outcome — fold in, do not append.
- `python .claude/hooks/handoff-preflight.py --check` passes. The self-healing `decisions-size`
  check is the one expected failure and must not be "fixed".
