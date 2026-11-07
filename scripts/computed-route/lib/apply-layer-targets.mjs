// The applier's layer targets (lib/apply-family-layers.mjs): one target per bare decorative layer the skeleton found in the
// draft that something other than a block does not deliver. The skeleton proposal (`<surface>.proposal.json`, rows of rule
// `decorationLayer`) names the layers; the skeleton inventory (`<surface>.inventory.json`) gives each its parent and siblings.
// A layer becomes a target `{ ref, key, tpl, via: 'layer', layer }` whose ref is the class its block will carry (layerRef).
// `layer` holds where the block goes (`anchor`: { match, position }, a block of the live post and before, after or first-child of
// it), the sides the draft's inline style places it by, its parent's block and ref, or `unpaired` with the reason it cannot be
// placed. Blocks are placed in the draft's child order.
import fs from 'node:fs';
import path from 'node:path';
import { deliveredKind, declaredSides, layerRef } from './decoration-layers.mjs';

const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

// `saved`: { ref: { block, attrs } } of the surface's post; `pairs`: the surface's pairs; `decisions`: the skeleton decisions.
export function layerTargets( { repo, client, surface, pairs, saved, decisions } ) {
	const dir = path.join( repo, 'sites', client, 'build', 'skeleton' );
	const proposal = readJson( path.join( dir, `${ surface }.proposal.json` ) );
	const inventory = readJson( path.join( dir, `${ surface }.inventory.json` ) );
	if ( ! proposal || ! inventory ) {
		return { targets: [], notes: [] };
	}
	const kinds = decisions?.rules?.decorationDelivered?.kinds;
	const byKey = new Map( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	const rows = proposal.rows.filter( ( r ) => 'decorationLayer' === r.rule && byKey.has( r.key ) && ! deliveredKind( kinds, byKey.get( r.key ) ) );
	const layerKeys = new Set( rows.map( ( r ) => r.key ) );
	// A pair on a draft element: the first that is not a skeleton slot, and whose block is on the post.
	const pairOf = ( key ) => pairs.find( ( p ) => p.tpl === key && ! p.slot && 'layer' !== p.via && saved[ p.ref ] );
	const targets = [];
	for ( const row of rows ) {
		const e = byKey.get( row.key );
		const ref = layerRef( surface, row.key );
		const parent = pairOf( e.parentKey );
		const base = { key: ref, ref, tpl: row.key, via: 'layer' };
		if ( ! parent ) {
			targets.push( { ...base, layer: { unpaired: `the layer's parent ${ e.parentKey } has no block on the post` } } );
			continue;
		}
		const siblings = inventory.elements.filter( ( x ) => x.parentKey === e.parentKey );
		const at = siblings.findIndex( ( x ) => x.key === row.key );
		// The nearest block before the layer in the draft's child order (another layer is no anchor: it is not on the post yet, and
		// two layers after one block keep their own order because the writer applies the ops in order), else the nearest after it,
		// else the parent itself.
		const real = ( x ) => ( layerKeys.has( x.key ) ? null : pairOf( x.key ) );
		const before = siblings.slice( 0, at ).reverse().map( real ).find( Boolean );
		const next = siblings.slice( at + 1 ).map( real ).find( Boolean );
		const anchor = before ? { match: before.ref, position: 'after' } : ( next ? { match: next.ref, position: 'before' } : { match: parent.ref, position: 'first-child' } );
		targets.push( { ...base, layer: { anchor, parentRef: parent.ref, parentBlock: saved[ parent.ref ].block, sides: declaredSides( e.attrs?.style ), anchorTo: ( decisions?.rules?.decorationLayer?.sectionAnchorBlocks || [] ).includes( saved[ parent.ref ].block ) ? 'section' : null } } );
	}
	return { targets, notes: [] };
}
