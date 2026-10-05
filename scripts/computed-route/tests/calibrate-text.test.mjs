// Proves Spec 47 §3.2's text read (FR-47-2): a setting whose role is content OR text-content is rendered with a
// marker string and records the element whose text it prints. The printing element is the deepest one carrying the
// marker, never the wrapper whose textContent only contains it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { textFrom, collectContent, contentMarkerFor, MARKER_TEXT, MARKER_NUMBER } from '../lib/calibrate-content.mjs';
import { WIDTHS } from '../lib/calibrate.mjs';

const atAll = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, map ] ) );
// An element that carries the marker in its own or a descendant's text.
const carries = ( ...paths ) => Object.fromEntries( paths.map( ( p ) => [ p, { shown: true, t: [ MARKER_TEXT ] } ] ) );

test( 'MUST FAIL TO FIND THE PRINTING ELEMENT: the deepest element carrying the marker is the path, not its wrapper', () => {
	// The root and the title both contain the marker through textContent; only the emphasis element prints it.
	const read = atAll( { ...carries( '', 'sgs-card__title', 'sgs-card__title > sgs-card__em' ), 'sgs-card__body': { shown: true } } );
	assert.deepEqual( textFrom( MARKER_TEXT, read ), { path: 'sgs-card__title > sgs-card__em', reachedAt: [ 375, 768, 1440 ] } );
} );

test( 'reachedAt names only the widths the marker string was found at', () => {
	const read = { 375: { '': { shown: true } }, 768: carries( '', 'sgs-card__title' ), 1440: carries( '', 'sgs-card__title' ) };
	assert.deepEqual( textFrom( MARKER_TEXT, read ), { path: 'sgs-card__title', reachedAt: [ 768, 1440 ] } );
} );

test( 'a marker no element carries records nothing', () => {
	assert.equal( textFrom( MARKER_TEXT, atAll( { '': { shown: true }, 'sgs-card__title': { shown: true } } ) ), null );
} );

test( 'both content and text-content roles get a text marker', () => {
	const schema = { heading: { type: 'string' }, noReviewsText: { type: 'string' } };
	const asContent = contentMarkerFor( { attr_name: 'heading', attr_type: 'string', role: 'content' }, 'text', schema );
	const asTextContent = contentMarkerFor( { attr_name: 'noReviewsText', attr_type: 'string', role: 'text-content' }, 'text', schema );
	assert.deepEqual( asContent.attrs, { heading: MARKER_TEXT } );
	assert.deepEqual( asTextContent.attrs, { noReviewsText: MARKER_TEXT } );
	assert.equal( asContent.needle, MARKER_TEXT );
	assert.equal( asTextContent.needle, MARKER_TEXT );
} );

test( 'a numeric text setting gets a distinctive number, searched as its own digits', () => {
	const m = contentMarkerFor( { attr_name: 'reviewCount', attr_type: 'number', role: 'text-content' }, 'text', {} );
	assert.deepEqual( m.attrs, { reviewCount: MARKER_NUMBER } );
	assert.equal( m.needle, String( MARKER_NUMBER ) );
} );

test( 'MUST FAIL TO MARK: a text setting holding a list or an object takes no marker string', () => {
	assert.equal( contentMarkerFor( { attr_name: 'items', attr_type: 'array', role: 'content' }, 'text', {} ), null );
	assert.equal( contentMarkerFor( { attr_name: 'media', attr_type: 'object', role: 'text-content' }, 'text', {} ), null );
} );

test( 'the text marker survives escaping and collides with no colour, token or slug', () => {
	// Letters and digits only: unchanged by esc_html, esc_attr, sanitize_text_field and wp_kses, and left whole by
	// wp_trim_words because it carries no space.
	assert.match( MARKER_TEXT, /^[a-z0-9]+$/ );
	assert.ok( ! /^#?[0-9a-f]{3,8}$/.test( MARKER_TEXT ), 'never readable as a hex colour' );
	assert.ok( ! MARKER_TEXT.includes( '-' ), 'never readable as a palette slug' );
} );

test( 'collectContent writes one text entry per setting and omits the key when there are none', () => {
	const file = collectContent( [ { content: { attr: 'cardTitle', kind: 'text', needle: MARKER_TEXT }, contentRead: atAll( carries( '', 'sgs-wa__card-title' ) ) } ] );
	assert.deepEqual( file.text, { cardTitle: { path: 'sgs-wa__card-title', reachedAt: [ 375, 768, 1440 ] } } );
	assert.ok( ! Object.hasOwn( collectContent( [] ), 'text' ) );
} );
