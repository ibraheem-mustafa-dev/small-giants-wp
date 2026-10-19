// Spec 48 FR-48-8 (lib/fill-declared.mjs, lib/fill-confirm.mjs): Fill reads what the draft's code declares on each
// element beyond its own property list, takes a used-value property only from its declared value, and keeps a confirm
// record (FR-48-36) for every value it writes: declared against rendered, with the tolerance its type takes and the
// verdict.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extraProps, usedValueDraft, CSS_WIDE } from '../lib/fill-declared.mjs';
import { compareDR, propertyType, draftIdOf, defectIndex, verdictOf, confirmRecords } from '../lib/fill-confirm.mjs';
import { fillSurface } from '../fill.mjs';
import { PROPS } from '../lib/fill-read.mjs';
import { splitCalibration, writeSlotMap, writePaint } from '../lib/cache.mjs';

test( 'MUST FAIL: extraProps keeps what the code declares beyond the list, leaving out motion timings and CSS-wide keywords', () => {
	const declared = { color: 'red', position: 'sticky', height: '42px', 'transition-duration': '0.3s', animation: 'x 1s', 'background-clip': 'initial', cursor: 'pointer', top: 'unset' };
	assert.deepEqual( extraProps( declared, [ 'color' ] ), { position: 'sticky', height: '42px', cursor: 'pointer' } );
	assert.deepEqual( extraProps( null, [] ), {} );
	assert.ok( CSS_WIDE.test( 'revert-layer' ) && ! CSS_WIDE.test( 'initially' ) );
} );

test( 'MUST FAIL: a used-value property takes only a plain declared length or percentage, never a keyword or a computed expression', () => {
	assert.equal( usedValueDraft( '42px' ), '42px' );
	assert.equal( usedValueDraft( '100%' ), '100%' );
	assert.equal( usedValueDraft( '0' ), '0' );
	assert.equal( usedValueDraft( 'auto' ), null );
	assert.equal( usedValueDraft( 'clamp(54px, 4.4vw, 66px)' ), null );
	assert.equal( usedValueDraft( undefined ), null );
} );

test( 'MUST FAIL: compareDR judges each type with its own tolerance', () => {
	assert.equal( compareDR( 'color', '#ff0000', 'rgb(255, 0, 0)' ).dr, 'agree' );
	assert.equal( compareDR( 'color', '#ff0000', 'rgb(250, 0, 0)' ).dr, 'agree', 'within ΔE 2' );
	assert.equal( compareDR( 'color', '#ff0000', 'rgb(0, 0, 255)' ).dr, 'disagree' );
	assert.equal( compareDR( 'color', 'rgba(0,0,0,0.5)', 'rgba(0, 0, 0, 0.55)' ).dr, 'disagree', 'alpha beyond 0.02' );
	assert.equal( compareDR( 'padding-top', '1.5em', '24px', 16 ).dr, 'agree' );
	assert.equal( compareDR( 'padding-top', '10px', '11px' ).dr, 'disagree', 'beyond 0.5px' );
	assert.equal( compareDR( 'font-family', '"Inter", sans-serif', 'Inter, sans-serif' ).dr, 'agree' );
	assert.equal( compareDR( 'font-weight', 'bold', '700' ).dr, 'agree' );
	assert.equal( compareDR( 'font-weight', '600', '700' ).dr, 'disagree' );
	assert.equal( compareDR( 'line-height', '1.5', '24px', 16 ).dr, 'agree' );
	assert.equal( compareDR( 'transform', 'translateY(-2px)', 'matrix(1, 0, 0, 1, 0, -2)' ).dr, 'agree' );
	assert.equal( compareDR( 'transform', 'translateY(-2px)', 'matrix(1, 0, 0, 1, 0, -3)' ).dr, 'disagree' );
	assert.equal( compareDR( 'transition-duration', '0.3s', '300ms' ).dr, 'agree' );
	assert.equal( compareDR( 'position', 'sticky', 'sticky' ).dr, 'agree' );
	assert.equal( compareDR( 'position', 'sticky', 'relative' ).dr, 'disagree' );
	assert.equal( compareDR( 'width', 'var(--w)', '300px' ).dr, 'runtime' );
	assert.equal( compareDR( 'height', 'clamp(54px, 4.4vw, 66px)', '63px' ).dr, 'runtime' );
	assert.equal( compareDR( 'width', '50%', '300px' ).dr, 'runtime' );
	assert.equal( compareDR( 'color', undefined, 'rgb(0, 0, 0)' ).dr, 'no-declared' );
	assert.equal( compareDR( 'color', 'white', 'rgb(255, 255, 255)' ).dr, 'unreadable', 'a named colour is not parsed here' );
	assert.equal( propertyType( 'border-top-color', 'red', 'red' ), 'colour' );
} );

test( 'MUST FAIL: the verdict follows FR-48-36: agree or run-time is confirmed, a disagreement the render wins unless intake lists it as a draft defect, no declared value is open', () => {
	assert.equal( verdictOf( 'agree', false ), 'confirmed' );
	assert.equal( verdictOf( 'runtime', false ), 'confirmed' );
	assert.equal( verdictOf( 'disagree', false ), 'render-wins' );
	assert.equal( verdictOf( 'disagree', true ), 'draft-defect' );
	assert.equal( verdictOf( 'no-declared', false ), 'open' );
	assert.equal( verdictOf( 'unreadable', false ), 'open' );
} );

test( 'MUST FAIL: draft IDs come from the tpl finder, the served root named by the entry component; defects index their declared properties', () => {
	assert.equal( draftIdOf( { tpl: 'Root/220#0' }, 'Home' ), 'Home:220' );
	assert.equal( draftIdOf( { tpl: 'Root>Card/12#3' }, 'Home' ), 'Card:12' );
	assert.equal( draftIdOf( 'h1', 'Home' ), null );
	const idx = defectIndex( [ { rows: [ { draftId: 'Home:87', evidence: { declared: 'transform:translateY(-6px);color:{{ c }}' } } ] }, { draftId: 'Home:9', evidence: { declared: 'opacity: 0' } } ] );
	assert.deepEqual( [ ...idx.get( 'Home:87' ) ], [ 'transform', 'color' ] );
	assert.deepEqual( [ ...idx.get( 'Home:9' ) ], [ 'opacity' ] );
} );

test( 'MUST FAIL: confirmRecords gives a record per written value and read width; a defect the intake lists turns a disagreement into draft-defect', () => {
	const nodes = [ { targets: [ { id: '0:', slot: '', finder: { tpl: 'Root/5#0' } } ] } ];
	const snap = ( color ) => ( { styles: { color, 'font-size': '16px' } } );
	const reads = { widths: { 375: { '0:': snap( 'rgb(0, 0, 255)' ) }, 768: { '0:': { missing: true } }, 1440: { '0:': snap( 'rgb(0, 0, 255)' ) } }, declared: { 375: { '0:': { color: 'red' } }, 1440: { '0:': { color: '#0000ff' } } } };
	const writes = [ { node: 'n', index: 0, block: 'sgs/text', slot: '', prop: 'color', attr: 'textColour', after: '#0000ff' }, { node: 'n', index: 0, block: 'sgs/text', slot: '', prop: '(switch)', attr: 'x' } ];
	const recs = confirmRecords( { writes, nodes, reads, rootComponent: 'Home' } );
	assert.deepEqual( recs.map( ( r ) => [ r.width, r.dr, r.verdict, r.draftId ] ), [ [ 375, 'unreadable', 'open', 'Home:5' ], [ 1440, 'agree', 'confirmed', 'Home:5' ] ] );
	reads.declared[ 375 ][ '0:' ].color = '#ff0000';
	assert.equal( confirmRecords( { writes, nodes, reads, rootComponent: 'Home' } )[ 0 ].verdict, 'render-wins' );
	assert.equal( confirmRecords( { writes, nodes, reads, rootComponent: 'Home', defects: new Map( [ [ 'Home:5', new Set( [ 'color' ] ) ] ] ) } )[ 0 ].verdict, 'draft-defect' );
	assert.equal( recs[ 0 ].renderedLive, null, 'the check fills the rendered-live value' );
} );

// End to end: a served draft whose heading's code says red while a held animation paints blue (code against render), and
// a paragraph whose code declares properties beyond Fill's list.
const DRAFT = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0 }
@keyframes paint { to { color: rgb(0, 0, 255) } }
h1 { margin: 0; font-size: 32px; color: rgb(255, 0, 0); animation: paint 1ms linear forwards }
p.note { margin: 0; position: relative; height: 2.625rem; cursor: pointer; background: rgb(255, 255, 255) }
</style></head><body><main><h1>Hello</h1><p class="note">Note</p></main></body></html>`;
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px' };
const tiers = ( paint ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );
const CAL = {
	text: { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), margin: setting( 'margin' ) }, discovered: {}, text: { text: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	heading: { block: 'sgs/heading', elements: { '': tiers( DEFAULT ) }, settings: { textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), fontSize: setting( 'font-size' ), margin: setting( 'margin' ) }, discovered: {}, text: { content: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	container: { block: 'sgs/container', elements: { '': tiers( DEFAULT ) }, settings: { margin: setting( 'margin' ) }, discovered: {} },
};
const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } }, { name: 'sgs/text', draftRef: 'p.note', attributes: {} } ] } ];

let result;
before( async () => {
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-declared-' ) );
	const repo = path.join( work, 'repo' );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: 'acme-test', tree: 'home.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( build, 'home.tree.json' ), '[]\n' );
	fs.writeFileSync( path.join( build, 'qa', 'divergences.json' ), '[]\n' );
	fs.writeFileSync( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [ { slug: 'ink', color: '#141414' } ] } } } ) );
	const cache = path.join( work, 'cache' );
	fs.mkdirSync( cache );
	for ( const cal of Object.values( CAL ) ) {
		const { slotMap, paint } = splitCalibration( { ...cal, site: 'acme-test' } );
		writeSlotMap( cache, cal.block, slotMap );
		writePaint( cache, 'acme-test', cal.block, paint );
	}
	const draft = path.join( work, 'draft' );
	fs.mkdirSync( draft );
	fs.writeFileSync( path.join( draft, 'Home.dc.html' ), DRAFT );
	fs.writeFileSync( path.join( work, 'skeleton.json' ), JSON.stringify( SKELETON ) );
	result = await fillSurface( { repo, client: 'acme', surface: 'home', skeleton: path.join( work, 'skeleton.json' ), draftDir: draft, draftIndex: 'Home.dc.html', liveUrl: 'http://127.0.0.1:9/home/', out: path.join( work, 'out' ), cache, sweep: false } );
} );

test( 'MUST FAIL, end to end: a code value its render overrides is written as rendered and reported render-wins, with a confirm record for each width', () => {
	const colour = result.writes.find( ( w ) => 'color' === w.prop && 'sgs/heading' === w.block );
	assert.ok( colour, 'the heading colour is written' );
	assert.match( JSON.stringify( colour.after ), /0000ff/i, 'the rendered blue, not the declared red' );
	const recs = result.confirm.filter( ( c ) => 'color' === c.property && 'sgs/heading' === c.block );
	assert.deepEqual( recs.map( ( c ) => [ c.width, c.verdict ] ), [ [ 375, 'render-wins' ], [ 768, 'render-wins' ], [ 1440, 'render-wins' ] ] );
	assert.equal( recs[ 0 ].declared, 'rgb(255, 0, 0)' );
	assert.ok( result.confirm.length >= result.writes.filter( ( w ) => ! w.prop.startsWith( '(' ) && 'motion' !== w.how ).length, 'every written value has records' );
} );

test( 'MUST FAIL, end to end: properties the code declares beyond Fill\'s list are read and named, a height from its declared value, never dropped', () => {
	const note = result.unmapped.filter( ( u ) => /sgs\/text/.test( u.block ) );
	const by = Object.fromEntries( note.map( ( u ) => [ u.property, u ] ) );
	assert.ok( by.position && /relative/.test( JSON.stringify( by.position.value ) ), JSON.stringify( note.map( ( u ) => u.property ) ) );
	assert.ok( by.cursor && /pointer/.test( JSON.stringify( by.cursor.value ) ) );
	assert.ok( by.height && /2\.625rem/.test( JSON.stringify( by.height.value ) ), `the declared height, not the rendered 42px: ${ JSON.stringify( by.height?.value ) }` );
	assert.ok( ! result.unmapped.some( ( u ) => ! PROPS.includes( u.property ) && /^(?:animation|transition)/.test( u.property ) ), 'declared motion timings belong to the motion writer' );
	assert.ok( ! note.some( ( u ) => /^background-(?:clip|origin|attachment|repeat)/.test( u.property ) ), 'a shorthand\'s implied resets are not authored values' );
	assert.ok( ! note.some( ( u ) => 'background' === u.property ), 'a shorthand is read through its longhands, never named itself' );
} );
