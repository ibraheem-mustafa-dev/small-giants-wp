// The marker values calibration writes into one setting (Spec 47 §3.2 marker table). Each marker:
// { label, attrs, expect: { width: value } | null, form?, base?, box? }. expect is the value the slot should compute at
// each width when the setting works; null means "any change". base: attributes the marker's own baseline instance
// carries too (a partner setting the marker needs before it can paint), so only the marker's own effect is measured.
import { WIDTHS, MARKER_HEX, MARKER_RGB, MARKER_GRADIENT, MARKER_REST_GRADIENT } from './calibrate-props.mjs';
import { CORNERS, isSizeBox } from './resolve.mjs';

// The duration marker is a whole number of milliseconds, never a CSS time: helpers-tokens.php::sgs_transition_vars
// refuses anything that is not a non-negative integer. 437 reads unmistakably as 0.437s in a computed style.
export const MARKER_DURATION_MS = 437;
// The easing marker is drawn from sgs_transition_vars' whitelist and is never ease-in-out, which is both its fallback
// and several blocks' default (a marker equal to it would read dead for the wrong reason). ease-out is the stand-in
// when a block's own default is linear.
export const MARKER_EASING = 'linear';
const MARKER_EASING_ALT = 'ease-out';

const TIER_PX = { desktop: 37, tablet: 23, mobile: 7 };
// A box that holds a glyph (sgs/icon shapeSize): every tier above the 32px resting glyph and the 48px boxed shape, so
// the glyph, a shrinking flex item of the box, never moves with the marker.
const SIZE_BOX_PX = { desktop: 96, tablet: 80, mobile: 64 };
// Minimum sizes a render floors at the 44px touch target.
const FLOORED = /^min-(height|width)$/;
// A setting whose render clamps its value to the 44px touch target (the detached burger chip's size), so its markers sit above it, and it reads bare px numbers (is_numeric rejects "137px").
const FLOORED_ATTR = /^triggerDetachSize$/;
const WIDTH_TIER = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const BOX = { desktop: [ 11, 13, 17, 19 ], tablet: [ 21, 23, 25, 27 ], mobile: [ 3, 5, 7, 9 ] };
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const TIERS = [ 'desktop', 'tablet', 'mobile' ];

// Markers for free-text settings that take a CSS keyword or value (no enum in block.json: the options live in the
// editor control). A value equal to the setting's default is skipped.
export const KEYWORDS = {
	'text-transform': [ 'uppercase', 'lowercase', 'capitalize' ],
	'text-wrap': [ 'balance', 'pretty', 'nowrap' ],
	'font-family': [ 'Georgia, serif' ],
	'font-style': [ 'italic' ],
	'text-decoration': [ 'underline' ],
	'box-shadow': [ '0 0 0 3px #13579b' ],
	'text-align': [ 'center', 'right' ],
	'aspect-ratio': [ '7 / 3' ],
	'align-items': [ 'center', 'flex-end' ],
	'justify-content': [ 'center', 'space-between' ],
	'flex-wrap': [ 'wrap', 'nowrap' ],
	'flex-direction': [ 'column', 'row-reverse' ],
	'object-fit': [ 'contain', 'cover' ],
	'border-style': [ 'dashed', 'solid' ],
	'writing-mode': [ 'vertical-rl' ],
	'background-attachment': [ 'fixed' ],
	'mix-blend-mode': [ 'multiply' ],
};

// Length properties a numeric or string setting writes in px (a free-text value with no unit companion gets "37px").
const LENGTH = /width|height|gap|size|radius|indent|margin|padding|spacing|offset|inset|^top$|^left$|^right$|^bottom$|basis/;
// Count-like per-device values (columns): numbers, never lengths.
const COUNT = /^(column-count|grid-template-columns|grid-auto-columns|flex)$/;

export const types = ( def ) => [].concat( def?.type || [] );
const isColourProp = ( p ) => /(^|-)color$/.test( p ) || [ 'background-color', 'fill', 'stroke' ].includes( p );

// The setting's schema: block.json's definition, else the DB row's own type, enum and default (extension settings
// are registered in JS, never in block.json).
export function defOf( row, schema ) {
	if ( schema[ row.attr_name ] ) {
		return schema[ row.attr_name ];
	}
	const parse = ( s ) => {
		try {
			return null == s ? undefined : JSON.parse( s );
		} catch {
			return s;
		}
	};
	const def = { type: row.attr_type || undefined, default: parse( row.default_value ) };
	const en = parse( row.enum_values );
	return Array.isArray( en ) ? { ...def, enum: en } : def;
}

// The width a border-style marker needs before it can paint: the same setting name with Style → Width
// (borderStyle → borderWidth, ctaBorderStyle → ctaBorderWidth), written in that attribute's own shape (a box of 3px
// sides, a number with its px unit companion, or a px string). Returns { attr, attrs } or null when the block has none.
export function companionWidth( styleAttr, schema ) {
	const attr = styleAttr.replace( /Style$/, 'Width' );
	const def = attr !== styleAttr ? schema[ attr ] : null;
	if ( ! def ) {
		return null;
	}
	const unitAttr = schema[ `${ attr }Unit` ] ? `${ attr }Unit` : null;
	const t = types( def );
	let value;
	if ( t.includes( 'object' ) ) {
		value = Object.fromEntries( SIDES.map( ( s ) => [ s, '3px' ] ) );
	} else if ( t.includes( 'number' ) || t.includes( 'integer' ) ) {
		value = 3;
	} else if ( t.includes( 'string' ) ) {
		value = unitAttr ? '3' : '3px';
	} else {
		return null;
	}
	return { attr, attrs: { [ attr ]: value, ...( unitAttr && 'object' !== typeof value ? { [ unitAttr ]: 'px' } : {} ) } };
}

// The partners a border colour or width needs to paint: a width (3px) and a solid style for a colour, a solid style
// for a width. Named from the setting's own stem (cardBorderColour → cardBorderWidth, cardBorderStyle; a bare
// borderColour → borderWidth, borderStyle). A hover border gradient also needs the resting border gradient: the masked
// ring is emitted only when a resting paint exists (helpers-tokens.php::sgs_border_gradient_css returns nothing for an
// empty resting paint), and the hover paint must differ from it.
export function borderPartners( attr, prop, schema ) {
	const m = attr.match( /^(.*[bB]order)(Colou?r|Width)(Hover)?(Gradient)?$/ );
	if ( ! m || ! [ 'border-color', 'border-width' ].some( ( p ) => prop.startsWith( p.split( '-' )[ 0 ] ) && prop.includes( p.split( '-' )[ 1 ] ) ) ) {
		return {};
	}
	const out = {};
	const style = `${ m[ 1 ] }Style`;
	if ( schema[ style ] && ! types( schema[ style ] ).includes( 'object' ) ) {
		out[ style ] = 'solid';
	}
	if ( 'Width' !== m[ 2 ] ) {
		Object.assign( out, companionWidth( style, schema )?.attrs || {} );
	}
	const resting = `${ m[ 1 ] }${ m[ 2 ] }Gradient`;
	if ( m[ 3 ] && m[ 4 ] && schema[ resting ] ) {
		out[ resting ] = MARKER_REST_GRADIENT;
	}
	return out;
}

// A shadow shape the hover colour is composed against: x, y, blur, spread.
export const SHADOW_SHAPE = '0px 4px 12px 0px';

// The partner a shadow colour needs to paint: the shape it colours. A colour alone composes no shadow
// (helpers-colour-variants.php::sgs_shadow_decls), so boxShadowColourHover is dead without boxShadow or boxShadowHover.
// Named from the setting's own stem (boxShadowColourHover → boxShadow, cardShadowColourHover → cardShadow).
export function shadowPartners( attr, prop, schema ) {
	if ( 'box-shadow-color' !== prop ) {
		return {};
	}
	const shape = attr.replace( /Colou?r(Hover)?$/, '' );
	return shape !== attr && schema[ shape ] && types( schema[ shape ] ).includes( 'string' ) ? { [ shape ]: SHADOW_SHAPE } : {};
}

// One value per device tier for a non-length per-device setting (columns, alignment), each differing from the
// default at that tier, or null when the setting has no such shape.
function nonLengthTiers( prop, def ) {
	if ( COUNT.test( prop ) ) {
		const d = def.default && 'object' === typeof def.default ? def.default : {};
		return Object.fromEntries( TIERS.map( ( t, i ) => [ t, [ 5, 3, 2 ][ i ] === Number( d[ t ] ) ? [ 6, 4, 1 ][ i ] : [ 5, 3, 2 ][ i ] ] ) );
	}
	const kw = KEYWORDS[ prop ];
	return kw ? Object.fromEntries( TIERS.map( ( t ) => [ t, kw[ 0 ] ] ) ) : null;
}

// The marker for a transition duration or easing setting, or null when the row is not one. The duration is written in
// the setting's own type (a number or a digit string); the easing is a keyword that differs from the default.
// A row qualifies on two facts together: its css_property names the timing longhand (or is a bare `transition`), and
// its name ends in Duration, Easing or EasingCustom, whatever comes before it (transitionDuration, panelSlideDuration,
// bgHoverZoomEasing, submenuCaretTurnEasingCustom). The suffix is needed because css_property alone also lists
// transition-duration on a setting that only triggers a transition, whose value is not a time (a hover lift), and
// the DB holds no column that separates the two: role is `motion` for both and inspector_control_type is null on
// most of these rows.
const DURATION_NAME = /Duration$/;
const EASING_NAME = /Easing(Custom)?$/;
function transitionMarker( row, def, t, prop ) {
	const name = row.attr_name;
	const listed = row.css_property.split( ',' ).map( ( x ) => x.trim() );
	const set = ( v ) => ( { [ name ]: v } );
	if ( DURATION_NAME.test( name ) && ( listed.includes( 'transition-duration' ) || 'transition' === prop ) ) {
		if ( t.includes( 'number' ) || t.includes( 'integer' ) ) {
			// A fractional default is a time in seconds (sgs/cart freeDeliveryFillDuration, 0.6, clamped 0 to 3); every
			// millisecond setting defaults to a whole number or to nothing, so it takes the millisecond marker.
			const d = Number( def.default );
			const seconds = Number.isFinite( d ) && ! Number.isInteger( d );
			const v = seconds ? MARKER_DURATION_MS / 1000 : MARKER_DURATION_MS;
			return v === d ? [] : [ { label: seconds ? 'duration-s' : 'duration-ms', attrs: set( v ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ MARKER_DURATION_MS / 1000 }s` ] ) ) } ];
		}
		return t.includes( 'string' ) ? [ { label: 'duration-ms', attrs: set( String( MARKER_DURATION_MS ) ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ MARKER_DURATION_MS / 1000 }s` ] ) ) } ] : [];
	}
	if ( EASING_NAME.test( name ) && ( listed.includes( 'transition-timing-function' ) || 'transition' === prop ) && t.includes( 'string' ) ) {
		const value = MARKER_EASING === def.default ? MARKER_EASING_ALT : MARKER_EASING;
		return [ { label: 'easing', attrs: set( value ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, value ] ) ) } ];
	}
	return null;
}

// The markers for one setting. `ctx.image` is a media object that exists on the calibration site.
export function markersFor( row, schema, snapshot, current = {}, ctx = {} ) {
	const def = defOf( row, schema );
	const t = types( def );
	const prop = row.css_property.split( ',' )[ 0 ].trim();
	const unitAttr = schema[ `${ row.attr_name }Unit` ] ? `${ row.attr_name }Unit` : null;
	// The unit companion in its own shape: a per-device unit object gets px at every tier.
	const unitDef = unitAttr ? schema[ unitAttr ] : null;
	const unitVal = unitDef && types( unitDef ).includes( 'object' ) ? { desktop: 'px', tablet: 'px', mobile: 'px' } : 'px';
	const withUnit = ( attrs ) => ( unitAttr ? { ...attrs, [ unitAttr ]: unitVal } : attrs );
	// A number when the setting is numeric; a string ("37" beside a unit setting, else "37px") when it is a string.
	const lengthIn = ( n ) => {
		if ( t.includes( 'number' ) || t.includes( 'integer' ) || FLOORED_ATTR.test( row.attr_name ) || ( unitAttr && ! t.includes( 'string' ) ) ) {
			return n;
		}
		return unitAttr ? String( n ) : `${ n }px`;
	};
	const all = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) );
	const set = ( v ) => ( { [ row.attr_name ]: v } );
	const isGradient = /Gradient$/.test( row.attr_name ) || 'colour-gradient' === row.role || /-gradient$/.test( prop );
	// A colour setting: by its property, or by its DB role (an overlay colour painted as a background-image layer).
	if ( ! isGradient && t.includes( 'string' ) && ( isColourProp( prop ) || 'color' === row.role ) ) {
		const exact = isColourProp( prop ) ? all( MARKER_RGB ) : null;
		// The palette colour furthest from both black and white, so it differs from any default text or ground.
		const mid = ( c ) => Math.min( c.r + c.g + c.b, 765 - ( c.r + c.g + c.b ) ) + ( Math.max( c.r, c.g, c.b ) - Math.min( c.r, c.g, c.b ) );
		const slugTok = snapshot.palette.filter( ( tk ) => tk.slug !== current[ row.attr_name ] && 1 === tk.colour.a ).sort( ( a, b ) => mid( b.colour ) - mid( a.colour ) )[ 0 ];
		const out = [ { label: 'hex', form: 'hex', attrs: set( MARKER_HEX ), expect: exact } ];
		if ( slugTok ) {
			const c = slugTok.colour;
			out.push( { label: 'slug', form: 'slug', attrs: set( slugTok.slug ), expect: exact ? all( `rgb(${ c.r }, ${ c.g }, ${ c.b })` ) : null } );
		}
		return out;
	}
	if ( isGradient && t.includes( 'string' ) ) {
		return [ { label: 'gradient', attrs: set( MARKER_GRADIENT ), expect: null } ];
	}
	// A media object (a background image) gets an image that exists on the site.
	if ( t.includes( 'object' ) && 'background-image' === prop ) {
		return ctx.image ? [ { label: 'image', attrs: set( { ...ctx.image } ), expect: null } ] : [];
	}
	if ( ! Array.isArray( def.enum ) && KEYWORDS[ prop ] && t.includes( 'string' ) ) {
		const pair = 'border-style' === prop ? companionWidth( row.attr_name, schema ) : null;
		return KEYWORDS[ prop ].filter( ( v ) => v !== def.default ).map( ( v ) => ( { label: `kw-${ v.replace( /[^a-z0-9]+/gi, '-' ) }`, attrs: { ...set( v ), ...( pair?.attrs || {} ) }, expect: null, ...( pair ? { base: pair.attrs } : {} ) } ) );
	}
	if ( Array.isArray( def.enum ) ) {
		// A border style paints only with a border width, so each style marker carries its companion width and is read
		// against a baseline instance carrying the same width (`base`), never against the plain default.
		const pair = 'border-style' === prop ? companionWidth( row.attr_name, schema ) : null;
		const extra = pair ? pair.attrs : {};
		return def.enum.filter( ( v ) => '' !== v && v !== def.default ).map( ( v ) => ( { label: `enum-${ v }`, attrs: { ...set( v ), ...extra }, expect: null, ...( pair ? { base: pair.attrs } : {} ) } ) );
	}
	// Transition timing: only a setting whose value is a time or an easing (transitionMarker's two-fact gate); a setting
	// that merely triggers a transition has no time to write, so it gets no marker. An enum setting returned above.
	const timing = transitionMarker( row, def, t, prop );
	if ( timing ) {
		return timing;
	}
	if ( t.includes( 'boolean' ) ) {
		return [ { label: 'bool', attrs: set( ! def.default ), expect: null } ];
	}
	const objectBox = t.includes( 'object' ) && /^(padding|margin)$/.test( prop );
	const box = !! row.box_family || 'box_only' === row.tier_shape || objectBox;
	const boxOf = ( tier ) => Object.fromEntries( SIDES.map( ( s, i ) => [ s, `${ BOX[ tier ][ i ] }px` ] ) );
	// A border-radius box stores corners (lib/resolve.mjs::CORNERS), per device when its default is a tier object; a
	// side-keyed marker is ignored by helpers-box.php::sgs_border_radius_tiers and reads as dead.
	if ( 'border-radius' === prop && t.includes( 'object' ) ) {
		const cornersOf = ( tier ) => Object.fromEntries( CORNERS.map( ( k, i ) => [ k, `${ BOX[ tier ][ i ] }px` ] ) );
		const tiered = 'tier_object' === row.tier_shape || ( def.default && 'object' === typeof def.default && 'desktop' in def.default );
		const value = tiered ? { desktop: cornersOf( 'desktop' ), tablet: cornersOf( 'tablet' ), mobile: cornersOf( 'mobile' ) } : cornersOf( 'desktop' );
		return [ { label: tiered ? 'corners-tiers' : 'corners', attrs: set( value ), expect: null, box: true } ];
	}
	// A per-tier {x, y} offset (the detached burger chip): each tier gets its own pair, so a dead tier shows.
	if ( 'tier_object' === row.tier_shape && /\{x, y\}/.test( def.description ?? '' ) ) {
		const pairOf = ( x, y ) => ( { x, y } );
		return [ { label: 'tiers-xy', attrs: set( { desktop: pairOf( 37, 41 ), tablet: pairOf( 23, 29 ), mobile: pairOf( 7, 11 ) } ), expect: null } ];
	}
	// A per-device { width, height } size: each tier holds both, so the marker lands where the block reads it.
	if ( 'tier_object' === row.tier_shape && isSizeBox( def ) ) {
		const sizeOf = ( n ) => ( { width: `${ n }px`, height: `${ n }px` } );
		return [ { label: 'tiers-size', attrs: set( Object.fromEntries( Object.entries( SIZE_BOX_PX ).map( ( [ t, n ] ) => [ t, sizeOf( n ) ] ) ) ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ SIZE_BOX_PX[ WIDTH_TIER[ w ] ] }px` ] ) ) } ];
	}
	if ( 'tier_object' === row.tier_shape ) {
		if ( box ) {
			return [ { label: 'box-tiers', attrs: set( { desktop: boxOf( 'desktop' ), tablet: boxOf( 'tablet' ), mobile: boxOf( 'mobile' ) } ), expect: null, box: true } ];
		}
		const tiers = nonLengthTiers( prop, def );
		if ( tiers ) {
			return [ { label: 'tiers-value', attrs: set( tiers ), expect: null } ];
		}
		if ( ! LENGTH.test( prop ) && 'line-height' !== prop ) {
			return [];
		}
		if ( 'line-height' === prop ) {
			return [ { label: 'tiers', attrs: withUnit( set( { desktop: lengthIn( 37 ), tablet: lengthIn( 23 ), mobile: lengthIn( 7 ) } ) ), expect: { 1440: '37px', 768: '23px', 375: '7px' } } ];
		}
		// A minimum size is held at or above the 44px touch target (a render floors it there), so its markers sit above it.
		const lift = FLOORED.test( prop ) || FLOORED_ATTR.test( row.attr_name ) ? 100 : 0;
		return [ { label: 'tiers', attrs: withUnit( set( { desktop: lengthIn( 37 + lift ), tablet: lengthIn( 23 + lift ), mobile: lengthIn( 7 + lift ) } ) ), expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ TIER_PX[ WIDTH_TIER[ w ] ] + lift }px` ] ) ) } ];
	}
	if ( box ) {
		return [ { label: 'box', attrs: set( boxOf( 'desktop' ) ), expect: null, box: true } ];
	}
	if ( 'font-weight' === prop ) {
		// Two weights, so one always differs from whatever the element computes at rest.
		return [ '700', '300' ].map( ( w ) => ( { label: `weight-${ w }`, attrs: set( t.includes( 'number' ) || t.includes( 'integer' ) ? Number( w ) : w ), expect: all( w ) } ) );
	}
	if ( 'opacity' === prop ) {
		return [ { label: 'number', attrs: set( t.includes( 'string' ) ? '0.37' : 0.37 ), expect: all( '0.37' ) } ];
	}
	// The transform family: a rotation in degrees, a scale factor, a lift or offset in px; the unit is the block's.
	if ( /^(transform|rotate|scale|translate)$/.test( prop ) && ( t.includes( 'number' ) || t.includes( 'string' ) ) ) {
		const n = /scale/i.test( row.attr_name ) || 'scale' === prop ? 1.1 : /rotat/i.test( row.attr_name ) || 'rotate' === prop ? 37 : 7;
		return [ { label: 'transform', attrs: set( t.includes( 'number' ) ? n : String( n ) ), expect: null } ];
	}
	if ( 'letter-spacing' === prop && t.some( ( x ) => [ 'number', 'string' ].includes( x ) ) ) {
		return [ { label: 'spacing', attrs: withUnit( set( t.includes( 'number' ) ? 3 : unitAttr ? '3' : '3px' ) ), expect: null } ];
	}
	if ( t.some( ( x ) => [ 'number', 'string', 'integer' ].includes( x ) ) && LENGTH.test( prop ) ) {
		const px = FLOORED.test( prop ) ? 137 : 37;
		return [ { label: 'length', attrs: withUnit( set( lengthIn( px ) ) ), expect: all( `${ px }px` ) } ];
	}
	// A count or ratio (grid columns, a column ratio): a different number than the default.
	if ( ( t.includes( 'number' ) || t.includes( 'integer' ) ) && COUNT.test( prop ) ) {
		return [ { label: 'count', attrs: set( 3 === Number( def.default ) ? 2 : 3 ), expect: null } ];
	}
	return [];
}
