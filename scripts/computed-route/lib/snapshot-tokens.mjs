// Theme-token writers' pure mappers (Spec 48 FR-48-81, Spec 32 FR-32-19): a draft's keyboard-focus look and a button's
// pressed look become the theme snapshot keys that carry them, because neither lives in a block setting
// (lib/fill-state.mjs names both as gaps). Pure functions of the declared values; reading the draft and writing the
// snapshot are the caller's job.
//
// Focus: theme/sgs-theme/assets/css/focus.css reads settings.custom.focus.{width, ring, offset, near, far, bloom}. The
// draft's look wins over the 3:1 contrast rule (owner decision 2026-10-20), so a mapped look carries source "draft"
// (plugins/sgs-blocks/scripts/snapshot_focus_tokens.py records those values instead of failing them).
// Press: includes/helpers-button-press.php paints only buttonPresets.{variant}.active-transform and .active-shadow.

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
