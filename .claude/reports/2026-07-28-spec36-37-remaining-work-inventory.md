# Spec 36 + Spec 37 — remaining-work inventory (2026-07-28)

**Why this exists:** Bean's directive, 2026-07-28 — the 12-reference clone moves to the END as the
proof the header/footer system is complete and S-tier ("directly copy all 12 so that we prove we
have that capability completely and they aren't half-baked additions/extensions/hard-coded").
Before that gate can be scheduled, the honest question is: what is actually left in both specs?
This inventory answers it, verified against each spec's own status lines + the LEDGER + decisions
D376–D398, not from memory.

**Bean decisions recorded here (this session):**
1. **The 12-site clone is the FINAL ACCEPTANCE GATE** for the header/footer system — not a
   5-preset shortcut. Every reference must be buildable completely, with no hardcoding and no
   half-baked extension.
2. **Floating UI STAYS in the Customiser** — considered moving it into the header builder (Lama
   Lama's floating side items prompted it); decided the Customiser's live-preview-while-editing is
   the value. Keep, don't move.
3. **3-column header rows + the visual grid-shape picker (FR-37-42)** re-affirmed as core
   functionality — "how the space is shared" is the point.
4. **Probable track merge:** Spec 36 + 37 execution in ONE thread so header, footer, and all the
   pieces populating them are built in continuity — and so we can see which blocks need
   header/footer-specific variants. (Recommendation at the end.)

**Correction accepted (Bean's eye beats the probe):** I claimed "8 of 9 references are not
sticky". Wrong framing. Lama Lama IS sticky — Bean scrolled it and watched the header stay. My
probe never found its header (filter miss) and could not scroll its custom container, so that site
was *unmeasured*, not *non-sticky*. Honest restated finding: **of 7 scroll-verified sites, 1 was
sticky; 2 sites were unmeasurable by the probe and at least one of those IS sticky by eye.**
Sticky is less rare than I claimed; the roster conclusion "sticky must be earned, not default"
still holds but on weaker evidence. (STOP-MEASUREMENT-VS-EYE.)

---

## A. Spec 37 — what remains (verified against the spec's own Status lines)

### A1. Blocked on Spec 35 (the cross-spec dependency chain)
| Item | Status | Detail |
|---|---|---|
| **FR-37-14** tri-state behaviours (`inherit/on/off` per tier ×5 attrs) | `NOT-BUILT`, **BLOCKED** | Needs Spec 35 D4's `resolveTier()` cascade (grep=0, not built). Do NOT build a second cascade. |
| **FR-37-24 → Spec 35** per-device content cascade | `MOVED`, not built | §3.8's model; Spec 35 owns the build. Same blocker as above. |

### A2. Real build work, unblocked
| Item | Status | Size |
|---|---|---|
| **FR-37-42** visual column-shape picker (writes existing `gridTemplateColumns`; must include `1fr auto 1fr` centred-logo) | approved 2026-07-28, `NOT-BUILT` | ~1–2h. **Prerequisite for cloning refs 1/2/4 faithfully** (all use asymmetric 3-col grids). |
| **FR-37-15** behaviours emit scoped `#uid` CSS, not body classes | `NOT-BUILT` | Medium. Design-gate (shared mechanism). |
| **FR-37-16** container attrs flat→object (20 suffixed attrs on each container) | `PARTIAL` (rows done, containers flat) | Medium; pre-live clean reshape, no migration. |
| **FR-37-18** inspector conformance to Spec 35 Part L | `NOT-BUILT` | Runs with the Spec 35 work. |
| Scroll-state **shadow** on pinned header (teardown gap 2 — Island Creek) | new, unspecced | ~1h; behaviour layer already toggles state classes. |
| Brand **payment-logo SVG set** (teardown gap 4, narrowed) | new, unspecced | Small; trust-bar covers generic already. |
| "Floating" header mode (Troubadour pill; gap 3) | new, design-gate first | ~3–4h. We own the primitive (`--sgs-header-height` publisher = their `--header-offset`). |
| **FR-37-6** per-site CPTs — both live sites render header+footer from CPTs | `PARTIAL` (file step done) | Small; authoring + set-active on both sites. |
| **FR-37-27** Simple-surface reorder toward the roster | nudge, not defect | Small; deliberate ordering pass, hide nothing. |
| Simplicity findings 2+3 (canvas-click selects header; settings ordering) | open (`P-HEADER-SIMPLICITY-FINDINGS`) | Small–medium. |
| **FR-37-26** blind-tester arm (real non-coder, screen-recorded) | outstanding | Bean-run session; the authoritative half. |

### A3. End-game (deliberately last)
| Item | Status |
|---|---|
| **B3 = the 12-reference clone** (reshaped by decision 1 above) | Mood board + measured teardowns done (9/12 measured; Away/ButcherBox/rabbit owed a teardown before cloning). The clone itself is the FINAL GATE. |
| **FR-37-22** emittable-by-construction + "Spec 33 Part 2" header/footer clone walker | `NOT-BUILT`; consumes finished 36+37. The 12-clone and Part 2 likely land together — cloning the refs THROUGH the pipeline is the strongest possible proof. |
| **FR-37-23** acceptance (live FRs + never-overflow on both sites + no inline + Bean's eye) | Open; closes with the end-game. |
| **FR-37-36** custom React picker | Optional extension, non-blocking; only if native modal UX proves insufficient. |

### A4. Deliberately NOT to be built (do not resurrect)
D4 multi-sticky warning · sticky↔hide-on-scroll exclusion (both die with per-row sticky, D389) ·
per-row `position:sticky` (short-parent trap) · footer-row sticky (→ Spec 18, D390) · 44px shrink
floor (measured unnecessary, D386) · no-login preview link (Bean DROPPED, D395) · hand-typed ratio
string (FR-37-42 is the approved form).

---

## B. Spec 36 — what remains (verified against §8's own checklist)

### B1. The owed verification front (blocks everything downstream)
| Item | Status | Detail |
|---|---|---|
| **Gate 3 composed-nav** (FR-36-16 arm) | **OWED — the named next front** | Populate panel 1745 (EMPTY), attach to menu 100, `sgs/nav-menu` on a page; open on hover/tap/keyboard; axe on the OPEN panel; live recursion test; drawer no-regression; Bean's eye. One fixture unblocks all of it (`P-MEGA-GATE3-LIVE`, trigger FIRED). |
| **Mega motion live-verify** (D396) | **NOT live-verified** | Stagger/indicator/dark/2 variants ship-but-unproven; reports committed `INCOMPLETE`, R-31-13 sign-off NOT obtained. Same fixture as Gate 3. |

### B2. Deployed-but-unexercised (each needs a fixture + a live pass)
| FR | What remains |
|---|---|
| **36-19** mini-cart | No cart block on any canary page. Place, exercise flyout/drawer modes, verify Store-API add/qty/remove + empty state. |
| **36-20** search | Live-exercise the 3 display modes; product PRICES need their own dispatch (REST shape says "no price data — ever"). |
| **36-21** social · **36-23** business-info | Editor-session exercise of the deployed controls. |
| **36-12** notices | Editor-session exercise; the heading-less mega-panel notice waits on the mega CPT editor surface. |

### B3. Real build work
| Item | Status |
|---|---|
| **36-22** logo | `PARTIAL + open defect` — reads `get_theme_mod('custom_logo')`, a DIFFERENT source than contact/social (Site Info). Resolve deliberately. |
| **36-8 modes (b) + (c)** — priority+"More" overflow · bottom-tab-bar | Not built (only burger→drawer is). Operator-chosen modes are a headline FR. |
| **36-24** per-tier settings guard (`lint-responsive-controls`-style gate) | Not built; the cascade half waits on Spec 35 (same blocker as FR-37-14). |
| **Mega starters ≥2** (`sgs_mega_menu` picker arm of FR-37-7) | 3 exist per D379 — VERIFY the picker fires for mega, then this is done; the FR-37-7 line still says deferred. |
| **36-25** structured-data-once | Phase 3; depends on 36-21/22/23 being closed. |
| **36-26a** discoverability contract (a11y/SEO/schema per link-list type) | Verify vs built 36-26; likely partial. |
| **36-18** Indus cutover — the *branded* header | Mechanism DONE (D361); the faithful branded header is a CLONING output → end-game with Part 2. |

### B4. Phase 3 (explicitly later; not blockers)
Block-menu (`wp_navigation`) support · Nav Health surface · **AI-builds-your-nav-from-a-sitemap**
(the category differentiator) · conditional/role menus · WC category mega · RTL · import/export.

---

## C. The merge question — recommendation

**Merge the EXECUTION, not the SPECS.** One track, one roadmap, one continuity ("Track 2:
Header/Footer/Nav system"), consuming both specs. Keep the two documents and their §1.2
both-specs-same-commit boundary — it has caught real drift three times (labelCollapse D363,
Site-Info ownership, FR-36-9a/FR-37-26 this week) precisely BECAUSE the ownership line forces
deliberate cross-edits. A merged mega-spec would lose that tripwire and cost a week of re-writing
with no capability gained.

**Proposed execution order for the merged track** (dependency-honest):

1. **Fixture wave** — Gate 3 composed-nav + mega motion + the B2 unexercised set (one canary
   fixture family serves all of it).
2. **Capability wave** — FR-37-42 shape picker · scroll-shadow · payment SVGs · 36-22 logo source ·
   36-8 modes b/c · FR-37-15 scoped CSS · FR-37-16 container reshape. (Spec 35's cascade unblocks
   FR-37-14/36-24 whenever it lands — schedule Spec 35 D4 into this wave if capacity allows.)
3. **Polish wave** — Simple-surface ordering, simplicity findings 2+3, per-site CPTs (FR-37-6),
   blind-tester arm.
4. **PROOF GATE — the 12-reference clone** (Bean decision 1): teardown the 3 unmeasured refs,
   then build all 12 headers+footers as SGS-native patterns/CPTs, zero hardcoding, mobile+drawer
   parity, contrast on all 8 client palettes, Bean's eye per R-31-13. Anything a reference needs
   that SGS cannot express = a defect in waves 1–3, not a reason to trim the reference.
5. **Then Spec 33 Part 2** (the header/footer clone WALKER) — consumes the proven system; the 12
   references become its regression fixtures.

**On header/footer-specific block variants (Bean's open question):** the teardown evidence so far
says the specialist blocks already exist (nav-menu, nav-drawer, responsive-logo, cart, search,
business-info, icon-list, social) — what the references stress is **container-level capability**
(grid shapes, floating mode, scroll states, layered backgrounds like Stripe's morphing
`navigation-menu__background`), not missing block variants. The 12-clone will answer this
definitively per block; wave 4's gap log is where the "needs a header-specific variant" list
falls out with evidence rather than speculation.

---

*Sources: Spec 37 §4/§5 status lines (read this session) · Spec 36 §8 checklist (read this
session) · LEDGER 2026-07-28 · D376–D398 · teardown run `20260728-112649-7bc4a8` (FINDINGS.md).*
