// Chrome rules: hover on the parts a block draws itself, read from the draft's records on the elements inside the block's own span
// (its template id up to the next paired element). Two rules, both generic over blocks:
//   - itemCardHover: a block that declares its printed items (`supports.sgs.motionItems`, or an `item` motion part) and has a hover shadow setting on an item card part (post-grid `card`, brand-strip `tile`) takes the
//     item's lift or scale as that part's sgsMotion hover and the item's shadow as the part's hover shadow settings. The block's
//     built-in lift switches (`builtInHoverLift`, `shadowLiftOnHover`, whichever it declares) are turned off, so the draft's lift is not added to them. A strip whose own element has no hover but whose
//     saved root hover moves it loses that root hover: the draft's strip does not move.
//   - arrowHover: a block with an `icon` motion part takes the draft arrow's parent-driven slide as the icon part's hover,
//     driven by the group (the whole row or card).
// The part, the shadow attributes and the built-in lift switch are found in the framework DB (block_attributes, motion_targets).
import { elementMotion } from './fill-motion-element.mjs';
import { motionTools } from './apply-family-statemotion.mjs';
import { MOTION_LOOKS } from './apply-hover.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { hoverTo, settle } from './apply-chrome-records.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { itemsPartOf } from './apply-motion-items.mjs';

const GLOW = /^(.*?)\s+((?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8})$/i;
// One shadow with one colour; a list of shadows, or a shadow with an inset or a second colour, has no single hover shadow setting.
export const singleShadow = ( v ) => ! /,(?![^(]*\))/.test( String( v ) ) && ! /inset/i.test( String( v ) ) && ( String( v ).match( /rgba?\(|hsla?\(|#[0-9a-f]{3,8}/gi ) || [] ).length <= 1;
const idOf = ( tpl ) => Number( /^Root\/(\d+)#\d+$/.exec( String( tpl ?? '' ) )?.[ 1 ] ?? NaN );

// The draft ids after the target's own, up to the next element that pairs with a live block.
export function spanAfter( { target, surface, all } ) {
	const lo = idOf( target.tpl );
	const later = ( surface?.pairs ?? [] ).filter( ( p ) => ! p.slot && ( ! all?.blocks || all.blocks[ p.ref ] ) ).map( ( p ) => idOf( p.tpl ) ).filter( ( id ) => id > lo );
	const hi = later.length ? Math.min( ...later ) - 1 : lo + 12;
	return Number.isFinite( lo ) ? Array.from( { length: Math.max( 0, Math.min( hi - lo, 12 ) ) }, ( _, i ) => lo + 1 + i ) : [];
}

const hoverRecords = ( ctx, ids ) => ids.flatMap( ( id ) => recordsFor( ctx.recordsIndex, `Root/${ id }#0` ) ).filter( ( r ) => 'hover' === r.trigger?.type && stateLook( r ) );
const holdsMotion = ( r ) => ( r.properties || [] ).some( ( p ) => MOTION_LOOKS.includes( p.property ) && null !== p.to && undefined !== p.to );
const OFFERS = { names: [], opens: [], openWords: new Set() };

function attrRows( db, block, sql, ...args ) {
	return db.prepare( sql ).all( block, ...args );
}

// The motion document with `part` holding `hover`, validated; the op's write or a no-setting reason.
function partWrite( { ctx, part, hover, prop, why, record, extra = [], source = null, dropRootHover = false } ) {
	const { schema } = motionTools( ctx.db, ctx.rawSnapshot );
	const layer = source ? { ...hover, state: { ...hover.state, source } } : hover;
	const doc = structuredClone( ctx.saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements = { ...( doc.elements || {} ), [ part ]: { ...( doc.elements?.[ part ] || {} ), hover: layer } };
	if ( dropRootHover && doc.elements.root ) {
		delete doc.elements.root.hover;
	}
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return [ { status: 'no-setting', prop, state: 'hover', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } ];
	}
	const writes = [ dropRootHover ? { attr: 'sgsMotion', value: doc } : { attr: 'sgsMotion', value: { v: 1, elements: { [ part ]: { hover: layer } } }, merge: 'deep' }, ...extra ];
	return [ settle( { prop, why, saved: ctx.saved, writes, record, state: 'hover' } ) ];
}

export function itemCardHover( ctx ) {
	const { db, block, saved, target } = ctx;
	if ( ! db || target.slot ) {
		return [];
	}
	const declaresItems = itemsPartOf( db, block ) || motionTools( db, ctx.rawSnapshot ).mdb.targetsOf( block ).some( ( t ) => 'item' === t.target );
	const shadow = declaresItems && attrRows( db, block, "SELECT attr_name, css_element FROM block_attributes WHERE block_slug = ? AND css_property = 'box-shadow' AND attr_name LIKE '%Hover' AND css_element IS NOT NULL" )[ 0 ];
	if ( ! shadow ) {
		return [];
	}
	const { mdb } = motionTools( db, ctx.rawSnapshot );
	// The printed item is the element a visitor hovers: an `item` part wins over the shadow's own part, which may be an inner box.
	const part = mdb.targetsOf( block ).some( ( t ) => 'item' === t.target ) ? 'item' : shadow.css_element;
	if ( ! mdb.targetsOf( block ).some( ( t ) => part === t.target ) ) {
		return [];
	}
	const records = hoverRecords( ctx, spanAfter( ctx ) ).filter( holdsMotion );
	if ( ! records.length ) {
		return [];
	}
	const items = [];
	const colourAttr = shadow.attr_name.replace( /Hover$/, 'ColourHover' );
	const hasColour = attrRows( db, block, 'SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_name = ?', colourAttr ).length > 0;
	const glow = hoverTo( records, 'box-shadow' );
	const parts = glow && singleShadow( glow.value ) && GLOW.exec( glow.value );
	const shadowWrites = parts ? [ { attr: shadow.attr_name, value: parts[ 1 ] }, ...( hasColour ? [ { attr: colourAttr, value: parts[ 2 ] } ] : [] ) ] : [];
	const lifts = attrRows( db, block, "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND attr_name IN ( 'builtInHoverLift', 'shadowLiftOnHover' ) ORDER BY attr_name = 'builtInHoverLift' DESC" ).map( ( r ) => r.attr_name );
	const m = elementMotion( records, { mdb, ctx: motionTools( db, ctx.rawSnapshot ).ctx, sampled: null, target: part, offers: OFFERS } );
	const extra = [ ...shadowWrites, ...( m.element.hover ? lifts.filter( ( a ) => false !== saved[ a ] ).map( ( a ) => ( { attr: a, value: false } ) ) : [] ) ];
	const record = records[ 0 ].id;
	glow && ! parts && items.push( { status: 'no-setting', prop: `${ part } hover shadow`, state: 'hover', why: `${ record } casts "${ glow.value }": a list of shadows, an inset or a second colour has no single hover shadow setting` } );
	const own = recordsFor( ctx.recordsIndex, target.tpl ).filter( ( r ) => 'hover' === r.trigger?.type && holdsMotion( r ) );
	const rootState = saved.sgsMotion?.elements?.root?.hover?.state;
	// The draft's own element has no hover, so a saved root hover that moves the whole block goes in the same write.
	const dropRootHover = ! own.length && Boolean( rootState ) && Object.keys( rootState.values ?? {} ).some( ( k ) => /^translate|^scale|^rotate/.test( k ) );
	if ( m.element.hover ) {
		items.push( ...partWrite( { ctx, part, hover: m.element.hover, prop: `${ part } hover`, why: `${ target.tpl } the ${ part } moves and casts its shadow on hover (${ record })${ dropRootHover ? '; the saved root hover that moves the whole block goes' : '' }`, record, extra, dropRootHover } ) );
	} else if ( shadowWrites.length ) {
		items.push( settle( { prop: `${ part } hover shadow`, why: `${ target.tpl } the ${ part } casts a shadow on hover (${ record })`, saved, writes: shadowWrites, record, state: 'hover' } ) );
	}
	return items;
}

export function arrowHover( ctx ) {
	const { db, block, target } = ctx;
	if ( ! db || target.slot ) {
		return [];
	}
	const { mdb } = motionTools( db, ctx.rawSnapshot );
	if ( ! mdb.targetsOf( block ).some( ( t ) => 'icon' === t.target ) ) {
		return [];
	}
	const records = hoverRecords( ctx, spanAfter( ctx ) ).filter( ( r ) => /arrowIcon/.test( r.element?.description ?? '' ) && /parent-driven/.test( r.trigger?.detail ?? '' ) && hoverTo( [ r ], 'transform' ) );
	if ( ! records.length ) {
		return [];
	}
	const m = elementMotion( records, { mdb, ctx: motionTools( db, ctx.rawSnapshot ).ctx, sampled: null, target: 'icon', offers: OFFERS } );
	if ( ! m.element.hover ) {
		return [ { status: 'no-setting', prop: 'icon hover', state: 'hover', why: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || 'no hover layer came from the arrow record' } ];
	}
	return partWrite( { ctx, part: 'icon', hover: m.element.hover, source: 'group', prop: 'icon hover', why: `${ target.tpl } the arrow slides with its row or card (${ records[ 0 ].id })`, record: records[ 0 ].id } );
}
