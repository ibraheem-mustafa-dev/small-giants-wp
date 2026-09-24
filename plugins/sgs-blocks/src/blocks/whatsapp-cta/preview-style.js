/**
 * SGS WhatsApp CTA — editor canvas preview-style builder.
 *
 * Extracted out of edit.js to keep that file under the 250-line JS budget
 * (Spec 32 / CLAUDE.md file-length rule). Pure functions only — no JSX, no
 * hooks — so this stays a plain data-in/data-out module.
 *
 * @package SGS\Blocks
 */

/**
 * Box-object interface contract §1/§5: build an editor-preview shorthand from
 * a box object — mirrors render.php's box-shorthand builders so the canvas
 * preview matches the frontend (contract §5). Only BASE tier previews here —
 * tablet/mobile tiers live in render.php's <style> media queries, which the
 * editor canvas never executes for a dynamic block (matches sgs/heading).
 */
export function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * Root-element preview style (contract §B3: the button element IS the block
 * root — no wrapper div). Colour/background mirror the scoped button rule;
 * padding/margin/border-radius mirror the scoped box rule.
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
		padding,
		margin,
		borderRadius,
		labelColour,
		labelColourGradient,
		backgroundColour,
		backgroundColourGradient,
		variant,
		cardBorderColour,
		cardBorderWidth,
		cardBorderStyle,
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
		...( backgroundColourGradient &&
		/^(repeating-)?(linear|radial|conic)-gradient\(/i.test( backgroundColourGradient )
			? { backgroundImage: backgroundColourGradient }
			: {} ),
	};

	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		rootStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		rootStyle.margin = marginPreview;
	}
	const radiusPreview = boxShorthand( borderRadius?.desktop, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		rootStyle.borderRadius = radiusPreview;
	}
	// Card variant's border preview — CSS already gives the card a default
	// 1px solid border; only overridden values need setting here.
	// cardBorderWidth is BASE ONLY (no desktop tier — Spec 35 §14, no
	// per-device border width), unlike padding/margin/borderRadius above.
	if ( 'card' === variant ) {
		if ( cardBorderColour ) {
			rootStyle.borderColor = colourVar( cardBorderColour ) || undefined;
		}
		const borderWidthPreview = boxShorthand( cardBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
		if ( borderWidthPreview ) {
			rootStyle.borderWidth = borderWidthPreview;
		}
		if ( cardBorderStyle ) {
			rootStyle.borderStyle = cardBorderStyle;
		}
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
