// Fill's writer of the buy box's two-column layout (F-50, FR-48-60): a placed `sgs/buybox` read at the draft's grid holding the
// gallery and the information column (lib/template-piece-buybox.mjs::takeColumn makes the grid its draftRef) gets
// `galleryColumnRatio` and `galleryColumnGap` from the draft's boxes (lib/template-piece-buybox.mjs::columnLayout). Both paint
// CSS properties, so the skeleton never carries them (the skeleton lint, R-47-10).
// The two settings hold the layout as the block draws it: a share of the grid against the column's 1fr, and a gap that applies
// only while the columns sit side by side. The look pass reads the grid's own computed values at one width (a row gap of the
// stacked columns, pixel columns), so this writer owns the two settings: it runs before the width ladder, replaces a value the
// look pass put on them, and settles the grid's column and column-gap rows it holds, so the ladder never turns them into pixel
// Custom CSS. A value any other writer put there (the skeleton, a content decision) is a conflict row, never overwritten; a
// setting the block's schema lacks or a grid the reader refuses is a row or a note, never written silently.
import { columnLayout } from './template-piece-buybox.mjs';
import { inventoryIndex } from './template-piece-draft.mjs';
import { answer } from './fill-regap.mjs';
import { setAttr } from './tree.mjs';

const BLOCK = 'sgs/buybox';
const ATTRS = [ 'galleryColumnRatio', 'galleryColumnGap' ];
// The grid's rows the two settings hold once written: the columns (the ratio, stacked below stackBelow) and the gap between them.
const HELD = { 'grid-template-columns': 'galleryColumnRatio', 'column-gap': 'galleryColumnGap' };
// How far a width's gallery share may stray from the one ratio the setting holds and still be that ratio.
const RATIO_TOL = 0.05;
const json = ( v ) => JSON.stringify( v ?? null );
// A write the look pass made from a draft value (its prop a CSS property), not a decision of the skeleton or a content writer.
const lookWrite = ( w ) => !! w && ! String( w.prop ?? '' ).startsWith( '(' ) && 'buybox-columns' !== w.how;

// nodes: Fill's records ({ index, name, targets }); flat: the tree's nodes by index; refOf( node ): its ref; inventory: the
// surface's skeleton inventory; attrExists( block, attr ); writes: the writes Fill made so far; unmapped: the rows still open.
// Returns { writes, unmapped (conflict and missing-setting rows), notes, dropped (earlier writes this one replaces), remaining
// (the open rows it leaves), answered (the rows it holds, lib/fill-report.mjs::passSettled) }.
export function buyboxColumnWrites( { nodes, flat, refOf, inventory, attrExists, writes = [], unmapped = [] } ) {
	const out = { writes: [], unmapped: [], notes: [], dropped: [], remaining: [ ...unmapped ], answered: [] };
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
		const holds = {};
		for ( const attr of ATTRS ) {
			const value = layout.attrs[ attr ];
			const row = { node: ref, block: BLOCK, slot: '', property: 'galleryColumnRatio' === attr ? 'grid-template-columns' : 'gap', value: json( value ), state: null };
			if ( ! attrExists( BLOCK, attr ) ) {
				out.unmapped.push( { ...row, reason: `${ BLOCK } has no ${ attr } setting` } );
				continue;
			}
			const held = node.attributes?.[ attr ];
			const earlier = writes.filter( ( w ) => w.index === rec.index && w.attr === attr );
			const replaces = undefined !== held && json( held ) !== json( value ) && earlier.length > 0 && earlier.every( lookWrite );
			if ( undefined !== held && json( held ) !== json( value ) && ! replaces ) {
				out.unmapped.push( { ...row, reason: `conflict: ${ attr } already holds ${ json( held ) }; the draft's grid ${ grid } gives ${ json( value ) }` } );
				continue;
			}
			holds[ attr ] = true;
			if ( undefined !== held && ! replaces ) {
				continue;
			}
			if ( replaces ) {
				out.dropped.push( ...earlier );
				out.notes.push( `${ ref } ${ BLOCK }: ${ attr } ${ json( held ) } read from the grid's ${ [ ...new Set( earlier.map( ( w ) => w.prop ) ) ].join( ', ' ) } at one width is replaced by the draft's two columns (${ json( value ) })` );
			}
			const { before, after } = setAttr( node, { attr, value, merge: 'replace' } );
			out.writes.push( { node: ref, index: rec.index, block: BLOCK, slot: '', prop: row.property, attr, before, after, widths: [], how: 'buybox-columns', note: `the draft's gallery ${ layout.side } beside the information column ${ layout.column } in the grid ${ grid }` } );
		}
		// The grid's column and gap rows the written settings hold. The columns only when the block stacks them where the draft does
		// (no side-by-side phone) and every width's gallery share is the one ratio within RATIO_TOL; otherwise the row stays open.
		const ratio = layout.attrs.galleryColumnRatio;
		const oneRatio = Object.values( layout.ratios || {} ).every( ( r ) => Math.abs( r - ratio ) <= RATIO_TOL * ratio );
		const stacksAsDrawn = ! ( layout.sideBySide || [] ).includes( 375 );
		const settles = ( prop ) => holds[ HELD[ prop ] ] && ( 'column-gap' === prop || ( oneRatio && stacksAsDrawn ) );
		out.remaining = out.remaining.filter( ( u ) => {
			const mine = ( u.node === ref || ( u.nodes || [] ).includes( ref ) ) && '' === ( u.slot ?? '' ) && ! u.state && HELD[ u.property ] && settles( u.property );
			mine && out.answered.push( { ...answer( u, u.widths || layout.sideBySide || [] ), settledDetail: `lib/fill-buybox-columns.mjs: ${ HELD[ u.property ] } holds the draft's two columns of the grid ${ grid }` } );
			return ! mine;
		} );
	}
	return out;
}
