// Data branches (lib/skeleton-data-branches.mjs): a branch the draft shows only for some data is found from the fact record and
// the logic's AST, forced at the runtime's renderVals seam, read once, and its new elements put into the inventory at their
// place in the draft. Planted drafts and a planted runtime first, then Mama's and Eye Care's real inputs. Tests marked MUST
// FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDraft } from '../lib/intake-ast.mjs';
import { addDataBranches, dataBranches, forceRenderVals, inventoryBranches, mergeDataReads, readDataBranches, readsComponent } from '../lib/skeleton-data-branches.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const FIX = path.join( HERE, 'fixtures', 'template-piece-order' );

const TEMPLATE = `<main>
<sc-if value="{{ hasNote }}"><div><div>Your note</div><sc-if value="{{ hasTo }}"><div>Dear {{ giftTo }},<sc-if value="{{ hasPs }}"><i>PS</i></sc-if></div></sc-if><div>{{ note }}</div></div></sc-if>
<sc-if value="{{ noNote }}"><p>Send a gift</p></sc-if>
<sc-if value="{{ open }}"><p>Opened by a click</p></sc-if>
<sc-if value="{{ isOpen }}"><p>Read from the state</p></sc-if>
<sc-for list="{{ rows }}" as="it"><div><sc-if value="{{ it.on }}"><b>on</b></sc-if></div></sc-for>
<sc-for list="{{ rows }}" as="gift"><div><sc-if value="{{ gift.on }}"><b>a loop item named like a data value</b></sc-if></div></sc-for>
<sc-if value="{{ gift.on }}"><p>Gift field</p></sc-if>
<sc-if value="{{ !paid }}"><p>Unpaid</p></sc-if>
<sc-if value="{{ wide }}"><p>Wide only</p></sc-if>
</main>
<aside><sc-if value="{{ promo }}"><p>Outside the surface</p></sc-if></aside>`;
const LOGIC = `class Component extends DCLogic {
  state = { open: false, bp: 'd' };
  renderVals() {
    const S = this.state;
    const M = window.STORE;
    const o = (M && M.order()) || { gift: { on: false }, paid: true };
    const note = o.gift && o.gift.on && o.gift.message;
    return {
      hasNote: !!note, noNote: !note, note: note || '', hasTo: !!(o.gift && o.gift.to), giftTo: (o.gift && o.gift.to) || '', hasPs: !!o.ps,
      isOpen: S.open, rows: [ { on: false } ], gift: o.gift, paid: o.paid, wide: !!o.wide, promo: !!o.promo
    };
  }
}`;
const SAMPLES = { hasNote: [ false ], noNote: [ true ], hasTo: [ false ], hasPs: [ false ], open: [ false ], isOpen: [ false ], 'it.on': [ false ], 'gift.on': [ false ], '!paid': [ false ], wide: [ false ], promo: [ false ], note: [ '' ], giftTo: [ '' ] };

// The fact record of a planted template as intake writes it (lib/fact-record.mjs): each start tag an element, its parent chain,
// loops and branches, its holes and their samples. `width` names the tests that are width conditions.
function plant( { width = [ 'wide' ] } = {} ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'data-branches-' ) );
	fs.writeFileSync( path.join( dir, 'Page.dc.html' ), `<!DOCTYPE html><html><body><x-dc><div>${ TEMPLATE }</div></x-dc><script type="text/x-dc" data-dc-script>${ LOGIC }</script></body></html>` );
	const draft = loadDraft( dir, 'Page.dc.html' );
	const elements = {};
	const stack = [];
	let n = 0;
	const text = draft.text.slice( draft.text.indexOf( '<x-dc>' ) + 6, draft.text.indexOf( '</x-dc>' ) );
	for ( const m of text.matchAll( /<(\/)?([a-z][\w-]*)([^>]*)>|([^<]+)/g ) ) {
		if ( m[ 4 ] ) {
			stack.length && ( stack.at( -1 ).template.words += m[ 4 ] );
			continue;
		}
		if ( m[ 1 ] ) {
			stack.pop();
			continue;
		}
		const attrs = Object.fromEntries( [ ...m[ 3 ].matchAll( /([\w-]+)="([^"]*)"/g ) ].map( ( a ) => [ a[ 1 ], a[ 2 ] ] ) );
		const e = { key: `Page/${ n }`, template: { tag: m[ 2 ], n: String( n ), parent: stack.at( -1 )?.key ?? null, parentChain: stack.map( ( s ) => s.key ).reverse(), membership: { scFor: stack.filter( ( s ) => 'sc-for' === s.template.tag ).map( ( s ) => ( { key: s.key, list: s.template.own.list, as: s.template.own.as } ) ).reverse(), scIf: stack.filter( ( s ) => 'sc-if' === s.template.tag ).map( ( s ) => ( { key: s.key, value: s.template.own.value } ) ).reverse() }, own: { list: attrs.list, as: attrs.as, value: attrs.value }, holes: [], words: '' }, logic: { holes: {} } };
		attrs.value && e.template.holes.push( { id: 'attr:value#0', where: 'attr:value', expr: attrs.value.replace( /^\{\{\s*|\s*\}\}$/g, '' ) } );
		attrs.value && width.includes( e.template.holes[ 0 ].expr ) && ( e.logic.width = { w: '>= 1060' } );
		elements[ e.key ] = e;
		n++;
		stack.push( e );
	}
	for ( const e of Object.values( elements ) ) {
		[ ...e.template.words.matchAll( /\{\{\s*([\w.]+)\s*\}\}/g ) ].forEach( ( h, i ) => e.template.holes.push( { id: `text#${ i }`, where: 'text', expr: h[ 1 ] } ) );
		for ( const h of e.template.holes ) {
			SAMPLES[ h.expr ] && ( e.logic.holes[ h.id ] = { 1440: { v: SAMPLES[ h.expr ].map( ( v ) => ( { t: typeof v, v } ) ) }, 375: { v: SAMPLES[ h.expr ].map( ( v ) => ( { t: typeof v, v } ) ) } } );
		}
		delete e.key;
	}
	return { draft, record: { elements } };
}
const keyOf = ( record, value ) => Object.keys( record.elements ).find( ( k ) => record.elements[ k ].template.own.value === `{{ ${ value } }}` );
const mainOf = ( record ) => Object.keys( record.elements ).find( ( k ) => 'main' === record.elements[ k ].template.tag );

test( 'MUST FAIL: a branch hidden at rest whose test the logic derives from data is forced; a state key, a shown branch, a loop field and a width condition are not', () => {
	const { draft, record } = plant();
	const { branches, notes } = dataBranches( { record, draft, component: 'Page', within: mainOf( record ) } );
	assert.deepEqual( branches.map( ( b ) => [ b.test, b.keys, b.nested.map( ( k ) => record.elements[ k ].template.own.value ) ] ), [
		[ 'hasNote', { note: 'note', giftTo: 'giftTo', hasNote: true, hasTo: true }, [ '{{ hasTo }}' ] ],
		[ 'paid', { paid: false }, [] ],
	] );
	// Negative controls: noNote is shown at rest (its elements are in the opening read), `open` is a state key and `isOpen` reads
	// the state (the reveal reader's), `it.on` is a loop item's field, `wide` a width condition, `promo` sits outside the surface.
	for ( const t of [ 'noNote', 'open', 'isOpen', 'it.on', 'wide', 'promo' ] ) {
		assert.ok( ! branches.some( ( b ) => b.test === t || Object.hasOwn( b.keys, t ) ), `${ t } is not forced` );
	}
	// A field of a data value is named, and a branch two data branches deep is not forced.
	assert.deepEqual( [ ...notes ].sort(), [
		`${ keyOf( record, 'hasPs' ) } ({{ hasPs }}) sits 2 data branches deep (${ keyOf( record, 'hasTo' ) }, ${ keyOf( record, 'hasNote' ) }): only one level is forced, so it is not read`,
		`${ Object.keys( record.elements ).find( ( k ) => '{{ gift.on }}' === record.elements[ k ].template.own.value && ! record.elements[ k ].template.membership.scFor.length ) } ({{ gift.on }}) is hidden at rest and tests a field of the data value gift: only a whole value is forced, so it is not read`,
	].sort() );
	// With no surface root the whole component is read: the branch outside the main is found too.
	assert.ok( dataBranches( { record, draft, component: 'Page' } ).branches.some( ( b ) => 'promo' === b.test ) );
	// A width condition is forced once it is not one.
	const all = plant( { width: [] } );
	assert.ok( dataBranches( { record: all.record, draft: all.draft, component: 'Page', within: mainOf( all.record ) } ).branches.some( ( b ) => 'wide' === b.test ) );
} );

test( 'MUST FAIL: a value reads the component when it reaches this.state, props or a method through its variables', () => {
	const { draft } = plant();
	const L = draft.idx;
	const valueOf = ( key ) => L.all.find( ( n ) => 'ObjectProperty' === n.type && key === n.key?.name && n.start > L.all.find( ( x ) => 'ClassMethod' === x.type ).start ).value;
	assert.equal( readsComponent( L, valueOf( 'isOpen' ) ), true );
	assert.equal( readsComponent( L, valueOf( 'hasNote' ) ), false );
	assert.equal( readsComponent( L, valueOf( 'gift' ) ), false );
} );

// Records as the inventory's collector returns them.
const rec = ( key, parentKey, words = '' ) => ( { key, parentKey, tag: 'div', words } );

test( 'MUST FAIL: a forced read adds only new elements, each at its place in the draft, and loses nothing of the opening read', () => {
	const base = [ rec( 'Root/1#0', 'Root/0#0' ), rec( 'Root/2#0', 'Root/1#0', 'a' ), rec( 'Root/9#0', 'Root/1#0', 'opposite' ), rec( 'Root/12#0', 'Root/1#0', 'c' ) ];
	const branch = { component: 'Page', keys: { hasNote: true } };
	// The forced branch Root/5 (with a child) shows between Root/2 and Root/9; its opposite Root/9 is shown in the read too.
	const read = [ rec( 'Root/1#0', 'Root/0#0' ), rec( 'Root/2#0', 'Root/1#0', 'a' ), rec( 'Root/5#0', 'Root/1#0' ), rec( 'Root/6#0', 'Root/5#0', 'note' ), rec( 'Root/9#0', 'Root/1#0', 'opposite' ), rec( 'Root/12#0', 'Root/1#0', 'c' ) ];
	const out = mergeDataReads( base, [ { branch, records: read } ] );
	assert.deepEqual( out.map( ( r ) => r.key ), [ 'Root/1#0', 'Root/2#0', 'Root/5#0', 'Root/6#0', 'Root/9#0', 'Root/12#0' ] );
	assert.deepEqual( out.filter( ( r ) => r.branch ).map( ( r ) => [ r.key, r.branch ] ), [ [ 'Root/5#0', branch ], [ 'Root/6#0', branch ] ] );
	// The opening records come back as they were (no branch mark, same objects).
	assert.ok( base.every( ( r ) => out.includes( r ) ) );
	// A read that hides an opening element (a branch forced off) loses nothing; a second read showing the same element adds it once.
	const other = { component: 'Page', keys: { hasAcct: true } };
	const twice = mergeDataReads( base, [ { branch, records: read }, { branch: other, records: [ rec( 'Root/1#0', 'Root/0#0' ), rec( 'Root/5#0', 'Root/1#0' ), rec( 'Root/15#0', 'Root/1#0' ) ] } ] );
	assert.deepEqual( twice.map( ( r ) => r.key ), [ 'Root/1#0', 'Root/2#0', 'Root/5#0', 'Root/6#0', 'Root/9#0', 'Root/12#0', 'Root/15#0' ] );
	assert.deepEqual( twice.find( ( r ) => 'Root/15#0' === r.key ).branch, other );
	// A later sibling's copy order counts too; another host's element is not compared, so the new one goes after the parent's last.
	const copies = mergeDataReads( [ rec( 'Root/1#0', null ), rec( 'Root/4#0', 'Root/1#0' ), rec( 'Root/4#2', 'Root/1#0' ), rec( 'Root>Card@3#0/9#0', 'Root/1#0' ) ], [ { branch, records: [ rec( 'Root/4#1', 'Root/1#0' ), rec( 'Root/3#0', 'Root/1#0' ), rec( 'Root/5#0', 'Root/1#0' ) ] } ] );
	assert.deepEqual( copies.map( ( r ) => r.key ), [ 'Root/1#0', 'Root/3#0', 'Root/4#0', 'Root/4#1', 'Root/4#2', 'Root>Card@3#0/9#0', 'Root/5#0' ] );
	// Elements already revealed by a click state do not count as opening elements.
	const revealed = mergeDataReads( [ rec( 'Root/1#0', null ), { ...rec( 'Root/5#0', 'Root/1#0' ), reveal: { component: 'Page', keys: { open: true } } } ], [ { branch, records: [ rec( 'Root/5#0', 'Root/1#0' ) ] } ] );
	assert.equal( revealed.filter( ( r ) => 'Root/5#0' === r.key ).length, 2 );
} );

// A planted runtime: one mounted host whose logic renders `rows` from its renderVals, as the draft runtime does.
function runtime( name = 'Root' ) {
	const logic = { renders: 0, renderVals() {
		return { hasNote: false };
	}, setState() {
		this.renders++;
	} };
	const host = { dataset: { scName: name }, '__reactFiber$x': { stateNode: { logic, __name: name }, return: null } };
	globalThis.document = { querySelectorAll: () => [ host ] };
	return logic;
}

test( 'MUST FAIL: the renderVals seam is wrapped and put back through the logic\'s own setState, on the named hosts only', () => {
	const logic = runtime();
	assert.equal( forceRenderVals( { hosts: [ 'Other' ], patch: { hasNote: true } } ), 0 );
	assert.equal( forceRenderVals( { hosts: [ 'Page', 'Root' ], patch: { hasNote: true, note: 'note' } } ), 1 );
	assert.deepEqual( logic.renderVals(), { hasNote: true, note: 'note' } );
	assert.equal( logic.renders, 1 );
	// Forcing again wraps the draft's own renderVals, not the wrapper.
	forceRenderVals( { hosts: [ 'Root' ], patch: { hasAcct: true } } );
	assert.deepEqual( logic.renderVals(), { hasNote: false, hasAcct: true } );
	assert.equal( forceRenderVals( { hosts: [ 'Root' ], patch: null } ), 1 );
	assert.deepEqual( logic.renderVals(), { hasNote: false } );
	assert.equal( logic.renders, 3 );
	assert.equal( forceRenderVals( { hosts: [ 'Root' ], patch: null } ), 0 );
	delete globalThis.document;
} );

test( 'MUST FAIL: one read per branch, each with its branch forced and put back after, an unmounted component skipped', async () => {
	const logic = runtime();
	const page = { evaluate: async ( fn, arg ) => fn( arg ) };
	const seen = [];
	const read = async () => {
		const vals = logic.renderVals();
		seen.push( vals );
		return [ rec( 'Root/1#0', null ), ...( vals.hasNote ? [ rec( 'Root/5#0', 'Root/1#0' ) ] : [] ), ...( vals.hasAcct ? [ rec( 'Root/7#0', 'Root/1#0' ) ] : [] ) ];
	};
	const logs = [];
	const out = await readDataBranches( { page, read, settle: async () => {}, base: [ rec( 'Root/1#0', null ) ], hosts: ( c ) => [ c, 'Root' ], log: ( m ) => logs.push( m ), branches: [
		{ component: 'Page', el: 'Page/5', test: 'hasNote', keys: { hasNote: true } },
		{ component: 'Page', el: 'Page/7', test: 'hasAcct', keys: { hasAcct: true } },
	] } );
	assert.deepEqual( out.map( ( r ) => r.key ), [ 'Root/1#0', 'Root/5#0', 'Root/7#0' ] );
	// Each read forces its own branch only.
	assert.deepEqual( seen, [ { hasNote: true }, { hasNote: false, hasAcct: true } ] );
	assert.deepEqual( logic.renderVals(), { hasNote: false } );
	const none = await readDataBranches( { page, read, settle: async () => {}, base: [], hosts: () => [ 'Gone' ], log: ( m ) => logs.push( m ), branches: [ { component: 'Gone', el: 'Gone/1', test: 'x', keys: { x: true } } ] } );
	assert.deepEqual( none, [] );
	assert.match( logs.at( -1 ), /data branch Gone\/1 \(\{\{ x \}\}\): Gone is not mounted/ );
	delete globalThis.document;
} );

test( 'MUST FAIL: only a page surface with an intake skeleton and a draft file forces anything', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'data-branches-repo-' ) );
	const build = path.join( repo, 'sites', 'c', 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { d: { intakeSurface: 'drawer', draftIndex: 'Page.dc.html' }, x: { draftIndex: 'Page.dc.html' } } ) );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { drawer: { kind: 'drawer', root: { tpl: '3' } } } } ) );
	// A drawer forces nothing and reads no fact record (the site holds none).
	assert.deepEqual( inventoryBranches( { repo, client: 'c', surface: 'd' } ).list, [] );
	assert.deepEqual( inventoryBranches( { repo, client: 'c', surface: 'x' } ).notes, [ 'x: no intake skeleton or draft file, so no data branch is forced' ] );
	const hosts = inventoryBranches( { repo, client: 'c', surface: 'd' } ).hosts;
	assert.deepEqual( hosts( 'Page' ), [ 'Page' ] );
} );

test( "Mama's confirmation: the gift note (with its name, one level down) and the signed-in link are its data branches; Eye Care's has none", () => {
	const record = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-facts.json' ), 'utf8' ) );
	const draft = loadDraft( path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff' ), 'Confirmation.dc.html' );
	const { branches, notes } = dataBranches( { record, draft, component: 'Confirmation', within: 'Confirmation/6' } );
	assert.deepEqual( branches.map( ( b ) => [ b.el, b.keys, b.nested ] ), [
		[ 'Confirmation/41', { giftTo: 'giftTo', note: 'note', hasNote: true, hasTo: true }, [ 'Confirmation/45' ] ],
		[ 'Confirmation/54', { hasAcct: true }, [] ],
	] );
	assert.deepEqual( notes, [] );
	const eye = JSON.parse( fs.readFileSync( path.join( FIX, 'eye-care-done-facts.json' ), 'utf8' ) );
	const eyeDraft = loadDraft( path.join( REPO, 'sites', 'eye-care-ward-end', 'handoff' ), 'Eye Care Birmingham.dc.html' );
	assert.deepEqual( dataBranches( { record: eye, draft: eyeDraft, component: 'Eye Care Birmingham', within: 'Eye Care Birmingham/843' } ).branches, [] );
} );

test( 'MUST FAIL: the inventory step reads the branches with the reader\'s own collector and changes nothing without them', async () => {
	const logic = runtime();
	const page = { evaluate: async ( fn, arg ) => fn( arg ) };
	// The collector the inventory reader hands over: its records depend on what the runtime renders.
	const collect = () => ( { records: [ rec( 'Root/1#0', null ), ...( logic.renderVals().hasNote ? [ rec( 'Root/5#0', 'Root/1#0' ) ] : [] ) ] } );
	const res = { records: [ rec( 'Root/1#0', null ) ] };
	const branches = { list: [ { component: 'Page', el: 'Page/5', test: 'hasNote', keys: { hasNote: true } } ], hosts: () => [ 'Root' ] };
	const logs = [];
	await addDataBranches( { page, res, collect, args: [], branches: { ...branches, list: [] }, w: 1440, settle: async () => {}, log: ( m ) => logs.push( m ) } );
	assert.deepEqual( res.records.map( ( r ) => r.key ), [ 'Root/1#0' ] );
	assert.deepEqual( logs, [] );
	await addDataBranches( { page, res, collect, args: [], branches, w: 1440, settle: async () => {}, log: ( m ) => logs.push( m ) } );
	assert.deepEqual( res.records.map( ( r ) => r.key ), [ 'Root/1#0', 'Root/5#0' ] );
	assert.deepEqual( logs, [ 'inventory 1440px data branches: 1 read, 1 elements added' ] );
	await assert.rejects( addDataBranches( { page, res, collect: () => ( { error: 'no root' } ), args: [], branches, w: 768, settle: async () => {} } ), /no root in a data branch at 768px/ );
	forceRenderVals( { hosts: [ 'Root' ], patch: null } );
	delete globalThis.document;
} );
