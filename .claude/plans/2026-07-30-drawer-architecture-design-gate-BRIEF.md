---
doc_type: design-brief
project: small-giants-wp
date: 2026-07-30
status: OPEN — this is NEXT SESSION'S TASK 1. Design gate NOT held. Nothing decided, nothing built.
spec_refs: Spec 36 FR-36-6 · Spec 37 FR-37-43 · R-31-9 · D419
owner_position: recorded verbatim below — Bean's contentions are the starting position, not mine
---

# Drawer architecture — design gate BRIEF (not the gate itself)

**Why this exists.** Bean rejected the proposal to give the drawer the header's row
mechanism. He then said, correctly, that we did not have the context left in that
session to hold a proper design gate — no research, no multi-agent panel. So the gate
is DEFERRED to next session as its **opening task**, and this file records his
position so none of it is lost or softened.

**Do NOT open this by proposing a solution.** Run the gate properly: research +
adversarial panel + options, with his contentions below as the standing position that
any alternative must beat.

---

## 1. Bean's contentions — recorded in full, nothing omitted

**(A) The row system should NOT be a block.** Either it is part of the CPT's
architecture, or "adding a new row to the drawer could just be adding another
container so its layout is similar to a normal page".

**(B) Why that shape.** It lets the drawer's architecture "enable the variety of
competitor designs we have laid out for it to copy in the POC stage **on all device
types**", and it is "set up to look and function like a modal **because the drawer is
literally just a specialised modal**".

**(C) The header row system does not fit the drawer.** Four distinct reasons, all his:
1. Apart from the top row's close button, **nothing in the drawer is fixed in place**.
2. The drawer **covers the whole screen height on mobile**.
3. On desktop it is **still much taller than the header**, which is "a strip at the top".
4. "Why would we restrict it to 3 rows to match that structure when they have very
   little in common?"

**(D) The two surfaces have different customisation needs.** Header rows carry "a lot
of unique controls and behaviours that are required due to how prominent the header is
as it's the top of every website so it requires so much customisation". The drawer does
vary — as the competitor drawers we intend to clone show — "but they aren't as vast as
the different header setups **especially on the functionality side**".

**(E) The drawer CPT needs its OWN specialised controls**, named by him: base
background colour · outline thickness (**0px for no outline**) · outline colour ·
variations for how the close button should look · colour options for that · padding ·
**gaps between rows** · "etc."

**(F) Default content of a new drawer.** It "should have a menu in it by default when
someone opens up a new one", **along with** "that top row default with the logo and
close button".

**(G) His question, asked and answered below:** what does the spec say about the nav
drawer's design/architecture, whose vision is it more aligned with, and is it right?

---

## 2. What the spec actually says — and who it backs

**FR-36-6 (Spec 36), verbatim:** *"One InnerBlocks container for the drawer's editable
CONTENT (absorbs Spec 34 FR-34-3), default template `[ nav-menu, (optional) logo,
(optional) cta ]`, `templateLock:false`"* and *"Full-screen `<dialog showModal>`
modal"*. The × close is *"fixed dialog CHROME the block always renders (render.php,
OUTSIDE the editable InnerBlocks)"*, undeletable by construction.

The ONLY place header rows appear in the drawer's requirement is the optional
**"Show header" toggle** — *"a checkbox per header row … inserts the chosen header rows
as blocks at the top"*. That is an **opt-in import of header rows as content**, not the
drawer's structural unit.

**Verdict: the spec is aligned with BEAN's position, not with the shared-header-row
proposal.** Point by point:

| Bean's contention | Spec |
|---|---|
| (A) "just adding another container, like a normal page" | "One InnerBlocks container … `templateLock:false`" |
| (B) "literally just a specialised modal" | "Full-screen `<dialog showModal>` modal" |
| (C) "why restrict to 3 rows to match the header" | The spec never proposes this; header rows are an opt-in insert |

**The proposal was wrong, and wrong in an instructive way.** It invoked R-31-9 (one
universal mechanism, no per-block divergence) and then chose the wrong universal. The
shared primitive for "a horizontal band of content with its own background" is
**`sgs/container`**, which every page already uses — not `sgs/site-header-row`, which
is a header-specific specialisation. Bean's model is MORE R-31-9-compliant, not less.

**Is the spec right? Architecture yes; one default is wrong.** Its default template is
`[ nav-menu, (optional) logo, (optional) cta ]` — logo AFTER the menu. **That ordering
is precisely the defect Bean reported** (logo rendering below the menu on the canary).
So FR-36-6's architecture stands and its default template needs amending — which is a
spec change to make WITH the gate's decision, per Spec 37 §1.2's same-commit rule.

---

## 3. Ground truth gathered before the gate (so it is not re-derived)

### 3a. Seven of Bean's eight named controls ALREADY EXIST

Read from `src/blocks/nav-drawer/block.json` on 2026-07-30:

| Bean's ask (E/F) | Existing attribute | Status |
|---|---|---|
| base background colour | `drawerBg` | EXISTS |
| outline thickness (0 = none) + colour | `__experimentalBorder` (width/color/style/radius, skip-serialised → scoped CSS) | EXISTS — verify the inspector LABELS it as an outline and that 0 means none |
| close-button look variations | `closeStyle` = `separate-x` / `text-swap` / `burger-morph` | EXISTS |
| close-button colour | `toggleCloseColour` | EXISTS |
| padding | `drawerPadding` | EXISTS |
| gaps between rows | `drawerGap` | EXISTS (gap between direct children) |
| menu present by default in a new drawer | both CPT starter patterns ship `sgs/nav-menu {"ref":0}` | EXISTS (W2-a) |
| **top row: logo LEFT + close RIGHT, own full-width background** | — | **MISSING — the actual new work** |

Full attr list: `anchor, animateFrom, closeStyle, drawerAlign, drawerBg, drawerGap,
drawerPadding, drawerRef, panelSize, sgsCustomCss, submenuModel, surfaceBlur,
surfaceOpacity, toggleCloseColour, variantPreset`.

**Consequence for the gate: do not re-litigate the control set.** The open design
question is narrow — the top row, per-row backgrounds, and logo placement. If rows are
`sgs/container`, per-row background may need **no new attribute at all**, since the
container already has background support. That further favours Bean's model.

### 3b. The scrollbar — root cause PROVEN, and it is not the drawer

Measured live on the canary, drawer open at 390px:

| measurement | value |
|---|---|
| drawer `scrollHeight` vs `clientHeight` | 767 = 767 — **no overflow** |
| drawer scrollbar width | **0px** — the drawer paints NO scrollbar |
| page scroll-locked? | YES — `body { position: fixed }`, page cannot scroll |
| `html` overflow-y | **`scroll`** — an always-on gutter |
| reserved gutter | **14px** |

**The ugly scrollbar is the PAGE's permanently-reserved gutter**, painted beside the
drawer and completely **inert** (the page is already scroll-locked, so it scrolls
nothing). "Style the drawer's scrollbar" would have fixed nothing — there is nothing
there to style. Fix = handle the gutter while a modal is open.

### 3c. Bean's mega-menu concern — measured, and it does NOT occur

His stated worry: *"the mega-menus when opened on mobile will often be wider than the
drawer but users would scroll through them horizontally or vertically."*

Measured with a mega panel OPENED inside the drawer at 390px: drawer **340px**, panel
**285px**, `panelOverflowsX: false`, and **zero** elements in the entire drawer wider
than the drawer. The drawer switched to **vertical** scrolling (1090px of content in
767px), which is correct.

**Mega panels reflow to the drawer's width; they do not spill sideways.** Recorded
because it removes a constraint the gate would otherwise design around — but note it
does NOT rescue the shared-header-row proposal, which fails on Bean's contentions (C)
and (D) regardless.

---

## 4. The one genuinely hard part the gate must solve

The × close is **chrome rendered OUTSIDE the editable InnerBlocks** so a client can
never delete the last close affordance (FR-36-6, Bean-decided 2026-07-19). This matters
more than it sounds: on a full-screen modal on TOUCH there is no ESC key and no
tap-outside, so the × is the ONLY reliable close.

Bean (F) wants the logo to sit in a **top row beside that ×, sharing one background**.
So the gate must reconcile: **the × stays undeletable and outside the editable tree,
while the row visually containing it becomes editable content with its own background.**

Candidate shapes to research — none chosen:
1. Chrome × absolutely positioned over the first content container (closest to today).
2. render.php emits a chrome TOP ROW that hosts the × and an optional logo slot;
   editable content starts below it.
3. First container is editable, × floats within it via the drawer's own scoped CSS.

Each trades differently against: undeletability, whether the operator can set that
row's background, and whether the POC competitor clones can be reproduced.

---

## 5. How to run the gate (next session, Task 1)

1. `/brainstorming` design mode — Bean's §1 contentions are the standing position.
2. `/research-buddies` + `/gh-research` — how do real modal/off-canvas systems
   structure editable panel content, and how do they keep a mandatory close affordance
   undeletable while the surrounding row stays authorable?
3. `/adversarial-council` or `/qc-council` on the shortlist BEFORE building — this is a
   shared mechanism on a CPT that every site will use.
4. Present ranked options + ONE recommendation. Bean picks. Then amend **Spec 36
   FR-36-6** (including the default-template order) and Spec 37 in the SAME commit
   (§1.2).

**Do not build before the gate is signed** (project rule 7 — shared/high-blast-radius
mechanisms are design-gated).

---

## 6. Related open items (do not lose)

- **Logo position + visibility must be OPTIONS** — Bean signed this; hiding allowed but
  discouraged; default = top-left, mirroring the header.
- **Scrollbar gutter fix** — signed shape: no scrollbar unless genuinely needed; when
  needed, styled to match the drawer rather than an OS default.
- **Logo legibility** — the pink-on-pink case that started this. Solved by the top row
  carrying its own background, whatever shape the gate picks.
- **Header fit cascade (D420)** is a SEPARATE, already-signed piece of work. It is
  unaffected by this gate — except that the gate must NOT quietly re-import
  header-row semantics into the drawer.
