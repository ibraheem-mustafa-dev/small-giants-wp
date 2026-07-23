---
doc_type: plan
project: small-giants-wp
title: Spec 36 + 37 remaining work — parallel execution plan
date: 2026-07-22
status: active
governing_specs:
  - .claude/specs/36-SGS-NAVIGATION-SYSTEM.md
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md
inputs:
  - .claude/reports/2026-07-22-spec36-completion-audit.md
  - .claude/reports/2026-07-22-spec37-completion-audit.md   # QC-gated: 4 verdicts independently re-verified
---

# Spec 36 + 37 — parallel execution plan

## 0. Plain English (read this first)

**Where we are.** The header/footer/nav mechanism WORKS end-to-end. A client can write a header
in an admin screen, press "Set as active", and it appears on their site — proven live on both
sites. What is left is **breadth, not risk**: turning one proven mechanism into a complete
feature set.

**What this plan is.** Every remaining requirement across both specs, sorted into: what a cheap
agent can do on its own right now (run them all at once), what has to happen in order, and what
only Bean can decide or sign off.

**The headline number.** 41 remaining units of work. **23 of them are independent** and can run
concurrently. Only 11 form genuine sequential chains. 7 are gates or decisions.

---

## 1. Three findings that change the shape of the work

These came out of reconciling the two audits against each other. Neither audit could see them
alone, because each looked at one spec.

### 1.1 FR-36-3 and FR-37-7 are THE SAME BUILD — do not schedule them separately

Spec 37 FR-37-7: *"A single picker component serves `sgs_header`, `sgs_footer` **and**
`sgs_mega_menu`… One implementation, three consumers."*
Spec 36 FR-36-3: *"Reuses… the **starter-template picker** (P2 §2.5)"* — and flags it as a first
application, 0 hits in `src/`.

Both specs are describing one unbuilt component. The Spec 36 map put it at the head of its mega
chain; the Spec 37 map put it in the middle of its starter chain. **Building to either map alone
ships it twice.** It is scheduled ONCE here, as `UNIT-PICKER`, and both chains depend on it.

### 1.2 `labelCollapse` — the two governing specs give opposite instructions ⚠ DECISION OWED

| Spec | Instruction |
|---|---|
| **36** FR-36-8, FR-36-23 | *"reuse the **BUILT** `labelCollapse`"* — treated as settled infrastructure |
| **37** §3.8 | *"**not carried forward as-is** and is re-evaluated against this cascade"* |
| **37** §8.2 open Q1 | *"If the cascade covers every real case it should be **deleted**, not kept dormant"* |

Per D358 a spec describing a superseded model misdirects the build with full authority. An agent
dispatched on FR-36-23 would build on a mechanism Spec 37 has queued for deletion.
**Blocks:** FR-36-23, FR-36-8. **Needs:** one decision, recorded in BOTH specs in the same commit
(Spec 37 §1.2's boundary rule). See §5 Decision 1.

### 1.3 FR-37-29 is a shared-component change, not a cheap fix

The Spec 37 audit tiered it HAIKU. Verified: `ResponsiveControl.js` is consumed by **25 files**.
Rewriting it from `ButtonGroup` to a roving-tabindex `tablist` changes the inspector device
switcher on every block that has one. That is CLAUDE.md rule 7 territory (design-gate + Bean's
approval before building), not a batch item. **Re-tiered: SONNET behind a design gate.**

---

## 2. Cost tiers used

| Tier | Meaning |
|---|---|
| `PYTHON` | A standalone script/lint gate. No block logic. Cheapest. |
| `HAIKU` | Mechanical, single-file, no design judgement (add a Notice, register a roster entry). |
| `SONNET` | Feature work inside one block's own files. Design judgement bounded by the spec. |
| `OPUS` | Novel architecture or cross-system design. Currently only the converter FRs. |
| `LIVE` | Cannot be coded — Playwright/axe/live-DOM measurement. |
| `BEAN` | Only Bean can close it (eye sign-off, usability test, a locked decision). |

---

## 3. WAVE 1 — dispatch concurrently, no decisions needed (8 units)

All eight touch **disjoint files** (verified by me, not taken from the audits). None depends on
an open decision. None touches a shared component.

| Unit | FR | Tier | Files it owns |
|---|---|---|---|
| W1-A | 36-19 mini-cart (Store API, flyout/drawer, empty state) | SONNET | `src/blocks/cart/*` |
| W1-B | 36-20 search extends (product preview, displayModes) | SONNET | `src/blocks/product-search/*`, `src/blocks/filter-search/*` |
| W1-C | 36-21 social one-source + auto accessible names | SONNET | `src/blocks/social-icons/*` |
| W1-D | 37-35 container-query row reflow | SONNET | `site-header-row/style.css`, `site-footer-row/style.css` |
| W1-E | 36-12 nav editor informational notices | HAIKU | `nav-menu/edit.js`, `nav-drawer/edit.js` |
| W1-F | 37-19 header/footer informational notice | HAIKU | `site-header/edit.js`, `site-footer/edit.js` |
| W1-G | 36-24 `lint-responsive-controls.py` gate | PYTHON | `scripts/lint-responsive-controls.py` (new) |
| W1-H | 37-27 `check-simple-surface-cap.js` gate | PYTHON | `scripts/check-simple-surface-cap.js` (new) |

**Disjointness proof:** no file appears in two rows. W1-E and W1-F are the only two touching
`edit.js` files and they are different blocks.

### 3.1 Two orchestration rules binding every Wave-1 agent

1. **No agent runs `npm run build`.** Eight concurrent webpack builds writing the same `build/`
   directory would corrupt each other's output. Agents implement + syntax-check only. **I run ONE
   build after the wave lands.**
2. **No agent commits.** On a shared worktree with a co-active Spec-35 track, eight concurrent
   git operations is how you land on the wrong branch (STOP-RECHECK-BRANCH) or clobber another
   track. Agents report; **I review, then commit path-scoped in controlled batches.**

---

## 4. WAVE 2+ — sequenced work (dispatch after Wave 1 is QC'd)

### CHAIN M — the mega spine (Spec 36, strictly sequential)
`UNIT-PICKER` (36-3 + 37-7 merged) → 36-4 desktop disclosure → 36-5 mega render at real position
→ 36-10 disclosure contract → 36-8 priority+/bottom-tab modes → 36-17 mega content crawl
→ 36-9a referential-integrity sweep. All SONNET. Each needs the prior one's primitive.

**Runs parallel to CHAIN M** (own block, no shared file): 36-6 "show header" per-row toggle.

### CHAIN B — behaviours + responsive shape (Spec 37, strictly sequential)
37-14 tri-state attrs → 37-16 container object shape → 37-15 scoped behaviour CSS
→ 37-13 hide-on-scroll (wire it, or delete the dormant JS — see §5 Decision 3).
All SONNET, all touching `site-header/block.json` + `class-sgs-header-behaviours.php`.

### CHAIN S — starters (Spec 37, sequential, shares its head with CHAIN M)
37-8 legacy-pattern disposition (see §5 Decision 2) → `UNIT-PICKER` → 37-31 second half (wire the
3 search starters) → 37-28 preset controls.

### CHAIN R — row controls (sequential against each other, parallel to everything else)
37-33 `layoutMode` control → 37-34 promoted-element inserter palette. Both touch the same four
row files, so they cannot run concurrently with each other.

### Independent, schedulable any time
- 37-18 add both containers to the Spec 35 manifest roster — HAIKU, then SONNET for gaps found.
- 37-30 `wp sgs` active-CPT commands (set/clear/list/seed) — SONNET, reuses `Sgs_Active_Layout`.
- 36-14 Part L control completeness across the utility pieces — SONNET.
- 36-22 logo source defect (`get_theme_mod('custom_logo')` → Site Info) — SONNET, see Decision 1.
- 36-23 site-info SHOULDs — SONNET, **blocked on Decision 1**.
- 36-9 drawer partial-width var binding — HAIKU.
- 37-29 device-switcher a11y — SONNET, **behind a design gate** (§1.3).
- 37-31 first half — no-op; record the finding that the 3 template parts never existed.

### Deferred — external dependency, do not schedule
36-15 converter nav emit · 36-18 real branded cutover · 36-25 structured-data-once ·
37-22 emittable-by-construction. All gated on **Spec 33 Part 2** (header/footer cloning), which
has not started. OPUS tier when it does.

### Gates — cannot be coded, run last
36-16 + 36-11 full live axe/Playwright pass · 37-12 never-overflow at 375/768/1440 on both sites
· 37-23 Spec 37 acceptance · 37-26 recorded operator-simplicity test (BEAN) · Bean's eye (R-31-13).

---

## 5. Decisions owed by Bean (nothing below dispatches until these land)

**Decision 1 — `labelCollapse`: keep or delete?** (§1.2)
Blocks FR-36-23, FR-36-8, and informs FR-36-22.
- **Option A — keep it** (Spec 36's position). Cheapest; it is built and live on button +
  business-info. Cost: two mechanisms doing overlapping jobs.
- **Option B — delete it, let the per-device cascade cover it** (Spec 37's position). Cleaner;
  one mechanism. Cost: real removal work + re-verification on every consumer.
- **Recommended: A for now, with the conflict resolved by amending Spec 37 §3.8 to say
  `labelCollapse` is retained** — because the per-device cascade it would defer to is itself
  owned by Spec 35 and NOT BUILT, so deleting first strands the capability.

**Decision 2 — the 9 legacy header/footer patterns: retire or re-target?**
New finding, in neither spec. `header-centred/full/minimal` + `footer-centred/columns/compact/
informational/minimal/simple` target the OLD `core/template-part` model, not `sgs/site-header`.
Gates FR-37-8 and the picker.
- **Option A — retire them.** They are Spec-17-era. Cheapest, and stops the picker surfacing
  broken options.
- **Option B — re-target them to the CPT model.** More work, but you get 9 starters for free.
- **Recommended: B for the 3 header patterns, A for the 6 footer ones** — the header set maps
  onto the §3.1 three-row model cleanly; the footer set predates the count-based columns row.

**Decision 3 — hide-on-scroll: wire it or delete it?** (Spec 37 §8.2 open Q1, FR-37-13)
The JS exists and is unreachable — the D338 dead-capability class the spec itself warns about.
- **Recommended: wire it.** The engine is built and dormant; Spec 36 §8a confirms it needs one
  attr + one resolver flag + one toggle. Deleting working code to rebuild it later is waste.

**Decision 4 — approve the FR-37-29 design gate?** (§1.3)
A `tablist` rewrite of `ResponsiveControl.js` touches 25 consumers. I will not dispatch it
without your sign-off on the approach.

---

## 6. Nothing is dropped (STOP-29)

Every FR across both specs appears exactly once above, mapped to a wave, a chain, a gate, a
decision, or a named external dependency (Spec 33 Part 2). No FR is marked "out of scope".
Count: Spec 36 = 25 FRs · Spec 37 = 34 FRs · 4 shipped-and-closed are not re-listed.
