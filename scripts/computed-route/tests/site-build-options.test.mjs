// Spec 48 FR-48-55: the site build's site options (lib/site-build-options.mjs) against an in-memory WordPress: Fill's
// site-options.json is promoted into the client's committed file, the plan lists each changed key with its before and
// after, only --apply's writer changes the site, and a second plan after the writer holds nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { optionsPhp, planSiteOptions, promoteSiteOptions, readSiteOptions, readStoredOptions, siteOptionsFile, withSiteOptions } from '../lib/site-build-options.mjs';

const FADE = { option: 'sgs_motion_settings', records: [ 'route-fade-1' ], value: { page_transitions: true, page_transition_style: 'fade', page_transition_duration: 350, page_transition_easing: 'ease-out' } };

function fixture( { fill = FADE, committed = null } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-options-' ) );
	const run = path.join( repo, 'fill-run' );
	fs.mkdirSync( run, { recursive: true } );
	if ( fill ) {
		fs.writeFileSync( path.join( run, 'site-options.json' ), JSON.stringify( fill ) );
	}
	if ( committed ) {
		fs.mkdirSync( path.dirname( siteOptionsFile( repo, 'acme' ) ), { recursive: true } );
		fs.writeFileSync( siteOptionsFile( repo, 'acme' ), JSON.stringify( committed ) );
	}
	return { repo, run };
}

// A WordPress holding options: runPhp answers the stored-value read, wp answers `option update ... --format=json`.
function fakeSite( options = {} ) {
	const s = { options: { ...options }, calls: [], reads: 0 };
	s.runPhp = ( php ) => {
		s.reads++;
		const names = [ ...php.matchAll( /'([a-z0-9_]+)'/g ) ].map( ( m ) => m[ 1 ] );
		return `\n${ JSON.stringify( Object.fromEntries( names.map( ( n ) => [ n, s.options[ n ] ?? null ] ) ) ) }`;
	};
	s.wp = ( args ) => {
		s.calls.push( args.join( ' ' ) );
		assert.deepEqual( [ args[ 0 ], args[ 1 ], args[ 4 ] ], [ 'option', 'update', '--format=json' ] );
		s.options[ args[ 2 ] ] = JSON.parse( args[ 3 ] );
		return 'Success: Updated option.';
	};
	return s;
}

const empty = () => ( { actions: [], options: [], notes: [], problems: [] } );

test( 'MUST FAIL: promoting a Fill run writes the client file, merges later runs over it, and a repeat changes nothing', () => {
	const { repo, run } = fixture();
	const first = promoteSiteOptions( { repo, client: 'acme', from: run } );
	assert.equal( first.changed, true );
	assert.deepEqual( readSiteOptions( repo, 'acme' ), { sgs_motion_settings: { records: [ 'route-fade-1' ], value: FADE.value } } );
	assert.equal( promoteSiteOptions( { repo, client: 'acme', from: path.join( run, 'site-options.json' ) } ).changed, false, 'the file form promotes too, and a repeat is a no-op' );
	fs.writeFileSync( path.join( run, 'site-options.json' ), JSON.stringify( { option: 'sgs_motion_settings', records: [ 'route-fade-2' ], value: { page_transition_duration: 500, smooth_scroll: true } } ) );
	const merged = readSiteOptions( repo, 'acme' ).sgs_motion_settings;
	const next = promoteSiteOptions( { repo, client: 'acme', from: run } ).options.sgs_motion_settings;
	assert.deepEqual( merged.records, [ 'route-fade-1' ] );
	assert.deepEqual( next.records, [ 'route-fade-1', 'route-fade-2' ] );
	assert.deepEqual( next.value, { ...FADE.value, page_transition_duration: 500, smooth_scroll: true }, 'the new keys win, the others stay' );
} );

test( 'MUST FAIL: a Fill file that is missing, valueless, or carries a bad option name, key or nested value is refused', () => {
	const { repo } = fixture();
	assert.throws( () => promoteSiteOptions( { repo, client: 'acme', from: path.join( repo, 'nowhere' ) } ), /does not exist/ );
	for ( const [ fill, why ] of [
		[ { option: 'sgs_motion_settings', value: {} }, /no value object/ ],
		[ { option: 'sgs_motion_settings', value: [ 1 ] }, /no value object/ ],
		[ { option: "x'); evil(); ('", value: { a: 1 } }, /not a plain option name/ ],
		[ { option: 'sgs_motion_settings', value: { 'a b': 1 } }, /not a plain key/ ],
		[ { option: 'sgs_motion_settings', value: { a: { nested: 1 } } }, /not a plain key/ ],
	] ) {
		const f = fixture( { fill } );
		assert.throws( () => promoteSiteOptions( { repo: f.repo, client: 'acme', from: f.run } ), why );
	}
} );

test( 'MUST FAIL: the plan lists each changed key with its stored and wanted value, and keeps the keys the draft does not set', () => {
	const desired = { sgs_motion_settings: { records: [], value: FADE.value } };
	const site = fakeSite( { sgs_motion_settings: { smooth_scroll: true, page_transition_duration: 0, page_transition_style: 'fade' } } );
	const plan = planSiteOptions( { desired, stored: readStoredOptions( site.runPhp, desired ) } );
	assert.deepEqual( plan.options.map( ( o ) => [ o.name, o.before, o.after ] ), [
		[ 'sgs_motion_settings[page_transitions]', '(unset)', 'true' ],
		[ 'sgs_motion_settings[page_transition_duration]', '0', '350' ],
		[ 'sgs_motion_settings[page_transition_easing]', '(unset)', '"ease-out"' ],
	], 'page_transition_style already fade: no row' );
	assert.equal( plan.actions.length, 1 );
	assert.deepEqual( plan.actions[ 0 ].value, { smooth_scroll: true, page_transition_duration: 350, page_transition_style: 'fade', page_transitions: true, page_transition_easing: 'ease-out' } );
	assert.equal( plan.actions[ 0 ].phase, 'site' );
} );

test( 'MUST FAIL: a site that holds no such option plans every key; a stored value that already holds them plans nothing', () => {
	const desired = { sgs_motion_settings: { records: [], value: FADE.value } };
	const none = planSiteOptions( { desired, stored: readStoredOptions( fakeSite().runPhp, desired ) } );
	assert.deepEqual( [ none.actions.length, none.options.length ], [ 1, 4 ] );
	const done = planSiteOptions( { desired, stored: { sgs_motion_settings: { ...FADE.value, extra: 1 } } } );
	assert.deepEqual( [ done.actions.length, done.options.length ], [ 0, 0 ] );
} );

test( 'MUST FAIL: planning reads the site and writes nothing; the writer sets the option once and a second plan is empty', () => {
	const { repo, run } = fixture();
	promoteSiteOptions( { repo, client: 'acme', from: run } );
	const site = fakeSite();
	const plan = withSiteOptions( empty(), { repo, client: 'acme', runPhp: site.runPhp } );
	assert.deepEqual( [ plan.actions.length, site.calls.length ], [ 1, 0 ], 'a dry run changes nothing on the site' );
	assert.deepEqual( plan.options.map( ( o ) => o.name ), Object.keys( FADE.value ).map( ( k ) => `sgs_motion_settings[${ k }]` ), 'the option table lists every key' );
	const ran = applyPhase( plan.actions, 'site', { wp: site.wp } );
	assert.equal( ran, 1 );
	assert.deepEqual( site.calls, [ `option update sgs_motion_settings ${ JSON.stringify( FADE.value ) } --format=json` ] );
	const again = withSiteOptions( empty(), { repo, client: 'acme', runPhp: site.runPhp } );
	assert.deepEqual( [ again.actions.length, again.options.length ], [ 0, 0 ] );
	assert.equal( applyPhase( again.actions, 'site', { wp: site.wp } ), 0 );
	assert.equal( site.calls.length, 1, 'the second run writes nothing' );
} );

test( 'MUST FAIL: a client with no site-options.json adds nothing and never reads the site', () => {
	const { repo } = fixture( { fill: null } );
	const site = fakeSite();
	const plan = withSiteOptions( empty(), { repo, client: 'acme', runPhp: site.runPhp } );
	assert.deepEqual( [ plan.actions.length, plan.options.length, site.reads ], [ 0, 0, 0 ] );
} );

test( 'MUST FAIL: a stored value that is not an array of settings is noted and replaced by the draft\'s keys', () => {
	const desired = { sgs_motion_settings: { records: [], value: { page_transitions: true } } };
	const plan = planSiteOptions( { desired, stored: { sgs_motion_settings: 'off' } } );
	assert.match( plan.notes[ 0 ], /holds "off", not an array of settings/ );
	assert.deepEqual( plan.actions[ 0 ].value, { page_transitions: true } );
	assert.deepEqual( plan.options.map( ( o ) => o.before ), [ '(unset)' ] );
} );

test( 'MUST FAIL: the PHP read only ever names plain option names', () => {
	assert.match( optionsPhp( [ 'sgs_motion_settings', 'blogname' ] ), /array\( 'sgs_motion_settings', 'blogname' \)/ );
	assert.throws( () => optionsPhp( [ "a'); evil(); ('" ] ), /not a plain option name/ );
} );
