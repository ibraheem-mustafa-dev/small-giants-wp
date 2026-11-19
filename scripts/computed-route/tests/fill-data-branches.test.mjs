// Fill reads the data branches the inventory read (lib/fill-data-branches.mjs, lib/fill-read.mjs::readDraft `branches`): on a
// planted draft run by the real draft runtime, an element shown only for some data is read with its own computed style when
// the inventory marks its branch, and the resting read is unchanged when it marks none. Tests marked MUST FAIL fail without
// the code they name.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { branchesShown, showBranches } from '../lib/fill-data-branches.mjs';
import { readDraft } from '../lib/fill-read.mjs';
import { skeletonNodes } from '../lib/fill-skeleton.mjs';
import { serveDraft } from '../lib/draft.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
// The draft runtime a client's handoff ships (any handoff's support.js runs a planted draft the same way).
const RUNTIME = path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff', 'support.js' );

const DRAFT = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><script src="./support.js"></script></head><body>
<x-dc>
<main style="padding:20px">
<h1 style="color:rgb(10, 20, 30)">Thanks</h1>
<sc-if value="{{ hasNote }}"><div style="color:rgb(168, 64, 79);font-size:28px;padding:30px 24px">{{ note }}</div></sc-if>
<sc-if value="{{ noNote }}"><p style="color:rgb(0, 128, 0)">Send one</p></sc-if>
</main>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic {
  renderVals() {
    const o = window.STORE ? window.STORE.order() : { gift: { on: false } };
    const note = o.gift && o.gift.on && o.gift.message;
    return { hasNote: !!note, noNote: !note, note: note || '' };
  }
}
</script>
</body></html>`;

// The runtime loads React from unpkg; offline, Fill's read answers those requests from local files (readDraft `mirror`), here
// the bodies the client's intake replay recorded (sites/<client>/build/intake/replay/*.har, gitignored: copied, never fetched).
const REPLAY = path.join( REPO, 'sites', 'mamas-munches-redesign', 'build', 'intake', 'replay' );
function runtimeMirror( dir ) {
	const har = fs.existsSync( REPLAY ) ? fs.readdirSync( REPLAY ).find( ( f ) => f.endsWith( '.har' ) ) : null;
	const mirror = {};
	for ( const e of har ? JSON.parse( fs.readFileSync( path.join( REPLAY, har ), 'utf8' ) ).log.entries : [] ) {
		if ( /^https:\/\/unpkg\.com\//.test( e.request.url ) && e.response?.content?.text ) {
			const file = path.join( dir, `${ Object.keys( mirror ).length }.js` );
			fs.writeFileSync( file, 'base64' === e.response.content.encoding ? Buffer.from( e.response.content.text, 'base64' ) : e.response.content.text );
			mirror[ e.request.url ] = file;
		}
	}
	return mirror;
}

let served;
let mirror = {};
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-data-branches-' ) );
	fs.writeFileSync( path.join( dir, 'Page.dc.html' ), DRAFT );
	fs.copyFileSync( RUNTIME, path.join( dir, 'support.js' ) );
	mirror = runtimeMirror( dir );
	served = await serveDraft( dir, { index: 'Page.dc.html' } );
} );
after( async () => served && served.close() );

// The skeleton of the planted page as the proposer names its elements (`Root/<tpl>#<copy>`: tpl 0 is the main).
const node = ( name, tpl, innerBlocks = [] ) => ( { name, attributes: {}, draftRef: { tpl: `Root/${ tpl }#0` }, innerBlocks } );
const SKELETON = [ node( 'sgs/container', 0, [ node( 'sgs/heading', 1 ), node( 'sgs/text', 3 ), node( 'sgs/text', 5 ) ] ) ];
const INVENTORY = { elements: [ { key: 'Root/0#0' }, { key: 'Root/1#0' }, { key: 'Root/3#0', branch: { component: 'Page', hosts: [ 'Page', 'Root' ], keys: { note: 'note', hasNote: true } } }, { key: 'Root/5#0' } ] };

test( 'MUST FAIL: the patches to force come from the inventory\'s branch marks, merged per host list', () => {
	assert.deepEqual( branchesShown( INVENTORY ), [ { hosts: [ 'Page', 'Root' ], keys: { note: 'note', hasNote: true } } ] );
	const two = { elements: [ ...INVENTORY.elements, { key: 'Root/9#0', branch: { component: 'Page', hosts: [ 'Page', 'Root' ], keys: { hasAcct: true } } }, { key: 'Root/2#0', branch: { component: 'Card', hosts: [ 'Card' ], keys: { open: true } } } ] };
	assert.deepEqual( branchesShown( two ), [ { hosts: [ 'Page', 'Root' ], keys: { note: 'note', hasNote: true, hasAcct: true } }, { hosts: [ 'Card' ], keys: { open: true } } ] );
	assert.deepEqual( branchesShown( { elements: [ { key: 'Root/1#0' } ] } ), [] );
	assert.deepEqual( branchesShown( null ), [] );
	assert.deepEqual( branchesShown( { elements: [ { key: 'Root/4#0', branch: { component: 'Page' } } ] } ), [] );
} );

test( 'MUST FAIL: a mark with no hosts (an inventory saved before the marks named them) is forced on the component and the served root host', async () => {
	// Mama's confirmation inventory as it was saved before the marks named their hosts: a mark holds the component and keys only.
	const saved = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'template-piece-order', 'mamas-confirmation-inventory.json' ), 'utf8' ) );
	const marks = saved.elements.filter( ( e ) => e.branch );
	assert.ok( marks.length && marks.every( ( e ) => undefined === e.branch.hosts ), 'the fixture is an inventory whose marks name no hosts' );
	const patches = branchesShown( saved );
	assert.deepEqual( patches.map( ( p ) => p.hosts ), [ [ 'Confirmation', 'Root' ] ] );
	// The served draft's page is the host named Root: that mounted logic gets the patch.
	const logic = { renderVals: () => ( { hasNote: false } ), setState() {} };
	globalThis.document = { querySelectorAll: () => [ { dataset: { scName: 'Root' }, __reactFiber$x: { stateNode: { logic, __name: 'Root' }, return: null } } ] };
	try {
		assert.equal( await showBranches( { evaluate: async ( fn, arg ) => fn( arg ) }, patches ), 1 );
		assert.equal( logic.renderVals().hasNote, true );
	} finally {
		delete globalThis.document;
	}
	// Negative control: a mark that names its hosts keeps exactly them.
	const named = { elements: [ { key: 'Root/2#0', branch: { component: 'Card', hosts: [ 'Card' ], keys: { open: true } } } ] };
	assert.deepEqual( branchesShown( named ), [ { hosts: [ 'Card' ], keys: { open: true } } ] );
} );

test( 'MUST FAIL: Fill reads a forced branch\'s element with its own computed style; with no branch the resting read is unchanged', async ( t ) => {
	if ( ! Object.keys( mirror ).length ) {
		t.skip( `no recorded runtime in ${ REPLAY } (copy the client's intake replay there to run this offline)` );
		return;
	}
	const nodes = skeletonNodes( SKELETON );
	const read = ( branches ) => readDraft( { url: served.url, nodes, sweep: false, branches, mirror } );
	const rest = await read( [] );
	const shown = await read( branchesShown( INVENTORY ) );
	const at = ( r, i ) => r.widths[ 1440 ]?.[ `${ i }:` ];
	// The gift note (node 2) is missing at rest and read when its branch is shown: its own colour, size and padding.
	assert.equal( at( rest, 2 )?.missing, true );
	assert.equal( at( shown, 2 ).styles.color, 'rgb(168, 64, 79)' );
	assert.equal( at( shown, 2 ).styles[ 'font-size' ], '28px' );
	assert.equal( at( shown, 2 ).styles[ 'padding-top' ], '30px' );
	// The opposite branch and the resting elements read the same either way.
	for ( const i of [ 1, 3 ] ) {
		assert.equal( at( rest, i ).styles.color, at( shown, i ).styles.color );
	}
	assert.equal( at( shown, 3 ).styles.color, 'rgb(0, 128, 0)' );
	// Negative control: showing nothing reaches nothing.
	assert.equal( await showBranches( { evaluate: async () => assert.fail( 'nothing to force' ) }, [] ), 0 );
} );
