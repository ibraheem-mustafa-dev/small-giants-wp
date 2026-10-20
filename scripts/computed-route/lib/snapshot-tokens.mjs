// Theme-token writers' pure mappers (Spec 48 FR-48-81, Spec 32 FR-32-19): a draft's keyboard-focus look and a button's
// pressed look become the theme snapshot keys that carry them, because neither lives in a block setting
// (lib/fill-state.mjs names both as gaps). Pure functions of the declared values; reading the draft and writing the
// snapshot are the caller's job.
//
// Focus: theme/sgs-theme/assets/css/focus.css reads settings.custom.focus.{width, ring, offset, near, far, bloom}. The
// draft's look wins over the 3:1 contrast rule (owner decision 2026-10-20), so a mapped look carries source "draft"
// (plugins/sgs-blocks/scripts/snapshot_focus_tokens.py records those values instead of failing them).
// Press: includes/helpers-button-press.php paints only buttonPresets.{variant}.active-transform and .active-shadow.
// Link states: WordPress theme.json styles.elements.link takes the pseudo keys :link, :any-link, :visited, :hover,
// :focus, :focus-visible and :active (WP_Theme_JSON::VALID_ELEMENT_PSEUDO_SELECTORS); :link, :any-link and :visited are
// read from the draft's code (the browser never exposes :visited to a test, lib/fill-state-code.mjs) and written here.

const LENGTH = /^-?(?:\d*\.)?\d+(?:px|rem|em)$/;
const LENGTH_ANY = /-?(?:\d*\.)?\d+(?:px|rem|em)?(?![\w.])/g;
const COLOUR_FN = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/i;
const NOT_A_VALUE = /var\(|currentcolor|inherit|initial|unset|revert/i;
// The variants whose own press tokens a button reads, plus the site-wide default (helpers-button-press.php).
const PRESS_VARIANTS = [ 'default', 'primary', 'secondary', 'outline' ];
const PRESS_COLOUR_PROPS = [ 'background-color', 'color', 'border-color', 'border-top-color' ];

const toHex = ( n ) => Math.round( Math.min( 255, Math.max( 0, Number( n ) ) ) ).toString( 16 ).padStart( 2, '0' );

// A usable colour literal, or null: the browser's rendered rgb()/rgba() with alpha 1 becomes a hex; a translucent or
// other colour function is kept as written; var(), currentcolor and the CSS-wide keywords are not colours.
function colourOf( value ) {
	const text = 'string' === typeof value ? value.trim() : '';
	if ( ! text || NOT_A_VALUE.test( text ) ) {
		return null;
	}
	const rgb = text.match( /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i );
	if ( rgb ) {
		const alpha = undefined === rgb[ 4 ] ? 1 : rgb[ 4 ].endsWith( '%' ) ? parseFloat( rgb[ 4 ] ) / 100 : Number( rgb[ 4 ] );
		return 1 === alpha ? `#${ toHex( rgb[ 1 ] ) }${ toHex( rgb[ 2 ] ) }${ toHex( rgb[ 3 ] ) }` : text;
	}
	return /^#[0-9a-f]{3,8}$/i.test( text ) || COLOUR_FN.test( text ) || /^[a-z]+$/i.test( text ) ? text : null;
}

// A length token as written ("0" becomes "0px"), or null; a negative one only when `signed`.
function lengthOf( value, { signed = false } = {} ) {
	const text = 'string' === typeof value ? value.trim() : '';
	const norm = '0' === text ? '0px' : text;
	return LENGTH.test( norm ) && ( signed || ! norm.startsWith( '-' ) ) ? norm : null;
}

// True when a colour paints nothing.
const invisible = ( colour ) => /^transparent$/i.test( colour ) || /^rgba\(.*[,/]\s*0(?:\.0+)?\s*\)$/i.test( colour );

// A box-shadow value split into layers at its top-level commas: [{ colour, inset, blur }].
function shadowLayers( value ) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for ( let i = 0; i <= value.length; i++ ) {
		const c = value[ i ];
		depth += '(' === c ? 1 : ')' === c ? -1 : 0;
		if ( i === value.length || ( ',' === c && 0 === depth ) ) {
			parts.push( value.slice( start, i ).trim() );
			start = i + 1;
		}
	}
	return parts.filter( Boolean ).map( ( layer ) => {
		const inset = /\binset\b/i.test( layer );
		const colourText = layer.match( COLOUR_FN )?.[ 0 ] ?? layer.match( /#[0-9a-f]{3,8}\b/i )?.[ 0 ] ?? layer.match( /\b(?!inset\b)[a-z]+\b/i )?.[ 0 ];
		const rest = layer.replace( COLOUR_FN, ' ' ).replace( /#[0-9a-f]{3,8}\b/i, ' ' ).replace( /\binset\b/gi, ' ' );
		const lengths = ( rest.match( LENGTH_ANY ) || [] ).map( parseFloat );
		return { colour: colourOf( colourText ), inset, blur: lengths[ 2 ] || 0 };
	} );
}

// A draft's keyboard-focus look → { focus, gaps }. `look` is the declared values of the focused element's look
// ({ 'outline-width', 'outline-color', 'outline-style', 'outline-offset', 'box-shadow' }; a readStates look's
// `declared` is passed as is, and a whole look with a `declared` map is accepted). `focus` is null when the look
// declares none of them (the site keeps the derived ring), else the settings.custom.focus keys it sets, with
// source "draft": outline-width → width, outline-color → ring, outline-offset → offset (an outline with no declared
// offset is 0px, the browser's initial value), a box-shadow glow (a non-inset layer with blur) → near (first glow
// layer) and far (last) with bloom "1", and no glow → bloom "0". ringOnDark is not mapped: the draft look is read on
// one ground. Anything focus.css cannot paint is a named gap, never dropped: a dashed or dotted outline, a hard
// (zero-blur) shadow ring or an inset shadow, an outline switched off, a colour that is not a literal.
export function focusTokens( look ) {
	const d = look?.declared ?? look ?? {};
	const keys = [ 'outline-width', 'outline-color', 'outline-style', 'outline-offset', 'box-shadow' ];
	if ( ! keys.some( ( k ) => 'string' === typeof d[ k ] && d[ k ].trim() ) ) {
		return { focus: null, gaps: [] };
	}
	const focus = {};
	const gaps = [];
	const style = ( d[ 'outline-style' ] || '' ).trim().toLowerCase();
	const outlineOff = [ 'none', 'hidden' ].includes( style );
	if ( outlineOff ) {
		gaps.push( 'outline-style:none: the draft draws no outline; focus.css keeps its ring because the glow sizes scale with the ring width' );
	} else if ( style && 'solid' !== style ) {
		gaps.push( `outline-style:${ style }: focus.css paints a solid outline` );
	}
	if ( d[ 'outline-width' ] && ! outlineOff ) {
		const width = lengthOf( d[ 'outline-width' ] );
		if ( width && '0px' !== width ) {
			focus.width = width;
		} else {
			gaps.push( `outline-width:${ d[ 'outline-width' ] }: not a positive length` );
		}
	}
	if ( d[ 'outline-color' ] && ! outlineOff ) {
		const ring = colourOf( d[ 'outline-color' ] );
		if ( ring ) {
			focus.ring = ring;
		} else {
			gaps.push( `outline-color:${ d[ 'outline-color' ] }: not a colour literal` );
		}
	}
	const drawsOutline = ! outlineOff && ( d[ 'outline-width' ] || d[ 'outline-color' ] || style || d[ 'outline-offset' ] );
	if ( drawsOutline ) {
		const offset = d[ 'outline-offset' ] ? lengthOf( d[ 'outline-offset' ], { signed: true } ) : '0px';
		if ( offset ) {
			focus.offset = offset;
		} else {
			gaps.push( `outline-offset:${ d[ 'outline-offset' ] }: not a length` );
		}
	}
	const shadow = ( d[ 'box-shadow' ] || '' ).trim();
	const layers = /^none$/i.test( shadow ) ? [] : shadowLayers( shadow );
	const glows = layers.filter( ( l ) => ! l.inset && l.blur > 0 && l.colour && ! invisible( l.colour ) );
	if ( glows.length ) {
		focus.near = glows[ 0 ].colour;
		focus.far = glows[ glows.length - 1 ].colour;
		focus.bloom = '1';
	} else {
		focus.bloom = '0';
	}
	if ( layers.some( ( l ) => l.inset || 0 === l.blur ) ) {
		gaps.push( 'box-shadow: a hard (zero-blur) or inset shadow layer has no token; focus.css paints its own hairline' );
	}
	return { focus: { ...focus, source: 'draft' }, gaps };
}

// A button's draft :active look → { variant, tokens, gaps }. `look` is the declared values of the pressed button
// ({ transform, 'box-shadow', and any colour }). `variant` is a buttonPresets slug (primary, secondary, outline or
// default). tokens holds only what includes/helpers-button-press.php paints: active-transform (a transform other than
// none) and active-shadow (a box-shadow, "none" included). A pressed colour has no token and is a named gap, as is a
// link-style button (it never presses) and a variant the press does not read.
export function pressTokens( look, variant ) {
	const d = look?.declared ?? look ?? {};
	if ( 'link' === variant ) {
		return { variant, tokens: {}, gaps: [ 'link: the link style never presses' ] };
	}
	if ( ! PRESS_VARIANTS.includes( variant ) ) {
		return { variant, tokens: {}, gaps: [ `variant:${ variant }: not a preset slug the press reads (${ PRESS_VARIANTS.join( ', ' ) })` ] };
	}
	const tokens = {};
	const gaps = [];
	const transform = 'string' === typeof d.transform ? d.transform.trim() : '';
	if ( transform && ! /^none$/i.test( transform ) && ! /^matrix\(\s*1,\s*0,\s*0,\s*1,\s*0,\s*0\s*\)$/.test( transform ) ) {
		tokens[ 'active-transform' ] = transform;
	}
	const shadow = 'string' === typeof d[ 'box-shadow' ] ? d[ 'box-shadow' ].trim() : '';
	if ( shadow ) {
		tokens[ 'active-shadow' ] = shadow;
	}
	for ( const prop of PRESS_COLOUR_PROPS ) {
		if ( d[ prop ] ) {
			gaps.push( `${ prop }: sgs/button paints no pressed colour (the press reads active-transform and active-shadow only)` );
		}
	}
	return { variant, tokens, gaps };
}

const LINK_STATES = { link: ':link', 'any-link': ':any-link', visited: ':visited' };
const LINK_KEY = ( state ) => `styles.elements.link['${ state }']`;
const TEXT_PROPS = { 'font-weight': 'fontWeight', 'font-style': 'fontStyle', 'letter-spacing': 'letterSpacing', 'text-transform': 'textTransform' };
const DECORATION_DEFAULTS = { 'text-decoration-style': 'solid', 'text-decoration-color': 'currentcolor', 'text-decoration-thickness': 'auto' };

// Whether a draft element is a plain content link the theme styles: an <a> with an href (a link without one is never
// :link or :visited), not styled as a button (role="button", or a class naming btn or button), and not owned by a
// block's link setting (`ownedBySetting`, from Fill's resolver: a block attribute already holds that element's link
// look). Returns { themed, why }. target: { tag, href, role, className, ownedBySetting }.
export function isThemeLink( target ) {
	const t = target || {};
	if ( 'a' !== String( t.tag || '' ).toLowerCase() ) {
		return { themed: false, why: `<${ t.tag || '?' }> is not a link` };
	}
	if ( ! t.href ) {
		return { themed: false, why: 'a link with no href is neither :link nor :visited' };
	}
	if ( 'button' === t.role || /(?:^|[\s_-])(?:btn|button)(?:$|[\s_-])/i.test( t.className || '' ) ) {
		return { themed: false, why: 'a button-styled link takes the button element and presets, not the link element' };
	}
	if ( t.ownedBySetting ) {
		return { themed: false, why: 'a block setting owns this link look' };
	}
	return { themed: true, why: null };
}

// A draft look on a plain content link for :link, :any-link or :visited → { key, state, value, gaps }. `look` is a
// readStates look ({ states, declared }) or its declared map; `state` is 'visited', 'link' or 'any-link' (a leading
// colon is allowed; a look's own state is used when `state` is omitted). `key` is the snapshot path
// styles.elements.link['<:state>'] and `value` the theme.json element it sets: color → color.text, background-color →
// color.background, the text-decoration longhands (or the shorthand) → typography.textDecoration, and font-weight,
// font-style, letter-spacing and text-transform → typography. Another property has no link-element key and is a named
// gap, as is a state theme.json does not hold on a link (:hover, :focus and :active are the element's other keys, set
// by their own writers) and an element isThemeLink refuses. value is null when nothing maps.
export function linkStateTokens( look, state, target ) {
	const d = look?.declared ?? look ?? {};
	const name = String( state ?? look?.states?.[ 0 ] ?? '' ).replace( /^:/, '' );
	const key = LINK_STATES[ name ];
	if ( ! key ) {
		return { key: null, state: name, value: null, gaps: [ `state:${ name || '?' }: only :link, :any-link and :visited are written here` ] };
	}
	const fit = isThemeLink( target );
	if ( ! fit.themed ) {
		return { key: LINK_KEY( key ), state: key, value: null, gaps: [ `element: ${ fit.why }` ] };
	}
	const value = {};
	const gaps = [];
	const set = ( group, prop, v ) => {
		( value[ group ] ??= {} )[ prop ] = v;
	};
	for ( const [ prop, raw ] of Object.entries( d ) ) {
		if ( 'color' === prop || 'background-color' === prop ) {
			const colour = colourOf( raw );
			if ( colour ) {
				set( 'color', 'color' === prop ? 'text' : 'background', colour );
			} else {
				gaps.push( `${ prop }:${ raw }: not a colour literal` );
			}
		} else if ( TEXT_PROPS[ prop ] ) {
			set( 'typography', TEXT_PROPS[ prop ], String( raw ).trim() );
		} else if ( ! prop.startsWith( 'text-decoration' ) ) {
			gaps.push( `${ prop }: theme.json styles.elements.link has no ${ key } key for it` );
		}
	}
	const line = d[ 'text-decoration-line' ] ?? d[ 'text-decoration' ];
	if ( 'string' === typeof line && line.trim() ) {
		const extras = Object.keys( DECORATION_DEFAULTS ).filter( ( p ) => d[ p ] && String( d[ p ] ).trim().toLowerCase() !== DECORATION_DEFAULTS[ p ] ).map( ( p ) => String( d[ p ] ).trim() );
		set( 'typography', 'textDecoration', [ line.trim(), ...extras ].join( ' ' ) );
	}
	return { key: LINK_KEY( key ), state: key, value: Object.keys( value ).length ? value : null, gaps };
}
