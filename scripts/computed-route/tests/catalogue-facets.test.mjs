// Spec 48 FR-48-92: the draft catalogue's filter facets (lib/catalogue-facets.mjs), read from one export whose shop filter
// draws labelled groups (a call per group in an array literal), keeps colours in an object keyed by value, works one value
// out with a local function, has an on-off switch with an active-filter chip, a choice one value matches under every
// choice, a choice labelled only by the template text before it, a range, a condition on two fields and a value its own
// list offers no choice for. Each test fails when its mechanism breaks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { repoWith } from './fixtures/catalogue/repo.mjs';
import { readCatalogue } from '../lib/catalogue-read.mjs';
import { settleFacets } from '../lib/catalogue-facets.mjs';
import { catalogueProblems } from '../lib/intake-catalogue-run.mjs';

const ROWS = [ { route: 'shop', slug: 'shop', postType: 'shop', collection: 'live' }, { route: 'product', slug: 'product', postType: 'product', collection: 'live' } ];
const read = ( edit ) => readCatalogue( { repo: repoWith( 'facets', edit ), client: 'demo', rows: ROWS } ).catalogue;
const edited = ( from, to ) => ( dir ) => {
	const f = path.join( dir, 'Store.dc.html' );
	const text = fs.readFileSync( f, 'utf8' );
	assert.ok( text.includes( from ), `fixture holds ${ from }` );
	fs.writeFileSync( f, text.replace( from, to ) );
};
const facet = ( cat, field ) => cat.facets.find( ( f ) => f.field === field );
const terms = ( f ) => f.terms.map( ( t ) => t.name );
const byId = ( cat, id ) => cat.products.find( ( p ) => p.draftId === id );

test( 'every held filter field is a facet labelled by the group drawing its state key, with its terms in the code list\'s order', () => {
	const cat = read();
	assert.deepEqual( cat.facets.map( ( f ) => [ f.field, f.key, f.label, f.slug, f.kind ] ), [
		[ 'kind', 'kinds', 'Kind', 'kind', 'value' ], [ 'tones', 'tones', 'Tone', 'tone', 'multi' ], [ 'girth', 'band', 'Size', 'size-filter', 'derived' ],
		[ 'lined', 'lined', 'Lined', 'lined', 'boolean' ], [ 'fitFor', 'fitFor', 'Fits', 'fits', 'value' ], [ 'theme', 'theme', 'Pick a theme', 'pick-a-theme', 'value' ],
	] );
	assert.deepEqual( terms( facet( cat, 'kind' ) ), [ 'Cap', 'Beanie', 'Hood' ] );
	assert.deepEqual( catalogueProblems( cat ), [] );
} );

test( 'a list field keyed into an object names its terms from the object and carries each colour as the swatch', () => {
	const tone = facet( read(), 'tones' );
	assert.deepEqual( tone.terms, [ { name: 'Ink', swatch: '#101820' }, { name: 'Sand', swatch: '#d8c3a5' }, { name: 'Moss', swatch: '#4a5d23' } ] );
	assert.deepEqual( byId( read(), '1' ).facets.tone, [ 'Ink', 'Sand' ] );
} );

test( 'a value a local function works out is evaluated per product; its slug, taken by a different variation attribute, becomes -filter', () => {
	const cat = read();
	assert.deepEqual( terms( facet( cat, 'girth' ) ), [ 'Small', 'Medium', 'Large' ] );
	assert.deepEqual( cat.products.map( ( p ) => p.facets[ 'size-filter' ] ), [ [ 'Small' ], [ 'Medium' ], [ 'Large' ] ] );
	assert.deepEqual( cat.products[ 0 ].attributes.map( ( a ) => a.slug ), [ 'size' ] );
	// Without the variation attribute the facet keeps its own slug.
	const plain = read( edited( 'const item = { pid: p.id, size: this.state.curSize };', 'const item = { pid: p.id };' ) );
	assert.equal( facet( plain, 'girth' ).slug, 'size' );
} );

test( 'a true/false field is one term named by the chip its state key alone guards; the switch text is its toggle label', () => {
	const cat = read();
	const lined = facet( cat, 'lined' );
	assert.deepEqual( [ terms( lined ), lined.toggleLabel ], [ [ 'Lined' ], 'Lined only' ] );
	assert.deepEqual( cat.products.map( ( p ) => p.facets.lined || null ), [ [ 'Lined' ], null, null ] );
	const noChip = facet( read( edited( "if (f.lined) chipsOn.push({ label: 'Lined', remove: () => setF({ lined: false }) });", '' ) ), 'lined' );
	assert.deepEqual( [ noChip.label, terms( noChip ), noChip.toggleLabel ], [ 'Lined only', [ 'Lined only' ], null ] );
} );

test( 'a value matching every choice carries every other term; the "all" choice is no term', () => {
	const fit = facet( read(), 'fitFor' );
	assert.deepEqual( [ fit.wildcard, terms( fit ) ], [ 'Anyone', [ 'Adults', 'Children' ] ] );
	assert.deepEqual( read().products.map( ( p ) => p.facets.fits ), [ [ 'Adults', 'Children' ], [ 'Adults' ], [ 'Children' ] ] );
	const strict = read( edited( " || p.fitFor === 'Anyone')", ')' ) );
	assert.equal( facet( strict, 'fitFor' ).wildcard, null );
	assert.deepEqual( strict.products.map( ( p ) => p.facets.fits || null ), [ null, [ 'Adults' ], [ 'Children' ] ] );
} );

test( 'with no group naming its key a facet takes the template text before its control, else the field name', () => {
	assert.equal( facet( read(), 'theme' ).label, 'Pick a theme' );
	const bare = read( edited( 'themes: C.THEMES.map(t => ({ name: t.name, on: f.theme === t.id,', 'themes: C.THEMES.map(t => ({ name: t.name, on: false,' ) );
	assert.equal( facet( bare, 'theme' ).label, 'Theme' );
	const noGroup = read( edited( "group('kind', 'Kind', { items: chips('kinds', C.KINDS) }),", '' ) );
	assert.equal( facet( noGroup, 'kind' ).label, 'Kind' );
	assert.equal( facet( read( edited( "group('tone', 'Tone',", "group('tone', 'Shade'," ) ), 'tones' ).label, 'Shade' );
} );

test( 'terms are named by the filter\'s own list, never a product\'s values; a value the list lacks is left out and a gap row', () => {
	const cat = read();
	assert.deepEqual( terms( facet( cat, 'theme' ) ), [ 'By the sea', 'Up the hill' ] );
	assert.equal( byId( cat, '2' ).facets[ 'pick-a-theme' ], undefined );
	assert.ok( cat.gaps.some( ( g ) => 'facet' === g.kind && /"theme" meets "dune"/.test( g.detail ) ) );
} );

test( 'a range and a condition on two fields are gap rows and no facet', () => {
	const cat = read();
	const gaps = cat.gaps.filter( ( g ) => 'facet' === g.kind ).map( ( g ) => g.detail );
	assert.ok( gaps.some( ( d ) => /"weight" compares its number values directly/.test( d ) ) );
	assert.ok( gaps.some( ( d ) => /"make" tests it together with "season"/.test( d ) ) );
	assert.ok( ! cat.facets.some( ( f ) => [ 'weight', 'make', 'season' ].includes( f.field ) ) );
} );

test( 'a facet a variation attribute already holds is that axis; one whose terms it lacks is renamed, numbered past a taken name', () => {
	const cat = {
		products: [ { attributes: [ { slug: 'size', options: [ { term: 'Small' }, { term: 'Large' } ] }, { slug: 'tone', options: [ { term: 'Ink' } ] } ], facets: { size: [ 'Small' ], tone: [ 'Red' ] } } ],
		facets: [ { slug: 'size', terms: [ { name: 'Small' }, { name: 'Large' } ], axis: false }, { slug: 'tone', terms: [ { name: 'Red' } ], axis: false }, { slug: 'tone-filter', terms: [ { name: 'Blue' } ], axis: false } ],
	};
	settleFacets( cat );
	assert.deepEqual( cat.facets.map( ( f ) => [ f.slug, f.axis ] ), [ [ 'size', true ], [ 'tone-filter-2', false ], [ 'tone-filter', false ] ] );
	assert.deepEqual( cat.products[ 0 ].facets, { size: [ 'Small' ], 'tone-filter-2': [ 'Red' ] } );
} );

test( 'two facets labelled alike are numbered as they are read, each product keeping its terms under its own facet', () => {
	const cat = read( edited( "group('tone', 'Tone',", "group('tone', 'Kind'," ) );
	assert.deepEqual( [ facet( cat, 'kind' ).slug, facet( cat, 'tones' ).slug ], [ 'kind', 'kind-2' ] );
	assert.deepEqual( [ byId( cat, '1' ).facets.kind, byId( cat, '1' ).facets[ 'kind-2' ] ], [ [ 'Cap' ], [ 'Ink', 'Sand' ] ] );
} );
