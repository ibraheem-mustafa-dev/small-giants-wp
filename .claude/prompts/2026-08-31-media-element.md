# Media element — Waves 3-7

Invoke `/autopilot` first.

**Your plan is `~/.claude/plans/media-element-misty-squid.md`. Read it in full before anything
else.** Your architecture is `.claude/plans/2026-08-30-media-element-architecture-v2.md` — read it
too, but **four of its claims are false and are corrected below.** The plan supersedes it on those.

---

## What actually happened (2026-08-30) — 12 commits, `9b67c3885`..`e912a1f96`, all pushed

**Waves 1 and 2 are DONE. Both security items are DONE and LIVE-VERIFIED on the canary.**

| | Commit(s) |
|---|---|
| Wave 1 census — 128 media attrs, 6 surfaces, 3 excluded | `9b67c3885` |
| SVG allowlists **6 → 1 unified** (+2 in `button`, untouched) | `ad414bfee`, `89f1aefdf` |
| Editor SVG sanitiser, generated from PHP, 6 mounts | `52e232692`, `51591f936` |
| Misleading help text corrected | `c86938f2a` |
| `<track>` captions on `sgs/media` (WCAG 1.2.2 Level A) | `3b17d96a5` |
| **Wave 2** — L1 naming pair + declarative injection, both sides | `cce7427bd`, `ea5f7ed09` |
| Live verification record | `e912a1f96` |

Deployed via `build-deploy.py --target sandybrown --blocks-only`: 212s, 83/83 block.json checksums
matched, both cache layers purged, motion QA 3/3.

**Live evidence — read it before assuming anything is unverified:**
`reports/visual-diff/svg-sanitiser-captions-2026-08-30.md`. Probe page **3143**
`[GATE — DO NOT DELETE] SVG sanitiser + captions probe`. Front end 11/11, editor canvas 10/10
(`window.SGS_PWNED` undefined in BOTH realms), captions 6/6 with a negative control.

**Seven new gates — 5 CHECKS (each negative-controlled: planted a realistic drift, confirmed red,
restored byte-identically) + 2 generators:** `check-svg-allowlist-parity`, `test-sanitise-svg` (24 assertions),
`test-media-attr-parity`, `test-media-injection-parity`, `check-media-attributes-parity`, plus two
generators. All in `scripts/gates.json`. The two generators run from BOTH `prebuild` and `prestart`; the five
checks reach only `prebuild` (via `run-gates.py --tier fast`) — `prestart` does not invoke
`run-gates.py`.

---

## ⛔ Four architecture claims that are FALSE. Do not re-inherit them.

1. **"`KIND_PANELS` — 30 adopters, the framework's most-adopted shared component."** The 23/30 is
   `ContainerWrapperControls` (which OWNS `KIND_PANELS`): **23** JSX mounts, 30 by plain grep.
   `KIND_PANELS` itself appears in ONE file. Either way it is NOT the most adopted — `SgsColourPanel` reaches **65**, `ResponsiveBoxControl` 51,
   `SgsBorderControl` 45. **The L2 exemplar therefore changed to `SgsColourPanel`** (caller-composed
   `rows` array, falsy entries dropped). Inherit its shape, NOT its two flaws: it hardcodes
   `group="styles"` (the C14 tab-split across all 65 adopters) and its disclosure rule is the
   OPPOSITE of ours (it omits; we need disable-with-`hiddenReason`). See the plan's "L2 exemplar".
2. **"The one generator already exists and is already gated."** It exists. It is **not** gated.
3. **"`prefers-reduced-motion` … absent in v1."** It is PRESENT and thorough (hero guarded twice,
   container ×2, JS parallax bails on `matchMedia`). **STRUCK, not built** — re-adding produces a
   duplicate. Recorded in the plan's "Struck criteria".
4. **"Two server SVG allowlists."** There were **six**. Two identical copies (collapsed), two real
   diverging ones (unified), and `button/render.php` carries **two more** — narrower still, left
   alone deliberately, still open.

Also corrected: the mount count was **6**, not 7. The survey said seven and named six.

---

## The two findings that shape Waves 3-7

**1. The naming risk was small; the SHAPE risk was large.** Derived from the census, `prefix + Base`
reproduces every real stored attribute name except **four**, across two blocks: `sgs/before-after`'s
`videoAutoplay`/`Tablet`/`Mobile` (block-level — one toggle governs both slots per its sync
contract) and `sgs/decorative-image`'s `decorMedia` (a legacy composite with no prefix/base
decomposition at all). So `STORED_AS` is **four** entries. But there are **ten storage shapes** for one concept, so
`sgs_media_element_value()` reads across all of them. A name-only `storedAs` map — what the
architecture specified — could only have read one.

**2. Grepping a block's own file and concluding is this track's recurring failure.** It bit twice in
one session: `bgSvg*` controls read as absent (they live in the shared `BackgroundPanel`), and
`card-grid`/`gallery` read as unmuted (the muting is in `sgs_render_media()`). Follow the import and
call graph; do not widen the regex.

---

## Do these in order

### Task 1 — Wave 3: the six v1 atoms
**What:** `source` · `media-type` · `object-fit` · `focal-point` · `box-shape` · `overlay`.
**Why:** these six cover every disagreement measured across the surveyed surfaces. The other 24 are v2.
**Time:** ~6h.

**Orchestration:** delegated, **4 parallel branches**, Sonnet via `/delegate`, dispatched through
`/dispatching-parallel-agents`. Disjoint files; the contract is already fixed by Wave 2.
- **Brief:** each atom declares a `requires` field enforced in BOTH the control UI and the renderer
  (`autoplay` without `muted` + `playsinline` is silently blocked on every mobile browser), and a
  `css()` validator that rejects to default.
- **Context they will not have:** the L1 contract is `src/components/MediaElementControls.js`
  (`mediaAttrName`/`mediaAttrKeys`/`mediaStoredAttrName`/`mediaAttrType`) and
  `includes/helpers-media-element.php`. Read the census at
  `reports/migrations/media-element-census.json` for real per-surface shapes.
- ⛔ **One scratch directory each.** Parallel dispatch into one directory clobbers. On return run
  `git diff --stat` yourself — an agent's brief does not constrain its tool access.
- ⛔ **No agent touches the shared layer.** If one needs to, that is a contract bug: stop, fix it in
  the main thread, re-dispatch.
- **/qc gate after:** yes, `/qc-inline` per atom.
- **Acceptance:** each atom has a control, a renderer, a `requires` enforced on both sides, and a
  validator. Not "the file exists".

### Task 2 — Wave 4: panel registry + dispatch
**What:** `MEDIA_PANELS` keyed `root`/`element`/`backdrop`; `MediaElementControls` dispatch.
**Time:** ~3h. **Depends on:** Task 1. **Execution:** inline.

Mirror **`SgsColourPanel`'s caller-composed `rows`**, not `KIND_PANELS`. Take the InspectorControls
`group` from `insertion` — **never hardcode it**; hardcoding is what put `SgsColourPanel` in breach
of C14 across 65 blocks. `insertion: 'root'` opens its own `<InspectorControls>`;
`insertion: 'element'` returns bare rows for a parent panel to absorb.

**Two disclosure states, deliberately:** OMIT when a control structurally cannot apply;
**disable-with-`hiddenReason`** when it merely does not apply YET. Hero's live bug is the second case
handled as the first — its media-type enum is gated on `splitImage?.url`, so video is unreachable
without first uploading an unwanted image.

### Task 3 — Wave 5: wire two surfaces, SERIAL
**Time:** ~4h. **Depends on:** Task 2. **Execution:** inline, sequential.

⛔ **`sgs/media` FIRST, then `before-after`. NEVER in parallel.** Built concurrently, both agents can
quietly patch the shared layer to suit themselves and the only evidence the abstraction generalises
is gone.

**Falsification test, objective:** `git diff --stat` after wiring `before-after` must show **no file
outside** `src/components/Media*` and `includes/helpers-media-element.php`.

⚠ `before-after` is currently BEST-IN-CLASS on two axes (one parameterised picker driving both slots
with zero drift; the narrowest per-type gating of any surface). A unification that downgrades it has
failed. Absorb those patterns; do not flatten them.

**Acceptance:** the falsification test passes AND a client can set a different mobile image in under
30 seconds on both surfaces, live.

### Task 4 — Wave 6: six gates as inspector-scan rules
**Time:** ~4h. **Depends on:** Task 3. **Orchestration:** 4 parallel Sonnet branches.

Bean's ruling: **inspector-scan rule modules, not standalone scripts** — and audit the three existing
media-adjacent rules (`14-media-upload-check`, `18-decorative-image-aria`, `08-raw-url-link`) against
the new contract, repurposing or replacing any that conflict.

`rules.json`'s `_meta` is Bean-locked: **every new rule starts `mode: "advisory"`** with a measured
`openBacklog`. It also carries `zeroIsAClaim` — a rule returning 0 findings must be cross-checked
against an independently derived population.

### Task 5 — Wave 7: remaining surfaces
⛔ **Per surface, ONE commit: INSERT → VERIFY → GUT. Never gut first.** A surface always has either
the old code or the new code, never neither. `product-card`'s content migration ships separately.

---

## Owed from this session — clear these when convenient, they are not blockers

1. ~~`sgs-framework.db` reseed~~ — **DONE.** `sgs-update-v2.py --stage 1`: 11 new attr rows, the 4
   `videoCaptions*` present, DB 77 = block.json 77 for `sgs/media`. Build re-run green afterwards.
   ⚠ The earlier "cross-track, do not run unilaterally" caution was WRONG — Bean confirmed only ONE
   track/session is active on this work, so deploys and `/sgs-update` carry no co-active risk.
2. **The SMIL claim is REASONED, NOT EXECUTED** (Bean: ship on the reasoning, test later). Owed: a
   canary probe firing `<a><animate attributeName="href" to="javascript:…">`, **paired with a
   positive control** proving the harness can observe a real execution — otherwise "nothing fired"
   is indistinguishable from a broken probe.
3. **`button/render.php`'s two allowlists** remain unmerged and out of scope.
4. `scripts/tests/test-media-render.php` is **stale** — fatals at `render.php:344` on an unstubbed
   `wp_style_engine_get_styles()`. Pre-existing (harness last touched 2026-07-06), not a regression.

---

## Skills to Invoke

| Skill | When |
|---|---|
| `/brainstorming` | any architectural or design decision |
| `/gap-analysis` | grade outputs before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes to the right tier |
| `/strategic-plan` | plan implementation order before code |
| `/dispatching-parallel-agents` | Tasks 1 and 4 (fan-out) |
| `/delegate` | pick the model per branch — never hardcode |
| `/qc-inline` | per-atom gate in Task 1 |
| `/qc-council` | before any commit touching the shared media layer |
| `/sgs-wp-engine` | SGS block/theme work |
| `/wp-sgs-deploy` | deploy ceremony |

## MCP Servers & Tools

| Tool | For |
|---|---|
| Playwright MCP | live editor + front-end verification (R-31-11); probe page 3143 |
| `sgs-db.py` | `block_attributes` roles/shapes — query, never guess |
| `wp-blocks.py dump` | schema check BEFORE any "missing X" claim |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Tasks 1 and 4 branch work |
| `Explore` | locating shared readers before concluding an attr is dead |
| `design-reviewer` | Task 3 — Bean's eye is co-authoritative (R-31-13) |

---

## Guardrails

- **Read `.claude/STOP-CATALOGUE.md`.** It is the uncapped defence record; the LEDGER points at it.
- **A grep returning 0 is a HYPOTHESIS.** Pair every zero with a positive control. This track's
  recurring failure is grepping a block's own file when a SHARED helper is the reader.
- **Verify on the real page (R-31-11), not the emit.** Gates are build-time and prove nothing paints.
- **`git add -A` is banned** — a PreToolUse hook rejects a commit with no pathspec, so commit by
  exact path regardless. (The *rationale* has changed: only ONE track is active, so this is hook
  compliance and hygiene, not protection from a co-active session.)
- **Never `git checkout --` a file to undo an edit** — it reverts to the last commit and silently
  takes unrelated uncommitted work with it. Save bytes, patch, restore, verify md5.
- **Deploy is `build-deploy.py --target sandybrown` only.** Never hand-roll tar/scp (D336: two client
  sites down ~2.5h). Do not reach for `--allow-dirty` or `--skip-verify`.
- **The visual gate has a SCOPED bypass**, not `--no-verify`:
  `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="…"`. Run the gate's own checker first
  (`check-markup-neutral.py <block>` etc.) to learn WHY it fired.
- **Every new gate ships a negative control.** A gate that has never been shown to go red is a
  decoration.
- **No block deprecations, no version bumps** — pre-production (D270/D293).
