<?php
/**
 * SGS Theme — Indus Foods style variation extras.
 *
 * Enqueues additional inline CSS for the 'indus-foods' style variation.
 * Gated on the active variation so other clients carry zero dead weight.
 * Images referenced here live in assets/decorative-foods/ and are
 * resolved via get_theme_file_uri() so they work on any WP install.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue style-variation-specific extras.
 *
 * Each style variation may need additional CSS that references theme assets
 * (e.g. decorative images). This keeps the base theme stylesheet clean and
 * ensures other variations carry no dead weight.
 *
 * Images are bundled in theme/assets/decorative-foods/ so paths resolve
 * correctly on any WordPress installation via get_theme_file_uri().
 */
function enqueue_style_variation_extras(): void {
	$variation = get_theme_mod( 'active_theme_style', '' );

	if ( 'indus-foods' === $variation ) {
		$base = esc_url( trailingslashit( get_theme_file_uri( 'assets/decorative-foods' ) ) );

		$css = "
/* Indus Foods — Service card hover effects */
.service-card{box-shadow:rgba(0,0,0,.5) 0 50px 50px -40px;transition:box-shadow .3s ease,transform .3s ease}
.service-card:hover{box-shadow:rgba(0,0,0,.75) 0 60px 60px -50px;transform:translateY(-2px)}
.service-card img{transition:transform .3s ease}
.service-card:hover img{transform:scale(1.05)}

/* Indus Foods — Service card text improvements.
 * Targets the gradient-background group blocks inside the services columns.
 * Selector: .has-surface-background-color (services section) > columns > column > .has-background (card).
 * Centre text, tighten spacing, prevent word-wrap on headings,
 * add readability backdrop behind text area, single-line buttons. */

/* Centre-align all text content within the card text area */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-group:not(:has(.wp-block-image)){
	text-align:center;
	background:rgba(255,255,255,0.12);
	border-radius:0 0 20px 20px;
	backdrop-filter:blur(1px);
}

/* Prevent mid-word wrapping on narrow cards */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background h3.wp-block-heading{
	word-break:normal;
	overflow-wrap:normal;
}

/* Service card buttons: centred, single line */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-buttons{
	display:flex;
	justify-content:center;
}
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-button__link{
	white-space:nowrap;
}

/* Indus Foods — Decorative ingredient images (hidden on mobile) */
.home .wp-block-group.alignwide:has(.service-card){position:relative;overflow:hidden}
.home .wp-block-group.alignwide:has(.service-card)::before{content:'';position:absolute;top:-20px;left:-30px;width:150px;height:150px;background-image:url('{$base}turmeric-pile.png');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-15deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignwide:has(.service-card)::after{content:'';position:absolute;top:-30px;right:-20px;width:140px;height:140px;background-image:url('{$base}chilli-scatter.png');background-size:contain;background-repeat:no-repeat;opacity:.18;transform:rotate(25deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color{position:relative;overflow:hidden}
.home .wp-block-group.alignfull.has-accent-background-color::before{content:'';position:absolute;bottom:-25px;left:-35px;width:160px;height:160px;background-image:url('{$base}cumin-seeds.png');background-size:contain;background-repeat:no-repeat;opacity:.22;transform:rotate(12deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color::after{content:'';position:absolute;bottom:-40px;right:-30px;width:170px;height:170px;background-image:url('{$base}coriander-leaves.png');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-18deg);pointer-events:none;z-index:0}
.home .wp-block-sgs-cta-section{position:relative;overflow:hidden}
.home .wp-block-sgs-cta-section::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-8deg);width:180px;height:180px;background-image:url('{$base}curry-splash.png');background-size:contain;background-repeat:no-repeat;opacity:.15;pointer-events:none;z-index:0}
.home .wp-block-group.alignwide:has(.service-card)>*,
.home .wp-block-group.alignfull.has-accent-background-color>*,
.home .wp-block-sgs-cta-section>*{position:relative;z-index:1}
@media(max-width:767px){
.home .wp-block-group.alignwide:has(.service-card)::before,
.home .wp-block-group.alignwide:has(.service-card)::after,
.home .wp-block-group.alignfull.has-accent-background-color::before,
.home .wp-block-group.alignfull.has-accent-background-color::after,
.home .wp-block-sgs-cta-section::before{display:none}}
";

		/*
		 * Indus Foods — additional variation-specific CSS.
		 * Sourced from the visual comparison audit (outstanding-issues.md § 10).
		 * All values reference CSS custom properties from the Indus Foods style
		 * variation so nothing is hardcoded against a specific hex value.
		 */
		$css .= "
/* ── Issue 7: Top bar — pill-shaped icon buttons ────────────────────────────
 * Solid white pills with teal text, matching reference site.
 * Reference: bg #FFFFFF, text #0A7EA8, border 3px solid #FFFFFF,
 * border-radius 30px, padding 10px 20px, height 44px. */
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:'] {
	display:inline-flex;align-items:center;gap:6px;
	background-color:#ffffff!important;
	color:#0a7ea8!important;
	border:3px solid #ffffff;
	border-radius:30px;padding:10px 20px;
	min-height:44px;
	transition:background-color .2s ease,color .2s ease;text-decoration:none;
	font-weight:600;
}
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover {
	background-color:rgba(255,255,255,.9)!important;
	color:#076a8e!important;
}
/* ── Top bar height: reduce to ~54px (reference) ────────────────────────────
 * Top bar has 8px top/bottom padding giving ~68px total. Reduce to 5px for 54px. */
.sgs-header-top-bar{padding-top:5px!important;padding-bottom:5px!important}
/* ── Top bar social icons: reduce from 52px to 24px ─────────────────────────
 * The WCAG min-width:44px rule in core-blocks.css is for footer/content social
 * icons. Top bar icons should be 24px to match reference site. */
.sgs-header-top-bar .wp-block-social-links .wp-block-social-link a{
	min-width:24px!important;min-height:24px!important;
	width:24px;height:24px;padding:0!important;
}
.sgs-header-top-bar .wp-block-social-links .wp-block-social-link svg{
	width:18px!important;height:18px!important;
}

/* ── Issue 9 & 8: Hero CTA buttons — vertical stack ─────────────────────────
 * Indus Foods variation stacks CTA buttons vertically on all viewports
 * (matches original design). Base theme only stacks on mobile.
 * !important required to override base theme flex-wrap: wrap behaviour. */
.sgs-hero__ctas{flex-direction:column!important;align-items:flex-start}
.sgs-hero--align-centre .sgs-hero__ctas{align-items:center}
.sgs-hero__cta{width:100%;max-width:380px;text-align:center}

/* ── Issue 4: Why Choose info-boxes — text contrast on accent background ─────
 * When info-boxes use cardStyle 'subtle' (transparent) on the accent/yellow
 * section background, override text colours to ensure readable dark-on-yellow
 * contrast. The base info-box CSS uses --text-muted which is too light.
 * !important required to fix WCAG AA contrast failure (1.68:1 → 4.5:1+). */
.has-accent-background-color .sgs-info-box--subtle .sgs-info-box__heading {
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}
.has-accent-background-color .sgs-info-box--subtle .sgs-info-box__description {
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}

/* ── Social icon brand colours covered by H21 in core-blocks.css ──────────── */

/* ── Issue 16: Footer logo — mobile max-width cap ───────────────────────────
 * Prevents the footer logo taking up excessive vertical space on 375px screens
 * when flex columns stack.
 * !important required to override WordPress's inline width attribute
 * (style='width:200px') which has higher specificity than CSS. */
@media(max-width:767px){
	footer .wp-block-image img,footer figure.wp-block-image img{max-width:140px!important;height:auto!important}
}

/* ── Issue 1: Hamburger button display handled in core-blocks.css line 322 ── */

/* ── Issue 6 (tablet nav): hide CTA and compress nav at 768–1023px ──────────
 * At tablet the CTA button already hides at ≤1023px (core-blocks.css).
 * This rule additionally limits nav-item gap so items don't wrap. */
@media(min-width:768px) and (max-width:1023px){
	.wp-block-navigation .wp-block-navigation__container{gap:.5rem}
}

/* ── Navigation mobile overlay z-index ───────────────────────────────────────
 * Ensures the full-screen overlay menu appears above all page content. */
.wp-block-navigation__responsive-container.is-menu-open{z-index:9999}

/* ── Issue 12: Hover effects ─────────────────────────────────────────────────
 * Indus Foods variation-specific hover states for buttons and navigation.
 * !important required to override WordPress button block inline colour styles
 * (background-color, color, border-color added by block editor colour picker).
 *
 * H1: Primary hero CTA — full invert on hover (teal bg → white bg, white text → teal text) */
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.has-primary-background-color:hover,
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.has-primary-background-color:focus{
	background-color:var(--wp--preset--color--surface,#fff)!important;
	color:var(--wp--preset--color--primary,#0a7ea8)!important;
	border-color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
/* H2: Secondary hero CTA — teal fill + white text on hover (outline → filled teal) */
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.is-style-outline:hover,
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.is-style-outline:focus,
.sgs-hero .wp-block-buttons .wp-block-button.is-style-outline .wp-block-button__link:hover,
.sgs-hero .wp-block-buttons .wp-block-button.is-style-outline .wp-block-button__link:focus{
	background-color:var(--wp--preset--color--primary,#0a7ea8)!important;
	color:var(--wp--preset--color--surface,#fff)!important;
	border-color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
/* H3: Top-level nav links — gold background on hover
 * Overrides base theme's accent hover (core-blocks.css line 55) with Indus
 * Foods gold + dark text for better contrast on teal header background. */
.wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > .wp-block-navigation-item__content:hover,
.wp-block-navigation .wp-block-navigation__container > .wp-block-page-list__item > a:hover{
	background-color:var(--wp--preset--color--accent,#d8ca50)!important;
	color:var(--wp--preset--color--text,#1e1e1e)!important;
	border-radius:4px;
}
/* H6: CTA section buttons — full invert on hover */
.sgs-cta-section .wp-block-button .wp-block-button__link.has-accent-background-color:hover,
.sgs-cta-section .wp-block-button .wp-block-button__link.has-accent-background-color:focus{
	background-color:var(--wp--preset--color--surface,#fff)!important;
	color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
.sgs-cta-section .wp-block-button .wp-block-button__link:not(.has-accent-background-color):hover,
.sgs-cta-section .wp-block-button .wp-block-button__link:not(.has-accent-background-color):focus{
	background-color:var(--wp--preset--color--accent,#d8ca50)!important;
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}
/* H7: Global button hover — inverse text colour for contrast.
 * Scoped to exclude gold-background buttons (has-accent-background-color)
 * where white text fails WCAG AA (2.73:1). Gold-bg buttons use dark text
 * via H6 above. Other unscoped buttons get white on hover. */
.wp-block-button__link:not(.has-accent-background-color):hover,
.wp-element-button:not(.has-accent-background-color):hover{
	color:var(--wp--preset--color--text-inverse,#FFF)!important;
}
";

		/*
		 * Brand logo tile CSS migrated to mega-menu-panels.css as .sgs-mega-logo-tile
		 * — now framework-level, not Indus-gated.
		 */

		/*
		 * Indus Foods — Desktop navigation link styles.
		 * Reference site: Source Sans Pro, ~19.8px, weight 600, colour #0A7EA8 (primary teal).
		 * Active page (Home) gets a teal background pill with white text.
		 * Only applies at ≥1025px (desktop) so mobile drawer is unaffected.
		 */
		$css .= "
/* ── Desktop nav links: teal colour ─────────────────────────────────────────
 * !important required to override wp-block-navigation's inline textColor
 * attribute (has-text-color with var(--wp--preset--color--text)) which sits
 * in a style attribute and therefore beats class-based specificity.
 * Font size and weight are set via Global Styles / style variation. */
@media(min-width:1025px){
	header .wp-block-navigation .wp-block-navigation-item__content,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > a,
	header .sgs-mega-menu__trigger,
	header .sgs-mega-menu__label{
		color:var(--wp--preset--color--primary,#0a7ea8)!important;
	}
	/* Active/current page link — teal background pill with white text.
	 * Targets both WP's current-menu-item class (added by Navigation block
	 * when it detects the current URL) and the home link specifically. */
	header .wp-block-navigation .wp-block-navigation-item.current-menu-item > .wp-block-navigation-item__content,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item.current-menu-item > a,
	header .wp-block-navigation .wp-block-page-list__item.current-menu-item > a,
	header .wp-block-navigation .wp-block-navigation-item__content[href='/'],
	header .wp-block-navigation a.wp-block-navigation-item__content[href='/']{
		background-color:var(--wp--preset--color--primary,#0a7ea8)!important;
		color:var(--wp--preset--color--surface,#fff)!important;
		border-radius:4px;
		padding:4px 16px!important;
	}
	/* Hover on non-active nav links */
	header .wp-block-navigation .wp-block-navigation-item__content:hover,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > a:hover{
		background-color:var(--wp--preset--color--accent,#d8ca50)!important;
		color:var(--wp--preset--color--text,#1e1e1e)!important;
		border-radius:4px;
	}
	/* Logo: allow up to 350px on desktop (reference site: 350px) */
	header .wp-block-site-logo img{
		max-width:350px!important;
		max-height:90px!important;
	}
	/* Nav bar height: increase to ~115px (reference). The main nav row
	 * uses var(--wp--preset--spacing--30) top/bottom padding (~93px total).
	 * Switch to spacing--40 to get ~115px. Targets the nav bar by class sibling. */
	header .wp-block-group.has-surface-background-color > .wp-block-group:not(.sgs-header-top-bar){
		padding-top:var(--wp--preset--spacing--40)!important;
		padding-bottom:var(--wp--preset--spacing--40)!important;
	}
}
";

		$css .= <<<'CSS'

/* ── Hero CTA buttons: border + box-shadow ───────────────────────────────────
 * block attributes can set bg/text colour but not border or box-shadow.
 * Primary CTA: 3px solid gold border + shadow. Secondary: 3px solid white + shadow. */
.sgs-hero__cta--accent{
	border:3px solid #d8ca50!important;
	box-shadow:3px 8px 12px rgba(0,0,0,0.15)!important;
	border-radius:10px!important;
}
.sgs-hero__cta:not(.sgs-hero__cta--accent){
	border:3px solid #ffffff!important;
	box-shadow:3px 8px 12px rgba(0,0,0,0.15)!important;
	border-radius:10px!important;
}
/* ── Footer headings: gold colour #E7D768 ────────────────────────────────────
 * core-blocks.css forces .has-surface-color headings in footer to white.
 * Override for Indus Foods variation: headings should be gold #E7D768.
 * Font size is set via Global Styles — no !important override needed. */
footer .wp-block-heading.has-surface-color.has-text-color,
footer .wp-block-heading.has-text-inverse-color.has-text-color,
.wp-block-template-part footer .wp-block-heading.has-surface-color.has-text-color,
.wp-block-template-part footer .wp-block-heading.has-text-inverse-color.has-text-color,
footer .sgs-footer-label,
.wp-block-template-part footer .sgs-footer-label{
	color:#e7d768!important;
	text-transform:none!important;
	letter-spacing:normal!important;
}
/* ── Footer social icons: reduce to 25px ────────────────────────────────────
 * core-blocks.css sets min-width/height:44px on all social icons for WCAG.
 * Footer social icons should be 25px to match reference site. */
.sgs-footer-socials .wp-block-social-link a{
	min-width:25px!important;min-height:25px!important;
	width:25px;height:25px;padding:0!important;
}
.sgs-footer-socials .wp-block-social-link svg{
	width:20px!important;height:20px!important;
}
";

		$css .= "
/* ── Issue 5: Hero CTA text-decoration fix ──────────────────────────────────
 * Ensure no underline appears on hero CTA links. text-decoration:none is in
 * hero/style.css but can be overridden by theme link resets. This !important
 * ensures it always wins. Also fixes 'Request Our Catalogue' underline. */
.sgs-hero__cta,
.sgs-hero__cta:hover,
.sgs-hero__cta:focus,
.sgs-hero__cta:visited{
	text-decoration:none!important;
}

/* ── Issue 6: Hero CTA hover effects — matched to reference site ──────────
 * Reference hover = full colour inversion + enlarged shadow.
 * Apply (black bg, gold text) - hover inverts to gold bg, black border, bigger shadow.
 * Catalogue (teal bg, white text) - hover inverts to white bg, teal border, bigger shadow.
 * Both CTAs use inline styles for bg/color, so !important is required. */

/* Apply CTA (black bg, gold text → gold bg, dark text) */
.sgs-hero__cta--accent:hover,
.sgs-hero__cta--accent:focus{
	background-color:#d8ca50!important;
	color:#000000!important;
	border-color:#000000!important;
	box-shadow:5px 20px 30px 9px rgba(0,0,0,0.15)!important;
}

/* Catalogue / secondary CTA (teal bg, white text → white bg, teal text) */
.sgs-hero__cta:not(.sgs-hero__cta--accent):hover,
.sgs-hero__cta:not(.sgs-hero__cta--accent):focus{
	background-color:#ffffff!important;
	color:#0a7ea8!important;
	border-color:#0a7ea8!important;
	box-shadow:5px 20px 30px 9px rgba(0,0,0,0.15)!important;
}

/* Smooth transition for the colour inversion */
.sgs-hero__cta{
	transition:background-color .25s ease,color .25s ease,border-color .25s ease,box-shadow .25s ease!important;
}

/* ── Issue 7: Hero split columns centering ───────────────────────────────────
 * The hero block now breaks out via negative margin (global layout fix above).
 * The content inside needs symmetric padding so both columns centre on the viewport.
 * justify-content:center on the flex row centres the two columns. */
.sgs-hero--split{
	justify-content:center;
	box-sizing:border-box;
}
.wp-block-sgs-hero.sgs-hero--split{
	padding-left:clamp(2rem,5vw,6rem);
	padding-right:clamp(2rem,5vw,6rem);
}
/* Even column distribution: each column gets equal max-width */
@media(min-width:1200px){
	.sgs-hero--split .sgs-hero__content,
	.sgs-hero--split .sgs-hero__media{
		flex:1 1 50%;
		max-width:600px;
	}
}

/* ── Top bar contact pills ────────────────────────────────────────────────
 * Keep compact padding. Font-size inherits from global medium (18px). */
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:']{
	padding:5px 14px;
	min-height:36px;
	gap:5px;
}

/* ── Issue 9: Top bar contact pills hover effect ─────────────────────────────
 * Existing rule has background opacity change. Add a subtle lift for premium feel. */
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover{
	transform:translateY(-1px);
	box-shadow:0 3px 8px rgba(0,0,0,0.15);
}

/* ── Issue 10: Social icons hover — match Instagram gradient effect ──────────
 * Apply a consistent premium hover to all social icons: scale + brightness lift.
 * The Instagram gradient hover is kept from core-blocks.css (H21).
 * LinkedIn gets LinkedIn blue, Facebook gets Facebook blue (H21 already does SVG fill).
 * Google gets its brand colour. All get a scale lift to match Instagram's feel.
 * This applies to BOTH the top bar AND footer social icons. */
.wp-block-social-links .wp-social-link{
	transition:transform .2s ease,box-shadow .2s ease!important;
}
.wp-block-social-links .wp-social-link:hover,
.wp-block-social-links .wp-social-link:focus{
	transform:scale(1.18)!important;
}
/* LinkedIn: blue gradient-like background on hover */
.wp-block-social-links .wp-social-link-linkedin:hover,
.wp-block-social-links .wp-social-link-linkedin:focus{
	background:linear-gradient(135deg,#0a66c2,#004182)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-linkedin:hover svg,
.wp-block-social-links .wp-social-link-linkedin:focus svg{
	fill:#fff!important;
}
/* Facebook: Facebook blue gradient on hover */
.wp-block-social-links .wp-social-link-facebook:hover,
.wp-block-social-links .wp-social-link-facebook:focus{
	background:linear-gradient(135deg,#1877f2,#0d5bb5)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-facebook:hover svg,
.wp-block-social-links .wp-social-link-facebook:focus svg{
	fill:#fff!important;
}
/* Google: red gradient on hover */
.wp-block-social-links .wp-social-link-google:hover,
.wp-block-social-links .wp-social-link-google:focus{
	background:linear-gradient(135deg,#ea4335,#c5221f)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-google:hover svg,
.wp-block-social-links .wp-social-link-google:focus svg{
	fill:#fff!important;
}

/* ── Hero image hover — match site-wide image hover scale effect ──────────
 * The hero media container needs overflow:hidden so the scale stays contained.
 * The image inside gets transform:scale(1.05) on hover. */
.sgs-hero__media{overflow:hidden!important;border-radius:var(--wp--custom--border-radius--large,16px)}
.sgs-hero__media img,.sgs-hero__split-image{transition:transform .35s ease}
.sgs-hero__media:hover img,.sgs-hero__media:hover .sgs-hero__split-image{transform:scale(1.05)}

/* ── Why Choose info-box hover — match reference: navy bg, white text, 10px radius, shadow ──
 * Reference uses Spectra info-box with hover bg #2C3E50, white text, 10px radius.
 * Our info-box block uses .sgs-info-box wrapper. */
.sgs-info-box{
	transition:background-color .25s ease,box-shadow .25s ease,transform .25s ease,border-radius .25s ease;
	border-radius:10px;
	padding:var(--wp--preset--spacing--30);
}
.sgs-info-box:hover{
	background-color:#2c3e50!important;
	box-shadow:0 8px 24px rgba(0,0,0,0.15);
	transform:translateY(-2px);
}
.sgs-info-box:hover .sgs-info-box__heading,
.sgs-info-box:hover .sgs-info-box__description{
	color:#ffffff!important;
}

/* ── Footer margin — zero gap between last content section and footer ─────
 * WordPress wp-site-blocks applies block-gap between template parts.
 * Override to 0 so footer sits flush against the CTA banner above. */
.wp-site-blocks>*+*{margin-block-start:0!important}
footer.wp-block-template-part{margin-block-start:0!important}

/* ── CTA + hero button text colour fix ────────────────────────────────────
 * WordPress global styles inject .has-text-color{color:var(--wp--preset--color--text)!important}
 * which overrides inline colour on buttons with custom hex values.
 * This targets buttons with inline style containing color: and forces the
 * inline value to win. Must use !important to beat the WP global !important. */
.wp-block-button__link.has-text-color[style*='color:#D8CA50']{color:#D8CA50!important}
.wp-block-button__link.has-text-color[style*='color:#FFFFFF']{color:#FFFFFF!important}
.wp-block-button__link.has-text-color[style*='color:#ffffff']{color:#ffffff!important}

/* ── Global button hover — scale + colour invert ──────────────────────────
 * All wp-block-button links get a consistent hover: slight scale lift,
 * inverted background/text colours. This is behavioural CSS — cannot be
 * set via theme.json :hover (only supports colour, not transform). */
.wp-block-button__link{
	transition:transform .2s ease,background-color .2s ease,color .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.wp-block-button__link:hover{
	transform:scale(1.04);
	box-shadow:0 4px 12px rgba(0,0,0,0.15);
}
/* Teal button → gold bg, dark text on hover */
.wp-block-button__link[style*='background-color:#0A7EA8']:hover,
.wp-block-button__link[style*='background-color: #0A7EA8']:hover,
.wp-block-button__link.has-primary-background-color:hover{
	background-color:#D8CA50!important;
	color:#2C3E50!important;
	border-color:#D8CA50!important;
}
/* Black button → gold bg, dark text on hover */
.wp-block-button__link[style*='background-color:#000000']:hover,
.wp-block-button__link[style*='background-color: #000']:hover{
	background-color:#D8CA50!important;
	color:#2C3E50!important;
	border-color:#2C3E50!important;
}
/* Gold/accent button → teal bg, white text on hover */
.wp-block-button__link.has-accent-background-color:hover,
.wp-block-button__link[style*='background-color:#D8CA50']:hover{
	background-color:#0A7EA8!important;
	color:#FFFFFF!important;
	border-color:#0A7EA8!important;
}

/* ── Top bar pill hover ───────────────────────────────────────────────────
 * Lift + shadow on hover for the compact pill buttons. */
.sgs-header-top-bar a[href^='tel:'],
.sgs-header-top-bar a[href^='mailto:'],
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:']{
	transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease;
}
.sgs-header-top-bar a[href^='tel:']:hover,
.sgs-header-top-bar a[href^='mailto:']:hover,
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover{
	transform:translateY(-2px);
	box-shadow:0 4px 12px rgba(0,0,0,0.2);
	background-color:rgba(255,255,255,0.9);
}

/* ── Testimonials right-column image — contain to carousel height ────────────
 * The image beside the testimonial carousel should match the carousel height,
 * not stretch the section. Targets groups with the Indus Foods primary teal
 * background inline style. object-fit:contain preserves aspect ratio. */
.wp-block-group[style*='#0A7EA8'] .wp-block-columns .wp-block-column:last-child .wp-block-image{margin:0}
.wp-block-group[style*='#0A7EA8'] .wp-block-columns .wp-block-column:last-child .wp-block-image img{width:100%;height:auto;max-height:400px;object-fit:contain}

CSS;

		wp_add_inline_style( 'sgs-utilities', $css );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );
