# Timeline — close the build: Task 4 (scroll effects) + the tall-milestones design gate

**Written 2026-08-30.** Supersedes `2026-08-30-timeline-stage-c-and-open-decisions.md`, deleted in
the same commit — every task in it shipped. Invoke `/autopilot` first. Bean is QC-only: put open
questions to him in ONE opening message, then build while he considers them.

---

## READ THIS BEFORE ANYTHING ELSE

**Six tracks share `main`.** Commit with explicit paths (`git commit -F <msgfile> -- <paths>`),
never `git add -A`. Re-check the branch inside the commit command. `git commit --amend` flushes
the whole index whatever pathspec you gave it.

⛔ **Never `git stash`** — a peer's stash swept every track's uncommitted work on 2026-08-28.
⛔ **Never `git checkout -- <your own file>`** — it reverts to the last commit and takes unrelated
uncommitted fixes with it.
⛔ **`.git/index.lock` collides constantly.** Retry in a loop; never delete it.
⛔ **Long prose through a `cat <<EOF` heredoc FAILS in the Bash tool.** Write the file, then `cat`.
⛔ **`build-deploy.py` prints `ABORTED` and still exits 0.** Read the output, never the exit code.
⛔ **PowerShell mangles `.claude/secrets/*.env`** (CRLF `\r` survives `.Trim('"')`, giving a false
401). Use bash: `set -a; . .claude/secrets/sandybrown.env; set +a`.

**Deploy:** `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only
--skip-build --allow-dirty --skip-gate-full --payload plugins/sgs-blocks/src/blocks/timeline/`
(`--skip-build` only when you have just built; `--skip-gate-full` only while another track's
`01-tab-group` ratchet is red — check first, and say so rather than assuming).

---

## ⛔ THE INSTRUMENT TRAPS — read before measuring anything

**Every real defect in this build was caught by a SCREENSHOT or by Bean. Never by a gate.**
A blank carousel passed 73 gates and every numeric check — snap type, scroll width, card widths,
keyboard attributes, border colours. **A zero-opacity element measures perfectly.**

1. **Lenis animates every scroll.** `window.scrollTo` does not land immediately; a read after a
   fixed delay measures the wrong position. Wait until `scrollY` stops moving:
   ```js
   window.scrollTo( { top: y, behavior: 'instant' } );
   let last = -1, stable = 0;
   for ( let i = 0; i < 60; i++ ) {
     await wait( 50 );
     if ( window.scrollY === last ) { if ( ++stable >= 3 ) break; } else { stable = 0; last = window.scrollY; }
   }
   ```
2. **A scroll-driven custom property reads back as a STAIRCASE.** Compute progress from geometry.
3. **A losing CSS rule is indistinguishable from an absent one.** This build hit it twice in one
   session. Enumerate every rule matching the element and compare SPECIFICITY — never conclude
   "absent" from a probe that filters rule text. (A `grid-column|grid-row` filter misses
   `grid-area`, which is how the first wrong diagnosis was manufactured.)
4. **Resolve every match back to its owner.** A probe indexed into all timelines while its indices
   came from a filtered subset, and measured the wrong element.

---

## What shipped 2026-08-29/30 — all deployed and live-verified

Five pieces, in order. Detail: `reports/visual-diff/timeline-2026-08-30.md` (17 addenda) and
`.claude/memory/sdd-progress.md`.

- **Mobile collapse fixed** (`f6188b027`, `da618882c`). Media placement rules outranked the
  collapse on specificity — `--media-under`/`--media-overlay` at (0,6,0)/(0,5,0) with NO media
  query, beating the collapse at (0,5,0)/(0,4,0). Scoped both to `min-width: 768px`. Content went
  **76px and 164px → 328px** at 375px.
- **`date-over-media` REMOVED** (`6a183ce3b`) — Bean rejected it on sight. Do not reinstate it from
  the earlier addenda.
- **`mobileLayout`** (`f01b7446f`, `3a877705a`, `1a5ab3225`) — `stacked` | `carousel`. Native
  `overflow-x:auto` + `scroll-snap-type: x mandatory`, cards `min(85%, 320px)` (G225 cap + peek),
  `tabindex="0"` + `aria-label` added by `view.js` on a `matchMedia` listener. **No `role`** —
  Bean dropped it to keep the `<ol>` list semantics.
- **Attribute split** (`f8b5f6916`, + `88ec9173f` shared reseed) — `alignment` → `contentLayout`
  (`alternating`|`same-side`|`single-column`), `showDateColumn` → `datePosition`. `centre` folded
  into `single-column`. Verified by COMPILED-CSS diff: 161 lines, all class renames or deleted
  `align-centre` rules; no declaration changed.
- **`same-side`** (`10072a44b`) — Bean's originally-requested option. Proven by per-row columns:
  alternating date `[1,3,1,3]`, same-side `[1,1,1,1]`, mirrored `[3,3,3,3]`.

**Canary probe pages:** 3079 (8 timelines — blocks 5+6 are `same-side`, 7 is `carousel`) and 3072.

---

## Task 1 — `scrollEffect`: wire the GSAP presets (DESIGNED, APPROVED, NOT BUILT)

The design is signed off in `.claude/plans/2026-08-30-timeline-layered-control-model-design.md`
(qc-council reviewed, all required revisions applied). Bean approved **block-private wiring**.

| Value | Client label | Module | Tier |
|---|---|---|---|
| `basic` (default) | "Standard" | — | V |
| `pinned-journey` | "Pin and reveal" | `shared/effects/gsap/fx-pin-scrub.js` | G |
| `pinned-horizontal` | "Pin and slide sideways" | `shared/effects/gsap/fx-horizontal-panel.js` | G |

**Non-negotiable constraints, all verified at source:**

- ⛔ **Neither GSAP preset may run at ≤767px.** SC 2.5.7 exempts native `overflow` scrolling but
  NOT content that suppresses it and implements its own. Below 768px each falls back to whatever
  `mobileLayout` says. `fx-horizontal-panel.js:124` already gates on
  `gsap.matchMedia().add('(min-width: 768px)')`, and its comment at `:337` confirms it registers
  no handler below that. Neither module calls `normalizeScroll` (the thing that breaks touch).
- **Block-private via `data-sgs-fx` on the root**, NOT the generic fx panel. The consumer is real:
  `includes/class-sgs-motion-registry.php:1199` runs
  `preg_match_all('/data-sgs-fx="([a-z0-9-]+)"/i', ...)`. `fx-horizontal-panel.js:69` needs
  `data-sgs-fx-track` on the row wrapper.
- ⚠ **Do NOT repeat the retired argument that `resolveParticipants()` cannot work here.** It has a
  third tier at `fx-pin-scrub.js:243` falling back to `laidOutElements(el.children)`, which
  resolves the `<li>` entries fine. The case for block-private is CURATION, not incompatibility.
- **Suppress `revealTrigger`/`revealStagger` when `pinned-journey` is active** — the pin timeline
  owns entry opacity/transform; running both is a double-driver defect.
- **Permanent help text** when a pinned preset is selected, naming the CURRENT `mobileLayout`:
  *"On phones this always shows as [Stacked | Swipeable cards] instead — the pinning effect needs
  a full screen to work."* The canvas does not render at 375px, so this is the only channel.

⛔ **THE BUG THIS BUILD ALREADY MADE — do not repeat it.** Suppressing a driver in one mode left
its hidden state standing, and the carousel painted nothing but a scrollbar. **The `.is-js` gate
protects against a BROKEN script, not a DELIBERATELY not-run driver** — `.is-js` is still on the
root, so the hiding rule still matches. **Suppressing a driver obliges you to suppress the hidden
state it was the only thing capable of lifting.**

`contentSide` will need a DB reseed (new attr). Expect `check-element-manifest-conformance` to
fail with `orphan_unclassified=1` until `/sgs-update` runs, then
`generate-attr-role-map.py`. **Announce the reseed — it is a cross-track action that reds every
track's build mid-run.** Commit the regenerated `attr-role-map.json` SEPARATELY; it is derived
from the whole DB.

## Task 2 — DESIGN GATE: tall milestones + the progress-marker position (NO CODE)

Bean's proposal, 2026-08-30: *"our timelines should be longer, and have each section taller and
the media/image sit similar to hero split block and then as we scroll the next milestone animates
into view… if someone does need this simple setup they can choose it by changing the settings."*

This is the right direction and it **fixes a measured problem structurally.**

**The measured problem.** The progress marker sits at **87–91% of viewport height** through the
useful part of the scroll — the low-attention zone, crowding the bottom edge. And the fill runs
ahead of the reader: **73% complete while the block's top is still 245px below the top of the
screen.** Root cause: `animation-timeline: view()` with `entry`/`exit` is scoped to one element's
visibility and, per MDN, bounded by the scrollport — so for a block shorter than the viewport the
sweep finishes almost immediately.

**Research verdict (6+ tiered sources, in this session's transcript):** a persistent progress
marker belongs at **~35–40% of viewport height**, held there by `position: sticky` while the fill
grows behind it, with progress driven by a **`scroll()`** timeline over the track's own height —
not `view()` over an element's transit. NN/g eye-tracking puts sustained attention in the upper
portion. The familiar `top 80%` is a *trigger* point for reveals, not a resting position for a
marker; conflating those is what produces a bottom-parked marker.

⭐ **The elegant property:** pin the marker at a reading line and `fill = (line − blockTop) /
blockHeight` **by construction** — the marker cannot drift. Same single-source-of-truth principle
that fixed the rail bug (two halves computed separately WILL disagree).

**The caveat that tall milestones dissolve:** at 738px in a 900px viewport our timelines are
SHORTER than the screen, the one case where a pinned marker is hard to justify. Four milestones at
~80vh is ~3,200px, and the pattern becomes unambiguously correct.

**Design the gate to cover:**
1. **A new axis, NOT a `contentLayout` value.** "Tall sections with split media" is orthogonal to
   how entries line up — you could want tall+alternating or tall+same-side. Folding it into
   `contentLayout` recreates exactly the conflation this build spent a session unpicking out of
   `alignment`. Propose e.g. **Milestone size: Compact / Full-height**.
2. **Overlap with Task 1.** "Next milestone animates into view" is close to `pinned-journey`.
   Decide whether tall-milestones and pin+scrub are ONE feature or two, before building either.
3. **Mirror `sgs/hero`'s split**, don't re-derive it: `gridTemplateColumns`, `splitGap`,
   per-device `splitMediaType`, `splitImageBleed`, `mediaParallax`/`mediaKenBurns`.
4. **The marker fix falls out of this** — do not do it twice. Specify it here.
5. **Content weight:** four milestones with a real image and a paragraph each look superb; eight
   sparse ones are a long scroll through whitespace. Editor guidance, not a hard limit.

Run `/brainstorming` design mode → `/qc-council`. **Deliverable is a signed design, not code.**

## Task 3 — residuals

- **`entryGap` + heading-level surfacing** (Layer 4 of the design gate). Small.
- **The fractional-width band `767.0 < w < 768.0`** where neither breakpoint fires. Cosmetic; the
  dots were proven safe there. Fixing it properly means a file-wide `767px` → `767.98px`
  convention change — do NOT patch one rule.

---

## Standing rules

- **Deploy before you measure.** A test against undeployed code measures stale output.
- **Open a screenshot.** Numbers passed on a blank carousel.
- **Every check needs a positive control.** "Correctly 0 when suppressed" proves nothing alone —
  the per-card progress border rendered and could never fill, and only the positive control found it.
- **Stored content is a separate migration from the schema.** The oldshape gate caught a second
  page AFTER the first was migrated. Migrate TEXTUALLY (never `json.dumps` — it rewrites every
  other stored attr); assert exact occurrence counts, byte deltas, and a round-trip proving KSES
  altered nothing.
- **Visual-diff report before any commit touching a block** (STOP-67), repo-root
  `reports/visual-diff/`, `source_sha:` from `visual-report-sha.py timeline` AFTER staging. The
  gate is date-keyed on the filename.
- **R-31-13: a green measurement is not fidelity.** Bean's eye is co-authoritative — he rejected
  `date-over-media` on sight after the controller had closed it as "correct by design" on a
  mechanism proof. A mechanism proof is not an aesthetic verdict.
