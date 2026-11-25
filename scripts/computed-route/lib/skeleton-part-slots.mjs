// The draftSlots of a draft element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the
// control that opens the drawer is the navigation block's burger part. Fill reads a part's settings from the draft element
// at the part's calibrated slot, so the absorbed element becomes the node's draftSlots entry at that slot, and the
// element's children become the slots of the part's own sub-parts (the burger's bars) where calibration measured them.
// The part is named by the absorbing rule (`rules.<rule>.part`, a framework DB css_element); its slot is the one most of
// its settings are calibrated at (lib/fill-part-pairing.mjs::partHome). The block itself stays where its own element stands
// (placePart).
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { partHome } from './fill-part-pairing.mjs';

const NTH = /:nth-of-type\((\d+)\)\s*$/;
const PSEUDO = /::[a-z-]+$/;

// The calibrated slot strings the block's settings hold on the part's descendants: { settings entries' slot and slots }
// under `homeSlot`, the settings of any other part (a sub-part, never the wrapper and never a state).
function subPartPaths( db, block, cal, part, homeSlot ) {
	const found = new Set();
	for ( const r of attrsFor( db, block ) ) {
		const s = cal?.settings?.[ r.attr_name ];
		if ( ! s || r.css_state || ! r.css_element || 'wrapper' === r.css_element || part === r.css_element ) {
			continue;
		}
		[ s.slot, ...( s.slots || [] ) ].filter( ( p ) => 'string' === typeof p && p.startsWith( `${ homeSlot } > ` ) ).forEach( ( p ) => found.add( p ) );
	}
	return [ ...found ].sort( ( a, b ) => a.length - b.length || a.localeCompare( b ) );
}

// A finder that finds no element: the slot of a repeated sub-part the draft does not draw (a third bar where the draft's
// bars stop at two). Fill reads that target missing at every width, which is its evidence that the part is absent
// (lib/fill-resolve.mjs::fillContent), so a setting that removes the part (a bar count) can be chosen.
export const ABSENT_PART = Object.freeze( { js: '() => null' } );

// Whether draft elements are one repeated part's items: two or more of one tag, each drawn at the same size (within 1px) at
// every width they all show.
export function sameShaped( list ) {
	if ( list.length < 2 || list.some( ( k ) => k.tag !== list[ 0 ].tag ) ) {
		return false;
	}
	const widths = Object.keys( list[ 0 ].box || {} ).filter( ( w ) => list.every( ( k ) => k.box?.[ w ] ) );
	return widths.length > 0 && widths.every( ( w ) => list.every( ( k ) => Math.abs( k.box[ w ].w - list[ 0 ].box[ w ].w ) <= 1 && Math.abs( k.box[ w ].h - list[ 0 ].box[ w ].h ) <= 1 ) );
}

// The draft element a calibrated sub-part path is, walking down from the part's element: a repeated step
// (`:nth-of-type(k)`) is the k-th child; a lone step is the only child. A lone step with several children is, where the
// calibration repeats a part inside it (`holds( i )`), the one child whose own children are same-shaped items (the bars'
// box beside the burger's word); where no child holds such items and the next step counts over the children, it is a box
// the draft does not draw (the bars straight in the button) and has no element of its own. A repeated step past the last of
// the draft's same-shaped items is that item drawn by the draft as absent. Returns { el }, { absent, note } or { note }.
function walk( steps, from, kids, holds = () => false ) {
	let cur = from;
	for ( let i = 0; i < steps.length; i++ ) {
		const list = kids( cur );
		const nth = NTH.exec( steps[ i ] );
		const next = i < steps.length - 1 && NTH.test( steps[ i + 1 ] );
		const box = list.length > 1 && holds( i ) ? list.filter( ( k ) => sameShaped( kids( k ) ) ) : [];
		if ( nth ) {
			cur = list[ Number( nth[ 1 ] ) - 1 ];
			if ( ! cur && sameShaped( list ) ) {
				return { absent: true, note: `the draft draws ${ list.length } of these items, so item ${ nth[ 1 ] } is absent` };
			}
		} else if ( 1 === list.length ) {
			cur = list[ 0 ];
		} else if ( 1 === box.length ) {
			cur = box[ 0 ];
		} else if ( list.length > 1 && next ) {
			continue;
		} else {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
		if ( ! cur ) {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
	}
	return cur === from ? { note: 'the draft has no element of its own for this step' } : { el: cur };
}

// opener: the absorbed draft element; part: the DB css_element it is; m: the inventory model; finder: the element's
// finder; named: [ { part, element } ], the sub-parts the absorbing rule already knows by role (its trigger's count is the
// block's `badge` part), each read at that draft element where the structural walk below cannot pick one of several
// siblings (the part's own calibrated slot and what lies under it; the part's own pseudo-element layers are read from its element). A role
// the draft does not draw (`element` null) leaves its part unread: the walk never hands it another child.
// Returns { slots: { <calibrated path>: finder }, notes: [text] }.
export function partSlots( { db, block, cal, part, opener, m, finder, named = [] } ) {
	const out = { slots: {}, notes: [] };
	const home = partHome( db, block, cal, part, null );
	if ( null === home ) {
		out.notes.push( `the calibration has no slot for the ${ part } part of ${ block }, so the ${ opener.key } slot is not given` );
		return out;
	}
	const homeSlot = Object.values( cal.settings ).map( ( s ) => s.slot ).find( ( p ) => LOOSE( p ) === home );
	out.slots[ homeSlot ] = finder( opener );
	const kids = ( e ) => m.kids( e ).filter( ( k ) => ! m.isPart( k ) );
	const paths = subPartPaths( db, block, cal, part, homeSlot );
	// The steps below the part that hold a repeated part: a prefix some calibrated path follows with a `:nth-of-type` step.
	const holders = new Set( paths.flatMap( ( p ) => p.split( ' > ' ).flatMap( ( s, i, all ) => ( i > 0 && NTH.test( s ) ? [ all.slice( 0, i ).join( ' > ' ) ] : [] ) ) ) );
	// The roles' calibrated slots: the part's home slot as the calibration writes it (nth steps kept), and where it lies.
	const settingSlots = Object.values( cal.settings ).map( ( s ) => s.slot ).filter( ( p ) => 'string' === typeof p );
	const roles = named.filter( ( n ) => n?.part ).map( ( n ) => {
		const at = partHome( db, block, cal, n.part, null );
		return { ...n, at, slot: null === at ? null : settingSlots.find( ( p ) => LOOSE( p ) === at ) };
	} ).filter( ( n ) => n.slot );
	roles.filter( ( n ) => n.element ).forEach( ( n ) => ( out.slots[ n.slot ] = finder( n.element ) ) );
	// A pseudo-element layer is read from its element (Fill refuses a slot that names the layer, lib/fill-skeleton.mjs::skeletonProblems):
	// each calibrated path is walked once, at the element its plain path names, so a layer's settings are read there.
	for ( const p of new Set( paths.map( ( x ) => x.replace( PSEUDO, '' ) ) ) ) {
		const plain = p;
		const role = roles.find( ( n ) => LOOSE( plain ) === n.at || LOOSE( plain ).startsWith( `${ n.at } > ` ) );
		if ( role ) {
			// The role's own slot (and its pseudo-element layers) is read at the role's element; a path under it is walked from there.
			if ( ! role.element ) {
				p === role.slot && out.notes.push( `${ p }: the draft draws no element for this part of ${ block }` );
			} else if ( LOOSE( plain ) !== role.at ) {
				const below = p.split( ' > ' ).slice( role.slot.split( ' > ' ).length );
				const under = walk( below, role.element, kids );
				under.el ? ( out.slots[ p ] = finder( under.el ) ) : out.notes.push( `${ p }: ${ under.note ?? 'the draft has no element for this step' }` );
			}
			continue;
		}
		const steps = p.slice( homeSlot.length + 3 ).split( ' > ' );
		const hit = walk( steps, opener, kids, ( i ) => holders.has( [ homeSlot, ...steps.slice( 0, i + 1 ) ].join( ' > ' ) ) );
		hit.el ? ( out.slots[ p ] = finder( hit.el ) ) : hit.absent ? ( out.slots[ p ] = ABSENT_PART, out.notes.push( `${ p }: ${ hit.note }` ) ) : out.notes.push( `${ p }: ${ hit.note }` );
	}
	return out;
}

// Where an absorbed part's block stands (Spec 48 FR-48-6): the block that draws the part (the navigation that draws the
// burger) stays where its own element stands. It never moves into the part's wrapper: that wrapper renders where the part
// renders, and a block shown at a width never nests under one the draft hides at that width (the compact-only box holding
// the burger and a tablet-only call to action is hidden where the desktop navigation shows). A wrapper whose only content
// was the part is dropped when its node holds nothing, so it never paints an empty box; one with other content keeps it,
// and the review says why the block stays beside it.
const above = ( m, x ) => {
	const out = [];
	for ( let p = m.byKey[ x.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
		out.push( p );
	}
	return out;
};
const parentsOf = ( list, out = new Map(), parent = null ) => {
	list.forEach( ( n ) => {
		out.set( n, parent );
		parentsOf( n.innerBlocks || [], out, n );
	} );
	return out;
};

// e: the absorbed part element; node: the absorbing block's node; tree: the skeleton's top-level list; nodeOfKey: element key
// to its block node. Returns { dropped: <wrapper key>, note }, or { note } when the block stays beside the part's wrapper
// (null when the part already sits beside the block, inside it, or in the node the block stands in).
export function placePart( { e, node, tree, nodeOfKey, m } ) {
	const own = m.byKey[ node.draftRef?.tpl ];
	if ( ! own ) {
		return null;
	}
	const mine = above( m, e );
	const common = mine.find( ( a ) => a === own || above( m, own ).includes( a ) );
	const host = common && common !== own ? mine.slice( 0, mine.indexOf( common ) ).find( ( a ) => nodeOfKey[ a.key ] ) : null;
	if ( ! host ) {
		return null;
	}
	const parents = parentsOf( tree );
	const wrap = nodeOfKey[ host.key ];
	if ( ! parents.has( wrap ) || wrap === parents.get( node ) ) {
		return null;
	}
	const hiddenAt = m.shownAt( own ).filter( ( w ) => ! host.visible?.[ w ] );
	const why = hiddenAt.length ? `${ host.key } is hidden at ${ hiddenAt.join( ', ' ) }, where ${ own.key } renders, and a block shown at a width never stands in one the draft hides there` : `${ host.key } renders at ${ own.key }'s widths, so the part's place is not ${ node.name }'s`;
	if ( wrap.innerBlocks?.length || m.kids( host ).some( ( k ) => ! m.isPart( k ) && k !== e && ! mine.includes( k ) ) ) {
		return { note: `${ node.name } stays beside ${ host.key }: ${ why }` };
	}
	const list = parents.get( wrap )?.innerBlocks ?? tree;
	list.splice( list.indexOf( wrap ), 1 );
	return { dropped: host.key, note: `${ host.key } held only the ${ e.key } part, which ${ node.name } draws where it stands (${ why }), so it is not a block` };
}

// The draft elements that are themselves media a block may draw at an inner element of the same tag.
export const MEDIA_SELF_TAGS = new Set( [ 'img', 'picture', 'video' ] );

// The calibrated slot of the one inner element a block draws its media at, when the draft's element is that media itself (an
// <img> the block wraps in its own root, link and picture): the block's settings for the image (its maximum height) paint
// that inner element, so the draft element is that slot's element too. tag: the draft element's tag; tags: { slot: tag }
// from the block's calibrated default paint (lib/skeleton-context.mjs::calTagsFor). Null unless the root is another tag and
// exactly one inner element (no pseudo-element) has this tag.
export function mediaSelfSlot( { tag, tags = {} } ) {
	const t = String( tag ?? '' ).toLowerCase();
	if ( ! MEDIA_SELF_TAGS.has( t ) || t === tags[ '' ] ) {
		return null;
	}
	const inner = Object.entries( tags ).filter( ( [ k, v ] ) => '' !== k && ! k.includes( '::' ) && v === t );
	return 1 === inner.length ? inner[ 0 ][ 0 ] : null;
}

// The draftSlots for items the draft's code builds (no stamped element, lib/skeleton-inventory.mjs::codeItemsOf): each
// setting named in `settings` is read at the first item's element, so its calibrated slot gets a finder that walks the
// item's child-index path `at` down from the node's draft element. at: [ child index, ... ]; settings: [ setting name ];
// calibrated: the block's calibration settings ({ <setting>: { slot } }). Returns { slots: { <path>: finder }, notes }.
export function codeItemSlots( { at, settings = [], calibrated = {} } ) {
	const out = { slots: {}, notes: [] };
	if ( ! Array.isArray( at ) || ! at.length || ! at.every( ( i ) => Number.isInteger( i ) && i >= 0 ) ) {
		return out;
	}
	const finder = { js: `( root ) => [ ${ at.join( ', ' ) } ].reduce( ( x, i ) => ( x ? x.children[ i ] : null ), root ) || null` };
	return itemSlots( { finder, settings, calibrated, what: 'the code-built items’ look' } );
}

// The draftSlots that read a code-built item's icon (the inline SVG inside the item's element, at its child-index path `at`)
// at the calibrated slots of the icon's own settings, in the way of drawing the rule chose (`modeSettings`: the settings only
// that way of drawing has, whose slots are the parts it draws). A setting both ways of drawing share (an icon's colour, painted
// on the circle style's svg and on the bare style's svg) has a slot at each way's part; only the slots a mode setting is
// calibrated at are the chosen mode's, and only the first item's (a loop's other items are read through it). With no mode
// setting calibrated, every slot of the setting. Returns { slots: { <path>: finder }, notes }.
export function codeIconSlots( { at, settings = [], calibrated = {}, modeSettings = [] } ) {
	const out = { slots: {}, notes: [] };
	if ( ! Array.isArray( at ) || ! at.length || ! at.every( ( i ) => Number.isInteger( i ) && i >= 0 ) ) {
		return out;
	}
	const finder = { js: `( root ) => { const item = [ ${ at.join( ', ' ) } ].reduce( ( x, i ) => ( x ? x.children[ i ] : null ), root ); return ( item && item.querySelector( 'svg' ) ) || null; }` };
	const slotsOf = ( s ) => [ ...new Set( [ calibrated[ s ]?.slot, ...( calibrated[ s ]?.slots || [] ) ].filter( ( p ) => 'string' === typeof p && '' !== p && ! p.includes( '::' ) ) ) ];
	const firstItem = ( p ) => ( p.match( /:nth-of-type\((\d+)\)/g ) || [] ).every( ( n ) => '1' === n.match( /\d+/ )[ 0 ] );
	const mode = new Set( modeSettings.flatMap( slotsOf ) );
	for ( const s of settings ) {
		const mine = slotsOf( s ).filter( firstItem );
		const chosen = mode.size ? mine.filter( ( p ) => mode.has( p ) ) : mine;
		chosen.length ? chosen.forEach( ( p ) => ( out.slots[ p ] = finder ) ) : out.notes.push( `the calibration has no slot of ${ s } at the part the chosen style draws, so the code-built items’ icon is not read for it` );
	}
	return out;
}

// The draftSlots that read a block's item look at one draft element: each setting in `settings` gives its calibrated
// element slot (never the root, never a pseudo-element) the `finder`. Returns { slots: { <path>: finder }, notes }.
export function itemSlots( { finder, settings = [], calibrated = {}, what = 'the items’ look' } ) {
	const out = { slots: {}, notes: [] };
	for ( const s of settings || [] ) {
		const slot = calibrated[ s ]?.slot;
		'string' === typeof slot && '' !== slot && ! slot.includes( '::' ) ? ( out.slots[ slot ] = finder ) : out.notes.push( `the calibration has no element slot for ${ s }, so ${ what } is not read for it` );
	}
	return out;
}

// The draftSlots that read a block's option chips (rules.optionSet.chipSlots): each calibrated setting the framework DB places
// on the chip `part` (css_element) is read at the draft's chip at the option position its calibrated slot names, one finder per
// slot (`:nth-of-type(k)` is the k-th chip; the first is the one the block selects at rest, which the draft's default
// choice is too). A setting whose slot names no position, a pseudo-element or a chip the draft lacks is said, not read.
// chips: the draft's chip elements in order. Returns { slots: { <path>: finder }, notes }.
export function chipSlots( { db, block, part, chips = [], finder, calibrated = {} } ) {
	const out = { slots: {}, notes: [] };
	if ( ! db || ! part || ! chips.length ) {
		return out;
	}
	const said = new Set();
	const say = ( text ) => said.has( text ) || ( said.add( text ), out.notes.push( text ) );
	for ( const r of attrsFor( db, block ).filter( ( x ) => x.css_element === part && ! x.css_state ) ) {
		const slot = calibrated[ r.attr_name ]?.slot;
		if ( 'string' !== typeof slot || '' === slot ) {
			continue;
		}
		const at = /:nth-of-type\((\d+)\)/.exec( slot );
		if ( slot.includes( '::' ) ) {
			continue;
		}
		if ( ! at ) {
			say( `${ r.attr_name }: its calibrated slot names no chip position, so it is read at no chip` );
		} else if ( ! chips[ Number( at[ 1 ] ) - 1 ] ) {
			say( `${ r.attr_name }: its calibrated slot is chip ${ at[ 1 ] } and the draft has ${ chips.length }, so it is read at no chip` );
		} else {
			out.slots[ slot ] ||= finder( chips[ Number( at[ 1 ] ) - 1 ] );
		}
	}
	return out;
}

// The inline SVG parts of a draft element that are a block's glyph slot: its child <svg> elements the block reads as a
// part and the draft draws at some read width (a phone bar's icon is drawn only below the desktop width; an SVG drawn at
// no width paints nothing to read). kids: the element's inventory children; isPart( kid ).
export const drawnSvgParts = ( kids, isPart ) => kids.filter( ( k ) => isPart( k ) && 'svg' === k.tag && Object.values( k.visible || {} ).some( Boolean ) );
