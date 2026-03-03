# Small Giants Studio — WordPress Framework

## Always Do First
- Read `wordpress-pro` SKILL.md before writing any WordPress/PHP code, every session, no exceptions
- Check existing SGS block structure before creating new blocks
- Run `npm run build` in the theme directory after JS/CSS changes

## Project Context
- **Framework:** SGS custom WordPress framework (replaces Astra/Spectra)
- **Deployment:** SFTP to Hostinger shared hosting — NEVER WP CLI, NEVER local flywheel
- **Hostinger:** 141.136.39.73, user u945238940, port 65002
- **Plugin slug:** small-giants-studio (public-facing)

## Brand & Design
- **Primary teal:** #0E9F8E
- **Dark:** #1A1A2E
- **White:** #FFFFFF
- Never use generic AI gradients or purple/blue hero sections
- All animations must use scroll-driven CSS (no JS scroll listeners)
- Container queries over media queries where possible

## S-Class Sprint Standards (Required)
- View transitions: `@view-transition { navigation: auto; }`
- Container queries: `@container` for component-level breakpoints
- Scroll-driven animations: `animation-timeline: scroll()` or named timelines
- Speculation rules: add `<script type="speculationrules">` for internal links
- Accessibility: WCAG 2.2 AA minimum, keyboard nav on all interactive elements

## Screenshot Workflow (Frontend)
- Always serve local dev on `http://localhost:8080` (or equivalent)
- After generating UI: take a screenshot, compare to reference, make corrections
- Minimum 2 comparison rounds before declaring done
- Be specific about: heading size, card gap, spacing, padding, font weight, colors

## Hard Rules
- No placeholder text ("Lorem ipsum", "Coming soon", "TODO")
- No inline styles — use CSS custom properties
- No `!important` except to override third-party styles
- PHP: sanitise inputs, escape outputs, nonces on all forms
- Never commit vendor/ directory
- UK English in all user-facing strings
