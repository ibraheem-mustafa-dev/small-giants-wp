// Fill's root-down resolution (FR-47-4 steps 2 and 3): every node and slot of the skeleton, every property that differs
// from what the node already shows, written through the resolver; spacing ownership decided per tier from rendered
// gaps; presence, words and links from calibration; what no setting can hold listed as UNMAPPED, and what lives outside
// the tree as handover.
import { blockSchema, LOOSE } from './resolve.mjs';
import { setAttr, refOf } from './tree.mjs';
import { knownPaths, OWNED } from './fill-prop.mjs';
import { presenceDecisions, textDecisions, linkDecisions } from './fill-presence.mjs';
import { linkAttrDecisions, blockSupportsAnchor } from './fill-link-attrs.mjs';
import { imageSlots, mediaDecisions, nestedImage, factImage, pictureSlotOf, pictureSettles } from './fill-media.mjs';
import { mapDecisions } from './fill-map.mjs';
import { iconDecisions, imageIconDecisions } from './fill-icon.mjs';
import { handoverEntry } from './fill-handover.mjs';
import { unreadOf } from './fill-unread.mjs';
import { fillBand, bandSetting } from './fill-band.mjs';
import { hasRow } from './fill-skeleton.mjs';
import { liftRow } from './fill-row-lift.mjs';
import { json, makeState, snapsOf, planSpacing } from './fill-resolve-state.mjs';
import { fillElement, unmapped } from './fill-resolve-element.mjs';
import { completePaint } from './css-families.mjs';
import { makeSettle } from './fill-held.mjs';
import { partWideWrites } from './fill-ancestor.mjs';
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

// Presence, words and links for one node's elements, and its declared handover (step 5).
function fillContent( st, rec, ref, cal ) {
	const node = st.flat[ rec.index ];
	const skeletonNode = st.nodes[ rec.index ].node;
	const at = contentWidth( st, rec );
	const atDesktop = Object.fromEntries( rec.targets.map( ( t ) => [ t.slot, st.reads.widths[ at ]?.[ t.id ] ] ) );
	// A part is present when the draft draws it at any read width: which widths show it is the width gate's and the block's
	// own (a burger drawn only below the nav's collapse point is present).
	const evidence = Object.fromEntries( rec.targets.filter( ( t ) => '' !== t.slot ).map( ( t ) => [ t.slot, CONTENT_WIDTHS.some( ( w ) => {
		const s = st.reads.widths[ w ]?.[ t.id ];
		return !! s && ! s.missing;
	} ) ] ) );
	const words = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.words ] ) );
	const hrefs = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.href ] ) );
	const linkFacts = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing && ( s.target || s.rel || s.id || s.ariaLabel ) ).map( ( [ slot, s ] ) => [ slot, { target: s.target, rel: s.rel, id: s.id, ariaLabel: s.ariaLabel, imageName: s.imageName ?? null } ] ) );
	const local = [];
	// The settings a content writer decided from the draft (an icon's source from its mark) are this node's own: no styling
	// answer of the resolver may change them (lib/fill-prop.mjs::OWNED).
	const owned = OWNED.get( node ) ?? {};
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
	take( linkDecisions( { calibration: cal, attributes: node.attributes || {}, slots: hrefs, origin: st.origin, pages: st.pages } ) );
	take( linkAttrDecisions( { calibration: cal, schema: blockSchema( rec.name ) || {}, anchor: blockSupportsAnchor( rec.name ), attributes: node.attributes || {}, slots: linkFacts, imageAlts: imageSlots( st.db, rec.name, blockSchema( rec.name ) ).map( ( s ) => s.alt ), pictureSlot: pictureSlotOf( atDesktop ) } ) );
	// The fact record speaks for the element the image is drawn by: the target whose slot is the image's own (a nested image names its slot).
	// The picture the node's own element paints as its background, when it holds no <img> (snap.bgImg).
	const image = nestedImage( atDesktop ) ?? atDesktop[ '' ]?.bgImg ?? null;
	const imageTarget = rec.targets.find( ( t ) => t.slot === ( image?.slot ?? '' ) && t.finder?.tpl ) ?? rec.targets.find( ( t ) => t.finder?.tpl );
	const media = mediaDecisions( { slots: imageSlots( st.db, rec.name, blockSchema( rec.name ) ), schema: blockSchema( rec.name ), attributes: node.attributes || {}, img: image, media: { ...st.media, origin: st.origin }, fact: factImage( st.facts, imageTarget?.finder.tpl, st.rootComponent ) } );
	take( media );
	// A background photo the block's picture setting now holds: the element's `background-image` row is settled by it.
	if ( 'background' === image?.tag && media.checks.length ) {
		( st.pictures ??= new WeakMap() ).set( node, media.checks[ 0 ] );
	}
	take( imageIconDecisions( { img: atDesktop[ '' ]?.svg ? null : image, words: atDesktop[ '' ]?.words, schema: blockSchema( rec.name ), attributes: node.attributes || {}, folder: st.draftFolder ?? null, origin: st.origin, href: hrefs[ '' ] ?? '' } ) );
	take( iconDecisions( { svg: atDesktop[ '' ]?.svg ?? null, schema: blockSchema( rec.name ), attributes: node.attributes || {}, href: hrefs[ '' ] ?? '' } ) );
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

// Fills the tree in place. tree: the cleaned skeleton (refs added, draft keys removed), nodes: skeletonNodes of the
// skeleton (same indices), reads: lib/fill-read.mjs::readDraft, calFor( block ): calibration or null (a node is judged
// against its paint state's default paint, lib/paint-state.mjs, through st.calFor( name, rec )), ledger: the
// divergence entries, ledgerStates: the walker states that are the rest state (the ledger's `state` names one),
// fixtures: calibration-fixtures.json (null reads every rest paint as the block's default).
// Returns { writes, unmapped, alreadyHeld, notes, handover, spacing, fluid, held, snaps, settleHeld } — `settleHeld( result )` moves
// every row of result.unmapped whose value the element already renders (lib/fill-held.mjs) into result.alreadyHeld, for the
// caller to run once all its writers have added their rows and writes.
export function fillTree( opts ) {
	const st = makeState( { ledger: [], ledgerStates: [], origin: '', fixtures: null, ...opts, calFor: ( block, rec = null ) => withFamilies( calibrationForNode( opts.calFor( block ), rec ? st.flat[ rec.index ] : null ) ), snaps: [] } );
	const settle = makeSettle( st );
	// A node Fill reads: it has targets, a calibration and a visible draftRef element (each refusal is reported once).
	const readable = new Set();
	for ( const rec of st.nodes ) {
		const ref = refOf( st.flat[ rec.index ] );
		if ( ! rec.targets.length ) {
			continue;
		}
		const cal = st.calFor( rec.name, rec );
		if ( ! cal ) {
			unmapped( st, rec, ref, { property: '(block)', value: '', reason: `uncalibrated: ${ rec.name } has no calibration file` } );
			continue;
		}
		const roots = snapsOf( st, `${ rec.index }:` );
		if ( ! Object.keys( roots ).length ) {
			unmapped( st, rec, ref, { property: '(element)', value: json( rec.targets[ 0 ].finder ), reason: 'the draftRef finder resolved no visible element at 375, 768 or 1440' } );
			continue;
		}
		readable.add( rec.index );
		// Every node's content (presence, words, links, icon, image) is decided before any node's look, so a look written
		// from a parent (a Site Info row lifting its icons) meets the content the draft settles, never a skeleton default.
		fillContent( st, rec, ref, cal );
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
		st.out.unread.push( ...unreadOf( { db: st.db, block: rec.name, cal, attributes: st.nodes[ rec.index ].node.attributes || {}, slots: read, written: judged, band: bandSetting( st.db, rec.name, cal )?.slot ?? null } ).map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
	}
	// A host block's setting that paints the same part on every instance of a child block is written once (FR-48-14b).
	partWideWrites( st, opts.partWide );
	const settleHeld = ( result ) => {
		const r = settle( { unmapped: result.unmapped, writes: result.writes } );
		return { unmapped: r.unmapped, alreadyHeld: [ ...( result.alreadyHeld || [] ), ...r.alreadyHeld ] };
	};
	return { ...st.out, ...settleHeld( { unmapped: st.out.unmapped, writes: st.out.writes } ), snaps: st.snaps, settleHeld };
}
