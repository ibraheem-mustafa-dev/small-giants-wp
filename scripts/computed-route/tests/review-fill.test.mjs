// The wave review of Fill's writers (plan 2026-10-21-handoff-readers "The closing standard"): the form read-back reaches the
// report, a preset restores several writes to one attribute to the first value, a form field is rewritten when the node holds
// another value, the state-defect looks guard a missing read, the width gate takes only the collapse setting the skeleton rules
// name, the fact record speaks for the target the image is drawn by, the logo's per-width gap is matched by its code, the
// button icon's side is written from where the draft draws it, and a breakpoint snap enters the divergence ledger once.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { formWrites, formFieldWrites, formReadback } from '../lib/fill-form.mjs';
import { presetWrites } from '../lib/fill-preset.mjs';
import { addDefectLooks } from '../lib/fill-state-defect.mjs';
import { widthGateWrites } from '../lib/fill-width-gate.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { logoSizeWrites } from '../lib/fill-logo-size.mjs';
import { iconDecisions } from '../lib/fill-icon.mjs';
import { addEntries, load as loadLedger } from '../lib/ledger.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { readDraft } from '../lib/fill-read.mjs';

const attr = ( block, name, type, extra = {} ) => ( { block_slug: block, attr_name: name, attr_type: type, ...extra } );
const blocks = ( ...slugs ) => slugs.map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) );

test( 'MUST FAIL: the form read-back is run on every field block\'s writes and its problems reach the report; a placeholder from the schema field is the draft\'s', () => {
	const db = openDb( fixtureDb( { blocks: blocks( 'sgs/form-field-text' ), block_attributes: [ attr( 'sgs/form-field-text', 'placeholder', 'string', { default_value: '""' } ) ] } ) );
	const input = ( readback ) => formWrites( {
		nodes: [ { index: 0, name: 'sgs/form-field-text', targets: [ { id: '0:', slot: '' } ] } ], flat: [ { name: 'sgs/form-field-text', attributes: {}, ref: 'r0' } ], refOf: ( n ) => n.ref,
		reads: { widths: { 1440: { '0:': { form: { tag: 'input', type: 'text', placeholder: 'Your name' } } } } }, facts: null, db, ...( readback ? { readback } : {} ),
	} );
	const clean = input();
	assert.deepEqual( clean.writes.map( ( w ) => [ w.attr, w.after ] ), [ [ 'placeholder', 'Your name' ] ] );
	assert.deepEqual( clean.unmapped, [] );
	const seen = [];
	const bad = input( ( x ) => { seen.push( x.writes.map( ( w ) => w.attr ) ); return [ 'placeholder Your name is not the draft\'s' ]; } );
	assert.deepEqual( seen, [ [ 'placeholder' ] ], 'the read-back runs once with the field\'s writes' );
	assert.deepEqual( bad.unmapped.map( ( u ) => [ u.node, u.block, u.property, u.reason ] ), [ [ 'r0', 'sgs/form-field-text', 'form read-back', 'placeholder Your name is not the draft\'s' ] ] );
	const w = [ { attr: 'placeholder', value: 'Your name' } ];
	assert.deepEqual( formReadback( { writes: w, el: { placeholder: '' }, field: { field: { ph: 'Your name' } } } ), [] );
	assert.equal( formReadback( { writes: w, el: { placeholder: '' } } ).length, 1 );
} );

test( 'MUST FAIL: several writes to one attribute are restored last to first, so the node ends on the value the skeleton held', () => {
	const db = openDb( fixtureDb( { blocks: blocks( 'sgs/button' ), block_attributes: [ attr( 'sgs/button', 'inheritStyle', 'string', { enum_values: '["primary","secondary","outline"]' } ) ] } ) );
	const PRESETS = { primary: { background: '#0a7ea8', text: '#ffffff' } };
	const styles = { 'background-color': 'rgb(10, 126, 168)', color: 'rgb(255, 255, 255)', 'font-size': '16px' };
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { styles } } ] ) ), states: {} };
	const node = { name: 'sgs/button', attributes: { padding: { top: '12px', bottom: '12px' } }, ref: 'r0' };
	const write = ( prop, before ) => ( { node: 'r0', slot: '', prop, attr: 'padding', before, after: node.attributes.padding, widths: [ 1440 ] } );
	// The attribute began empty; the first write set { top }, the second set { top, bottom } over it (its `before` is the first's result).
	const writes = [ write( 'background-color', null ), write( 'color', { top: '12px' } ) ];
	const r = presetWrites( { nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ], flat: [ node ], refOf: ( n ) => n.ref, reads, rawSnapshot: { settings: { custom: { buttonPresets: PRESETS } } }, snapshot: { palette: [], spacing: [], fontSizes: [] }, writes, db } );
	assert.equal( node.attributes.inheritStyle, 'primary' );
	assert.equal( node.attributes.padding, undefined, 'both writes undone: the attribute is back to nothing, not to the first write\'s value' );
	assert.deepEqual( r.writes.map( ( x ) => x.attr ), [ 'inheritStyle' ] );
} );

test( 'MUST FAIL: a draft value equal to the block\'s default is written when the node holds another value, and skipped when the node holds nothing or already holds it', () => {
	const db = openDb( fixtureDb( { blocks: blocks( 'sgs/form-field-textarea' ), block_attributes: [ attr( 'sgs/form-field-textarea', 'rows', 'number', { default_value: '4' } ) ] } ) );
	const el = { tag: 'textarea', rows: '4' };
	const writes = ( attributes ) => formFieldWrites( { db, block: 'sgs/form-field-textarea', attributes, el } ).writes.map( ( w ) => [ w.attr, w.value ] );
	assert.deepEqual( writes( { rows: 8 } ), [ [ 'rows', 4 ] ] );
	assert.deepEqual( writes( {} ), [], 'nothing held: the default already says 4' );
	assert.deepEqual( writes( { rows: 4 } ), [] );
	assert.deepEqual( formFieldWrites( { db, block: 'sgs/form-field-textarea', attributes: {}, el: { tag: 'textarea', rows: '6' } } ).writes.map( ( w ) => w.value ), [ 6 ] );
} );

test( 'MUST FAIL: a state read with no looks table yet is given one, not thrown on', () => {
	const DEFECTS = [ { rowId: 'g', draftId: 'Page:87', rows: [ { draftId: 'Page:87', test: 'unresolved-binding', kind: 'style-hover', verdict: 'dropped', evidence: { pseudo: 'hover', declared: 'color:{{ card.textColor }}', decls: [ { prop: 'color', declared: '{{ card.textColor }}', compiled: '', state: 'dropped' } ] } } ] } ];
	const answer = { v: [ { t: 'string', v: '#00cc00' } ], n: 1, loop: false };
	const facts = { elements: { 'Page/87': { template: { holes: [ { id: 'h1', where: 'style-hover:color' } ] }, logic: { holes: { h1: { 375: answer, 768: answer, 1440: answer } } } } } };
	const reads = { states: { 375: {}, 768: {}, 1440: {} } };
	const r = addDefectLooks( { reads, jobs: [ { id: '0:', finder: { tpl: 'Page/87#0' } } ], facts, draftDefects: DEFECTS, rootComponent: 'Page' } );
	assert.deepEqual( r.gaps, [] );
	assert.equal( reads.states[ 1440 ].looks[ '0:' ][ 0 ].declared.color, '#00cc00' );
} );

test( 'MUST FAIL: the width gate takes a threshold as a block\'s own setting only for the collapse setting the skeleton rules name; any other breakpoint-like number falls through to the hiding flags', () => {
	const rows = [ attr( 'sgs/other', 'mobileBreakpoint', 'number' ), attr( 'sgs/other', 'sgsHideOnMobile', 'boolean' ), attr( 'sgs/other', 'sgsHideOnTablet', 'boolean' ), attr( 'sgs/other', 'sgsHideOnDesktop', 'boolean' ),
		attr( 'sgs/menu', 'collapsePoint', 'number' ), attr( 'sgs/menu', 'sgsHideOnMobile', 'boolean' ), attr( 'sgs/menu', 'sgsHideOnTablet', 'boolean' ) ];
	const db = openDb( fixtureDb( { blocks: blocks( 'sgs/other', 'sgs/menu' ), block_attributes: rows } ) );
	const facts = { elements: {
		'Page/44': { template: { tag: 'sc-if', membership: { scIf: [] } }, logic: { holes: {}, width: { w: '>=', n: 1024 }, via: 'w >= 1024' } },
		'Page/45': { template: { tag: 'div', membership: { scIf: [ { key: 'Page/44', value: '{{ x }}' } ] } }, logic: { holes: {} } },
	} };
	const run = ( block, collapse ) => {
		const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
		const nodes = [ { index: 0, name: block, parent: null, node: { draftRef: { tpl: 'Page/45#0' } }, children: [], targets: [] } ];
		widthGateWrites( { nodes, flat, refOf: ( n ) => n.ref, facts, db, scope: 'header', entries: [], date: '2026-10-22', collapse } );
		return flat[ 0 ].attributes;
	};
	assert.deepEqual( run( 'sgs/other', { 'sgs/menu': 'collapsePoint' } ), { sgsHideOnMobile: true, sgsHideOnTablet: true }, 'a number named mobileBreakpoint is not the collapse setting' );
	assert.deepEqual( run( 'sgs/menu', { 'sgs/menu': 'collapsePoint' } ), { collapsePoint: 1024 } );
	assert.deepEqual( run( 'sgs/other', { 'sgs/other': 'mobileBreakpoint' } ), { mobileBreakpoint: 1024 }, 'a block the rules name takes its setting' );
	assert.deepEqual( run( 'sgs/menu', { 'sgs/menu': 'noSuchAttr' } ), { sgsHideOnMobile: true, sgsHideOnTablet: true }, 'a named setting the block does not hold falls through' );
} );

test( 'MUST FAIL: the fact record speaks for the target the image is drawn by, not the first target of the node', () => {
	const db = openDb();
	const skeleton = [ { name: 'sgs/media', draftRef: { tpl: 'Page/5#0' }, draftSlots: { '.pic': { tpl: 'Page/7#0' } }, attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const snap = ( over = {} ) => ( { styles: {}, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null, ...over } );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, { '0:': snap(), '0:.pic': snap( { img: { tag: 'img', src: 'assets/a.png', alt: null } } ) } ] ) );
	const facts = { elements: { 'Page/5': { alt: { placeholder: 'Wrong element' }, assets: [] }, 'Page/7': { alt: { placeholder: 'Right element' }, assets: [] } } };
	const cal = { block: 'sgs/media', elements: { '': {}, '.pic': {} }, settings: {}, discovered: {} };
	const out = fillTree( {
		tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], rawSnapshot: null,
		facts, rootComponent: 'Page', media: { map: { sites: { s: { files: [ { asset: 'sites/x/assets/a.png', id: 9, url: 'https://x.test/a.png' } ] } } }, site: 's' },
	} );
	assert.equal( tree[ 0 ].attributes.imageAlt, 'Right element', JSON.stringify( out.unmapped ) );
} );

test( 'MUST FAIL: the one-value-every-width gap keeps its code from the resolver to the UNMAPPED row Fill lists', () => {
	const db = openDb();
	const skeleton = [ { name: 'sgs/responsive-logo', draftRef: { tpl: 'Page/5#0' }, attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const wd = { 375: '200px', 768: '260px', 1024: '260px', 1440: '260px', 1920: '260px' };
	const widths = Object.fromEntries( Object.keys( wd ).map( ( w ) => [ w, { '0:': { styles: { width: wd[ w ] }, pseudo: {}, rect: { x: 0, y: 0, w: parseInt( wd[ w ] ), h: 40 }, inFlow: true, words: '', href: null } } ] ) );
	const declared = Object.fromEntries( Object.keys( wd ).map( ( w ) => [ w, { '0:': { width: wd[ w ] } } ] ) );
	const cal = { block: 'sgs/responsive-logo', elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { width: '0px' } ] ) ) }, settings: { width: { slot: '', slots: [ '' ], reaches: [ '' ], property: 'width', state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } }, discovered: {} };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], rawSnapshot: null, facts: null, rootComponent: 'Page' } );
	assert.deepEqual( out.unmapped.map( ( u ) => [ u.property, u.code ] ), [ [ 'width', 'one-value-every-width' ] ] );
} );

test( 'MUST FAIL: the logo\'s per-width gap is matched by its structured code, not by the words of its reason', () => {
	const db = openDb();
	const cal = { elements: { '': {} }, settings: { width: { slot: '', slots: [ '' ], reaches: [ '' ], property: 'width', state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } } };
	const gap = resolveProperty( { node: { attributes: {} }, block: 'sgs/responsive-logo', prop: 'width', draft: { 1440: '260px', 768: '260px', 375: '200px' }, baseline: () => '0px', slots: [ '' ], calibration: cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, log: [] } );
	assert.deepEqual( [ gap.status, gap.gap, gap.code ], [ 'gap', 'shape', 'one-value-every-width' ] );
	const call = ( row ) => logoSizeWrites( {
		nodes: [ { index: 0, name: 'sgs/responsive-logo', targets: [ { id: '0:', slot: '' } ] } ], flat: [ { ref: 'r0', attributes: {} } ], refOf: ( n ) => n.ref,
		reads: { widths: { 1440: { '0:': { rect: { w: 260 } } }, 768: { '0:': { rect: { w: 260 } } }, 375: { '0:': { rect: { w: 200 } } } } }, db,
		unmapped: [ { node: 'r0', block: 'sgs/responsive-logo', slot: '', property: 'width', reason: 'shape: width holds one value for every width; draft has 260px, 200px', ...row } ],
	} );
	assert.equal( call( { code: 'one-value-every-width' } ).writes.length > 0, true );
	assert.deepEqual( call( {} ).writes, [], 'the same words without the code are not the gap' );
	assert.equal( call( {} ).unmapped.length, 1 );
} );

const BUTTON = { iconSource: {}, iconSvg: {}, iconFill: {}, iconPosition: { type: 'string', default: 'after' } };
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 12h16"/></svg>';
test( 'MUST FAIL: the side the draft draws the button icon on is written as iconPosition; the default side, an unread side and a side the setting\'s list lacks are not', () => {
	const pos = ( position, over = {} ) => iconDecisions( { svg: { markup: ICON, position }, schema: BUTTON, ...over } );
	const val = ( r ) => r.writes.find( ( w ) => 'iconPosition' === w.attr )?.value;
	assert.equal( val( pos( 'before' ) ), 'before' );
	assert.equal( val( pos( 'after' ) ), undefined, 'after is the default' );
	assert.equal( val( pos( null ) ), undefined );
	assert.equal( val( pos( 'after', { attributes: { iconPosition: 'before' } } ) ), 'after', 'the node holds the other side' );
	assert.equal( val( pos( 'before', { schema: { ...BUTTON, iconPosition: { type: 'string', default: 'after' } }, attributes: { iconPosition: 'before' } } ) ), undefined );
	const narrow = pos( 'before', { schema: { ...BUTTON, iconPosition: { type: 'string', default: 'after', enum: [ 'after' ] } } } );
	assert.equal( val( narrow ), undefined );
	assert.match( narrow.unmapped.map( ( u ) => u.reason ).join( '\n' ), /iconPosition holds only after/ );
	assert.equal( val( iconDecisions( { svg: { markup: ICON, position: 'before' }, schema: { iconSource: {}, iconSvg: {} } } ) ), undefined, 'a block with no iconPosition' );
} );

let served;
let read;
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } a { display: inline-flex; gap: 8px; align-items: center } svg { width: 20px; height: 20px } .rev { flex-direction: row-reverse } .col { flex-direction: column; align-items: flex-end }
</style></head><body>
<a class="first" href="/a"><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="red"/></svg><span>Call us</span></a>
<a class="last" href="/b"><span>Call us</span><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="red"/></svg></a>
<a class="rev" href="/c"><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="red"/></svg><span>Call us</span></a>
<a class="col" href="/d"><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="red"/></svg><span>Call us</span></a>
<a class="only" href="/e"><svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="red"/></svg></a>
</body></html>`;
before( async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'review-icon-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	served = await serveDraft( dir );
	const tree = [ { name: 'sgs/container', draftRef: 'body', attributes: {}, innerBlocks: [ 'first', 'last', 'rev', 'col', 'only' ].map( ( c ) => ( { name: 'sgs/button', draftRef: `a.${ c }`, attributes: {} } ) ) } ];
	read = await readDraft( { url: served.url, nodes: skeletonNodes( tree ), headless: true, sweep: false } );
} );
after( () => served?.close() );
test( 'MUST FAIL: the page read says which side of the words the icon paints on (document order, a reversed row, a column, no words)', () => {
	const side = ( n ) => read.widths[ 1440 ][ `${ n }:` ].svg.position;
	assert.deepEqual( [ 1, 2, 3, 4, 5 ].map( side ), [ 'before', 'after', 'after', 'before', null ] );
} );

test( 'MUST FAIL: a width-threshold snap enters the divergence ledger once, and a second run adds nothing', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'review-ledger-' ) );
	const file = path.join( dir, 'qa', 'divergences.json' );
	const snap = { id: 'D-1', scope: 'header', node: 'r0', state: '*', property: 'breakpoint', expected: { rule: 'breakpoint-snap' }, reason: 'the draft\'s width threshold 1060px snapped to the 1024px tier (distance 36px, within 5% of the tier)', decided: '2026-10-22 FR-48-50', snap: { draft: 1060, tier: 1024, distance: 36 } };
	assert.equal( addEntries( file, [ snap ] ).length, 1 );
	assert.equal( addEntries( file, [ { ...snap, id: 'D-2' } ] ).length, 0, 'the same snap again is not added' );
	assert.equal( addEntries( file, [ { ...snap, id: 'D-2', node: 'r1' } ] ).length, 1 );
	assert.deepEqual( loadLedger( file ).map( ( e ) => e.id ), [ 'D-1', 'D-2' ] );
	assert.equal( addEntries( file, [] ).length, 0 );
} );

test( 'MUST FAIL: the drawer-opener rule names its teacher and its clients like the other taught rules, from the burger the same runtime drew', () => {
	const R = JSON.parse( fs.readFileSync( new URL( '../data/skeleton-decisions.json', import.meta.url ), 'utf8' ) ).rules;
	assert.deepEqual( R.drawerOpener.taughtBy, { client: R.headerSlots.taughtBy.client, key: R.headerSlots.taughtBy.key.replace( /\/\d+$/, '/59' ), runtime_sha256: R.headerSlots.taughtBy.runtime_sha256 } );
	assert.deepEqual( R.drawerOpener.clients, [ R.headerSlots.taughtBy.client ] );
} );

test( 'MUST FAIL: Fill adds the snaps to the ledger it reads, hands the motion handover on and gives the motion writer the framework DB', () => {
	const src = fs.readFileSync( new URL( '../fill.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /const gates = widthGateWrites\([^\n]*\n\s*addEntries\( ledgerFile, gates\.ledger \);/ );
	assert.match( src, /result\.handover\.push\( \.\.\.motion\.handover \)/ );
	assert.match( src, /motionWrites\( \{[^\n]*mdb: motionDb\( db \), db,/ );
	assert.doesNotMatch( src, /breakpoint-snaps\.json/ );
} );
