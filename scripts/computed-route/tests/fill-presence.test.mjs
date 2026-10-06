// L9.6 (FR-47-4 presence and content): visibility and variant settings are chosen from calibration's `presence` so the
// built block shows the elements its draft element shows and no others; the draft's words and links go to the settings
// calibration's `text` and `link` name. Every calibration key is optional and every read tolerates its absence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceDecisions, textDecisions, linkDecisions, normaliseHref, plainText } from '../lib/fill-presence.mjs';

// The fixed shape lane L7 adds to a block's calibration cache file.
const CAL = {
	elements: { '': {}, '.sgs-card__title': {}, '.sgs-card__badge': {}, '.sgs-card__date': {} },
	presence: {
		showBadge: { shows: [ '.sgs-card__badge' ], hides: [] },
		hideDate: { shows: [], hides: [ '.sgs-card__date' ] },
		'layout=compact': { shows: [], hides: [ '.sgs-card__date', '.sgs-card__badge' ] },
		'layout=featured': { shows: [ '.sgs-card__badge' ], hides: [] },
	},
	text: { title: { path: '.sgs-card__title', reachedAt: [ 375, 768, 1440 ] }, intro: { path: '', reachedAt: [ 375, 768, 1440 ] } },
	link: { url: { path: '', attr: 'href' }, moreUrl: { path: '.sgs-card__title', attr: 'href' } },
};
const SCHEMA = { showBadge: { type: 'boolean', default: false }, hideDate: { type: 'boolean', default: false }, showNote: { type: 'boolean', default: true }, layout: { type: 'string', default: 'default' }, title: { type: 'string' }, intro: { type: 'string' }, url: { type: 'string' }, moreUrl: { type: 'string' } };
const run = ( evidence, over = {} ) => presenceDecisions( { calibration: CAL, schema: SCHEMA, attributes: {}, evidence, ...over } );
const value = ( r, attr ) => r.writes.find( ( w ) => w.attr === attr )?.value;

test( 'MUST FAIL: a draft showing the badge flips showBadge on; a draft with no badge leaves it at its default', () => {
	assert.equal( value( run( { '.sgs-card__badge': true } ), 'showBadge' ), true );
	assert.equal( value( run( { '.sgs-card__badge': false } ), 'showBadge' ), undefined, 'the badge is already hidden by default: nothing to write' );
	assert.deepEqual( run( {} ).writes, [], 'no evidence about any element, no write' );
} );

test( 'a setting that hides an element flips when the draft lacks it, and not when the draft shows it', () => {
	assert.equal( value( run( { '.sgs-card__date': false } ), 'hideDate' ), true );
	assert.equal( value( run( { '.sgs-card__date': true } ), 'hideDate' ), undefined );
} );

test( 'a boolean that defaults to true flips to false, never to true', () => {
	const cal = { ...CAL, presence: { showNote: { shows: [ '.sgs-card__note' ], hides: [] } } };
	const off = presenceDecisions( { calibration: cal, schema: SCHEMA, attributes: {}, evidence: { '.sgs-card__note': false } } );
	assert.equal( off.writes.length, 0, 'the note is shown by default; a draft without it means the flip is needed only if flipping hides it' );
	const flipHides = { ...CAL, presence: { showNote: { shows: [], hides: [ '.sgs-card__note' ] } } };
	assert.equal( value( presenceDecisions( { calibration: flipHides, schema: SCHEMA, attributes: {}, evidence: { '.sgs-card__note': false } } ), 'showNote' ), false );
} );

test( 'a variant value is chosen by how many elements it gets right; the default variant when none beats it', () => {
	assert.equal( value( run( { '.sgs-card__date': false, '.sgs-card__badge': false } ), 'layout' ), 'compact' );
	assert.equal( value( run( { '.sgs-card__badge': true, '.sgs-card__date': true } ), 'layout' ), 'featured' );
	assert.equal( value( run( { '.sgs-card__badge': false, '.sgs-card__date': true } ), 'layout' ), undefined, 'the default variant already shows that' );
} );

test( 'two variant values equally right is ambiguous: no write, and the tie is reported', () => {
	const cal = { ...CAL, presence: { 'layout=a': { shows: [ '.sgs-card__badge' ], hides: [] }, 'layout=b': { shows: [ '.sgs-card__badge' ], hides: [] } } };
	const r = presenceDecisions( { calibration: cal, schema: SCHEMA, attributes: {}, evidence: { '.sgs-card__badge': true } } );
	assert.deepEqual( r.writes, [] );
	assert.match( r.notes.join( '\n' ), /layout.*a, b.*equally/ );
} );

test( 'a value the skeleton already set is kept, and a contradiction with the draft is reported, not overwritten', () => {
	const r = run( { '.sgs-card__badge': true }, { attributes: { showBadge: false } } );
	assert.equal( value( r, 'showBadge' ), undefined, 'the skeleton keeps its false' );
	assert.match( r.notes.join( '\n' ), /showBadge is false in the skeleton; the draft shows .sgs-card__badge/ );
	assert.deepEqual( run( { '.sgs-card__badge': true }, { attributes: { showBadge: true } } ).notes, [] );
} );

test( 'an element the draft shows that no setting can show, or hides that no setting can hide, is UNMAPPED', () => {
	const a = run( { '.sgs-card__extra': true } );
	assert.deepEqual( a.unmapped, [ { property: 'presence', value: 'shown', slot: '.sgs-card__extra', reason: 'the draft shows ".sgs-card__extra" and no setting of the block shows it (calibration found it in no default render and in no presence list)' } ] );
	const cal = { ...CAL, elements: { ...CAL.elements, '.sgs-card__always': {} } };
	const b = presenceDecisions( { calibration: cal, schema: SCHEMA, attributes: {}, evidence: { '.sgs-card__always': false } } );
	assert.equal( b.unmapped[ 0 ].value, 'hidden' );
	assert.match( b.unmapped[ 0 ].reason, /no setting of the block hides it/ );
	assert.deepEqual( run( { '.sgs-card__title': true, '.sgs-card__badge': true } ).unmapped, [], 'a default element, and one a setting shows, are mapped' );
} );

test( 'a non-boolean setting named by a plain presence key is reported, never written', () => {
	const cal = { ...CAL, presence: { title: { shows: [ '.sgs-card__badge' ], hides: [] } } };
	const r = presenceDecisions( { calibration: cal, schema: SCHEMA, attributes: {}, evidence: { '.sgs-card__badge': true } } );
	assert.deepEqual( r.writes, [] );
	assert.equal( r.unmapped[ 0 ].property, 'presence' );
	assert.match( r.unmapped[ 0 ].reason, /title is a string setting/ );
} );

test( 'a calibration with no presence, no text and no link key reads as nothing to do, never as an error', () => {
	const bare = { elements: {}, settings: {} };
	for ( const calibration of [ bare, null, undefined ] ) {
		assert.deepEqual( presenceDecisions( { calibration, schema: SCHEMA, attributes: {}, evidence: { '.x': true } } ), { writes: [], unmapped: [], notes: [] } );
		assert.deepEqual( textDecisions( { calibration, attributes: {}, slots: { '': 'hello' }, leaf: true } ).writes, [] );
		assert.deepEqual( linkDecisions( { calibration, attributes: {}, slots: { '': '/shop/' }, origin: 'http://x' } ).writes, [] );
	}
} );

test( 'words: the draft\'s text goes into the empty content setting calibration ties to that element, and nothing is overwritten', () => {
	const t = textDecisions( { calibration: CAL, attributes: {}, slots: { '.sgs-card__title': 'Fatima Nawaz', '': 'Intro words' }, leaf: true } );
	assert.deepEqual( t.writes, [ { attr: 'title', value: 'Fatima Nawaz', merge: 'replace' }, { attr: 'intro', value: 'Intro words', merge: 'replace' } ] );
	const kept = textDecisions( { calibration: CAL, attributes: { title: 'Fatima Nawaz' }, slots: { '.sgs-card__title': 'Fatima  Nawaz' }, leaf: true } );
	assert.deepEqual( kept.writes, [] );
	assert.deepEqual( kept.notes, [], 'whitespace is not a difference' );
	const differs = textDecisions( { calibration: CAL, attributes: { title: 'Someone Else' }, slots: { '.sgs-card__title': 'Fatima Nawaz' }, leaf: true } );
	assert.match( differs.notes[ 0 ], /title holds "Someone Else"; the draft shows "Fatima Nawaz"/ );
	assert.deepEqual( textDecisions( { calibration: CAL, attributes: { title: '<strong>Fatima</strong> Nawaz' }, slots: { '.sgs-card__title': 'Fatima Nawaz' }, leaf: true } ).notes, [], 'markup in a setting is not a difference' );
} );

test( 'words with no setting that holds them are UNMAPPED; words already in any string setting, and a container\'s own root text, are not', () => {
	const none = textDecisions( { calibration: CAL, attributes: {}, slots: { '.sgs-card__subtitle': 'A subtitle' }, leaf: true } );
	assert.deepEqual( none.unmapped, [ { property: 'text', value: 'A subtitle', slot: '.sgs-card__subtitle', reason: 'no setting of the block prints text in ".sgs-card__subtitle" (calibration\'s text lists title, intro)' } ] );
	assert.deepEqual( textDecisions( { calibration: CAL, attributes: { caption: 'A subtitle' }, slots: { '.sgs-card__subtitle': 'A subtitle' }, leaf: true } ).unmapped, [] );
	assert.deepEqual( textDecisions( { calibration: CAL, attributes: {}, slots: { '': 'children words' }, leaf: false } ).writes, [], 'a block holding other blocks does not own their words' );
} );

test( 'links: a real href goes into the empty link setting; #, javascript:, same-origin and relative forms are normalised', () => {
	assert.equal( normaliseHref( '#', 'http://127.0.0.1:5' ), null );
	assert.equal( normaliseHref( '', 'http://127.0.0.1:5' ), null );
	assert.equal( normaliseHref( 'javascript:void(0)', 'http://127.0.0.1:5' ), null );
	assert.equal( normaliseHref( 'http://127.0.0.1:5/shop/?a=1#x', 'http://127.0.0.1:5' ), '/shop/?a=1#x' );
	assert.equal( normaliseHref( 'https://example.org/p', 'http://127.0.0.1:5' ), 'https://example.org/p' );
	assert.equal( normaliseHref( 'mailto:a@b.co', 'http://127.0.0.1:5' ), 'mailto:a@b.co' );
	assert.equal( normaliseHref( '/shop/', 'http://127.0.0.1:5' ), '/shop/' );
	assert.equal( normaliseHref( 'page.html', 'http://127.0.0.1:5' ), null, 'a draft-local relative file means nothing on a WordPress site' );
	const l = linkDecisions( { calibration: CAL, attributes: {}, slots: { '': 'http://127.0.0.1:5/shop/', '.sgs-card__title': '#' }, origin: 'http://127.0.0.1:5' } );
	assert.deepEqual( l.writes, [ { attr: 'url', value: '/shop/', merge: 'replace' } ] );
	assert.deepEqual( linkDecisions( { calibration: CAL, attributes: { url: '/shop/' }, slots: { '': '/shop/' }, origin: 'http://x' } ).writes, [] );
	assert.match( linkDecisions( { calibration: CAL, attributes: { url: '/old/' }, slots: { '': '/shop/' }, origin: 'http://x' } ).notes[ 0 ], /url holds "\/old\/"; the draft links to "\/shop\/"/ );
} );

test( 'a real link where no setting makes that element a link is UNMAPPED', () => {
	const l = linkDecisions( { calibration: CAL, attributes: {}, slots: { '.sgs-card__badge': '/offers/' }, origin: 'http://x' } );
	assert.deepEqual( l.unmapped, [ { property: 'link', value: '/offers/', slot: '.sgs-card__badge', reason: 'no setting of the block makes ".sgs-card__badge" a link (calibration\'s link lists url, moreUrl)' } ] );
} );

test( 'plainText strips markup and collapses whitespace', () => {
	assert.equal( plainText( ' <b>Hi</b>\n  there &amp; you ' ), 'Hi there & you' );
} );
