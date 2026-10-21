// Spec 48 FR-48-7, lib/read-template.mjs, lib/read-logic.mjs, lib/read-logic-conditions.mjs, lib/read-surfaces.mjs and
// lib/fact-record.mjs: the fixture export (tests/fixtures/read-facts/export/: a header with a width-gated call to action,
// a drawer under a breakpoint token, a loop, a select, an import the entry never mounts, and a surfaces.json with a
// header and a drawer part) is read in the sandbox at 375, 768 and 1440 and joined into one record. Each MUST FAIL test
// names the reader whose removal turns it red (tests/fixtures/read-facts/mutations.json holds the mutations,
// tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { draftSources } from '../lib/intake-census-template.mjs';
import { splitDecls } from '../lib/read-template.mjs';
import { buildFactRecord, writeFacts, loadFacts, factsFile, instancesOf, factsProblems } from '../lib/fact-record.mjs';
import { StaleRecordError } from '../lib/freshness.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const EXPORT = path.join( HERE, 'fixtures', 'read-facts', 'export' );
const ENTRY = 'Home.dc.html';
const temps = [];
const temp = ( prefix ) => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), prefix ) );
	temps.push( d );
	return d;
};
let record;
let inventories;
let harPath;
let sources;

test.before( async () => {
	const { manifestHash } = recheckManifest( EXPORT );
	harPath = path.join( os.tmpdir(), 'sgs-read-facts-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: EXPORT, index: ENTRY, harPath } );
	}
	sources = await draftSources( { folder: EXPORT, entry: ENTRY, harPath } );
	inventories = temp( 'read-facts-inv-' );
	fs.writeFileSync( path.join( inventories, 'header.json' ), JSON.stringify( { elements: [ { key: 'Home/1#0', template: 'Home', tpl: '1' }, { key: 'Home/7#0', template: 'Home', tpl: '7' }, { key: 'Home/7#1', template: 'Home', tpl: '7' } ] } ) );
	record = ( await buildFactRecord( { folder: EXPORT, client: 'fixture', entry: ENTRY, harPath, sources, inventoriesDir: inventories } ) ).record;
} );

test.after( () => temps.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );

const el = ( key ) => record.elements[ key ];
const answer = ( key, hole, w ) => el( key ).logic.holes[ hole ][ w ].v.map( ( s ) => s.v );

test( 'MUST FAIL (template reader): an element gets its tag, real tag, every attribute, declarations, holes, parent chain and fingerprint', () => {
	const a = el( 'Home/1' ).template;
	assert.equal( a.realTag, 'a' );
	assert.deepEqual( { tabindex: a.attrs.tabindex, href: a.attrs.href, 'aria-current': a.attrs[ 'aria-current' ] }, { tabindex: '0', href: '/', 'aria-current': '{{ cur }}' } );
	assert.deepEqual( a.style.static, [ [ 'width', 'auto' ] ], 'the static declaration is a longhand pair; the hole is not one' );
	assert.deepEqual( a.holes.map( ( h ) => [ h.where, h.expr, h.path ] ), [ [ 'text', 'title', 'title' ], [ 'attr:ref', 'setLogo', 'setLogo' ], [ 'attr:aria-current', 'cur', 'cur' ], [ 'style:height', 'logoH', 'logoH' ] ] );
	assert.equal( a.ref, '{{ setLogo }}' );
	assert.deepEqual( [ a.parent, a.parentChain ], [ 'Home/0', [ 'Home/0' ] ] );
	const header = el( 'Home/0' ).template;
	assert.equal( header.hooks[ 'data-head' ], 'top' );
	assert.equal( header.attrs.role, 'banner' );
	assert.deepEqual( header.style.static.map( ( [ n ] ) => n ).sort(), [ 'display', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top' ], 'shorthands are expanded to longhands' );
	assert.deepEqual( header.pseudo.hover.static, [ [ 'opacity', '0.8' ] ] );
	assert.deepEqual( header.pseudo.hover.holes, [ 'style-hover:margin#1' ] );
	assert.deepEqual( el( 'Home/0' ).fingerprint.parentTags, [] );
	assert.deepEqual( el( 'Home/1' ).fingerprint.parentTags, [ 'header' ] );
	assert.equal( el( 'Home/1' ).fingerprint.tag, 'a' );
} );

test( 'MUST FAIL (template reader): required, events, loops, ifs, imports and stamped tags are read', () => {
	const button = el( 'Home/3' ).template;
	assert.ok( 'required' in button.attrs );
	assert.deepEqual( button.events, [ { name: 'onClick', expr: 'go' } ] );
	assert.deepEqual( button.membership.scIf, [ { key: 'Home/2', value: '{{ showCta }}' } ] );
	const item = el( 'Home/7' ).template;
	assert.deepEqual( item.membership.scFor, [ { key: 'Home/6', list: '{{ links }}', as: 'item' } ] );
	assert.deepEqual( item.membership.scIf.map( ( i ) => i.key ), [ 'Home/4' ] );
	assert.deepEqual( item.parentChain, [ 'Home/6', 'Home/5', 'Home/4', 'Home/0' ] );
	assert.equal( item.realParent, 'Home/5', 'the real parent skips the sc-for' );
	assert.equal( el( 'Home/6' ).template.own.as, 'item' );
	assert.deepEqual( [ el( 'Home/8' ).template.tag, el( 'Home/8' ).template.realTag ], [ 'sc-raw-select', 'select' ] );
	assert.equal( el( 'Home/11' ).template.own.name, 'Child' );
	assert.deepEqual( el( 'Home/11' ).template.membership.scIf.map( ( i ) => i.key ), [ 'Home/10' ] );
	assert.ok( el( 'Child/1' ), 'the import the entry never mounts is read too' );
} );

test( 'MUST FAIL (logic reader): a hole gets the value of each width, the elements a width does not render included', () => {
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => answer( 'Home/1', 'style:height#3', w )[ 0 ] ), [ '40px', '50px', '60px' ], 'the width is set by resizing the viewport' );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => answer( 'Home/0', 'style:gap#0', w )[ 0 ] ), [ '8px', '24px', '24px' ] );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => answer( 'Home/2', 'attr:value#0', w )[ 0 ] ), [ false, false, true ], 'the call to action renders only at 1440' );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => answer( 'Home/3', 'text#0', w )[ 0 ] ), [ 'Call', 'Call', 'Call us now' ], 'the button is not rendered at 375, and still has its 375 value' );
	assert.deepEqual( answer( 'Home/7', 'text#0', 375 ), [ 'One', 'Two' ], 'a loop hole gives the value of each item' );
	assert.equal( el( 'Home/7' ).logic.holes[ 'text#0' ][ 375 ].loop, true );
	assert.deepEqual( answer( 'Child/1', 'text#0', 1440 ), [ 'Child' ], 'a component the entry never mounts is read in its own file' );
} );

test( 'MUST FAIL (logic reader): a hole that cannot resolve is a gap entry and stays in the record', () => {
	const bad = el( 'Child/1' ).logic.holes[ 'attr:title#1' ];
	assert.ok( [ 375, 768, 1440 ].every( ( w ) => /^unexpected/.test( bad[ w ].err ) ) );
	assert.equal( record.gaps.filter( ( g ) => 'hole' === g.construct ).length, 1 );
	assert.match( record.gaps[ 0 ].draftId, /^Child\/1 attr:title#1$/ );
	assert.deepEqual( record.counts.perWidth[ 375 ], { resolved: record.counts.holes - 1, absent: 0, unresolved: 1 } );
} );

test( 'MUST FAIL (width conditions): an sc-if on a width comparison is a width condition; a breakpoint token carries its range; a constant has none', () => {
	assert.deepEqual( el( 'Home/2' ).logic.width, { w: '>=', n: 1260 } );
	assert.deepEqual( el( 'Home/4' ).logic.width, { bp: 'm', is: true, when: { w: '<', n: 768 } } );
	assert.equal( el( 'Home/10' ).logic.width, null );
	assert.equal( record.counts.widthConditions, 2 );
} );

test( 'MUST FAIL (surfaces reader): a surface marks its subtree, a part root marks its own and names the surface it is part of', () => {
	assert.deepEqual( el( 'Home/3' ).surfaces.map( ( s ) => [ s.id, s.root, s.states.map( ( st ) => st.name ) ] ), [ [ 'S-01', false, [ 'call to action' ] ] ] );
	assert.deepEqual( el( 'Home/5' ).surfaces.map( ( s ) => [ s.id, s.kind, s.parent, s.root ] ), [ [ 'S-01', 'header', null, false ], [ 'S-02', 'drawer', 'S-01', true ] ] );
	assert.deepEqual( el( 'Home/7' ).surfaces.map( ( s ) => [ s.id, s.parent, s.root, s.states.map( ( st ) => st.name ) ] ), [ [ 'S-01', null, false, [] ], [ 'S-02', 'S-01', false, [ 'open' ] ] ] );
	assert.deepEqual( record.surfaces[ 'S-01' ].parts, [ { id: 'S-02', kind: 'drawer', roots: [ 'Home/5' ] } ] );
	assert.deepEqual( el( 'Home/8' ).surfaces.map( ( s ) => s.id ), [ 'S-01' ], 'the select sits in the header only' );
	assert.deepEqual( el( 'Child/0' ).surfaces, [], 'an element outside every record has no surface' );
} );

test( 'MUST FAIL (instance keys): the saved inventories give each element its instance keys and state; a stale inventory is not used', () => {
	assert.deepEqual( el( 'Home/7' ).instances, [ { key: 'Home/7#0', state: 'header' }, { key: 'Home/7#1', state: 'header' } ] );
	assert.deepEqual( el( 'Home/0' ).instances, [] );
	const dir = temp( 'read-facts-stale-' );
	const stale = { elements: [ { key: 'Home/1#0', template: 'Home', tpl: '1' } ], sources: { files: { 'Home.dc.html': '0'.repeat( 64 ) }, route: { commit: null } } };
	fs.writeFileSync( path.join( dir, 'old.json' ), JSON.stringify( stale ) );
	const got = instancesOf( { inventoriesDir: dir, folder: EXPORT } );
	assert.equal( got.byTemplate.size, 0 );
	assert.match( got.gaps[ 0 ].error, /stale/ );
} );

test( 'MUST FAIL (freshness): loadFacts refuses a record whose input changed, and one that does not validate', () => {
	const repo = temp( 'read-facts-repo-' );
	const handoff = path.join( repo, 'sites', 'fixture', 'handoff' );
	fs.cpSync( EXPORT, handoff, { recursive: true } );
	writeFacts( factsFile( repo, 'fixture' ), record );
	assert.equal( loadFacts( 'fixture', { repo } ).counts.elements, record.counts.elements );
	fs.appendFileSync( path.join( handoff, 'Home.dc.html' ), '\n<!-- edited -->\n' );
	assert.throws( () => loadFacts( 'fixture', { repo } ), ( e ) => e instanceof StaleRecordError && /Home\.dc\.html changed/.test( e.message ) );
	assert.throws( () => loadFacts( 'other', { repo } ), /is missing: run intake/ );
} );

test( 'MUST FAIL (schema): writeFacts refuses a record that does not validate and writes nothing', () => {
	const file = path.join( temp( 'read-facts-bad-' ), 'facts.json' );
	const broken = { ...record, elements: { 'Home/0': { template: {}, logic: {}, surfaces: [], instances: [], fingerprint: {} } } };
	assert.ok( factsProblems( broken ).length > 0 );
	assert.throws( () => writeFacts( file, broken ), /does not validate/ );
	assert.equal( fs.existsSync( file ), false );
	assert.deepEqual( factsProblems( record ), [] );
} );

test( 'splitDecls splits on the semicolons outside parentheses, quotes and holes', () => {
	assert.deepEqual( splitDecls( 'background:url(data:image/png;base64,AAA);color:{{ a; b }};content:";"' ), [ [ 'background', 'url(data:image/png;base64,AAA)' ], [ 'color', '{{ a; b }}' ], [ 'content', '";"' ] ] );
} );
