// A form on a page is a link to its saved form (Spec 48 FR-48-57, §3.3 reference blocks). Every draft form is one saved post
// cloned once as its own surface; on a page the form's place holds the reference block linked to that post (`<x>IsLinked`
// and `<x>Id`, read from the block's render.php by lib/references.mjs::detectReferences) with no inner blocks, and the
// draft's form elements are absorbed into it.
// The draft element that is the form is found through the fact record, never by name: the handoff record of a form surface
// names its page (`parent`) and its root template elements (`roots`: the draft's conditions around the form), and the form
// is the draft element directly under the innermost root. Only a form record whose page is the surface in hand is linked, so a
// form surface never links itself.

import fs from 'fs';
import path from 'path';
import { formElement } from './skeleton-form-element.mjs';

// The linked forms of a client's manifest (sites/<client>/build/surfaces.json and the intake record it names): none when the
// client has no manifest or no intake record yet.
export function formLinksFor( { repo, client, refs } ) {
	const read = ( ...parts ) => {
		const file = path.join( repo, 'sites', client, 'build', ...parts );
		return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
	};
	return formLinksOf( { surfaces: read( 'surfaces.json' ), intake: read( 'intake', 'intake.json' ), refs } );
}

// The linked forms a manifest provides: [ { recordId, slug, block } ] from the surfaces.json entries whose `provides` names
// `<block>:<slug>` for a linked reference block, the record id being the id of the intake skeleton the entry names.
export function formLinksOf( { surfaces, intake, refs } ) {
	const out = [];
	for ( const entry of Object.values( surfaces || {} ) ) {
		const recordId = entry.intakeSurface ? intake?.skeletons?.[ entry.intakeSurface ]?.id : null;
		for ( const p of entry.provides || [] ) {
			const at = p.indexOf( ':' );
			const block = p.slice( 0, at );
			if ( at > 0 && recordId && 'linked' === refs[ block ]?.kind ) {
				out.push( { recordId, slug: p.slice( at + 1 ), block } );
			}
		}
	}
	return out;
}

// The root among a record's `roots` that sits inside every other (the deepest in the template).
function innermostRoot( roots, elements ) {
	const depth = ( k ) => elements[ k ]?.template?.parentChain?.length ?? 0;
	return [ ...roots ].sort( ( a, b ) => depth( b ) - depth( a ) )[ 0 ] ?? null;
}

// A function over inventory elements: the verdict of the form-link rule for an element, or null.
//   { block, attributes }  the element is the form (lib/skeleton-form-element.mjs::formElement), so it becomes the linked
//                          reference block;
//   { remove: true }       another element under the same root: the form is one embed, so it goes.
// When the first element is the page's layout around the form (formElement: the grid around the form card and the aside
// beside it), that element and what it holds beside the form get no verdict: the page's own rules build them, and the saved
// form never holds them.
// view: lib/skeleton-record.mjs::recordView; scope: the surface's record context (surfaceContext); els: the inventory's
// elements in document order; rule: decisions `rules.formLink`; links: formLinksOf's result.
export function linkedFormOf( { view, scope, links, refs, els, rule, m = null } ) {
	const none = () => null;
	if ( ! scope || ! rule?.block ) {
		return none;
	}
	// The root template key of each form record on this surface's page, with the link it makes.
	const byRoot = new Map();
	for ( const link of links || [] ) {
		const rec = view.recordOf( link.recordId );
		const ref = refs[ link.block ];
		const root = 'form' === rec?.kind && rec.parent === scope.id && 'linked' === ref?.kind ? innermostRoot( rec.roots || [], view.elements ) : null;
		root && ! byRoot.has( root ) && byRoot.set( root, { ref, slug: link.slug, block: link.block } );
	}
	if ( ! byRoot.size ) {
		return none;
	}
	// The inventory elements under each root, the first in document order being the form.
	const under = new Map();
	for ( const e of els ) {
		const root = view.parentsOf( e )?.parent;
		byRoot.has( root ) && ( under.get( root ) ?? under.set( root, [] ).get( root ) ).push( e );
	}
	const verdicts = new Map();
	for ( const [ root, list ] of under ) {
		const { ref, slug, block } = byRoot.get( root );
		const attributes = { [ ref.flag ]: true, [ ref.key ]: slug };
		const form = m ? formElement( m, list[ 0 ] ) : list[ 0 ];
		verdicts.set( form.key, { block, attributes } );
		list.slice( 1 ).forEach( ( e ) => verdicts.set( e.key, { remove: true } ) );
	}
	return ( e ) => verdicts.get( e.key ) ?? null;
}
