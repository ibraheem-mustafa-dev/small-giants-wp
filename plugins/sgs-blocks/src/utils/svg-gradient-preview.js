/**
 * Editor-canvas mirror of the PHP SVG stroke/fill-gradient primitive
 * (`sgs_svg_stroke_gradient()`, `includes/helpers-svg-gradient.php`).
 *
 * SGS inline SVG glyphs (Lucide icon strokes, star-rating fills) paint via a
 * presentation attribute (`stroke="currentColor"` / `fill="..."`) — CSS
 * `color`/`currentColor` cannot hold a gradient, so a *ColourGradient sibling
 * attribute on one of these blocks is NOT the same "paint a background/text
 * gradient" technique every other SGS gradient control uses
 * (`textPaintPreview`/`backgroundPaintPreview`/`borderPaintPreview` in
 * `background-preview.js`). The frontend instead converts a validated
 * `linear-gradient()`/`radial-gradient()` string into a real SVG
 * `<linearGradient>`/`<radialGradient>` def and points the glyph at it via
 * `stroke:url(#id)` / `fill:url(#id)`.
 *
 * This module is the editor-canvas twin of that same algorithm (angle→SVG
 * line-endpoint conversion, colour-stop parsing) so a client setting an icon
 * or star colour to a gradient sees it on the canvas instead of a flat/blank
 * preview — CHECK A (`check-editor-render-parity.js`) flags exactly this gap
 * for `sgs/social-icons` `iconGlyphColourGradient` and `sgs/star-rating`
 * `starColourGradient`/`emptyColourGradient`.
 *
 * ⛔ Keep the parsing rules in step with `sgs_svg_stroke_gradient()`. Scope
 * deliberately matches the picker's own output — linear/radial only, no
 * conic/repeating (`SgsGradientPicker`'s `GRADIENT_OPTIONS` never emits
 * either), mirroring the PHP helper's identical restriction.
 */

/**
 * Parse a CSS gradient string into SVG gradient-def data.
 *
 * @param {string} gradientCss Raw `linear-gradient(...)`/`radial-gradient(...)` string.
 * @return {?{type:('linear'|'radial'), x1?:number, y1?:number, x2?:number, y2?:number, cx?:number, cy?:number, r?:number, stops:Array<{offset:number,colour:string}>}}
 *         `null` when the value is empty, not a gradient, or an unsupported
 *         gradient type (repeating-* / conic-*) — mirrors the PHP helper's
 *         fail-soft `''` return in the same cases.
 */
export function parseSvgGradient( gradientCss ) {
	if ( ! gradientCss || 'string' !== typeof gradientCss ) {
		return null;
	}
	const match = gradientCss.trim().match( /^(linear|radial)-gradient\((.+)\)$/i );
	if ( ! match ) {
		return null;
	}
	const type = match[ 1 ].toLowerCase();
	const body = match[ 2 ];

	// Split the gradient's top-level comma list (respecting nested parens —
	// var()/rgb()/rgba()/hsl()/hsla() all contain their own commas). Mirrors
	// sgs_svg_stroke_gradient()'s identical depth-counting split.
	const parts = [];
	let depth = 0;
	let buf = '';
	for ( let i = 0; i < body.length; i++ ) {
		const ch = body[ i ];
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( ',' === ch && 0 === depth ) {
			parts.push( buf.trim() );
			buf = '';
			continue;
		}
		buf += ch;
	}
	if ( buf.trim() ) {
		parts.push( buf.trim() );
	}
	if ( ! parts.length ) {
		return null;
	}

	// A linear gradient's first token is its angle ("<n>deg"); consume it.
	// Radial gradients from this picker carry no shape/position token.
	let angleDeg = 180; // CSS default direction ("to bottom") when no angle is present.
	if ( 'linear' === type ) {
		const angleMatch = parts[ 0 ].match( /^(-?[\d.]+)deg$/i );
		if ( angleMatch ) {
			angleDeg = parseFloat( angleMatch[ 1 ] );
			parts.shift();
		}
	}
	if ( ! parts.length ) {
		return null;
	}

	const stopCount = parts.length;
	const stops = [];
	parts.forEach( ( part, index ) => {
		const stopMatch = part.match( /^(.+?)\s+(-?[\d.]+)%$/ );
		let colour;
		let offset;
		if ( stopMatch ) {
			colour = stopMatch[ 1 ].trim();
			offset = parseFloat( stopMatch[ 2 ] );
		} else {
			// No explicit percentage on this stop — evenly space, mirroring the
			// PHP helper's identical fallback.
			colour = part.trim();
			offset = stopCount > 1 ? ( 100 / ( stopCount - 1 ) ) * index : 0;
		}
		if ( ! colour ) {
			return;
		}
		stops.push( { offset: Math.max( 0, Math.min( 100, offset ) ), colour } );
	} );
	if ( ! stops.length ) {
		return null;
	}

	if ( 'radial' === type ) {
		return { type, cx: 50, cy: 50, r: 50, stops };
	}

	// CSS gradient-angle → SVG objectBoundingBox line endpoints (0deg = "to
	// top", clockwise) — same conversion as sgs_svg_stroke_gradient().
	const rad = ( angleDeg * Math.PI ) / 180;
	const half = 0.5 * ( Math.abs( Math.sin( rad ) ) + Math.abs( Math.cos( rad ) ) );
	const dx = Math.sin( rad ) * half;
	const dy = -Math.cos( rad ) * half;
	return {
		type,
		x1: 0.5 - dx,
		y1: 0.5 - dy,
		x2: 0.5 + dx,
		y2: 0.5 + dy,
		stops,
	};
}

/**
 * Render the `<linearGradient>`/`<radialGradient>` def for a parsed gradient,
 * to be placed inside the glyph SVG's own `<defs>`.
 *
 * @param {Object} props
 * @param {string} props.id       Unique DOM id for this gradient (scope per
 *                                  block instance + state, e.g.
 *                                  `${clientId}-icon-grad`).
 * @param {Object} props.gradient Parsed gradient — the `parseSvgGradient()` return value.
 * @return {?JSX.Element}
 */
export function SvgGradientDefs( { id, gradient } ) {
	if ( ! gradient ) {
		return null;
	}
	const stopEls = gradient.stops.map( ( stop, i ) => (
		<stop key={ i } offset={ `${ stop.offset }%` } stopColor={ stop.colour } />
	) );
	if ( 'radial' === gradient.type ) {
		return (
			<radialGradient id={ id } cx={ `${ gradient.cx }%` } cy={ `${ gradient.cy }%` } r={ `${ gradient.r }%` }>
				{ stopEls }
			</radialGradient>
		);
	}
	return (
		<linearGradient id={ id } x1={ gradient.x1 } y1={ gradient.y1 } x2={ gradient.x2 } y2={ gradient.y2 }>
			{ stopEls }
		</linearGradient>
	);
}

/**
 * Single-colour-token allow-list (hex / var() / rgb() / rgba() / hsl() /
 * hsla() / a bare keyword) — mirrors `sgs_svg_stroke_gradient()`'s identical
 * per-stop allow-list. `parseSvgGradient()` above only checks a stop's colour
 * is non-empty (fine for the JSX-rendered `SvgGradientDefs` consumer, whose
 * values land in React-controlled `stopColor` props); the STRING-serialising
 * consumer below builds raw markup for `dangerouslySetInnerHTML`, so it
 * re-applies the same character-class defence-in-depth the PHP helper uses
 * before that value reaches an attribute string.
 *
 * @param {string} colour Raw colour token from a parsed gradient stop.
 * @return {boolean} Whether the token is safe to serialise into an attribute.
 */
function isSafeGradientStopColour( colour ) {
	return /^[A-Za-z0-9#(),.%\s_-]+$/.test( colour );
}

/**
 * Render a parsed gradient (`parseSvgGradient()`) to raw `<defs>…</defs>`
 * markup plus the paint declaration — the STRING equivalent of
 * `SvgGradientDefs`, for callers that build raw SVG markup (e.g.
 * `IconPreview`'s `dangerouslySetInnerHTML` path) rather than JSX.
 *
 * @param {string} gradientCss Gradient attribute value.
 * @param {string} id          Unique DOM id for this gradient.
 * @param {string} [target]    SVG paint property — 'stroke' (default) or 'fill'.
 * @return {{defs: string, css: string}} `defs`/`css` are both '' when the
 *   gradient is empty/invalid/unsupported or `id` sanitises to ''.
 */
export function svgStrokeGradientPreview( gradientCss, id, target = 'stroke' ) {
	const resolvedTarget = 'fill' === target ? 'fill' : 'stroke';
	const empty = { defs: '', css: '' };

	const cleanId = String( id || '' ).replace( /[^a-zA-Z0-9-]/g, '' );
	if ( '' === cleanId ) {
		return empty;
	}

	const gradient = parseSvgGradient( gradientCss );
	if ( ! gradient ) {
		return empty;
	}

	const stops = gradient.stops.filter( ( stop ) => isSafeGradientStopColour( stop.colour ) );
	if ( ! stops.length ) {
		return empty;
	}
	const stopMarkup = stops
		.map( ( stop ) => `<stop offset="${ stop.offset }%" stop-color="${ stop.colour }"/>` )
		.join( '' );

	let defs;
	if ( 'radial' === gradient.type ) {
		defs = `<defs><radialGradient id="${ cleanId }" cx="${ gradient.cx }%" cy="${ gradient.cy }%" r="${ gradient.r }%">${ stopMarkup }</radialGradient></defs>`;
	} else {
		const round4 = ( n ) => Math.round( n * 10000 ) / 10000;
		defs = `<defs><linearGradient id="${ cleanId }" x1="${ round4( gradient.x1 ) }" y1="${ round4( gradient.y1 ) }" x2="${ round4( gradient.x2 ) }" y2="${ round4( gradient.y2 ) }">${ stopMarkup }</linearGradient></defs>`;
	}

	return { defs, css: `${ resolvedTarget }:url(#${ cleanId })` };
}

/**
 * Inject a stroke/fill gradient into a raw `<svg>…</svg>` markup string — the
 * `<defs>` block as the first child of the opening tag, and the
 * `{target}:url(#id)` declaration as an inline `style` on the `<svg>`
 * element itself (an inline style beats the icon's own
 * `stroke="currentColor"`/`fill="currentColor"` presentation attribute with
 * no `!important` needed — the same cascade reasoning the PHP scoped-CSS
 * declaration relies on).
 *
 * @param {string} svgMarkup   Full `<svg>…</svg>` markup.
 * @param {string} gradientCss Gradient attribute value (see `svgStrokeGradientPreview()`).
 * @param {string} id          Unique DOM id for this gradient instance.
 * @param {string} [target]    'stroke' (default) or 'fill'.
 * @return {string} The markup with the gradient defs + style injected, or the
 *   original markup unchanged when the gradient is empty/invalid/unsupported.
 */
export function withSvgStrokeGradient( svgMarkup, gradientCss, id, target = 'stroke' ) {
	if ( ! svgMarkup ) {
		return svgMarkup;
	}
	const { defs, css } = svgStrokeGradientPreview( gradientCss, id, target );
	if ( '' === defs ) {
		return svgMarkup;
	}

	let injected = false;
	const withDefs = svgMarkup.replace( /<svg([^>]*)>/, ( match, attrs ) => {
		injected = true;
		let newAttrs = attrs;
		if ( /\sstyle="/.test( newAttrs ) ) {
			newAttrs = newAttrs.replace( /style="([^"]*)"/, ( m2, existing ) => `style="${ existing };${ css }"` );
		} else {
			newAttrs += ` style="${ css }"`;
		}
		return `<svg${ newAttrs }>${ defs }`;
	} );

	return injected ? withDefs : svgMarkup;
}
