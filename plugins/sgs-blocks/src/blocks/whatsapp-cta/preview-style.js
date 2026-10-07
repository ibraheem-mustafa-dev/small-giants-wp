/**
 * SGS WhatsApp CTA — editor canvas preview-style builder.
 *
 * Extracted out of edit.js to keep that file under the 250-line JS budget
 * (Spec 32 / CLAUDE.md file-length rule). Pure functions only — no JSX, no
 * hooks — so this stays a plain data-in/data-out module.
 *
 * @package SGS\Blocks
 */
import { isCssGradient, borderRadiusLonghands, sgsBorderPreview } from '../../utils';

/**
 * Root-element preview style (contract §B3: the button element IS the block
 * root — no wrapper div). Colour/background mirror the scoped button rule;
 * border-radius mirrors the scoped box rule. Padding and margin are previewed in
 * edit.js with tierBoxLonghands(), set sides only, so this object carries no
 * padding or margin shorthand to collide with those longhand keys.
 *
 * CHECK A note: the caller (edit.js) passes an EXPLICIT object literal
 * naming every attribute this function reads, rather than the whole
 * `attributes` blob — a wholesale pass-through renders correctly but reads
 * as a desync to `check-editor-render-parity.js`'s CHECK A
 * (.claude/rules/block-editor-controls.md "Editor-canvas mirrors" trap 1:
 * "enumerate attributes explicitly at the call site").
 *
 * @param {Object}   previewAttrs         Explicit subset of block attributes this preview reads.
 * @param {Function} colourVar            Design-token → CSS var resolver.
 * @param {Function} resolveTextColourPreviewStyle Text-colour/gradient preview resolver.
 * @return {Object} Inline style object for the canvas preview.
 */
export function buildRootStyle( previewAttrs, colourVar, resolveTextColourPreviewStyle ) {
	const {
		borderRadius,
		labelColour,
		labelColourGradient,
		backgroundColour,
		backgroundColourGradient,
		variant,
		cardBorderColour,
		cardBorderWidth,
		cardBorderStyle,
		iconGap,
		minHeight,
	} = previewAttrs;

	// D636 — sibling gradient attribute preview (mirrors sgs/counter's
	// numberStyle/labelStyle wiring). Resting fill-gradient preview
	// (2026-09-06, FILL closeout) — mirrors render.php's background-image
	// sibling. Hover has no canvas preview: the frontend rule is
	// server-rendered scoped CSS (sgs_hover_state_rules()), not a custom
	// property the canvas inline style could replicate.
	const rootStyle = {
		...resolveTextColourPreviewStyle( labelColour, labelColourGradient, colourVar ),
		backgroundColor: colourVar( backgroundColour ) || undefined,
		gap: iconGap || undefined,
		minHeight: minHeight || undefined,
		...( isCssGradient( backgroundColourGradient )
			? { backgroundImage: backgroundColourGradient }
			: {} ),
	};

	Object.assign( rootStyle, borderRadiusLonghands( borderRadius ) );
	// Card variant's border preview — CSS already gives the card a default
	// 1px solid border; only overridden values need setting here.
	// cardBorderWidth is BASE ONLY (no desktop tier — Spec 35 §14, no
	// per-device border width), unlike borderRadius above.
	if ( 'card' === variant ) {
		Object.assign( rootStyle, sgsBorderPreview( { widthValues: cardBorderWidth, styleValue: cardBorderStyle, colourValue: cardBorderColour }, 'desktop', undefined, { defaultBorder: true } ) );
	}

	return rootStyle;
}

/**
 * Mirrors render.php's visibility classes (sgs-whatsapp-cta--hide-mobile /
 * --hide-desktop), driven by the SAME style.css @media rules — the editor
 * canvas is a real viewport (device-preview toggle resizes it), so these
 * classes hide/show the preview exactly as they do on the frontend.
 */
export function buildRootClassName( { variant, showOnMobile, showOnDesktop } ) {
	return [
		'sgs-whatsapp-cta',
		`sgs-whatsapp-cta--${ variant }`,
		'sgs-whatsapp-cta__btn',
		! showOnMobile ? 'sgs-whatsapp-cta--hide-mobile' : '',
		! showOnDesktop ? 'sgs-whatsapp-cta--hide-desktop' : '',
	].filter( Boolean ).join( ' ' );
}

/**
 * Editor twin of variant-render.php::sgs_whatsapp_cta_floating_hide_label_css():
 * below the configured width the floating pill collapses to the icon-only
 * circle. The canvas is an iframe whose width follows the device preview, so the
 * same media query applies there.
 *
 * @param {string}  rootSelector      Selector of the preview root (uid class).
 * @param {number}  hideBelow         floatingHideLabelBelow, 0 = never.
 * @param {boolean} hasVisibleLabel   True when the floating variant has a typed label.
 * @return {string} CSS text, or '' when nothing collapses.
 */
export function floatingHideLabelPreviewCss( rootSelector, hideBelow, hasVisibleLabel ) {
	const below = Math.max( 0, parseInt( hideBelow, 10 ) || 0 );
	if ( below <= 0 || ! hasVisibleLabel ) {
		return '';
	}
	return `@media(max-width:${ below }px){`
		+ `${ rootSelector } .sgs-whatsapp-cta__label--floating{display:none}`
		+ `${ rootSelector }.sgs-whatsapp-cta--floating.sgs-whatsapp-cta__btn{width:56px;height:56px;border-radius:50%;padding:0;justify-content:center}`
		+ '}';
}
