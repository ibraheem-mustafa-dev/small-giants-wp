// Fill's root-down resolution (FR-47-4 steps 2 and 3): every node and slot of the skeleton, every property that differs
// from what the node already shows, written through the resolver; spacing ownership decided per tier from rendered
// gaps; presence, words and links from calibration; what no setting can hold listed as UNMAPPED, and what lives outside
// the tree as handover.
import { blockSchema, LOOSE } from './resolve.mjs';
import { setAttr, refOf } from './tree.mjs';
import { knownPaths } from './fill-prop.mjs';
import { presenceDecisions, textDecisions, linkDecisions } from './fill-presence.mjs';
import { linkAttrDecisions, blockSupportsAnchor } from './fill-link-attrs.mjs';
import { imageSlots, mediaDecisions, nestedImage, factImage } from './fill-media.mjs';
import { handoverEntry } from './fill-handover.mjs';
import { unreadOf } from './fill-unread.mjs';
import { hasRow } from './fill-skeleton.mjs';
import { liftRow } from './fill-row-lift.mjs';
import { json, makeState, snapsOf, planSpacing } from './fill-resolve-state.mjs';
import { fillElement, unmapped } from './fill-resolve-element.mjs';

const PSEUDO_LAYERS = [ '::before', '::after' ];

// Presence, words and links for one node's elements, and its declared handover (step 5).
function fillContent( st, rec, ref, cal ) {
	const node = st.flat[ rec.index ];
	const skeletonNode = st.nodes[ rec.index ].node;
	const atDesktop = Object.fromEntries( rec.targets.map( ( t ) => [ t.slot, st.reads.widths[ 1440 ]?.[ t.id ] ] ) );
	const evidence = Object.fromEntries( rec.targets.filter( ( t ) => '' !== t.slot ).map( ( t ) => [ t.slot, !! atDesktop[ t.slot ] && ! atDesktop[ t.slot ].missing ] ) );
	const words = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.words ] ) );
	const hrefs = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.href ] ) );
	const linkFacts = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing && ( s.target || s.rel || s.id || s.ariaLabel ) ).map( ( [ slot, s ] ) => [ slot, { target: s.target, rel: s.rel, id: s.id, ariaLabel: s.ariaLabel } ] ) );
	const local = [];
	const take = ( r ) => {
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
			st.out.handover.push( handoverEntry( { owner: 'site-info', kind: 'link', node: ref, block: rec.name, slot: h.slot, evidence: { key: h.attr, draft: h.address, width: 1440, siteInfoKey: h.siteInfoKey }, reason: `${ h.attr } is bound to Site Info "${ h.siteInfoKey }"; the draft links to ${ h.address }, kept as the fallback. Fill Site Info "${ h.siteInfoKey }" from it` } ) );
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
	take( linkAttrDecisions( { calibration: cal, schema: blockSchema( rec.name ) || {}, anchor: blockSupportsAnchor( rec.name ), attributes: node.attributes || {}, slots: linkFacts } ) );
	take( mediaDecisions( { slots: imageSlots( st.db, rec.name ), schema: blockSchema( rec.name ), attributes: node.attributes || {}, img: nestedImage( atDesktop ), media: { ...st.media, origin: st.origin }, fact: factImage( st.facts, rec.targets.find( ( t ) => t.finder?.tpl )?.finder.tpl, st.rootComponent ) } ) );
	// A skeleton's own statement that something lives outside the tree turns the matching UNMAPPED row into handover.
	for ( const h of skeletonNode.handover || [] ) {
		const slot = h.slot ?? '';
		const draft = 'text' === h.kind ? words[ slot ] : 'link' === h.kind ? hrefs[ slot ] : 'presence' === h.kind ? ( '' === slot ? 'shown' : ( evidence[ slot ] ? 'shown' : 'hidden' ) ) : h.detail;
		st.out.handover.push( handoverEntry( { owner: h.owner, kind: h.kind, node: ref, block: rec.name, slot, evidence: { key: h.kind, draft: draft ?? '', width: 1440 }, reason: h.detail } ) );
	}
	const declared = ( u ) => ( skeletonNode.handover || [] ).some( ( h ) => h.kind === u.property && ( h.slot ?? '' ) === u.slot );
	st.out.unmapped.push( ...local.filter( ( u ) => ! declared( u ) ) );
}

// Fills the tree in place. tree: the cleaned skeleton (refs added, draft keys removed), nodes: skeletonNodes of the
// skeleton (same indices), reads: lib/fill-read.mjs::readDraft, calFor( block ): calibration or null, ledger: the
// divergence entries, ledgerStates: the walker states that are the rest state (the ledger's `state` names one),
// fixtures: calibration-fixtures.json (null reads every rest paint as the block's default).
// Returns { writes, unmapped, notes, handover, spacing, fluid, held, snaps }.
export function fillTree( opts ) {
	const st = makeState( { ledger: [], ledgerStates: [], origin: '', fixtures: null, ...opts, snaps: [] } );
	for ( const rec of st.nodes ) {
		const ref = refOf( st.flat[ rec.index ] );
		planSpacing( st, rec );
		if ( ! rec.targets.length ) {
			continue;
		}
		const cal = st.calFor( rec.name );
		if ( ! cal ) {
			unmapped( st, rec, ref, { property: '(block)', value: '', reason: `uncalibrated: ${ rec.name } has no calibration file` } );
			continue;
		}
		const roots = snapsOf( st, `${ rec.index }:` );
		if ( ! Object.keys( roots ).length ) {
			unmapped( st, rec, ref, { property: '(element)', value: json( rec.targets[ 0 ].finder ), reason: 'the draftRef finder resolved no visible element at 375, 768 or 1440' } );
			continue;
		}
		fillContent( st, rec, ref, cal );
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
		// What this node's calibration knows and nothing read or judged, so no setting is skipped silently.
		const read = rec.targets.filter( ( t ) => Object.keys( snapsOf( st, t.id ) ).length ).map( ( t ) => t.slot );
		st.out.unread.push( ...unreadOf( { db: st.db, block: rec.name, cal, attributes: st.nodes[ rec.index ].node.attributes || {}, slots: read, written: new Set( st.out.writes.filter( ( w ) => w.index === rec.index ).map( ( w ) => w.attr ) ) } ).map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
	}
	return { ...st.out, snaps: st.snaps };
}
