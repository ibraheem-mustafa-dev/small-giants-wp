// A hover (or state) transform read from the draft's state looks, as the hover record the motion writer takes
// (lib/fill-motion.mjs::motionWrites). A block whose motion support is declared (`supports.motion`) holds a hover
// transform as its sgsMotion hover layer, never as a per-property setting, so one path writes it for every such block
// whether the draft's animation inventory names the element or only the state read finds it (a generated Site Info icon
// has no template identity of its own, so no inventory record reaches it).
import { READ_WIDTHS } from './fill-read.mjs';

// The state looks the hover layer holds: the transform, and a change of the start padding as `indent` (Spec 38A §5.1).
export const INDENT_PROPS = [ 'padding-left', 'padding-inline-start' ];
export const MOTION_STATE_PROPS = [ 'transform', ...INDENT_PROPS ];

// A comma list split outside parentheses ("cubic-bezier(.34, 1.56, .64, 1), ease" is two entries).
export function splitList( text ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of String( text ?? '' ) ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( ',' === ch && 0 === depth ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += ch;
		}
	}
	cur.trim() && out.push( cur.trim() );
	return out;
}

const ms = ( t ) => ( /ms$/.test( t ) ? parseFloat( t ) : /s$/.test( t ) ? Math.round( parseFloat( t ) * 1000 ) : NaN );

// The entry of a transition list that times `prop`: the one at the property's place in transition-property (the
// property, a shorthand that holds it, or `all`), else the first (a list of one is every property's). The list wraps
// when shorter than the property list, as CSS does.
function timed( list, props, prop, shorthands = [] ) {
	const at = props.findIndex( ( p ) => p === prop || 'all' === p || shorthands.includes( p ) );
	const i = at < 0 ? 0 : at;
	return list.length ? list[ i % list.length ] : undefined;
}

// A length in px (a unitless 0 too) as a number, else null.
const px = ( v ) => ( /^-?(?:\d+\.?\d*|\.\d+)px$/.test( String( v ?? '' ).trim() ) ? parseFloat( v ) : /^0$/.test( String( v ?? '' ).trim() ) ? 0 : null );
const fmt = ( n ) => `${ Math.round( n * 100 ) / 100 }px`;

// The hover look one width's state looks give a target: { record } (the hover record the motion writer takes, one
// property for the transform and one for a start-padding change), { gap } (a hover the motion layer cannot hold, with
// the reason) or {} (no hover transform or start-padding change at that width).
function hoverAt( reads, target, w ) {
	const rest = reads.declared?.[ w ]?.[ target.id ] || {};
	const rendered = reads.widths?.[ w ]?.[ target.id ]?.styles || {};
	const timing = ( prop, shorthands ) => {
		const props = splitList( rest[ 'transition-property' ] ?? rendered[ 'transition-property' ] ?? '' );
		return {
			duration_ms: ( ( d ) => ( Number.isNaN( d ) ? 0 : d ) )( ms( timed( splitList( rest[ 'transition-duration' ] ?? rendered[ 'transition-duration' ] ), props, prop, shorthands ) ) ),
			delay_ms: ( ( d ) => ( Number.isNaN( d ) ? 0 : d ) )( ms( timed( splitList( rest[ 'transition-delay' ] ?? rendered[ 'transition-delay' ] ?? '0s' ), props, prop, shorthands ) ) ),
			easing: timed( splitList( rest[ 'transition-timing-function' ] ?? rendered[ 'transition-timing-function' ] ), props, prop, shorthands ) || 'ease',
		};
	};
	const properties = [];
	for ( const look of reads.states?.[ w ]?.looks?.[ target.id ] || [] ) {
		const states = [ ...look.states ].sort().join( '+' );
		if ( 'hover' !== states || look.pseudo ) {
			continue;
		}
		const declared = look.declared?.transform;
		if ( declared ) {
			if ( /var\(|calc\(/.test( declared ) ) {
				return { gap: `the hover transform at ${ w }px (${ declared }) holds a var() or calc(), and the motion hover layer takes a literal transform` };
			}
			properties.push( { property: 'transform', from: null, to: declared, ...timing( 'transform' ) } );
		}
		const key = INDENT_PROPS.find( ( k ) => look.declared?.[ k ] );
		if ( key ) {
			const to = px( look.declared[ key ] );
			// The resting start padding: the key asked for, then its other spelling, declared before rendered.
			const resting = [ rest, rendered ].flatMap( ( src ) => [ src[ key ], ...INDENT_PROPS.map( ( k ) => src[ k ] ) ] ).find( ( v ) => undefined !== v ) ?? '0px';
			const from = px( resting );
			if ( null === to || null === from ) {
				return { gap: `the hover ${ key } at ${ w }px (${ look.declared[ key ] } from ${ resting }) is not a px length, and the hover layer's indent is the px change of the start padding` };
			}
			from !== to && properties.push( { property: 'padding-left', from: fmt( from ), to: fmt( to ), ...timing( key, [ 'padding', 'padding-inline', ...INDENT_PROPS ] ) } );
		}
	}
	if ( ! properties.length ) {
		return {};
	}
	return {
		record: {
			id: `STATE-${ target.id }`,
			name: `Hover look read from the state look of ${ target.id }`,
			mechanism: 'css-transition',
			status: 'active',
			group: 'hover',
			trigger: { type: 'hover', detail: "the draft's :hover look (state read)" },
			element: { template_tpl_id: null },
			properties,
		},
	};
}

const sameHover = ( a, b ) => JSON.stringify( a?.properties ) === JSON.stringify( b?.properties );
const TIER_WIDTHS = { tablet: 768, mobile: 375 };

// A target's hover transform held per width: { base (the widest width's record), tiers ({ tablet, mobile }: a record,
// or null where the draft has no hover transform at that width; only a tier that differs from the base), gaps (reasons
// a width's hover transform cannot be held) }. A width where the element is not drawn is left out.
export function stateHover( reads, target ) {
	const at = {};
	const gaps = [];
	for ( const w of READ_WIDTHS ) {
		if ( true === reads.widths?.[ w ]?.[ target.id ]?.missing ) {
			continue;
		}
		const h = hoverAt( reads, target, w );
		if ( h.gap ) {
			gaps.push( h.gap );
			continue;
		}
		at[ w ] = h.record || null;
	}
	const wide = Object.keys( at ).map( Number ).sort( ( a, b ) => b - a );
	const baseW = wide.find( ( w ) => at[ w ] );
	const base = undefined === baseW ? null : at[ baseW ];
	if ( base && baseW !== wide[ 0 ] ) {
		gaps.push( `the draft has a hover transform at ${ baseW }px and none at ${ wide[ 0 ] }px, and the motion hover layer's base is the widest width` );
	}
	const tiers = {};
	for ( const [ tier, w ] of Object.entries( TIER_WIDTHS ) ) {
		if ( base && w in at && w < baseW && ! sameHover( at[ w ], base ) ) {
			tiers[ tier ] = at[ w ];
		}
	}
	return { base, tiers, gaps };
}

// Hover records whose start-padding change carries no resting value (the draft's `style-hover="padding-left:16px"` names
// only the hover value) with `from` set to the element's resting padding, read at the widest width (declared first, else
// rendered), so the hover layer's indent is the delta and not the hover padding itself. A record whose resting padding is
// not a px length, and any other record, is returned as it is.
export function withRestPadding( records, reads, target ) {
	const w = Math.max( ...READ_WIDTHS );
	const rest = reads?.declared?.[ w ]?.[ target.id ] || {};
	const rendered = reads?.widths?.[ w ]?.[ target.id ]?.styles || {};
	return records.map( ( r ) => {
		const open = ( p ) => INDENT_PROPS.includes( p.property ) && ( null === p.from || undefined === p.from );
		if ( ! ( r.properties || [] ).some( open ) ) {
			return r;
		}
		const from = px( rest[ 'padding-left' ] ?? rest[ 'padding-inline-start' ] ?? rendered[ 'padding-left' ] ?? rendered[ 'padding-inline-start' ] );
		return null === from ? r : { ...r, properties: r.properties.map( ( p ) => ( open( p ) ? { ...p, from: fmt( from ) } : p ) ) };
	} );
}

// The hover records a target's state looks make: [ record ] with one transform property, or []. The record carries the
// tablet and mobile looks that differ from the widest look as `tiers`.
// reads: readDraft's result; target: { id }.
export function stateMotionRecords( reads, target ) {
	const { base, tiers } = stateHover( reads, target );
	return base ? [ { ...base, tiers } ] : [];
}

// A target's hover records once the state read is added: the inventory's records (`own`) keep every property they
// carry, and the state read's records (`state`, stateMotionRecords) add only the properties no inventory hover record
// covers. With an inventory hover record those properties join it, so the element keeps one hover layer (two hover
// records on one element make two hover layers, which the motion schema refuses); with none, the state records are
// the element's hover records. A state record's tiers keep only the properties they add, and join the inventory record's own
// tiers (a tier holds both sets of properties).
const propKey = ( p ) => ( 'padding-inline-start' === p ? 'padding-left' : p );
export function withStateHover( own, state ) {
	const hover = own.filter( ( r ) => 'hover' === r.trigger?.type );
	const covered = new Set( hover.flatMap( ( r ) => ( r.properties || [] ).map( ( p ) => propKey( p.property ) ) ) );
	const keep = ( r ) => ( r ? { ...r, properties: ( r.properties || [] ).filter( ( p ) => ! covered.has( propKey( p.property ) ) ) } : r );
	const adds = state.map( ( r ) => ( {
		...keep( r ),
		...( r.tiers ? { tiers: Object.fromEntries( Object.entries( r.tiers ).map( ( [ k, t ] ) => [ k, keep( t ) ] ) ) } : {} ),
	} ) ).filter( ( r ) => r.properties.length );
	if ( ! adds.length ) {
		return own;
	}
	if ( ! hover.length ) {
		return [ ...own, ...adds ];
	}
	const into = hover[ 0 ];
	const extra = adds.flatMap( ( r ) => r.properties );
	const flat = Object.fromEntries( Object.entries( into ).filter( ( [ k ] ) => 'tiers' !== k ) );
	const merged = [ ...into.properties, ...extra ];
	// A tier holds the inventory's properties there (its own tier's, else the record's) beside the state read's (its own tier's,
	// else the record's): a state tier of null has no hover transform there, so it adds nothing.
	const tiers = {};
	for ( const k of new Set( [ ...Object.keys( into.tiers || {} ), ...adds.flatMap( ( r ) => Object.keys( r.tiers || {} ) ) ] ) ) {
		const properties = [
			...( ( k in ( into.tiers || {} ) ? into.tiers[ k ] : into )?.properties || [] ),
			...adds.flatMap( ( r ) => ( k in ( r.tiers || {} ) ? r.tiers[ k ]?.properties || [] : r.properties ) ),
		];
		if ( JSON.stringify( properties ) !== JSON.stringify( merged ) ) {
			tiers[ k ] = properties.length ? { ...flat, properties } : null;
		}
	}
	return own.map( ( r ) => ( r === into ? { ...flat, properties: merged, ...( Object.keys( tiers ).length ? { tiers } : {} ) } : r ) );
}

// The hover layer's tablet and mobile overrides for a record with `tiers`: { devices, unmapped }. baseLayer is the layer
// hoverLayer made for the record; `layerOf(record)` makes one tier's layer; `perDevice(field)` says whether the layer
// holds the field per device. A tier with no hover transform takes the neutral pose; an easing or other field the layer
// holds for all devices only, and that differs, is returned in `unmapped`.
export function hoverDevices( record, baseLayer, layerOf, perDevice ) {
	const devices = {};
	const unmapped = [];
	const neutral = ( k ) => ( 'scale' === k ? 1 : 0 );
	for ( const [ tier, rec ] of Object.entries( record.tiers || {} ) ) {
		const got = rec ? layerOf( rec )?.values || {} : {};
		for ( const k of new Set( [ ...Object.keys( baseLayer.values ), ...Object.keys( got ) ] ) ) {
			const want = k in got ? got[ k ] : ( 'easing' === k ? baseLayer.values[ k ] : neutral( k ) );
			if ( JSON.stringify( want ) === JSON.stringify( baseLayer.values[ k ] ) ) {
				continue;
			}
			if ( perDevice( k ) ) {
				( devices[ tier ] ??= {} )[ k ] = want;
			} else {
				unmapped.push( `the ${ tier } hover ${ k } (${ JSON.stringify( want ) }) differs from the widest (${ JSON.stringify( baseLayer.values[ k ] ) }), and the hover layer holds ${ k } for all devices at once` );
			}
		}
	}
	return { devices, unmapped };
}
