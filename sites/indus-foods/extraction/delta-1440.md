# Delta Comparison — Reference vs Our Site at 1440px
**Date:** 2026-03-19

Severity: CRITICAL (blocks functionality/readability), MAJOR (noticeable visual mismatch), MINOR (subtle difference)

---

## TOP BAR

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| Height | 54px | 68px | MAJOR |
| Pill background | #FFFFFF (solid white) | rgba(255,255,255,0.15) (semi-transparent) | MAJOR |
| Pill text colour | #0A7EA8 (teal) | #FFFFFF (white) | MAJOR |
| Pill border | 3px solid #FFFFFF | none | MAJOR |
| Pill border-radius | 30px | 9999px | MINOR |
| Pill padding | 10px 20px | 4px 12px | MAJOR |
| Pill font-size | 18px | 15.75px | MINOR |
| Pill height | 44px | 34px | MAJOR |
| Social icon size | 24x24px | 52x52px | MAJOR |

**Summary:** Top bar pills are completely different style — reference uses solid white pills with teal text, ours uses semi-transparent pills with white text. Social icons are too large.

---

## MAIN NAV BAR

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| Height | 115px | 93px | MAJOR |
| Position | relative (not sticky) | sticky | MINOR (our improvement) |
| Logo width | 350px | 300px | MAJOR |
| Logo height | 79px | 68px | MAJOR |
| Active link border-radius | 0px (flat) | 4px (rounded) | MINOR |
| Active link padding | 0 20px | 4px 16px | MINOR |
| Nav link padding | 0 20px | 4px 8px | MINOR |

**Summary:** Logo is smaller. Nav bar is shorter. Active link pill is slightly rounded vs flat on reference. Sticky header is our improvement (keep).

---

## HERO SECTION

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| Height | 550px | 578px | MINOR |
| Padding | 60px 20px 25px | 40.5px 18px | MINOR |
| H1 font-size | 50px | 56.25px | MINOR |
| H1 line-height | 57.5px (1.15) | 61.875px (1.1) | MINOR |
| Subtitle font-size | 27px | 22.5px | MINOR |
| Background | gold overlay + bg image | gradient only (no bg image visible) | MAJOR |
| **Primary CTA bg** | **#000000 (black)** | **#2C3E50 (dark slate)** | **MAJOR** |
| **Primary CTA text** | **#D8CA50 (gold)** | **#FFFFFF (white)** | **MAJOR** |
| **Primary CTA border** | **3px solid #D8CA50** | **none** | **MAJOR** |
| **Secondary CTA border** | **3px solid #FFFFFF** | **2px solid #FFFFFF** | MINOR |
| CTA padding | 18px 42px | 15.75px 36px | MINOR |
| CTA font-weight | 500 | 600 | MINOR |
| CTA letter-spacing | 1px | normal | MINOR |
| CTA box-shadow | 3px 8px 12px rgba(0,0,0,0.15) | none | MAJOR |
| CTA border-radius | 10px | 8px | MINOR |
| Hero image border-radius | 0px | 16px | MINOR (our improvement) |
| Hero image width | 550px | 663px | MINOR |
| Margin-top | 0 | 18px (gap below header) | MINOR |

**Summary:** CTA buttons are the biggest difference — reference uses black bg with gold text and gold border. Ours uses dark slate with white text, no border, no shadow. Background image overlay missing on ours.

---

## SECTION: Our Brands

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| **H2 colour** | **#E7D768 (light gold)** | **#1E1E1E (dark — BUG)** | **CRITICAL** |
| H2 font-size | 40px | 40.5px | MINOR |
| Logo size | 154x154px | 100x100px | MAJOR |
| Layout | Carousel (Spectra slider) | Static block (no carousel) | MAJOR |
| Height | 280px | 274px | MINOR |

**Summary:** H2 text is unreadable (dark on teal). Logos too small. No carousel effect.

---

## SECTION: Our UK Wide Food Services

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| **H2 font-size** | **40px** | **27px** | **MAJOR** |
| H2 colour | #2C3E50 | #1E1E1E | MINOR |
| Background | Pattern image (bg-demo.png) | #FFFFFF (plain white) | MAJOR |
| Card border-radius | 20px | 12px | MAJOR |
| **Card box-shadow** | **rgba(0,0,0,0.5) 0 50px 50px -40px** | **none** | **MAJOR** |
| Card padding | 35px 15px 15px | 22.5px 42.75px 18px | MINOR |
| Card width | 267px | 287px | MINOR |
| Card height | 495px | 575-615px (varies) | MAJOR |
| Card H3 font-size | 28.8px | 27px | MINOR |
| Card CTA style | Filled button (#0A7EA8 bg, white text) | Outline button (transparent bg, teal border) | MAJOR |
| Card CTA border | 3px solid transparent | 2px solid #0A7EA8 | MAJOR |
| Card CTA shadow | 3px 8px 12px rgba(0,0,0,0.3) | none | MAJOR |
| Card image size | 237px wide | 201px wide | MINOR |
| Gap | 24px | 18px | MINOR |
| Section padding | 60px 0 | 40.5px 18px | MINOR |

**Summary:** Major visual differences — no background pattern, no card shadows, cards too tall, CTA buttons are outline vs filled, section heading too small.

---

## SECTION: Why Choose Indus Foods?

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| Background | Gold gradient + bg image | #D8CA50 solid (no overlay image) | MAJOR |
| **Icon colour** | **#0A7EA8 (teal)** | **#2C3E50 (dark)** | **MAJOR** |
| Feature H3 font-size | 28.8px | 22.5px | MAJOR |
| Grid column width | 270px | 287px | MINOR |
| Gap | 20px | 18px | MINOR |

**Summary:** Icons should be teal not dark. Headings too small. Background missing overlay image.

---

## SECTION: Our Partners Love Us! (Testimonials)

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| **H2 colour** | **#E7D768 (light gold)** | **#1E1E1E (dark — BUG)** | **CRITICAL** |
| Layout | Carousel + side image (758px + 282px) | Full-width single card (1200px) | MAJOR |
| Height | 569px | 399px | MINOR |
| Quote style | normal (not italic) | italic | MINOR |
| Testimonial side image | 282x191px product photo | none | MAJOR |
| Carousel arrows | 39px, grey, transparent bg | 44px, dark, white bg, blue border | MINOR |
| Author name colour | #0A7EA8 | not visible in extraction | MINOR |

**Summary:** H2 unreadable (dark on teal). Layout completely different — reference has carousel + side image, ours is single full-width card.

---

## SECTION: CTA Banner

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| Heading level | H3 (28.8px) | H2? (40.5px) | MINOR |
| Background | Gold gradient + bg image | #D8CA50 solid | MINOR |
| **CTA button borders** | **3px solid (gold/white)** | **none** | **MAJOR** |
| **CTA button shadows** | **3px 8px 12px** | **none** | **MAJOR** |
| CTA primary bg | #000000 (black) | #2C3E50 (dark slate) | MAJOR |
| CTA primary text | #D8CA50 (gold) | #FFFFFF (white) | MAJOR |
| Padding | 30px 0 | 40.5px 18px | MINOR |

**Summary:** CTA buttons missing borders and shadows. Primary button should be black with gold text.

---

## FOOTER

| Property | Reference | Ours | Severity |
|----------|-----------|------|----------|
| **Heading colour** | **#E7D768 (gold)** | **#FFFFFF (white)** | **MAJOR** |
| Heading font-size | 28.8px | 18px | MAJOR |
| Heading text-transform | none | uppercase | MINOR |
| Column gap | 50px | 27px | MINOR |
| Footer logo size | 347x231px | 1x1px (lazy-load bug) | CRITICAL |
| Social icon size | 25x25px | 52x52px | MAJOR |
| Map height | 300px | 200px | MINOR |
| Contact line-height | 36px | 25.99px | MINOR |
| Copyright text colour | #E7D768 (gold) | #FFFFFF (white) | MINOR |
| Get Directions border | 3px solid #424242 | none | MINOR |
| Content max-width | 1140px | 1200px | MINOR |

**Summary:** Footer headings should be gold not white, and much larger (28.8px vs 18px). Logo not rendering. Social icons too large.

---

## PRIORITY FIX ORDER

### CRITICAL (fix first — blocks readability)
1. "Our Brands" H2 colour — dark text on teal, unreadable
2. "Our Partners Love Us" H2 colour — dark text on teal, unreadable
3. Footer logo not rendering (1x1px)

### MAJOR — Header & Nav
4. Top bar pills: change to solid white bg with teal text
5. Top bar social icons: reduce from 52px to 24px
6. Top bar height: reduce from 68px to 54px
7. Logo: increase from 300px to 350px wide
8. Nav bar height: increase from 93px to 115px

### MAJOR — Hero CTAs
9. Primary CTA: change bg to #000000, text to #D8CA50, add 3px gold border
10. Both CTAs: add box-shadow 3px 8px 12px rgba(0,0,0,0.15)
11. CTA border-radius: 10px (was 8px)

### MAJOR — Service Cards
12. Card border-radius: 20px (was 12px)
13. Card box-shadow: add rgba(0,0,0,0.5) 0 50px 50px -40px
14. Card CTA: change to filled style (teal bg, white text, no border)
15. Section H2: increase to 40px

### MAJOR — Why Choose
16. Icon colour: change to #0A7EA8 (teal)
17. Feature H3: increase to 28.8px

### MAJOR — Footer
18. Footer headings: change to #E7D768 (gold), increase to 28.8px
19. Footer social icons: reduce to 25px

### MINOR (defer)
- Active link pill radius (0 vs 4px)
- Various padding/margin differences
- Font size fine-tuning
- Background pattern images
