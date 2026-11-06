// The never-silent check of the motion writer (Spec 48 FR-48-78): every record of the animation inventory whose element is
// on the surface ends as a written layer or setting, an UNMAPPED row, or a note that says SGS already does it. A record that
// ends as none of these was recognised by nothing and held by nothing, which is the failure this check turns into a row.
// A record is on the surface when its template element (or the nearest one a script of its own acts inside) is a target of
// a skeleton node, when a recognised behaviour finds its element by a data hook a target carries, or when it is written by
// the same script file as a record that is (a custom element's own script: its parts have no template element of their
// own). Intake's re-derived inventory (`intake.json` `inventory.animations.records`) is the input Fill reads, so a record
// of that shape is what this judges.
import { templateKey } from './fact-key.mjs';
import { handoverEntry } from './fill-handover.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { effectElementSource } from './motion-effect-element.mjs';

const scriptFile = ( r ) => ( /\.m?js$/i.test( String( r.source?.file ?? '' ) ) ? String( r.source.file ) : null );
const tplIds = ( r ) => [ r.element?.template_tpl_id, r.element?.nearest_tpl_id ].flat().filter( ( v ) => null !== v && undefined !== v );

// The record ids a finished run has already accounted for: the layers it wrote (`used`), the layers a control or behaviour
// placed (`written`), and every record id an UNMAPPED row, a note (`<id>: ...`), a write's property or a site option names.
export function accountedIds( { used, written, out } ) {
	const ids = new Set( [ ...used, ...written.keys(), ...out.site.map( ( s ) => s.record ) ] );
	out.unmapped.forEach( ( u ) => String( u.value ).split( ',' ).forEach( ( v ) => ids.add( v.trim() ) ) );
	out.notes.forEach( ( x ) => {
		const m = /^([^\s:]+):/.exec( String( x.text ?? '' ) );
		m && ids.add( m[ 1 ] );
	} );
	out.writes.forEach( ( w ) => String( w.prop ?? '' ).split( /[\s,]+/ ).forEach( ( v ) => ids.add( v ) ) );
	return ids;
}

// The one key of a target: its skeleton node's ref and its slot (the `where` every row carries).
export const targetKey = ( where ) => `${ where.node }|${ where.slot ?? '' }`;
const rowTarget = ( x ) => ( null == x?.node || 'site' === x.node ? null : targetKey( x ) );

// The (record, target) pairs a finished run has accounted for, as `<record id>@<target key>`: the layers used at a target
// (`usedAt`, already in that form), the layers a control or behaviour placed there, and every UNMAPPED row or note that names the
// record at that target. A write to a site option or by property carries no target and is the record's, counted by accountedIds.
export function accountedAt( { usedAt, written, out } ) {
	const pairs = new Set( usedAt );
	for ( const [ id, w ] of written ) {
		w.where && pairs.add( `${ id }@${ targetKey( w.where ) }` );
	}
	out.unmapped.forEach( ( u ) => rowTarget( u ) && String( u.value ).split( ',' ).forEach( ( v ) => pairs.add( `${ v.trim() }@${ rowTarget( u ) }` ) ) );
	out.notes.forEach( ( x ) => {
		const m = /^([^\s:]+):/.exec( String( x.text ?? '' ) );
		m && rowTarget( x ) && pairs.add( `${ m[ 1 ] }@${ rowTarget( x ) }` );
	} );
	return pairs;
}

// Where a record sits on the surface: `homeOf( record )` is { n (the skeleton node), slot } or null for a record whose element
// is not a target. nodes: skeletonNodes(); keyOf( finder ): the inventory key of a target's element; idx:
// lib/fill-behaviour.mjs::behaviourIndex.
export function makeHomeOf( { records, nodes, keyOf, idx, template = null } ) {
	const homes = new Map();
	for ( const n of nodes ) {
		for ( const t of n.targets ) {
			const key = keyOf( t.finder );
			key && ! homes.has( key ) && homes.set( key, { n, slot: t.slot } );
		}
	}
	const homeOf = ( r ) => {
		for ( const tpl of tplIds( r ) ) {
			const h = r.element?.dc ? homes.get( templateKey( { dc: r.element.dc, tpl } ) ) : null;
			if ( h ) {
				return h;
			}
		}
		for ( const [ key, h ] of homes ) {
			if ( idx.hostedFor( key ).some( ( x ) => x.r === r ) ) {
				return h;
			}
		}
		return null;
	};
	const fileHome = new Map();
	for ( const r of records ) {
		const f = scriptFile( r );
		f && ! fileHome.has( f ) && homeOf( r ) && fileHome.set( f, homeOf( r ) );
	}
	// The nearest target above the record's element in the draft's template: an element this surface dropped or absorbed.
	const within = ( r ) => {
		for ( const tpl of r.element?.dc ? tplIds( r ) : [] ) {
			const above = template?.elements?.[ templateKey( { dc: r.element.dc, tpl } ) ]?.parentChain ?? [];
			const key = above.find( ( k ) => homes.has( k ) );
			if ( key ) {
				return homes.get( key );
			}
		}
		return null;
	};
	return Object.assign( ( r ) => homeOf( r ) ?? ( scriptFile( r ) ? fileHome.get( scriptFile( r ) ) ?? null : null ), { direct: homeOf, within } );
}

// The UNMAPPED rows for the records nothing accounted for, per (record, target): a record expected at several targets
// (`expected`: id -> { <target key>: where }) gets a row for each target no layer, row or note at that target holds, even when
// another target of it was written; a record with no target of its own that no accounted id covers gets one row at its home
// (see makeHomeOf), or at the nearest target above its element when this surface dropped that element. A record whose
// template element or script file sits under no target of this surface belongs to another surface and raises nothing
// here; a record that names neither and has no home gets a row naming it with no node.
// refOf( node ): the node's ref.
export function silentRows( { records, accounted, accountedAt: done = new Set(), expected = new Map(), refOf, homeOf } ) {
	const gap = ( r, text ) => `${ r.id } (${ r.mechanism }, ${ r.trigger?.type ?? 'no trigger' }) ${ text }`;
	return ( records || [] ).flatMap( ( r ) => {
		const targets = Object.entries( expected.get( r.id ) || {} );
		if ( targets.length ) {
			return targets.filter( ( [ key ] ) => ! done.has( `${ r.id }@${ key }` ) ).map( ( [ , where ] ) => ( {
				...where, property: 'motion', value: r.id,
				reason: gap( r, `belongs to this surface and reaches ${ where.block } ${ where.slot || 'root' }, but no effect, setting or handover holds it there${ targets.length > 1 ? ` (it reaches ${ targets.length } targets of this surface, and another may be written)` : '' }` ),
			} ) );
		}
		if ( accounted.has( r.id ) ) {
			return [];
		}
		const home = homeOf( r ) ?? homeOf.within?.( r ) ?? null;
		if ( ! home && ( tplIds( r ).length || scriptFile( r ) ) ) {
			return [];
		}
		if ( ! home ) {
			return [ { node: '', block: '', slot: '', property: 'motion', value: r.id, reason: gap( r, 'belongs to this surface (draft inventory), but no effect, setting or handover holds it: no skeleton node holds its element (it has no home on this surface), and a record nothing places is named here' ) } ];
		}
		const own = scriptFile( r ) && ! homeOf.direct( r ) ? ` (written by the script ${ scriptFile( r ) } of an element on this surface)` : '';
		return [ {
			node: refOf( home.n ), block: home.n.name, slot: home.slot, property: 'motion', value: r.id,
			reason: gap( r, `belongs to this surface${ own }, but no effect, setting or handover holds it: nothing recognised it, and a run that cannot place a record names it here` ),
		} ];
	} );
}

// The ids of the style records the written effects read their created element's declarations from (a sheen's band, a ripple's
// circle): the effect holds them, so they are accounted. records: the inventory; written: record id -> placed layer.
export function styleSourceIds( { written, records } ) {
	const byId = new Map( ( records || [] ).map( ( r ) => [ r.id, r ] ) );
	return [ ...written.keys() ].flatMap( ( id ) => ( byId.get( id ) ? [ effectElementSource( byId.get( id ), records )?.id ] : [] ) ).filter( Boolean );
}

// The page's reading progress bar: a record the effect recogniser reads as a page-scroll progress bar whose element is not on
// the surface (the skeleton removes the thin fixed bar: rules.readingProgress). Nothing in the tree can hold it; the Floating
// UI reading progress setting does, so the handover names the setting and the record for site build.
export const READING_PROGRESS_SETTING = 'sgs_floating_ui_reading_progress_enabled (with _colour or _gradient, and _height)';
export function readingProgressHandover( { found, homeOf } ) {
	return found
		.filter( ( { r, b } ) => 'effect' === b.kind && b.effects.some( ( e ) => 'scroll-progress' === e.effect && 'page' === e.values?.source ) && ! homeOf( r ) )
		.map( ( { r } ) => handoverEntry( {
			owner: 'behaviour', kind: 'behaviour',
			evidence: { key: 'reading-progress', draft: `${ r.id } ${ r.element?.selector ?? '' }`.trim(), width: 1440, record: r.id },
			reason: `${ r.id } is the draft's page reading progress bar (a fixed bar scaled by the scroll position); the skeleton removes it because the Floating UI reading progress setting draws it: switch on ${ READING_PROGRESS_SETTING } and give it the bar's height and its colour or gradient`,
		} ) );
}

// The read widths a node's sgsMotion write answers: the widths its root element was read at, where the document gives the
// root a layer state of its own (the write's element is the root; a part's layer times the part, not the root's reads),
// else none.
export function motionWidths( n, doc, reads ) {
	const root = n.targets.find( ( t ) => ! t.slot );
	const own = Object.values( doc.elements?.root || {} ).some( ( layer ) => layer?.state?.values && Object.keys( layer.state.values ).length );
	return root && own ? READ_WIDTHS.filter( ( w ) => reads?.widths?.[ w ]?.[ root.id ] && ! reads.widths[ w ][ root.id ].missing ) : [];
}
