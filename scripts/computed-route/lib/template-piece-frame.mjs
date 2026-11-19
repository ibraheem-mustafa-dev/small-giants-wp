// The frame piece of a WooCommerce page's template (Spec 48 FR-48-56, FR-48-87; data/template-pieces.json kind `frame`):
// which header and footer the template copy holds, read by lib/template-frame.mjs::pageFrame from the handoff's records and
// the fact record. A page that mounts the shared header and footer leaves the tree as it is (the copy takes the site's
// shared parts). Otherwise the main node is marked `templateFrame: { header, footer }` (each a part slug, or null for none),
// and a page that draws its own top bar has that bar's node marked `templatePart: <template>-header` and set beside the main
// at the top of the tree (the page wrapper that held both is dropped: it is the page itself, which the template is). The
// bar is in the tree only when the surface's inventory was read from the page wrapper (lib/template-frame.mjs::
// inventoryRootFor); an inventory read from the main alone leaves the tree as it is, with a note, so the shared header
// stays until the bar is read.
import { handoffRecords, pageFrame, partSlug, factKey } from './template-frame.mjs';

const keyOf = ( node ) => node?.draftRef?.tpl ?? null;

export function place( ctx, piece ) {
	const tree = ctx.tree || [];
	const inv = ctx.inventory?.elements || [];
	const root = inv.find( ( e ) => ! e.parentKey || ! inv.some( ( x ) => x.key === e.parentKey ) );
	const mainEl = 'main' === root?.tag ? root : inv.find( ( e ) => 'main' === e.tag && e.parentKey === root?.key );
	if ( ! mainEl || ! ctx.factRecord ) {
		return { tree, notes: [ `${ ctx.key }: piece "${ piece.id }" read no frame: ${ ! mainEl ? 'the inventory holds no page <main> at its root' : 'no fact record was read' }` ] };
	}
	const frame = pageFrame( { facts: ctx.factRecord, records: ctx.records ?? handoffRecords( ctx.handoffDir ), component: ctx.rootComponent, mainKey: factKey( mainEl.key, ctx.rootComponent ) } );
	const why = frame.reasons.join( '; ' );
	if ( 'shared' === frame.header && 'shared' === frame.footer ) {
		return { tree, notes: [ `${ ctx.key }: the copy keeps the shared header and footer parts (${ why })` ] };
	}
	const top = tree.length === 1 && keyOf( tree[ 0 ] ) === root.key && root !== mainEl ? tree[ 0 ].innerBlocks || [] : tree;
	const mainNode = top.find( ( n ) => keyOf( n ) === mainEl.key );
	const barKey = frame.bar ? `Root/${ frame.bar.split( '/' ).pop() }#0` : null;
	const barNode = barKey ? top.find( ( n ) => keyOf( n ) === barKey ) : null;
	if ( ! mainNode || ( 'own' === frame.header && ! barNode ) ) {
		return { tree, notes: [ `${ ctx.key }: the page's frame differs from the shared one (${ why }), but the surface's tree holds ${ mainNode ? `no node for its top bar ${ barKey } (its inventory is read from <main>: lib/template-frame.mjs::inventoryRootFor reads it from the page)` : 'no node for its <main>' }, so the copy keeps the shared header and footer` ] };
	}
	const slug = partSlug( ctx.key );
	const header = 'own' === frame.header ? slug : 'shared' === frame.header ? 'header' : null;
	const footer = 'shared' === frame.footer ? 'footer' : null;
	const others = top.filter( ( n ) => n !== mainNode && n !== barNode );
	const out = [ ...( barNode ? [ { ...barNode, templatePart: slug } ] : [] ), { ...mainNode, templateFrame: { header, footer } } ];
	return {
		tree: out,
		placed: [ { id: piece.id, block: 'core/template-part', at: barNode ? barKey : mainEl.key } ],
		notes: [ `${ ctx.key }: the copy's header is ${ header ? `the ${ header } part` : 'none' } and its footer ${ footer ? `the ${ footer } part` : 'none' } (${ why })`, ...others.map( ( n ) => `${ ctx.key }: ${ n.name } ${ keyOf( n ) ?? '' } stood beside the page's <main> and its top bar, so the template does not hold it` ) ],
	};
}
