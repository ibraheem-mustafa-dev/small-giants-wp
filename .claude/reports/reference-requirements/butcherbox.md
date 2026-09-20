---
doc_type: report
project: small-giants-wp
title: butcherbox reference requirements capture
date: 2026-09-20
plan_row: W3B-3
---

# butcherbox (https://www.butcherbox.com/)

Captured by hand in the real Chrome on this PC (one window; the 375 tier through the device emulator). The 768 tier and the footer at 375 were not captured; every gap is listed in `not_measured`.

- **Header:** full-bleed, sticky (top 0), 72px tall, white once stuck, transparent over the hero at rest. A 32px announcement banner (a swiper) sits above it and scrolls away; it was not present at 375.
- **Bar (1440):** Lato 16px 400, items How it Works, Sourcing, Gifts (dropdown), FAQs after the logo; a white pill Sign In button and a green pill Choose your plan button at the right.
- **Dropdown:** the Gifts panel is click-toggled (`aria-expanded`), 300px wide, left edge equal to the item's left edge (item-left), background rgb(252, 250, 248), no radius, a small shadow, four links at 36px pitch; a fixed scrim (rgb(18, 18, 18)) covers the page below the header while it is open. No wider mega panel exists.
- **Mobile (375):** burger left, logo centred, no actions. Opening hides the burger and shows a close control at the right end of the header; the header stays visible above a full-width white panel that starts below it (740px tall), slides in over 0.15s, holds a CTA, a phone number and the links at 20px 600, and locks body scroll.
