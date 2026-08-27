# Generative background engine — Phase 2: make the technique spec buildable

Invoke `/autopilot` before anything else.

**Your job:** turn an incomplete technique spec into one a session can build from without inventing
requirements. Then put it through `/adversarial-council`. Do not write engine code.

---

## 1. Read first

1. `.claude/plans/2026-08-27-generative-background-engine.md` — the whole plan.
2. `.claude/reports/2026-08-25-generative-background-engine-technique-spec.md` — the spec you are
   completing. 288 lines.
3. `.claude/decisions.md` **D794** — the NO-GO on the thin version, and the must-fix register.
4. `.claude/decisions.md` **D871** — what the shipped six-style engine settled.

---

## 2. Two gates are already closed. Do not re-open them.

⛔ **Phase 1 (pick a reference) is SATISFIED, not skipped.** Bean, 2026-08-28: *"that step existed
because we were failing to achieve it. It is now irrelevant."* He picked from a live side-by-side,
six styles shipped, he approved them. The reference is our own live output — canary pages **2740**
and **3037**. Re-running it as a look-comparison is ceremony, and ceremony is what this plan exists
to end.

⛔ **The licence question is SETTLED.** Bean, 2026-08-28: we are clear provided none of their source
files ship in the final product. Two rules follow, and they are the whole of it: **ship none of
their files** (no shader source, no palette PNG, no asset) and **keep no copies in this repo**.
Write the aurora from scratch — that was already the conclusion. The three legal overstatements
D794 flagged are a **doc-accuracy fix inside item 7 below**, not a blocker and not an escalation.

---

## 3. What this engine is actually for

The look is settled. The unbuilt thing is a **mechanism**: *the background recolours itself from
per-client theme tokens.*

The shipped engine uses curated per-style defaults with client override. This rebuild asks a
different question — how does a generative field derive its palette from a site's own tokens and
still stay legible? That is the differentiator, and it belongs to this plan, not to the shipped
variants.

⚠ One measured constraint shapes it: **the theme palette contains no violet**, across all 21
presets. A token-only aurora cannot reach its signature colour. The shipped engine solved that with
curated per-style defaults. A token-following engine has to answer it differently, and that answer
is a real design question, not a detail.

---

## 4. First action — under 5 minutes

Open the technique spec and find the "Twist" and "Displacement" rows in the animation section. They
are orphaned table rows with no surrounding mechanism. Fixing that one section tells you how the
rest of the document needs to read.

---

## 5. The work — D794's thirteen must-fix items

Absorb each into the technique spec:

1. The **animation** section — "Twist"/"Displacement" are orphaned rows.
2. **Camera, projection and coordinate space** — absent entirely.
3. The **assembly order** of the seven mechanisms.
4. **Acceptance criteria** — there are none of any kind.
5. **Which file the code lands in.**
6. The **OKLab correction** — §2 (canvas gradient) contradicts §5, because canvas 2D interpolates
   in sRGB.
7. The **corrected legal framing** (see §2 above — a wording fix, plus a binding divergence clause).
8. Promote the `perf/` tooling out of `scratch/`.
9. **Re-rank the mechanisms** — the council found §5 and §6 free and highest-yield; §1 is suspect.
10. Repair the **CSS fallback contract**, currently asserted-unchanged and comprehensively broken.
11. Re-point every **evidence pointer** — they resolve into a tree Gate E deleted.
12. Resolve **§6's ground** as a CONTROL carrying both presets, not a fixed choice.
13. Add the **configurability axes** Bean asked for: colours, shapes, sizes, positions, speed.

Items 4 and 13 are the two that decide whether Phase 3 can start. Acceptance criteria are what stop
the next session inventing requirements, and the configurability axes are what the client actually
touches.

**Known failure modes the spec must answer**, carried from the reference work: body text over the
gradient can drop below 4.5:1 as colours move; it fails behind tables, forms and long-form reading;
it needs a reduced-motion fallback. WCAG 2.1 AA is the floor.

---

## 6. The gate

⛔ **The completed spec goes through `/adversarial-council`. D794 said NO-GO on the thin version;
the rewrite must earn a GO before any build.** A council pass is the exit condition for this
session — not "the spec looks finished to me".

---

## 7. Settled — do not re-litigate

- **CSS cannot render an aurora.** Three attempts failed three different ways: bars, ovals, haze.
  Filaments need per-pixel noise and domain warping; CSS has neither. A ceiling, not tuning.
- **Bean's aesthetic target is known and measured** — mid-luminance pastel field, mean luminance
  157, hues lavender → blue-grey → mint → violet.
- **One shader can carry two looks.** Measuring the base colour and crossfading between additive and
  darkening compositing gives an aurora on dark and pigment on light. Ground is a control.
- **No new `fx_effects` rows** for variant work — a variant rides the existing effect, so no
  shared-DB write and no registry regeneration. A reseed there has broken two tracks' builds.

---

## 8. Hazards, if you deploy or commit anything

- ⛔ **Never run `composer install` without `--no-dev` on a tree you then deploy.** It rewrites the
  autoloader to require dev packages the tarball excludes; the site 500s on every request through
  every green gate. Took the canary down 2026-08-27. `build-deploy.py` guards it now (`4494e6e1d`,
  phar resolution `62809c801`); the tree's correct resting state is dev-included.
- ⛔ **`git commit -- <paths>` commits the WORKING TREE state of those paths and discards a partial
  `git apply --cached` stage.** It swept another track's work. After a partial stage, use a bare
  `git commit`.
- ⛔ **Never run `git stash`, `git clean`, `git checkout -- .` or `git restore .` in the shared
  tree.** A `git stash -u` destroyed an hour of a peer's uncommitted work. Several sessions share
  this worktree.
- Deploy from an isolated worktree when the shared tree is dirty. Precedent: **D822**.

---

## 9. Tool bindings

| Skill | When |
|---|---|
| `/adversarial-council` | The exit gate — mandatory before this session closes |
| `/brainstorming` | The token-following mechanism, if its shape is unclear |
| `/ui-ux-pro-max` | Palette and design intelligence |
| `/research` | Auto-routes to the right research tier |
| `/delegate` | Pick the model for every dispatch |
| `/qc-council` | Validating fix-shapes before dispatching them |

**Canary credentials** are at `.claude/secrets/sandybrown.env` and are always available — do not
ask. ⚠ Values are single-quoted; strip the quotes when parsing.

⚠ Headless Chromium has no GPU unless launched with
`--use-gl=angle --use-angle=default --ignore-gpu-blocklist --enable-gpu`. Assert the browser IS
WebGL-capable before trusting any "no canvas" result — otherwise a vacuous pass reads as a real one.

---

## 10. Done when

- All thirteen must-fix items are absorbed into the technique spec.
- The spec names its acceptance criteria and its configurability axes explicitly.
- `/adversarial-council` returns a GO.
- `decisions.md` carries the closing entry, D-ceiling re-derived immediately before the commit.
- `LEDGER.md`'s motion section reflects the outcome — fold in, do not append.
- `python .claude/hooks/handoff-preflight.py --check` passes. The self-healing `decisions-size`
  check is the one expected failure and must not be "fixed".
