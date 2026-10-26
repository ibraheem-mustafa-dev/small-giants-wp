// site-run.mjs::surfaceReach: where one surface is read (draft route, live page row) and when it is skipped. Each test MUST FAIL
// when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceReach } from '../site-run.mjs';

const row = ( o ) => ( { parent: null, template: null, postType: 'page', ...o } );
const ROWS = [
	row( { slug: 'home', route: 'home' } ),
	row( { slug: 'about', route: 'about' } ),
	row( { slug: 'careers', route: 'careers', parent: 'about' } ),
	row( { slug: 'first-post', route: 'post-post-1', postType: 'post' } ),
];

test( 'MUST FAIL: a form is read at its draftRoute and its live address is the page carrying that route', () => {
	const r = surfaceReach( { key: 'form-careers', entry: { draftRoute: '/careers' }, skel: { route: '/elsewhere' }, rows: ROWS } );
	assert.equal( r.hash, '#/careers', 'the entry\'s draftRoute outranks the intake record\'s route' );
	assert.equal( r.row.slug, 'careers' );
	assert.equal( r.skip, null );
	assert.equal( surfaceReach( { key: 'form-x', entry: {}, skel: { route: '/about' }, rows: ROWS } ).hash, '#/about', 'with no draftRoute the intake record\'s route is used' );
	assert.equal( surfaceReach( { key: 'form-home', entry: { draftRoute: '/' }, skel: null, rows: ROWS } ).hash, '', 'the entry page has no hash' );
} );

test( 'MUST FAIL: a contentOnly post surface is skipped unless --with-content, and then reads at the post\'s own row', () => {
	const entry = { contentOnly: true, draftRoute: '/post-post-1' };
	const skipped = surfaceReach( { key: 'first-post', entry, skel: null, rows: ROWS } );
	assert.match( skipped.skip, /--with-content/ );
	const read = surfaceReach( { key: 'first-post', entry, skel: null, rows: ROWS, withContent: true } );
	assert.equal( read.skip, null );
	assert.deepEqual( [ read.row.postType, read.row.slug, read.hash ], [ 'post', 'first-post', '#/post-post-1' ] );
	assert.equal( surfaceReach( { key: 'about', entry: {}, skel: null, rows: ROWS } ).skip, null, 'negative control: a page surface is never skipped' );
} );

test( 'MUST FAIL: the single-post template is read at the post it is shaped from and is not skipped', () => {
	const r = surfaceReach( { key: 'single', entry: { fromPost: 'first-post', draftRoute: '/post-post-1', target: { template: 'single' } }, skel: null, rows: ROWS } );
	assert.equal( r.skip, null );
	assert.deepEqual( [ r.row.postType, r.row.slug, r.hash ], [ 'post', 'first-post', '#/post-post-1' ] );
} );

test( 'a page surface keeps its page row\'s route and the home page has no hash', () => {
	assert.deepEqual( ( ( r ) => [ r.row.slug, r.hash ] )( surfaceReach( { key: 'careers', entry: {}, skel: { route: '/ignored' }, rows: ROWS } ) ), [ 'careers', '#/careers' ] );
	assert.equal( surfaceReach( { key: 'home', entry: {}, skel: null, rows: ROWS } ).hash, '' );
} );

test( 'MUST FAIL: a page-file draft takes no hash - its draft file (draftIndex) is the page, served as its own index', () => {
	const files = { adapter: 'files' };
	const rows = [ row( { slug: 'contact', route: 'Contact.dc.html' } ) ];
	assert.equal( surfaceReach( { key: 'contact', entry: { draftIndex: 'Contact.dc.html' }, skel: { route: 'Contact.dc.html' }, rows, routing: files } ).hash, '' );
	assert.equal( surfaceReach( { key: 'form-send', entry: { draftRoute: 'Contact.dc.html' }, skel: null, rows, routing: files } ).hash, '' );
	assert.equal( surfaceReach( { key: 'contact', entry: {}, skel: null, rows, routing: { adapter: 'hash' } } ).hash, '#/Contact.dc.html', 'a hash draft keeps its route hash' );
} );
