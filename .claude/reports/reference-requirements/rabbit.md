---
doc_type: report
project: small-giants-wp
title: rabbit reference requirements capture
date: 2026-09-20
plan_row: W3B-3
---

# rabbit (https://www.rabbit.tech/rabbit-r1)

Captured by hand in the real Chrome on this PC (one window; the 375 tier through the device emulator). rabbit.tech redirects to `/rabbit-r1`. The 768 tier and the footer were not captured; every gap is listed in `not_measured`. The earlier headless capture said rabbit.tech had no dropdown or drawer: a real Chrome shows both.

- **Header:** full-bleed, sticky, 65px tall at 1440 (77px at 375), orange (rgb(255, 87, 5) at 1440, rgb(255, 77, 6) at 375), no border or shadow.
- **Bar (1440):** logo at the left, then r1, updates, creations, intern, blog, newsroom, support (14px 400) and a cart button at the right.
- **Dropdown:** r1 owns a two-item panel (LAM playground, teachmode): 142px wide, radius 10px, orange, shadow-lg, closed by visibility. The open state did not open from synthetic pointer events, so it is not measured.
- **Mobile (375):** the burger is replaced in place by a close icon (the same 32x33 button rect), the header stays visible, and a full-screen orange panel starts below it (fade over 0.5s), holding seven 32px weight-200 centred links. Body scroll is not locked.
