// B1 (d), Spec 48 FR-48-55 and Spec 43 FR-43-10 / FR-43-20: the site build sets a choice flow's `flowProductId` to the catalogue
// product its basket call adds (lib/site-build-flow-product.mjs). Before this step nothing in the route wrote the setting, so
// every cloned flow carried `data-flow-product-id="0"`. The site is an in-memory fake answering the PHP the step sends.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planFlowProducts, flowProductStatePhp, flowProductApplyPhp, runFlowProducts } from '../lib/site-build-flow-product.mjs';
import { addedIds } from '../lib/flow-product.mjs';

const HOME = 'class Home { go() { M.cart.add({ key: [\'zookies\', S.size].join(\'-\'), id: \'zookies\', name: \'Zookies\', price: 9 }); } }';
const rows = [ { slug: 'choice-flow-build', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-08' }, { slug: 'choice-flow-gifts', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-20' } ];
const surfaces = { 'S-08': { dc: 'Home' }, 'S-20': { dc: 'Gifts' } };
const catalogue = { products: [ { draftId: 'zookies', sku: 'sgs-draft-zookies', name: 'Zookies' }, { draftId: 'trial', sku: 'sgs-draft-trial', name: 'Taster Trio' } ] };
const scriptOf = ( dc ) => ( { Home: HOME, Gifts: 'class Gifts { go() { M.cart.add({ id: "mystery" }); } }' }[ dc ] ?? null );

test( 'MUST FAIL: the id the flow component\'s basket call adds is the product it sells; a call without a literal id adds none', () => {
	assert.deepEqual( addedIds( HOME ), [ 'zookies' ] );
	assert.deepEqual( addedIds( 'M.cart.add({ ...it, qty: it.qty }); M.cart.add({ key: "a", id: x })' ), [] );
	assert.deepEqual( addedIds( 'cart.add({ id: "a" }); cart.add({ id: "b" }); cart.add({ id: "a" })' ), [ 'a', 'b' ] );
	assert.deepEqual( addedIds( null ), [] );
} );

test( 'MUST FAIL: the plan sets the flow whose script adds one catalogue product to that product\'s site id', () => {
	const state = { flows: { 'choice-flow-build': { id: 161, current: 0 }, 'choice-flow-gifts': { id: 162, current: 0 } }, products: { 'sgs-draft-zookies': 55, 'sgs-draft-trial': 56 } };
	const plan = planFlowProducts( { rows, surfaces, scriptOf, catalogue, state } );
	assert.deepEqual( plan.actions.map( ( a ) => [ a.slug, a.postId, a.productId ] ), [ [ 'choice-flow-build', 161, 55 ] ] );
	assert.ok( plan.notes.some( ( n ) => /choice-flow-gifts.*adds no catalogue product/.test( n ) ), 'a flow selling nothing the script names stays 0 and is named' );
} );

test( 'NEGATIVE: a flow already on its product, a product the site lacks, a missing flow post and two products set nothing', () => {
	const base = { flows: { 'choice-flow-build': { id: 161, current: 55 } }, products: { 'sgs-draft-zookies': 55 } };
	assert.deepEqual( planFlowProducts( { rows, surfaces, scriptOf, catalogue, state: base } ).actions, [] );
	const lacking = planFlowProducts( { rows, surfaces, scriptOf, catalogue, state: { flows: { 'choice-flow-build': { id: 161, current: 0 } }, products: { 'sgs-draft-zookies': null } } } );
	assert.deepEqual( lacking.actions, [] );
	assert.ok( lacking.notes.some( ( n ) => /does not hold yet; run the catalogue step first/.test( n ) ) );
	const noPost = planFlowProducts( { rows, surfaces, scriptOf, catalogue, state: { flows: {}, products: { 'sgs-draft-zookies': 55 } } } );
	assert.ok( noPost.notes.some( ( n ) => /no published sgs_choice_flow post/.test( n ) ) );
	const two = planFlowProducts( { rows, surfaces, scriptOf: () => 'cart.add({ id: "zookies" }); cart.add({ id: "trial" })', catalogue, state: base } );
	assert.deepEqual( two.actions, [] );
	assert.ok( two.notes.some( ( n ) => /adds 2 catalogue products/.test( n ) ) );
} );

test( 'the PHP the step sends is valid PHP', () => {
	for ( const code of [ flowProductStatePhp( [ 'a-b' ], [ 'sgs-draft-x' ] ), flowProductApplyPhp( [ { postId: 1, productId: 2 } ] ) ] ) {
		const r = spawnSync( 'php', [ '-l' ], { input: `<?php\n${ code }\n`, encoding: 'utf8' } );
		assert.equal( r.status, 0, r.stdout + r.stderr );
	}
	const lists = [ ...flowProductStatePhp( [ 'ok', 'bad slug;' ], [ "x'y", 'good-1' ] ).matchAll( /base64_decode\( '([^']*)' \)/g ) ].map( ( m ) => JSON.parse( Buffer.from( m[ 1 ], 'base64' ).toString() ) );
	assert.deepEqual( lists, [ [ 'ok' ], [ 'good-1' ] ], 'slugs and SKUs are filtered before they reach the PHP' );
} );

// A fake site: the state read answers from `site`, the write sets each planned link (unless `broken`).
function fakeSite( site, { broken = false } = {} ) {
	return ( php ) => {
		if ( php.includes( 'serialize_blocks' ) ) {
			const links = JSON.parse( Buffer.from( /base64_decode\( '([^']*)' \)/.exec( php )[ 1 ], 'base64' ).toString() );
			const wrong = [];
			for ( const [ id, productId ] of links ) {
				const flow = Object.values( site.flows ).find( ( f ) => f.id === id );
				broken || ( flow.current = productId );
				flow.current === productId || wrong.push( { id, now: flow.current } );
			}
			return JSON.stringify( { set: links.length - wrong.length, wrong } );
		}
		return JSON.stringify( site );
	};
}

function client() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'flowprod-' ) );
	const build = path.join( repo, 'sites', 'c', 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'catalogue.json' ), JSON.stringify( catalogue ) );
	fs.writeFileSync( path.join( build, 'intake', 'facts.json' ), JSON.stringify( { surfaces } ) );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'handoff', 'Home.dc.html' ), HOME );
	return repo;
}

test( 'MUST FAIL: the run sets the flow\'s product, reads it back and plans nothing the second time; a dry run writes nothing', () => {
	const repo = client();
	const site = { flows: { 'choice-flow-build': { id: 161, current: 0 }, 'choice-flow-gifts': { id: 162, current: 0 } }, products: { 'sgs-draft-zookies': 55, 'sgs-draft-trial': 56 } };
	const lines = [];
	assert.equal( runFlowProducts( { repo, client: 'c', rows, runPhp: fakeSite( site ), apply: false, log: ( l ) => lines.push( l ) } ), 0 );
	assert.equal( site.flows[ 'choice-flow-build' ].current, 0, 'a dry run writes nothing' );
	assert.ok( lines.some( ( l ) => /1 flow product\(s\) to set/.test( l ) ) );
	assert.equal( runFlowProducts( { repo, client: 'c', rows, runPhp: fakeSite( site ), apply: true, log: ( l ) => lines.push( l ) } ), 0 );
	assert.equal( site.flows[ 'choice-flow-build' ].current, 55 );
	assert.ok( lines.some( ( l ) => /1 flow product\(s\) set; a fresh read plans 0/.test( l ) ) );
} );

test( 'NEGATIVE: a write that does not read back fails the run', () => {
	const repo = client();
	const site = { flows: { 'choice-flow-build': { id: 161, current: 0 } }, products: { 'sgs-draft-zookies': 55 } };
	const errors = [];
	assert.equal( runFlowProducts( { repo, client: 'c', rows, runPhp: fakeSite( site, { broken: true } ), apply: true, log: () => {}, error: ( e ) => errors.push( e ) } ), 1 );
	assert.match( errors[ 0 ], /FAILED/ );
} );

test( 'NEGATIVE: a client with no choice flow or no catalogue has nothing to set', () => {
	const repo = client();
	assert.equal( runFlowProducts( { repo, client: 'c', rows: [], runPhp: () => { throw new Error( 'no read' ); }, apply: true, log: () => {} } ), 0 );
} );
