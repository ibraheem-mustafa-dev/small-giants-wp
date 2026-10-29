// The reverse of tests/content-coverage.test.mjs's drift tests. Those prove a writer never writes OUTSIDE the settings the
// content coverage check claims for it; these prove every claimed setting is REALLY written by the writer for at least one
// realistic input. A claim the writer never honours would let the check say "covered" while the block keeps its default
// content, which is the silent failure the check exists to stop. Each claim that is a name list (form, icon, skeleton) is
// driven through the writer itself; tests/content-coverage-writers.mutations.json deletes one write at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { openDb } from '../lib/db.mjs';
import { formFieldWrites, formWrites, FORM_FIELD_SETTINGS, FORM_BLOCK_SETTINGS, formSettings } from '../lib/fill-form.mjs';
import { stepButtonWrites, stepButtonLabels } from '../lib/fill-form-buttons.mjs';
import { parseLogic } from '../lib/intake-ast.mjs';
import { iconDecisions, ICON_SETTINGS, iconSettings, LUCIDE_FILE, BRAND_FILE } from '../lib/fill-icon.mjs';
import { makeContent, skeletonSettings } from '../lib/skeleton-write-content.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const attr = ( block_slug, attr_name, attr_type, more = {} ) => ( { block_slug, attr_name, attr_type, ...more } );
const blocks = ( ...slugs ) => slugs.map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) );
const missing = ( claimed, written ) => claimed.filter( ( a ) => ! written.has( a ) );

test( 'every FORM_FIELD_SETTINGS name is written by formFieldWrites for some draft control', () => {
	const db = openDb( fixtureDb( { blocks: blocks( 'sgs/form-field-text' ), block_attributes: FORM_FIELD_SETTINGS.map( ( a ) => attr( 'sgs/form-field-text', a, 'string' ) ) } ) );
	const written = new Set();
	const run = ( o ) => formFieldWrites( { db, block: 'sgs/form-field-text', ...o } ).writes.forEach( ( w ) => written.add( w.attr ) );
	const copy = { required: 'Needed', tooLong: 'Too long' };
	run( { el: { tag: 'input', type: 'number', name: 'team', placeholder: 'Your name', autocomplete: 'name', inputmode: 'numeric', min: '1', max: '9', step: '2', maxlength: '20', counterMax: '20', value: 'x', checked: true, accept: 'image/png, image/jpeg', labelInside: false }, field: { field: { name: 'team', rxMsg: 'Bad' } }, params: new Set( [ 'team' ] ), condition: { field: 'kind', op: 'eq', value: 'other' }, copy } );
	run( { el: { tag: 'textarea', rows: '6', labelInside: true } } );
	run( { el: { tag: 'select', options: [ { value: '', label: 'Pick one' }, { value: 'a', label: 'A', selected: true } ], value: 'a' } } );
	run( { el: { tag: 'div', chips: [ { label: 'Rice', description: 'Long grain' } ] }, field: { field: { multi: true } } } );
	assert.deepEqual( missing( FORM_FIELD_SETTINGS, written ), [], 'a claimed setting the field writer never writes' );
	assert.deepEqual( formSettings( 'sgs/form-field-date' ), FORM_FIELD_SETTINGS );
} );

test( 'every FORM_BLOCK_SETTINGS name is written by the form pass', () => {
	const db = openDb( fixtureDb( {
		blocks: blocks( 'sgs/button', 'sgs/form', 'sgs/form-step', 'sgs/form-review' ),
		block_attributes: Object.entries( FORM_BLOCK_SETTINGS ).flatMap( ( [ block, list ] ) => list.map( ( a ) => attr( block, a, 'string' ) ) ),
	} ) );
	const steps = [ { key: 'a', label: 'Business', fields: [ { name: 'x', label: 'X' } ] }, { key: 'review', label: 'Review', intro: 'Check your answers', fields: [] } ];
	const FACTS = {
		logic: { statics: { Apply: { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: 2, value: steps } ] } } },
		elements: { 'Apply/edit': { template: { key: 'Apply/edit', tag: 'button', words: 'Edit section', membership: { scFor: [ 'step' ] } } } },
	};
	const flags = [ { kind: 'prototype-only', draftId: 'Apply.dc.html:js:1:1', text: 'localStorage.setItem(KEY, v)', why: 'browser storage write' } ];
	const flat = [
		{ name: 'sgs/form', attributes: {}, innerBlocks: [ { name: 'sgs/form-step' } ], ref: 'form' },
		{ name: 'sgs/form-step', attributes: {}, innerBlocks: [], ref: 'step' },
		{ name: 'sgs/form-review', attributes: {}, innerBlocks: [], ref: 'review' },
		{ name: 'sgs/button', attributes: {}, innerBlocks: [], ref: 'btn' },
	];
	const nodes = flat.map( ( n, i ) => ( { index: i, name: n.name, targets: [ { id: `${ i }:`, slot: '' } ] } ) );
	const reads = { widths: { 1440: { '3:': { form: { tag: 'button', type: 'submit' } } } } };
	const out = formWrites( { nodes, flat, refOf: ( n ) => n.ref, reads, facts: FACTS, flags, db, component: 'Apply' } );
	const written = new Set( out.writes.map( ( w ) => `${ w.block }.${ w.attr }` ) );
	// The form's button words come from the draft's Next and Back buttons (lib/fill-form-buttons.mjs::stepButtonLabels).
	const str = ( v ) => ( { 1440: { v: [ { t: 'string', v } ] } } );
	const button = ( key, words, onClick, holes = {} ) => ( {
		template: { key, tag: 'button', realTag: 'button', attrs: { type: 'button', onClick: `{{ ${ onClick } }}` }, words, inFor: false, membership: { scFor: [] }, holes: Object.keys( holes ).map( ( p, i ) => ( { id: `text#${ i }`, where: 'text', path: p, expr: p } ) ) },
		logic: { holes: Object.fromEntries( Object.values( holes ).map( ( r, i ) => [ `text#${ i }`, r ] ) ) },
	} );
	const els = [ button( 'Apply/85', '{{ nextLabel }}', 'next', { nextLabel: str( 'Continue' ) } ), button( 'Apply/81', 'Back', 'back' ) ];
	const idx = parseLogic( "class C { get schema() { return []; } renderVals() { const step = this.state.step; const S = this.schema, isReview = step === S.length - 1; return { nextLabel: isReview ? 'Send' : 'Continue' }; } }" );
	const rules = { next: { words: { patterns: [ '^(?:next|continue)$' ], flags: 'i' }, handlers: { patterns: [ '^next$' ] } }, back: { words: { patterns: [ '^back$' ], flags: 'i' }, handlers: { patterns: [ '^back$' ] } } };
	const { labels } = stepButtonLabels( { facts: { elements: Object.fromEntries( els.map( ( e ) => [ e.template.key, e ] ) ) }, component: 'Apply', idx, rules } );
	stepButtonWrites( { labels, def: () => ( {} ) } ).writes.forEach( ( w ) => written.add( `sgs/form.${ w.attr }` ) );
	const claimed = Object.entries( FORM_BLOCK_SETTINGS ).flatMap( ( [ block, list ] ) => list.map( ( a ) => `${ block }.${ a }` ) );
	assert.deepEqual( claimed.filter( ( c ) => ! written.has( c ) ), [], 'a claimed setting the form pass never writes' );
} );

const lucideMarkup = ( name ) => {
	const m = new RegExp( `'${ name }'\\s*=>\\s*'(?:<!--.*?-->)?(<svg.*?</svg>)'`, 's' ).exec( fs.readFileSync( LUCIDE_FILE, 'utf8' ) );
	return m[ 1 ].replace( /<(path|circle|rect|line|polyline|polygon|ellipse)\b/g, '<$1 fill="none" stroke="currentColor" stroke-width="2px" stroke-linecap="round" stroke-linejoin="round"' ).replace( / class="[^"]*"/g, '' );
};
const WHATSAPP = JSON.parse( fs.readFileSync( BRAND_FILE, 'utf8' ) ).brands.find( ( b ) => 'whatsapp' === b.slug ).glyph.svg;

test( 'every ICON_SETTINGS name is written by iconDecisions for some draft mark', () => {
	const schema = { iconSource: {}, iconName: {}, brandName: {}, iconSvg: {}, iconFill: {}, iconPosition: { enum: [ 'before', 'after' ], default: 'before' } };
	const written = new Set();
	const run = ( svg ) => iconDecisions( { svg, schema } ).writes.forEach( ( w ) => written.add( w.attr ) );
	run( { markup: lucideMarkup( 'activity' ), position: 'after' } );
	run( { markup: WHATSAPP } );
	run( { markup: '<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="#123456" stroke="none"/></svg>' } );
	assert.deepEqual( missing( ICON_SETTINGS, written ), [], 'a claimed setting the icon writer never writes' );
	assert.deepEqual( iconSettings( schema ), ICON_SETTINGS );
} );

// A skeleton fixture: one block per case, the facts read from it by the real loader.
const SK = {
	blocks: blocks( 'sgs/shell', 'sgs/root', 'sgs/logo', 'sgs/business-info', 'sgs/plain', 'sgs/navlike' ),
	block_attributes: [
		attr( 'sgs/shell', 'tagName', 'string', { enum_values: '["div","section"]' } ), attr( 'sgs/shell', 'layout', 'string', { enum_values: '["stack","flex"]' } ),
		attr( 'sgs/root', 'layout', 'string', { enum_values: '["stack","flex"]' } ),
		attr( 'sgs/logo', 'logoId', 'integer' ),
		attr( 'sgs/business-info', 'displayType', 'string', { enum_values: '["copyright","phone"]' } ), attr( 'sgs/business-info', 'copyrightPrefix', 'string' ), attr( 'sgs/business-info', 'label', 'string', { role: 'text-content' } ),
		attr( 'sgs/plain', 'heading', 'string', { role: 'text-content' } ), attr( 'sgs/plain', 'url', 'string', { role: 'link-href' } ), attr( 'sgs/plain', 'linkTarget', 'string' ),
		attr( 'sgs/navlike', 'ref', 'integer' ),
	],
	block_composition: [
		{ block_slug: 'sgs/shell', composition_role: 'wrapper-shell' }, { block_slug: 'sgs/root', composition_role: 'section-root' },
		{ block_slug: 'sgs/logo', composition_role: 'leaf' }, { block_slug: 'sgs/business-info', composition_role: 'leaf' }, { block_slug: 'sgs/plain', composition_role: 'leaf' }, { block_slug: 'sgs/navlike', composition_role: 'leaf' },
	],
	block_capabilities: [ { block_slug: 'sgs/logo', capability: 'logo' } ],
};
test( 'every setting skeletonSettings claims is written by contentAttrs or carriedAttrs', () => {
	const db = openDb( fixtureDb( SK ) );
	const facts = loadFacts( { db, client: '' } );
	const m = { words: ( e ) => e.words ?? '', textWithBreaks: ( e ) => e.words ?? '', blockKids: () => [], els: [], byKey: {} };
	const carried = { logo: () => ( { id: 5, asset: 'logo.png' } ), menu: () => 9 };
	const { contentAttrs, carriedAttrs } = makeContent( { m, facts, view: 1440, carried, surfaceKind: 'header', siteLink: ( href ) => ( { kind: 'url', value: href } ) } );
	const e = { key: 'k', tag: 'nav', words: 'Hello', display: 'flex', flexDirection: 'column', attrs: { href: '/x', target: '_blank' } };
	const writes = ( block, top = {} ) => new Set( [ ...Object.keys( contentAttrs( block, e, top ).a ), ...Object.keys( carriedAttrs( block, e ).attrs ) ] );
	// Each block is driven as a plain element and, for the Site Info block, as a Site Info line too: a claim holds when some input writes it.
	const cases = [ [ 'sgs/shell', [ {} ] ], [ 'sgs/root', [ {} ] ], [ 'sgs/logo', [ {} ] ], [ 'sgs/business-info', [ {}, { siteInfoKind: 'copyright' } ] ], [ 'sgs/plain', [ {} ] ], [ 'sgs/navlike', [ {} ] ] ];
	const claimedAll = [];
	for ( const [ block, tops ] of cases ) {
		const s = skeletonSettings( facts, block );
		const claimed = [ s.text, s.link, ...s.others ].filter( Boolean );
		claimedAll.push( ...claimed );
		const w = new Set( tops.flatMap( ( top ) => [ ...writes( block, top ) ] ) );
		assert.deepEqual( claimed.filter( ( a ) => ! w.has( a ) ), [], `${ block }: a claimed setting the skeleton writer never writes` );
	}
	for ( const a of [ 'tagName', 'layout', 'logoId', 'displayType', 'copyrightPrefix', 'heading', 'url', 'linkTarget', 'ref' ] ) {
		assert.ok( claimedAll.includes( a ), `${ a } is claimed by some fixture block` );
	}
} );
