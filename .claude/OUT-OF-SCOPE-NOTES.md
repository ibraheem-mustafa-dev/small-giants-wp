# What's not done yet — mapped to its pipeline STAGE (not a gap list)

**Why this doc exists + the correction (2026-06-28, Bean):** an earlier version of this read like a bag of ad-hoc "out-of-scope gaps." That was wrong framing. This is a **universal pipeline** — so every item below is one of three things: a **pipeline STAGE not built yet** (Spec 31 already maps it), a **data-model item to finish** (model it in the DB, the Path-A way), or **already solved**. None are permanent exceptions.

The universal stream (Spec 31 §3): for EVERY element — block, child block, nested element, built-in element, array item — **A. identify it → B. migrate its content → C. transfer its attached CSS**, through ONE dispatch. Everything below is a piece of that stream not yet built/wired.

---

## A — STAGES of the universal pipeline, not yet built/wired (Spec 31 owns each)

| Item | Spec 31 stage that owns it | Status |
|---|---|---|
| **Per-item styling** (each item's own fonts/colours) | **CSS branch §3.A** + per-element styling-lift (B2). The "CSS step after content", universal to every element. | Stage not wired per-item yet |
| **Nested content** (a pricing plan's features *list* inside an item) | **Recursive walker (W3 / Stage 3c)** — recursion handles list-inside-item | Stage = W3, pending |
| **Nested child blocks generally** (hero columns, accordion items…) | **W3 walker port** (FR-22-3 recursive interior routing) | Stage = W3, pending (design approved) |
| **Media re-pointed to WP library** (A1) | **Production-wiring stage** (§8) — the media-map loads when the engine goes live | Stage = production-wiring |
| **Content "nothing-dropped" ledger** (A2) | **Conservation-ledger instrument** (§12.2.1) — extend `declare_input` to content nodes | Stage = ledger extension |
| **Engine inert in real clones** | **Production-wiring stage** (§8) — new engine switches on once A1/A2 safe | Stage = production-wiring (deliberate) |

→ These aren't gaps in the universal *logic*; they're stages of the universal pipeline not yet built or not yet switched on live.

## B — Data-model items to FINISH (the Path-A "model it in the DB" way — not code gaps)

| Item | The data to add | Then it just works |
|---|---|---|
| **hero `position` / `style`** (two style-switches on one badge element) | Add each field's **value-allowlist** to `arrayItemSchema` (the DB already is the home; we modelled name+selector+role, not the allowed values). | The `css-modifier` handler becomes enum-aware — picks `bottom-left` for position, `light` for style, by matching each field's allowlist. |
| **hero `number` + `suffix`** (combined in one span) | A split rule (or a draft-shape expectation that they're separate BEM elements). | Number and its suffix separate cleanly. |
| **pricing `highlighted` / `period`** (boolean / enum flags) | Model as a boolean/enum field in `arrayItemSchema` (DB-driven). | Lifts as the typed value. |

→ All consistent with the array feature being **fully data-driven** — finishing the per-item schema in the DB, not adding code branches.

## C — Already solved since the first draft of this note (stale lines removed)

- **Icons drawn as raw SVG** — DONE. The shared-library keystone opened the import-ban to `icon_resolver`, so `icon-slug` now resolves inline SVG (commit 305d5396).
- **Shared handler library** — DONE. The handlers are one shared module both paths use (305d5396). This was the misalignment; it's closed.

---

## The honest one-liner (Q2)
The pipeline is **designed** as the single universal identify→content→CSS stream (Spec 31 §3). The **content half is substantially built** in the new engine (scalar + array). Still pending: **A's recursion (W3 walker), C's CSS branch (the core fidelity work), and production-wiring** — and the new engine is **inert in live clones** until wired. So it is not *yet* one complete stream doing A+B+C for every element — it's being built toward exactly that.
