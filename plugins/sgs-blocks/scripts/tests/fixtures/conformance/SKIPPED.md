# Conformance Fixture Skip Register

**No fixtures were skipped.** All 29 container-mirror composites converted via `walk()` without error.

## Container-fallback observations (NOT skips — these are the current correct behaviour)

The following 24 composites produce `sgs/container` as the OUTER wrapper, with the
composite's own block emitted as an INNER block. This is correct: per Spec 22
§FR-22-21 and the converter's section-kind logic, only `section`-kind blocks
(hero, cta-section, trust-bar, modal) are emitted as the outermost block directly.
All other composites are wrapped in `sgs/container` because their BEM root class
does not resolve to a section-kind block in the DB (`block_composition.container_kind`).

| Fixture | Primary outer block | Target composite (inner) |
|---------|--------------------|--------------------------
| sgs-accordion.html | sgs/container | sgs/accordion |
| sgs-accordion-item.html | sgs/container | sgs/accordion-item |
| sgs-card-grid.html | sgs/container | sgs/card-grid |
| sgs-content-collection.html | sgs/container | sgs/content-collection |
| sgs-feature-grid.html | sgs/container | sgs/feature-grid |
| sgs-form.html | sgs/container | sgs/form |
| sgs-form-field-tiles.html | sgs/container | sgs/form-field-tiles |
| sgs-form-step.html | sgs/container | sgs/form-step |
| sgs-gallery.html | sgs/container | sgs/gallery |
| sgs-google-reviews.html | sgs/container | sgs/google-reviews |
| sgs-info-box.html | sgs/container | sgs/info-box |
| sgs-mobile-nav.html | sgs/container | sgs/mobile-nav |
| sgs-multi-button.html | sgs/container | sgs/multi-button |
| sgs-notice-banner.html | sgs/container | sgs/notice-banner |
| sgs-option-picker.html | sgs/container | sgs/option-picker |
| sgs-post-grid.html | sgs/container | sgs/post-grid |
| sgs-pricing-table.html | sgs/container | sgs/pricing-table |
| sgs-product-card.html | sgs/container | sgs/product-card |
| sgs-quote.html | sgs/container | sgs/quote |
| sgs-tab.html | sgs/container | sgs/tab |
| sgs-tabs.html | sgs/container | sgs/tabs |
| sgs-team-member.html | sgs/container | sgs/team-member |
| sgs-testimonial.html | sgs/container | sgs/testimonial |
| sgs-testimonial-slider.html | sgs/container | sgs/testimonial-slider |
| sgs-trustpilot-reviews.html | sgs/container | sgs/trustpilot-reviews |
| precedence-collision.html | sgs/container | sgs/info-box |

The golden files for these fixtures capture the CURRENT emit (container-wrapped). If
the converter is later improved to emit non-section-kind composites at the top level
without a container wrapper, re-baseline with `REGEN=1` and a cited reason.

## Native-block (section-kind) composites — emitted without outer container

| Fixture | Primary block |
|---------|--------------|
| sgs-cta-section.html | sgs/cta-section |
| sgs-hero.html | sgs/hero |
| sgs-modal.html | sgs/modal |
| sgs-trust-bar.html | sgs/trust-bar |
| mamas-trust-bar-real.html | sgs/trust-bar |
