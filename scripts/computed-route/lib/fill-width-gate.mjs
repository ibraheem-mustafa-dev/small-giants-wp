// Width-gated content (Spec 48 FR-48-50, FR-48-79): content the draft's logic shows or hides by viewport width (an sc-if on
// `isM`, on `w >= 1260`) is written as a hiding rule on the block that holds it, never dropped. The fact record holds each
// sc-if's width condition (lib/read-logic-conditions.mjs::widthConditions, `elements[key].logic.width`) and each element's
// enclosing sc-ifs (`template.membership.scIf`). For a skeleton node whose draft element sits inside gated sc-ifs:
//   1. the widths the content is hidden at are the complement of the intersection of the gates' shown widths;
//   2. a boundary at or within 5% of a tier (768, 1024) snaps to the tier, with a `breakpoint-snap` ledger entry (distance in px);
//   3. a block that draws its own alternative below a threshold holds a numeric breakpoint setting (the framework DB: the nav's
//      collapsePoint draws its burger under it); when the hidden range is [0, threshold) that setting is written with the
//      threshold (or left when the node holds it already) and no hiding flag, which would hide the alternative too. A node
//      the skeleton marks `ownAlternativeBelow` ({ setting, scope: 'theme-mod' }: the filter rail, whose alternative is the
//      theme's own drawer, opened from the rail's element itself, with its threshold in a theme option) is step 3 as well: no
//      hiding flag, the draft's own threshold (px, never snapped to a tier) written as `ownAlternativeBelow.value` on the
//      node for the site build to write to the named theme option, and the node pinned at the desktop tier only;
//   4. otherwise a hidden range whose boundaries are all tiers writes the conditional-visibility flags (sgsHideOnMobile,
//      sgsHideOnTablet, sgsHideOnDesktop; the block must hold them, by the framework DB);
//   5. otherwise a bounded `@media` rule in the block's Additional CSS (`sgsCustomCss`, scoped to the instance by
//      includes/custom-css.php), with the scope key `sgsCustomCssId` and the label `sgsCustomCssNote` naming the rule.
// A skeleton node whose parent is gated the same way is not written again (the parent hides it). Both branches of a width
// alternative are nodes of the skeleton, each hidden on the other's widths. A condition whose width part is only part of the
// condition (`partial`) hides only where its width part is false.

import { setAttr, refOf } from './tree.mjs';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { templateKeyOf, templateKeyOfSelector } from './fact-key.mjs';
import { DECISIONS_FILE } from './skeleton-facts.mjs';
import { PRESENT } from './fill-read.mjs';
import { thresholdsOf } from './skeleton-context.mjs';
import path from 'node:path';

export const TIERS = [ 768, 1024 ];
export const SNAP_TOLERANCE = 0.05;
export const HIDE_ATTR = { mobile: 'sgsHideOnMobile', tablet: 'sgsHideOnTablet', desktop: 'sgsHideOnDesktop' };
// The width range each tier covers: [ start, end ).
export const TIER_RANGES = { mobile: [ 0, TIERS[ 0 ] ], tablet: [ TIERS[ 0 ], TIERS[ 1 ] ], desktop: [ TIERS[ 1 ], Infinity ] };

const CMP = { '<': ( w, n ) => w < n, '<=': ( w, n ) => w <= n, '>': ( w, n ) => w > n, '>=': ( w, n ) => w >= n, '==': ( w, n ) => w === n };

// Whether a width condition holds (shows its content) at width `w`.
export function holds( c, w ) {
	if ( c.all ) {
		return c.all.every( ( x ) => holds( x, w ) );
	}
	if ( c.any ) {
		return c.any.some( ( x ) => holds( x, w ) );
	}
	if ( undefined !== c.bp ) {
		return c.is ? holds( c.when, w ) : ! holds( c.when, w );
	}
	return CMP[ c.w ]( w, c.n );
}

// The widths at which a condition changes, as whole pixels.
function boundaries( c ) {
	if ( c.all || c.any ) {
		return ( c.all || c.any ).flatMap( boundaries );
	}
	if ( undefined !== c.bp ) {
		return boundaries( c.when );
	}
	return [ '>', '<=' ].includes( c.w ) ? [ c.n + 1 ] : '==' === c.w ? [ c.n, c.n + 1 ] : [ c.n ];
}

// The ranges [ lo, hi ) of widths from 0 at which a condition shows its content, merged.
export function shownRanges( c ) {
	const pts = [ ...new Set( [ 0, ...boundaries( c ).filter( ( b ) => b > 0 ) ] ) ].sort( ( a, b ) => a - b );
	const out = [];
	pts.forEach( ( lo, i ) => {
		if ( ! holds( c, lo ) ) {
			return;
		}
		const hi = pts[ i + 1 ] ?? Infinity;
		out.length && out.at( -1 )[ 1 ] === lo ? ( out.at( -1 )[ 1 ] = hi ) : out.push( [ lo, hi ] );
	} );
	return out;
}

// The overlap of two lists of ranges.
export function intersect( a, b ) {
	return a.flatMap( ( [ l1, h1 ] ) => b.map( ( [ l2, h2 ] ) => [ Math.max( l1, l2 ), Math.min( h1, h2 ) ] ).filter( ( [ l, h ] ) => l < h ) );
}

// The complement of a list of ranges within [ 0, Infinity ).
export function complement( ranges ) {
	const out = [];
	let at = 0;
	for ( const [ lo, hi ] of [ ...ranges ].sort( ( x, y ) => x[ 0 ] - y[ 0 ] ) ) {
		lo > at && out.push( [ at, lo ] );
		at = Math.max( at, hi );
	}
	Infinity > at && out.push( [ at, Infinity ] );
	return out;
}

// FR-48-50 step 1: the tier a threshold snaps to, with its distance in px, or null (no tier within 5% of the tier, or the
// threshold is the tier). The nearest tier wins.
export function snapThreshold( t ) {
	const near = TIERS.map( ( tier ) => ( { tier, distance: Math.abs( t - tier ) } ) ).sort( ( a, b ) => a.distance - b.distance )[ 0 ];
	return near.distance > 0 && near.distance <= SNAP_TOLERANCE * near.tier ? near : null;
}

// The template key a finder names (`<chain>/<n>#<copy>` -> `<component>/<n>`, the served root named by rootComponent), or null.
// A finder is a `{ tpl }` instance key or a selector string (a Site Info row node: its last data-dc-tpl, in the root's key space).
export const tplKey = ( finder, rootComponent = null ) => 'string' === typeof finder ? templateKeyOfSelector( finder, rootComponent ) : templateKeyOf( finder?.tpl, rootComponent );

// The widths a template element is shown at, from the width conditions of its enclosing sc-ifs: { shown, via } or null
// when no enclosing sc-if is gated by width.
export function shownAt( facts, key ) {
	const gates = ( facts?.elements?.[ key ]?.template?.membership?.scIf || [] ).filter( ( g ) => facts.elements[ g.key ]?.logic?.width );
	// The element's own `display` binding picked by width is a gate of the same kind (lib/read-logic-conditions.mjs::widthConditions, `displayWidth`).
	const own = facts?.elements?.[ key ]?.logic?.displayWidth ? [ { width: facts.elements[ key ].logic.displayWidth, via: facts.elements[ key ].logic.displayVia } ] : [];
	if ( ! gates.length && ! own.length ) {
		return null;
	}
	const shown = [ ...gates.map( ( g ) => facts.elements[ g.key ].logic.width ), ...own.map( ( o ) => o.width ) ].map( ( w ) => shownRanges( w ) ).reduce( ( a, b ) => intersect( a, b ) );
	return { shown, via: [ ...gates.map( ( g ) => facts.elements[ g.key ].logic.via || g.value ), ...own.map( ( o ) => o.via || 'display' ) ] };
}

// The snapped hidden ranges of a shown list: { hidden: [ [ lo, hi ] ], snaps: [ { draft, tier, distance } ] }.
export function hiddenRanges( shown ) {
	const snaps = [];
	const snap = ( t ) => {
		if ( 0 === t || Infinity === t ) {
			return t;
		}
		const s = snapThreshold( t );
		s && snaps.push( { draft: t, tier: s.tier, distance: s.distance } );
		return s ? s.tier : t;
	};
	const hidden = complement( shown ).map( ( [ lo, hi ] ) => [ snap( lo ), snap( hi ) ] ).filter( ( [ lo, hi ] ) => lo < hi );
	return { hidden, snaps };
}

// The tiers a list of hidden ranges covers, or null when a boundary is off-tier.
export function tiersOf( hidden ) {
	const edges = new Set( [ 0, ...TIERS, Infinity ] );
	if ( ! hidden.every( ( [ lo, hi ] ) => edges.has( lo ) && edges.has( hi ) ) ) {
		return null;
	}
	return Object.keys( TIER_RANGES ).filter( ( t ) => hidden.some( ( [ lo, hi ] ) => lo <= TIER_RANGES[ t ][ 0 ] && hi >= TIER_RANGES[ t ][ 1 ] ) );
}

// The scoped @media rule over a range (width in whole px; the rule `&` is the instance, includes/custom-css.php); the body
// hides the instance unless the caller gives its own.
export function mediaRule( [ lo, hi ], body = '& { display: none; }' ) {
	const cond = [ lo > 0 ? `(min-width: ${ lo }px)` : null, Infinity > hi ? `(max-width: ${ hi - 1 }px)` : null ].filter( Boolean ).join( ' and ' );
	return `@media ${ cond } { ${ body } }`;
}

// The scope key of a node's Additional CSS (`sgsCustomCssId`; includes/custom-css.php::sgs_custom_css_uid prints it as the
// class `sgs-c-<key>` and accepts 4 to 16 lowercase letters and digits). A page draws several surfaces at once (the header,
// the footer, a drawer and the page itself), so a key made from a node's position in its own tree repeats across them and
// one surface's rule lands on another's element: the key is a hash of the node's own ref (`cr-ref-<surface>-<n>`,
// lib/tree.mjs::addRefs), which no other node of the site carries. A node with no ref keeps `fallback`.
export function scopeKeyOf( node, fallback ) {
	const ref = refOf( node );
	return ref ? `c${ createHash( 'sha1' ).update( ref ).digest( 'hex' ).slice( 0, 11 ) }` : String( fallback ).slice( 0, 16 );
}

// The three settings that hold a scoped rule on a node (Additional CSS, its scope key and its label): [ { attr, value, prop } ]
// to write, appending to what the node holds; empty when the node already holds the rule text. Every writer of a scoped
// rule (the width gate, the width ladder) goes through this one function.
export function scopedCssPuts( node, { css, label, index, why } ) {
	const had = ( a ) => node.attributes?.[ a ] || '';
	if ( had( 'sgsCustomCss' ).includes( css ) ) {
		return [];
	}
	return [
		{ attr: 'sgsCustomCss', value: [ had( 'sgsCustomCss' ), css ].filter( Boolean ).join( ' ' ), prop: `${ why }: scoped @media rule` },
		{ attr: 'sgsCustomCssId', value: had( 'sgsCustomCssId' ) || scopeKeyOf( node, `wgate${ index }` ), prop: `${ why }: scope key` },
		{ attr: 'sgsCustomCssNote', value: [ had( 'sgsCustomCssNote' ), label ].filter( Boolean ).join( '; ' ), prop: `${ why }: label` },
	];
}

// The setting each block draws its own alternative below (the nav's burger under its collapse point), as the skeleton
// rules name it: data/skeleton-decisions.json `rules.navigation.collapseAttribute`, { block: attr }.
export const collapseAttributes = () => JSON.parse( fs.readFileSync( DECISIONS_FILE, 'utf8' ) ).rules?.navigation?.collapseAttribute ?? {};

// The numeric collapse setting a block holds, by framework-DB query: the attribute the skeleton rules name for the block,
// when the block holds it as a number; null for any other block, whatever other breakpoint-like numbers it holds.
export function ownBreakpoint( db, block, collapse = collapseAttributes() ) {
	const attr = collapse[ block ];
	return attr && db.prepare( "SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ? AND attr_type = 'number'" ).get( block, attr ) ? attr : null;
}

// Whether a block holds an attribute, by framework-DB query.
const holdsAttr = ( db, block, attr ) => !! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );

// The pin setting of a node whose own alternative takes over below a threshold: pinned at the desktop tier only (the
// alternative, a drawer, is no sticky column); { desktop: <as written>, tablet: 'none', mobile: 'none' }, or null when the node
// holds no pin to trim.
export function desktopOnlyPin( pin ) {
	if ( ! pin || 'object' !== typeof pin || Array.isArray( pin ) || ! Object.keys( pin ).length ) {
		return null;
	}
	const desktop = pin.desktop ?? pin.base ?? [ pin.tablet, pin.mobile ].find( ( v ) => v && 'none' !== v );
	const out = { ...( desktop && 'none' !== desktop ? { desktop } : {} ), tablet: 'none', mobile: 'none' };
	return JSON.stringify( out ) === JSON.stringify( pin ) ? null : out;
}

// The widths the draft's own element, or the nearest ancestor node that has one, goes from not rendered to rendered between, as
// the read's sweep saw them (every 16px): [ last width without it, first width with it ], or null when no node on the way up shows
// that one step. nodes: skeletonNodes(); index: the node's tree index.
export function presenceStep( reads, nodes, index ) {
	const byIndex = new Map( nodes.map( ( n ) => [ n.index, n ] ) );
	for ( let n = byIndex.get( index ); n; n = byIndex.get( n.parent ) ) {
		for ( const t of ( n.targets || [] ).filter( ( x ) => '' === ( x.slot ?? '' ) ) ) {
			const series = reads?.sweep?.[ t.id ]?.[ PRESENT ] || [];
			const steps = series.slice( 1 ).map( ( e, i ) => [ series[ i ], e ] ).filter( ( [ a, b ] ) => 'absent' === a.value && 'present' === b.value );
			if ( 1 === steps.length ) {
				return [ steps[ 0 ][ 0 ].width, steps[ 0 ][ 1 ].width ];
			}
		}
	}
	return null;
}

// The width thresholds the draft's own code uses (intake.json `breakpoints`, lib/skeleton-context.mjs::thresholdsOf); [] when the
// client has no intake. buildDir: sites/<client>/build.
export function draftThresholds( buildDir ) {
	const file = path.join( buildDir, 'intake', 'intake.json' );
	return fs.existsSync( file ) ? thresholdsOf( JSON.parse( fs.readFileSync( file, 'utf8' ) ).breakpoints ) : [];
}

// A divergence-ledger entry for one snap (FR-48-50 step 1), numbered after the entries already in the ledger.
export function snapEntry( { scope, ref, snap, entries, date } ) {
	const reason = `the draft's width threshold ${ snap.draft }px snapped to the ${ snap.tier }px tier (distance ${ snap.distance }px, within 5% of the tier)`;
	if ( entries.some( ( e ) => e.node === ref && 'breakpoint' === e.property && e.reason === reason ) ) {
		return null;
	}
	const next = 1 + Math.max( 0, ...entries.map( ( e ) => Number( String( e.id ).replace( /^D-/, '' ) ) || 0 ) );
	return { id: `D-${ next }`, scope, node: ref, state: '*', property: 'breakpoint', expected: { rule: 'breakpoint-snap' }, reason, decided: `${ date } FR-48-50`, snap };
}

// The widths a skeleton node's content is shown at, or null when nothing gates it. A width-variant instance (the skeleton
// writes one instance per variation of content no single setting holds: `widthShown` on the variant, `widthVariants` on
// the default instance) is shown where its own element is: the enclosing sc-if's range when the fact record has one, else the
// tiers it was read at. The default instance is shown where no variant is.
export const tierRanges = ( widths ) => widths.map( ( w ) => ( { 375: TIER_RANGES.mobile, 768: TIER_RANGES.tablet, 1440: TIER_RANGES.desktop } )[ w ] ).filter( Boolean ).sort( ( a, b ) => a[ 0 ] - b[ 0 ] ).reduce( ( out, r ) => ( out.length && out.at( -1 )[ 1 ] === r[ 0 ] ? ( out.at( -1 )[ 1 ] = r[ 1 ], out ) : [ ...out, [ ...r ] ] ), [] );
export function shownOfNode( skeletonNode, facts, rootComponent = null ) {
	// A words-only variant is measured on the default's element; its own words element (`variantKey`) is what is gated.
	const key = tplKey( skeletonNode.variantKey ? { tpl: skeletonNode.variantKey } : skeletonNode.draftRef, rootComponent );
	const own = key && facts ? shownAt( facts, key ) : null;
	if ( skeletonNode.widthShown ) {
		return own ?? { shown: tierRanges( skeletonNode.widthShown ), via: [ `its element renders at ${ skeletonNode.widthShown.join( ' and ' ) }px` ] };
	}
	if ( skeletonNode.widthVariants?.length ) {
		const taken = skeletonNode.widthVariants.flatMap( ( v ) => ( facts ? shownAt( facts, tplKey( { tpl: v.key }, rootComponent ) ) : null )?.shown ?? tierRanges( v.shown ) );
		const free = complement( taken );
		return { shown: own ? intersect( own.shown, free ) : free, via: [ `a width variant is shown at ${ skeletonNode.widthVariants.map( ( v ) => v.shown.join( ' and ' ) ).join( ', ' ) }px` ] };
	}
	return own;
}

// A width-variant instance is not drawn at the widths it is hidden at (the live page hides it there), so its reads at
// those widths are missing for every pass that follows: two instances measured on one draft element (a words-only
// variant shares its default's) never stand side by side as two children in one box. Mutates reads.widths in place.
export function maskHiddenVariants( reads, nodes, facts, rootComponent = null ) {
	for ( const n of nodes ) {
		if ( ! n.node?.widthShown && ! n.node?.widthVariants?.length ) {
			continue;
		}
		const shown = shownOfNode( n.node, facts, rootComponent )?.shown;
		if ( ! shown ) {
			continue;
		}
		for ( const [ w, byId ] of Object.entries( reads.widths || {} ) ) {
			if ( ! shown.some( ( [ lo, hi ] ) => Number( w ) >= lo && Number( w ) < hi ) ) {
				n.targets.forEach( ( t ) => {
					byId[ t.id ] = { missing: true };
				} );
			}
		}
	}
	return reads;
}

// The widths a node's own element is drawn at, from the draft's live read, for an element the draft's script draws at some read
// widths and not at others with no sc-if to say so (a list whose length the code computes from the width: a top bar's claims,
// four on a wide screen, two on a tablet, eight in a phone's loop). Null when the node has no root target read, is drawn at every
// width read, is drawn at none, or sits on a surface read through a state opener (a state's surface renders only at some widths
// by design, and every node of it would read as gated). Only evidence counts: a node with a failed draft read
// (reads.failures, lib/fill-report.mjs::readFailureRows) is never gated, and a width at which the read found no element at all
// (the draft did not render there) is no width the node was read at. reads: lib/fill-read.mjs::readDraft's result.
export function shownByRead( node, reads ) {
	if ( ! reads?.widths || reads.opener || ( reads.failures || [] ).some( ( f ) => f.owner === node.index ) ) {
		return null;
	}
	const roots = ( node.targets || [] ).filter( ( t ) => '' === ( t.slot ?? '' ) );
	if ( ! roots.length ) {
		return null;
	}
	const read = [ 375, 768, 1440 ].filter( ( w ) => Object.values( reads.widths[ w ] || {} ).some( ( s ) => s && ! s.missing ) );
	const drawn = read.filter( ( w ) => roots.some( ( t ) => reads.widths[ w ][ t.id ] && ! reads.widths[ w ][ t.id ].missing ) );
	if ( ! drawn.length || drawn.length === read.length ) {
		return null;
	}
	// Only a width the read found the element missing at hides it: a width with no usable read counts as shown.
	const missing = read.filter( ( w ) => ! drawn.includes( w ) );
	return { shown: tierRanges( [ 375, 768, 1440 ].filter( ( w ) => ! missing.includes( w ) ) ), via: [ `the draft draws its element at ${ drawn.join( ' and ' ) }px and not at ${ missing.join( ' and ' ) }px` ] };
}

// The union of two lists of ranges.
export const unite = ( a, b ) => complement( intersect( complement( a ), complement( b ) ) );

// The width gate of every gated skeleton node (Map: tree index -> { shown, via }), a wrapper's shown range widened to hold every
// block placed in it: a child node whose draft element is not inside the node's own draft element (a block the skeleton moved
// into a part's wrapper, lib/skeleton-part-slots.mjs::placePart) is shown by its own gate, or everywhere when it has none, so
// the wrapper is shown wherever that child is. A child inside the node's element can only be narrower and changes nothing; a
// child whose element key does not resolve changes nothing. A range widened to every width drops the gate. A child that relied
// on the wrapper's own gate (one inside the wrapper's element, or with no element key) and has no gate of its own takes the
// wrapper's original gate when the wrapper is widened, so it stays hidden where the draft hides it.
export function placedChildWidening( nodes, facts, rootComponent = null, reads = null ) {
	const kids = new Map();
	nodes.forEach( ( n ) => null !== n.parent && kids.set( n.parent, [ ...( kids.get( n.parent ) || [] ), n ] ) );
	const keyOf = ( n ) => ( facts ? tplKey( n.node.draftRef, rootComponent ) : null );
	// A node under one the draft's logic or read already gates is hidden with it, so the read gates only the topmost node it finds.
	const byIndex = new Map( nodes.map( ( n ) => [ n.index, n ] ) );
	const gatedAbove = ( n ) => {
		for ( let p = byIndex.get( n.parent ); p; p = byIndex.get( p.parent ) ) {
			if ( shownOfNode( p.node, facts, rootComponent ) || shownByRead( p, reads ) ) {
				return true;
			}
		}
		return false;
	};
	const memo = new Map();
	const kept = new Map();
	const effective = ( n ) => {
		if ( memo.has( n.index ) ) {
			return memo.get( n.index );
		}
		const own = shownOfNode( n.node, facts, rootComponent ) ?? ( gatedAbove( n ) ? null : shownByRead( n, reads ) );
		let at = own;
		const key = keyOf( n );
		const placed = [];
		for ( const c of at && key ? kids.get( n.index ) || [] : [] ) {
			const ck = keyOf( c );
			if ( ! ck || ck === key || ( facts.elements?.[ ck ]?.template?.parentChain || [] ).includes( key ) ) {
				continue;
			}
			placed.push( c );
			const cat = effective( c );
			const shown = unite( at.shown, cat ? cat.shown : [ [ 0, Infinity ] ] );
			if ( JSON.stringify( shown ) !== JSON.stringify( at.shown ) ) {
				at = { shown, via: [ ...at.via, `widened to hold ${ c.name } (${ ck }), shown ${ cat ? cat.via.join( ' and ' ) : 'at every width' }` ] };
			}
		}
		at && at.shown.length === 1 && 0 === at.shown[ 0 ][ 0 ] && Infinity === at.shown[ 0 ][ 1 ] && ( at = null );
		if ( at !== own ) {
			for ( const c of ( kids.get( n.index ) || [] ).filter( ( k ) => ! placed.includes( k ) && ! shownOfNode( k.node, facts, rootComponent ) && ! shownByRead( k, reads ) ) ) {
				kept.set( c.index, { shown: own.shown, via: [ ...own.via, `the gate of ${ n.name }, which was widened to hold a placed block` ] } );
			}
		}
		memo.set( n.index, at );
		return at;
	};
	const gate = new Map();
	nodes.forEach( ( n ) => {
		const at = effective( n );
		at && gate.set( n.index, at );
	} );
	kept.forEach( ( at, index ) => gate.has( index ) || gate.set( index, at ) );
	return gate;
}

// Writes the width gates of every skeleton node. nodes: skeletonNodes(); flat: tree nodes by index; refOf: tree node to
// ref; facts: the fact record (null: nothing written); db: the framework DB; scope: the surface; entries: the ledger's
// entries (the snap entries continue its numbering). Returns { writes, unmapped, notes, ledger } in the shapes
// lib/fill-resolve.mjs uses; `ledger` holds the new snap entries.
export function widthGateWrites( { nodes, flat, refOf, facts, db, scope, reads = null, entries = [], rootComponent = null, date = new Date().toISOString().slice( 0, 10 ), collapse = collapseAttributes(), writes: made = [], thresholds = [] } ) {
	const out = { writes: [], unmapped: [], notes: [], ledger: [] };
	if ( ! facts && ! reads && ! nodes.some( ( n ) => n.node.widthShown || n.node.widthVariants ) ) {
		return out;
	}
	const gate = placedChildWidening( nodes, facts, rootComponent, reads );
	for ( const n of nodes ) {
		const at = gate.get( n.index );
		const up = null === n.parent ? null : gate.get( n.parent );
		const node = flat[ n.index ];
		const mark = n.node.ownAlternativeBelow ?? node.ownAlternativeBelow;
		const ref = refOf( node );
		// The alternative (a drawer) is no sticky column: a marked node is pinned at the desktop tier only, gated or not.
		const pin = mark ? desktopOnlyPin( node.attributes?.pinEdge ) : null;
		if ( pin ) {
			const { before, after } = setAttr( node, { attr: 'pinEdge', value: pin } );
			made.filter( ( w ) => w.node === ref && 'pinEdge' === w.attr ).forEach( ( w ) => ( w.after = after ) );
			out.writes.push( { node: ref, index: n.index, block: n.name, slot: '', prop: `own alternative below ${ mark.setting }: pinned at desktop only`, attr: 'pinEdge', before, after, widths: [], how: 'width-gate' } );
		}
		if ( ! at || ( up && JSON.stringify( up.shown ) === JSON.stringify( at.shown ) ) ) {
			continue;
		}
		const put = ( attr, value, prop ) => {
			const { before, after } = setAttr( node, { attr, value } );
			out.writes.push( { node: ref, index: n.index, block: n.name, slot: '', prop, attr, before, after, widths: [], how: 'width-gate' } );
		};
		const { hidden, snaps } = hiddenRanges( at.shown );
		const via = at.via.join( ' and ' );
		if ( ! hidden.length ) {
			continue;
		}
		if ( ! at.shown.length ) {
			out.unmapped.push( { node: ref, block: n.name, slot: '', property: 'width gate', value: via, reason: `width-gate: the draft's conditions (${ via }) hold at no width, so the content is never shown; nothing is written` } );
			continue;
		}
		// A node the skeleton marks as drawing its own alternative below a theme option's threshold (the filter rail) is never
		// hidden by a flag: the draft's own threshold goes on the node, unsnapped.
		if ( mark ) {
			const raw = complement( at.shown );
			const below = 1 === raw.length && 0 === raw[ 0 ][ 0 ] && Infinity > raw[ 0 ][ 1 ] ? raw[ 0 ][ 1 ] : null;
			// The draft's logic states the threshold exactly (an sc-if on a width). A gate the read made (the element is drawn at some
			// read widths and not at others) knows only a tier: the threshold is then the one width the draft's code uses (intake's
			// thresholds) between the last swept width without the element and the first with it.
			let t = shownOfNode( n.node, facts, rootComponent ) ? below : null;
			let how = "the draft's condition";
			if ( ! t ) {
				const step = below ? presenceStep( reads, nodes, n.index ) : null;
				const found = step ? [ ...new Set( thresholds ) ].filter( ( v ) => v > step[ 0 ] && v <= step[ 1 ] ) : [];
				t = 1 === found.length ? found[ 0 ] : null;
				how = `the draft's code threshold, found between ${ step?.join( ' and ' ) }px by the width sweep`;
			}
			node.ownAlternativeBelow = { ...mark, ...( t ? { value: t } : {} ) };
			t || out.unmapped.push( { node: ref, block: n.name, slot: '', property: 'width gate', value: via, reason: `width-gate: ${ n.name } draws its own alternative below ${ mark.setting }, but the draft's own threshold is not known (${ below ? "the read shows it hidden below a tier only, and the width sweep and the draft's code thresholds do not name one width" : `the draft's conditions (${ via }) hide it at ${ raw.map( ( [ lo, hi ] ) => `${ lo }-${ Infinity === hi ? 'up' : hi - 1 }` ).join( ', ' ) }, not below one width` }); no threshold is written` } );
			out.notes.push( `${ ref } ${ n.name }: ${ via } is its own alternative below ${ mark.setting }${ t ? ` = ${ t }px (${ how }, not snapped)` : '' }; no hiding flag is written` );
			continue;
		}
		for ( const s of snaps ) {
			const e = snapEntry( { scope, ref, snap: s, entries: [ ...entries, ...out.ledger ], date } );
			e && out.ledger.push( e );
		}
		// A block that draws its own alternative below a threshold (the nav's burger under collapsePoint) takes the threshold as
		// that setting; a hiding flag would hide the alternative with it.
		const own = ownBreakpoint( db, n.name, collapse );
		if ( own && 1 === hidden.length && 0 === hidden[ 0 ][ 0 ] && Infinity > hidden[ 0 ][ 1 ] ) {
			const t = hidden[ 0 ][ 1 ];
			node.attributes?.[ own ] === t || put( own, t, `width gate (${ via }): the block's own breakpoint` );
			out.notes.push( `${ ref } ${ n.name }: ${ via } is its own setting ${ own } = ${ t }; no hiding flag is written` );
			continue;
		}
		const tiers = tiersOf( hidden );
		if ( tiers && tiers.length && tiers.every( ( t ) => holdsAttr( db, n.name, HIDE_ATTR[ t ] ) ) ) {
			tiers.forEach( ( t ) => put( HIDE_ATTR[ t ], true, `width gate (${ via }): hide on ${ t }` ) );
			out.notes.push( `${ ref } ${ n.name }: shown only at ${ at.shown.map( ( [ lo, hi ] ) => `${ lo }-${ Infinity === hi ? 'up' : hi - 1 }` ).join( ', ' ) } (${ via }); hidden on ${ tiers.join( ', ' ) }${ snaps.length ? `; snapped ${ snaps.map( ( s ) => `${ s.draft } to ${ s.tier }` ).join( ', ' ) }` : '' }` );
			continue;
		}
		const css = hidden.map( ( r ) => mediaRule( r ) ).join( ' ' );
		const puts = scopedCssPuts( node, { css, index: n.index, why: `width gate (${ via })`, label: `Width gate ${ via }: hidden at ${ hidden.map( ( [ lo, hi ] ) => `${ lo }-${ Infinity === hi ? 'up' : hi - 1 }px` ).join( ', ' ) }` } );
		if ( ! puts.length ) {
			continue;
		}
		puts.forEach( ( x ) => put( x.attr, x.value, x.prop ) );
		out.notes.push( `${ ref } ${ n.name }: ${ via } has no tier-aligned hiding setting and no breakpoint setting; written as a scoped @media rule in Additional CSS` );
	}
	return out;
}
