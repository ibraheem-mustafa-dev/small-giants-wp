// Proves Spec 47 §3.2's link read (FR-47-2): a setting whose role is link-href OR link-content records the element it
// makes a link and the DOM attribute it writes. The element is the one carrying the marker in that attribute, however
// deep inside the slot it sits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkFrom, collectContent, contentMarkerFor, LINK_ATTRS, MARKER_URL, MARKER_SLUG, MARKER_PHONE } from '../lib/calibrate-content.mjs';
import { WIDTHS } from '../lib/calibrate.mjs';

const atAll = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, map ] ) );

test( 'MUST FAIL TO FIND THE LINK: a URL setting landing on a nested <a href> records that path and href', () => {
	const read = atAll( {
		'': { shown: true },
		'sgs-card__footer': { shown: true },
		'sgs-card__footer > sgs-card__cta': { shown: true, a: { href: [ MARKER_SLUG ] } },
	} );
	assert.deepEqual( linkFrom( MARKER_SLUG, read ), { path: 'sgs-card__footer > sgs-card__cta', attr: 'href' } );
} );

test( 'a target setting records the target attribute, not href', () => {
	const read = atAll( { '': { shown: true }, 'sgs-icon__link': { shown: true, a: { target: [ '_blank' ] } } } );
	assert.deepEqual( linkFrom( '_blank', read ), { path: 'sgs-icon__link', attr: 'target' } );
} );

test( 'href wins over a lower-preference attribute when one marker lands in both', () => {
	const read = atAll( {
		'': { shown: true },
		'sgs-media__frame': { shown: true, a: { 'data-href': [ MARKER_SLUG ] } },
		'sgs-media__link': { shown: true, a: { href: [ MARKER_SLUG ] } },
	} );
	assert.deepEqual( linkFrom( MARKER_SLUG, read ), { path: 'sgs-media__link', attr: 'href' } );
	assert.equal( LINK_ATTRS[ 0 ], 'href' );
} );

test( 'a marker no attribute carries records nothing', () => {
	assert.equal( linkFrom( MARKER_SLUG, atAll( { '': { shown: true }, 'sgs-card__cta': { shown: true } } ) ), null );
} );

test( 'each link setting shape gets a marker whose needle survives percent-encoding', () => {
	const url = contentMarkerFor( { attr_name: 'ctaUrl', attr_type: 'string', role: 'link-href' }, 'link', {} );
	assert.deepEqual( url.attrs, { ctaUrl: MARKER_URL } );
	assert.equal( url.needle, MARKER_SLUG );
	const target = contentMarkerFor( { attr_name: 'linkTarget', attr_type: 'string', default_value: '"_self"', role: 'link-href' }, 'link', {} );
	assert.deepEqual( target.attrs, { linkTarget: '_blank' } );
	const phone = contentMarkerFor( { attr_name: 'phoneNumber', attr_type: 'string', role: 'link-content' }, 'link', {} );
	assert.deepEqual( phone.attrs, { phoneNumber: MARKER_PHONE } );
	// Every needle is made of unreserved characters only, so a block composing it into a query string leaves it whole.
	for ( const needle of [ MARKER_SLUG, MARKER_PHONE, '_blank' ] ) {
		assert.equal( encodeURIComponent( needle ), needle, `${ needle } is unchanged by percent-encoding` );
	}
} );

test( 'MUST FAIL TO FLIP TO ITSELF: a target already defaulting to _blank is marked _self', () => {
	const m = contentMarkerFor( { attr_name: 'linkTarget', attr_type: 'string', default_value: '"_blank"', role: 'link-href' }, 'link', {} );
	assert.deepEqual( m.attrs, { linkTarget: '_self' } );
} );

test( 'collectContent writes one link entry per setting and omits the key when there are none', () => {
	const read = atAll( { '': { shown: true }, 'sgs-card__cta': { shown: true, a: { href: [ MARKER_SLUG ] } } } );
	const file = collectContent( [ { content: { attr: 'ctaUrl', kind: 'link', needle: MARKER_SLUG }, contentRead: read } ] );
	assert.deepEqual( file.link, { ctaUrl: { path: 'sgs-card__cta', attr: 'href' } } );
	assert.ok( ! Object.hasOwn( collectContent( [] ), 'link' ) );
} );
