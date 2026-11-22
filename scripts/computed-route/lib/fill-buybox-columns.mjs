// Fill's writer of the buy box's two-column layout (F-50): a placed `sgs/buybox` read at the draft's grid holding the gallery and
// the information column (lib/template-piece-buybox.mjs::takeColumn makes the grid its draftRef) gets `galleryColumnRatio` and
// `galleryColumnGap` from the draft's boxes (lib/template-piece-buybox.mjs::columnLayout). Both paint CSS properties, so the
// skeleton never carries them (the skeleton lint, R-47-10); the buy box has no calibration to read them through, so this writer
// is their one route. A setting the block's schema lacks, a value the node already holds differently, or a grid the reader
// refuses is a row or a note, never written silently.
import { columnLayout } from './template-piece-buybox.mjs';
import { inventoryIndex } from './template-piece-draft.mjs';
import { setAttr } from './tree.mjs';

const BLOCK = 'sgs/buybox';
const ATTRS = [ 'galleryColumnRatio', 'galleryColumnGap' ];
const json = ( v ) => JSON.stringify( v ?? null );

// nodes: Fill's records ({ index, name, targets }); flat: the tree's nodes by index; refOf( node ): its ref; inventory: the
// surface's skeleton inventory; attrExists( block, attr ). Returns { writes, unmapped, notes }.
export function buyboxColumnWrites( { nodes, flat, refOf, inventory, attrExists } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const index = inventoryIndex( inventory );
	for ( const rec of nodes.filter( ( r ) => BLOCK === r.name ) ) {
		const grid = rec.targets?.find( ( t ) => '' === t.slot )?.finder?.tpl;
		const node = flat[ rec.index ];
		const ref = refOf( node );
		if ( ! grid || ! index.byKey.has( grid ) ) {
			out.notes.push( `${ ref }: ${ BLOCK } is read at no draft element the inventory holds, so its column ratio and gap are not written` );
			continue;
		}
		const layout = columnLayout( index, grid );
		if ( layout.why ) {
			out.notes.push( `${ ref }: ${ BLOCK }'s column ratio and gap are not written: ${ layout.why }` );
			continue;
		}
		for ( const attr of ATTRS ) {
			const value = layout.attrs[ attr ];
			const row = { node: ref, block: BLOCK, slot: '', property: 'galleryColumnRatio' === attr ? 'grid-template-columns' : 'gap', value: json( value ), state: null };
			if ( ! attrExists( BLOCK, attr ) ) {
				out.unmapped.push( { ...row, reason: `${ BLOCK } has no ${ attr } setting` } );
				continue;
			}
			const held = node.attributes?.[ attr ];
			if ( undefined !== held && json( held ) !== json( value ) ) {
				out.unmapped.push( { ...row, reason: `conflict: ${ attr } already holds ${ json( held ) }; the draft's grid ${ grid } gives ${ json( value ) }` } );
				continue;
			}
			if ( undefined !== held ) {
				continue;
			}
			const { before, after } = setAttr( node, { attr, value } );
			out.writes.push( { node: ref, index: rec.index, block: BLOCK, slot: '', prop: row.property, attr, before, after, widths: [], how: 'buybox-columns', note: `the draft's gallery ${ layout.side } beside the information column ${ layout.column } in the grid ${ grid }` } );
		}
	}
	return out;
}
