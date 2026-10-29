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
import { hostOf } from './motion-behaviours.mjs';

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

// Where a record sits on the surface: `homeOf( record )` is { n (the skeleton node), slot } or null for a record whose element
// is not a target. nodes: skeletonNodes(); keyOf( finder ): the inventory key of a target's element; idx:
// lib/fill-behaviour.mjs::behaviourIndex.
export function makeHomeOf( { records, nodes, keyOf, idx } ) {
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
	// The first home each draft component has on this surface. A script-driven record that names no element at all (no template
	// element, none near it, no `[data-*]` hook to find it by) cannot be placed by any surface, so a surface that shows its
	// component answers for it; a record that names an element which is not on this surface is another surface's.
	const compHome = new Map();
	for ( const [ key, h ] of homes ) {
		const dc = key.slice( 0, key.lastIndexOf( '/' ) );
		compHome.has( dc ) || compHome.set( dc, h );
	}
	return Object.assign( ( r ) => homeOf( r ) ?? ( scriptFile( r ) ? fileHome.get( scriptFile( r ) ) ?? null : null ), { direct: homeOf, byComponent: ( r ) => ( 'active' === ( r.status ?? 'active' ) && SCRIPT_DRIVEN.test( r.mechanism ?? '' ) && 0 === tplIds( r ).length && ! hostOf( r ) && ! scriptFile( r ) && r.element?.dc ? compHome.get( r.element.dc ) ?? null : null ) } );
}

// The mechanisms a draft's script runs (a style, text or scroll write, a Web Animation, a code-built CSS animation): their
// record has no template element when the code reaches the element by a name the inventory could not follow.
const SCRIPT_DRIVEN = /^(?:js-|waapi|css-animation)/;

// The UNMAPPED rows for the on-surface records nothing accounted for (see makeHomeOf); refOf( node ): the node's ref.
export function silentRows( { records, accounted, refOf, homeOf } ) {
	return ( records || [] ).filter( ( r ) => ! accounted.has( r.id ) ).flatMap( ( r ) => {
		const home = homeOf( r ) ?? homeOf.byComponent?.( r );
		if ( ! home ) {
			return [];
		}
		const own = scriptFile( r ) && ! homeOf.direct( r ) ? ` (written by the script ${ scriptFile( r ) } of an element on this surface)` : '';
		const where = homeOf( r ) ? `belongs to this surface${ own }` : `acts on an element the inventory could not place on a template element (its code reaches ${ r.element?.selector ? `\`${ r.element.selector }\`` : 'it by a name the inventory could not follow' }) in the component ${ r.element.dc } this surface shows`;
		return [ {
			node: refOf( home.n ), block: home.n.name, slot: home.slot, property: 'motion', value: r.id,
			reason: `${ r.id } (${ r.mechanism }, ${ r.trigger?.type ?? 'no trigger' }) ${ where }, but no effect, setting or handover holds it: nothing recognised it, and a run that cannot place a record names it here`,
		} ];
	} );
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
