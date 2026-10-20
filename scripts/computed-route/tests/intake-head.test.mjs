// Spec 48 FR-48-84, lib/intake-head.mjs and lib/head-check.mjs: the draft's head is read from the census's stamped
// templates; font stylesheets, font-host preconnects, charset, viewport, description and titles are cloned and every
// other head item is its own missing-features row; the font check refuses a loaded family, weight or italic the
// snapshot does not serve; the live head check refuses a page without the draft's viewport, charset or site title.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fontUrlFamilies, readHead, headMissing } from '../lib/intake-head.mjs';
import { fontCheck, headCheck, pageHead, tokenFonts } from '../lib/head-check.mjs';
import { readHelmetFont } from '../lib/intake-construct-readers.mjs';

const GOOGLE = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=Source+Sans+3:ital,wght@0,400;1,400&display=swap';
const el = ( n, tag, attrs = [], extra = {} ) => ( { n: String( n ), tag, attrs, inHelmet: true, texts: [], ...extra } );
const census = ( elements ) => ( { sources: [ { component: 'Home', file: 'Home.dc.html', stamped: { elements } } ] } );
const DRAFT = census( [
	el( 1, 'title', [], { body: 'Acme · Fresh bread' } ),
	el( 2, 'meta', [ [ 'name', 'viewport' ], [ 'content', 'width=device-width, initial-scale=1' ] ] ),
	el( 3, 'link', [ [ 'rel', 'preconnect' ], [ 'href', 'https://fonts.googleapis.com' ] ] ),
	el( 4, 'link', [ [ 'href', GOOGLE ], [ 'rel', 'stylesheet' ] ] ),
	el( 5, 'meta', [ [ 'charset', 'utf-8' ] ] ),
] );
const PLANTED = census( [ ...DRAFT.sources[ 0 ].stamped.elements,
	el( 6, 'link', [ [ 'rel', 'icon' ], [ 'href', 'favicon.png' ] ] ),
	el( 7, 'meta', [ [ 'name', 'theme-color' ], [ 'content', '#fff' ] ] ),
	el( 8, 'link', [ [ 'rel', 'icon' ], [ 'href', 'favicon-32.png' ] ] ),
	el( 9, 'link', [ [ 'rel', 'stylesheet' ], [ 'href', 'https://cdn.example.org/site.css' ] ] ),
] );

test( 'fontUrlFamilies reads css2 and css v1 Google Fonts addresses; another host gives nothing', () => {
	assert.deepEqual( fontUrlFamilies( GOOGLE ), [ { family: 'Montserrat', weights: [ 500, 600 ], italic: false }, { family: 'Source Sans 3', weights: [ 400 ], italic: true } ] );
	assert.deepEqual( fontUrlFamilies( 'https://fonts.googleapis.com/css?family=Lato:400,700i|Oswald' ), [ { family: 'Lato', weights: [ 400, 700 ], italic: true }, { family: 'Oswald', weights: [ 400 ], italic: false } ] );
	assert.deepEqual( fontUrlFamilies( 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900' ), [ { family: 'Inter', weights: [ 100, 900 ], italic: false } ] );
	assert.deepEqual( fontUrlFamilies( 'https://use.typekit.net/abc.css' ), [] );
	assert.deepEqual( fontUrlFamilies( 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500&amp;family=Karla' ).map( ( f ) => f.family ), [ 'Montserrat', 'Karla' ], 'an HTML-escaped & still splits' );
} );

test( 'readHead clones the draft head: fonts, preconnects, charset, viewport and the title; nothing is unhandled', () => {
	const h = readHead( DRAFT );
	assert.deepEqual( h.titles.map( ( t ) => [ t.text, t.draftId ] ), [ [ 'Acme · Fresh bread', 'Home:1' ] ] );
	assert.deepEqual( h.metas.map( ( m ) => m.kind ), [ 'viewport', 'charset' ] );
	assert.deepEqual( h.preconnects, [ { host: 'fonts.googleapis.com', draftId: 'Home:3' } ] );
	assert.equal( h.fonts.length, 1 );
	assert.deepEqual( h.unhandled, [] );
	assert.deepEqual( headMissing( DRAFT ), [] );
} );

test( 'MUST FAIL: an icon link, a theme-color meta and a non-font stylesheet are each a missing-features row, counted', () => {
	const rows = headMissing( PLANTED );
	assert.deepEqual( rows.map( ( r ) => [ r.rowId, r.count, r.wave, r.from ] ), [
		[ 'missing:head:link:icon', 2, 'site and surfaces', 'head' ],
		[ 'missing:head:meta:theme-color', 1, 'site and surfaces', 'head' ],
		[ 'missing:head:link:stylesheet', 1, 'site and surfaces', 'head' ],
	] );
	assert.equal( rows[ 0 ].draftId, 'Home:6' );
	const offHost = census( [ el( 1, 'link', [ [ 'rel', 'preconnect' ], [ 'href', 'https://cdn.example.org' ] ] ) ] );
	assert.deepEqual( headMissing( offHost ).map( ( r ) => r.rowId ), [ 'missing:head:link:preconnect' ], 'a preconnect to a host that is not a font host is not cloned' );
} );

test( 'MUST FAIL: readHelmetFont reads a font load\'s families and throws when it cannot', () => {
	assert.deepEqual( readHelmetFont( { draftId: 'Home:4', detail: { via: 'stylesheet', href: GOOGLE } } ).families.map( ( f ) => f.family ), [ 'Montserrat', 'Source Sans 3' ] );
	assert.deepEqual( readHelmetFont( { draftId: 'Home:9', detail: { via: '@font-face', family: '"Brand Sans"', src: 'url(x.woff2)' } } ).families[ 0 ].family, 'Brand Sans' );
	assert.throws( () => readHelmetFont( { draftId: 'Home:4', detail: { via: 'stylesheet', href: 'https://use.typekit.net/abc.css' } } ), /families are not read/ );
	assert.throws( () => readHelmetFont( { draftId: 'Home:9', detail: { via: '@font-face', family: '' } } ), /names no family/ );
} );

const SNAPSHOT = { settings: { typography: { fontFamilies: [
	{ slug: 'heading', name: 'Montserrat', fontFamily: '\'Montserrat\', sans-serif', fontFace: [ { fontFamily: 'Montserrat', fontWeight: '100 900', fontStyle: 'normal', src: [ 'file:./m.woff2' ] } ] },
	{ slug: 'body', name: 'Source Sans 3', fontFamily: '\'Source Sans 3\', sans-serif', fontFace: [
		{ fontFamily: 'Source Sans 3', fontWeight: '200 900', fontStyle: 'normal', src: [ 'file:./s.woff2' ] },
		{ fontFamily: 'Source Sans 3', fontWeight: '200 900', fontStyle: 'italic', src: [ 'file:./s-italic.woff2' ] } ] },
] } } };
const without = ( pred ) => ( { settings: { typography: { fontFamilies: SNAPSHOT.settings.typography.fontFamilies.map( ( f ) => ( { ...f, fontFace: f.fontFace.filter( ( x ) => ! pred( x ) ) } ) ).filter( ( f ) => f.fontFace.length || f.google ) } } } );

test( 'MUST FAIL: the font check refuses a loaded family, weight or italic the snapshot does not serve', () => {
	const h = readHead( DRAFT );
	assert.deepEqual( fontCheck( h, SNAPSHOT ), [] );
	assert.match( fontCheck( h, without( ( x ) => 'Montserrat' === x.fontFamily ) ).join( '\n' ), /Montserrat \(loaded at Home:4\) has no font family in the theme snapshot/ );
	assert.match( fontCheck( h, without( ( x ) => 'italic' === x.fontStyle ) ).join( '\n' ), /Source Sans 3 italic is loaded but no snapshot face is italic/ );
	const narrow = JSON.parse( JSON.stringify( SNAPSHOT ) );
	narrow.settings.typography.fontFamilies[ 0 ].fontFace[ 0 ].fontWeight = '500';
	assert.deepEqual( fontCheck( h, narrow ), [ 'Montserrat weight 600 is loaded but no snapshot face covers it' ] );
	const google = JSON.parse( JSON.stringify( SNAPSHOT ) );
	google.settings.typography.fontFamilies[ 0 ] = { slug: 'heading', name: 'Montserrat', fontFamily: 'Montserrat', google: true };
	assert.deepEqual( fontCheck( h, google ), [], 'a google family is downloaded to the server, so it is served' );
	google.settings.typography.fontFamilies[ 0 ].google = false;
	assert.match( fontCheck( h, google ).join( '\n' ), /no font face and is not marked google/ );
} );

const PAGE = '<!doctype html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Shop &#8211; Acme</title></head><body></body></html>';

test( 'MUST FAIL: the live head check refuses a page without the draft\'s viewport, with two charsets, or not naming the site', () => {
	const h = readHead( DRAFT );
	assert.deepEqual( pageHead( PAGE ), { charsets: 1, viewport: 'width=device-width, initial-scale=1', title: 'Shop &#8211; Acme', description: null } );
	assert.deepEqual( headCheck( h, PAGE, { siteTitle: 'Acme' } ), [] );
	assert.match( headCheck( h, PAGE.replace( /<meta name="viewport"[^>]*>/, '' ) ).join( '\n' ), /viewport is null/ );
	assert.match( headCheck( h, PAGE.replace( '<title>', '<meta charset="utf-8"><title>' ) ).join( '\n' ), /2 charset declarations/ );
	assert.match( headCheck( h, PAGE, { siteTitle: 'Mama\'s Munches' } ).join( '\n' ), /does not name the site/ );
} );

test( 'MUST FAIL: the design system\'s tokens/typography.css is the font declaration: its families and weights, no italic it does not load', () => {
	const css = '@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&family=Source+Sans+3:wght@400;500&family=Geist+Mono:wght@400;500&display=swap");\n:root{--font-mono:"Geist Mono",monospace}';
	const declared = { fonts: tokenFonts( css ) };
	assert.deepEqual( declared.fonts[ 0 ].families.map( ( f ) => f.family ), [ 'Montserrat', 'Source Sans 3', 'Geist Mono' ], 'the ";" between weights does not cut the address' );
	assert.deepEqual( fontCheck( declared, SNAPSHOT ), [ 'Geist Mono (loaded at tokens/typography.css) has no font family in the theme snapshot' ] );
	assert.deepEqual( tokenFonts( '@import url(https://use.typekit.net/x.css); body{}' ), [] );
} );

test( 'MUST FAIL: only the helmet is the head: an SVG title, page microdata, a description and an unreadable font host are each raised', () => {
	const svgTitle = el( 11, 'title', [], { body: 'Phone icon', svg: 'title', inHelmet: false } );
	const bodyMeta = el( 12, 'meta', [ [ 'itemprop', 'price' ], [ 'content', '4.99' ] ], { inHelmet: false } );
	const bodyLink = el( 13, 'link', [ [ 'rel', 'stylesheet' ], [ 'href', GOOGLE ] ], { inHelmet: false } );
	const described = el( 14, 'meta', [ [ 'name', 'description' ], [ 'content', 'Fresh bread daily' ] ] );
	const typekit = el( 15, 'link', [ [ 'rel', 'stylesheet' ], [ 'href', 'https://use.typekit.net/abc.css' ] ] );
	const h = readHead( census( [ ...DRAFT.sources[ 0 ].stamped.elements, svgTitle, bodyMeta, bodyLink, described, typekit ] ) );
	assert.deepEqual( h.titles.map( ( t ) => t.text ), [ 'Acme · Fresh bread' ], 'the SVG title is no document title' );
	assert.equal( h.fonts.length, 1, 'the body stylesheet is not a head font' );
	assert.deepEqual( h.unhandled.map( ( u ) => u.what ), [ 'title:svg', 'meta:body', 'link:body', 'meta:description', 'font:use.typekit.net' ] );
	assert.match( h.unhandled[ 3 ].line, /nothing writes a description/ );
} );
