// Whether a calibrated default paint describes the node it is compared with (mechanism A of the 2026-11-20 fault census).
//
// Calibration measures a block's default paint on one instance in one context: alone in a banded wrapper, in its fixture's
// paint state, under its default settings (lib/calibrate.mjs::buildTree). A
// node of the same block can sit in another context: an out-of-flow box where the fixture's was in flow, a flex or grid item
// where the fixture's was a block's child, a flex or grid container where the fixture's was a block box, a section straight
// in the page where the fixture's was nested in a band, or a node holding a setting that paints the property (a variant the
// fixture did not hold). Where the property's value depends on that difference, the calibrated default is not what the node
// shows, and a draft value equal to it is no evidence that nothing needs writing. This module names those differences; it is
// shared by Fill's baseline (lib/fill-resolve-state.mjs::baselineSourceFn) and the offline detector (tools/equal-context.mjs).

// The kinds of difference. A non-inherited property's computed value depends on the element's context in four ways only:
// a used value read off the layout (an inset of a positioned box), a display the parent's layout blockifies, a selector
// matching the nesting (core's band rule zeroing a nested gutter) and the settings on the element itself (a layout or a
// variant switching the block's rules). A property whose computed value is the same in any context (a justify-content of
// `normal` on a block box and on a flex box) is compared with the default as it is.
export const CONTEXT_KINDS = [ 'position', 'parent-display', 'layout', 'band', 'held-setting' ];

// An inset of a box positioned out of flow is read from the containing block; on a box in flow its default says nothing of it.
const INSET = /^(top|right|bottom|left)$/;
// The properties only a flex container lays out by, whose default once the block's layout is flex is the painting setting's
// own (lib/fill-resolve-state.mjs::flexLayoutDefault).
const FLEX_ONLY = /^(flex-direction|flex-wrap)$/;
// A banded section's side padding: the page gutter where no band encloses it, 0 inside another band (core's nesting rule).
const SIDE_PADDING = /^padding-(left|right)$/;

// A display value as one keyword: a draft value may arrive quoted or empty, which says nothing.
const keyword = ( v ) => {
	const k = String( v ?? '' ).replace( /^"|"$/g, '' ).trim();
	return '' === k ? undefined : k;
};
const outOfFlow = ( p ) => ( undefined === keyword( p ) ? undefined : /^(absolute|fixed)$/.test( keyword( p ) ) );
// A hidden element (display none) lays out nothing, so its display says nothing of the layout its rules give it.
const isFlex = ( d ) => ( undefined === keyword( d ) || 'none' === keyword( d ) ? undefined : /(^|-)flex$/.test( keyword( d ) ) );
const isItemParent = ( d ) => ( undefined === keyword( d ) || 'none' === keyword( d ) ? undefined : /(^|-)(flex|grid)$/.test( keyword( d ) ) );

// The differences between the context calibration measured a default in and the node's own that change `prop` at `slot`.
// measured: { parentDisplay, position, display, band } (as measuredContext reads them); node: { parentDisplay, position,
// display, band, held: [ { attr, value, read } ] }: the node's context as the clone shows it (a display the clone cannot
// show is not the node's). A field missing on either side is not compared. Returns [ { kind, measured, node } ].
export function contextDiffs( prop, slot, measured, node ) {
	if ( ! measured || ! node ) {
		return [];
	}
	const out = [];
	// `from`: the one direction of a difference that changes the value (null: either).
	const differ = ( kind, test, field, from = null ) => {
		const a = test( measured[ field ] );
		const b = test( node[ field ] );
		if ( undefined !== a && undefined !== b && a !== b && ( null === from || a === from ) ) {
			out.push( { kind, measured: keyword( measured[ field ] ), node: keyword( node[ field ] ) } );
		}
	};
	// An inset measured on a box in flow says nothing of a node positioned out of flow (the other way round, the measured
	// inset is the static position, lib/fill-prop.mjs::inOwnContext).
	if ( INSET.test( prop ) ) {
		differ( 'position', outOfFlow, 'position', false );
	}
	// A flex or grid item's display is blockified: measured as one, an inline-level display reads block-level, which a node
	// in a block's flow does not show. The other way round the draft's block-level value already differs from an inline one.
	if ( 'display' === prop ) {
		differ( 'parent-display', isItemParent, 'parentDisplay', true );
	}
	if ( FLEX_ONLY.test( prop ) ) {
		differ( 'layout', isFlex, 'display', false );
	}
	if ( '' === slot && SIDE_PADDING.test( prop ) && 'boolean' === typeof measured.band && 'boolean' === typeof node.band && measured.band !== node.band ) {
		out.push( { kind: 'band', measured: measured.band ? 'nested in a band' : 'no band', node: node.band ? 'nested in a band' : 'pays the page gutter' } );
	}
	for ( const h of node.held || [] ) {
		out.push( { kind: 'held-setting', measured: 'the block default', node: `${ h.attr }: ${ JSON.stringify( h.value ) }`, ...( h.read ? { read: h.read } : {} ) } );
	}
	return out;
}

// The settings a node holds, other than the block default and other than any paint state calibration laid over the
// default for it (cal.paintState, lib/paint-state.mjs::calibrationForNode), that calibration discovered painting `prop` at
// `slot` (cal.discovered[attr][prop].slots), with what calibration read that value painting there, where it read it:
// [ { attr, value, read: { width: value } } ]. Only a value calibration read painting something other than `calibrated` (the
// default paint at width `w`) is a difference; a value it never read (one that removes the part, or one no fixture tried) is
// no evidence either way and is left out, as is one whose read equals the default.
export function heldPainters( cal, schema, attributes, slot, prop, w = undefined, calibrated = undefined ) {
	const out = [];
	const covered = new Set( Object.keys( cal?.paintStates?.[ cal?.paintState ]?.when?.equals || {} ) );
	for ( const [ attr, byProp ] of Object.entries( cal?.discovered || {} ) ) {
		const d = byProp?.[ prop ];
		const value = attributes?.[ attr ];
		if ( ! d || undefined === value || covered.has( attr ) || ! ( d.slots || [] ).some( ( s ) => String( s ) === String( slot ) ) ) {
			continue;
		}
		const dflt = schema?.[ attr ]?.default;
		if ( JSON.stringify( value ) === JSON.stringify( dflt ) ) {
			continue;
		}
		const read = 'string' === typeof value ? d.values?.[ value ] : undefined;
		const at = read?.[ String( 1920 === w ? 1440 : w ) ];
		if ( undefined === at || undefined === calibrated || String( at ).trim() === String( calibrated ).trim() ) {
			continue;
		}
		out.push( { attr, value, read } );
	}
	return out;
}

// The context calibration measured a default in at a slot and width: calibratedContext's fields, the element's own display
// (its default paint), and `band`: every instance is built inside a banded wrapper (lib/calibrate.mjs::buildTree), so it
// always sat nested in a band. paint: the element's paint at the width.
export function measuredContext( paint ) {
	if ( ! paint || undefined === paint._parentDisplay ) {
		return null;
	}
	const own = Object.keys( paint ).filter( ( k ) => k.startsWith( '_own:' ) ).map( ( k ) => k.slice( 5 ) );
	return {
		parentDisplay: paint._parentDisplay,
		...( paint._position ? { position: paint._position } : {} ),
		...( paint.display ? { display: paint.display } : {} ),
		band: true,
		...( own.length ? { own } : {} ),
	};
}

// A row's value at a width: a { width: value } JSON, or the one value it holds at every width.
const valueAt = ( row, w ) => {
	const v = row?.value;
	if ( 'string' === typeof v && v.startsWith( '{' ) ) {
		try {
			return JSON.parse( v )[ w ];
		} catch {
			return v;
		}
	}
	return v;
};
const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
const tierValues = ( v ) => ( isObj( v ) ? Object.values( v ) : null == v || '' === v ? [] : [ v ] ).flatMap( ( x ) => ( isObj( x ) ? Object.values( x ) : [ x ] ) ).filter( ( x ) => 'string' === typeof x && '' !== x );
// Whether a node holds a content band (lib/fill-gutter.mjs::hasBand's rule): a block with content-width and padding settings
// (schema) whose content width is other than full at some tier (its own, else the block default), which holds a padding, or
// whose draft element has a vertical padding (`vertical`).
const banded = ( schema, attributes, vertical ) => {
	if ( ! schema?.contentWidth || ! schema?.padding ) {
		return false;
	}
	const own = tierValues( attributes?.contentWidth );
	const width = own.length ? own : tierValues( schema.contentWidth.default );
	return width.some( ( v ) => 'full' !== v ) || tierValues( attributes?.padding ).length > 0 || vertical;
};
// The reasons a settled row gives for a value the clone shows: equal to what the node shows, already held, or written by the
// residual writer. An unmapped row's value is one the clone does not show.
const SHOWN = new Set( [ 'equal', 'already-set', 'residual-css' ] );

// The node contexts a saved Fill report holds, for the settled `equal` rows whose baseline is the calibrated default, read
// from files alone (tools/equal-context.mjs). report: fill-report.json; nodes: [ { ref, parent (ref | null), name,
// attributes } ] from the filled tree; calFor( name, node ) the node's calibration; schemaOf( name ) its block.json
// attributes. The node's display and position at a slot are the draft values its rows record the clone showing (SHOWN); its
// parent's display is the parent node's root display (a part's: the display of the part it sits in); whether a band encloses
// it, for a banded node, from its ancestors' settings and vertical paddings (lib/fill-gutter.mjs::paysGutter's rule; a
// content width Fill's band pass writes later is in the filled tree's settings). Returns [ { row, kinds } ] for every such row.
export function reportContexts( report, nodes, calFor, schemaOf ) {
	const byRef = new Map( nodes.map( ( n ) => [ n.ref, n ] ) );
	const rowsAt = new Map();
	const vertical = new Set();
	for ( const r of report.settled || [] ) {
		if ( [ 'display', 'position' ].includes( r.property ) && undefined !== r.value && SHOWN.has( r.reason ) ) {
			rowsAt.set( `${ r.node }|${ r.slot }|${ r.property }`, r );
		}
	}
	for ( const r of [ ...( report.settled || [] ), ...( report.unmapped || [] ) ] ) {
		if ( '' === r.slot && /^padding-(top|bottom)$/.test( r.property ) && [ 375, 768, 1440 ].some( ( w ) => parseFloat( valueAt( r, w ) ) > 0 ) ) {
			vertical.add( r.node );
		}
	}
	for ( const r of report.writes || [] ) {
		'' === r.slot && /^padding-(top|bottom)$/.test( r.prop ) && vertical.add( r.node );
	}
	// An equal row shows what it was judged equal to: for a calibrated default, the default paint (an equivalent spelling of the
	// draft's value, a flex box with nothing to lay out read as block, shows the default).
	const draftAt = ( ref, slot, prop, w ) => {
		const r = rowsAt.get( `${ ref }|${ slot }|${ prop }` );
		const node = byRef.get( ref );
		if ( 'equal' === r?.reason && 'calibrated-default' === r.baseline && node ) {
			const cal = calFor( node.name, node );
			const key = Object.keys( cal?.elements || {} ).find( ( k ) => k.replace( /:nth-of-type\(\d+\)/g, '' ) === String( slot ).replace( /:nth-of-type\(\d+\)/g, '' ) );
			const v = undefined !== key ? cal.elements[ key ]?.[ String( 1920 === w ? 1440 : w ) ]?.[ prop ] : undefined;
			if ( undefined !== v ) {
				return v;
			}
		}
		return valueAt( r, w );
	};
	const out = [];
	for ( const row of report.settled || [] ) {
		const at = 'calibrated-default' === row.baseline ? row.widths?.[ 0 ] : isObj( row.baseline ) ? ( row.widths || [] ).find( ( w ) => 'calibrated-default' === row.baseline[ w ] ) : undefined;
		if ( 'equal' !== row.reason || undefined === at ) {
			continue;
		}
		const node = byRef.get( row.node );
		const cal = node ? calFor( node.name, node ) : null;
		const key = Object.keys( cal?.elements || {} ).find( ( k ) => k.replace( /:nth-of-type\(\d+\)/g, '' ) === String( row.slot ).replace( /:nth-of-type\(\d+\)/g, '' ) );
		const measured = measuredContext( undefined !== key ? cal.elements[ key ]?.[ String( 1920 === at ? 1440 : at ) ] : null ) ?? ( row.measured ? { ...row.measured, band: true } : null );
		const steps = String( row.slot ).split( /\s*>\s*/ ).filter( Boolean );
		const parentDisplay = steps.length ? draftAt( row.node, steps.slice( 0, -1 ).join( ' > ' ), 'display', at ) : node?.parent ? draftAt( node.parent, '', 'display', at ) : undefined;
		const schema = schemaOf( row.block ) || {};
		let band;
		if ( '' === row.slot && node && banded( schema, node.attributes, vertical.has( node.ref ) ) ) {
			band = false;
			for ( let up = byRef.get( node.parent ); up; up = byRef.get( up.parent ) ) {
				if ( banded( schemaOf( up.name ) || {}, up.attributes, vertical.has( up.ref ) ) ) {
					band = true;
					break;
				}
			}
		}
		const calibrated = undefined !== key ? cal.elements[ key ]?.[ String( 1920 === at ? 1440 : at ) ]?.[ row.property ] : undefined;
		const held = heldPainters( cal, schema, node?.attributes, row.slot, row.property, at, calibrated );
		const kinds = contextDiffs( row.property, row.slot, measured, {
			parentDisplay,
			position: draftAt( row.node, row.slot, 'position', at ),
			display: draftAt( row.node, row.slot, 'display', at ),
			...( undefined !== band ? { band } : {} ),
			held,
		} );
		out.push( { row, kinds } );
	}
	return out;
}
