// The menu's intent delay from the draft's open handler, and the linear stagger of a grid. Run: node --test tests/apply-intent.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { loadDraftSource, openDelayOf } from '../lib/apply-intent.mjs';
import { motionItem } from '../lib/apply-drawer-core.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { openDb } from '../lib/db.mjs';

const REPO = fileURLToPath( new URL( '../../../', import.meta.url ) );
const db = openDb();
const at = ( f ) => ( { 1440: f, 768: f, 375: f } );
const target = { ref: 'cr-ref-header-1', key: 'cr-ref-header-1', tpl: 'Root/45#0', owns: [] };
const run = ( clientData, saved = {} ) => chrome.decide( { block: 'sgs/nav-bar-menu', db, saved, draft: at( null ), live: at( null ), aux: {}, recordsIndex: new Map(), clientData, target } ).filter( ( i ) => 'submenuIntentDelay' === i.prop );

test( 'the draft that opens a panel on enter, with no timer, gives an intent delay of 0', () => {
	const source = loadDraftSource( REPO, 'indus-foods' );
	assert.deepEqual( openDelayOf( source ), { ms: 0, via: 'openItem' } );
	const [ item ] = run( { draftSource: source } );
	assert.deepEqual( item.writes, [ { attr: 'submenuIntentDelay', value: 0 } ] );
	assert.equal( run( { draftSource: source }, { submenuIntentDelay: 0 } )[ 0 ].status, 'equal' );
} );

const draft = ( open ) => `<button onMouseEnter="{{ item.onEnter }}" onFocus="{{ item.onEnter }}">x</button>\n  openItem(i) {\n${ open }\n  }\n  onEnter: () => this.openItem(i),`;

test( 'negative control: a draft whose handler waits on a timer gives that delay; no handler gives nothing', () => {
	assert.deepEqual( openDelayOf( draft( 'this._t = setTimeout(() => this.setState({ active: i }), 120);' ) ), { ms: 120, via: 'openItem' } );
	assert.equal( openDelayOf( '<div>no menu</div>' ), null );
	assert.deepEqual( run( {} ), [] );
} );

test( 'a draft stagger that runs across a grid is written as one sequence, never restarting per row', () => {
	const schema = loadMotionSchema();
	const item = motionItem( { saved: {}, parts: { root: { entrance: { base: { trigger: 'open', values: { from: { opacity: 0 }, duration: 300 } } } } }, stagger: { apply: true, offset: 0, step: 26, cap: 320, perRow: false }, schema, prop: 'open entrance', why: 'x' } );
	assert.equal( item.status, 'op', JSON.stringify( item ) );
	assert.equal( item.writes[ 0 ].value.stagger.perRow, false );
} );
