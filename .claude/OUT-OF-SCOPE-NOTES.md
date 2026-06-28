# What's NOT done yet — and why (plain-English tracker)

**Why this doc exists:** so we stop re-discovering the same "wait, what's left?" every session. Each item says what it is, why it's parked, and the ONE thing that unblocks it. No jargon.

_Last updated: 2026-06-28._

---

## The array feature (cloning repeated items — stats, logos, steps, plans, badges, icons)

### ✅ What IS done
- Repeated items now clone their **text**, **images**, **links**, **icons** (the named kind, e.g. `data-icon="star"`), and **plain numbers** ("500+", "01"). 8 blocks wired. Every field we can't do yet is a **loud, tracked gap** — never a silent disappearance.

### ⏳ What's parked (and why)

1. **Item *styling* (each item's own fonts/colours/spacing).**
   - *What:* right now an item's words and pictures transfer, but not its own colours/fonts.
   - *Why parked:* in the pipeline, content moves first, then its styling — that styling step is the next build ("the CSS half").
   - *Unblocks it:* apply the existing styling-lifter to each item.

2. **Icons drawn as raw SVG shapes** (rather than a named `data-icon`).
   - *What:* an icon written as a named label clones fine; an icon drawn as raw shape-code doesn't resolve to the right icon yet.
   - *Why parked:* a safety gate currently blocks the new engine from reusing the existing icon-recogniser.
   - *Unblocks it:* open that gate for the icon-recogniser (it's a trusted, shared tool).

3. **Style *switches* on items** — a badge's light/dark variant, a card badge's colour, a plan's "Popular" highlight, a billing period (monthly/yearly).
   - *What:* these aren't text — they're on/off style choices baked into a CSS class or a true/false flag.
   - *Why parked:* they need a different kind of handler (a "style-modifier" reader), not the text/image one.
   - *Unblocks it:* the CSS-half build adds that handler.

4. **A plan's *features list*** (the ticked bullet list in a pricing plan).
   - *What:* a list-inside-an-item (a list within a list).
   - *Why parked:* nested lists need their own handling; out of scope for the first pass.
   - *Unblocks it:* a future nested-array handler.

5. **The hero badge "number + suffix" split** (e.g. "500" + "+").
   - *What:* the number and its little suffix live in one element and need splitting.
   - *Why parked:* tiny edge case; needs a small split rule.

---

## The bigger engine (cross-cutting)

6. **Make the item-handlers *shared* (the universal alignment).**
   - *What:* the handlers that read text/icons/links were built inside the array feature. They should be **one shared toolkit** used everywhere — built-in elements, nested blocks, AND array items — so we don't rebuild them per place.
   - *Why it matters:* this is the misalignment that keeps creeping back. **This is the fix being done right now.**

7. **Media images re-pointed to the WordPress library (A1).**
   - *What:* a cloned image still points at the mockup's address, not the uploaded WordPress copy.
   - *Why parked:* the new engine has no "media-map loader" until it's switched on in production.
   - *Unblocks it:* the production-wiring step loads the real media map.

8. **The content "nothing-went-missing" ledger (A2).**
   - *What:* we have a safety ledger that catches dropped *styling*; it doesn't yet catch a dropped *content node*.
   - *Why parked:* extending the ledger is a deliberate design job.

9. **W3 — the structured-content engine** (hero columns, nested child blocks).
   - *What:* the big one — converting complex laid-out content + nested blocks.
   - *Why parked:* highest-risk piece (~1,650 lines), deliberately given its own fresh session.

10. **The new engine is "inert" in real clones.**
    - *What:* all this new code is built + tested but **not switched on** for live cloning yet (live cloning still runs the old frozen engine).
    - *Why:* on purpose — it switches on once the pieces above (esp. 7 + 8) are safe.
