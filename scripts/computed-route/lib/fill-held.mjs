// The "already held" classifier (Spec 48 Fill, UNMAPPED finalisation). A row is raised when no setting writes the property;
// that is decided by name. Some of those rows are not missing settings at all: the element already renders the draft's value
// whatever the settings hold. This module separates them from the real gaps, decided from what was written and what
// calibration measured, never from a table of property names. Two reasons, each stated in the report:
//   covered    a setting written on this element paints this value at this width (judged per tier, paintedAt): a shorthand
//              setting whose parts include the property (and whose written part equals the draft's), a setting calibration
//              saw change the property as a side effect, or an sgsMotion state that carries the transform and the transition;
//   inherited  an inherited property on an element that holds no text of its own (a container whose descendants state their
//              own text looks), equal to what its parent renders.
// A value the block paints by default is never judged here: the calibration page is not the page being built, where a
// parent can change it (a grid cell's padding). Such a row stays raised and the live read of the built page judges it
// (lib/confirm-live.mjs::judgeUnmapped).
// A row is held only when every width it states is. A value that differs by one unit, or that holds at one width only, stays
// raised. Held rows are listed under their reason in fill-report.md, never dropped.
import { sameValue } from '../../parity/lib/compare.mjs';
import { LOOSE } from './resolve.mjs';
import { refOf } from './tree.mjs';
import { INHERITED, canon, defaultPaint } from './fill-prop.mjs';
import { snapsOf } from './fill-resolve-state.mjs';
import { familyOf, expand, physicalOf, partKey, isCssProperty } from './css-families.mjs';
import { propertyChannels, IDENTITY } from './motion-channels.mjs';
import { msOf, easingOf, clientTokens } from './motion-tokens.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const TOL = 0.5;
export const HELD_REASONS = [ 'covered', 'inherited' ];
// The reasons a resolver gave for a property it could not place; any other reason (a conflict, a not-plain value, an
// ambiguity, an uncalibrated block) is a real gap and is never judged here.
export const RESOLVER_GAP = /^(?:no-setting|shape):/;

const same = ( prop, a, b ) => undefined !== a && undefined !== b && sameValue( prop, canon( prop, a ), canon( prop, b ), TOL );

// The row's value per width: a { width: value } JSON, or one value at every width the element was read at.
function valuesOf( row, snaps ) {
	let parsed = null;
	try {
		parsed = JSON.parse( row.value );
	} catch {
		parsed = null;
	}
	if ( parsed && 'object' === typeof parsed && ! Array.isArray( parsed ) && Object.keys( parsed ).length && Object.keys( parsed ).every( ( k ) => /^\d+$/.test( k ) ) ) {
		return Object.fromEntries( Object.entries( parsed ).map( ( [ w, v ] ) => [ Number( w ), String( v ) ] ).filter( ( [ w ] ) => WIDTHS.includes( w ) ) );
	}
	return Object.fromEntries( WIDTHS.filter( ( w ) => snaps[ w ] ).map( ( w ) => [ w, String( row.value ) ] ) );
}

export const TIER_OF = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const WIDTH_OF = { mobile: 375, tablet: 768, desktop: 1440 };
const isTiered = ( value ) => value && 'object' === typeof value && [ 'desktop', 'tablet', 'mobile' ].some( ( t ) => t in value );

// What a written attribute paints at a width: { value }, or null where the write paints nothing there. A tier object
// paints its own tier at the width; an empty tier is judged by the block's calibrated paint per width, never by an assumed
// cascade: where the block's default paint of the property changes between the nearest stated wider tier's width and this
// one, the block keeps a fallback of its own at this width (a multi-button's 8px mobile gap under a 12px desktop one) and
// the write paints nothing there; where it is unchanged the stated tier carries down; where calibration never measured
// the property at either width nothing is known and the write paints nothing. A value with no tiers paints every width
// when written as one value, and only the widths it was written at otherwise.
export function paintedAt( w, x, prop, defaultAt ) {
	if ( ! isTiered( w.after ) ) {
		return 'single' === w.how || ( w.widths || [] ).includes( x ) ? { value: w.after } : null;
	}
	if ( TIER_OF[ x ] in w.after ) {
		return { value: w.after[ TIER_OF[ x ] ] };
	}
	const wider = [ 'tablet', 'desktop' ].filter( ( t ) => WIDTH_OF[ t ] > x ).find( ( t ) => t in w.after );
	if ( undefined === wider ) {
		return null;
	}
	// same() refuses an unmeasured side, so a width calibration never read carries nothing down.
	return same( prop, defaultAt( x ), defaultAt( WIDTH_OF[ wider ] ) ) ? { value: w.after[ wider ] } : null;
}

// Whether a calibrated setting's property, or a side effect calibration recorded for it, reaches the row's property on the row's element.
function reaches( c, row, slot ) {
	const paths = [ ...( c.slots || [ c.slot ] ), ...( c.reaches || [] ) ].map( LOOSE );
	if ( ! paths.includes( LOOSE( slot ) ) ) {
		return false;
	}
	const prop = physicalOf( row.property );
	const sets = ( stored ) => stored.split( ',' ).map( ( s ) => s.trim() ).flatMap( ( s ) => expand( s ) ).includes( prop );
	if ( c.property && sets( c.property ) ) {
		return true;
	}
	return ( c.effects || [] ).some( ( e ) => {
		const [ path, effect ] = [ e.slice( 0, e.lastIndexOf( '|' ) ), e.slice( e.lastIndexOf( '|' ) + 1 ) ];
		return LOOSE( path ) === LOOSE( slot ) && sets( effect );
	} );
}

// covered, by a written setting: at every width the row states, what the write paints there (paintedAt) equals the draft's.
function coveredBySetting( row, values, writes, cal ) {
	const fam = familyOf( row.property );
	const defaultAt = ( x ) => defaultPaint( cal, row.slot, x, row.property );
	for ( const w of writes ) {
		const c = cal?.settings?.[ w.attr ];
		if ( ! c || ( c.state ?? null ) !== ( row.state ?? null ) || ! reaches( c, row, row.slot ) ) {
			continue;
		}
		const ok = Object.keys( values ).map( Number ).every( ( x ) => {
			const painted = paintedAt( w, x, row.property, defaultAt );
			if ( null === painted ) {
				return false;
			}
			// A shape setting by the corner or side the row states, any other by its value. A value that cannot be compared
			// (a padding box against a height a side effect moves) covers nothing.
			const written = painted.value;
			const part = written && 'object' === typeof written ? ( fam && 'mixed' !== fam.kind ? written[ 'corner' === fam.kind ? partKey( fam.part ) : fam.part ] : undefined ) : written;
			return undefined !== part && null !== part && same( row.property, String( part ), values[ x ] );
		} );
		if ( ok ) {
			return `${ w.attr } was written for this element and paints ${ row.property } at the draft's value`;
		}
	}
	return null;
}

// covered, by the sgsMotion states written on the node: the transform channels, the duration and the easing.
function coveredByMotion( row, values, writes, tokens ) {
	if ( '' !== row.slot ) {
		return null;
	}
	const states = writes.filter( ( w ) => 'motion' === w.how && w.after?.elements?.root ).flatMap( ( w ) => Object.entries( w.after.elements.root ).filter( ( [ , v ] ) => v?.state?.values ).map( ( [ k, v ] ) => ( { attr: w.attr, key: k, values: v.state.values } ) ) );
	const resolve = ( v ) => ( 'string' === typeof v && v.startsWith( 'token:' ) ? tokens[ v.slice( 6 ) ] : v );
	for ( const s of states ) {
		const ok = Object.values( values ).every( ( raw ) => {
			if ( 'transition-duration' === row.property ) {
				const ms = msOf( resolve( s.values.duration ) );
				const list = String( raw ).split( ',' ).map( ( x ) => msOf( x ) );
				return null !== ms && list.every( ( x ) => x === ms );
			}
			if ( 'transition-timing-function' === row.property ) {
				const e = easingOf( resolve( s.values.easing ) );
				const list = String( raw ).split( /,(?![^(]*\))/ ).map( ( x ) => easingOf( x ) );
				return null !== e && list.every( ( x ) => x === e );
			}
			const { channels, unsupported = [], other } = propertyChannels( row.property, raw );
			return ! other && ! unsupported.length && Object.keys( channels ).length > 0 && Object.entries( channels ).every( ( [ k, v ] ) => 'number' === typeof ( s.values[ k ] ?? IDENTITY[ k ] ) && Math.abs( ( s.values[ k ] ?? IDENTITY[ k ] ) - v ) <= Math.max( 0.005, 0.005 * Math.abs( v ) ) );
		} );
		if ( ok ) {
			return `${ s.attr } carries it in its ${ s.key } state`;
		}
	}
	return null;
}

// Builds the classifier for one Fill run. st: the Fill run state (lib/fill-resolve-state.mjs::makeState).
// Returns settle( { unmapped, writes } ) → { unmapped (the rows still raised), alreadyHeld ([ row + { reason, detail } ]) }.
export function makeSettle( st ) {
	const tokens = clientTokens( st.rawSnapshot );
	const recOf = new Map( st.nodes.map( ( rec ) => [ refOf( st.flat[ rec.index ] ), rec ] ) );
	return function settle( { unmapped, writes } ) {
		const kept = [];
		const alreadyHeld = [];
		for ( const row of unmapped ) {
			const rec = recOf.get( row.node );
			const target = rec?.targets.find( ( t ) => t.slot === ( row.slot ?? '' ) );
			const held = rec && target && RESOLVER_GAP.test( String( row.reason ) ) && isCssProperty( row.property ) ? classify( { ...row, slot: row.slot ?? '' }, rec, target ) : null;
			held ? alreadyHeld.push( { ...row, heldReason: held.reason, heldDetail: held.detail } ) : kept.push( row );
		}
		return { unmapped: kept, alreadyHeld };

		function classify( row, rec, target ) {
			const snaps = snapsOf( st, target.id );
			const values = valuesOf( row, snaps );
			if ( ! Object.keys( values ).length ) {
				return null;
			}
			const cal = st.calFor( rec.name );
			const mine = writes.filter( ( w ) => w.node === row.node );
			const covered = coveredBySetting( row, values, mine, cal ) ?? coveredByMotion( row, values, mine, tokens );
			if ( covered ) {
				return { reason: 'covered', detail: covered };
			}
			if ( row.state ) {
				return null;
			}
			const widths = Object.keys( values ).map( Number );
			// inherited: no text of its own (its text lives in child nodes) and the parent renders the same value.
			if ( INHERITED.includes( row.property ) && rec.children.length > 0 && widths.every( ( w ) => same( row.property, values[ w ], parentValue( rec, '' === row.slot ? null : row.slot, row.property, w ) ) ) ) {
				return { reason: 'inherited', detail: `${ row.property } is inherited and this element holds no text of its own; its parent renders the same value` };
			}
			return null;
		}

		// What the parent renders: for the node's own root element the parent node's root, for an inner element the node's root; at
		// the top of the surface the theme's page value.
		function parentValue( rec, inner, prop, w ) {
			if ( null !== inner ) {
				return snapsOf( st, `${ rec.index }:` )[ w ]?.styles?.[ prop ];
			}
			if ( null !== rec.parent ) {
				return snapsOf( st, `${ rec.parent }:` )[ w ]?.styles?.[ prop ];
			}
			const root = snapsOf( st, `${ rec.index }:` )[ w ];
			return st.page( st.calFor( rec.name )?.elements?.[ '' ]?._tag ).value( prop, w, parseFloat( root?.styles?.[ 'font-size' ] ) || 16 );
		}
	};
}

// Counts of held rows by reason, every reason present.
export const heldCounts = ( held ) => Object.fromEntries( HELD_REASONS.map( ( r ) => [ r, held.filter( ( h ) => h.heldReason === r ).length ] ) );
