# Expected render — sgs-media.draft.html

## Block emitted
`sgs/media`

---

## Required attrs (desktop / base tier unless stated)

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.sgs-media__image { max-width: 640px }` | `maxWidth` | `640px` | Desktop | **COVERED** — routes via `_lift_scalar_media_from_img`; `property_suffixes` row must exist for `max-width` on image element |
| `.sgs-media__image { max-width: 100% }` (@media ≤767px) | `maxWidthMobile` | `100%` | Mobile | **GAP** — the `_lift_scalar_media_from_img` path does not re-append `Mobile` breakpoint suffix; tier-attr re-append (§3 step 4) must handle this |
| `.sgs-media__image { aspect-ratio: 16 / 9 }` | `aspectRatio` | `16 / 9` | Desktop | **GAP** — no `property_suffixes` row for `aspect-ratio` in current DB; must be seeded via `migrations/*.py` + `/sgs-update` reseed; logs to `attribute_gap_candidates` |
| `.sgs-media__image { object-fit: cover }` | `objectFit` | `cover` | Desktop | **GAP** — §5 known-missing property; no `property_suffixes` row; must be seeded; logs to `attribute_gap_candidates` |
| `.sgs-media__image { object-position: center top }` | `objectPosition` | `center top` | Desktop | **GAP** — no `property_suffixes` row; must be seeded; logs to `attribute_gap_candidates` |
| `.sgs-media__image { border-radius: 16px }` | `borderRadius` | `16px` | Desktop | **COVERED** — `border-radius` has a `property_suffixes` row; routes via scalar-media lift |
| `.sgs-media__image { border-radius: 8px }` (@media ≤767px) | `borderRadiusMobile` | `8px` | Mobile | **GAP** — same tier-append gap as `maxWidthMobile` above |

---

## CHEAT-FORBIDDEN rules (must NOT appear in emitted output)

- `style="object-fit: cover"` or any inline style on the block or wrapper (R-22-6: responsive values must not be emitted as inline CSS).
- Any `background-image` or D2 scoped CSS for `max-width` (R-22-15: D2 scoped CSS when a D1 attr destination exists is a cheat).
- A `.sgs-media__image` class preserved verbatim on the rendered block (R-22-1 / R-22-2: BEM element classes must not pass through to emitted markup).

---

## Anti-coincidental-default verification

- `max-width: 640px` is deliberately NOT `100%` (the unset default) — a COVERED verdict here is real, not coincidental.
- `border-radius: 16px` is deliberately NOT `0` — real transfer, not default-match.
- `aspect-ratio: 16 / 9` is deliberately NOT `unset` — forces a GAP to surface if no suffix row exists.

---

## Notes for F2 (ledger) and F3 (oracle)

- F2: the declaration stream must include all 6 properties above (`max-width`, `aspect-ratio`, `object-fit`, `object-position`, `border-radius`, plus the `@media` variants). Any property missing from the `declare_input` ledger = parse failure.
- F3: run the render-oracle at 375px to confirm `max-width:100%; border-radius:8px` are live on the element; at 1440px confirm `max-width:640px; border-radius:16px`. A LANDED verdict requires `el.innerText.length > 0` OR element-present check (image has no innerText — use `el.getBoundingClientRect().width > 0` as the non-empty guard).
