// Spec 48 FR-48-33 (placeholder, stock and prototype-only flags), lib/intake-flags.mjs: every flag kind is found on
// the fixture, each beside a negative control it must leave alone (a form label "Your name", a credit link on
// unsplash.com, a Math.random jitter, a sessionStorage read, a submit that fetches). A census gives template rows
// their `<component>:<data-dc-tpl>` ID. The real Indus export is read last, read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposeFlags, placeholderWhy, isStockUrl } from '../lib/intake-flags.mjs';
import { loadDraft } from '../lib/intake-ast.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const EXPORT = path.join( HERE, 'fixtures', 'intake-siteinfo', 'export' );
const INDUS = path.resolve( HERE, '../../../sites/indus-foods/handoff' );
const flags = proposeFlags( { folder: EXPORT } );
const of = ( kind, re, r = flags ) => r.rows.filter( ( x ) => x.kind === kind && ( re.test( x.why ) || re.test( x.text ?? x.url ) ) );

test( 'every row carries a rowId, kind, draftId, text or url, why and source; no gaps', () => {
	assert.deepEqual( flags.gaps, [] );
	for ( const r of flags.rows ) {
		assert.equal( r.rowId.startsWith( `flag:${ r.kind }:${ r.draftId }` ), true, r.rowId );
		assert.ok( ( r.text ?? r.url ) && r.why && r.source, r.rowId );
	}
	assert.equal( new Set( flags.rows.map( ( r ) => r.rowId ) ).size, flags.rows.length, 'row IDs are unique' );
} );

test( 'MUST FAIL placeholder: lorem ipsum, a {{ }} fallback, example.com, an empty image-slot, a #/ social link, a README line', () => {
	assert.equal( of( 'placeholder', /lorem ipsum filler/ ).length, 1 );
	assert.deepEqual( of( 'placeholder', /fallback string/ ).map( ( r ) => r.text ), [ 'Your tagline here' ] );
	assert.deepEqual( of( 'placeholder', /placeholder host example\.com/ ).map( ( r ) => r.text ), [ 'mailto:hello@example.com' ] );
	assert.deepEqual( of( 'placeholder', /image-slot/ ).map( ( r ) => r.text ), [ 'Hero photo: loaves on a shelf' ], 'the image-slot with a src is real' );
	assert.deepEqual( of( 'placeholder', /socials\.linkedin refused/ ).map( ( r ) => r.draftId ), [ 'Site.dc.html:12:3' ] );
	assert.deepEqual( of( 'placeholder', /README names/ ).map( ( r ) => r.draftId ), [ 'README.md:5' ] );
	assert.deepEqual( of( 'placeholder', /inside a logic string/ ).map( ( r ) => r.text ), [ 'Hello {{ name }}' ] );
	assert.equal( of( 'placeholder', /Your name/ ).length, 0, 'a form label and a field hint are real copy' );
	assert.equal( placeholderWhy( 'John Doe' ), '"Your name"-style filler copy' );
	assert.equal( placeholderWhy( 'Your name', { form: true } ), null );
} );

test( 'MUST FAIL stock: an unsplash image in a template src and one built by a logic string', () => {
	const stock = flags.rows.filter( ( r ) => 'stock' === r.kind );
	assert.deepEqual( stock.map( ( r ) => r.url ), [ 'https://images.unsplash.com/photo-1509440159596?w=800', 'https://images.unsplash.com/photo-1509440159596?w=600' ] );
	assert.match( stock[ 1 ].draftId, /^Site\.dc\.html:js:\d+:\d+$/ );
	assert.equal( isStockUrl( 'https://unsplash.com/photos/1509440159596' ), false, 'the credit page is not an image' );
	assert.equal( isStockUrl( 'https://cdn.example-stock.test/a.jpg', [ 'cdn.example-stock.test' ] ), true );
} );

test( 'MUST FAIL prototype-only: a localStorage basket, a setTimeout fake submit, a Math.random reference, a thank-you with no request', () => {
	assert.equal( of( 'prototype-only', /localStorage\.setItem/ ).length, 1 );
	assert.deepEqual( of( 'prototype-only', /setTimeout in the submit handler submit sets sending, sent/ ).map( ( r ) => r.draftId ), [ 'Site.dc.html:24:3' ], 'the row names the form element' );
	assert.deepEqual( of( 'prototype-only', /Math\.random/ ).map( ( r ) => r.text ), [ "'ACME-' + Math.floor(Math.random() * 90000)" ], 'the jitter is not an ID' );
	assert.deepEqual( of( 'prototype-only', /client-side thank-you/ ).map( ( r ) => r.draftId ), [ 'Site.dc.html:26:3' ], 'quickSubmit only; realSubmit fetches' );
	assert.equal( of( 'prototype-only', /sessionStorage/ ).length, 0, 'a storage read is not a write' );
	assert.equal( flags.rows.filter( ( r ) => 'prototype-only' === r.kind ).length, 4 );
} );

test( 'MUST FAIL: a census turns template draft IDs into <component>:<data-dc-tpl>; logic rows keep their file location', () => {
	const d = loadDraft( EXPORT, 'Site.dc.html' );
	const elements = d.tags.map( ( t, i ) => ( { n: String( 100 + i ), tag: t.name, attrs: t.attrs.map( ( a ) => [ a.name.toLowerCase(), a.value ] ) } ) );
	const census = { rows: [], sources: [ { file: 'Site.dc.html', component: 'Site', stamped: { elements } } ] };
	const r = proposeFlags( { folder: EXPORT, census } );
	const slot = d.tags.findIndex( ( t ) => 'image-slot' === t.name );
	assert.equal( of( 'placeholder', /image-slot/, r )[ 0 ].draftId, `Site:${ 100 + slot }` );
	assert.equal( of( 'placeholder', /image-slot/, r )[ 0 ].rowId, `flag:placeholder:Site:${ 100 + slot }` );
	assert.match( of( 'prototype-only', /localStorage/, r )[ 0 ].draftId, /^Site\.dc\.html:js:\d+:\d+$/ );
	const social = of( 'placeholder', /linkedin/, r )[ 0 ];
	assert.match( social.draftId, /^Site:\d+$/, 'the Site Info refusal carries the census ID too' );
} );

test( 'Indus (read-only): flag counts per kind', { skip: ! fs.existsSync( INDUS ) && 'no Indus export' }, () => {
	const r = proposeFlags( { folder: INDUS } );
	assert.deepEqual( r.gaps, [] );
	const count = ( kind, re = /./ ) => of( kind, re, r ).length;
	assert.equal( count( 'stock' ), 3, 'three logic string builds of images.unsplash.com/photo-' );
	assert.equal( count( 'placeholder', /refused: placeholder link/ ), 12, 'four social icons in three places' );
	assert.ok( count( 'placeholder', /image-slot/ ) >= 19 );
	assert.equal( count( 'placeholder', /README names/ ), 4 );
	assert.equal( count( 'prototype-only', /localStorage/ ), 2 );
	assert.equal( count( 'prototype-only', /Math\.random/ ), 1, 'the IND- reference; animation jitter is not flagged' );
	assert.equal( count( 'prototype-only', /setTimeout in the submit handler/ ), 1 );
	assert.equal( count( 'prototype-only', /client-side thank-you/ ), 1, 'the Careers and Catalogue inline form' );
} );
