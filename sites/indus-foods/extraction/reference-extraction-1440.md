# Reference Site Extraction — 1440px Desktop
**URL:** https://lightsalmon-tarsier-683012.hostingersite.com
**Date:** 2026-03-19
**Stack:** Astra + Spectra (WordPress)

---

## GLOBAL

- Body font: Source Sans Pro, 18px, weight 400, line-height 28.8px (1.6)
- Body text colour: #2C3E50
- Body background: #FFFFFF
- Heading font: Montserrat, sans-serif
- Content max-width: 1140px
- Full-width sections: 1425px (viewport minus scrollbar)
- Content side padding: 0 35px on outer container

## COLOUR PALETTE (CSS Custom Properties)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--ast-global-color-0` | `#0A7EA8` | Primary teal |
| `--ast-global-color-1` | `#D8CA50` | Gold |
| `--ast-global-color-2` | `#E7D768` | Light gold |
| `--ast-global-color-3` | `#2C3E50` | Dark blue-grey (body text) |
| `--ast-global-color-4` | `#2EADE2` | Light blue |
| `--ast-global-color-5` | `#FFFFFF` | White |
| `--ast-global-color-6` | `#F2F5F7` | Light grey surface |
| `--ast-global-color-7` | `#424242` | Dark grey |
| `--ast-global-color-8` | `#000000` | Black |

---

## TOP BAR

- Height: 54px
- Background: #0A7EA8 (teal)
- Display: block
- Content left: Phone & email pill buttons
- Content right: Social icons (LinkedIn, Facebook, Google, Instagram)

### Phone/Email Pills
- Background: #FFFFFF
- Text colour: #0A7EA8 (teal)
- Font: Source Sans Pro, 18px, weight 600
- Border: 3px solid #FFFFFF
- Border-radius: 30px (full pill)
- Padding: 10px 20px
- Height: 44px
- Icons: 15x15px SVGs, fill #0A7EA8

### Social Icons
- Size: 24x24px SVGs
- Colour: #FFFFFF
- Background: transparent

---

## MAIN NAV BAR

- Height: 115px
- Background: #FFFFFF
- Position: relative (not sticky)
- Box-shadow: none

### Logo
- Width: 350px
- Height: 79px
- Format: SVG (horizontal multi-shade)

### Nav Links
- Font: Source Sans Pro, 19.8px, weight 600
- Colour: #0A7EA8 (teal)
- Text-transform: none
- Padding: 0 20px (top-level)
- Line-height: 30px

### Active Link (Home)
- Text colour: #FFFFFF
- Background: #0A7EA8 (teal)
- Border-radius: 0px (flat pill — no rounding)
- Padding: 0 20px

### Menu Structure
Home, About (dropdown), Sectors (dropdown), Brands (dropdown), Trade (dropdown), Blog, Contact

---

## HERO SECTION

- Height: 550px
- Display: flex
- Padding: 60px 20px 25px
- Background: linear-gradient(to right, #E7D768, #E7D768), url(banner.jpg) — gold overlay on bg image
- Content max-width: 1140px

### H1
- Text: "Leading Indian Food & Drinks Wholesaler"
- Font: Montserrat, 50px, weight 700
- Line-height: 57.5px (1.15)
- Colour: #2C3E50
- Letter-spacing: normal

### Subtitle
- Text: "Proud to be a family-run food wholesaler since 1962!"
- Font: Source Sans Pro, 27px, weight 400 (bold parts: 700)
- Line-height: 28.8px
- Colour: #2C3E50

### CTA Buttons

| Property | Primary ("Apply For A Trade Account") | Secondary ("Request Our Catalogue") |
|----------|--------------------------------------|-------------------------------------|
| Background | #000000 (black) | #0A7EA8 (teal) |
| Text colour | #D8CA50 (gold) | #FFFFFF |
| Border | 3px solid #D8CA50 | 3px solid #FFFFFF |
| Border-radius | 10px | 10px |
| Padding | 18px 42px | 18px 42px |
| Font | Source Sans Pro, 18px, weight 500 | Source Sans Pro, 18px, weight 500 |
| Letter-spacing | 1px | 1px |
| Box-shadow | rgba(0,0,0,0.15) 3px 8px 12px | rgba(0,0,0,0.15) 3px 8px 12px |
| Width | 310px | 283px |
| Height | 60px | 60px |

### Hero Image
- Width: 550px
- Height: 367px
- Border-radius: 0px
- Object-fit: fill

---

## SECTION: Our Brands (Carousel)

- Background: #0A7EA8 (teal)
- Padding: 0 20px
- Height: 280px
- Content max-width: 1140px

### H2
- Font: Montserrat, 40px, weight 700
- Colour: #E7D768 (light gold)
- Text-align: centre

### Carousel
- Type: Spectra Image Gallery carousel
- 32 images (8 unique, duplicated)
- Individual logo: 154x154px

---

## SECTION: Our UK Wide Food Services (Cards)

- Background: transparent + bg-demo.png pattern
- Padding: 60px 0
- Height: 695px
- Content max-width: 1140px

### H2
- Font: Montserrat, 40px, weight 700
- Colour: #2C3E50
- Text-align: centre

### Cards Layout
- Display: flex, nowrap
- Gap: 20px 24px
- 4 cards in a row

### Service Cards

| Property | Value |
|----------|-------|
| Border-radius | 20px |
| Padding | 35px 15px 15px |
| Box-shadow | rgba(0,0,0,0.5) 0 50px 50px -40px |
| Width | 267px |
| Height | 495px |
| H3 font | Montserrat, 28.8px, weight 700 |
| Body font | Source Sans Pro, 18px |

### Card Gradients
1. Food Service: linear-gradient(45deg, #D8CA50 0%, #E7D768 100%)
2. Manufacturing: linear-gradient(45deg, #D8CA50 0%, #2EADE2 100%)
3. Retail: linear-gradient(315deg, #0A7EA8 0%, #2EADE2 100%)
4. Wholesale: linear-gradient(45deg, #0A7EA8 0%, #D8CA50 100%)

### Card CTA Buttons
- Background: #0A7EA8
- Text: #FFFFFF
- Border: 3px solid transparent
- Border-radius: 10px
- Padding: 18px 42px
- Font: 18px, weight 500
- Box-shadow: rgba(0,0,0,0.3) 3px 8px 12px

---

## SECTION: Why Choose Indus Foods? (Info Boxes)

- Background: linear-gradient(to right, #D8CA50, #D8CA50), url(bg-image.png)
- Padding: 50px 0
- Height: 726px
- Content max-width: 1140px

### H2
- Font: Montserrat, 40px, weight 700
- Colour: #2C3E50
- Text-align: centre

### Grid
- 4 columns x 2 rows
- Column width: 270px
- Gap: 20px

### Info Boxes
- Background: transparent
- Width: 250px
- Icon wrapper: 250px wide, 69px tall
- SVG fill: #0A7EA8 (teal)
- Heading: Montserrat, 28.8px, weight 700, colour #2C3E50
- Body: Source Sans Pro, 18px, colour #2C3E50

### Items
Experience, Certifications, Delivery, Quality, Family Values, Brands, Support, White Labelling

---

## SECTION: Our Partners Love Us! (Testimonials)

- Background: #0A7EA8 (teal)
- Padding: 60px 0
- Height: 569px
- Content max-width: 1140px

### H2
- Font: Montserrat, 40px, weight 700
- Colour: #E7D768 (light gold)
- Text-align: centre

### Carousel
- Width: 758px
- Height: 340px
- Side image: 282x191px

### Testimonial Text
- Font: Source Sans Pro, 18px, weight 400
- Colour: #2C3E50
- Style: normal (not italic)

### Author Name
- Font-size: 20px, weight 600
- Colour: #0A7EA8

### Carousel Arrows
- Size: 39x39px
- Background: transparent
- Colour: #AAAAAA

---

## SECTION: CTA Banner ("What Are You Waiting For?")

- Background: gold gradient overlay + bg image
- Padding: 30px 0
- Height: 231px

### H3
- Font: Montserrat, 28.8px, weight 700
- Colour: #2C3E50

### CTA Buttons
Same styling as hero buttons (see hero section)

---

## FOOTER

- Background: #2C3E50
- Height: 803px
- Padding: 45px 0
- 3 columns, gap 50px, max-width 1140px

### Column 1 — Logo + About
- Footer logo: 347x231px (square SVG)
- Description: #FFFFFF, 18px, line-height 28.8px
- Social icons: 25x25px, colour #E7D768 (gold)

### Column 2 — Links + Contact + Hours
- Headings: Montserrat, 28.8px, weight 700, colour #E7D768
- Links: #FFFFFF, 18px, weight 400
- Contact/Hours: #FFFFFF, 18px, line-height 36px

### Column 3 — Map + Address
- Google Maps iframe: 347x300px
- Address heading: Montserrat 28.8px, #E7D768
- Address text: #FFFFFF, 18px, line-height 36px
- Get Directions button: bg #D8CA50, text #2C3E50, border 3px solid #424242, radius 10px, padding 18px 42px

### Copyright Bar
- Padding: 20px 0
- Text: "Copyright 2026 Indus Foods Ltd | Website by Ibraheem Mustafa"
- Colour: #E7D768
- "Website by" link: #FFFFFF

---

## TYPOGRAPHY SUMMARY

| Element | Font | Size | Weight | Line-Height | Colour |
|---------|------|------|--------|-------------|--------|
| Body | Source Sans Pro | 18px | 400 | 28.8px | #2C3E50 |
| H1 | Montserrat | 50px | 700 | 57.5px | #2C3E50 |
| H2 | Montserrat | 40px | 700 | 40px | #2C3E50 or #E7D768 |
| H3 | Montserrat | 28.8px | 700 | — | #2C3E50 or #FFFFFF |
| Nav links | Source Sans Pro | 19.8px | 600 | 30px | #0A7EA8 |
| Buttons | Source Sans Pro | 18px | 500 | — | varies |
| Hero subtitle | Source Sans Pro | 27px | 400 | 28.8px | #2C3E50 |

## BUTTON STYLES SUMMARY

| Type | BG | Text | Border | Radius | Padding | Shadow |
|------|-----|------|--------|--------|---------|--------|
| Primary CTA | #000000 | #D8CA50 | 3px solid #D8CA50 | 10px | 18px 42px | 3px 8px 12px rgba(0,0,0,0.15) |
| Secondary CTA | #0A7EA8 | #FFFFFF | 3px solid #FFFFFF | 10px | 18px 42px | 3px 8px 12px rgba(0,0,0,0.15) |
| Service card CTA | #0A7EA8 | #FFFFFF | 3px solid transparent | 10px | 18px 42px | 3px 8px 12px rgba(0,0,0,0.3) |
| Top bar pill | #FFFFFF | #0A7EA8 | 3px solid #FFFFFF | 30px | 10px 20px | none |
| Get Directions | #D8CA50 | #2C3E50 | 3px solid #424242 | 10px | 18px 42px | none |
