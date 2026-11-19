// A handler passed to a mount as a prop (Spec 48A FR-48A-17, lib/mount-handler.mjs): an accordion whose headers are a mounted
// Button (`<dc-import name="Button" onPress="{{ f.toggle }}" label="{{ f.q }}">`, the Button's own control binding
// `onClick="{{ onPress }}"` and its renderVals `onPress: p.onPress` with `p = this.props`) is recognised as the same
// accordion drawn with plain buttons (lib/skeleton-widgets.mjs, the accordion rule), and the choice-flow reader takes a
// mounted button's handler from its mount. Pure functions on a temporary folder: no command, no site.
// Mutations: tests/fixtures/skeleton-mount-handler/mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { passedProp, mountBinding } from '../lib/mount-handler.mjs';
import { draftLogicOf } from '../lib/skeleton-narrowing.mjs';
import { logicReadings } from '../lib/skeleton-widgets.mjs';
import { choiceFlowModel } from '../lib/skeleton-choice-flow.mjs';
import { recordView } from '../lib/skeleton-record.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();

const ROOT_LOGIC = ( write = '{ faq: open ? -1 : i }' ) => `class Component extends DCLogic {
	state = { faq: 0 };
	renderVals() {
		const S = this.state;
		return {
			faqs: [ [ 'When will it arrive?', 'In three days.' ], [ 'What is in them?', 'Oats and milk.' ], [ 'Can I send one?', 'Yes, with a note.' ] ].map( ( [ q, a ], i ) => {
				const open = S.faq === i;
				return { q, a, open, toggle: () => this.setState( ${ write } ) };
			} ),
		};
	}
}`;
const BUTTON_LOGIC = ( pass = 'p.onPress || null' ) => `class Component extends DCLogic {
	renderVals() {
		const p = this.props;
		return { onPress: ${ pass }, label: p.label || null };
	}
}`;

// The draft folder (Root.dc.html and Button.dc.html), its fact record and the inventory of the rendered page:
// section(1) > div(2) > unit div(3, loop faqs as f) > [ mount host(4) > Button root div(B1) > button(B2), panel p(5, sc-if f.open, copy 0 only) ].
function fixture( { rootLogic = ROOT_LOGIC(), buttonLogic = BUTTON_LOGIC(), mountAttr = 'onPress' } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'mount-handler-' ) );
	const dir = path.join( repo, 'sites', 'fixture-client', 'handoff' );
	fs.mkdirSync( dir, { recursive: true } );
	const files = {
		'Root.dc.html': `<x-dc name="Root"><i></i><section><div><sc-for list="{{ faqs }}" as="f"><div><dc-import name="Button" ${ mountAttr }="{{ f.toggle }}" label="{{ f.q }}"></dc-import><sc-if value="{{ f.open }}"><p>{{ f.a }}</p></sc-if></div></sc-for></div></section></x-dc>\n<script data-dc-script>\n${ rootLogic }\n</script>\n`,
		'Button.dc.html': `<x-dc name="Button"><i></i><div style="display:flex"><button onClick="{{ onPress }}">{{ label }}</button></div></x-dc>\n<script data-dc-script>\n${ buttonLogic }\n</script>\n`,
	};
	const sources = { files: {} };
	for ( const [ f, text ] of Object.entries( files ) ) {
		fs.writeFileSync( path.join( dir, f ), text );
		sources.files[ f ] = crypto.createHash( 'sha256' ).update( text ).digest( 'hex' );
	}
	const tpl = ( key, tag, o = {} ) => ( { template: { key, component: key.split( '/' )[ 0 ], n: key.split( '/' )[ 1 ], tag, realTag: tag, attrs: o.attrs || {}, style: { static: [], holes: [] }, pseudo: {}, holes: o.holes || [], parent: o.parent ?? null, realParent: o.parent ?? null, parentChain: o.chain || [],
		membership: { scIf: o.scIf || [], scFor: o.scFor || [], dcImport: [] }, own: {}, inHelmet: false, inFor: !! ( o.scFor || [] ).length, ref: null, hooks: {}, events: o.events || [], words: o.words || '', srcLine: 1 }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
	const loop = [ { key: 'Root/f3', list: '{{ faqs }}', as: 'f' } ];
	const elements = {
		'Root/1': tpl( 'Root/1', 'section' ),
		'Root/2': tpl( 'Root/2', 'div', { parent: 'Root/1', chain: [ 'Root/1' ] } ),
		'Root/f3': tpl( 'Root/f3', 'sc-for', { attrs: { list: '{{ faqs }}', as: 'f' }, parent: 'Root/2', chain: [ 'Root/2', 'Root/1' ] } ),
		'Root/3': tpl( 'Root/3', 'div', { parent: 'Root/f3', chain: [ 'Root/f3', 'Root/2', 'Root/1' ], scFor: loop } ),
		'Root/4': tpl( 'Root/4', 'dc-import', { attrs: { name: 'Button', [ mountAttr ]: '{{ f.toggle }}', label: '{{ f.q }}' }, parent: 'Root/3', chain: [ 'Root/3', 'Root/f3', 'Root/2', 'Root/1' ], scFor: loop } ),
		'Root/i5': tpl( 'Root/i5', 'sc-if', { attrs: { value: '{{ f.open }}' }, parent: 'Root/3', chain: [ 'Root/3', 'Root/f3', 'Root/2', 'Root/1' ], scFor: loop } ),
		'Root/5': tpl( 'Root/5', 'p', { parent: 'Root/i5', chain: [ 'Root/i5', 'Root/3', 'Root/f3', 'Root/2', 'Root/1' ], scFor: loop, scIf: [ { key: 'Root/i5', value: '{{ f.open }}' } ], words: '{{ f.a }}', holes: [ { id: 'text#0', where: 'text', expr: 'f.a', path: 'f.a', whole: false } ] } ),
		'Button/1': tpl( 'Button/1', 'div' ),
		'Button/2': tpl( 'Button/2', 'button', { parent: 'Button/1', chain: [ 'Button/1' ], events: [ { name: 'onClick', expr: 'onPress' } ], words: '{{ label }}', holes: [ { id: 'text#0', where: 'text', expr: 'label', path: 'label', whole: false } ] } ),
	};
	const Q = [ 'When will it arrive?', 'What is in them?', 'Can I send one?' ];
	const inv = [];
	let y = 0;
	const el = ( key, parentKey, depth, tag, template, tplN, o = {} ) => inv.push( { key, parentKey, depth, tag, template, tpl: tplN, attrs: o.attrs || {}, words: o.words || '', allText: o.allText ?? o.words ?? '', membership: o.membership || [], srcTag: o.srcTag || tag, srcOwnText: o.words || '', snippet: `<${ tag }>`,
		box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: ( y += 30 ), w: 400, h: 24 } ] ) ), visible: { 375: true, 768: true, 1440: true }, display: o.display || 'block', position: 'static', flexDirection: 'row', screenshots: {} } );
	el( 'Root/1#0', null, 0, 'section', 'Root', 1 );
	el( 'Root/2#0', 'Root/1#0', 1, 'div', 'Root', 2 );
	const forM = [ { kind: 'sc-for', list: '{{ faqs }}', as: 'f', tpl: 'f3' } ];
	for ( let c = 0; c < 3; c++ ) {
		el( `Root/3#${ c }`, 'Root/2#0', 2, 'div', 'Root', 3, { membership: forM } );
		el( `Root/4#${ c }`, `Root/3#${ c }`, 3, 'div', 'Root', 4, { attrs: { class: 'sc-host' }, srcTag: 'dc-import', membership: forM } );
		el( `Root>Button@4#${ c }/1#0`, `Root/4#${ c }`, 4, 'div', 'Button', 1, { attrs: { style: 'display:flex' }, display: 'flex', membership: [ { kind: 'inside-import', template: 'Button' } ] } );
		el( `Root>Button@4#${ c }/2#0`, `Root>Button@4#${ c }/1#0`, 5, 'button', 'Button', 2, { words: Q[ c ], membership: [ { kind: 'inside-import', template: 'Button' } ] } );
		0 === c && el( 'Root/5#0', 'Root/3#0', 3, 'p', 'Root', 5, { words: 'In three days.', membership: [ ...forM, { kind: 'sc-if', value: '{{ f.open }}', tpl: 'i5' } ] } );
	}
	const facts = { ...loadFacts( { db, client: 'fixture-client', repo: REPO } ), repo };
	const record = { schema: '1', client: 'fixture-client', elements, surfaces: {}, sources };
	return { repo, dir, record, facts, inventory: { checks: {}, source: 'fixture', root: 'section', generated: 'fixture', elements: inv } };
}
const propose = ( f ) => proposeSkeleton( { inventory: f.inventory, facts: f.facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', motion: new Set(), db, factRecord: f.record, openers: {}, carried: {} } );
const row = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );

test( 'MUST FAIL: an accordion whose headers are a mounted Button is an accordion, each unit an item, as with plain buttons', () => {
	const r = propose( fixture() );
	assert.deepEqual( [ row( r, 'Root/2#0' ).block, row( r, 'Root/2#0' ).rule ], [ 'sgs/accordion', 'accordion' ] );
	assert.deepEqual( [ 0, 1, 2 ].map( ( c ) => row( r, `Root/3#${ c }` ).block ), [ 'sgs/accordion-item', 'sgs/accordion-item', 'sgs/accordion-item' ] );
} );

test( 'negative control: a mounted Button whose passed handler only sets the key (it never closes) is no accordion', () => {
	assert.notEqual( row( propose( fixture( { rootLogic: ROOT_LOGIC( '{ faq: i }' ) } ) ), 'Root/2#0' ).block, 'sgs/accordion' );
} );

test( 'negative control: a component whose control handler is its own (not a prop) is not read through the mount', () => {
	const f = fixture( { buttonLogic: BUTTON_LOGIC( '() => null' ) } );
	assert.notEqual( row( propose( f ), 'Root/2#0' ).block, 'sgs/accordion' );
} );

test( 'MUST FAIL: the mount binding is the attribute named by the prop the control passes on', () => {
	const f = fixture();
	const own = logicReadings( draftLogicOf( { folder: f.dir, record: f.record, component: 'Button' } ) );
	const control = f.record.elements[ 'Button/2' ].template;
	assert.equal( passedProp( own.d, own.valueOf( control, 'onPress' ) ), 'onPress' );
	assert.equal( mountBinding( { control, mount: f.record.elements[ 'Root/4' ].template, own } ), 'f.toggle' );
	assert.equal( mountBinding( { control, mount: { attrs: { label: '{{ f.q }}' } }, own } ), null, 'a mount that passes no handler binds none' );
} );

// A choice flow whose option chips are a mounted Button (`onPress="{{ o.pick }}"` inside the options loop).
function flowFixture() {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'mount-flow-' ) );
	const files = {
		'Root.dc.html': `<x-dc name="Root"><section><h2>Build your box</h2><div><sc-for list="{{ bases }}" as="o"><dc-import name="Button" onPress="{{ o.pick }}" label="{{ o.name }}"></dc-import></sc-for></div><p>{{ summary }}</p></section></x-dc>
<script data-dc-script>
class Component extends DCLogic {
	state = { base: 'a' };
	renderVals() {
		const S = this.state;
		return { bases: [ { id: 'a', name: 'Classic oat' }, { id: 'b', name: 'Vegan oat' } ].map( ( o ) => ( { ...o, on: S.base === o.id, pick: () => this.setState( { base: o.id } ) } ) ), summary: S.base };
	}
}
</script>
`,
		'Button.dc.html': `<x-dc name="Button"><div><button onClick="{{ onPress }}">{{ label }}</button></div></x-dc>
<script data-dc-script>
${ BUTTON_LOGIC() }
</script>
`,
	};
	const sources = { files: {} };
	for ( const [ f, text ] of Object.entries( files ) ) {
		fs.writeFileSync( path.join( dir, f ), text );
		sources.files[ f ] = crypto.createHash( 'sha256' ).update( text ).digest( 'hex' );
	}
	const T = ( key, tag, parent, o = {} ) => ( { template: { key, component: key.split( '/' )[ 0 ], n: key.split( '/' )[ 1 ], tag, realTag: tag, attrs: o.attrs || {}, style: { static: [], holes: [] }, pseudo: {}, holes: o.holes || [], parent, realParent: parent, parentChain: o.chain || [],
		membership: { scIf: [], scFor: o.scFor || [], dcImport: [] }, own: {}, inHelmet: false, inFor: false, ref: null, hooks: {}, events: o.events || [], words: o.words || '', srcLine: 1 }, logic: { holes: {} }, surfaces: [], instances: [], fingerprint: {} } );
	const elements = {
		'Root/1': T( 'Root/1', 'section', null ),
		'Root/2': T( 'Root/2', 'h2', 'Root/1', { words: 'Build your box', chain: [ 'Root/1' ] } ),
		'Root/3': T( 'Root/3', 'div', 'Root/1', { chain: [ 'Root/1' ] } ),
		'Root/f4': T( 'Root/f4', 'sc-for', 'Root/3', { attrs: { list: '{{ bases }}', as: 'o' }, chain: [ 'Root/3', 'Root/1' ], holes: [ { id: 'attr:list#0', where: 'attr:list', expr: 'bases', path: 'bases', whole: true } ] } ),
		'Root/5': T( 'Root/5', 'dc-import', 'Root/f4', { attrs: { name: 'Button', onPress: '{{ o.pick }}', label: '{{ o.name }}' }, chain: [ 'Root/f4', 'Root/3', 'Root/1' ], scFor: [ { key: 'Root/f4', list: '{{ bases }}', as: 'o' } ] } ),
		'Root/6': T( 'Root/6', 'p', 'Root/1', { words: '{{ summary }}', chain: [ 'Root/1' ] } ),
		'Button/1': T( 'Button/1', 'div', null ),
		'Button/2': T( 'Button/2', 'button', 'Button/1', { events: [ { name: 'onClick', expr: 'onPress' } ], words: '{{ label }}' } ),
	};
	return { dir, view: recordView( { schema: '1', client: 'fixture-client', elements, surfaces: {}, sources } ) };
}
const flowOf = ( folder ) => {
	const f = flowFixture();
	const R = loadFacts( { db, client: 'fixture-client', repo: REPO } ).decisions.rules;
	return choiceFlowModel( { view: f.view, rootKey: 'Root/1', R: R.choiceFlow, formControl: R.formControl, folder: undefined === folder ? f.dir : folder } );
};

test( 'MUST FAIL: a choice flow whose option chips are a mounted Button finds its question through the handler its mount passes', () => {
	assert.deepEqual( flowOf().steps.map( ( s ) => s.label ), [ 'Build your box' ] );
} );

test( 'negative control: without the draft folder the mounted component cannot be read and no question is assumed', () => {
	assert.deepEqual( flowOf( null ).steps, [] );
} );
