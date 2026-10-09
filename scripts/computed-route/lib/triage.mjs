// Triage (Spec 47, Session B1): one candidate class per distinct open issue of a Solve report, with the evidence that
// decided it. Classes: W (walker or route gap: a measuring artefact, a consequence of another row, or a setting exists
// that the route cannot find, calibrate or write), F (framework gap: nothing on the block, its enclosing blocks or its
// extensions fits and the resolver finds no setting; or the setting already holds the draft value and paint still
// differs, a hardcode), T (the tree can hold it: the resolver would write a new value), U (a box row nothing explains).
// Missing settings start as W until proven F. Every lookup (database rows, calibration, roster, block supports, source
// files, tree nodes, the resolver) is passed in, so the logic runs on in-memory fixtures.
import { splitProperty, resolve, resolveViaAncestor } from './resolve.mjs';
import { listedProperties, modifierOf } from './db.mjs';
import { draftValues, plainLength, cssProp, settingState, effectiveState, openRows, writableGroups } from './solve-rows.mjs';
import { entranceStart, groupRects } from './entrance.mjs';
import { referenceOf } from './references.mjs';
import { sourcePass } from './triage-source.mjs';
import { USED_VALUES } from '../solve.mjs';
// The kinds, classes, order and issue key are shared with lib/sweep.mjs so the two counts agree by construction.
import { SOLVE_CLASSES, UNMAPPED, CONTENT, isContentRow, isIssue, issueKey as keyOf } from './issue-classes.mjs';

export const TRIAGE_CLASSES = [ 'W', 'F', 'T', 'U', 'L' ];
const loose = ( p ) => String( p ?? '' ).replace( /:nth-of-type\(\d+\)/g, '' );
const PX_TOL = 1;

// Distinct issues of a report's hardcode, missing, unresolved and derived rows, then its unmapped-state rows, then its
// content rows (both filed by Solve under `other`), each with every row it covers and the Solve class of its first row.
// The class order and the test of what counts are the sweep's (lib/issue-classes.mjs), so a key a Solve class already
// holds stays under that class and a surface's triage count equals its sweep count. UNMAPPED never takes a content row
// and CONTENT takes only content rows, so the two classes cannot share one: a text or presence row has no unmapped
// walker state, and filing it under UNMAPPED would publish evidence that is simply untrue of it.
export function issuesOf( report, surface ) {
	const prefix = `cr-ref-${ surface }-`;
	const mine = ( x ) => ! x.ref || ( x.ref.startsWith( prefix ) && /^\d+$/.test( x.ref.slice( prefix.length ) ) );
	const found = new Map();
	for ( const cls of [ ...SOLVE_CLASSES, UNMAPPED, CONTENT ] ) {
		for ( const x of report.classes?.[ [ UNMAPPED, CONTENT ].includes( cls ) ? 'other' : cls ] || [] ) {
			if ( ! isIssue( x ) || ! mine( x ) || ( UNMAPPED === cls && isContentRow( x ) ) || ( CONTENT === cls && ! isContentRow( x ) ) ) {
				continue;
			}
			const k = keyOf( x );
			found.has( k ) || found.set( k, { key: k, solveClass: cls, rows: [] } );
			found.get( k ).rows.push( x );
		}
	}
	return [ ...found.values() ];
}

// A name as lower-case words, sgs prefix dropped and colour spelt as the CSS property spells it.
const words = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[\s_-]+/ ).map( ( t ) => ( 'colour' === t ? 'color' : t ) ).filter( ( t ) => t && 'sgs' !== t );
const NOT_A_SIZE = [ 'border', 'stroke', 'outline', 'focus', 'ring', 'line' ];
// Longer CSS properties that end in a shorter one's words: textTransform names text-transform, never transform.
const COMPOUND = [ 'text-transform', 'text-decoration', 'text-align', 'text-shadow', 'border-color', 'border-style', 'outline-color', 'box-shadow', 'line-height', 'letter-spacing', 'word-spacing' ];
// The walker's hover-effects row (lifts, grows, fades: chrome-compare.mjs::compareHover) fits a hover setting naming one.
const HOVER_EFFECTS = [ 'lift', 'scale', 'zoom', 'shadow', 'tilt', 'opacity', 'grayscale', 'transform' ];

// Whether a setting's name fits a CSS property: a box size (width, min-, max-) fits any setting naming that size
// (maxWidth, contentWidth, width) that is not a border, outline or line size; a hover-effects row fits a hover effect
// setting; a background colour fits a setting naming the background; otherwise every word of the property's shorthand
// is in the name (padding-top → fieldPadding) and the name does not spell a longer property ending in it.
export function nameFits( prop, attr ) {
	const { short } = splitProperty( prop );
	const p = words( short );
	const a = words( attr );
	if ( 'hover-effects' === short ) {
		return a.includes( 'hover' ) && a.some( ( t ) => HOVER_EFFECTS.includes( t ) );
	}
	const size = /^(?:(?:min|max)-)?(width|height)$/.exec( short );
	if ( size ) {
		return a.includes( size[ 1 ] ) && ! a.some( ( t ) => NOT_A_SIZE.includes( t ) );
	}
	if ( 'background-color' === short ) {
		return a.includes( 'background' ) || a.includes( 'bg' );
	}
	return p.every( ( t ) => a.includes( t ) ) && ! COMPOUND.some( ( c ) => c !== short && c.endsWith( `-${ short }` ) && a.join( '-' ).includes( c ) );
}

// Whether a setting (a database row or a roster attribute: { css_property, role }) fits a row: its css_property lists
// the property or its shorthand, or it is a MODIFIER of that property (sgs/container::columns carries
// `grid-template-columns:count`, a track count rather than the property's value, which a human can still reach for),
// or its name fits. A visibility toggle only fits a row whose draft or live hides; a unit companion (lineHeightUnit)
// never fits on its own. The namespace reading is `lib/db.mjs::listedProperties`, the same helper `candidates` uses, so
// `anim:duration` fits an animation-duration row here exactly where the resolver finds it, and neither side strips a
// colon blindly: a blanket strip turned `anim:duration` into an unmatchable `anim`.
export function settingFits( name, s, prop, values = [] ) {
	if ( ( 'boolean-visibility' === s.role && ! values.includes( 'none' ) ) || /Unit$/.test( name ) ) {
		return false;
	}
	const { short } = splitProperty( prop );
	const listed = listedProperties( s.css_property );
	const modifies = String( s.css_property || '' ).split( ',' ).map( ( x ) => modifierOf( x ) ).filter( Boolean );
	return listed.includes( prop ) || listed.includes( short ) || modifies.includes( prop ) || modifies.includes( short ) || nameFits( prop, name );
}

// Whether an extension of the roster (extension-roster.json) reaches a block, by its rule mode and block.json supports.
export function rosterApplies( ext, block, supports = {} ) {
	const r = ext.rule || {};
	const sgs = supports.sgs || {};
	const noClass = r.requiresClassName && false === supports.className;
	const hidden = ( sgs.hideExtensions || [] ).includes( r.hideSlug );
	const modes = {
		allowlist: () => ( sgs.enabledExtensions || [] ).includes( r.enabledSlug ) && ! noClass,
		universal: () => ! noClass && ! hidden,
		denylist: () => block.startsWith( 'sgs/' ) && ! hidden,
		flag: () => !! sgs[ r.flag ],
		named: () => ( r.blocks || [] ).includes( block ),
	};
	return !! modes[ r.mode ]?.();
}

// px difference live minus draft, or null when either side is not a plain number or px length.
export function delta( r ) {
	const num = ( v ) => ( 'number' === typeof v ? v : ( /^-?[\d.]+px$/.test( String( v ) ) ? parseFloat( v ) : null ) );
	const a = num( r.draft );
	const b = num( r.live );
	return null === a || null === b ? null : b - a;
}

// The ref of the pair a distance row is measured from or placed after (y-from-, y-after-, x-, right-), or null.
export function anchorOf( walk, r ) {
	const m = /^(?:y|x|right)-(?:from|after)-(.+)$/.exec( r.key || '' );
	if ( ! m ) {
		return null;
	}
	return ( walk?.runs || [] ).map( ( run ) => run.pairs?.[ m[ 1 ] ]?.live?.trace?.ref ).find( Boolean ) || null;
}

const LAYOUT_KEY = /^(margin|padding|gap|row-gap|column-gap|width|min-|max-|height|font-size|line-height|display|border-.*width|top|bottom|left|right|flex|grid|align|justify)/;
const axisOf = ( key ) => ( /^(y|h)\b/.test( key ) ? key[ 0 ] : ( /^(x|w|right)\b/.test( key ) ? key[ 0 ] : null ) );

// (d) One row's explanation by another open row at the same width and walker state, or null. A style or hover row
// follows the same property moved by the same amount on an ancestor block or the anchor pair's block (inherited or
// carried over). A box row follows a style row moved by the same amount (as a magnitude) on its own block, an
// ancestor, the anchor, or for a size row (h, w) a descendant; or a box row on the same axis moved by the same amount
// on an ancestor or the anchor; failing those, any open layout style row on its block, an ancestor or the anchor.
export function explainRow( r, open, { ancestorsOf = () => [], walk = null } = {} ) {
	const ups = [ ...( r.owners || [] ).map( ( o ) => o.ref ), ...( r.ref ? ancestorsOf( r.ref ) : [] ) ];
	const anchor = anchorOf( walk, r );
	const d = delta( r );
	const near = ( a, b ) => null !== a && null !== b && Math.abs( a - b ) <= PX_TOL;
	// One element is read by every pair it carries text or layout for, and each reading is stamped on that pair's block with
	// the block's path to the element (its owner frame). A row measuring this row's own element from an enclosing block
	// is never its parent; this row, when it is such a reading, follows the element's own row with the same values.
	const sameFrame = ( frames, ref, path ) => ( frames || [] ).some( ( o ) => o.ref === ref && o.path === path );
	const peers = open.filter( ( c ) => c !== r && c.width === r.width && c.state === r.state && keyOf( c ) !== keyOf( r ) && c.ref && ! sameFrame( r.owners, c.ref, c.path ) );
	const relation = ( c ) => ( c.ref === anchor && 'anchor' ) || ( ups.includes( c.ref ) && 'ancestor' ) || ( c.ref === r.ref && 'self' ) ||
		( r.ref && ancestorsOf( c.ref ).includes( r.ref ) ? 'descendant' : null );
	const hit = ( c, match ) => ( { parent: keyOf( c ), ref: c.ref, key: c.key, relation: 'same-element' === match ? 'same-element' : relation( c ), match, width: r.width, delta: d } );
	const own = peers.find( ( c ) => c.kind === r.kind && c.key === r.key && sameFrame( c.owners, r.ref, r.path ) && String( c.draft ) === String( r.draft ) && String( c.live ) === String( r.live ) );
	if ( own ) {
		return hit( own, 'same-element' );
	}
	if ( 'box' !== r.kind ) {
		const same = ( c ) => ( null !== d ? near( delta( c ), d ) : String( c.draft ) === String( r.draft ) && String( c.live ) === String( r.live ) );
		const c = peers.find( ( x ) => x.kind === r.kind && x.key === r.key && [ 'ancestor', 'anchor' ].includes( relation( x ) ) && same( x ) );
		return c ? hit( c, 'same-delta' ) : null;
	}
	const sized = /^(h|w)$/.test( r.key );
	const reach = ( c ) => [ 'ancestor', 'anchor', 'self' ].includes( relation( c ) ) || ( sized && 'descendant' === relation( c ) );
	const style = peers.find( ( c ) => 'style' === c.kind && reach( c ) && null !== d && near( Math.abs( delta( c ) ?? NaN ), Math.abs( d ) ) );
	if ( style ) {
		return hit( style, 'same-delta' );
	}
	// A size follows a descendant's size (a parent grows with its child); a position follows an ancestor's or the anchor's.
	const box = peers.find( ( c ) => 'box' === c.kind && axisOf( c.key ) === axisOf( r.key ) && ( sized ? 'descendant' === relation( c ) : [ 'ancestor', 'anchor' ].includes( relation( c ) ) ) && near( delta( c ), d ) );
	if ( box ) {
		return hit( box, 'same-delta' );
	}
	const layout = peers.find( ( c ) => 'style' === c.kind && LAYOUT_KEY.test( c.key ) && reach( c ) && 'descendant' !== relation( c ) );
	return layout ? hit( layout, 'layout-row' ) : null;
}

// (d2) A row with no open parent that follows a difference Bean accepted in the divergence ledger: { check:
// 'ledger-consequence', entry, parent, match, widths } when every row is explained, else null. Only two proofs count: a
// ledger-accepted row explaining it by the same amount or as the same element (explainRow over ctx.ledgerRows), or a
// position row placed after a node an entry accepts in full (property '*'). A walker accept is an equivalence rule, not
// a decision, and a bare layout row on an accepted node moves nothing provably, so neither ever attributes a row.
export function ledgerParent( issue, ctx ) {
	const rows = ctx.ledgerRows || [];
	const whole = ( ctx.ledger || [] ).filter( ( e ) => '*' === e.property );
	const hits = issue.rows.map( ( x ) => {
		const e = explainRow( x, rows, ctx );
		if ( e && [ 'same-delta', 'same-element' ].includes( e.match ) ) {
			const p = rows.find( ( c ) => keyOf( c ) === e.parent && c.width === x.width );
			return { entry: p.decided.id, parent: e.parent, match: e.match, width: x.width };
		}
		const anchor = anchorOf( ctx.walk, x );
		const ent = anchor && whole.find( ( w ) => w.node === anchor && ( '*' === w.state || w.state === x.state ) );
		return ent ? { entry: ent.id, parent: anchor, match: 'placed-after', width: x.width } : null;
	} );
	return hits.length && hits.every( Boolean ) ? { check: 'ledger-consequence', entry: hits[ 0 ].entry, parent: hits[ 0 ].parent, match: hits[ 0 ].match, widths: hits.map( ( h ) => h.width ) } : null;
}

// The rows a divergence-ledger entry accepted (the walker stamps decided.id on them), shaped as openRows shapes rows.
const ledgerRowsOf = ( walk ) => ( walk?.runs || [] ).flatMap( ( run ) => Object.entries( run.pairs || {} ).flatMap( ( [ pair, p ] ) =>
	( p.diffs || [] ).filter( ( d ) => d.accepted && d.decided?.id ).map( ( d ) => ( { ...d, pair, state: run.state, width: run.width } ) ) ) );

// (e) Transient: a motion property whose draft or live sits at an entrance's start value (opacity below 1, a
// translate) AND whose own snapshot shows an animation in flight when it was measured. The start-value shape alone is
// never enough: an element's resting opacity of 0.75 has the same shape and is a real difference. The evidence is the
// walker's `running` list for that side (the element's live animations, document.getAnimations) and, when the side
// records its keyframes, that they animate the row's property.
const MOTION = /^(transform|translate|scale|rotate|opacity|transition|animation)/;
const atStart = ( key, v ) => {
	const m = /^matrix\(([^)]+)\)$/.exec( String( v ) );
	if ( undefined === v || null === v || 'opacity' === key || m ) {
		return 'opacity' === key ? null !== v && Number( v ) < 1 : !! m && m[ 1 ].split( ',' ).slice( 4 ).some( ( n ) => 0 !== Number( n ) );
	}
	return /translate|matrix3d/.test( String( v ) ) || ( 'translate' === key && 'none' !== v && ! /^0px( 0px)?$/.test( String( v ) ) );
};
const KEYFRAME_PROP = { opacity: /opacity/, transform: /transform|translate|scale|rotate/, translate: /transform|translate/, scale: /transform|scale/, rotate: /transform|rotate/ };
const animating = ( snap, key ) => {
	if ( ! snap || ! ( snap.running || [] ).length ) {
		return false;
	}
	const frames = String( snap.keyframes ?? '' );
	const family = KEYFRAME_PROP[ key ];
	return ! family || ! frames || 'none' === frames || family.test( frames );
};
const snapshotOf = ( walk, r, side ) => ( walk?.runs || [] ).find( ( run ) => run.width === r.width && ( undefined === run.state || undefined === r.state || run.state === r.state ) && run.pairs?.[ r.pair ] )?.pairs[ r.pair ][ side ];
// A row whose pair compares two elements of very different size: at every width the row was read, one side's box is more
// than twice the other's in width or height AND the two hold different words (a draft header row paired with a whole live
// dialog). A size alone is not enough: a 44px tap area around the same words is one element made taller. The walker
// measured the wrong draft element, so no setting can be judged through the row: { check: 'mispaired', widths, sizes }
// or null.
const wordsOf = ( t ) => String( t ?? '' ).toLowerCase().replace( /\s+/g, ' ' ).trim();
const differentWords = ( a, b ) => '' !== wordsOf( a ) && '' !== wordsOf( b ) && wordsOf( a ) !== wordsOf( b );
export function mispairOf( issue, walk ) {
	const off = ( a, b ) => a > 0 && b > 0 && Math.max( a, b ) / Math.min( a, b ) > 2;
	const reads = issue.rows.map( ( r ) => {
		const ds = snapshotOf( walk, r, 'draft' );
		const ls = snapshotOf( walk, r, 'live' );
		const d = ds?.box;
		const l = ls?.box;
		return d && l && ( off( d.w, l.w ) || off( d.h, l.h ) ) && differentWords( ds.text, ls.text ) ? { width: r.width, size: `${ d.w }x${ d.h } draft, ${ l.w }x${ l.h } live` } : null;
	} );
	return reads.length && reads.every( Boolean ) ? { check: 'mispaired', widths: reads.map( ( x ) => x.width ), sizes: [ ...new Set( reads.map( ( x ) => x.size ) ) ].slice( 0, 4 ) } : null;
}
export function transientOf( rows, walk ) {
	const caught = ( r ) => [ 'draft', 'live' ].some( ( side ) => atStart( r.key, r[ side ] ) && animating( snapshotOf( walk, r, side ), r.key ) );
	const hits = rows.filter( ( r ) => 'style' === r.kind && MOTION.test( r.key ) && caught( r ) );
	return hits.length ? { check: 'transient', widths: hits.map( ( r ) => r.width ), values: hits.map( ( r ) => `${ r.draft }→${ r.live }` ).slice( 0, 4 ) } : null;
}

// (f) Used value: a width or height row whose draft declares no plain length at any measured width (the computed value
// is the box's used size).
export function usedValueOf( issue, walk ) {
	const r = issue.rows[ 0 ];
	const prop = cssProp( r.key );
	if ( 'style' !== r.kind || ! /^(width|height)$/.test( prop ) || ! r.pair ) {
		return null;
	}
	const { declared } = draftValues( walk, r.pair, prop, false, null, r.pseudo || null );
	const plain = Object.values( declared ).filter( plainLength );
	return plain.length ? null : { check: 'used-value', property: prop, declared };
}

// The resolver, read-only, on the issue's group as solve.mjs::writeRound builds it: the row's own block first (entrance
// start, then the property-to-setting engine), then its enclosing blocks (anyIndex) when the own block has none. Never
// writes the tree: a write is compared with the node's current value instead. Returns { gap, detail } or
// { writes, on, holds } (holds: the node already holds every written value).
export function resolveIssue( issue, ctx ) {
	const { walk, stateMap, nodeFor, calFor, refs = {}, groups = [] } = ctx;
	const resolver = ctx.resolver || ( ( input, cal ) => resolve( input, { db: ctx.db, snapshot: ctx.snapshot, calibration: cal, log: [] } ) );
	const r = issue.rows[ 0 ];
	const mapped = settingState( r, stateMap );
	const node = r.ref ? nodeFor( r.ref ) : null;
	if ( ! node || undefined === mapped ) {
		return undefined === mapped ? { gap: 'unmapped-state', detail: `walker state ${ r.state } is not mapped` } : { gap: 'unmapped', detail: r.ref ? `ref ${ r.ref } is not in any surface tree` : 'the row has no ref' };
	}
	if ( 'linked' === referenceOf( node, refs )?.kind ) {
		return { gap: 'linked', detail: `${ node.name } renders another post's block` };
	}
	const prop = cssProp( r.key );
	const walkerStates = [ ...new Set( issue.rows.map( ( x ) => x.state ) ) ];
	// The setting state Solve resolves the group in (lib/solve-rows.mjs::effectiveState, as writableGroups keys it).
	const state = effectiveState( walk, { ref: r.ref, path: r.path, prop: r.key, state: mapped, pair: r.pair, pseudo: r.pseudo || null, walkerStates }, stateMap );
	const g = { ref: r.ref, path: r.path, prop: r.key, state, pair: r.pair, pseudo: r.pseudo || null, rows: issue.rows, walkerStates };
	const { perWidth, fontPx, declared } = draftValues( walk, r.pair, r.key, 'hover' === state, walkerStates, g.pseudo );
	if ( USED_VALUES.includes( r.key ) ) {
		const ws = Object.keys( perWidth );
		if ( ! ws.length || ! ws.every( ( w ) => plainLength( declared[ w ] ) ) ) {
			return { gap: 'used-value', detail: `${ r.key } is the box's used size, not a declared value` };
		}
		ws.forEach( ( w ) => ( perWidth[ w ] = declared[ w ] ) );
	}
	const siblings = Object.fromEntries( groups.filter( ( o ) => o.ref === r.ref && o.path === r.path && ! o.state && o.prop !== r.key ).map( ( o ) => [ o.prop, draftValues( walk, o.pair, o.prop, false, o.walkerStates, o.pseudo ).perWidth ] ) );
	const attempt = ( on, onPath, anyIndex, tag = null ) => {
		const cal = calFor( on.name );
		// Every path this block's calibration knows: its measured elements, its settings' slots and reaches, and the
		// slots its DISCOVERED enum settings paint. Without that last source a row whose only evidence is a discovered
		// slot gaps `unmapped-element` here and never reaches lib/resolve.mjs::resolveDiscovered at all.
		const known = [ ...Object.keys( cal?.elements || {} ), ...Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ),
			...Object.values( cal?.discovered || {} ).flatMap( ( props ) => Object.values( props || {} ).flatMap( ( d ) => d.slots || [] ) ) ];
		const lp = ( p ) => ( anyIndex ? loose( p ) : p );
		if ( cal && ! known.map( lp ).includes( lp( onPath ) ) ) {
			return { gap: 'unmapped-element', detail: `${ on.name } path "${ onPath }" is not a calibrated element` };
		}
		return ( on === node && entranceStart( g, node, perWidth, groupRects( walk, g ) ) ) || resolver( { block: on.name, slot: onPath, anyIndex, tag, prop, state, perWidth, fontPx, current: on.attributes || {}, siblings }, cal );
	};
	let out = attempt( node, r.path, false );
	let on = { ref: r.ref, block: node.name, path: r.path, node };
	for ( const o of [ 'no-setting', 'unmapped-element' ].includes( out.gap ) ? r.owners || [] : [] ) {
		const n2 = nodeFor( o.ref );
		if ( ! n2 || 'linked' === referenceOf( n2, refs )?.kind ) {
			continue;
		}
		const r2 = attempt( n2, o.path, true, o.tag || null );
		if ( ! r2.gap ) {
			out = r2;
			on = { ref: o.ref, block: n2.name, path: o.path, node: n2 };
			break;
		}
	}
	// FR-47-8 / R-47-12, the canvas hop, strictly last: it runs only once the direct attempt AND the owners retry have
	// both exhausted, so a row that resolves today cannot change and deleting this one call restores the old behaviour.
	// Its ancestors are the row's own owners, so there is no tree walk and no new lookup.
	if ( out.gap ) {
		const hopFn = ctx.ancestorHop || resolveViaAncestor;
		const sameRow = ( x ) => cssProp( x.key ) === prop && settingState( x, stateMap ) === state;
		const ancestors = ( r.owners || [] ).map( ( o ) => {
			const n2 = nodeFor( o.ref );
			if ( ! n2 || 'linked' === referenceOf( n2, refs )?.kind ) {
				return null;
			}
			// The measured descendants of THIS ancestor: the owner path of every open row of the same property and state
			// that names this ancestor as an owner. Measured, never guessed, so an ancestor merely declaring the property
			// can never prove a write (R-47-5).
			const measured = [ ...new Set( ( ctx.open || [] ).filter( sameRow ).flatMap( ( x ) => ( x.owners || [] ).filter( ( o2 ) => o2.ref === o.ref ).map( ( o2 ) => o2.path ) ) ) ];
			return { ref: o.ref, block: n2.name, path: o.path, tag: o.tag || null, attributes: n2.attributes || {}, calibration: calFor( n2.name ), measured: measured.length ? measured : [ o.path ] };
		} ).filter( Boolean );
		const hop = hopFn( { block: node.name, slot: r.path, prop, state, perWidth, fontPx, current: node.attributes || {}, siblings },
			{ db: ctx.db, snapshot: ctx.snapshot, log: [], canvas: !! ctx.canvas, ancestors, measuredSlots: ancestors.flatMap( ( a ) => a.measured ) } );
		if ( hop?.writes ) {
			const held = hop.writes.every( ( w ) => holdsValue( nodeFor( hop.on.ref )?.attributes?.[ w.attr ], w.value, w.merge ) );
			return { writes: hop.writes, on: hop.on, holds: held, via: hop.via, cite: hop.cite };
		}
		// The citation is ADDED, never substituted: the resolver's own gap (ambiguous, no-setting, unmapped-element) is
		// what the route actually found and stays in the evidence, so a later recount of ambiguous rows still sees them.
		// Whether a citation reclassifies the row is the caller's decision, and it turns on the canvas flag alone.
		// A citation whose control cannot paint the row's element is dropped: the row then keeps the resolver's own gap.
		const cite = hop?.cite && citeReaches( hop.cite, issue, ctx ) ? hop.cite : null;
		return { gap: out.gap, detail: out.detail, ...( cite ? { cite, canvasSettable: !! hop.gap } : {} ) };
	}
	const holds = out.writes.every( ( w ) => holdsValue( on.node.attributes?.[ w.attr ], w.value, w.merge ) );
	return { writes: out.writes.map( ( w ) => ( { attr: w.attr, value: w.value, merge: w.merge } ) ), on: { ref: on.ref, block: on.block, path: on.path }, holds };
}

// Whether a current attribute value already holds a write: 'replace' compares whole values, 'deep' every leaf written.
export function holdsValue( current, value, merge = 'replace' ) {
	const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );
	if ( 'deep' === merge && isObj( value ) ) {
		return isObj( current ) && Object.entries( value ).every( ( [ k, v ] ) => holdsValue( current[ k ], v, 'deep' ) );
	}
	return JSON.stringify( current ) === JSON.stringify( value );
}

// (a) (b) (c) Settings that fit the issue's property: the block's database rows (css_property NULL rows included, by
// name) and the enum settings its calibration discovered painting the property on the element, the roster extensions that reach the block, and enclosing blocks whose calibration slots or reaches cover the
// element.
export function fittingSettings( issue, ctx ) {
	const r = issue.rows[ 0 ];
	const prop = cssProp( r.key );
	const { short } = splitProperty( prop );
	const values = issue.rows.flatMap( ( x ) => [ String( x.draft ), String( x.live ) ] );
	const block = r.ref ? ctx.nodeFor( r.ref )?.name : null;
	const state = settingState( r, ctx.stateMap );
	const out = [];
	if ( block ) {
		// A setting the block's calibration measured carries whether its slots or reaches cover the element; one that
		// does not (reaches: false) is listed but never decides.
		const cal = ctx.calFor( block );
		const covers = ( c ) => [ ...( c.slots || [ c.slot ] ), ...( c.reaches || [] ) ].map( loose ).includes( loose( r.path ) );
		for ( const row of ctx.attrRows( block ).filter( ( x ) => settingFits( x.attr_name, x, prop, values ) ) ) {
			const c = cal?.settings?.[ row.attr_name ];
			out.push( { check: 'attribute', block, setting: row.attr_name, css_property: row.css_property, css_element: row.css_element, css_state: row.css_state || null, source: row.source, ...( c ? { reaches: covers( c ) } : {} ) } );
		}
		// An enum setting with no css_property that calibration saw change the property on this element (a layout mode).
		for ( const [ attr, props ] of Object.entries( cal?.discovered || {} ) ) {
			if ( ( props[ prop ]?.slots || [] ).map( loose ).includes( loose( r.path ) ) ) {
				out.push( { check: 'discovered', block, setting: attr, values: Object.keys( props[ prop ].values || {} ) } );
			}
		}
		for ( const ext of ctx.roster || [] ) {
			if ( ! rosterApplies( ext, block, ctx.supportsFor( block ) ) ) {
				continue;
			}
			for ( const [ name, a ] of Object.entries( ext.attributes || {} ) ) {
				if ( settingFits( name, a, prop, values ) ) {
					out.push( { check: 'extension', extension: ext.id, setting: name, css_property: a.css_property || null, css_element: a.css_element || null } );
				}
			}
		}
	}
	for ( const o of r.owners || [] ) {
		const on = ctx.nodeFor( o.ref );
		const cal = on ? ctx.calFor( on.name ) : null;
		for ( const [ attr, s ] of Object.entries( cal?.settings || {} ) ) {
			const via = ( s.slots || [ s.slot ] ).map( loose ).includes( loose( o.path ) ) ? 'slot' : ( ( s.reaches || [] ).map( loose ).includes( loose( o.path ) ) ? 'reaches' : null );
			if ( via && ( s.property === prop || s.property === short || ( ! s.property && nameFits( prop, attr ) ) ) && ( s.state || null ) === ( state || null ) ) {
				out.push( { check: 'enclosing', ref: o.ref, block: on.name, setting: attr, via, path: o.path } );
			}
		}
	}
	return out;
}

// Where a control emits its CSS: the classes and pseudo-elements of the selectors that paint its property, or null when
// they are unknown. Unknown is never a refusal: a setting whose emission the source does not name (a root rule, a
// computed class) keeps the property-name match it always had, because refusing it would turn every such claim into a
// false framework gap. Two channels, the first that answers wins: ctx.emissionFor(block, setting, property) returning
// selector strings, then the block's PHP: every sgs_* function that emits the property and sits in a file that names
// the setting (the controls' own docblock) contributes the `.sgs-` classes and `::` pseudo-elements in its string
// literals, so the emission selector is read from the code that writes it, never kept in a table.
const selectorTargets = ( selectors ) => {
	const text = selectors.join( ' ' );
	const classes = [ ...new Set( text.match( /\.sgs-[\w-]+/g ) || [] ) ];
	const pseudos = [ ...new Set( text.match( /::[a-z-]+/g ) || [] ) ];
	return classes.length || pseudos.length ? { classes, pseudos } : null;
};
const literalsOf = ( body ) => [ ...body.matchAll( /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g ) ].map( ( m ) => m[ 1 ] ?? m[ 2 ] );
const rootEmission = ( body ) => /\$uid\s*\.\s*['"][\s{,:>]/.test( body );
export function emissionOf( cite, props, ctx ) {
	const named = ctx.emissionFor?.( cite.block, cite.setting, cite.property );
	if ( Array.isArray( named ) ) {
		return selectorTargets( named );
	}
	const emits = new RegExp( `(?:^|[^\\w-])(?:${ props.map( ( p ) => p.replace( /-/g, '\\-' ) ).join( '|' ) })\\s*:` );
	// A helper that carries the property in a variable ($property = 'transform' | 'scale', printed as `$property . ':'`)
	// never writes `transform:` literally, so the property is read from its string literals instead.
	const emitsByVariable = ( text ) => /\.\s*':'/.test( text ) && literalsOf( text ).some( ( l ) => props.includes( l ) );
	const found = Object.values( ctx.helpers?.functions || {} ).filter( ( f ) => ( emits.test( f.text ) || emitsByVariable( f.text ) ) && ( ctx.helpers.files?.[ f.file ] || '' ).includes( cite.setting ) && ! rootEmission( f.text ) );
	return found.length ? selectorTargets( found.flatMap( ( f ) => literalsOf( f.text ) ) ) : null;
}

// Whether the selectors a control emits to can match the row's element. The element's classes are the subject of the
// row's path (and of its path inside the cited block when that block encloses it), or the block root's own classes for
// a root row; a pseudo-element target matches only a row of that pseudo on the cited block itself.
export function reachesElement( cite, issue, ctx ) {
	const r = issue.rows[ 0 ];
	const { short } = splitProperty( cssProp( r.key ) );
	// A live measurement decides first (R-47-12): confirm-canvas.mjs enumerated every rule that could govern this
	// property on this element, so a REFUTED or NO-RULE family is definitively unreachable whatever the source says.
	const measured = ctx.measuredReach?.( cite.block, cite.setting, cssProp( r.key ), cite.ref ?? null );
	if ( 'boolean' === typeof measured ) {
		return measured;
	}
	const em = emissionOf( cite, [ cssProp( r.key ), short ], ctx );
	if ( ! em ) {
		// FAILS OPEN, deliberately and visibly, for a citation neither measured nor readable from the source: it is
		// accepted so the row is not called a framework gap on an unassessed claim. `reachabilityVerified` records
		// that it was not tested. A source string search cannot name an emission written by a class method or a
		// render.php, which is why measured verdicts come first (CANVAS-SETTABLE-CONFIRMATION.md).
		return true;
	}
	const own = ctx.nodeFor( r.ref )?.name || '';
	const slug = own.replace( /^[^/]+\//, '' );
	const subject = ( path ) => ( String( path || '' ).match( /\.sgs-[\w-]+/g ) || [] ).pop();
	const classes = [ subject( r.path ), subject( ( r.owners || [] ).find( ( o ) => o.ref === cite.ref )?.path ), ! r.path && slug ? `.sgs-${ slug }` : null ].filter( Boolean );
	return em.classes.some( ( c ) => classes.includes( c ) ) || ( !! r.pseudo && em.pseudos.includes( r.pseudo ) && r.ref === cite.ref );
}
const citeReaches = ( cite, issue, ctx ) => reachesElement( { block: cite.block, ref: cite.ref ?? null, setting: cite.setting, property: cite.property }, issue, ctx );

// Whether reachesElement actually TESTED this citation or fell through its fail-open branch. A citation that was
// never assessed is not evidence, and recording it as though it were is how an untested claim reads as a verdict.
export function reachabilityVerified( cite, issue, ctx ) {
	const r = issue.rows[ 0 ];
	const { short } = splitProperty( cssProp( r.key ) );
	if ( 'boolean' === typeof ctx.measuredReach?.( cite.block, cite.setting, cssProp( r.key ) ) ) {
		return true;
	}
	return !! emissionOf( { block: cite.block, ref: cite.ref ?? null, setting: cite.setting, property: cite.property }, [ cssProp( r.key ), short ], ctx );
}

// The ctx.measuredReach lookup from confirm-canvas.mjs's results (an array of { block, setting, property, verdict,
// sheets }). REFUTED and NO-RULE are definitive: false. Anything else answers undefined, so the source gate and its
// fail-open still decide: CONFIRMED and VAR-CHANNEL are "not refuted", not proven; ABSENT and NO-URL were never
// read; and a read that skipped any stylesheet cannot refute, since the skipped sheet may hold the cited rule.
export function measuredReachFrom( results ) {
	const verdicts = new Map();
	for ( const rec of Array.isArray( results ) ? results : [] ) {
		if ( [ 'REFUTED', 'NO-RULE' ].includes( rec.verdict ) && 0 === ( rec.sheets?.skipped ?? -1 ) ) {
			verdicts.set( `${ rec.block }|${ rec.setting }|${ rec.property }`, false );
		}
	}
	return ( block, setting, property ) => verdicts.get( `${ block }|${ setting }|${ property }` );
}

// FR-47-8 (c). On a canvas surface the block that can hold a row's property need not be the attributed block or even
// an ancestor: the author composes the canvas from whatever blocks suit, so any block ALREADY IN that tree which
// declares the property can hold it. Returns the citation for the nearest such block (the row's enclosing blocks
// first, nearest first, then the surface's other blocks from ctx.canvasBlocks()), or null.
// A declaration means the block's own database row lists that CSS property, or modifies it, IN THE ROW'S STATE. A name
// that merely reads like the property is not a declaration: that is the false-positive citation this rule must avoid,
// because an ancestor declaring the same property NAME proves nothing about paint. It is a classification only — the
// route cannot decide which sibling should own the value, so it refuses F and hands the row to a human with the
// citation, which Session C2 then tests on the live site.
export function canvasSettable( issue, ctx ) {
	if ( ! ctx.canvas ) {
		return null;
	}
	const r = issue.rows[ 0 ];
	const prop = cssProp( r.key );
	const { short } = splitProperty( prop );
	const state = settingState( r, ctx.stateMap );
	const enclosing = ( r.owners || [] ).map( ( o ) => ( { ref: o.ref, name: ctx.nodeFor( o.ref )?.name, where: 'ancestor' } ) );
	const inCanvas = ( ctx.canvasBlocks?.() || [] ).map( ( b ) => ( { ref: b.ref, name: b.name, where: 'sibling' } ) );
	// The row's own block never cites itself: `fittingSettings` already reports what it declares.
	const seen = new Set( [ r.ref ? ctx.nodeFor( r.ref )?.name : null ] );
	for ( const b of [ ...enclosing, ...inCanvas ] ) {
		if ( ! b.name || seen.has( b.name ) ) {
			continue;
		}
		seen.add( b.name );
		const fit = ( ctx.attrRows( b.name ) || [] ).find( ( x ) => null !== x.css_property && ( x.css_state || null ) === ( state || null ) &&
			( listedProperties( x.css_property ).some( ( p ) => p === prop || p === short ) || [ prop, short ].includes( modifierOf( x.css_property ) ) ) &&
			reachesElement( { block: b.name, ref: b.ref ?? null, setting: x.attr_name }, issue, ctx ) );
		if ( fit ) {
			return { check: 'canvas-settable', ref: b.ref ?? null, block: b.name, setting: fit.attr_name, property: fit.css_property, via: 'declared', where: b.where };
		}
	}
	return null;
}

// One issue's verdict. Order: a row with no live element is a measuring artefact (W); a box row is a consequence (W) or unexplained (U); an entrance the tree can start on load
// (lib/entrance.mjs) is T; then artefacts (transient, used value, consequence: W); then the resolver (a new value it
// would write: T; blocked by the guard, a shared-setting conflict or a state conflict: W; the setting already holds the draft value, or Solve wrote it
// and paint still differed: F, a hardcode); then a fitting setting (W; one calibration measured not reaching the
// element never decides); then the resolver's no-setting (F); any other resolver gap is a route gap (W).
export function triageIssue( issue, ctx ) {
	const r = issue.rows[ 0 ];
	const evidence = [];
	const verdict = ( cls, decidedBy, extra = {} ) => ( { key: issue.key, ref: r.ref ?? null, pair: r.pair ?? null, path: r.path ?? null, block: ( r.ref && ctx.nodeFor( r.ref )?.name ) || null, kind: r.kind, property: r.key,
		widths: [ ...new Set( issue.rows.map( ( x ) => x.width ) ) ].sort( ( a, b ) => a - b ), solveClass: issue.solveClass, solveReason: issue.rows.find( ( x ) => x.reason )?.reason ?? null, class: cls, decidedBy, evidence, ...extra } );
	const explained = issue.rows.map( ( x ) => explainRow( x, ctx.open, ctx ) );
	const conseq = explained.every( Boolean ) ? { check: 'consequence', ...explained[ 0 ], widths: explained.map( ( e ) => e.width ) } : null;
	if ( ! conseq && explained.some( Boolean ) ) {
		evidence.push( { check: 'consequence', partial: true, widths: explained.filter( Boolean ).map( ( e ) => e.width ), parent: explained.find( Boolean ).parent } );
	}
	// A row measured in a walker state the surface maps to no setting state is a route gap whatever its property: the
	// route cannot resolve, write or disprove it until the flow is mapped (FR-47-7), so F cannot be assessed through it.
	if ( UNMAPPED === issue.solveClass ) {
		evidence.unshift( { check: 'unmapped-state', states: [ ...new Set( issue.rows.map( ( x ) => x.state ) ) ],
			mappedStates: Object.keys( ctx.stateMap || {} ), detail: 'the surface maps no setting state to this walker state (FR-47-7 not built)' } );
		return verdict( 'W', 'unmapped-state' );
	}
	// A content row carries the page's words, an element present on one side only, or a link the other side does not
	// carry. No walker state is unmapped for it and the property-to-setting engine holds no words, so a framework gap
	// cannot be assessed through it either: it is a route gap until the text channel is built (FR-47-2).
	if ( CONTENT === issue.solveClass ) {
		evidence.unshift( { check: 'content', kinds: [ ...new Set( issue.rows.map( ( x ) => x.kind ) ) ], keys: [ ...new Set( issue.rows.map( ( x ) => x.key ) ) ],
			detail: 'the row is page content, not a painted property: the route writes no words yet (FR-47-2), so no setting can be proven missing through it' } );
		return verdict( 'W', 'content' );
	}
	// A row whose live value is empty at every width has no live element behind it: the walker never found one, so there
	// is no difference to classify and no setting lookup can say anything true about it. A measuring artefact (W).
	if ( issue.rows.every( ( x ) => null === x.live || undefined === x.live ) ) {
		evidence.unshift( { check: 'no-live-element', detail: `${ issue.rows.length } rows, live value empty at every width: the walker found no live element` } );
		return verdict( 'W', 'no-live-element' );
	}
	// A row with a side the walker never read at any width compares no paint: the resolver finding the node "holding" a
	// value proves nothing against an absent draft value (Solve's classify gives the same rows `unmeasured-side`).
	const unread = [ 'draft', 'live' ].filter( ( side ) => issue.rows.every( ( x ) => null == x[ side ] ) );
	if ( issue.rows.every( ( x ) => null == x.draft || null == x.live ) && unread.length ) {
		evidence.unshift( { check: 'unmeasured-side', sides: unread, detail: `${ issue.rows.length } rows, the ${ unread.join( ' and ' ) } value was never read at any width: no paint is compared` } );
		return verdict( 'W', 'unmeasured-side' );
	}
	const mispaired = mispairOf( issue, ctx.walk );
	if ( mispaired ) {
		evidence.unshift( mispaired );
		return verdict( 'W', 'mispaired' );
	}
	// An enclosing block's reading of an element whose own row is open: one issue, owned by that row, whatever its kind.
	if ( conseq && explained.every( ( e ) => 'same-element' === e.match ) ) {
		evidence.unshift( conseq );
		return verdict( 'W', 'same-element' );
	}
	const ledgered = conseq ? null : ledgerParent( issue, ctx );
	if ( ledgered ) {
		evidence.unshift( ledgered );
		return verdict( 'L', 'ledger-consequence' );
	}
	if ( 'box' === r.kind ) {
		return conseq ? ( evidence.unshift( conseq ), verdict( 'W', 'consequence' ) ) : verdict( 'U', 'box-unexplained' );
	}
	const transient = transientOf( issue.rows, ctx.walk );
	const used = usedValueOf( issue, ctx.walk );
	[ transient, used, conseq ].filter( Boolean ).forEach( ( e ) => evidence.push( e ) );
	const res = resolveIssue( issue, ctx );
	const groupKey = `${ r.ref }|${ r.path }|${ r.key }|${ settingState( r, ctx.stateMap ) || '' }`;
	// Solve's own outcome for the group: the guard blocked the write (breaks-layout), a shared setting could not hold
	// both elements' values (conflict), or the walker states mapped to one setting state read different draft values
	// (state-conflict); or Solve already wrote the value the resolver would write and paint still differed.
	const blocked = [ 'breaks-layout', 'conflict', 'state-conflict' ].find( ( x ) => x === ctx.reportGaps?.[ groupKey ]?.gap ) || null;
	const tried = res.writes ? ( ctx.reportWrites || [] ).find( ( w ) => ! w.reverted && w.ref === res.on.ref && res.writes.some( ( x ) => x.attr === w.attr && holdsValue( w.after, x.value, x.merge ) ) ) : null;
	evidence.push( res.gap ? { check: 'resolver', gap: res.gap, detail: res.detail } : { check: 'resolver', wouldWrite: res.writes.map( ( w ) => w.attr ), on: res.on, holds: res.holds, ...( blocked ? { blocked } : {} ), ...( tried ? { solveWrote: tried.attr, group: tried.group } : {} ) } );
	const fits = fittingSettings( issue, ctx );
	evidence.push( ...fits );
	const entrance = res.writes && ! res.holds && res.writes.some( ( w ) => 'sgsAnimationStart' === w.attr );
	const withSource = () => ( { source: sourcePass( issue, [ ...( res.writes || [] ).map( ( w ) => w.attr ), ...fits.map( ( f ) => f.setting ) ], ctx ) } );
	if ( entrance ) {
		return verdict( 'T', 'entrance-start' );
	}
	const artefact = transient || used || conseq;
	if ( artefact ) {
		return verdict( 'W', artefact.check, 'hardcode' === issue.solveClass ? withSource() : {} );
	}
	if ( res.writes ) {
		if ( blocked ) {
			return verdict( 'W', 'resolver-blocked', withSource() );
		}
		return res.holds || tried ? verdict( 'F', 'hardcode', withSource() ) : verdict( 'T', 'resolver-writes' );
	}
	const deciding = fits.filter( ( f ) => false !== f.reaches );
	if ( deciding.length ) {
		// An attribute fit calibration never measured fits by name only: its reach is unknown, which is a calibration gap
		// (the route cannot tell whether the setting paints this element), not a setting Solve failed to write.
		const by = 'attribute' === deciding[ 0 ].check && undefined === deciding[ 0 ].reaches ? 'uncalibrated-fit' : deciding[ 0 ].check;
		return verdict( 'W', by, 'hardcode' === issue.solveClass ? withSource() : {} );
	}
	// FR-47-8 (c) / R-47-12. The resolver hop's citation (an enclosing block or the block-context channel) and the
	// canvas roster citation (any block already in that tree) are the same claim reached from two directions; the first
	// that holds wins. On a canvas the row is a route gap, `canvas-settable`, never a framework gap. Off a canvas the
	// citation is evidence only and the class is untouched: the five ordinary pages are the route's own output, so a
	// missing setting there is a real gap, and reclassifying it would mask one and corrupt Session C2's worklist.
	const settable = res.cite || canvasSettable( issue, ctx );
	if ( settable ) {
		// Say whether the reachability gate tested this citation or fell through its fail-open branch, so a claim
		// that was never assessed cannot read as one that was.
		evidence.push( { ...settable, reachabilityVerified: reachabilityVerified( settable, issue, ctx ) } );
	}
	if ( settable && ctx.canvas ) {
		return verdict( 'W', 'canvas-settable', withSource() );
	}
	if ( 'no-setting' === res.gap ) {
		return verdict( 'F', 'no-setting', withSource() );
	}
	return verdict( 'W', `resolver-${ res.gap }`, 'hardcode' === issue.solveClass ? withSource() : {} );
}

// The per-issue ctx triageIssue and canvasSettable read: the surface ctx plus the walk, its open rows, its writable
// groups and Solve's own gaps and writes. Exported so confirm-canvas.mjs's candidates mode asks canvasSettable exactly
// what triage asks it.
export function issueContext( report, walk, ctx ) {
	return { ...ctx, walk, open: openRows( walk ).filter( isIssue ), ledgerRows: ledgerRowsOf( walk ), groups: writableGroups( walk, ctx.stateMap ).groups, reportGaps: ctx.reportGaps ?? report.gaps, reportWrites: ctx.reportWrites ?? report.writes };
}

// Every issue of a Solve report: { verdicts, counts }. walk: the final walker report the Solve report classified.
// ctx: { stateMap, nodeFor(ref), ancestorsOf(ref), attrRows(block), roster, supportsFor(block), calFor(block),
// readSource(slug, file), helpers? and blockPhp?(slug) (lib/triage-source.mjs::sourcePass), refs?, resolver?(input, calibration) or db and snapshot, reportGaps?, reportWrites?,
// canvas (FR-47-8: the surface's manifest flag) and canvasBlocks() (every block already in that canvas tree, as
// [ { ref, name } ]), ancestorHop? (lib/resolve.mjs::resolveViaAncestor, replaceable in tests) }.
export function triage( report, walk, surface, ctx ) {
	const full = issueContext( report, walk, ctx );
	const verdicts = issuesOf( report, surface ).map( ( issue ) => triageIssue( issue, full ) );
	const counts = Object.fromEntries( TRIAGE_CLASSES.map( ( c ) => [ c, verdicts.filter( ( v ) => v.class === c ).length ] ) );
	return { verdicts, counts };
}
