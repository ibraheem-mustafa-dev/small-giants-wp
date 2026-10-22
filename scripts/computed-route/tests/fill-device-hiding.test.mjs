// U8 per-device hiding (handoff readers plan, U8): a top bar's Register pill shown on mobile only, and its email pill and social
// icons hidden on mobile (the draft's `isM` and `showEmailPill` sc-ifs) are written through the width-gate writer
// (lib/fill-width-gate.mjs) into the conditional-visibility settings. The planted facts have the shape the logic reader gives
// the Indus top bar; the same shape is also read from the real Indus fact record when the machine holds it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { widthGateWrites } from '../lib/fill-width-gate.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const isM = { bp: 'm', is: true, when: { w: '<', n: 768 } };
const notM = { bp: 'm', is: false, when: { w: '<', n: 768 } };
const sc = ( width, via ) => ( { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width, via } } );
const inside = ( tag, gate ) => ( { template: { tag, membership: { scIf: [ { key: gate, value: '{{ x }}' } ] } }, logic: { holes: {} } } );
const FACTS = { elements: { 'Page/12': sc( isM, 'm' ), 'Page/13': inside( 'a', 'Page/12' ), 'Page/19': sc( notM, '!m' ), 'Page/20': inside( 'a', 'Page/19' ), 'Page/21': sc( notM, '!m' ), 'Page/22': inside( 'div', 'Page/21' ) } };
const BLOCKS = [ [ 'sgs/button', 13 ], [ 'sgs/button', 20 ], [ 'sgs/social-icons', 22 ] ];

function writeBar( facts ) {
	const flat = BLOCKS.map( ( [ name ], i ) => ( { name, attributes: {}, innerBlocks: [], ref: `r${ i }` } ) );
	const nodes = BLOCKS.map( ( [ name, n ], index ) => ( { index, name, parent: null, node: { draftRef: { tpl: `Page/${ n }#0` } }, children: [], targets: [] } ) );
	const r = widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'header', entries: [], date: '2026-10-22' } );
	return { flat, ...r };
}

test( 'MUST FAIL WITHOUT THE WRITER: the Register pill is mobile only; the email pill and the social icons are hidden on mobile', () => {
	const r = writeBar( FACTS );
	assert.deepEqual( r.flat[ 0 ].attributes, { sgsHideOnTablet: true, sgsHideOnDesktop: true }, 'Register pill: shown on mobile only' );
	assert.deepEqual( r.flat[ 1 ].attributes, { sgsHideOnMobile: true }, 'email pill: hidden on mobile' );
	assert.deepEqual( r.flat[ 2 ].attributes, { sgsHideOnMobile: true }, 'social icons: hidden on mobile' );
	assert.deepEqual( r.ledger, [] );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'the same three elements are gated that way in the real Indus fact record, when this machine holds it', { skip: ! fs.existsSync( path.resolve( HERE, '../../../sites/indus-foods/build/intake/facts.json' ) ) }, () => {
	const real = JSON.parse( fs.readFileSync( path.resolve( HERE, '../../../sites/indus-foods/build/intake/facts.json' ), 'utf8' ) );
	const renamed = { elements: Object.fromEntries( Object.entries( real.elements ).filter( ( [ k ] ) => k.startsWith( 'Indus Foods Website v2/' ) ).map( ( [ k, e ] ) => [ k.replace( 'Indus Foods Website v2/', 'Page/' ), { ...e, template: { ...e.template, membership: { ...e.template.membership, scIf: ( e.template.membership?.scIf || [] ).map( ( g ) => ( { ...g, key: g.key.replace( 'Indus Foods Website v2/', 'Page/' ) } ) ) } } } ] ) ) };
	const r = writeBar( renamed );
	assert.deepEqual( r.flat.map( ( n ) => n.attributes ), [ { sgsHideOnTablet: true, sgsHideOnDesktop: true }, { sgsHideOnMobile: true }, { sgsHideOnMobile: true } ] );
} );
