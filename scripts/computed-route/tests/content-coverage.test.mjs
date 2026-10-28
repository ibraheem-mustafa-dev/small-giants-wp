// The content coverage check (lib/content-coverage.mjs, content-coverage.mjs): every content setting of an SGS block has a route
// a re-clone fills it by, or a named gap row. The fixture DB and slot maps hold one setting per route, and each MUST FAIL case
// plants a setting with none. tests/content-coverage.mutations.json proves each assertion bites.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { contentCoverage, reportLines, NO_ELEMENT_SHAPES, contentRows } from '../lib/content-coverage.mjs';
import { coverageProblems, contentSettingId, parseContentSettingId, contentSettingProblems } from '../lib/clone-coverage.mjs';
import { textDecisions, linkDecisions, presenceDecisions, textSettings, linkSettings, presenceSettings } from '../lib/fill-presence.mjs';
import { mediaDecisions, mediaSettings } from '../lib/fill-media.mjs';
import { iconDecisions, iconSettings, ICON_SETTINGS } from '../lib/fill-icon.mjs';
import { formFieldWrites, formSettings, FORM_FIELD_SETTINGS } from '../lib/fill-form.mjs';
import { listClaims } from '../lib/fill-list-content.mjs';

const roles = [
	{ role_name: 'text-content', classification: 'content-bearing' },
	{ role_name: 'link-href', classification: 'content-bearing' },
	{ role_name: 'presence-boolean', classification: 'content-bearing' },
	{ role_name: 'content', classification: 'content-bearing' },
	{ role_name: 'image-object', classification: 'content-bearing' },
	{ role_name: 'image-alt', classification: 'content-bearing' },
	{ role_name: 'svg', classification: 'content-bearing' },
	{ role_name: 'css-modifier', classification: 'content-bearing' },
	{ role_name: 'typography', classification: 'styling-behaviour' },
];
const attr = ( block_slug, attr_name, role, attr_type = 'string', more = {} ) => ( { block_slug, attr_name, attr_type, role, ...more } );
const blocks = [ 'sgs/measured', 'sgs/listy', 'sgs/skel', 'sgs/pic', 'sgs/ico', 'sgs/form-field-text', 'sgs/wish', 'sgs/orphan', 'sgs/hosty', 'sgs/hosty-item' ].map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) );
const SCHEMAS = {
	'sgs/pic': { imageUrl: { type: 'string' }, imageId: { type: 'integer' }, imageAlt: { type: 'string' } },
	'sgs/ico': { iconSvg: { type: 'string' }, iconSource: { type: 'string' }, iconName: { type: 'string' } },
	'sgs/listy': { entries: { type: 'array', items: { properties: { title: { type: 'string' } } } } },
};
const schemaOf = ( b ) => SCHEMAS[ b ] ?? {};

// One setting per route, none of them planted yet.
const ROUTED = [
	attr( 'sgs/measured', 'title', 'text-content' ),
	attr( 'sgs/measured', 'href', 'link-href' ),
	attr( 'sgs/measured', 'showBadge', 'presence-boolean', 'boolean' ),
	attr( 'sgs/listy', 'entries', 'content', 'array' ),
	attr( 'sgs/skel', 'heading', 'text-content' ),
	attr( 'sgs/skel', 'url', 'link-href' ),
	attr( 'sgs/pic', 'imageUrl', 'image-object' ),
	attr( 'sgs/pic', 'imageAlt', 'image-alt', 'string', { alt_companion_attr: 'imageUrl' } ),
	attr( 'sgs/pic', 'imageId', 'image-object', 'integer' ),
	attr( 'sgs/ico', 'iconSvg', 'svg' ),
	attr( 'sgs/form-field-text', 'placeholder', 'content' ),
	attr( 'sgs/orphan', 'lead', 'text-content' ),
	attr( 'sgs/wish', 'errorText', 'text-content', 'string', { emit_shape: 'script-rendered' } ),
	attr( 'sgs/hosty-item', 'caption', 'text-content' ),
	attr( 'sgs/hosty-item', 'photo', 'image-object' ),
];
const SLOT_MAP = { block: 'sgs/measured', text: { title: { path: '.sgs-measured__title' } }, link: { href: { path: '.sgs-measured__a', attr: 'href' } }, presence: { showBadge: { shows: [ '.sgs-measured__badge' ], hides: [] } } };

function world( { extra = [], entries = {}, cache = { measured: SLOT_MAP, skel: { block: 'sgs/skel' } }, withRoutes = ROUTED } = {} ) {
	const file = fixtureDb( { roles, blocks, block_attributes: [ ...withRoutes, ...extra ], block_composition: [ { block_slug: 'sgs/hosty', composition_role: 'content-block', accepts_allowed_blocks: '["sgs/hosty-item"]' } ] } );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'content-cov-cache-' ) );
	for ( const [ name, map ] of Object.entries( cache ) ) {
		fs.writeFileSync( path.join( dir, `${ name }.json` ), JSON.stringify( map ) );
	}
	const db = openDb( file );
	return { db, dir, run: ( more = {} ) => contentCoverage( { db, cacheDir: dir, schemaOf, facts: loadFacts( { db, client: '' } ), coverage: { entries }, ...more } ) };
}
const gapRow = ( o = {} ) => ( { recognise: null, write: null, check: null, wave: 'content, media and icons', reason: 'a mechanism', owner: 'Track W', ...o } );
const routeOf = ( result, block, a ) => result.rows.find( ( r ) => r.block === block && r.attr === a );

test( 'NEGATIVE CONTROL: a fixture where every content setting has a route passes', () => {
	const r = world().run();
	assert.deepEqual( r.failing, [] );
	assert.deepEqual( r.staleGaps, [] );
	assert.deepEqual( r.badGaps, [] );
	assert.equal( r.ok, true );
	assert.equal( r.rows.length, ROUTED.length );
} );

test( 'each route claims its own setting: measured, list, role-writer (skeleton, media, icon, form), no-element', () => {
	const r = world().run();
	const at = ( b, a ) => [ routeOf( r, b, a ).route, routeOf( r, b, a ).writer ];
	assert.deepEqual( at( 'sgs/measured', 'title' ), [ 'measured', 'text' ] );
	assert.deepEqual( at( 'sgs/measured', 'href' ), [ 'measured', 'link' ] );
	assert.deepEqual( at( 'sgs/measured', 'showBadge' ), [ 'measured', 'presence' ] );
	assert.deepEqual( at( 'sgs/listy', 'entries' ), [ 'list', 'list' ] );
	assert.deepEqual( at( 'sgs/hosty-item', 'caption' ), [ 'list', 'list' ], 'the single child block of a host takes the items' );
	assert.deepEqual( at( 'sgs/skel', 'heading' ), [ 'role-writer', 'skeleton' ] );
	assert.deepEqual( at( 'sgs/skel', 'url' ), [ 'role-writer', 'skeleton' ] );
	assert.deepEqual( at( 'sgs/pic', 'imageUrl' ), [ 'role-writer', 'media' ] );
	assert.deepEqual( at( 'sgs/pic', 'imageId' ), [ 'role-writer', 'media' ] );
	assert.deepEqual( at( 'sgs/pic', 'imageAlt' ), [ 'role-writer', 'media' ] );
	assert.deepEqual( at( 'sgs/ico', 'iconSvg' ), [ 'role-writer', 'icon' ] );
	assert.deepEqual( at( 'sgs/form-field-text', 'placeholder' ), [ 'role-writer', 'form' ] );
	assert.deepEqual( at( 'sgs/wish', 'errorText' ), [ 'no-element', 'script-rendered' ] );
	assert.equal( r.counts.measured, 3 );
} );

test( 'MUST FAIL: a content setting with no route fails and is named with its role, type and why', () => {
	const w = world( { extra: [ attr( 'sgs/orphan', 'tagline', 'text-content' ) ] } );
	const r = w.run();
	assert.equal( r.ok, false );
	assert.equal( r.failing.length, 1 );
	assert.deepEqual( [ r.failing[ 0 ].block, r.failing[ 0 ].attr, r.failing[ 0 ].role, r.failing[ 0 ].type ], [ 'sgs/orphan', 'tagline', 'text-content', 'string' ] );
	assert.match( r.failing[ 0 ].why.join( '\n' ), /not calibrated: no slot map for sgs\/orphan/ );
	const text = reportLines( r ).join( '\n' );
	assert.match( text, /NO ROUTE sgs\/orphan\.tagline \[role text-content, string/ );
	assert.match( text, /no route 1/ );
} );

test( 'MUST FAIL: a second text-content setting of a block whose slot map has no reading for it has no route', () => {
	const r = world( { extra: [ attr( 'sgs/skel', 'subheading', 'text-content' ) ] } ).run();
	assert.deepEqual( r.failing.map( ( f ) => `${ f.block }.${ f.attr }` ), [ 'sgs/skel.subheading' ] );
	assert.match( r.failing[ 0 ].why[ 0 ], /calibration has no text, link or presence reading/ );
} );

test( 'the reason names the slot map list that holds the setting', () => {
	const w = world( { extra: [ attr( 'sgs/skel', 'subheading', 'text-content' ) ], cache: { measured: SLOT_MAP, skel: { block: 'sgs/skel', noMarker: [ 'subheading' ], text: { heading: { path: '.x' } } } } } );
	assert.match( w.run().failing[ 0 ].why[ 0 ], /the slot map lists it in noMarker/ );
	assert.match( w.run().failing[ 0 ].why[ 0 ], /reads text/ );
} );

test( 'MUST FAIL: a setting whose role looks misclassified (css-modifier in content-bearing) and has no route fails', () => {
	const r = world( { extra: [ attr( 'sgs/skel', 'navPosition', 'css-modifier' ) ] } ).run();
	assert.deepEqual( r.failing.map( ( f ) => `${ f.block }.${ f.attr }:${ f.role }` ), [ 'sgs/skel.navPosition:css-modifier' ] );
} );

test( 'a setting whose role is styling-behaviour is no content row at all', () => {
	const r = world( { extra: [ attr( 'sgs/skel', 'headingFont', 'typography' ) ] } ).run();
	assert.equal( r.ok, true );
	assert.equal( r.rows.length, ROUTED.length );
	assert.equal( contentRows( world().db ).length, ROUTED.length );
} );

test( 'a gap row for a setting with no route turns the failure into the gap route', () => {
	const id = contentSettingId( 'sgs/orphan', 'tagline' );
	const w = world( { extra: [ attr( 'sgs/orphan', 'tagline', 'text-content' ) ], entries: { [ id ]: gapRow() } } );
	const r = w.run();
	assert.equal( r.ok, true );
	assert.equal( routeOf( r, 'sgs/orphan', 'tagline' ).route, 'gap' );
	assert.equal( r.counts.gap, 1 );
	assert.equal( r.counts.none, 0 );
} );

test( 'MUST FAIL: a stale gap row (a writer now fills the setting) fails and names the route', () => {
	const id = contentSettingId( 'sgs/measured', 'title' );
	const r = world( { entries: { [ id ]: gapRow() } } ).run();
	assert.equal( r.ok, false );
	assert.deepEqual( r.staleGaps, [ { id, route: 'measured', writer: 'text' } ] );
	assert.match( reportLines( r ).join( '\n' ), /STALE GAP content-setting:sgs\/measured\.title/ );
} );

test( 'MUST FAIL: a stale gap row on a no-element setting fails too', () => {
	const id = contentSettingId( 'sgs/wish', 'errorText' );
	const r = world( { entries: { [ id ]: gapRow() } } ).run();
	assert.deepEqual( r.staleGaps.map( ( s ) => s.route ), [ 'no-element' ] );
} );

test( 'MUST FAIL: a gap row naming a setting the DB no longer holds fails', () => {
	const id = contentSettingId( 'sgs/orphan', 'gone' );
	const r = world( { entries: { [ id ]: gapRow() } } ).run();
	assert.equal( r.ok, false );
	assert.deepEqual( r.badGaps.map( ( b ) => b.id ), [ id ] );
	assert.match( reportLines( r ).join( '\n' ), /BAD GAP content-setting:sgs\/orphan\.gone: the framework DB holds no such content-bearing setting/ );
} );

test( 'MUST FAIL: a gap row naming a styling setting (not content-bearing) fails', () => {
	const id = contentSettingId( 'sgs/skel', 'headingFont' );
	const r = world( { extra: [ attr( 'sgs/skel', 'headingFont', 'typography' ) ], entries: { [ id ]: gapRow() } } ).run();
	assert.deepEqual( r.badGaps.map( ( b ) => b.id ), [ id ] );
} );

test( 'MUST FAIL: a malformed gap ID fails', () => {
	const r = world( { entries: { 'content-setting:nonsense': gapRow() } } ).run();
	assert.equal( r.ok, false );
	assert.match( r.badGaps[ 0 ].why, /content-setting:sgs\/<block>\.<setting>/ );
} );

test( 'a calibrated block whose slot map reads nothing for a setting says so; an uncalibrated block says not calibrated', () => {
	const r = world( { extra: [ attr( 'sgs/skel', 'blurb', 'text-content' ), attr( 'sgs/orphan', 'blurb', 'text-content' ) ] } ).run();
	const why = ( b ) => r.failing.find( ( f ) => f.block === b ).why[ 0 ];
	assert.match( why( 'sgs/skel' ), /calibration has no text, link or presence reading/ );
	assert.match( why( 'sgs/orphan' ), /^not calibrated/ );
} );

test( 'the emit_shape values that mean no element are exactly script-rendered, editor-only, output-only and context', () => {
	assert.deepEqual( [ ...NO_ELEMENT_SHAPES ].sort(), [ 'context', 'editor-only', 'output-only', 'script-rendered' ] );
	for ( const shape of NO_ELEMENT_SHAPES ) {
		const r = world( { extra: [ attr( 'sgs/orphan', 'x', 'text-content', 'string', { emit_shape: shape } ) ] } ).run();
		assert.equal( routeOf( r, 'sgs/orphan', 'x' ).route, 'no-element', shape );
	}
	for ( const shape of [ 'nested', 'repeater', 'child', 'parent-rendered' ] ) {
		const r = world( { extra: [ attr( 'sgs/orphan', 'x', 'text-content', 'string', { emit_shape: shape } ) ] } ).run();
		assert.equal( routeOf( r, 'sgs/orphan', 'x' ).route, null, `${ shape } names an element the draft draws` );
	}
} );

test( 'the check opens the DB read-only: it cannot write', () => {
	const { db } = world();
	assert.throws( () => db.exec( "INSERT INTO roles ( role_name, classification ) VALUES ( 'x', 'unclassified' )" ) );
} );

test( 'a gap row is a gap shape in the register: coverageProblems accepts a sound one and holds the inventory out of it', () => {
	const inventory = { sections: {} };
	const id = contentSettingId( 'sgs/timeline', 'entries' );
	const sound = { entries: { [ id ]: gapRow() } };
	assert.deepEqual( coverageProblems( { sections: {} }, sound, { baseline: [], writes: {}, registry: {} } ), [] );
	assert.deepEqual( parseContentSettingId( id ), { block: 'sgs/timeline', attr: 'entries' } );
	void inventory;
} );

test( 'MUST FAIL: the register refuses a content-setting row with no reason, owner or wave, or one that claims a writer', () => {
	const id = contentSettingId( 'sgs/timeline', 'entries' );
	const problems = ( e ) => contentSettingProblems( id, e ).join( '\n' );
	assert.match( problems( gapRow( { reason: '' } ) ), /names its mechanism/ );
	assert.match( problems( gapRow( { owner: 'Bean' } ) ), /names its "owner"/ );
	assert.match( problems( gapRow( { wave: '' } ) ), /names its Phase 4 wave/ );
	assert.match( problems( gapRow( { write: 'scripts/computed-route/lib/fill-media.mjs#mediaDecisions' } ) ), /is a gap: it names no recogniser/ );
	assert.match( problems( { excluded: { reason: 'x', signedBy: 'Bean', date: '2026-10-28' } } ), /is a gap/ );
	assert.deepEqual( contentSettingProblems( id, gapRow() ), [] );
	assert.match( contentSettingProblems( 'content-setting:bad', gapRow() ).join( '' ), /content-setting:sgs\/<block>\.<setting>/ );
} );

// The writers' selections are their own functions; these hold each writer's real output inside what the check claims for it.
const rich = ( ) => ( { calibration: { text: { a: { path: '.t' } }, link: { b: { path: '.l', attr: 'href' }, c: { path: '.l', attr: 'target' } }, presence: { d: { shows: [ '.p' ], hides: [] }, 'e=big': { shows: [ '.q' ], hides: [] } } } } );
test( 'the measured claims equal what textDecisions, linkDecisions and presenceDecisions write', () => {
	const { calibration } = rich();
	assert.deepEqual( textSettings( calibration ), [ 'a' ] );
	assert.deepEqual( linkSettings( calibration ), [ 'b' ], 'a target entry is no address setting' );
	assert.deepEqual( presenceSettings( calibration ), [ 'd', 'e' ] );
	assert.deepEqual( textDecisions( { calibration, slots: { '.t': 'Hello' } } ).writes.map( ( w ) => w.attr ), [ 'a' ] );
	assert.deepEqual( linkDecisions( { calibration, slots: { '.l': '/x' } } ).writes.map( ( w ) => w.attr ), [ 'b' ] );
	const written = presenceDecisions( { calibration, schema: { d: { type: 'boolean', default: false }, e: { type: 'string' } }, evidence: { '.p': true, '.q': true } } ).writes.map( ( w ) => w.attr );
	assert.deepEqual( written.sort(), [ 'd', 'e' ] );
} );

test( 'the media claims hold everything mediaDecisions writes, and nothing for a block with several image slots', () => {
	const slots = [ { alt: 'imageAlt', url: 'imageUrl' } ];
	const schema = { imageUrl: { type: 'string' }, imageId: { type: 'integer' }, imageAlt: { type: 'string' }, caption: { type: 'string' } };
	const map = { sites: { s: { files: [ { asset: 'a.png', url: 'https://x/a.png', id: 7 } ] } } };
	const out = mediaDecisions( { slots, schema, img: { tag: 'img', src: 'a.png', alt: 'An A', caption: 'Cap' }, media: { map, site: 's', origin: '' } } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ).sort(), [ ...mediaSettings( slots, schema ) ].sort() );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ).sort(), [ 'caption', 'imageAlt', 'imageId', 'imageUrl' ] );
	assert.deepEqual( mediaSettings( [ ...slots, { alt: 'bAlt', url: 'bUrl' } ], schema ), [] );
} );

test( 'the icon claims hold everything iconDecisions writes, and nothing for a block with no iconSvg', () => {
	const schema = { iconSvg: { type: 'string' }, iconSource: { type: 'string' }, iconName: { type: 'string' }, iconBogus: { type: 'string' } };
	const svg = { markup: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#123"/></svg>' };
	const out = iconDecisions( { svg, schema } );
	assert.ok( out.writes.length );
	out.writes.forEach( ( w ) => assert.ok( iconSettings( schema ).includes( w.attr ), w.attr ) );
	assert.deepEqual( iconSettings( { iconSource: {} } ), [] );
	assert.ok( ! iconSettings( schema ).includes( 'iconBogus' ) );
	assert.ok( ICON_SETTINGS.includes( 'iconSvg' ) );
} );

test( 'the form claims hold everything formFieldWrites writes', () => {
	const file = fixtureDb( { blocks: [ { slug: 'sgs/form-field-text', title: 't', category: 'sgs', type: 'dynamic' } ], block_attributes: FORM_FIELD_SETTINGS.map( ( a ) => attr( 'sgs/form-field-text', a, 'content', 'string' ) ) } );
	const el = { tag: 'input', type: 'text', placeholder: 'Your name', autocomplete: 'name', inputmode: 'text', maxlength: '40', value: 'x', checked: true, accept: 'a/b', labelInside: true };
	const out = formFieldWrites( { db: openDb( file ), block: 'sgs/form-field-text', el, copy: { required: 'Needed', tooLong: 'Long' } } );
	assert.ok( out.writes.length > 3 );
	out.writes.forEach( ( w ) => assert.ok( formSettings( 'sgs/form-field-text' ).includes( w.attr ), w.attr ) );
	assert.deepEqual( formSettings( 'sgs/hero' ), [] );
	assert.deepEqual( formSettings( 'sgs/form' ), [ 'savedProgress', 'nextLabel', 'submitLabel', 'prevLabel' ] );
} );

test( 'the list claims are the array setting, or the one child block\'s item settings', () => {
	assert.deepEqual( listClaims( 'sgs/a', { kind: 'attr', attr: 'entries', keys: [] } ), [ { block: 'sgs/a', attr: 'entries' } ] );
	assert.deepEqual( listClaims( 'sgs/a', { kind: 'children', child: 'sgs/b', keys: [ { key: 'x' }, { key: 'y' } ] } ), [ { block: 'sgs/b', attr: 'x' }, { block: 'sgs/b', attr: 'y' } ] );
	assert.deepEqual( listClaims( 'sgs/a', null ), [] );
} );
