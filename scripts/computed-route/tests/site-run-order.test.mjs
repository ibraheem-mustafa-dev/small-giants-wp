// The site run builds the surfaces a page links by reference (forms, modals, flows, the header, footer, drawer and menus) before any
// page (lib/site-run-order.mjs::buildRank), with the template copies first. Entries and kinds are the real clients' own.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildRank } from '../lib/site-run-order.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const CLIENTS = [ 'indus-foods', 'mamas-munches-redesign', 'eye-care-ward-end' ];
const read = ( client, ...p ) => JSON.parse( fs.readFileSync( path.join( ROUTE, '..', '..', 'sites', client, 'build', ...p ), 'utf8' ) );

test( 'MUST FAIL: on each real client every form, modal, header, footer and drawer ranks before every page, and a template copy before them', () => {
	for ( const client of CLIENTS ) {
		const build = path.join( ROUTE, '..', '..', 'sites', client, 'build' );
		let surfaces;
		let intake;
		try {
			surfaces = read( client, 'surfaces.json' );
			intake = read( client, 'intake', 'intake.json' );
		} catch {
			continue;
		}
		const ranked = Object.entries( surfaces ).map( ( [ key, entry ] ) => ( { key, kind: intake.skeletons?.[ entry.intakeSurface ]?.kind, rank: buildRank( { entry, kind: intake.skeletons?.[ entry.intakeSurface ]?.kind, buildDir: build } ) } ) );
		const shared = ranked.filter( ( r ) => [ 'form', 'modal', 'header', 'footer', 'drawer' ].includes( r.kind ) );
		const pages = ranked.filter( ( r ) => 'page' === r.kind && 0 !== r.rank );
		assert.ok( shared.length && pages.length, `${ client } has shared surfaces and pages to order` );
		assert.ok( shared.every( ( r ) => 1 === r.rank ), `${ client }: ${ shared.filter( ( r ) => 1 !== r.rank ).map( ( r ) => r.key ) } do not rank as linked surfaces` );
		assert.ok( pages.every( ( r ) => 2 === r.rank ), `${ client }: a page ranks after the linked surfaces` );
	}
} );

test( 'MUST FAIL: a template copy ranks first, a choice flow with its tree is a linked surface, and a surface of no linked kind is a page', () => {
	assert.equal( buildRank( { entry: { target: { template: 'page' } }, kind: 'page' } ), 0 );
	assert.equal( buildRank( { entry: { tree: 'trees/sgs_choice_flow/lens.json', target: { postId: 9 } }, kind: 'page', buildDir: 'b' } ), 1 );
	assert.equal( buildRank( { entry: { tree: 'trees/page/about.json', target: { postId: 9 } }, kind: 'page', buildDir: 'b' } ), 2 );
	assert.equal( buildRank( { entry: { target: { postId: 9 } }, kind: null } ), 2, 'negative control: no kind, not a flow' );
} );
