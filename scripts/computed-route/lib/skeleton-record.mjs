// The skeleton writer's reading of the fact record (Spec 48 FR-48-7, lib/fact-record.mjs): what the standing rules need
// to know about an inventory element that the template states and the rendered page only shows indirectly, read through
// the record and never from the element's snippet. An inventory element names its record entry by its template key
// (`<dc file>/<tpl>`, lib/fact-key.mjs::templateKey). The render confirms: where the record and the rendered attributes or
// parent disagree, the view lists a disagreement row (the proposal carries them as `recordDisagreements`) and the rule
// reads the record. An element with no record entry (one a custom element draws, or an inventory taken from another
// draft) is read from its rendered attributes, as before.
import fs from 'fs';
import { loadFacts as loadFactRecord, factsFile, warnMissingFacts } from './fact-record.mjs';
import { translateElement } from './key-space.mjs';
import { templateKey } from './fact-key.mjs';
import { readJson } from './handoff.mjs';
import path from 'path';

const loaded = new Map();

// The client's fact record for a skeleton run, or null when the client has none (a fixture client, a draft intake has not
// read yet). `facts` is lib/skeleton-facts.mjs::loadFacts' object (client and repo). A record that is stale or invalid
// throws (lib/fact-record.mjs::loadFacts), never a fallback to reading the draft. Loaded once per process and file state.
export function recordFor( facts ) {
	if ( ! facts?.client || ! facts?.repo ) {
		return null;
	}
	const file = factsFile( facts.repo, facts.client );
	if ( ! fs.existsSync( file ) ) {
		warnMissingFacts( facts.client, { repo: facts.repo } );
		return null;
	}
	const st = fs.statSync( file );
	const id = `${ file }|${ st.mtimeMs }|${ st.size }`;
	if ( ! loaded.has( id ) ) {
		loaded.set( id, loadFactRecord( facts.client, { repo: facts.repo } ) );
	}
	return loaded.get( id );
}

// The `opened_by` words of the client's handoff `surfaces.json` records, by surface id (the fact record keeps no opener).
export function openersFor( facts ) {
	const file = facts?.client && facts?.repo ? path.join( facts.repo, 'sites', facts.client, 'handoff', 'surfaces.json' ) : null;
	const read = file && fs.existsSync( file ) ? readJson( file ) : null;
	return Object.fromEntries( ( read?.data?.records || [] ).map( ( r ) => [ r.id, String( r.opened_by ?? '' ).trim() ] ) );
}

// A value the cascade treats as unset.
const UNSET = new Set( [ '', 'initial', 'unset', 'inherit', 'revert', 'none' ] );
const NO_COLOUR = new Set( [ '', 'initial', 'transparent', 'rgba(0, 0, 0, 0)', 'currentcolor' ] );
const zeroWidth = ( v ) => UNSET.has( String( v ?? '' ).trim() ) || /^0(?:\.0+)?(?:px|rem|em)?$/.test( String( v ?? '' ).trim() );

// The track list of a grid-template-columns value: repeat() expanded, each top-level token one track.
export function gridTracks( value ) {
	const text = String( value ?? '' ).trim();
	if ( ! text || UNSET.has( text ) ) {
		return [];
	}
	const tokens = [];
	let depth = 0;
	let cur = '';
	for ( const ch of text ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && ! depth ) {
			cur && tokens.push( cur );
			cur = '';
		} else {
			cur += ch;
		}
	}
	cur && tokens.push( cur );
	return tokens.flatMap( ( t ) => {
		const rep = /^repeat\(\s*(\d+)\s*,\s*(.+)\)$/.exec( t );
		return rep ? Array.from( { length: Number( rep[ 1 ] ) }, () => gridTracks( rep[ 2 ] ) ).flat() : [ t ];
	} );
}
// A track that shares the free space (a fraction, or minmax with a zero minimum) or has a fixed length.
export const fractionalTrack = ( t ) => /\d\s*fr$/.test( t ) || /^minmax\(\s*0(?:px)?\s*,/.test( t );
export const fixedTrack = ( t ) => /^-?[\d.]+(?:px|rem|em|ch|vw|vh)$/.test( t );

// The view of a record: o { record (or null), parts: { surface id: opened_by words } }.
export function recordView( record, { openers = {}, rootComponent = null } = {} ) {
	const els = record?.elements ?? {};
	// The element's template key through lib/key-space.mjs::translateElement (a served `Root` host is the entry component);
	// an element that cannot be translated is listed in `untranslated`, never guessed.
	const untranslated = [];
	const listed = new Set();
	const keyOf = ( e ) => {
		if ( ! e ) {
			return null;
		}
		const t = translateElement( e, rootComponent );
		if ( ! t.reason ) {
			return t.templateKey;
		}
		// A root host with no entry component is read under the name it was stamped with when the record holds an entry there
		// (a record whose draft component is itself named for the runtime's root); otherwise it is listed (and still answers under the stamped name).
		const stamped = e.template && null != e.tpl ? templateKey( { dc: e.template, tpl: e.tpl } ) : null;
		if ( stamped && els[ stamped ] ) {
			return stamped;
		}
		if ( ! listed.has( e.key ) ) {
			listed.add( e.key );
			untranslated.push( { key: e.key, reason: t.reason } );
		}
		return stamped;
	};
	const entry = ( e ) => {
		const k = keyOf( e );
		return k ? els[ k ] ?? null : null;
	};
	const disagreements = [];
	const noted = new Set();
	const note = ( e, field, recorded, rendered ) => {
		const id = `${ keyOf( e ) }|${ field }`;
		if ( ! noted.has( id ) ) {
			noted.add( id );
			disagreements.push( { key: keyOf( e ), field, record: recorded, render: rendered } );
		}
	};
	const children = new Map();
	for ( const [ k, v ] of Object.entries( els ) ) {
		const p = v.template.realParent;
		p && ( children.get( p ) ?? children.set( p, [] ).get( p ) ).push( k );
	}

	// Whether the record resolves an attribute binding to a value: its answers hold one at any width (not undefined, not a
	// failed read), or its expression is a constant other than false, null or undefined (`{{ true }}`).
	const holeResolved = ( rec, name, text ) => {
		const answered = Object.entries( rec.logic?.holes ?? {} ).some( ( [ id, answers ] ) => id.startsWith( `attr:${ name }#` ) && Object.values( answers ).some( ( a ) => ! a.err && ( a.v ?? [] ).some( ( x ) => 'undefined' !== x.t ) ) );
		return answered || /^\s*\{\{\s*(?:true|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*\}\}\s*$/.test( String( text ) );
	};
	// An attribute's template text (a literal, or a draft binding such as `{{ open }}`), or null when the template has none.
	// An attribute that is only a binding counts as present when the record's answers for it hold a value, or the render
	// shows it; a binding that resolves to nothing everywhere is absent. An element with no entry reads its rendered attribute.
	const attr = ( e, name ) => {
		const rec = entry( e );
		const rendered = e.attrs?.[ name ];
		if ( ! rec ) {
			return null == rendered ? null : String( rendered );
		}
		const text = rec.template.attrs[ name ];
		const present = null != text && ( ! /^\s*\{\{[^}]*\}\}\s*$/.test( String( text ) ) || null != rendered || holeResolved( rec, name, text ) );
		present !== ( null != rendered ) && note( e, name, present, null != rendered );
		return present ? String( text ) : null;
	};
	const realTag = ( e ) => entry( e )?.template.realTag ?? e.tag;
	const declared = ( e ) => {
		const rec = entry( e );
		const out = {};
		for ( const [ n, v ] of rec?.template.style.static ?? [] ) {
			out[ n ] = String( v ).trim();
		}
		return out;
	};
	// The properties a `style-*` hole binds on the element (their values are the draft's logic, not declarations).
	const holeProps = ( e ) => ( entry( e )?.template.style.holes ?? [] ).map( ( h ) => /^style:([a-z-]+)#/.exec( h )?.[ 1 ] ).filter( Boolean );
	const num = ( v ) => ( /^-?[\d.]+$/.test( String( v ?? '' ).trim() ) ? Number( v ) : null );
	const ownPaint = ( e ) => {
		const st = declared( e );
		const bound = holeProps( e );
		if ( bound.some( ( p ) => /^(?:background|border|box-shadow)/.test( p ) ) ) {
			return true;
		}
		if ( ! NO_COLOUR.has( String( st[ 'background-color' ] ?? '' ).toLowerCase() ) || ! UNSET.has( st[ 'background-image' ] ?? '' ) || ! UNSET.has( st[ 'box-shadow' ] ?? '' ) ) {
			return true;
		}
		return [ 'top', 'right', 'bottom', 'left' ].some( ( side ) => ! zeroWidth( st[ `border-${ side }-width` ] ) && ! UNSET.has( st[ `border-${ side }-style` ] ?? '' ) );
	};
	const parentsOf = ( e ) => {
		const rec = entry( e );
		return rec ? { parent: rec.template.parent, realParent: rec.template.realParent, chain: rec.template.parentChain } : null;
	};
	// Everything the rules read about one element, from the record.
	const describe = ( e ) => {
		const st = declared( e );
		return {
			realTag: realTag( e ),
			ariaCurrent: attr( e, 'aria-current' ), ariaExpanded: attr( e, 'aria-expanded' ), ariaPressed: attr( e, 'aria-pressed' ), required: attr( e, 'required' ), tabindex: attr( e, 'tabindex' ),
			display: st.display ?? null, flex: { grow: st[ 'flex-grow' ] ?? null, shrink: st[ 'flex-shrink' ] ?? null, basis: st[ 'flex-basis' ] ?? null }, gridTemplateColumns: st[ 'grid-template-columns' ] ?? null,
			position: st.position ?? null, width: st.width ?? null, minWidth: st[ 'min-width' ] ?? null, aspectRatio: st[ 'aspect-ratio' ] ?? null,
			ownPaint: ownPaint( e ), templateParents: parentsOf( e ), bound: holeProps( e ),
		};
	};
	// The template elements directly under an element (a repeated item or a wrapper in a condition counts as its parent's child).
	const childrenOf = ( e ) => ( children.get( keyOf( e ) ) ?? [] ).map( ( k ) => els[ k ] );
	// Whether the element is one of a repeated run (inside an `sc-for`): the loop's own parent is the element's parent.
	const repeated = ( e ) => ( entry( e )?.template.membership.scFor.length ?? 0 ) > 0;
	// A run of sibling links under the element: a loop whose item is a link, directly under it, or two or more static links
	// with one declared style.
	const linkRun = ( e ) => {
		const kids = childrenOf( e ).filter( ( k ) => 'a' === k.template.realTag );
		if ( kids.some( ( k ) => k.template.membership.scFor.some( ( f ) => els[ f.key ]?.template.realParent === keyOf( e ) ) ) ) {
			return true;
		}
		const statics = kids.filter( ( k ) => ! k.template.membership.scFor.length );
		return statics.length >= 2 && new Set( statics.map( ( k ) => JSON.stringify( k.template.style.static ) ) ).size === 1;
	};
	// The disagreement between the rendered parent and the template parent: both in the same draft file and differing.
	const checkParent = ( e, renderedParent ) => {
		const rec = entry( e );
		const pr = renderedParent ? keyOf( renderedParent ) : null;
		rec && pr && renderedParent.template === e.template && rec.template.realParent !== pr && note( e, 'parent', rec.template.realParent, pr );
	};
	return { has: ( e ) => !! entry( e ), entry, attr, realTag, declared, holeProps, ownPaint, describe, childrenOf, repeated, linkRun, parentsOf, checkParent, disagreements, untranslated, openers, surfaces: record?.surfaces ?? {}, sources: record?.sources ?? null, recordOf: ( id ) => record?.surfaces?.[ id ] ?? null, elements: els };
}

// The surface the proposal is for, read from the record's `surfaces` and the elements' memberships: { id, kind, parent: { id,
// kind } | null, openedBy, headerDisclosure } plus `surfaceParts` (the records whose parent is this surface). Matched by kind
// and name; null when the record names no such surface.
export function surfaceContext( view, { kind, name } ) {
	const all = Object.values( view.surfaces );
	const hits = all.filter( ( s ) => s.kind === kind && ( null == name || s.name === name ) );
	if ( ! hits.length ) {
		return null;
	}
	const s = hits[ 0 ];
	const parent = s.parent ? view.surfaces[ s.parent ] ?? null : null;
	const openedBy = view.openers[ s.id ] || '';
	const control = parent ? Object.values( view.elements ).some( ( e ) => e.surfaces.some( ( m ) => m.id === parent.id ) && [ 'a', 'button' ].includes( e.template.realTag ) && null != e.template.attrs[ 'aria-expanded' ] ) : false;
	return {
		id: s.id, kind: s.kind, name: s.name, parent: parent ? { id: parent.id, kind: parent.kind } : null, openedBy, openerControl: control,
		// A menu or panel a header's navigation opens: its parent surface is the header and something opens it (its recorded opener, or an aria-expanded control in the header).
		headerDisclosure: [ 'menu', 'panel' ].includes( s.kind ) && 'header' === parent?.kind && ( !! openedBy || control ),
		surfaceParts: all.filter( ( p ) => p.parent === s.id ).map( ( p ) => ( { id: p.id, kind: p.kind, name: p.name, openedBy: view.openers[ p.id ] || '', roots: p.roots } ) ),
	};
}
