// The declared value a confirmed row writes (Spec 48 FR-48-36, "What is written"): where the draft's code and its render
// agree, the setting is written with what the code states (a 2rem font size, a 0.05em letter spacing, a unitless line
// height), in the form the setting holds; a declared form the setting cannot hold keeps the rendered value.
// resolve.mjs::resolve calls these with input.declaredForm ({ width: value }, only the widths where D–R agrees,
// lib/fill-resolve-element.mjs::fillElement).

// The calibrated forms that prove a setting passes a CSS string through to its paint (lib/calibrate-markers.mjs::FLUID_MARKERS).
const STRING_FORMS = [ 'clamp', 'vw', 'min', 'max' ];
// A declared length in a unit a unit setting takes beside its number (src/components/TypographyControls.js: em, rem or
// px, and '' for a unitless line height; 'unitless' is the same as '', includes/helpers-typography.php::sgs_typography_css_rule).
const LENGTH = /^(-?\d*\.?\d+)(px|em|rem)?$/;

const clean = ( v ) => String( v ?? '' ).trim().replace( /\s*!important$/, '' );
const unitless = ( u ) => '' === u || 'unitless' === u;

// The declared value at each tier ({ tier: value }) for the tiers being written.
export function declaredTiers( declaredForm, tiers, tierOf ) {
	const out = {};
	for ( const [ w, v ] of Object.entries( declaredForm || {} ) ) {
		const t = tierOf[ w ];
		if ( t && t in tiers && '' !== clean( v ) ) {
			out[ t ] = clean( v );
		}
	}
	return out;
}

// A declared length's unit: px, em or rem; '' for a bare number on a line height; null for anything else (a bare number
// on another property, 0 without a unit, a keyword).
function unitOf( prop, declared ) {
	const m = LENGTH.exec( clean( declared ) );
	if ( ! m ) {
		return null;
	}
	return m[ 2 ] ?? ( 'line-height' === prop ? '' : null );
}

// Whether a declared value is a relative length (em, rem, or a unitless line height): the forms that differ from the
// rendered px the browser computes from them.
const isRelative = ( prop, declared ) => [ 'em', 'rem', '' ].includes( unitOf( prop, declared ) );

const sameUnit = ( a, b ) => a === b || ( unitless( a ) && unitless( b ) );

// The unit a unit setting switches to so it holds the declared numbers, or null to keep its unit: every tier written
// declares one unit, that unit differs from the setting's, and no tier the write leaves alone holds a value the switch
// would reinterpret. A per-tier unit setting (an object) and a flat Tablet/Mobile sibling setting never switch.
// o: { prop, decl ({ tier: declared }), tiers ({ tier: rendered }), unit (the setting's unit now), attr, current, flat,
// defaultValue (the attribute's schema default: a tier it fills, such as sgs/label fontSize { desktop: 12 }, is held too) }.
export function declaredUnit( { prop, decl, tiers, unit, attr, current = {}, flat = false, defaultValue = null } ) {
	if ( flat || 'string' !== typeof unit ) {
		return null;
	}
	const written = Object.keys( tiers );
	const units = written.map( ( t ) => ( t in decl ? unitOf( prop, decl[ t ] ) : null ) );
	if ( ! written.length || units.some( ( u ) => null === u ) || 1 !== new Set( units ).size || sameUnit( units[ 0 ], unit ) ) {
		return null;
	}
	const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
	const held = isObj( current[ attr ] ) || isObj( defaultValue ) ? { ...( isObj( defaultValue ) ? defaultValue : {} ), ...( isObj( current[ attr ] ) ? current[ attr ] : {} ) } : null;
	if ( held && Object.entries( held ).some( ( [ t, v ] ) => ! written.includes( t ) && null != v && '' !== v ) ) {
		return null;
	}
	return units[ 0 ];
}

// A declared font weight keyword as the number the weight vocabulary holds (bold is 700, normal 400); any other value as
// it is.
export const resolveWeightKeyword = ( prop, declared ) => ( 'font-weight' === prop ? { bold: '700', normal: '400' }[ String( declared ).trim().toLowerCase() ] ?? declared : declared );

// A declared length in the setting's own form, or null where this setting cannot hold it as declared.
// o: { prop, declared, def (the attribute's schema), unit (the unit the setting holds after any switch; undefined when
// the setting has no unit partner), forms (calibration's forms for the setting), box (a box setting) }.
export function declaredLength( { prop, declared, def, unit, forms = [], box = false } ) {
	const d = clean( declared );
	const m = LENGTH.exec( d );
	if ( ! m ) {
		return null;
	}
	const types = [].concat( def?.type || [] );
	if ( undefined !== unit ) {
		const u = unitOf( prop, d );
		if ( null === u || ! sameUnit( u, unit ) ) {
			return null;
		}
		const n = Number( m[ 1 ] );
		return { value: types.includes( 'string' ) && ! types.includes( 'number' ) ? String( n ) : n };
	}
	// A setting with no unit partner holds a relative length only where calibration proved it passes a CSS string through.
	// The number is written in its plain form (0.5rem, never .5rem): a font-size tier takes a raw value only as
	// <digits><unit> and reads anything else as a preset slug (includes/helpers-tokens.php::sgs_font_size_value).
	if ( ! isRelative( prop, d ) || box || ! forms.some( ( f ) => STRING_FORMS.includes( f ) ) ) {
		return null;
	}
	return { value: `${ Number( m[ 1 ] ) }${ m[ 2 ] ?? '' }` };
}

// The keywords a size property's CSS takes (CSS Sizing 3): `none` only on a max-*, `auto` on a width, height or min-*, and the
// three intrinsic keywords on any of them. The block-size and inline-size forms are their physical property.
const INTRINSIC = [ 'fit-content', 'min-content', 'max-content' ];
const EVERY_KEYWORD = [ 'auto', 'none', ...INTRINSIC ];
const SIZE_KEYWORDS = { exact: [ 'auto', ...INTRINSIC ], min: [ 'auto', ...INTRINSIC ], max: [ 'none', ...INTRINSIC ] };
const SIZE_PROP = /^(min-|max-)?(width|height|block-size|inline-size)$/;

// A size keyword as a setting's value: { value } where the setting's emitter prints a bare keyword, { error } where the
// property does not take the keyword (`none` on a min-height) or this setting cannot print it, and null where `prop` is not a
// size property or `raw` is not a size keyword. A setting prints a keyword when it is a tier object (includes/helpers-responsive.php::
// sgs_responsive_format_atom_value passes a non-numeric string through includes/helpers-css-safety.php::sgs_css_length_value,
// which returns a bare keyword unchanged) or a string with no unit partner. A setting with a unit partner (`maxWidthUnit`) or
// holding a number stores a bare number and the emitter prints `<number><unit>` (or strips to digits), so a keyword is lost.
export function sizeKeyword( { prop, raw, def, unit } ) {
	const m = SIZE_PROP.exec( String( prop ?? '' ) );
	const v = String( raw ?? '' ).trim().toLowerCase();
	if ( ! m || ! EVERY_KEYWORD.includes( v ) ) {
		return null;
	}
	if ( ! SIZE_KEYWORDS[ m[ 1 ] ? m[ 1 ].slice( 0, 3 ) : 'exact' ].includes( v ) ) {
		return { error: `${ raw } cannot be held (${ prop } does not take ${ raw })` };
	}
	const types = [].concat( def?.type || [] );
	if ( undefined !== unit ) {
		return { error: `${ raw } cannot be held (the setting stores a number beside a unit, so the keyword is not printed)` };
	}
	return types.includes( 'object' ) || types.includes( 'string' ) ? { value: v } : { error: `${ raw } cannot be held (the setting stores a number, so the keyword is not printed)` };
}
