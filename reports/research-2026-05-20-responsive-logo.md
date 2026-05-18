# Responsive Logo Systems & SVG Animation — Gap Analysis for SGS
**Date:** 2026-05-20 | **Scope:** Competitor state, SVG animation patterns, aspect-ratio logos, WP block API options, SGS recommendation

---

## 1. Competitor Responsive Logo Support

| Product | Per-device logo swap | SVG animation | Aspect-ratio variants (H/Sq/V) | Control surface |
|---|---|---|---|---|
| **Kadence** (Advanced Header Block) | ✅ Yes — creates two separate header templates: one for Desktop, one for Tablet/Mobile. Different images, widths, and positioning per template | ❌ No native support | ⚠️ Indirect — different image per header template, no semantic variant labelling | Block editor (Advanced Header block, separate desktop/mobile canvas) |
| **Spectra** (Site Title block + Responsive Conditions) | ⚠️ Partial — hide/show blocks per device; operator must stack two Image blocks with Responsive Conditions on each | ❌ No | ❌ No | Block inspector > Responsive Conditions toggle |
| **GenerateBlocks Pro** (no dedicated logo block) | ⚠️ Via image block + responsive device controls — same as Spectra workaround | ❌ No | ❌ No | Block inspector > device toggle per property |
| **Astra Pro** (Header Builder + Customiser) | ✅ Yes — dedicated "Mobile Logo" upload field separate from desktop logo, plus separate sticky logo. Width control per state | ❌ No | ❌ No (width control only) | Appearance → Customise → Header Builder |
| **Blocksy Pro** (Header Builder) | ✅ Yes — explicit "Upload different logo for mobile views" control in header logo element. Transparent + sticky states also have their own logo slots | ❌ No | ❌ No (size only) | Customise → Header → Logo element panel |

**Summary:** Kadence and Astra/Blocksy handle desktop/mobile logo swap natively. Spectra and GenerateBlocks leave it to operator workarounds. Nobody does SVG animation or semantic H/Sq/V orientation switching. **This is a genuine gap in the market.**

---

## 2. SVG Animation Logo Patterns in 2026

### Common animation types

| Type | Description | Trigger |
|---|---|---|
| **Path draw (stroke animation)** | Paths appear to be drawn in real time using `stroke-dashoffset` + `stroke-dasharray` | Page load, scroll into view |
| **Hover wiggle / bounce** | CSS `@keyframes` transform on hover — scale, translate, rotate | Hover |
| **Clip-path reveal** | Logo elements reveal behind a moving mask | Load |
| **Morph** | One path shape transitions to another using GSAP MorphSVG | Hover or scroll |
| **Staggered entrance** | Individual letters or shapes fade/slide in with delays | Load |

### Implementation: inline SVG is the only real option

- **Inline SVG** — only method that can be targeted by CSS or JS animations. Required for all animation types above.
- **`<img src="logo.svg">`** — no animation support. SVG is rasterised; `@keyframes` inside the SVG file don't run in all browsers.
- **`<object data="logo.svg">`** — SVG internal animations (SMIL) run but you can't target paths from the parent page CSS/JS. Avoid.
- **Lottie (JSON)** — Adobe After Effects export format, rendered via lottie-web (~40KB min+gzip). Visually rich but heavyweight, SVG not indexed by search engines, no intrinsic markup. Good for complex multi-element logos; overkill for a simple path-draw.

### Libraries ranked by weight

| Library | Size (min) | What it does | Best for |
|---|---|---|---|
| **Native CSS `@keyframes`** | 0KB | stroke-dashoffset animation, transform, opacity | Simple path draws, hover states |
| **Vivus / Vivus Instant** | ~15KB | Stroke path drawing only; CSS-only export available | Logo path draws with zero JS |
| **anime.js** | ~17KB | SVG attr animation, stagger, timeline, scroll triggers | Mid-complexity entrance sequences |
| **GSAP (free tier)** | ~30KB | Full timeline, stagger, ScrollTrigger | Complex sequences, scroll-linked |
| **GSAP DrawSVGPlugin** | Paid club | Precise partial-path drawing | High-fidelity path draw effects |
| **Lottie-web** | ~40KB | After Effects JSON playback | Complex branded motion |

**For a logo block:** native CSS handles 80% of use cases at 0KB. Vivus Instant generates pure CSS (no JS) for path draws. GSAP is only justified if the design requires scroll-trigger or multi-stage morph.

### Accessibility

- Wrap animated logo in `<figure role="img" aria-label="[Brand] logo">` with `<title>` inside the SVG.
- Use `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }` — or use the `Window.matchMedia` API to conditionally load the animation.
- For decorative logos: `aria-hidden="true"` on the SVG, visible text nearby.

### Performance

- Keep SVG files below 10KB. Run through SVGO before embedding.
- CSS path-draw animations are GPU-composited (opacity + transform only) — safe.
- Avoid animating `width`, `height`, or layout properties — causes reflow.
- Lottie: only load if `IntersectionObserver` fires; defer JSON fetch.

### Reference sites with great animated logos

1. **Cassie Evans** — cassie.codes — personal portfolio; logo animates on load using GSAP DrawSVGPlugin + clip-path. Detailed write-up at cassie.codes/posts/creating-my-logo-animation/.
2. **Stripe** — stripe.com — Stripe S mark animates paths subtly on page load; pure CSS stroke animation, ~2KB SVG.
3. **Linear** — linear.app — mark draws itself on route transitions; inline SVG + CSS transitions, sub-10KB.

---

## 3. Aspect-Ratio Logo (Per-Device Orientation) Pattern

### The pattern

| Breakpoint | Logo variant | Why |
|---|---|---|
| Desktop (≥1024px) | Horizontal wordmark (e.g. 4:1) | Wide header has room for full brand name |
| Tablet (768–1023px) | Square or compact version (e.g. 1:1 or 2:1) | Narrower header column, nav takes space |
| Mobile (<768px) | Icon / mark only (e.g. 1:1) | Header height ≤ 60px, brand name illegible |

### Implementation patterns

**Option A — `<picture>` element (cleanest)**
```html
<picture>
  <source media="(min-width: 1024px)" srcset="logo-horizontal.svg">
  <source media="(min-width: 768px)"  srcset="logo-compact.svg">
  <img src="logo-mark.svg" alt="Brand name">
</picture>
```
Works with static files. No JS. Screen readers get the `<img alt>`. SVG files stay external (cacheable). Cannot animate paths (external file).

**Option B — CSS `display` on three inline SVGs**
Three `<svg>` blocks in markup, CSS hides two at a time per breakpoint. All three load on every request — only worth it if files are tiny (<5KB each). Enables animation on whichever is visible.

**Option C — WP block composition (current SGS capability)**
Three `core/site-logo` blocks each wrapped with `sgsHideOnDesktop` / `sgsHideOnTablet` / `sgsHideOnMobile`. Works today but clunky for operators — three separate blocks to configure.

**Option D — Single block with three upload slots (ideal)**
A custom `sgs/responsive-logo` block exposes Desktop / Tablet / Mobile image pickers in one control surface. On the front end it emits the `<picture>` element. No operator confusion; one block to place.

### Competitor handling

- **Blocksy Pro** — closest to D; its logo element has separate mobile logo upload. Doesn't have a third tablet slot or `<picture>` output.
- **Astra Pro** — desktop + mobile + sticky = three slots. No tablet-specific variant.
- **Kadence / Spectra / GenerateBlocks** — all require operator to build the three-block composition manually (Option C). Not elegant.

### Real client sites doing this well

- **Airbnb** — horizontal wordmark on desktop, bélo mark only on mobile. Uses `<picture>` srcset switching, ~3KB per SVG.
- **Monzo** — full wordmark on desktop, coral M mark on mobile header. Crisp SVG assets, no JS.
- **Oatly** — full logotype on desktop, circle mark on mobile. CSS visibility toggle approach.

---

## 4. WordPress Core Block API Options

### Option A — Extend `core/site-logo` via block variation + render filter

- Register a **block variation** that sets default attributes, adds a category label ("SGS Responsive Logo"), and pre-populates inspector controls.
- Use `render_block_core/site-logo` PHP filter to intercept the rendered HTML and swap in `<picture>` with the extra image attributes stored in the variation's custom attrs.
- Use `useBlockEditingMode` / `BlockControls` + `addFilter('editor.BlockEdit')` in JS to inject three Image upload controls into the sidebar.

**Pros:** Stays in sync with core updates automatically. `core/site-logo` handles SEO (site identity binding), fallback to site icon, width control. Less PHP surface to own.

**Cons:** Variation's custom attributes must be registered via `register_block_type_from_metadata` — messy to bolt onto a core block. The `render_block` filter is called for *every* `core/site-logo` on the page; guard with attribute presence check. Any upstream change to core's save output can break the filter.

### Option B — New `sgs/responsive-logo` block

- Registers its own `block.json` with `tablet_logo_url`, `mobile_logo_url`, `enable_svg_animation`, `animation_type` attributes alongside the standard logo attrs.
- PHP `render_callback` emits the full `<picture>` element or inline SVG.
- Reads site identity (logo URL, site name) from `get_theme_mod('custom_logo')` or a custom attribute — operator can override per block.
- Full control over editor UI: three media pickers, animation toggle, prefers-reduced-motion toggle.

**Pros:** Clean separation of concerns. All attributes owned by SGS. No dependency on core block internals. SVG animation is straightforward to add (inline SVG `<textarea>` paste or media library upload + PHP inline render). Full block.json typing.

**Cons:** Operator must use *this* block instead of `core/site-logo`. Two blocks exist in the inserter unless core's variation is deprecated or unregistered. Must maintain site-identity binding manually.

**Recommendation: Option B.** The control surface requirements (3 image slots + SVG animation + aspect-ratio logic) exceed what a variation bolt-on can cleanly express. The render filter approach becomes brittle as requirements grow. Own it properly.

---

## 5. Recommendation for SGS — Phase Ordering

### Phase 1 — Responsive logo (3–4 hours dev) ✅ Highest ROI

Build `sgs/responsive-logo` with:
- Desktop / Tablet / Mobile image pickers (Media Library, same as core/site-logo UX)
- Front end emits `<picture>` element with correct `media` attributes
- Falls back gracefully: if only desktop set, render `<img>` as normal
- Width control per device (matches Kadence/Astra parity)
- Alt text control (WCAG 2.2 AA)
- Unregister or de-prioritise `core/site-logo` from the inserter so operators find this first

This alone puts SGS **ahead of Spectra and GenerateBlocks**, and **at parity with Astra/Blocksy** on logo control.

### Phase 2 — Aspect-ratio orientation resolver (1–2 hours, add to Phase 1 block)

Add a mode toggle: **Auto-orientation** — operator selects brand assets for H / Square / Mark variants, block resolves which to show based on the rendered container width using a `ResizeObserver` (not just breakpoint). Edge case: the logo in a narrow sidebar column should show the mark, even at desktop breakpoint.

### Phase 3 — SVG animation support (2–3 hours dev)

Add to `sgs/responsive-logo`:
- "Animated SVG" mode — operator pastes or uploads an SVG file; block embeds it inline
- Animation type picker: **Path draw on load** / **Hover scale** / **None**
- Implementation: native CSS `@keyframes` for path draw (Vivus Instant CSS export as the generation tool); no JS dependency for simple cases
- Respects `prefers-reduced-motion` via PHP-injected conditional CSS class
- `aria-label` and `role="img"` auto-applied from site name

**Total estimated dev time: ~8 hours across all three phases.** Phase 1 alone delivers most of the value.

### What NOT to do

- Do not use the three-`core/site-logo` composition workaround as a first-class recommendation. It works for power users, but novice operators will break it.
- Do not pull in Lottie for a logo animation block. The 40KB payload is disproportionate to a logo animation. Native CSS or Vivus Instant is sufficient.
- Do not extend `core/site-logo` via variation + render filter for this use case — the attribute surface is too large to bolt on cleanly.
