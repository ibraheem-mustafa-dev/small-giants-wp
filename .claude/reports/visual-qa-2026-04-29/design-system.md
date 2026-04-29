# SGS Block Test — Visual QA Stage 2 Brief

This audit reviews **/block-test/** at https://palestine-lives.org with Indus Foods style variation active. The page exhibits ~30 SGS blocks for evaluation. **You have full-page screenshots** at three breakpoints (mobile 375, tablet 768, desktop 1280) so every block is visible.

## Target

**A grade across every block.** SGS is positioning to compete with Kadence Pro / Spectra Pro / GenerateBlocks Pro. B is the floor.

## Ground-truth findings already gathered (DO NOT re-flag — confirm these are visible in your screenshots and treat as known)

### Stage 1 fixes (already shipped today, commit 5f099bd)

- ✅ Counter "Product Lines" subtitle clipping fixed (line-height 1 → 1.1, margin-bottom 4.5px → 7.92px)
- ✅ Mobile top-bar "Apply For Trade Account" text-overflow:clip fixed (now ellipsis)
- ✅ Certification Bar mobile badges WCAG 2.5.5 fixed (40px → 44px touch target)

### axe-core WCAG AA violations found in this run (11 nodes, all "serious" impact)

| # | Selector | Contrast | Issue |
|---|---|---|---|
| 1 | `.sgs-heritage-strip__badge` | 3.13:1 | `#0a7ea8` on `#e7d768` bg (fails 4.5:1 normal text) |
| 2-4 | `.sgs-pricing-table__cta--accent` (×3) | 1.68:1 | `#ffffff` text on `#d8ca50` gold bg — catastrophic |
| 5-11 | `.sgs-business-hours__day` (×7) | 1.09:1 | `#424242` on `#2c3e50` — text effectively invisible |

These are confirmed contrast failures. Your job: judge what ELSE is wrong by eye, plus grade each block.

## Indus palette (active)

primary `#0a7ea8`, accent `#d8ca50`, accent-text `#7a6b00`, accent-light `#e7d768`, surface `#fff`, surface-alt `#f8f7f4`, text `#2c3e50`, text-muted `#5a6070`, text-inverse `#fff`, success `#2e7d4f`, whatsapp `#25d366`

## Blocks visible on /block-test/ (target: grade EACH one)

Layout: Container, Hero, SVG Background, Heritage Strip (with badge "Est. 1962")
CTAs: CTA Section, WhatsApp CTA, Announcement Bar
Cards (interactive, hover-eligible): Card Grid, Post Grid, Info Box, Team Member, Pricing Table, Google Reviews, Process Steps, Icon Block, Gallery, Testimonial
Display strips: Trust Bar, Certification Bar, Brand Strip, Business Info
Display blocks: Counter, Star Rating, Decorative Image, Icon, Icon List, Social Icons, Reading Progress, Table of Contents
Notice: Notice Banner (4 variants)
Forms: Form, Form Step, Form Review, ~12 Form Field types
Navigation: Mega Menu, Mobile Nav, Breadcrumbs, Back to Top
Multi-part interactive: Accordion, Tabs, Modal trigger, Testimonial Slider, Countdown Timer

## What I want from this audit

For EACH block visible in the screenshots (mobile, tablet, desktop):

1. **Grade** — S (innovative leader) / A (industry gold standard) / B (minor cosmetic) / C (noticeable issues) / D (multiple UX issues) / F (broken)
2. **Strengths** — 1-2 specific positives
3. **Polish to lift it to A** — 1-3 specific items
4. **Cross-breakpoint consistency** — does the block adapt cleanly between mobile/tablet/desktop?
5. **Comparison anchor** — match/beat Kadence/Spectra equivalent? Specific behaviour or design pattern they ship that SGS lacks.

Plus a **cross-cutting verdict**:
- Palette consistency
- Typography rhythm + hierarchy
- Vertical spacing rhythm (gold dividers should breathe; cards in a family should align)
- The 5 interactive cards (Card Grid, Info Box, CTA Section, Team Member, Pricing Table) — coherent visual family?
- Anything that signals "not yet A" — be honest, B grades and below ship back to the polish loop
- ADHD glanceability score (1-10) per breakpoint
- Premium-independent-business persona lens — does it feel premium or generic?

## Output format

Write a comprehensive markdown report to the path provided in the brief. Aim for 200+ lines covering all 30 blocks individually. Do not skip any block visible in the screenshots.
