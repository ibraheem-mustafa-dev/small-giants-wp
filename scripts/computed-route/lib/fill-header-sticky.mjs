// A header the draft pins by its own CSS (Spec 48 FR-48-8): the draft's header element computes `position: sticky` or `fixed`
// at a read width, with no script behind it, so no motion record speaks for it and the scroll-shadow reading
// (lib/motion-behaviour-settings.mjs::headerScrollOf, the only other writer of the setting) never fires. The header block's
// sticky setting is written per tier from the computed positions Fill read on the node's own element (stickyTiers: `on` at
// desktop where it pins there, `off` on a tier where it does not). A header the draft does not pin at any read width writes
// nothing, and a node whose sticky setting a pass already wrote keeps it. The strip above such a header leaves with the page:
// its top row's rowScrollAway is written from the same draft at apply (lib/apply-chrome-state.mjs::headerRow), and only takes
// effect while the header is sticky.
import { setAttr } from './tree.mjs';
import { stickyTiers, STICKY_HEADER } from './motion-behaviour-settings.mjs';

const WIDTHS = [ 375, 768, 1440 ];

// { writes, notes }: the sticky setting of every header node the draft pins. writes: the writes made so far (a node already
// given the setting is left as it is).
export function stickyHeaderWrites( { nodes, flat, refOf, reads, writes = [] } ) {
	const out = { writes: [], notes: [] };
	for ( const rec of nodes.filter( ( n ) => STICKY_HEADER.block === n.name ) ) {
		const node = flat[ rec.index ];
		const ref = refOf( node );
		if ( writes.some( ( w ) => w.index === rec.index && STICKY_HEADER.attr === w.attr ) ) {
			continue;
		}
		const root = rec.targets.find( ( t ) => '' === ( t.slot ?? '' ) );
		const by = Object.fromEntries( WIDTHS.map( ( w ) => {
			const s = root ? reads.widths?.[ w ]?.[ root.id ] : null;
			return [ w, s && ! s.missing ? s.position ?? s.styles?.position : undefined ];
		} ).filter( ( [ , v ] ) => v ) );
		if ( ! Object.keys( by ).length ) {
			continue;
		}
		const tiers = stickyTiers( by );
		if ( ! tiers ) {
			continue;
		}
		const { before, after } = setAttr( node, { attr: STICKY_HEADER.attr, value: tiers, merge: 'replace' } );
		out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: 'position', attr: STICKY_HEADER.attr, before, after, widths: Object.keys( by ).map( Number ), how: 'header-sticky' } );
		out.notes.push( `${ ref } ${ rec.name }: the draft's header computes position ${ Object.entries( by ).map( ( [ w, p ] ) => `${ p } at ${ w }` ).join( ', ' ) }, so ${ STICKY_HEADER.attr } is ${ JSON.stringify( tiers ) }` );
	}
	return out;
}
