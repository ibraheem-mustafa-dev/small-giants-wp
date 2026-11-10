# PS-1: the DB and gates accept Spec 49's data model (2026-11-10)

**Verdict: PASS WITH CHANGES.** The proof seeded a private copy of the framework DB through `SGS_FRAMEWORK_DB`, from a throwaway worktree (`E:/sgs-tmp/wt-ps1`) holding §8-shaped `sgs/media` and `sgs/gallery` attributes.

**Isolation.** The main thread checked the shared DB's SHA-256 after the proof: `A6FECCBF8575`, unchanged. The private copy moved from `A6FECCBF8575` to `EC5B3ECDF260`. `sgs-update-v2.py::main` skips the second name in `~/.claude` whenever the path is not the shared DB.

| Proof | Result |
|---|---|
| `sgs/media` in §8's shape | Seeded. The responsive attributes are stored as objects, with `is_responsive=1` and `tier_shape=tier_object` |
| Paint-node names | `css_element` stores `media`, `surface`, `layout`, `overlay` and `mask` (a free-text column), so no new column is needed |
| `slot-array` on the gallery's items | Accepted, with no reference-table row; it is written only through an `attr-classification-overrides.json` entry |
| Resolver, `check_value_identity`, `audit-inline-styling.js`, colour-property gate, the 9 `test-media-*` and `check-media-*` gates | All pass |
| `check-wiring-fingerprint` | 57 new gaps, all because the proof built no controls or render code; they clear when WP-4, WP-2a and WP-2b land |

## Spec changes

1. **§8.1.** The generator writes an override entry for every attribute: `css_property`, `css_element`, `tier_shape` for responsive values, and a `role`, merging into any existing entry. Without these, the new attributes seeded with NULL properties, and Padding came out non-responsive.
2. **§8.3.** `slot-array` is written by an override entry. The seeder makes no rows for per-item fields; WP-1 adds them if the cloner or the wiring gate needs them.
3. **C8.** Today `generate-media-attributes.mjs --check` compares the PHP mirror with the JS registry and never reads `block.json` (the main thread confirmed it). The drift gate §6.1 promises is built in WP-1.
4. **Setup.** A fresh worktree needs `npm ci` in `plugins/sgs-blocks` and in `scripts/computed-route`.
