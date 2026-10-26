// The Site Info row lift (FR-47-4): a row of generated brand icons shares one look where its copies agree, held by the
// row's childIcon* settings, and each copy keeps the values that differ on its own settings. Each icon's draft link is
// read as the shape element and the glyph inside it as the glyph element (the DB's css_element names both). A setting
// of the row is written once, only when every copy agrees. Every value the row does not hold (a copy that differs, a
// property the row has no setting for, a row setting that was not written) is read again against the icon's own
// calibration and written on that icon's own setting; one the icon has no setting for is UNMAPPED, named by block (one
// row for every icon that raises it, naming them all in `nodes`). A value the row holds for the icon, and one the icon's
// read settled (equal, not painted), is a settled row on the icon, so every read ends written, held or unwritten.
// Nothing is averaged. A square box with a 50% radius on every corner is the shape setting's `circle`.
import { attrsFor, enumSettings } from './db.mjs';
import { setAttr, refOf } from './tree.mjs';
import { LOOSE } from './resolve.mjs';
import { ROW_GLYPH_SLOT } from './fill-skeleton.mjs';
import { ownedCopy } from './fill-prop.mjs';

const json = ( v ) => JSON.stringify( v );
const freshOut = () => ( { writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], unread: [], settled: [] } );
const ELEMENTS = [ [ 'shape', '' ], [ 'glyph', ROW_GLYPH_SLOT ] ];
const RADII = [ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].map( ( c ) => `border-${ c }-radius` );
const RADIUS_PROPS = [ 'border-radius', ...RADII ];

// Every calibrated slot the block's settings of one element sit at, in the DB's order: { element: [slot] }. The settings
// of one element need not share a slot (a size sits on the icon, its colours on the shape inside it).
export function elementSlots( db, block, cal ) {
	const out = {};
	for ( const r of attrsFor( db, block ) ) {
		const slot = cal?.settings?.[ r.attr_name ]?.slot;
		if ( r.css_element && undefined !== slot && ! r.css_state ) {
			const list = ( out[ r.css_element ] ??= [] );
			list.some( ( s ) => LOOSE( s ) === LOOSE( slot ) ) || list.push( slot );
		}
	}
	return out;
}

// Whether a setting that paints `held` (a property or a shorthand) also paints `prop` (border-width paints border-top-width).
const SIDES = 'top|right|bottom|left|top-left|top-right|bottom-left|bottom-right';
function paints( held, prop ) {
	const m = /^([a-z]+)(?:-(width|style|color|radius))?$/.exec( held );
	return held === prop || Boolean( m && new RegExp( m[ 2 ] ? `^${ m[ 1 ] }-(?:${ SIDES })-${ m[ 2 ] }$` : `^${ m[ 1 ] }-(?:${ SIDES })$` ).test( prop ) );
}

const keyOf = ( r ) => `${ r.css_element }|${ r.css_property }|${ r.css_state || '' }`;

// One copy's reading of one element, written into a throwaway copy of the node: { values: { attr: final value },
// props: { attr: prop }, covers: { attr: [every property written to it] }, widths: { attr: [read widths] }, unmapped: [rows],
// settled: [rows] }.
function readCopy( st, rec, ref, cal, target, path, snaps, fillElement ) {
	const node = ownedCopy( st.flat[ rec.index ], structuredClone( st.flat[ rec.index ] ) );
	const flat = st.flat.slice();
	flat[ rec.index ] = node;
	const sub = { ...st, flat, out: freshOut(), shown: new Map( st.shown ) };
	// The draft element is paired to every slot of its element by the caller: it is the element the part is drawn as.
	fillElement( sub, rec, ref, cal, { id: target.id, slot: path, paired: true }, snaps );
	const values = {};
	const props = {};
	const covers = {};
	const widths = {};
	for ( const w of sub.out.writes ) {
		values[ w.attr ] = node.attributes[ w.attr ];
		props[ w.attr ] = w.prop;
		covers[ w.attr ] = [ ...new Set( [ ...( covers[ w.attr ] || [] ), w.prop ] ) ];
		widths[ w.attr ] = [ ...new Set( [ ...( w.widths || [] ), ...( w.answers || [] ) ] ) ].sort( ( a, b ) => a - b );
	}
	// A property whose value the setting already held (another side of the same border) is one it was written from too.
	for ( const r of ( sub.out.settled || [] ).filter( ( x ) => 'already-set' === x.reason && x.attr in values ) ) {
		covers[ r.attr ] = [ ...new Set( [ ...covers[ r.attr ], r.property ] ) ];
	}
	return { values, props, covers, widths, unmapped: sub.out.unmapped, settled: sub.out.settled };
}

// The element a calibrated slot sits on: a pseudo-element layer (`::before`, `::after`) is painted on its host element,
// and a draft element is read as that host, never as the layer (lib/fill-skeleton.mjs refuses a pseudo slot for the same
// reason).
const hostOf = ( slot ) => String( slot ?? '' ).replace( /::(?:before|after)$/, '' );

// One copy's reading of one element across every element the block's settings of that element sit at: a value is taken
// from the read at the element its setting is calibrated on; a row no setting at another element could hold is kept
// (liftChildren raises each such row once).
function readElement( st, rec, ref, cal, element, target, snaps, fillElement ) {
	const calibrated = ( elementSlots( st.db, rec.name, cal )[ element ] || [] ).map( hostOf ).filter( ( s, i, all ) => all.findIndex( ( x ) => LOOSE( x ) === LOOSE( s ) ) === i );
	// An element none of the block's settings is calibrated on is still read where the draft element sits, so what it paints is raised.
	const slots = calibrated.length ? calibrated : [ target.slot ];
	const out = { values: {}, props: {}, covers: {}, widths: {}, unmapped: [], settled: [] };
	for ( const slot of slots ) {
		const r = readCopy( st, rec, ref, cal, target, slot, snaps, fillElement );
		const elsewhere = new Set( attrsFor( st.db, rec.name ).filter( ( a ) => a.css_element === element && ! a.css_state && undefined !== cal.settings?.[ a.attr_name ]?.slot && LOOSE( hostOf( cal.settings[ a.attr_name ].slot ) ) !== LOOSE( slot ) ).flatMap( ( a ) => String( a.css_property ).split( ',' ) ) );
		for ( const [ attr, value ] of Object.entries( r.values ) ) {
			const home = cal.settings?.[ attr ]?.slot;
			if ( ( undefined === home || LOOSE( hostOf( home ) ) === LOOSE( slot ) ) && ! ( attr in out.values ) ) {
				out.values[ attr ] = value;
				out.props[ attr ] = r.props[ attr ];
				out.covers[ attr ] = r.covers[ attr ];
				out.widths[ attr ] = r.widths[ attr ];
			}
		}
		out.unmapped.push( ...r.unmapped.filter( ( u ) => ! elsewhere.has( u.property ) ) );
		out.settled.push( ...r.settled );
	}
	// A property one calibrated slot leaves unwritten is not shown by the element because another slot's default paint
	// happens to equal it: the unwritten verdict stands, and the equal row is not kept as an answer to the read.
	const raised = new Set( out.unmapped.map( ( u ) => u.property ) );
	out.settled = out.settled.filter( ( r ) => 'equal' !== r.reason || ! raised.has( r.property ) );
	return out;
}

// Whether a draft box is a circle the shape setting names: a square box whose four corners are 50% at every read width.
function isCircle( snaps ) {
	const ws = Object.values( snaps );
	return ws.length > 0 && ws.every( ( s ) => RADII.every( ( p ) => '50%' === String( s.styles?.[ p ] ?? s.styles?.[ 'border-radius' ] ?? '' ).trim() ) && s.rect && Math.abs( s.rect.w - s.rect.h ) <= 1 );
}

// The enum setting of a block that holds `circle` and paints no CSS property of its own, or null.
const circleAttr = ( db, block ) => enumSettings( db, block ).find( ( r ) => /shape$/i.test( r.attr_name ) && JSON.parse( r.enum_values || '[]' ).includes( 'circle' ) )?.attr_name ?? null;

// A reading with the circle taken out of it: the radius rows and writes go, and the shape setting is set to `circle`.
function withCircle( reading, attr ) {
	const values = { ...reading.values };
	const props = { ...reading.props };
	for ( const a of Object.keys( values ).filter( ( k ) => RADIUS_PROPS.includes( props[ k ] ) ) ) {
		delete values[ a ];
		delete props[ a ];
	}
	return { ...reading, values: { ...values, [ attr ]: 'circle' }, props: { ...props, [ attr ]: 'border-radius' }, unmapped: reading.unmapped.filter( ( u ) => ! RADIUS_PROPS.includes( u.property ) ) };
}

// Lifts the generated icons' shared look onto the row node `rowRec`, and each icon's own values onto the icon.
// snapsOf( id ): a target's reads by width.
export function liftRow( st, rowRec, ref, cal, { fillElement, snapsOf } ) {
	const copies = rowRec.children.map( ( c ) => st.nodes[ c ] ).filter( ( c ) => c.targets.length );
	const node = st.flat[ rowRec.index ];
	// The row settings written for every icon: keyOf( setting ) -> the properties every copy's read wrote it from.
	const held = new Map();
	const rowAttr = new Map( attrsFor( st.db, rowRec.name ).map( ( r ) => [ r.attr_name, r ] ) );
	const rowCircle = circleAttr( st.db, rowRec.name );
	for ( const [ element, slotOf ] of ELEMENTS ) {
		const targetOf = ( c ) => c.targets.find( ( t ) => t.slot === slotOf );
		const snapsFor = ( c ) => ( targetOf( c ) ? snapsOf( st, targetOf( c ).id ) : {} );
		const readings = copies.map( ( c ) => ( Object.keys( snapsFor( c ) ).length ? readElement( st, rowRec, ref, cal, element, targetOf( c ), snapsFor( c ), fillElement ) : null ) );
		const all = readings.length === copies.length && readings.every( Boolean );
		const lift = ( attr, value, prop, covers = [ prop ] ) => {
			const { before, after } = setAttr( node, { attr, value, merge: 'replace' } );
			st.out.writes.push( { node: ref, index: rowRec.index, block: rowRec.name, slot: '', prop, attr, before, after, widths: [], how: 'row-lift' } );
			rowAttr.has( attr ) && held.set( keyOf( rowAttr.get( attr ) ), new Set( covers ) );
		};
		if ( 'shape' === element && rowCircle && all && copies.every( ( c ) => isCircle( snapsFor( c ) ) ) ) {
			lift( rowCircle, 'circle', 'border-radius' );
			readings.forEach( ( r, i ) => {
				readings[ i ] = withCircle( r, rowCircle );
				delete readings[ i ].values[ rowCircle ];
			} );
		}
		const live = readings.filter( Boolean );
		for ( const attr of [ ...new Set( live.flatMap( ( r ) => Object.keys( r.values ) ) ) ] ) {
			const seen = live.map( ( r ) => json( r.values[ attr ] ?? null ) );
			if ( all && seen.every( ( v ) => v === seen[ 0 ] ) ) {
				const covers = ( live[ 0 ].covers?.[ attr ] || [] ).filter( ( p ) => live.every( ( r ) => ( r.covers?.[ attr ] || [] ).includes( p ) ) );
				lift( attr, live[ 0 ].values[ attr ], live.find( ( r ) => r.props[ attr ] ).props[ attr ], covers );
			}
		}
	}
	liftChildren( st, rowRec, copies, held, { fillElement, snapsOf } );
}

// Each icon's own look: what the row did not take, read against the icon's calibration and written on the icon.
function liftChildren( st, rowRec, copies, held, { fillElement, snapsOf } ) {
	const rows = new Map();
	// One settled row per icon, element, property and reason: each calibrated slot an element is read at settles it again.
	const settledRows = new Map();
	const keep = ( r ) => {
		const k = json( [ r.node, r.slot, r.readSlot ?? null, r.property, r.reason ] );
		const prior = settledRows.get( k );
		settledRows.set( k, prior ? { ...prior, widths: [ ...new Set( [ ...( prior.widths || [] ), ...( r.widths || [] ) ] ) ].sort( ( a, b ) => a - b ) } : r );
	};
	const rowCircled = Boolean( st.flat[ rowRec.index ].attributes?.[ circleAttr( st.db, rowRec.name ) ] );
	for ( const c of copies ) {
		const childCal = st.calFor( c.name );
		const cref = refOf( st.flat[ c.index ] );
		const cnode = st.flat[ c.index ];
		if ( ! childCal ) {
			st.out.unmapped.push( { node: cref, block: c.name, slot: '', property: '(block)', value: '', reason: `uncalibrated: ${ c.name } has no calibration file, so the look the row does not hold cannot be written on this icon` } );
			continue;
		}
		const childAttr = new Map( attrsFor( st.db, c.name ).map( ( r ) => [ r.attr_name, r ] ) );
		const childCircle = circleAttr( st.db, c.name );
		for ( const [ element, slotOf ] of ELEMENTS ) {
			const target = c.targets.find( ( t ) => t.slot === slotOf );
			const snaps = target ? snapsOf( st, target.id ) : {};
			if ( ! Object.keys( snaps ).length ) {
				continue;
			}
			let reading = readElement( st, c, cref, childCal, element, target, snaps, fillElement );
			const readWidths = Object.keys( snaps ).map( Number );
			const rowHeld = ( property, widths, value ) => keep( { node: cref, block: c.name, slot: slotOf, property, value, widths: widths?.length ? widths : readWidths, reason: 'row-held', detail: `${ rowRec.name } holds ${ property } for every icon of the row` } );
			if ( 'shape' === element && childCircle && isCircle( snaps ) ) {
				reading = withCircle( reading, childCircle );
				if ( rowCircled ) {
					delete reading.values[ childCircle ];
					rowHeld( 'border-radius', readWidths, 'circle' );
				}
			}
			// A copy's settled row keeps the element it was judged on; the draft element it was read as is its readSlot.
			reading.settled.forEach( ( r ) => keep( { ...r, node: cref, block: c.name, slot: r.slot ?? '', ...( LOOSE( r.slot ?? '' ) !== LOOSE( slotOf ) ? { readSlot: slotOf } : {} ) } ) );
			const skipped = ( attr ) => childAttr.has( attr ) && held.has( keyOf( childAttr.get( attr ) ) );
			// A switch (childIconShowBackground's twin) is written only with a value it turns on.
			const carried = Object.keys( reading.values ).some( ( a ) => '(switch)' !== reading.props[ a ] && ! skipped( a ) );
			for ( const [ attr, value ] of Object.entries( reading.values ) ) {
				if ( skipped( attr ) || ( '(switch)' === reading.props[ attr ] && ! carried ) ) {
					skipped( attr ) && '(switch)' !== reading.props[ attr ] && rowHeld( reading.props[ attr ], reading.widths[ attr ], json( value ) );
					continue;
				}
				const { before, after } = setAttr( cnode, { attr, value, merge: 'replace' } );
				st.out.writes.push( { node: cref, index: c.index, block: c.name, slot: slotOf, prop: reading.props[ attr ], attr, before, after, widths: reading.widths[ attr ] || [], how: 'row-child' } );
			}
			// A value is row-held only where every copy's read wrote the row's setting from this property (or a shorthand of
			// it): the copies agreed on that value, so the row's setting paints this icon's value. A setting written from other
			// properties only is not proven to, so the row stays UNMAPPED.
			const heldFrom = [ ...childAttr.values() ].filter( ( r ) => r.css_element === element && held.has( keyOf( r ) ) ).flatMap( ( r ) => String( r.css_property ).split( ',' ).map( ( h ) => [ h, held.get( keyOf( r ) ) ] ) );
			for ( const u of reading.unmapped ) {
				if ( heldFrom.some( ( [ h, from ] ) => paints( h, u.property ) && [ ...from ].some( ( p ) => paints( p, u.property ) ) ) ) {
					rowHeld( u.property, u.widths, u.value );
					continue;
				}
				const k = json( [ u.property, u.value, u.reason ] );
				const prior = rows.get( k );
				rows.set( k, { ...u, node: cref, block: c.name, slot: slotOf, nodes: [ ...new Set( [ ...( prior?.nodes || [] ), cref ] ) ] } );
			}
		}
	}
	st.out.unmapped.push( ...rows.values() );
	( st.out.settled ??= [] ).push( ...settledRows.values() );
}
