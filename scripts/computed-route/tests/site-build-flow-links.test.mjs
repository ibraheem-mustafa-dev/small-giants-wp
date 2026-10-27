// Spec 48 FR-48-55, Spec 43 FR-43-25: the site build's product flow links (lib/site-build-flow-links.mjs). A page-map
// product row naming the flow its page opens links every published product to that flow by `_sgs_choice_flow`; the run
// reads the site through one PHP read, changes only unset links, stops on a flow the site lacks, and with --apply writes
// and reads back. The site is an in-memory fake answering the PHP the step sends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { flowLinkRows, planFlowLinks, runFlowLinks, flowStatePhp, flowApplyPhp, FLOW_META } from '../lib/site-build-flow-links.mjs';

const FLOW = 'choice-flow-add-lenses';
const rows = ( extra = {} ) => [
	{ route: 'product', slug: 'product', title: 'Product', postType: 'product', collection: 'live', id: null, opensFlow: FLOW, ...extra },
	{ slug: FLOW, title: 'Add lenses', postType: 'sgs_choice_flow', collection: 'static', id: 120 },
];
const products = () => [
	{ id: 10, title: 'Round', flow: '', calibration: false },
	{ id: 11, title: 'Square', flow: FLOW, calibration: false },
	{ id: 12, title: 'Oval', flow: 'another-flow', calibration: false },
	{ id: 13, title: 'Calibration', flow: '', calibration: true },
];

// A fake site: the state read answers from `site`, the write applies each link (unless `broken`) and reports read-backs.
function fakeSite( site, { broken = false } = {} ) {
	const calls = [];
	const runPhp = ( php ) => {
		calls.push( php );
		if ( php.includes( 'update_post_meta' ) ) {
			const links = JSON.parse( Buffer.from( /base64_decode\( '([^']*)' \)/.exec( php )[ 1 ], 'base64' ).toString() );
			const wrong = [];
			for ( const [ id, slug ] of links ) {
				const p = site.products.find( ( x ) => x.id === id );
				if ( ! broken ) {
					p.flow = slug;
				}
				if ( p.flow !== slug ) {
					wrong.push( { id, flow: p.flow } );
				}
			}
			return `noise ${ JSON.stringify( { set: links.length - wrong.length, wrong } ) }`;
		}
		return JSON.stringify( site );
	};
	return { runPhp, calls };
}
const quiet = () => {
	const out = [];
	return { out, log: ( l ) => out.push( l ), error: ( l ) => out.push( l ) };
};

test( 'MUST FAIL: a dry run plans every unset product, leaves a linked, another flow\'s and the calibration product, and writes nothing', () => {
	const site = { flows: { [ FLOW ]: 120 }, products: products() };
	const { runPhp, calls } = fakeSite( site );
	const q = quiet();
	assert.equal( runFlowLinks( { rows: rows(), runPhp, apply: false, ...q } ), 0 );
	assert.equal( calls.length, 1, 'one read, no write' );
	assert.ok( q.out.includes( `  product 10 "Round": ${ FLOW_META } (unset) -> ${ FLOW } (flow post 120)` ) );
	assert.equal( q.out.filter( ( l ) => / -> /.test( l ) ).length, 1 );
	assert.equal( q.out.some( ( l ) => /product 11/.test( l ) ), false, 'a product already linking the flow is neither planned nor noted' );
	assert.ok( q.out.some( ( l ) => /product 12 "Oval" links flow "another-flow", left as it is/.test( l ) ) );
	assert.ok( q.out.some( ( l ) => /product 13 "Calibration" is the calibration reference product/.test( l ) ) );
	assert.equal( site.products[ 0 ].flow, '' );
} );

test( 'MUST FAIL: --apply writes the planned links, reads them back and a fresh read plans none', () => {
	const site = { flows: { [ FLOW ]: 120 }, products: products() };
	const { runPhp, calls } = fakeSite( site );
	const q = quiet();
	assert.equal( runFlowLinks( { rows: rows(), runPhp, apply: true, ...q } ), 0 );
	assert.deepEqual( site.products.map( ( p ) => p.flow ), [ FLOW, FLOW, 'another-flow', '' ] );
	assert.equal( calls.length, 3, 'read, write, read again' );
	assert.ok( q.out.includes( '1 product flow link(s) set; a fresh read plans 0' ) );
	const bad = fakeSite( { flows: { [ FLOW ]: 120 }, products: products() }, { broken: true } );
	assert.equal( runFlowLinks( { rows: rows(), runPhp: bad.runPhp, apply: true, ...quiet() } ), 1, 'a read-back mismatch fails' );
} );

test( 'MUST FAIL: a flow the site lacks stops the run before any write; a whole build\'s dry run only notes it', () => {
	const site = { flows: { [ FLOW ]: null }, products: products() };
	const { runPhp, calls } = fakeSite( site );
	const q = quiet();
	assert.equal( runFlowLinks( { rows: rows(), runPhp, apply: true, ...q } ), 1 );
	assert.equal( calls.length, 1, 'nothing was written' );
	assert.ok( q.out.some( ( l ) => /^STOP flow "choice-flow-add-lenses" is no published sgs_choice_flow post/.test( l ) ) );
	const p = quiet();
	assert.equal( runFlowLinks( { rows: rows(), runPhp, apply: false, pending: true, ...p } ), 0 );
	assert.ok( p.out.some( ( l ) => /^note: flow "choice-flow-add-lenses" is no published/.test( l ) ) );
	const before = calls.length;
	assert.equal( runFlowLinks( { rows: rows(), runPhp, apply: true, pending: true, ...quiet() } ), 1, 'pending never lets an apply past a missing flow' );
	assert.equal( calls.length - before, 1, 'the stopped apply only read' );
} );

test( 'MUST FAIL: the page map\'s own problems stop the run: a flow no row holds, two live rows opening different flows', () => {
	assert.deepEqual( flowLinkRows( rows( { opensFlow: 'missing' } ) ).problems, [ 'product row "product" opens flow "missing", which no sgs_choice_flow row of the page map holds' ] );
	const two = [ ...rows(), { slug: 'other', postType: 'product', collection: 'live', opensFlow: 'flow-b' }, { slug: 'flow-b', postType: 'sgs_choice_flow' } ];
	assert.match( flowLinkRows( two ).problems.join( '\n' ), /live product rows open different flows \(choice-flow-add-lenses, flow-b\)/ );
	const same = [ ...rows(), { slug: 'other', postType: 'product', collection: 'live', opensFlow: FLOW } ];
	assert.deepEqual( flowLinkRows( same ).problems, [] );
	assert.deepEqual( flowLinkRows( [ ...rows(), { slug: 'page', postType: 'page', opensFlow: FLOW } ] ).linking.map( ( r ) => r.slug ), [ 'product' ], 'only product rows link' );
} );

test( 'MUST FAIL: a static product row links no product; a map with no flow row plans nothing and reads nothing', () => {
	const plan = planFlowLinks( rows( { collection: 'static' } ), { flows: { [ FLOW ]: 120 }, products: products() } );
	assert.deepEqual( plan.actions, [] );
	assert.match( plan.notes[ 0 ], /is static/ );
	const { runPhp, calls } = fakeSite( { flows: {}, products: [] } );
	const q = quiet();
	assert.equal( runFlowLinks( { rows: rows( { opensFlow: undefined } ), runPhp, apply: true, ...q } ), 0 );
	assert.equal( calls.length, 0 );
	assert.match( planFlowLinks( rows(), { flows: { [ FLOW ]: 120 }, products: [] } ).notes[ 0 ], /no published product/ );
} );

test( 'MUST FAIL: the PHP carries only slugs and integer ids, base64-encoded, and reads through the buybox\'s resolver', () => {
	const read = flowStatePhp( [ FLOW, 'bad slug\'; drop' ] );
	assert.deepEqual( JSON.parse( Buffer.from( /base64_decode\( '([^']*)' \)/.exec( read )[ 1 ], 'base64' ).toString() ), [ FLOW ] );
	assert.match( read, /Sgs_Block_CPTs::resolve_choice_flow\( \$slug \)/ );
	assert.match( read, /'post_status' => 'publish'/ );
	assert.match( read, /_sgs_cr_fixture/ );
	const write = flowApplyPhp( [ { id: 10, to: FLOW }, { id: '11', to: FLOW }, { id: 12, to: 'Bad Slug' } ] );
	assert.deepEqual( JSON.parse( Buffer.from( /base64_decode\( '([^']*)' \)/.exec( write )[ 1 ], 'base64' ).toString() ), [ [ 10, FLOW ] ] );
	assert.match( write, /update_post_meta\( \(int\) \$link\[0\], '_sgs_choice_flow', \$link\[1\] \)/ );
} );
