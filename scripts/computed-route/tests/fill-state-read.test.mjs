// The state reader (Spec 48 FR-48-81) in a real browser on local HTML: every state the framework vocabulary names is
// entered on the element that carries it, the target's declared look is read, and the page is left as it was.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { openDevtools, declaredValues } from '../../parity/lib/devtools.mjs';
import { tokenSource, readableRows, readStates, declaredDiff } from '../lib/fill-state-read.mjs';

const VOCAB = JSON.parse( readFileSync( new URL( '../../../plugins/sgs-blocks/scripts/data/states.json', import.meta.url ), 'utf8' ) ).states;
const RESOLVE = resolveFinder.toString();
const row = ( token ) => VOCAB.find( ( r ) => r.token === token );
const finds = ( token, sel ) => new RegExp( tokenSource( row( token ) ) ).test( sel );

test( 'tokens match their own selector forms only', () => {
	assert.ok( finds( ':focus', '.a:focus' ) );
	assert.ok( ! finds( ':focus', '.a:focus-visible' ), ':focus never matches :focus-visible' );
	assert.ok( finds( '[aria-current]', '.crumb[aria-current="page"]' ), 'a value-less attribute token matches any value' );
	assert.ok( finds( '[aria-expanded="true"]', ".b[aria-expanded='true'] .bar" ), 'either quote' );
	assert.ok( ! finds( '[aria-expanded="true"]', '.b[aria-expanded="false"]' ) );
	assert.ok( finds( '--active', '.sgs-tabs__tab--active' ) );
	assert.ok( ! finds( '--active', '.sgs-tabs__tab--active-x' ) );
	assert.ok( finds( 'is-active', 'li.is-active > a' ) );
	assert.ok( ! finds( 'is-active', 'li.is-active-ish' ) );
	assert.ok( finds( '[data-state', '.x[data-state="closed"]' ), 'an unclosed token is a prefix' );
	assert.ok( finds( 'is-effect-', '.is-effect-dim .item' ) );
	assert.equal( tokenSource( row( '(hover: none)' ) ), null, 'media rows are not selector tokens' );
} );

test( 'readable rows keep the reaches a page can enter plus the unreachable ones, never the media rows', () => {
	const reaches = new Set( readableRows( VOCAB ).map( ( r ) => r.reach ) );
	assert.ok( reaches.has( 'force-pseudo' ) && reaches.has( 'set-attribute' ) && reaches.has( 'unreachable' ) );
	assert.ok( ! reaches.has( 'emulate-media' ) );
} );

test( 'declaredDiff keeps only what the state changes', () => {
	assert.deepEqual( declaredDiff( { color: 'red', width: '10px' }, { color: 'blue', width: '10px', opacity: '0.5' } ), { color: 'blue', opacity: '0.5' } );
} );

const { chromium } = await import( 'playwright' );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const PAGE = `<!doctype html><html><head><style>
	.card .title { color: rgb(0, 0, 0) } .card:hover .title { color: rgb(200, 0, 0) }
	.burger .bar { display: block; width: 20px; height: 2px; transform: none } .burger[aria-expanded="true"] .bar { transform: rotate(45deg) }
	.tab { border-bottom: 2px solid rgb(0, 0, 0) } .tab.is-active { border-bottom-color: rgb(0, 0, 255) }
	details > summary { font-weight: 400 } details[open] > summary { font-weight: 700 }
	.go { color: rgb(1, 1, 1) } .go:not(:disabled) { color: rgb(2, 2, 2) }
	a.plain { color: rgb(0, 0, 0) } a.plain:visited { color: rgb(128, 0, 128) }
	#pop { background-color: rgb(9, 9, 9) } #pop:popover-open { background-color: rgb(1, 2, 3) }
	.item { outline: 2px solid rgb(0, 0, 0) } .item:focus-visible { outline-color: rgb(0, 128, 0) }
	.crumb { text-decoration-line: none } .crumbs [aria-current] { text-decoration-line: underline }
	.tab2 { color: rgb(0, 0, 0) } .tab2:not(.is-active):hover { color: rgb(0, 99, 0) }
</style></head><body>
	<button class="tab2">Other tab</button>
	<nav class="crumbs"><a class="crumb" href="#c">Crumb</a></nav>
	<div class="card"><h3 class="title">Title</h3></div>
	<button class="burger" aria-expanded="false"><span class="bar"></span></button>
	<button class="tab">Tab</button>
	<details><summary class="sum">More</summary>Body</details>
	<button class="go">Go</button>
	<a class="plain" href="#here">Link</a>
	<div id="pop" popover>Pop</div><button popovertarget="pop">Open</button>
	<a class="item" href="#x">Item</a>
</body></html>`;
const JOBS = [ '.title', '.bar', '.tab', '.sum', '.go', '.plain', '#pop', '.item', '.crumb', '.tab2' ].map( ( f ) => ( { id: f, finder: f } ) );

async function readPage( rows ) {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( PAGE );
	const cdp = await openDevtools( page );
	const rest = {};
	for ( const j of JOBS ) {
		rest[ j.id ] = await declaredValues( cdp, j.finder, RESOLVE, null );
	}
	const before = await page.evaluate( () => document.body.outerHTML );
	const result = await readStates( { page, cdp, jobs: JOBS, rows, rest, resolveSrc: RESOLVE } );
	const afterHtml = await page.evaluate( () => document.body.outerHTML );
	const popoverClosed = await page.evaluate( () => ! document.getElementById( 'pop' ).matches( ':popover-open' ) );
	await page.close();
	return { result, same: before === afterHtml && popoverClosed };
}
const lookOf = ( result, id, state ) => ( result.looks[ id ] || [] ).find( ( l ) => l.states.includes( state ) );

test( 'MUST FAIL WITHOUT THE READER: every state look is read from its host and the page is left as it was', async () => {
	const { result, same } = await readPage( VOCAB );
	assert.equal( lookOf( result, '.title', 'hover' )?.declared.color, 'rgb(200, 0, 0)', 'hover on the ancestor .card' );
	assert.equal( lookOf( result, '.bar', 'open' )?.declared.transform, 'rotate(45deg)', 'aria-expanded on the burger' );
	assert.equal( lookOf( result, '.tab', 'current' )?.declared[ 'border-bottom-color' ], 'rgb(0, 0, 255)', 'the is-active class' );
	assert.equal( lookOf( result, '.sum', 'open' )?.declared[ 'font-weight' ], '700', '[open] on the details' );
	assert.equal( lookOf( result, '#pop', 'open' )?.declared[ 'background-color' ], 'rgb(1, 2, 3)', 'showPopover()' );
	assert.equal( lookOf( result, '.item', 'focus' )?.declared[ 'outline-color' ], 'rgb(0, 128, 0)', 'forced :focus-visible' );
	assert.equal( lookOf( result, '.crumb', 'current' )?.declared[ 'text-decoration-line' ], 'underline', 'a token that is a whole compound leaves the universal selector' );
	assert.equal( lookOf( result, '.title', 'hover' )?.rendered.color, 'rgb(200, 0, 0)', 'the render confirms the declared look' );
	assert.equal( result.looks[ '.go' ], undefined, 'a token inside :not() is not a state to enter' );
	const tab2 = result.looks[ '.tab2' ] || [];
	assert.equal( tab2.length, 1, 'one look: the hover of an inactive tab' );
	assert.deepEqual( [ tab2[ 0 ].states, tab2[ 0 ].declared.color ], [ [ 'hover' ], 'rgb(0, 99, 0)' ], 'the negated is-active is kept in the selector, not entered' );
	assert.ok( result.unreached.some( ( u ) => '.plain' === u.id && /visited/.test( u.why ) ), ':visited is listed, never guessed' );
	assert.ok( same, 'every attribute, class, popover and marker is restored' );
} );

test( 'negative control: a state the vocabulary does not name is not read (the reader is vocabulary-driven)', async () => {
	const { result } = await readPage( VOCAB.filter( ( r ) => '[aria-expanded="true"]' !== r.token ) );
	assert.equal( lookOf( result, '.bar', 'open' ), undefined );
	assert.ok( lookOf( result, '.title', 'hover' ), 'the other states still read' );
} );
