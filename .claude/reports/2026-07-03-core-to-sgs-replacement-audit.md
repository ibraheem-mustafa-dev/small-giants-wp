# Core → SGS block replacement audit (2026-07-03)

**Purpose.** Bean's directive: "every single core block that has an sgs equivalent is immediately rerouted to the sgs equivalent via the DB." This audit maps every WP core block to its SGS replacement (by functionality, not name), and specifies the data-model + reroute change to make the rerouting universal.

## Data-model change (Bean-directed)

Today `blocks.replaces` is a **single-value** column on the SGS block (seeded from a scalar `"replaces"` in block.json). That can't express one SGS block replacing multiple core blocks (`sgs/media` = image + video + audio).

**New model:** `replaces` is a **list** in block.json; a core block has **≤1** SGS replacement, an SGS block replaces **0..N** core blocks (many-core → one-sgs). The canonical lookup is **core→sgs** (a core slug resolves to exactly one SGS slug). Uniqueness invariant: no two SGS blocks may claim the same core block (a reseed-time integrity check enforces it — `block_replacement_mapping`, sgs-update-v2.py Stage 6).

## Mapping (core block → SGS replacement)

### A. Already wired (6) — no change
| core | → sgs |
|---|---|
| core/button | sgs/button |
| core/heading | sgs/heading |
| core/paragraph | sgs/text |
| core/image | sgs/media |
| core/quote | sgs/quote |
| core/separator | sgs/divider |

### B. Strong — unambiguous functional equivalents (RECOMMEND ADD)
| core | → sgs | evidence |
|---|---|---|
| core/icon | sgs/icon | "Icon from Lucide / WP icons / Dashicons / emoji" — the enhanced icon block |
| core/table-of-contents | sgs/table-of-contents | "Auto-generated TOC from heading blocks" |
| core/breadcrumbs | sgs/breadcrumbs | "Auto-generated breadcrumb navigation" |
| core/gallery | sgs/gallery | "Image gallery with grid, masonry, carousel + lightbox" |
| core/tabs | sgs/tabs | "Tabbed content, ARIA, deep linking" |
| core/tab | sgs/tab | "Individual tab panel" |
| core/video | sgs/media | "image or video" (Bean: 100% replaces) |
| core/group | sgs/container | "Flexible layout wrapper — fundamental building block for all sections" |
| core/columns | sgs/container | Bean: "pretty sure core/columns is replaced by sgs/container" |
| core/buttons | sgs/multi-button | "SGS Button Group — container for one or more SGS Buttons" |
| core/site-logo | sgs/responsive-logo | block desc: "Replaces core/site-logo" |
| core/social-links | sgs/social-icons | "Row of social media platform icons with links" |
| core/form | sgs/form | "Form wrapper with multi-step, validation, N8N" (Bean: "we have a form block") |

### B2. Judgment rows — BEAN RULED (2026-07-03): ADD these
| core | → sgs | ruling / dependency |
|---|---|---|
| core/pullquote | sgs/quote | wire (low risk) |
| core/details | sgs/collapsible-text | wire (read-more disclosure = closest 1:1; NOT accordion) |
| core/accordion | sgs/accordion | wire the pair |
| core/accordion-item | sgs/accordion-item | wire the pair |
| core/audio | sgs/media | wire **+ BLOCK FEATURE: add audio rendering to sgs/media** (prereq — currently image+video only) |
| core/spacer | sgs/divider | wire **+ BLOCK FEATURE: add a 5th "gap"/invisible variant to sgs/divider** (Bean: "it already has 4 variants") |

### C. Judgment — DEFERRED / not ruled (leave for now)
| core | → sgs candidate | the question |
|---|---|---|
| core/audio | sgs/media | Bean wants it, BUT sgs/media currently renders image+video only — **audio is a real functionality GAP**. Wire only if we add audio rendering to sgs/media (else it mis-routes audio to a block that can't show it). |
| core/spacer | sgs/divider | semantic mismatch — separator (visible line) vs spacer (invisible whitespace). sgs/divider has 4 visual variants; none is "invisible gap". Risk: a draft spacer renders a visible divider. |
| core/pullquote | sgs/quote | pullquote = styled quote; sgs/quote is attributed blockquote. Plausible. |
| core/details | sgs/collapsible-text **or** sgs/accordion | details = single disclosure. collapsible-text = read-more; accordion = multi-item. collapsible-text is the closer 1:1. |
| core/accordion (+item) | sgs/accordion (+item) | structural composite; core/accordion is newer. Map the pair or leave. |
| core/column | sgs/container | child of columns; container flattens both. Include or leave to columns only. |
| core/social-link | sgs/social-icons | the singular item vs the group block. |
| core/cover | sgs/hero | cover = bg image + overlay content; hero = headline+CTA+bg. Overlap but not identical. |
| core/media-text | sgs/hero (split) | side-by-side media+text ≈ hero split variant. Judgment. |
| core/form-input / core/form-submit-button | sgs/form-field-* / sgs/button | ambiguous 1:many; the SGS form system is its own field set. |
| core/query / core/post-template | sgs/post-grid or sgs/content-collection | query loop; complex. Two SGS candidates → needs a single ruling. |

### D. No SGS equivalent (~95) — NOT actionable
All `core/comment-*`, `core/post-*` (fields), `core/query-pagination-*`, `core/navigation-*`, `core/site-*` (except site-logo), `core/term-*`, `core/playlist*`, plus `core/rss`, `core/calendar`, `core/archives`, `core/code`, `core/math`, `core/html`, `core/shortcode`, `core/footnotes`, `core/embed`, `core/file`, `core/list`/`core/list-item`, `core/preformatted`, `core/verse`, `core/table`, `core/latest-posts`, `core/latest-comments`, `core/tag-cloud`, `core/categories`, `core/search`, `core/loginout`, `core/read-more`, `core/more`, `core/nextpage`, `core/pattern`, `core/template-part`, `core/freeform`, `core/missing`, `core/subhead`, `core/text-columns`, `core/avatar`, `core/home-link`, `core/page-list*`. SGS deliberately does not reimplement query/comment/FSE/site chrome.

## Implementation plan (on sign-off)
1. **block.json** — add/extend `"replaces"` (now a JSON array) on each confirmed SGS block.
2. **Seeder** — sgs-update-v2.py: parse `replaces` as a list; expand to the core→sgs mapping; Stage 6 integrity check enforces core-uniqueness (no two SGS blocks claim one core block).
3. **Universal reroute** — move the swap to the single block-emission point in recognition: `final_slug = core_to_sgs.get(slug, slug)`, so ANY recognised core block with an SGS replacement emits the SGS block (not just the atomic-tag path). DB signal only; no slug literal. Design-gate: shared recogniser (Rule 7).
4. **Reseed** `/sgs-update` → verify the mapping in the DB + no orphan/duplicate.
5. **LANDED** re-clone page 8; confirm no regression + spot-check a rerouted block renders.
6. `/qc-council` on the built reroute; commit + push.
