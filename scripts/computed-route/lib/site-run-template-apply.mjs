// The apply rules a template copy's tree takes before it is built (site-run.mjs, between the passes). The apply stage works on a built post
// and a template copy has none, so a rule it holds never reached a template: a heading the skeleton builds kept the block's default level and
// a basket or checkout template had no h1. A rule listed in TEMPLATE_RULES reads only what the draft element is (its tag, from the
// surface's origin map: lib/fill-skeleton.mjs writes `<surface>.origin.json` with each ref's fingerprint), so it runs on the tree with no page
// to read; the rules that read computed styles or the live page (logo, hover, icons, ground, cards, state) stay with the apply stage.
//   applyTemplateRules( { tree, origins, rules } ) -> { writes: [ { ref, block, attr, value, why } ], equal }
// The tree is changed in place: each rule's `op` writes are set on the node's attributes. Facts of the draft are the fingerprints of the refs
// of the node's own surface (`cr-ref-<surface>-<n>`), which is what a rule that looks at the nearest real heading before a block compares.
import { headingLevel } from './apply-chrome-heading.mjs';
import { setAttr } from './tree.mjs';

export const TEMPLATE_RULES = [ headingLevel ];
const REF = /(?:^|\s)(cr-ref-[\w-]+)(?:\s|$)/;
const SURFACE = /^(cr-ref-.+)-\d+$/;

const refOf = ( node ) => REF.exec( String( node?.attributes?.className ?? '' ) )?.[ 1 ] ?? null;

function* nodesOf( list ) {
	for ( const node of Array.isArray( list ) ? list : [ list ] ) {
		if ( node && 'object' === typeof node ) {
			yield node;
			yield* nodesOf( node.innerBlocks ?? [] );
		}
	}
}

export function applyTemplateRules( { tree, origins = {}, rules = TEMPLATE_RULES } ) {
	const nodes = [ ...nodesOf( tree ) ];
	const blocks = Object.fromEntries( nodes.map( ( n ) => [ refOf( n ), n ] ).filter( ( [ ref ] ) => ref ) );
	const facts = ( prefix ) => Object.fromEntries( Object.entries( origins ).filter( ( [ ref ] ) => SURFACE.exec( ref )?.[ 1 ] === prefix ).map( ( [ ref, o ] ) => [ ref, { tag: o?.fingerprint?.tag } ] ) );
	const savedOf = ( prefix ) => Object.fromEntries( Object.entries( blocks ).filter( ( [ ref ] ) => SURFACE.exec( ref )?.[ 1 ] === prefix ).map( ( [ ref, n ] ) => [ ref, { block: n.name, attrs: n.attributes ?? {} } ] ) );
	const writes = [];
	let equal = 0;
	for ( const [ ref, node ] of Object.entries( blocks ) ) {
		const origin = origins[ ref ];
		const prefix = SURFACE.exec( ref )?.[ 1 ];
		if ( ! origin?.fingerprint?.tag || ! prefix ) {
			continue;
		}
		const drafts = { 1440: { facts: facts( prefix ) } };
		const ctx = { block: node.name, saved: node.attributes ?? {}, target: { ref, tpl: origin.tpl, via: 'origin' }, draft: { 1440: drafts[ 1440 ].facts[ ref ] }, all: { blocks: savedOf( prefix ), drafts } };
		for ( const item of rules.flatMap( ( rule ) => rule( ctx ) ) ) {
			if ( 'equal' === item.status ) {
				equal++;
			}
			for ( const w of 'op' === item.status ? item.writes ?? [] : [] ) {
				if ( w.unset ) {
					delete node.attributes[ w.attr ];
				} else {
					setAttr( node, w );
				}
				writes.push( { ref, block: node.name, attr: w.attr, value: w.value ?? null, why: item.why } );
			}
		}
	}
	return { writes, equal };
}
