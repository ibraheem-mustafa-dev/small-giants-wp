// FR-47-4 end to end (fill.mjs::fillSurface): a skeleton and a draft folder served by lib/draft.mjs go in, the outputs of
// step 5 come out, and the surface's own tree file, the ledger and the manifest are never written. Everything is local
// files and 127.0.0.1; no WordPress, no host.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { fillSurface, calibrationLoader } from '../fill.mjs';
import { lintConfig } from '../../parity/lib/lint.mjs';

const DRAFT = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
@keyframes rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
body { margin: 0; font-family: sans-serif }
main { display: flex; flex-direction: column; gap: 16px; padding: 24px; color: rgb(255, 255, 255); background: rgb(11, 43, 23) }
h1 { margin: 0; font-size: 32px; animation: rise 500ms linear 100ms both }
p { margin: 0 }
p.eyebrow { text-transform: uppercase; font-size: 12px }
p.lead { font-size: calc(10px + 1vw); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) }
p.lead a { color: inherit }
.card { margin-top: 10px }
@media (min-width: 768px) { .card { margin-top: 30px } }
</style></head><body><main>
<p class="eyebrow">About us</p>
<h1>Hello there</h1>
<p class="lead">Lead words <a href="/shop/">Shop now</a></p>
<div class="card"><p class="card-text">Card words</p></div>
</main></body></html>`;

const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const tiers = ( paint ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );
const CAL = {
	text: { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size', { forms: [ 'clamp' ] } ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), margin: setting( 'margin' ), textTransform: setting( 'text-transform' ), letterSpacing: setting( 'letter-spacing' ) }, discovered: {}, text: { text: { path: '', reachedAt: [ 375, 768, 1440 ] } }, link: { url: { path: '.sgs-text__a', attr: 'href' } } },
	heading: { block: 'sgs/heading', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ), margin: setting( 'margin' ) }, discovered: {}, text: { content: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	container: { block: 'sgs/container', elements: { '': tiers( DEFAULT ) }, settings: { gap: setting( 'gap' ), padding: setting( 'padding' ), margin: setting( 'margin' ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), backgroundColour: setting( 'background-color', { forms: [ 'hex', 'slug' ] } ) }, discovered: {} },
};

const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [
	{ name: 'sgs/text', draftRef: 'p.eyebrow', attributes: {} },
	{ name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } },
	{ name: 'sgs/text', draftRef: 'p.lead', draftSlots: { '.sgs-text__a': 'a' }, attributes: {}, handover: [ { owner: 'content-page', kind: 'link', slot: '.sgs-text__a', detail: 'the shop page lives outside the tree' } ] },
	{ name: 'sgs/container', draftRef: '.card', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: 'p.card-text', attributes: {} } ] },
] } ];

let repo;
let work;
let treeFile;
let result;
before( async () => {
	work = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-surface-' ) );
	repo = path.join( work, 'repo' );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { tree: 'home.tree.json', states: { opening: null } } } ) );
	treeFile = path.join( build, 'home.tree.json' );
	fs.writeFileSync( treeFile, '[{"name":"sgs/container","attributes":{"committed":true}}]\n' );
	fs.writeFileSync( path.join( build, 'qa', 'divergences.json' ), '[]\n' );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [ { slug: 'ink', color: '#141414' }, { slug: 'forest', color: '#0B2B17' } ] } } } ) );
	const cache = path.join( work, 'cache' );
	fs.mkdirSync( cache );
	for ( const [ name, cal ] of Object.entries( CAL ) ) {
		fs.writeFileSync( path.join( cache, `${ name }.json` ), JSON.stringify( cal ) );
	}
	const draft = path.join( work, 'draft' );
	fs.mkdirSync( draft );
	fs.writeFileSync( path.join( draft, 'Home.dc.html' ), DRAFT );
	fs.writeFileSync( path.join( work, 'skeleton.json' ), JSON.stringify( SKELETON ) );
	result = await fillSurface( { repo, client: 'acme', surface: 'home', skeleton: path.join( work, 'skeleton.json' ), draftDir: draft, draftIndex: 'Home.dc.html', liveUrl: 'http://127.0.0.1:9/home/', out: path.join( work, 'out' ), cache } );
} );

const find = ( ...path_ ) => path_.reduce( ( n, i, k ) => ( 0 === k ? result.tree[ i ] : n.innerBlocks[ i ] ), null );

test( 'MUST FAIL: a skeleton carrying a style value, a missing client or both draft sources is refused before anything is read', async () => {
	const bad = path.join( work, 'bad.json' );
	fs.writeFileSync( bad, JSON.stringify( [ { name: 'sgs/text', draftRef: 'p', attributes: { textColour: 'ink' } } ] ) );
	await assert.rejects( fillSurface( { repo, client: 'acme', surface: 'home', skeleton: bad, draftUrl: 'http://127.0.0.1:1/', liveUrl: 'http://x/' } ), /skeleton is not valid \(R-47-10\)[\s\S]*carries style value textColour/ );
	await assert.rejects( fillSurface( { repo, surface: 'home', skeleton: bad, draftUrl: 'http://x/', liveUrl: 'http://x/' } ), /--client is required/ );
	await assert.rejects( fillSurface( { repo, client: 'acme', surface: 'home', skeleton: bad, liveUrl: 'http://x/' } ), /exactly one of --draft-url and --draft-dir/ );
	await assert.rejects( fillSurface( { repo, client: 'acme', surface: 'nope', skeleton: bad, draftUrl: 'http://x/', liveUrl: 'http://x/' } ), /no surface "nope"/ );
	fs.writeFileSync( bad, JSON.stringify( [ { name: 'sgs/text', draftRef: 'p', draftSlots: { '.x': { text: 5 } }, attributes: {} } ] ) );
	await assert.rejects( fillSurface( { repo, client: 'acme', surface: 'home', skeleton: bad, draftUrl: 'http://x/', liveUrl: 'http://x/' } ), /slot ".x"/ );
} );

test( 'every output of step 5 is written, and nothing else is: the committed tree, the ledger and the manifest are untouched', () => {
	const out = fs.readdirSync( path.join( work, 'out' ) ).sort();
	assert.deepEqual( out, [ 'breakpoints.json', 'fill-report.json', 'fill-report.md', 'filled.tree.json', 'handover.json', 'home.fill-base.mjs', 'home.fill.mjs', 'unmapped.json' ] );
	assert.equal( fs.readFileSync( treeFile, 'utf8' ), '[{"name":"sgs/container","attributes":{"committed":true}}]\n' );
	assert.equal( fs.readFileSync( path.join( repo, 'sites', 'acme', 'build', 'qa', 'divergences.json' ), 'utf8' ), '[]\n' );
	const onDisk = JSON.parse( fs.readFileSync( path.join( work, 'out', 'filled.tree.json' ), 'utf8' ) );
	assert.deepEqual( onDisk, result.tree );
} );

test( 'the filled tree carries a ref on every node, no draft keys, the draft\'s words, and values measured from the served draft', () => {
	assert.ok( ! JSON.stringify( result.tree ).match( /draftRef|draftSlots|handover/ ) );
	assert.deepEqual( [ find( 0 ), find( 0, 0 ), find( 0, 1 ), find( 0, 2 ), find( 0, 3 ), find( 0, 3, 0 ) ].map( ( n ) => n.attributes.className ), [ 0, 1, 2, 3, 4, 5 ].map( ( i ) => `cr-ref-home-${ i }` ) );
	assert.equal( find( 0, 0 ).attributes.text, 'About us' );
	assert.equal( find( 0, 1 ).attributes.content, 'Hello there' );
	assert.equal( find( 0, 0 ).attributes.textTransform, 'uppercase' );
	assert.equal( find( 0 ).attributes.textColour, '#FFFFFF' );
	assert.equal( find( 0 ).attributes.backgroundColour, 'forest', 'the draft\'s ground snaps to the site\'s palette token' );
	assert.equal( find( 0, 2 ).attributes.textColour, undefined, 'the heading inherits the container\'s white, so it repeats nothing' );
	assert.deepEqual( find( 0 ).attributes.gap, { desktop: '16px' }, 'equal rendered gaps: the parent holds the gap' );
} );

test( 'a fluid size is a clamp() where calibration lists clamp, and the stepped margin is per-tier', () => {
	assert.match( find( 0, 2 ).attributes.fontSize.desktop, /^clamp\(.*vw/ );
	assert.equal( result.fluid.find( ( f ) => 'cr-ref-home-3' === f.node && 'font-size' === f.prop ).written, 'clamp' );
	assert.deepEqual( [ find( 0, 3 ).attributes.margin.desktop.top, find( 0, 3 ).attributes.margin.mobile.top, find( 0, 3 ).attributes.margin.tablet ], [ '30px', '10px', undefined ], 'the card margin is 30px from the tablet boundary up (tablet shows the desktop value) and 10px on a phone' );
} );

test( 'UNMAPPED holds what no setting can paint, the declared handover is listed with its owner, the entrance is measured and listed', () => {
	const shadow = result.unmapped.find( ( u ) => 'box-shadow' === u.property );
	assert.equal( shadow.node, 'cr-ref-home-3' );
	assert.match( shadow.reason, /^no-setting: / );
	assert.ok( result.unmapped.every( ( u ) => u.property && undefined !== u.value && u.node && u.reason ), 'every row has property, value, node and reason' );
	assert.deepEqual( result.handover.map( ( h ) => [ h.owner, h.kind, h.node, h.slot, h.evidence.draft ] ), [ [ 'content-page', 'link', 'cr-ref-home-3', '.sgs-text__a', '/shop/' ] ] );
	const e = result.entrances.find( ( x ) => 'cr-ref-home-2' === x.node );
	assert.ok( Math.abs( e.measured.delayMs - 100 ) <= 80 && Math.abs( e.measured.durationMs - 500 ) <= 100 && Math.abs( e.measured.distancePx - 18 ) <= 1, JSON.stringify( e.measured ) );
	assert.ok( result.unmapped.some( ( u ) => 'entrance animation-duration' === u.property && 'cr-ref-home-2' === u.node ) );
} );

test( 'the 16px sweep logs the card margin step at the tablet boundary for a human, and writes no ledger entry', () => {
	const step = result.breakpoints.find( ( s ) => 'cr-ref-home-4' === s.node && 'margin-top' === s.prop );
	assert.deepEqual( [ step.from, step.to, step.at, step.boundary, step.onBoundary ], [ '10px', '30px', 768, 768, true ] );
	assert.equal( fs.readFileSync( path.join( repo, 'sites', 'acme', 'build', 'qa', 'divergences.json' ), 'utf8' ), '[]\n' );
} );

test( 'the report names its sections and the generated walker config is accepted by the walker\'s lint', async () => {
	const md = fs.readFileSync( path.join( work, 'out', 'fill-report.md' ), 'utf8' );
	for ( const h of [ '## UNMAPPED', '## Handover', '## Settings written', '## Spacing ownership', '## Fluid sizes', '## Breakpoint steps', '## Entrances', '## Divergence ledger', '## Token snaps', '## Notes' ] ) {
		assert.ok( md.includes( h ), h );
	}
	const cfg = ( await import( pathToFileURL( path.join( work, 'out', 'home.fill.mjs' ) ).href ) ).default;
	assert.deepEqual( lintConfig( cfg ), [] );
	assert.equal( cfg.refPrefix, 'cr-ref-' );
	assert.equal( path.resolve( path.join( work, 'out' ), cfg.divergences ), path.join( repo, 'sites', 'acme', 'build', 'qa', 'divergences.json' ), 'the ledger path resolves from the config file' );
	assert.ok( cfg.pairs.some( ( p ) => '.cr-ref-home-0' === p.live ) );
} );

test( 'calibrationLoader reads a cache directory and answers null for a block without a file', () => {
	const load = calibrationLoader( path.join( work, 'cache' ) );
	assert.equal( load( 'sgs/text' ).block, 'sgs/text' );
	assert.equal( load( 'sgs/nothing' ), null );
} );

// A skeleton that names its draft elements by tpl finder leaves <surface>.origin.json beside the tree (cr-ref to tpl key and
// fingerprint); the built tree itself carries none of it. The second copy of the same tpl number is the one it names.
test( 'a tpl-finder skeleton writes the origin map: cr-ref to tpl key, fingerprint; the filled tree carries no draft key', async () => {
	const repo2 = path.join( work, 'repo2' );
	const build = path.join( repo2, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { about: { tree: 'about.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( build, 'qa', 'divergences.json' ), '[]\n' );
	fs.copyFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), path.join( repo2, 'sites', 'acme', 'theme-snapshot.json' ) );
	const draft = path.join( work, 'draft2' );
	fs.mkdirSync( draft );
	fs.writeFileSync( path.join( draft, 'About.dc.html' ), '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}main{padding:20px}p{margin:0;font-size:20px}</style></head><body><div class="sc-host" data-sc-name="Root"><main data-dc-tpl="1"><p data-dc-tpl="2">First words</p><p data-dc-tpl="2">Second words</p></main></div></body></html>' );
	const fp = ( tag ) => ( { tag, cls: '', styleHash: '0' } );
	fs.writeFileSync( path.join( work, 'tpl-skeleton.json' ), JSON.stringify( [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, draftFingerprint: fp( 'main' ), attributes: { tagName: 'main' }, innerBlocks: [ { name: 'sgs/text', draftRef: { tpl: 'Root/2#1' }, draftFingerprint: fp( 'p' ), attributes: { text: 'Second words' } } ] } ] ) );
	const r = await fillSurface( { repo: repo2, client: 'acme', surface: 'about', skeleton: path.join( work, 'tpl-skeleton.json' ), draftDir: draft, draftIndex: 'About.dc.html', liveUrl: 'http://127.0.0.1:9/about/', out: path.join( work, 'out2' ), cache: path.join( work, 'cache' ), sweep: false } );
	const origin = JSON.parse( fs.readFileSync( path.join( build, 'about.origin.json' ), 'utf8' ) );
	assert.deepEqual( Object.keys( origin ), [ 'cr-ref-about-0', 'cr-ref-about-1' ] );
	assert.deepEqual( origin[ 'cr-ref-about-1' ], { tpl: 'Root/2#1', fingerprint: { tag: 'p', cls: '', styleHash: '0' } } );
	assert.ok( ! /draftFingerprint|draftRef|"tpl"/.test( JSON.stringify( r.tree ) ) );
	assert.ok( ! fs.existsSync( path.join( path.dirname( treeFile ), 'home.origin.json' ) ), 'a skeleton with no tpl finder leaves no origin file' );
} );
