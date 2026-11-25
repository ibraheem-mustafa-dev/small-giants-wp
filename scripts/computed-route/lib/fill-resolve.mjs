// Fill's root-down resolution (FR-47-4 steps 2 and 3): every node and slot of the skeleton, every property that differs
// from what the node already shows, written through the resolver; spacing ownership decided per tier from rendered
// gaps; presence, words and links from calibration; what no setting can hold listed as UNMAPPED, and what lives outside
// the tree as handover.
import { blockSchema, LOOSE } from './resolve.mjs';
import { setAttr, refOf } from './tree.mjs';
import { knownPaths, OWNED } from './fill-prop.mjs';
import { presenceDecisions, textDecisions, linkDecisions } from './fill-presence.mjs';
import { linkAttrDecisions, blockSupportsAnchor } from './fill-link-attrs.mjs';
import { mediaDecisions, mediaAt, captionOf, factImage, pictureSlotOf, pictureSettles, withSizing } from './fill-media.mjs';
import { blockMediaSlots } from './media/slots.mjs';
import { mapDecisions } from './fill-map.mjs';
import { iconDecisions } from './fill-icon.mjs';
import { listMarkerDecisions } from './fill-list-marker.mjs';
import { handoverEntry } from './fill-handover.mjs';
import { unreadOf } from './fill-unread.mjs';
import { fillBand } from './fill-band.mjs';
import { absentByDefault, withoutOmittedAbsences } from './fill-fixture.mjs';
import { hasRow } from './fill-skeleton.mjs';
import { liftRow } from './fill-row-lift.mjs';
import { json, makeState, snapsOf, planSpacing } from './fill-resolve-state.mjs';
import { fillElement, unmapped } from './fill-resolve-element.mjs';
import { completePaint } from './css-families.mjs';
import { makeSettle } from './fill-held.mjs';
import { partWideWrites } from './fill-ancestor.mjs';
import { childHeld } from './fill-child-held.mjs';
import { calibrationForNode } from './paint-state.mjs';

const PSEUDO_LAYERS = [ '::before', '::after' ];

// The width a node's content (presence, words, links, icon, image) is read at: 1440 where the node is drawn there, else the
// widest read width it is drawn at (an element shown only on phones, a width variant hidden from 768). Every part of the
// node is judged at that one width.
const CONTENT_WIDTHS = [ 1440, 768, 375 ];
export function contentWidth( st, rec ) {
	const root = rec.targets.find( ( t ) => '' === t.slot ) ?? rec.targets[ 0 ];
	return CONTENT_WIDTHS.find( ( w ) => {
		const s = root && st.reads.widths[ w ]?.[ root.id ];
		return !! s && ! s.missing;
	} ) ?? 1440;
}

// The draft's evidence that a block's own glyph is absent: a presence path that is an inline svg or holds one (the icon a
// business line or a list item draws beside its words), named by no target of the node, is false when the draft's own element
// holds no glyph at any width it is drawn at. An icon the draft draws beside the element, as a block of its own, is not this
// block's icon. Paths a target names keep their own evidence. cal: the block's calibration; readAt( target, width ): a read.
// others: the root targets of the surface's other nodes. A root element the node shares with other nodes (a menu half read at
// the group that also holds the phone, account and bag blocks) holds their glyphs too: the glyphs of the outermost other nodes
// drawn inside it (each another element, its box inside the root's) are theirs, not this block's.
export function glyphEvidence( { cal, targets = [], readAt = () => null, others = [] } ) {
	const root = targets.find( ( t ) => '' === ( t.slot ?? '' ) );
	const inside = ( a, b ) => a && b && a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
	const sameElement = ( t ) => JSON.stringify( t.finder ?? null ) === JSON.stringify( root.finder ?? null ) && null != root.finder;
	const own = ( w ) => {
		const s = readAt( root, w );
		if ( ! s || s.missing ) {
			return null;
		}
		if ( ! Number.isInteger( s.glyphs ) ) {
			return s;
		}
		const kids = others.filter( ( t ) => ! sameElement( t ) ).map( ( t ) => readAt( t, w ) ).filter( ( k ) => k && ! k.missing && Number.isInteger( k.glyphs ) && k.rect && inside( k.rect, s.rect ) );
		const outer = kids.filter( ( k ) => ! kids.some( ( o ) => o !== k && inside( k.rect, o.rect ) && ! inside( o.rect, k.rect ) ) );
		return { ...s, glyphs: s.glyphs - outer.reduce( ( n, k ) => n + k.glyphs, 0 ) };
	};
	const drawn = root ? CONTENT_WIDTHS.map( own ).filter( Boolean ) : [];
	if ( ! drawn.length || drawn.some( ( s ) => ! Number.isInteger( s.glyphs ) || s.glyphs > 0 ) ) {
		return {};
	}
	const named = new Set( targets.map( ( t ) => LOOSE( t.slot ?? '' ) ) );
	const paths = Object.values( cal?.presence || {} ).flatMap( ( e ) => [ ...( e.shows || [] ), ...( e.hides || [] ) ] );
	const glyph = ( p ) => / > svg(?: > |$)|^svg(?: > |$)/.test( LOOSE( p ) ) || paths.some( ( q ) => LOOSE( q ) === `${ LOOSE( p ) } > svg` );
	return Object.fromEntries( paths.filter( ( p ) => glyph( p ) && ! named.has( LOOSE( p ) ) ).map( ( p ) => [ p, false ] ) );
}

// The settings a node's styling answers never change: what the skeleton's rule chose from the draft's structure (its
// `decided`, a word-only item style) and what a content writer decided before (lib/fill-prop.mjs::OWNED). Registered on the node.
export function ownedSettings( node, skeletonNode ) {
	const owned = { ...( skeletonNode?.decided || {} ), ...( OWNED.get( node ) ?? {} ) };
	skeletonNode?.decided && OWNED.set( node, owned );
	return owned;
}

// A setting the skeleton's rule decided that paints a CSS property cannot sit among the skeleton's attributes (R-47-10,
// lint.mjs::lintSkeleton), so Fill writes it onto the node. It is written for every node the skeleton carries one on, read or not:
// a node with no draft element of its own (the basket count row), one the draft hides at every width and one with no calibration
// still hold the rule's decision, which no reader could supply.
function writeDecided( st, rec, ref ) {
	const node = st.flat[ rec.index ];
	const skeletonNode = st.nodes[ rec.index ].node;
	ownedSettings( node, skeletonNode );
	for ( const [ attr, value ] of Object.entries( skeletonNode?.decided || {} ) ) {
		if ( json( value ) !== json( node.attributes?.[ attr ] ) ) {
			const { before, after } = setAttr( node, { attr, value, merge: 'replace' } );
			st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(decided)', attr, before, after, widths: [], how: 'decided' } );
		}
	}
}

// A node Fill does not read (no draft element of its own, hidden at every width, uncalibrated) still hands over what its skeleton
// declared lives outside the tree: the draft has nothing to show for it, so the entry carries the declared detail as its evidence.
function carryHandover( st, rec, ref ) {
	for ( const h of st.nodes[ rec.index ].node?.handover || [] ) {
		st.out.handover.push( handoverEntry( { owner: h.owner, kind: h.kind, node: ref, block: rec.name, slot: h.slot ?? '', evidence: { key: h.kind, draft: h.detail, width: 1440 }, reason: h.detail } ) );
	}
}

// The settings a node's skeleton could not read from the draft (`unmapped`, [ { property, reason } ]) are UNMAPPED rows, for every
// node: the block has the setting, the draft did not give its value, and a node with no draft element (the basket count row) has
// no read to report it.
function carryUnmapped( st, rec, ref ) {
	for ( const u of st.nodes[ rec.index ].node?.unmapped || [] ) {
		unmapped( st, rec, ref, { property: u.property, value: '', reason: u.reason } );
	}
}

// Presence, words and links for one node's elements, and its declared handover (step 5).
function fillContent( st, rec, ref, cal ) {
	const node = st.flat[ rec.index ];
	const skeletonNode = st.nodes[ rec.index ].node;
	const at = contentWidth( st, rec );
	const atDesktop = Object.fromEntries( rec.targets.map( ( t ) => [ t.slot, st.reads.widths[ at ]?.[ t.id ] ] ) );
	// A part is present when the draft draws it at any read width: which widths show it is the width gate's and the block's
	// own (a burger drawn only below the nav's collapse point is present).
	const drawn = Object.fromEntries( rec.targets.filter( ( t ) => '' !== t.slot ).map( ( t ) => [ t.slot, CONTENT_WIDTHS.some( ( w ) => {
		const s = st.reads.widths[ w ]?.[ t.id ];
		return !! s && ! s.missing;
	} ) ] ) );
	Object.assign( drawn, glyphEvidence( { cal, targets: rec.targets, readAt: ( t, w ) => st.reads.widths[ w ]?.[ t.id ], others: st.nodes.filter( ( r ) => r !== rec ).map( ( r ) => r.targets.find( ( t ) => '' === t.slot ) ).filter( Boolean ) } ) );
	// The draft lacking a part the block already omits (the rating its showRating switch leaves off) says nothing for a setting that
	// would hide it: no variant is chosen for hiding what is not drawn.
	const evidence = st.db ? withoutOmittedAbsences( drawn, absentByDefault( st, rec.name, cal, blockSchema( rec.name ) || {}, node.attributes || {} ) ) : drawn;
	const words = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.words ] ) );
	const hrefs = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.href ] ) );
	const linkFacts = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing && ( s.target || s.rel || s.id || s.ariaLabel ) ).map( ( [ slot, s ] ) => [ slot, { target: s.target, rel: s.rel, id: s.id, ariaLabel: s.ariaLabel, imageName: s.imageName ?? null } ] ) );
	const local = [];
	// The settings a content writer decided from the draft (an icon's source from its mark) are this node's own: no styling
	// answer of the resolver may change them (lib/fill-prop.mjs::OWNED).
	const owned = ownedSettings( node, skeletonNode );
	const take = ( r ) => {
		Object.assign( owned, r.decided || {} );
		Object.keys( owned ).length && OWNED.set( node, owned );
		for ( const w of r.writes ) {
			if ( json( w.value ) !== json( node.attributes?.[ w.attr ] ) ) {
				const { before, after } = setAttr( node, w );
				st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
			}
		}
		st.out.notes.push( ...r.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
		st.out.images.push( ...( r.checks || [] ).map( ( c ) => ( { node: ref, index: rec.index, block: rec.name, slot: '', draftId: null, ...c } ) ) );
		local.push( ...r.unmapped.map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
		// A link setting bound to Site Info: the draft address stays in the setting as the fallback, and Site Info is handed it.
		for ( const h of r.handover || [] ) {
			st.out.handover.push( handoverEntry( { owner: 'site-info', kind: 'link', node: ref, block: rec.name, slot: h.slot, evidence: { key: h.attr, draft: h.address, width: at, siteInfoKey: h.siteInfoKey }, reason: `${ h.attr } is bound to Site Info "${ h.siteInfoKey }"; the draft links to ${ h.address }, kept as the fallback. Fill Site Info "${ h.siteInfoKey }" from it` } ) );
		}
	};
	const absent = [ 'presence', 'text', 'link' ].filter( ( k ) => ! cal?.[ k ] );
	if ( absent.length && ! st.notedBlocks.has( rec.name ) ) {
		st.notedBlocks.add( rec.name );
		st.out.notes.push( `${ rec.name }: calibration has no ${ absent.join( ', ' ) } key, so those were not judged for this block (recalibrate it to read them)` );
	}
	take( presenceDecisions( { calibration: cal, schema: blockSchema( rec.name ), attributes: node.attributes || {}, evidence } ) );
	take( textDecisions( { calibration: cal, attributes: node.attributes || {}, slots: words, leaf: 0 === rec.children.length } ) );
	take( linkDecisions( { calibration: cal, attributes: node.attributes || {}, slots: hrefs, origin: st.origin, pages: st.pages, draftLink: st.draftLink ?? null } ) );
	take( linkAttrDecisions( { calibration: cal, schema: blockSchema( rec.name ) || {}, anchor: blockSupportsAnchor( rec.name ), attributes: node.attributes || {}, slots: linkFacts, imageAlts: blockMediaSlots( rec.name ).filter( ( s ) => 'content' === s.context && s.alt ).map( ( s ) => s.alt ), pictureSlot: pictureSlotOf( atDesktop ) } ) );
	// The fact record speaks for the element the image is drawn by: the target whose slot is the image's own (a nested image names its slot).
	// The node's own picture also carries the sizing its slot holds (the ratio and the height, lib/media/write.mjs).
	const rootId = rec.targets.find( ( t ) => '' === t.slot )?.id;
	const parentId = null === rec.parent ? null : st.nodes?.[ rec.parent ]?.targets.find( ( t ) => '' === t.slot )?.id;
	const reads = Object.fromEntries( CONTENT_WIDTHS.map( ( w ) => [ w, mediaAt( Object.fromEntries( rec.targets.map( ( t ) => [ t.slot, st.reads.widths[ w ]?.[ t.id ] ] ) ) ).map( ( entry ) => ( rootId ? withSizing( { entry, snap: st.reads.widths[ w ]?.[ rootId ], declared: st.reads.declared?.[ w ]?.[ rootId ], parentSnap: parentId ? st.reads.widths[ w ]?.[ parentId ] : null, parentDeclared: parentId ? st.reads.declared?.[ w ]?.[ parentId ] : null } ) : entry ) ) ] ) );
	const imageSlot = Object.entries( atDesktop ).find( ( [ , s ] ) => s && ! s.missing && s.img )?.[ 0 ] ?? '';
	const imageTarget = rec.targets.find( ( t ) => t.slot === imageSlot && t.finder?.tpl ) ?? rec.targets.find( ( t ) => t.finder?.tpl );
	const media = mediaDecisions( { slots: blockMediaSlots( rec.name ), attributes: node.attributes || {}, reads, caption: captionOf( atDesktop ), media: { ...st.media, origin: st.origin }, fact: factImage( st.facts, imageTarget?.finder.tpl, st.rootComponent ) } );
	take( media );
	take( iconDecisions( { svg: atDesktop[ '' ]?.svg ?? null, schema: blockSchema( rec.name ), attributes: node.attributes || {}, href: hrefs[ '' ] ?? '' } ) );
	// Each list item's own marker, read at the item's marker part, and the list's marker type (lib/fill-list-marker.mjs).
	st.db && take( listMarkerDecisions( { db: st.db, block: rec.name, cal, attributes: node.attributes || {}, reads: atDesktop } ) );
	if ( 'map' === node.attributes?.displayType ) {
		const embeds = Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, st.reads.widths[ w ]?.[ rec.targets.find( ( t ) => '' === t.slot )?.id ]?.embed ] ).filter( ( [ , e ] ) => e ) );
		take( mapDecisions( { schema: blockSchema( rec.name ), attributes: node.attributes || {}, embeds } ) );
	}
	// A skeleton's own statement that something lives outside the tree turns the matching UNMAPPED row into handover.
	for ( const h of skeletonNode.handover || [] ) {
		const slot = h.slot ?? '';
		if ( pictureSettles( h, media.checks ) ) {
			st.out.notes.push( `${ ref } ${ rec.name }: the skeleton's handover "${ h.detail }" is settled: Fill wrote the draft's picture` );
			continue;
		}
		const draft = 'text' === h.kind ? words[ slot ] : 'link' === h.kind ? hrefs[ slot ] : 'presence' === h.kind ? ( '' === slot ? 'shown' : ( evidence[ slot ] ? 'shown' : 'hidden' ) ) : h.detail;
		st.out.handover.push( handoverEntry( { owner: h.owner, kind: h.kind, node: ref, block: rec.name, slot, evidence: { key: h.kind, draft: draft ?? '', width: 1440 }, reason: h.detail } ) );
	}
	const declared = ( u ) => ( skeletonNode.handover || [] ).some( ( h ) => h.kind === u.property && ( h.slot ?? '' ) === u.slot );
	st.out.unmapped.push( ...local.filter( ( u ) => ! declared( u ) ) );
}

// A calibration whose default paint carries every shorthand family both ways (lib/css-families.mjs::completePaint): the paint
// holds `border-radius` or its four corners, and Fill judges whichever property the draft states against the other's value.
const completed = new WeakMap();
function withFamilies( cal ) {
	if ( ! cal || ! cal.elements ) {
		return cal;
	}
	if ( ! completed.has( cal ) ) {
		completed.set( cal, { ...cal, elements: Object.fromEntries( Object.entries( cal.elements ).map( ( [ slot, widths ] ) => [ slot, Object.fromEntries( Object.entries( widths ).map( ( [ w, paint ] ) => [ w, paint && 'object' === typeof paint ? completePaint( paint ) : paint ] ) ) ] ) ) } );
	}
	return completed.get( cal );
}

// The calibration a node is judged against: `raw( block )` is the block's calibration, and the view for `rec` (the node's
// skeleton record) is its paint state's default paint, per read width where the node draws differently by device
// (lib/paint-state.mjs::calibrationForNode, lib/fill-device-mode.mjs), with the CSS families completed. `flatOf()` is the
// filled tree's flat node list, read when the view is asked for (a node's attributes change as Fill writes them); `fixtures`
// is the setting record's fixtures (lib/setting-record.mjs::recordFixtures; null reads every rest paint as the block's default). Without `rec` the block's own paint.
// Fill's own passes and every later pass that asks the resolver again (the width ladder, the size pass) take their
// calibration through this, so a node is never judged at one width against the paint of another width's mode.
export function nodeCalFor( { raw, flatOf, fixtures = null } ) {
	return ( block, rec = null ) => withFamilies( calibrationForNode( raw( block ), rec ? flatOf()[ rec.index ] : null, { fixture: fixtures?.[ block ] ?? null, schema: blockSchema( block ) } ) );
}

// Fills the tree in place. tree: the cleaned skeleton (refs added, draft keys removed), nodes: skeletonNodes of the
// skeleton (same indices), reads: lib/fill-read.mjs::readDraft, calFor( block ): calibration or null (a node is judged
// against its paint state's default paint, lib/paint-state.mjs, through st.calFor( name, rec ), per read width where its
// way of drawing differs by device, lib/fill-device-mode.mjs), ledger: the
// divergence entries, ledgerStates: the walker states that are the rest state (the ledger's `state` names one),
// fixtures: the setting record's fixtures (lib/setting-record.mjs::recordFixtures; null reads every rest paint as the block's default).
// Returns { writes, unmapped, alreadyHeld, notes, handover, spacing, fluid, held, snaps, settleHeld } — `settleHeld( result )` moves
// every row of result.unmapped whose value the element already renders (lib/fill-held.mjs) into result.alreadyHeld, for the
// caller to run once all its writers have added their rows and writes.
export function fillTree( opts ) {
	const st = makeState( { ledger: [], ledgerStates: [], origin: '', fixtures: null, ...opts, calFor: nodeCalFor( { raw: opts.calFor, flatOf: () => st.flat, fixtures: opts.fixtures } ), snaps: [] } );
	const settle = makeSettle( st );
	// A node Fill reads: it has targets, a calibration and a visible draftRef element (each refusal is reported once).
	const readable = new Set();
	for ( const rec of st.nodes ) {
		const ref = refOf( st.flat[ rec.index ] );
		writeDecided( st, rec, ref );
		carryUnmapped( st, rec, ref );
		if ( ! rec.targets.length ) {
			continue;
		}
		const cal = st.calFor( rec.name, rec );
		if ( ! cal ) {
			unmapped( st, rec, ref, { property: '(block)', value: '', reason: `uncalibrated: ${ rec.name } has no calibration file` } );
			continue;
		}
		// A node that reads only its slots (`draftSlotsOnly`) is readable where any of its slots is read.
		const roots = true === st.nodes[ rec.index ].node.draftSlotsOnly ? Object.assign( {}, ...rec.targets.map( ( t ) => snapsOf( st, t.id ) ) ) : snapsOf( st, `${ rec.index }:` );
		if ( ! Object.keys( roots ).length ) {
			unmapped( st, rec, ref, { property: '(element)', value: json( rec.targets[ 0 ].finder ), reason: 'the draftRef finder resolved no visible element at 375, 768 or 1440' } );
			continue;
		}
		readable.add( rec.index );
		// Every node's content (presence, words, links, icon, image) is decided before any node's look, so a look written
		// from a parent (a Site Info row lifting its icons) meets the content the draft settles, never a skeleton default.
		fillContent( st, rec, ref, cal );
	}
	for ( const rec of st.nodes.filter( ( r ) => ! readable.has( r.index ) ) ) {
		carryHandover( st, rec, refOf( st.flat[ rec.index ] ) );
	}
	for ( const rec of st.nodes ) {
		const ref = refOf( st.flat[ rec.index ] );
		planSpacing( st, rec );
		if ( ! readable.has( rec.index ) ) {
			continue;
		}
		const cal = st.calFor( rec.name, rec );
		// A generated Site Info icon's look belongs to its row (liftRow, run at the row): the icon keeps its content only.
		if ( null !== rec.parent && hasRow( st.nodes[ rec.parent ].node ) ) {
			continue;
		}
		for ( const target of rec.targets ) {
			const snaps = snapsOf( st, target.id );
			if ( ! Object.keys( snaps ).length ) {
				continue;
			}
			if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( target.slot ) ) ) {
				unmapped( st, rec, ref, { slot: target.slot, property: '(element)', value: json( target.finder ), reason: `unmapped-element: ${ rec.name } path "${ target.slot }" is not a calibrated element` } );
				continue;
			}
			fillElement( st, rec, ref, cal, target, snaps );
			for ( const layer of PSEUDO_LAYERS.filter( ( l ) => Object.values( snaps ).some( ( s ) => s.pseudo?.[ l ] ) ) ) {
				if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( `${ target.slot }${ layer }` ) ) ) {
					unmapped( st, rec, ref, { slot: `${ target.slot }${ layer }`, property: '(pseudo layer)', value: `content ${ Object.values( snaps ).find( ( s ) => s.pseudo?.[ layer ] ).pseudo[ layer ].content }`, reason: `unmapped-element: the draft paints ${ layer } on "${ target.slot }" and ${ rec.name } has no calibrated ${ layer } there` } );
					continue;
				}
				fillElement( st, rec, ref, cal, target, snaps, layer );
			}
		}
		if ( hasRow( st.nodes[ rec.index ].node ) ) {
			liftRow( st, rec, ref, cal, { fillElement, snapsOf } );
		}
		// The content band no finder reads: its width from the draft's render (lib/fill-band.mjs).
		const band = fillBand( st, rec, ref, cal );
		// What this node's calibration knows and nothing read or judged, so no setting is skipped silently.
		const read = rec.targets.filter( ( t ) => Object.keys( snapsOf( st, t.id ) ).length ).map( ( t ) => t.slot );
		const judged = new Set( [ ...st.out.writes.filter( ( w ) => w.index === rec.index ).map( ( w ) => w.attr ), ...( band ? [ band.attr ] : [] ) ] );
		st.out.unread.push( ...unreadOf( { db: st.db, block: rec.name, cal, attributes: st.nodes[ rec.index ].node.attributes || {}, slots: read, written: judged } ).map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
	}
	// A host block's setting that paints the same part on every instance of a child block is written once (FR-48-14b).
	partWideWrites( st, opts.partWide );
	// A parent's row at an element a block inside it reads itself is that block's (lib/fill-child-held.mjs).
	childHeld( st );
	const settleHeld = ( result ) => {
		const r = settle( { unmapped: result.unmapped, writes: result.writes } );
		return { unmapped: r.unmapped, alreadyHeld: [ ...( result.alreadyHeld || [] ), ...r.alreadyHeld ] };
	};
	return { ...st.out, ...settleHeld( { unmapped: st.out.unmapped, writes: st.out.writes } ), snaps: st.snaps, settleHeld };
}
