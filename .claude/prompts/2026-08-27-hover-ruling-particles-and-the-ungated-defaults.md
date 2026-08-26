# Next session — the hover ruling, the particle measurements, and three live defects

Invoke `/autopilot` first.

Five tasks. Each names its file, its done-when, and its hazard.

---

## 1. Read first

1. `.claude/LEDGER.md` — establish which track you are. **Five tracks share `main`.**
2. `.claude/decisions.md` — **D789, D793, D795, D796**. They are last session's work and every task below depends on one of them.
3. `.claude/specs/38-SGS-MOTION-SYSTEM.md` §3.3 (FR-38-32) — **in full**, before Task 2.

Verify in the same command as any commit:

```bash
git branch --show-current                                    # expect main
grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
```

⚠ **Check the D-ceiling AFTER you write your entry, not before.** It moved four times on 2026-08-26 and produced a duplicate D794. Writing first and checking second catches the collision; checking first does not.

⛔ **Commit by exact path. Never `git add -A`.** The shared index routinely holds another track's staged files — one commit attempt last session found 47 of them. A red gate is not necessarily yours.

**Canary fixtures — never delete:** 2103 · 2109 · 2113 · 2603 · 2721 · 2736 · 2737 · 2740 · 2741 · 2742 · 2744.

---

## 2. BLOCKER — clear this first or Task 3 cannot ship

`build-deploy.py` aborts at `step_oldshape_audit()` on three HIGH findings on **page 2742**:
`imageBorderWidth`, `imageObjectPosition`, `splitImageMobileObjectPosition` on `sgs/hero`.

They are residue of the hero `image*` → `splitMedia*` rename (`40ba47640`). The attributes no longer exist in `block.json`, so WordPress strands the stored values and the next editor save deletes them.

**Every blocks deploy is blocked until this clears.** Last session declined it: page 2742 belongs to another track, and the LEDGER flags it editor-hazardous.

**Done when:** `scripts/wp-migrate-oldshape-blocks.js` (dry-run by default) has migrated the stored content, or a register reference baselines the three findings.

⛔ **Never write `post_content` to a page the operator has open in the editor.** An editor save writes its stale in-memory state over everything. That cost a full session of content fixes on 2026-08-25.

⛔ `--allow-dirty` and `--skip-verify` remain banned. The gate is protecting real stored content.

---

## 3. TASK 1 — Bean rules on the hover opt-in (needs Bean)

Last session measured all eight blocks on a repaired gate and refuted the plan to delete duplicates. **Bean has the numbers and has not ruled.**

**The ruling is one question: which blocks get `"hover"` added to `supports.sgs.enabledExtensions`?**

| Block | Duplicates | Dead | Audit verdict |
|---|---|---|---|
| cta-section | 0 | 0 | Nothing collides — the panel exposes no colour controls |
| process-steps | 1 | 0 | `effectHover` is a per-**step** preset |
| icon | 1 | 0 | Targets `.sgs-icon__link`, which exists only when linked |
| card-grid | 2 | 3 | Both target the **item** |
| team-member | 1 | 3 | Single card — root-hover fits |
| info-box | 2 | 2 | Single element — root-hover fits |
| post-grid | 3 | 0 | All target the **card** |
| gallery | 3 | 2 | All target the **tile** |

**Delete nothing.** D796 settles it. The shared injector reaches only the block's outer wrapper; the panel's entire shadow vocabulary is four slugs with no colour input, while every block-owned `shadowHover` ships a `shadowHoverColour` beside it.

**Done when:** Bean has ruled per block, and `decisions.md` records the ruling.

---

## 4. TASK 2 — measure the particle cap and the loop-stop

FR-38-32 ships and works on both surfaces. Two claims stay unmeasured, and the first probe to try them proved unreliable.

**Bean approved a permanent read-only debug export.** Add to `createParticles()`'s returned object (`grep -n 'push: (' src/shared/effects/particles.js`, around 481-506):

```js
stats: () => ({ live: liveCount, ticks: tickCount }),
```

with `tickCount++` in `tick()` (`grep -n 'function tick('`). Expose the instances map from `fx-particles.js` (`grep -n 'let instances'`, line 55) so a probe reaches per-emitter stats. Document it as a probe API in the docblock.

Then build, deploy, and measure live on canary **2744**:

- **The cap binds** — sweep the pointer fast, sample `stats().live` **during** the sweep, assert it never exceeds 150.
- **The loop stops** — after the pointer rests, assert `stats().ticks` stops rising.
- **Negative control** — the adjacent container on 2744 carrying no effect reports no instance at all.

⚠ **Sample during the sweep, not after.** Sampling once afterwards read 0 lit pixels and nearly filed working code as dead; sampling during read 2,417.

**Also correct the spec.** §3.3 describes the loop guard as `(pool.live > 0 || movedThisFrame)`. No `movedThisFrame` exists in `particles.js`; the real condition is `return liveCount > 0;` (`grep -n 'return liveCount'`). Behaviourally the same, but the prose names a guard that was never written.

**Done when:** both numbers are measured live with a negative control, and Spec 38 records them in two places — the `⚠ STILL UNMEASURED` bullet (`grep -n 'STILL UNMEASURED'`, line 1201 on 2026-08-26) and the §3 roster row (`grep -n 'Particle trail (FR-38-32)'`, line 206), which repeats the same unverified claim.

⚠ **Grep for these; do not trust the line numbers.** Both drifted the day this prompt was written, because other tracks edit Spec 38 constantly. Every line number below carries a grep anchor for the same reason.

---

## 5. TASK 3 — two live defects Bean already approved

**(a) The gallery lightbox paints behind the site header.** `.sgs-gallery__lightbox` sets `z-index: 100000` (`grep -n 'sgs-gallery__lightbox' gallery/style.css`, line 382), but it sits inside a container child at `z-index: 1`, which seals it into that stacking context. `site-header`'s `100` (`grep -n 'z-index: 100' site-header/style.css`, line 29) therefore wins. **Verify live before touching anything** — the numbers are confirmed, the symptom is not. Fix it with the top layer (`<dialog>` / `popover`), never a larger number.

**(b) `--sgs-modal-z-index: 99999` is dead.** `grep -rn 'sgs-modal-z-index' plugins/` finds it once — `modal/style.css:9`, the definition itself. The modal calls `showModal()`, so it renders in the top layer, where `z-index` never applies. Delete the line.

**Done when:** (a) is fixed and live-verified, (b) is deleted, and `decisions.md` records both.

---

## 6. TASK 4 — the ungated hover defaults

`resolve_hover_defaults()` (`grep -n 'function resolve_hover_defaults' includes/hover-effects.php`, line 47) hardcodes **three parallel block-name arrays** and no opt-in gates it. Eleven blocks therefore receive injected hover motion with the panel switched off and no editor control at all.

Two consequences a client can see today:

- **`sgs/cta-section`** — a full-bleed banner scales 1.02 whenever the cursor crosses it, and nothing switches it off.
- **`sgs/icon`** — the injected 1.02 compounds with the block's own 1.1 into a wobble on linked icons, and a pointless one on unlinked.

The council's reading: this is the same shape as the 47-name `:not()` list D784/D793 deleted — named exceptions standing in for a real classification. Block twelve gets nothing until somebody hand-edits three PHP arrays.

⛔ **Design-gate this before building.** It changes the resting appearance of nine blocks, so Rule 7 applies and it needs its own canary pass.

**Done when:** Bean has approved a shape, and the arrays either read from the DB or disappear.

---

## 7. TASK 5 — decide what the hover panel is for

The panel is opt-in, reaches only block roots, and most candidate blocks hover children. Nobody has written down which blocks it suits. **That one paragraph would have prevented last session's false premise.**

Two facts to write into it:

- Its **zoom and grayscale toggles are inert** outside four blocks. The PHP emits `sgs-has-img-zoom` / `sgs-has-grayscale`; only card-grid and team-member style the first, only those two plus gallery and info-box style the second. Elsewhere the client flips a switch and nothing happens.
- ⛔ **Reviving them with a root rule is refused, and D796 records why.** A root rule cascades to every descendant image and manufactures a second copy of the double-fire that same decision just fixed. Universal reach needs per-block scoping.

**Done when:** `Spec 32` or the plugin CLAUDE.md states which blocks the panel governs and which effects it owns.

---

## 8. Parked, with triggers

- **The `selectors.sgs.hoverTarget` registry.** Legal and verified: `wp_get_block_css_selector()` is public API, custom keys survive registration, and multi-node selectors already round-trip here. Refused on necessity — it buys zero reach over the gate-class-plus-inherited-custom-property pattern, which `--sgs-stagger` already proves in-tree. **Revisit when a third block needs per-item hover.**
- **Native controls → thin SGS wrappers.** Bean's stated direction: fork the source from git and wrap it. Unscheduled.
- **GRID_AREA.** Eight declarations across four blocks, feeding 53 `css_layer` rows. D642 deleted a *different* mechanism that shares the word "layer". The recommendation is to change nothing and add an orphan gate instead, so a value with no reader stays visible. **Bean has not ruled.**

---

## 9. Method — earned on 2026-08-26, not theory

- **A test can assert the bug.** One self-test case, named *"no computed-key setAttributes in the file at all → returns nothing even with an attrNames map"*, encoded the defect as its contract — so any correct fix failed it. Such a test looks exactly like a passing one until something independent contradicts it.
- **Green for the wrong reason happened three times in one day** — that test, a gate whose fix worked only when a block held an unrelated computed write, and a browser harness with its rules in an order where the bug could not occur. Build the case that must fail, first.
- **Resolve every match back to its owner.** A raw `grep -c` counted CSS selectors and reported them as rules; another counted a vendor type stub as a call site; a third matched `supports.filter.duotone` while looking for `selectors.filter.duotone`.
- **`|| echo 0` after `grep -c` doubles the count.** Grep prints `0`, exits 1, and the fallback prints `0` again. It corrupted two counts before it was caught.
- **`visual-report-sha.py` hashes the default index; a path-scoped commit builds its own.** On a shared worktree the two disagree and the gate is right. Compute it as the commit sees it:
  ```bash
  GIT_INDEX_FILE=/tmp/probe.idx git read-tree HEAD
  GIT_INDEX_FILE=/tmp/probe.idx git add <only your paths>
  GIT_INDEX_FILE=/tmp/probe.idx python scripts/visual-report-sha.py <block>
  ```
- **Wait a stale `index.lock` out.** One cleared itself after 61 seconds while another track finished. Deleting it risks corrupting their write.

---

## 10. Tooling

| Use | For |
|---|---|
| `/delegate` | Every dispatch — route before spawning |
| `/dispatching-parallel-agents` | ⚠ One directory each. Agents return patches; integrate serially |
| `/adversarial-council` | Stress-testing a design before building it |
| `/playwright` | All live verification, frontend **and** editor |
| `build-deploy.py --target sandybrown --blocks-only` | Every deploy. Never `--allow-dirty` |
| `/sgs-db`, `/wp-blocks` | Ground truth — never hardcode a count |

**Gates that will surprise you.** The visual-diff gate wants `reports/visual-diff/<block>-<today>.md` carrying `verdict: PASS`, one of the three `*_capture_passed` flags, and a `source_sha` — see §9 for how to compute it. The oldshape audit blocks any deploy whose schema change strands stored content; migrate or revert, never force. `--payload` breaks the deploy-then-commit deadlock.

**Three gates shipped last session and all three run green:** `check-fx-registration` (D789), `check-child-lift` (D793, superseding `check-container-child-lift`), and the repaired `check-duplicate-controls` (D795, 48 self-test cases).
