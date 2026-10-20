// Spec 48 FR-48-32 (Site Info proposal with format validation), lib/intake-siteinfo.mjs and
// lib/intake-siteinfo-shape.mjs: the fixture's phone, email, address, hours and social links are proposed with their
// sources; a placeholder address, a malformed phone, a `{{ }}` value and a `#/` social link are refused with reasons;
// two values for one key stay two rows; the confirmed set reaches the provisioning table through a stub dry run
// that refuses --apply. The real Indus export is read last, read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposeSiteInfo, handoverFor, handoverTargets, provisionDryRun, parseSyncPrint, linkCandidate, titleCandidates } from '../lib/intake-siteinfo.mjs';
import { emailShape, phoneShape, socialKey, validate, parseHoursText } from '../lib/intake-siteinfo-shape.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'intake-siteinfo' );
const EXPORT = path.join( FIX, 'export' );
const INDUS = path.resolve( HERE, '../../../sites/indus-foods/handoff' );
const SYNC = { 'Site.dc.html': '[sync-business-info] high-confidence fields extracted from the draft:\n  email                    = info@acme-bakery.co.uk\n  opening_hours.monday     = 9.00-17.30\n\n[sync-business-info] extract-only (no --push). Nothing written.\n' };
const fixture = proposeSiteInfo( { folder: EXPORT, syncPrint: SYNC } );
const row = ( id, r = fixture ) => r.rows.find( ( x ) => x.rowId === id );
const refusedOf = ( key, value, r = fixture ) => r.refused.find( ( x ) => x.key === key && x.value === value );

test( 'the fixture proposes its phone, email, address, socials and hours, each with its sources', () => {
	assert.deepEqual( fixture.gaps, [] );
	assert.equal( row( 'siteinfo:email' ).normalised, 'info@acme-bakery.co.uk' );
	assert.deepEqual( row( 'siteinfo:email' ).sources.map( ( s ) => s.source ).sort(), [ "logic data object { label: 'Email' }", 'sync-business-info.py --draft (print only)', 'template <a href>' ] );
	assert.equal( row( 'siteinfo:address' ).normalised, '12 Market Street, Birmingham B1 1AA' );
	assert.equal( row( 'siteinfo:address' ).sources.length, 2, 'the "Find us" text and the Visit data object agree' );
	assert.equal( row( 'siteinfo:socials.instagram' ).value, 'https://www.instagram.com/acmebakery' );
	assert.equal( row( 'siteinfo:socials.facebook' ).value, 'https://facebook.com/acmebakery' );
	assert.equal( row( 'siteinfo:socials.whatsapp' ).value, 'https://wa.me/441214960000' );
	assert.equal( fixture.rows.filter( ( r ) => r.key.startsWith( 'socials.instagram' ) ).length, 1, 'instagram.com.evil.example is not Instagram' );
	assert.match( row( 'siteinfo:email' ).sources.find( ( s ) => s.source.startsWith( 'logic' ) ).draftId, /^Site\.dc\.html:js:\d+:\d+$/ );
	assert.match( row( 'siteinfo:socials.instagram' ).sources[ 0 ].draftId, /^Site\.dc\.html:\d+:\d+$/ );
} );

test( 'MUST FAIL: the hours getter expands its weekday minute ranges to per-day keys', () => {
	const hours = Object.fromEntries( fixture.rows.filter( ( r ) => r.key.startsWith( 'hours.' ) ).map( ( r ) => [ r.key, r.normalised ] ) );
	assert.deepEqual( hours, {
		'hours.sunday': 'closed', 'hours.monday': '09:00–17:30', 'hours.tuesday': '09:00–17:30', 'hours.wednesday': '09:00–17:30',
		'hours.thursday': '09:00–17:30', 'hours.friday': '09:00–12:00, 14:00–17:30', 'hours.saturday': '10:00–15:00',
	} );
	assert.equal( row( 'siteinfo:hours.monday' ).sources.length, 2, 'the sync print 9.00-17.30 for opening_hours.monday joins the getter row' );
	assert.deepEqual( parseHoursText( 'Mon-Fri 9:30am - 5pm, Sat 10-3' ).saturday, [ [ 600, 900 ] ] );
	assert.equal( parseHoursText( 'Mon-Fri 9:30am - 5pm' ).wednesday[ 0 ][ 1 ], 1020 );
} );

test( 'MUST FAIL: a placeholder address is refused with its reason, never proposed', () => {
	assert.equal( refusedOf( 'email', 'hello@example.com' )?.reason, 'placeholder host example.com' );
	assert.ok( ! fixture.rows.some( ( r ) => /example\.com/.test( r.value ) ) );
	assert.match( validate( 'socials.facebook', 'https://localhost/acme' ).reason, /placeholder host localhost/ );
} );

test( 'MUST FAIL: a malformed phone is refused for its digit count', () => {
	assert.equal( refusedOf( 'phone', '0121 77' )?.reason, 'phone has 6 digits; a UK number has 10 or 11' );
	assert.deepEqual( phoneShape( '+44 (0)121 496 0000' ), { valid: true, normalised: '01214960000', reason: null } );
	assert.equal( phoneShape( '+1 202 555 0100' ).valid, false );
	assert.equal( phoneShape( '0121 496 OOOO' ).valid, false );
} );

test( 'MUST FAIL: a `{{ }}` value and a `#/` social link are refused with their reasons', () => {
	assert.equal( refusedOf( 'phone', '{{ shopPhone }}' )?.reason, 'holds an unresolved {{ }} binding', 'the "Call us" label is followed by a binding' );
	assert.equal( refusedOf( 'socials.linkedin', '#/' )?.reason, 'placeholder link "#/"' );
	assert.equal( linkCandidate( '#/', 'Home' ), null, 'a #/ route link with no brand label is no business detail' );
} );

test( 'MUST FAIL: two values for one key are two candidate rows, never a silent pick', () => {
	const phones = fixture.rows.filter( ( r ) => 'phone' === r.key );
	assert.deepEqual( phones.map( ( r ) => [ r.rowId, r.normalised ] ), [ [ 'siteinfo:phone#1', '01214960000' ], [ 'siteinfo:phone#2', '01214960999' ] ] );
} );

test( 'MUST FAIL: is_email() shape, the TLD rule and the registry hosts', () => {
	for ( const ok of [ 'a@b.co', "o'brien+tag@mail.example-shop.co.uk", 'mailto:info@acme.org?subject=Hi' ] ) {
		assert.equal( emailShape( ok ).valid, true, ok );
	}
	for ( const no of [ 'a@b', 'ab@x.c', '@acme.co.uk', 'a b@acme.co.uk', 'info@-acme.co.uk', 'info@acme..co.uk', 'info@acme.co.4k' ] ) {
		assert.equal( emailShape( no ).valid, false, no );
	}
	assert.equal( socialKey( 'https://www.linkedin.com/company/acme' ), 'socials.linkedin' );
	assert.equal( socialKey( 'https://x.com/acme' ), 'socials.twitter' );
	assert.equal( socialKey( 'https://instagram.com.evil.example/acme' ), null );
	assert.equal( socialKey( 'ftp://instagram.com/acme' ), null );
	assert.equal( validate( 'socials.instagram', 'https://facebook.com/acme' ).valid, false );
	assert.equal( validate( 'address', '12 Market Street, Birmingham' ).reason, 'address holds no UK postcode' );
} );

test( 'parseSyncPrint reads the print-only lines and maps opening_hours to hours', () => {
	assert.deepEqual( parseSyncPrint( SYNC[ 'Site.dc.html' ] ), [ { key: 'email', raw: 'info@acme-bakery.co.uk' }, { key: 'hours.monday', raw: '9.00-17.30' } ] );
} );

test( 'MUST FAIL: the real sync-business-info.py print is one source; a failing command is a gap row (R-48-3)', () => {
	const live = proposeSiteInfo( { folder: EXPORT } );
	assert.ok( row( 'siteinfo:socials.instagram', live ).sources.some( ( s ) => s.source.startsWith( 'sync-business-info.py' ) ) );
	const broken = proposeSiteInfo( { folder: EXPORT, python: 'python-missing-for-test' } );
	assert.equal( broken.gaps.length, 1 );
	assert.equal( broken.gaps[ 0 ].construct, 'sync-business-info' );
	assert.equal( broken.gaps[ 0 ].draftId, 'Site.dc.html' );
} );

test( 'MUST FAIL: handoverFor keeps the provisioning keys and maps hours to opening_hours; conflicts, drops and failed edits are not applied', () => {
	const pick = [ 'siteinfo:phone#1', 'siteinfo:email', 'siteinfo:socials.instagram', 'siteinfo:address', 'siteinfo:hours.monday' ].map( ( id ) => row( id ) );
	const { entries, notApplied } = handoverFor( pick );
	assert.deepEqual( entries, [
		{ owner: 'site-info', key: 'phone', address: '0121 496 0000', ref: 'siteinfo:phone#1' },
		{ owner: 'site-info', key: 'email', address: 'info@acme-bakery.co.uk', ref: 'siteinfo:email' },
		{ owner: 'site-info', key: 'socials.instagram', address: 'https://www.instagram.com/acmebakery', ref: 'siteinfo:socials.instagram' },
		{ owner: 'site-info', key: 'address', address: '12 Market Street, Birmingham B1 1AA', ref: 'siteinfo:address' },
		{ owner: 'site-info', key: 'opening_hours.mon', address: '09:00–17:30', ref: 'siteinfo:hours.monday' },
	] );
	assert.deepEqual( notApplied, [] );
	assert.equal( handoverTargets( 'hours.mon-fri' ), null, 'only an exact day name maps' );
	assert.equal( handoverFor( [ { rowId: 'siteinfo:vat', key: 'vat_number', value: 'GB1', valid: true } ] ).notApplied[ 0 ].reason, 'provision-site-info-from-draft.py does not fill vat_number' );
	const both = handoverFor( [ row( 'siteinfo:phone#1' ), row( 'siteinfo:phone#2' ) ] );
	assert.equal( both.entries.length, 0 );
	assert.match( both.notApplied[ 0 ].reason, /2 confirmed values for phone/ );
	const marked = handoverFor( [ { ...row( 'siteinfo:phone#1' ), mark: 'drop' }, { ...row( 'siteinfo:phone#2' ), mark: 'edit:0121 496 0123' }, { ...row( 'siteinfo:email' ), mark: 'edit:me@example.com' } ] );
	assert.deepEqual( marked.entries, [ { owner: 'site-info', key: 'phone', address: '0121 496 0123', ref: 'siteinfo:phone#2' } ] );
	assert.deepEqual( marked.notApplied.map( ( n ) => n.reason ), [ 'dropped in review', 'failed shape validation: placeholder host example.com' ] );
} );

test( 'MUST FAIL: the confirmed set reaches the provisioning table through a dry run that never passes --apply', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-siteinfo-' ) );
	try {
		const file = path.join( dir, 'handover.json' );
		fs.writeFileSync( file, JSON.stringify( handoverFor( [ row( 'siteinfo:phone#1' ), row( 'siteinfo:email' ), row( 'siteinfo:socials.whatsapp' ) ] ).entries ) );
		const run = provisionDryRun( { site: 'stub-site', handoverFile: file, script: path.join( FIX, 'stub-provision.py' ) } );
		assert.equal( run.code, 0, `the stub exits 9 when given --apply: ${ run.stderr }` );
		assert.deepEqual( run.gaps, [] );
		assert.deepEqual( run.table, [
			{ key: 'phone', current: '-', address: '0121 496 0000', result: 'WRITE' },
			{ key: 'email', current: '-', address: 'info@acme-bakery.co.uk', result: 'WRITE' },
			{ key: 'socials.whatsapp', current: '-', address: 'https://wa.me/441214960000', result: 'WRITE' },
		] );
		assert.ok( run.lines.some( ( l ) => l.startsWith( 'DRY RUN: nothing written' ) ) );
		const missing = provisionDryRun( { site: 'stub-site', handoverFile: file, script: path.join( FIX, 'no-such-script.py' ) } );
		assert.notEqual( missing.code, 0 );
		assert.equal( missing.gaps[ 0 ].construct, 'provision-dry-run' );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'Indus (read-only): phone, email and WhatsApp are proposed; the #/ social icons are refused with the reason', { skip: ! fs.existsSync( INDUS ) && 'no Indus export' }, () => {
	const r = proposeSiteInfo( { folder: INDUS } );
	assert.deepEqual( r.gaps, [] );
	assert.equal( row( 'siteinfo:phone', r ).normalised, '01217714330' );
	assert.equal( row( 'siteinfo:email', r ).normalised, 'amir@indusfoodsltd.com' );
	assert.equal( row( 'siteinfo:socials.whatsapp', r ).value, 'https://wa.me/441217714330' );
	for ( const key of [ 'socials.linkedin', 'socials.facebook', 'socials.instagram', 'socials.google' ] ) {
		const refused = refusedOf( key, '#/', r );
		assert.equal( refused?.reason, 'placeholder link "#/"', key );
		assert.equal( refused.sources.length, 3, `${ key }: top bar, drawer and footer` );
	}
	assert.equal( row( 'siteinfo:hours.friday', r ).normalised, '09:30–12:00, 14:30–17:00' );
	assert.equal( row( 'siteinfo:hours.sunday', r ).normalised, 'closed' );
	assert.ok( r.rows.some( ( x ) => 'address' === x.key && /B11 1BU/.test( x.normalised ) ) );
} );

test( 'MUST FAIL: the drafts\' titles propose the site title and a tagline; titles with no common part propose nothing', () => {
	const mamas = [ 'Shop · Mama\'s Munches', 'Mama\'s Munches · Handmade lactation cookies', 'Help & FAQs · Mama\'s Munches', 'Your basket · Mama\'s Munches' ]
		.map( ( text, i ) => ( { text, draftId: `P${ i }:1` } ) );
	const got = titleCandidates( mamas );
	assert.deepEqual( [ ...new Set( got.filter( ( c ) => 'site_title' === c.key ).map( ( c ) => c.raw ) ) ], [ 'Mama\'s Munches' ] );
	assert.deepEqual( got.filter( ( c ) => 'tagline' === c.key ), [ { key: 'tagline', raw: 'Handmade lactation cookies', draftId: 'P1:1' } ] );
	assert.deepEqual( titleCandidates( [ { text: 'Shop · Acme', draftId: 'a' }, { text: 'Basket · Other', draftId: 'b' } ] ), [] );
	assert.deepEqual( titleCandidates( [ { text: 'Acme · Bakery', draftId: 'a' }, { text: 'Acme · Bakery', draftId: 'b' } ] ), [], 'two parts common to every title name no one site title' );
	assert.deepEqual( titleCandidates( [ { text: 'Acme Bakery', draftId: 'a' } ] ), [ { key: 'site_title', raw: 'Acme Bakery', draftId: 'a' } ] );
	assert.deepEqual( titleCandidates( [] ), [] );
} );

test( 'MUST FAIL: a confirmed site title goes to blogname and a tagline to Site Info and blogdescription', () => {
	const { entries, notApplied } = handoverFor( [ { rowId: 'siteinfo:site_title', key: 'site_title', value: 'Mama\'s Munches', valid: true }, { rowId: 'siteinfo:tagline', key: 'tagline', value: 'Handmade lactation cookies', valid: true } ] );
	assert.deepEqual( notApplied, [] );
	assert.deepEqual( entries, [
		{ owner: 'wp-option', key: 'blogname', address: 'Mama\'s Munches', ref: 'siteinfo:site_title' },
		{ owner: 'site-info', key: 'tagline', address: 'Handmade lactation cookies', ref: 'siteinfo:tagline' },
		{ owner: 'wp-option', key: 'blogdescription', address: 'Handmade lactation cookies', ref: 'siteinfo:tagline' },
	] );
} );
