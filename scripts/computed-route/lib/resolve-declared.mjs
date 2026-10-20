// The declared value a confirmed row writes (Spec 48 FR-48-36, "What is written"): where the draft's code and its render
// agree, the setting is written with what the code states (a 2rem font size, a 0.05em letter spacing, a unitless line
// height), in the form the setting holds; a declared form the setting cannot hold keeps the rendered value.
// resolve.mjs::resolve calls these with input.declaredForm ({ width: value }, only the widths where D–R agrees,
// lib/fill-resolve.mjs::fillElement).

// The calibrated forms that prove a setting passes a CSS string through to its paint (lib/calibrate-markers.mjs::FLUID_MARKERS).
const STRING_FORMS = [ 'clamp', 'vw', 'min', 'max' ];
// A declared length in a unit a unit setting takes beside its number (src/components/TypographyControls.js: em, rem or
// px, and '' for a unitless line height; 'unitless' is the same as '', includes/helpers-typography.php::sgs_typography_css_rule).
const LENGTH = /^(-?\d*\.?\d+)(px|em|rem)?$/;

const clean = ( v ) => String( v ?? '' ).replace( /\s*!important$/, '' ).trim();
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
// o: { prop, decl ({ tier: declared }), tiers ({ tier: rendered }), unit (the setting's unit now), attr, current, flat }.
export function declaredUnit( { prop, decl, tiers, unit, attr, current = {}, flat = false } ) {
	if ( flat || 'string' !== typeof unit ) {
		return null;
	}
	const written = Object.keys( tiers );
	const units = written.map( ( t ) => ( t in decl ? unitOf( prop, decl[ t ] ) : null ) );
	if ( ! written.length || units.some( ( u ) => null === u ) || 1 !== new Set( units ).size || sameUnit( units[ 0 ], unit ) ) {
		return null;
	}
	const held = current[ attr ];
	if ( held && 'object' === typeof held && Object.entries( held ).some( ( [ t, v ] ) => ! written.includes( t ) && null != v && '' !== v ) ) {
		return null;
	}
	return units[ 0 ];
}

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
