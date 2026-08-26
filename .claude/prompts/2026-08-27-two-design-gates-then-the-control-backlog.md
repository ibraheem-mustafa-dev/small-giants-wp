# Next session — two design gates, then plan the rest around what they decide

Invoke `/autopilot` first.

**Run the two design gates BEFORE planning anything else.** Bean set this order deliberately: three of the five tasks change either what a client sees or what a shared gate believes, and their shape decides how the rest of the session is orchestrated. Plan the implementation after the gates, not before.

---

## 1. Read first

1. `.claude/LEDGER.md` — establish which track you are. **Five tracks share `main`.**
2. `.claude/decisions.md` — **D805, D806, D808, D810, D811, D812**. Every task below depends on one of them.
3. `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` §3 (ENUM / MODE) — before Task 5.

Verify in the same command as any commit:

```bash
git branch --show-current                                    # expect main
grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1
```

⚠ **Check the D-ceiling AFTER you write your entry, not before.** Writing first and checking second catches a collision; checking first does not.

⛔ **Commit by exact path. Never `git add -A`, never a bare `git commit`.** The shared index routinely holds another track's staged files. A red gate is not necessarily yours.

⛔ **A destructive command never shares an invocation with an unverified edit.** Last session a patch script failed its assertion, the next line ran anyway, and `--apply` wrote to `sgs/quote`. Caught and reverted, but verify the edit landed as its own step.

⛔ **Heredocs in this environment eat backslashes.** Three patch attempts failed on `\s` and `\t`. Patch by line number, or write the snippet with the Write tool.

**Canary fixtures — never delete:** 2103 · 2109 · 2113 · 2603 · 2721 · 2736 · 2737 · 2740 · 2741 · 2742 · 2744.

---

## 2. DESIGN GATE A — what should the hover panel's zoom and grayscale toggles reach?

**Bean has ruled on the mechanism but not the shape. Get the shape before building.**

The panel's **image-zoom and grayscale toggles are inert on most blocks.** The PHP emits `sgs-has-img-zoom` and `sgs-has-grayscale`; only **card-grid and team-member** style the first, and only those two plus **gallery and info-box** style the second. Everywhere else a client flips a switch and nothing happens.

⛔ **A root-level rule is REFUSED, and D796 records why.** A root rule cascades to every descendant image and manufactures a second copy of the double-fire that decision fixed. Universal reach needs per-block scoping.

**Bring Bean a menu.** Candidate shapes, each costed:

- **Per-block scoped rules** — every block that opts in styles the gate class against its own item selector. Reaches the item correctly; costs one rule per block.
- **A declared target selector** — the block names its hover target, and the shared CSS scopes to it. This is the parked `selectors.sgs.hoverTarget` registry (D796 verified the mechanism is legal: `wp_get_block_css_selector()` is public API, custom keys survive registration). It was refused **on necessity, not legality** — revisit only if this gate makes a third block need it.
- **Withdraw the two toggles** from blocks that cannot style them, so the panel stops offering controls that do nothing.

**Done when:** Bean has picked a shape and `decisions.md` records it. Build nothing before that.

---

## 3. DESIGN GATE B — adopt `SgsLengthControl` across 62 mounts?

`SgsLengthControl` wraps a length-and-unit input — padding, margin, font size, width, gap — and adds an opt-in dropdown of the theme's spacing scale. It was built on 2026-08-19 and **nothing has adopted it.**

Re-measured 2026-08-26:

| | count |
|---|---|
| raw `<UnitControl>` mounts in block `edit.js` | **62** |
| blocks carrying them | **24** |
| blocks using `SgsLengthControl` | **0** |

This is Bean's own stated direction — native controls behind thin SGS wrappers — already half-built.

⚠ **It changes what clients see in 24 blocks' inspectors, so it owes a canary pass.**

⚠ **Check each attribute's typing first.** The preset dropdown stores a **slug**, not a length. An attribute typed for a length only will silently discard a slug (D338), producing a control that moves and does nothing. `SgsLengthControl` already carries a `presets` flag defaulting to off for this reason.

**Done when:** Bean has approved or deferred, with the answer in `decisions.md`.

---

## 4. Plan the session AFTER the two gates

Once both gates return, plan orchestration across everything still open. Use `/delegate` per branch and `/dispatching-parallel-agents` before any parallel dispatch.

⚠ **`/delegate` routed four of five branches to *inline* last session** on a blanket `--high-complexity` flag that was the caller's own input, not a judgement. Route each branch on its honest complexity.

⛔ **One directory each.** Agents return patches; integrate serially. Three agents were lost mid-flight last session; two left usable work that had to be verified before it could be trusted, and one left nothing.

---

## 5. TASK — teach `inspector-scan` rule 21 to expand `*AttrKeys()` calls ✅ BEAN APPROVED

**This is approved work. It gates everything else in the control programme.**

Adopting a name helper **blinds rule 21**. Measured by finding key, not inferred: adopting `gradientOverlayAttrKeys()` in `sgs/hero` took rule 21 from **82 → 84**, the two new findings being `mediaOverlayGradient` and `mediaBackgroundGradient` — exactly the **derived** keys. The rule reads `edit.js` statically, so a name the helper computes is not there to read.

**The blindness is narrow, and the boundary matters.** `shadowAttrKeys( 'shadowHover' )` adds **zero** findings, because its base is a literal argument and its derived `shadowHoverColour` appears in the block's colour panel anyway. It bites only where a derived name appears nowhere else.

Three helpers exist to teach, and their rules are enumerated, not guessed:

| helper | rule | holds |
|---|---|---|
| `shadowAttrKeys` | `colour` = `<base>Colour` | 22/22 |
| `shadowAttrKeys` | `hoverColour` = `<base>ColourHover` | 10/10 |
| `gradientOverlayAttrKeys` | `gradient` = `<base>Gradient` | 3/3 |
| `typographyAttrKeys` | `prefix` + PascalCase base | see the component |

⚠ `gradientOverlayAttrKeys`'s `solid` is **not derivable** — `<base>` twice, `<base>Colour` once. It is defaulted and overridable. Do not encode a rule for it.

**Follow rule 21's own precedent.** Its `advisoryReason` records two prior definitional changes, both structured the same way: a fixture PAIR — one `mustNotFlag` proving the new exemption works, one `mustFlag` proving it does not overmatch — with the negative control watched failing first. `coreSupportedAttrs` is the worked example.

⛔ **Do not raise `openBacklog` instead.** That rule states its own doctrine repeatedly: *a false positive is a detector bug, never baseline fodder.*

**Done when:** hero's three mounts are re-adopted, rule 21 reports **82**, and the fixture pair proves the exemption can fail.

---

## 6. TASK — the gallery carousel drag-scroll registers and does nothing

**A live defect. No approval needed.**

Loading `/tier-fixture-maxwidth/` logs:

```
Failed to resolve module specifier "@sgs/gsap-draggable"
```

`gallery/render.php` emits `data-sgs-fx="draggable"` for carousel layouts, so the effect registers, the client can configure it, and nothing happens — the shape D452 describes.

**A lead, not a cause.** The specifier **is** registered (`class-sgs-motion-registry.php:80`) and the module file **does** exist (`build/vendor-modules/gsap-draggable.js`, 34 KB). So the failure is probably conditional registration. ⛔ Prove it before fixing.

**Answer this explicitly:** `check-fx-registration.py` was built (D789) to catch exactly this, and it passes. Either the defect sits outside its ten registration points, or the gate is blind. D789 warns that `draggable` is one of four effects deliberately absent from `SHIPPED_EFFECTS`, which is why that roster is the wrong driver.

**Done when:** the cause is proven, the fix is live-verified on the canary, and the gate's miss is explained.

---

## 7. TASK — build the enum-shape gate on rendered labels

Spec 35 §3 now carries the threshold (D812). The **gate** is deliberately unbuilt.

| options | longest label | shape |
|---|---|---|
| 2–5 | ≤ 12 chars | `ToggleGroupControl` |
| 2–5 | > 12 chars | `SelectControl` |
| 6–10 | any | `SelectControl` |
| > 10 | any | `ComboboxControl` |

⛔ **The gate MUST measure the rendered label, not the enum slug.** `scripts/surveys/survey-enum-control-shape.py` measures slugs, which is why it is a census and ships no `--check`. The proxy was validated on one case only — `burger-morph` renders as "Morphed icon", both 12 characters — and n=1 is not a licence to enforce.

⚠ **The census resolves 129 of 282 (45%).** The rest are dynamically keyed, mounted through a shared component, or ambiguous. Those are the instrument's blind spot. **Never count them as compliant.**

The prize is real: **85 confirmed enums carry 2–5 short options and render as a dropdown**, which makes Spec 35's "giant Select" anti-pattern the norm rather than the exception.

**Done when:** the gate reads rendered labels, ratchets against a seeded baseline, and its self-test carries a watched-failing negative control.

---

## 8. Method — earned on 2026-08-26, not theory

- **A self-test that has never been watched failing is not evidence.** Case [11] in `add-control.js` passed green **twice** while the bug it targets was present: first it sat outside `selfTest()` entirely, then it sat *after* the loop that reads `failures`. Only the third placement went red. Check placement, then break the code and watch it.
- **Fixing the known defects does not mean the output is correct.** Two `--apply` defects were fixed and declared done; the third was a **PHP fatal** that no self-test, no JS parse and no dry-run diff could see, because a missing `$` reads as ordinary code until something parses it. Feed generated code to a parser.
- **Prose is not code.** A census read `setAttributes` and `prefix` out of a **docblock** and put a value-based control on the backlog for weeks. Strip comments before classifying — `surveys/survey-control-mounts.py` had solved this already.
- **Enumerate; do not generalise.** A hover-colour rule generalised from one block scored **0/10** against the corpus. Listing every mount cost one command.
- **State the corpus of an absence claim.** "Not in `plugins/sgs-blocks/`" is a finding; "not in the repo" is a much stronger one. `scripts/` is ambiguous here — repo-root **and** `plugins/sgs-blocks/` — and tool output paths are relative to the repo root.
- **Check `$?` on the command you meant.** `... | tail` reports `tail`'s exit code, not the program's.
- **Wait a stale `index.lock` out.** One cleared itself while another track finished. Deleting it risks corrupting their write.

---

## 9. Tooling

| Use | For |
|---|---|
| `/delegate` | Every dispatch — route on honest complexity, per branch |
| `/dispatching-parallel-agents` | Before any parallel dispatch. One directory each |
| `/adversarial-council` | Stress-testing gate A's and gate B's shapes |
| `/playwright` | All live verification, frontend **and** editor |
| `build-deploy.py --target sandybrown --blocks-only` | Every deploy. Never `--allow-dirty` |
| `/sgs-db`, `/wp-blocks` | Ground truth — never hardcode a count |

**Gates that will surprise you.** The visual-diff gate wants `reports/visual-diff/<block>-<today>.md` with `verdict: PASS`, a `*_capture_passed` flag, and a `source_sha` computed from **staged** bytes. One report per block per day — a block touched twice needs one file carrying both. `--payload` breaks the deploy-then-commit deadlock.

**Gates shipped last session, all green:** `check-control-helper-parity` (empty baseline, no accepted debt) and `check-css-layer-orphans` (GRID_AREA baselined as a known orphan, nothing deleted).
