// Spec 48 FR-48-25 and FR-48-29, lib/intake-inventory*.mjs and lib/intake-props.mjs: the inventory re-derived from the
// census of a fixture export (tests/fixtures/intake-inventory/export/) that holds one effect of every kind: an inline
// transition with a style-hover, an instant pseudo rule, a CSS animation naming an @keyframes rule and an unused one, a
// reduced-motion @media rule, a Web Animations call in componentDidUpdate behind a reduced-motion guard and one in an
// IntersectionObserver callback, an interval that writes a style, a toggling sc-if with an opening and a closing
// handler, a breakpoint sc-if, and a Card component with an enum prop a parent mounts with a non-default value and one
// no parent passes. Each rule has a MUST FAIL case that removes its mechanism. The fixture's replay HAR is recorded
// once into the OS temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus, runCensus } from '../lib/intake-census.mjs';
import { loadRegistry } from '../lib/intake-registry.mjs';
import { buildInventory, inventoryCore, occurrences, reconcile, validateInventory, readInventory, inventoryStage } from '../lib/intake-inventory.mjs';
import { sampleTargets, sampleWriters } from '../lib/intake-inventory-sample.mjs';
import { propVariants, declaredProps } from '../lib/intake-props.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const EXPORT = path.join( HERE, 'fixtures', 'intake-inventory', 'export' );
const ENTRY = 'Home.dc.html';
let harPath;
let census;

test.before( async () => {
	const { manifestHash } = recheckManifest( EXPORT );
	harPath = path.join( os.tmpdir(), 'sgs-intake-inventory-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: EXPORT, index: ENTRY, harPath } );
	}
	census = await staticCensus( { folder: EXPORT, entry: ENTRY, harPath } );
} );

// A deep enough copy of the census to change one source's logic or one stamped attribute.
const clone = ( c ) => ( {
	rows: c.rows.map( ( r ) => ( { ...r, detail: { ...r.detail, ...( r.detail.props ? { props: [ ...r.detail.props ] } : {} ) } } ) ),
	sources: c.sources.map( ( s ) => ( { ...s, stamped: { ...s.stamped, elements: s.stamped.elements.map( ( e ) => ( { ...e, attrs: e.attrs.map( ( a ) => [ ...a ] ) } ) ) } } ) ),
} );
// Replaces text in a component's logic with text of the same length, so every census position stays valid.
const relogic = ( c, comp, from, to ) => {
	assert.equal( from.length, to.length );
	const s = c.sources.find( ( x ) => x.component === comp );
	assert.ok( s.logic.includes( from ), `${ comp } logic holds ${ from }` );
	s.logic = s.logic.split( from ).join( to );
	return c;
};
const build = ( c = census, opts = {} ) => buildInventory( { census: c, folder: EXPORT, ...opts } );
const rec = ( inv, pred ) => inv.animations.records.find( pred );

test( 'POSITIVE: the fixture inventory validates against both master schemas and every counted occurrence maps to a record ID', () => {
	const inv = build();
	assert.deepEqual( inv.problems, [] );
	const kinds = new Set( inv.occurrences.map( ( o ) => o.kind ) );
	for ( const k of [ 'waapi', 'transition', 'keyframes', 'style-hover', 'js-writer', 'timer', 'observer', 'handler', 'ref', 'data-hook', 'sc-if' ] ) {
		assert.ok( kinds.has( k ), `an occurrence of kind ${ k }` );
	}
	assert.ok( inv.occurrences.every( ( o ) => o.recordIds.length ) );
	assert.deepEqual( Object.fromEntries( Object.entries( inv.animations.counts ).map( ( [ k, v ] ) => [ k, v.total ] ) ), { animate_calls: 2, inline_transitions: 1, pseudo_rules: 2, css_animations: 4, js_style_writers: 1 } );
} );

test( 'MUST FAIL: an occurrence whose record mapping is removed is named by the reconciliation', () => {
	const core = inventoryCore( census );
	const occ = occurrences( census, core.model, { ...core.anim, census: new Map() }, core.surf );
	const problems = reconcile( { animations: { records: core.anim.records, counts: core.anim.counts }, surfaces: { records: core.surf.records, counts: core.surf.counts }, occurrences: occ } );
	assert.ok( problems.some( ( p ) => /^occurrence waapi@Home:js:\d+:\d+ \(waapi\) maps to no record$/.test( p ) ), problems.join( '\n' ) );
	assert.ok( problems.some( ( p ) => /^occurrence style-hover@Home:4\/hover \(style-hover\) maps to no record$/.test( p ) ) );
} );

test( 'MUST FAIL: a record missing a required field fails the master animations schema; a surface with no state fails the surfaces schema', () => {
	const inv = build();
	const broken = structuredClone( { animations: inv.animations, surfaces: inv.surfaces } );
	delete broken.animations.records[ 0 ].trace;
	broken.surfaces.records[ 0 ].states = [];
	const problems = validateInventory( broken );
	assert.ok( problems.some( ( p ) => p.startsWith( 'animations: /records/0 must have required property \'trace\'' ) ), problems.join( '\n' ) );
	assert.ok( problems.some( ( p ) => p.startsWith( 'surfaces: /records/0/states must NOT have fewer than 1 items' ) ), problems.join( '\n' ) );
} );

test( 'template records: a transition runs from the inline value to the style-hover value on hover; a pseudo rule with no transition is instant', () => {
	const inv = build();
	const tr = rec( inv, ( r ) => 'css-transition' === r.mechanism && '3' === r.element.template_tpl_id );
	assert.deepEqual( [ tr.trigger.type, tr.properties, tr.duration_ms, tr.easing ], [ 'hover', [ { property: 'color', from: '#0a7ea8', to: '#075e80' } ], 200, 'ease' ] );
	const ps = rec( inv, ( r ) => 'css-pseudo' === r.mechanism );
	assert.deepEqual( [ ps.element.template_tpl_id, ps.properties, ps.duration_ms ], [ '4', [ { property: 'color', from: '#222', to: '#cc0000' } ], 0 ] );
} );

test( 'keyframes: an @keyframes rule maps to the record that names it; one nothing names is its own dead-code record; the reduced-motion rule is an RM record', () => {
	const inv = build();
	const spin = rec( inv, ( r ) => 'css-animation' === r.mechanism && '5' === r.element.template_tpl_id );
	assert.deepEqual( [ spin.properties[ 0 ].to, spin.duration_ms, spin.iterations, spin.easing, spin.status ], [ 'inv-spin', 2000, 'infinite', 'linear', 'active' ] );
	assert.deepEqual( inv.occurrences.find( ( o ) => o.occurrence.includes( '/@keyframes:inv-spin' ) ).recordIds, [ spin.id ] );
	const unused = rec( inv, ( r ) => '@keyframes inv-unused' === r.element.selector );
	assert.equal( unused.status, 'dead-code' );
	const rm = rec( inv, ( r ) => 'css-media' === r.mechanism );
	assert.equal( rm.trigger.detail, '(prefers-reduced-motion: reduce)' );
	assert.equal( spin.reduced_motion.behaviour, 'final-state' );
	assert.match( spin.reduced_motion.detail, new RegExp( `^${ rm.id } ` ) );
} );

test( 'MUST FAIL: a K record carries its @keyframes rule\'s animated properties after the animation-name row', () => {
	const inv = build();
	const spin = rec( inv, ( r ) => 'css-animation' === r.mechanism && '5' === r.element.template_tpl_id );
	assert.deepEqual( spin.properties, [ { property: 'animation-name', from: null, to: 'inv-spin' }, { property: 'transform', from: 'rotate(0deg)', to: 'rotate(360deg)' } ], 'two stops: from and to, no keyframes key' );
	assert.deepEqual( rec( inv, ( r ) => '@keyframes inv-unused' === r.element.selector ).properties.map( ( p ) => p.property ), [ 'animation-name', 'opacity' ], 'the dead-code record carries them too' );
	const stopped = clone( census );
	const row = stopped.rows.find( ( r ) => 'keyframes' === r.kind && 'inv-spin' === r.detail.name );
	row.detail.stops = [ { key: 'from', decls: [ [ 'opacity', '0' ], [ 'transform', 'scale(0.5)' ] ] }, { key: '50%', decls: [ [ 'transform', 'scale(1.2)' ] ] }, { key: 'to', decls: [ [ 'opacity', '1' ], [ 'transform', 'scale(1)' ], [ 'animation-timing-function', 'ease' ] ] } ];
	const three = rec( build( stopped ), ( r ) => 'css-animation' === r.mechanism && '5' === r.element.template_tpl_id );
	assert.deepEqual( three.properties, [
		{ property: 'animation-name', from: null, to: 'inv-spin' },
		{ property: 'opacity', from: '0', to: '1' },
		{ property: 'transform', from: 'scale(0.5)', to: 'scale(1)', keyframes: [ { offset: 0, value: 'scale(0.5)' }, { offset: 0.5, value: 'scale(1.2)' }, { offset: 1, value: 'scale(1)' } ] },
	], 'three stops on one property give keyframes at 0, 0.5 and 1; a property missing at a stop is absent from it; animation-* is not a value' );
	row.detail.stops = [ { key: '0%, 100%', decls: [ [ 'opacity', '1' ] ] }, { key: '50%', decls: [ [ 'opacity', '0.3' ] ] } ];
	const comma = rec( build( stopped ), ( r ) => 'css-animation' === r.mechanism && '5' === r.element.template_tpl_id );
	assert.deepEqual( comma.properties[ 1 ], { property: 'opacity', from: '1', to: '1', keyframes: [ { offset: 0, value: '1' }, { offset: 0.5, value: '0.3' }, { offset: 1, value: '1' } ] }, 'a comma list applies one block to both offsets' );
	assert.deepEqual( build( stopped ).problems, [], 'the record still validates against the animations schema' );
} );

test( 'Web Animations: the ref target, the componentDidUpdate state key and the reduced-motion guard; the observer callback is a scroll-into-view trigger', () => {
	const inv = build();
	const panel = rec( inv, ( r ) => 'waapi' === r.mechanism && 'componentDidUpdate' === r.source.function );
	assert.deepEqual( [ panel.element.template_tpl_id, panel.element.selector, panel.trigger.type, panel.trigger.state_keys ], [ '8', 'ref setPanel', 'state', [ 'open' ] ] );
	assert.deepEqual( panel.properties, [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(-8px)', to: 'none' } ] );
	assert.deepEqual( [ panel.duration_ms, panel.easing, panel.reduced_motion.behaviour ], [ 300, 'ease-out', 'skip' ] );
	const reveal = rec( inv, ( r ) => 'waapi' === r.mechanism && 'componentDidMount' === r.source.function );
	assert.deepEqual( [ reveal.trigger.type, reveal.duration_ms, reveal.reduced_motion.behaviour ], [ 'scroll-into-view', 400, 'unchanged' ] );
	assert.equal( fs.readFileSync( path.join( EXPORT, ENTRY ), 'utf8' ).split( '\n' )[ panel.source.line - 1 ].includes( 'this._panel.animate(' ), true, 'source.line is the file line' );
} );

test( 'MUST FAIL: with the reduced-motion guard renamed, the panel animation runs unchanged under reduced motion', () => {
	const inv = build( relogic( clone( census ), 'Home', '! this.rm )', '! this.zz )' ) );
	assert.equal( rec( inv, ( r ) => 'componentDidUpdate' === r.source.function && 'waapi' === r.mechanism ).reduced_motion.behaviour, 'unchanged' );
} );

test( 'JS writers: the interval writer is a J record on its ref element, triggered every 200ms; its timer maps to it', () => {
	const inv = build();
	const j = rec( inv, ( r ) => 'js-style-write' === r.mechanism );
	assert.deepEqual( [ j.element.template_tpl_id, j.trigger.type, j.trigger.detail, j.properties[ 0 ].property, j.iterations ], [ '12', 'interval', 'setInterval every 200ms', 'width', 'infinite' ] );
	assert.deepEqual( inv.occurrences.find( ( o ) => 'timer' === o.kind ).recordIds, [ j.id ] );
	assert.deepEqual( inv.occurrences.find( ( o ) => 'observer' === o.kind ).recordIds, [ rec( inv, ( r ) => 'scroll-into-view' === r.trigger.type ).id ] );
} );

test( 'surfaces: the open sc-if is a toggling surface with the forced patches and the handlers that open and close it; the width sc-if is a breakpoint', () => {
	const inv = build();
	const s = inv.surfaces.records.find( ( r ) => '7' === r.template_tpl_id );
	assert.deepEqual( s.states.map( ( x ) => x.state_keys ), [ { open: true } ] );
	assert.match( s.states[ 0 ].how_to_reach, /setDraftState\(\{ component: "Home", keys: \{"open":true\} \}\)/ );
	assert.match( s.opened_by, /onClick on Home:6 \(toggle\)/ );
	assert.match( s.opened_by, /onClick on Home:9 \(close\)/ );
	assert.ok( s.states[ 0 ].animation_ids.includes( rec( inv, ( r ) => 'componentDidUpdate' === r.source.function ).id ) );
	assert.deepEqual( inv.surfaces.counts.toggling_sc_ifs.covered_by, { 'Home:7': s.id } );
	assert.deepEqual( Object.keys( inv.surfaces.counts.other_sc_ifs.breakpoint.covered_by ), [ 'Home:10' ] );
} );

test( 'MUST FAIL: when no handler writes the condition\'s state key, the surface has no opener', () => {
	const inv = build( relogic( clone( census ), 'Home', 'setState( { open:', 'setState( { opex:' ) );
	assert.equal( inv.surfaces.records.find( ( r ) => '7' === r.template_tpl_id ).opened_by, 'no code writes these keys' );
} );

test( 'FR-48-29: a variant a parent mounts is a state of the component\'s surface; an enum prop no parent mounts is listed, not built', () => {
	assert.deepEqual( Object.keys( declaredProps( fs.readFileSync( path.join( EXPORT, 'Card.dc.html' ), 'utf8' ) ).props ), [ 'size', 'tone' ] );
	const inv = build();
	const size = inv.propVariants.find( ( p ) => 'size' === p.prop );
	assert.deepEqual( [ size.default, size.variants, size.unused, size.unusedOptions, size.gates ], [ 'md', [ 'sm' ], false, [ 'lg' ], [ 'Card:2' ] ] );
	assert.deepEqual( size.mounted.find( ( m ) => 'sm' === m.value ).by, [ 'Home:14', 'Home:15' ] );
	const tone = inv.propVariants.find( ( p ) => 'tone' === p.prop );
	assert.deepEqual( [ tone.unused, tone.variants ], [ true, [] ] );
	const card = inv.surfaces.records.find( ( r ) => 'Card' === r.name );
	assert.deepEqual( card.states.map( ( s ) => s.name ), [ 'default', 'prop size=sm' ] );
	assert.deepEqual( card.states[ 1 ].state_keys, { 'props.size': 'sm' } );
	assert.equal( inv.surfaces.counts.other_sc_ifs[ 'prop-variant' ].covered_by[ 'Card:2' ], card.id );
} );

test( 'MUST FAIL (FR-48-29): with no parent passing size, sm is no state and size is listed unused', () => {
	const c = clone( census );
	c.rows.filter( ( r ) => 'dc-import' === r.kind ).forEach( ( r ) => ( r.detail.props = r.detail.props.filter( ( p ) => 'size' !== p ) ) );
	c.sources.find( ( s ) => 'Home' === s.component ).stamped.elements.filter( ( e ) => 'dc-import' === e.tag ).forEach( ( e ) => ( e.attrs = e.attrs.filter( ( [ a ] ) => 'size' !== a ) ) );
	const size = propVariants( { folder: EXPORT, census: c } ).props.find( ( p ) => 'size' === p.prop );
	assert.deepEqual( [ size.variants, size.unused ], [ [], true ] );
	assert.deepEqual( build( c ).surfaces.records.find( ( r ) => 'Card' === r.name ).states.map( ( s ) => s.name ), [ 'default' ] );
} );

test( 'readers: the committed registry reads every motion, trigger, hook, condition and style-rule construct of the fixture through readInventory and the census passes', async () => {
	const res = await runCensus( { census, registry: loadRegistry() } );
	assert.deepEqual( res.problems, [] );
	const read = res.rows.filter( ( r ) => 'lib/intake-inventory.mjs#readInventory' === r.reader );
	assert.deepEqual( [ ...new Set( read.map( ( r ) => r.kind ) ) ].sort(), [ 'data-hook', 'handler', 'keyframes', 'observer', 'ref', 'sc-if', 'style-hover', 'timer', 'transition', 'waapi' ] );
	for ( const r of read ) {
		assert.ok( readInventory( r, { rows: census.rows, sources: census.sources } ).recordIds.length, r.id );
	}
} );

test( 'MUST FAIL: a reader whose inventory does not map the construct is an empty reader and fails the census', async () => {
	const readers = { waapi: ( r, ctx ) => readInventory( r, { rows: ctx.rows.filter( ( x ) => 'waapi' !== x.kind ), sources: ctx.sources.map( ( s ) => ( { ...s } ) ) } ) };
	const res = await runCensus( { census, registry: loadRegistry(), readers } );
	assert.equal( res.pass, false );
	assert.ok( res.problems.every( ( p ) => /^empty reader waapi Home:js:\d+:\d+ \(lib\/intake-inventory\.mjs#readInventory\)$/.test( p ) ) && 2 === res.problems.length, res.problems.join( '\n' ) );
} );

test( 'sample mode: the interval writer is read at 0, the midpoint and the end of its interval at each width', async () => {
	const inv = build();
	const targets = sampleTargets( inv.animations.records, inv.meta );
	assert.deepEqual( targets.map( ( t ) => [ t.n, t.duration, t.properties ] ), [ [ '12', 200, [ 'width' ] ] ] );
	const s = await sampleWriters( { folder: EXPORT, index: ENTRY, harPath, targets, widths: [ 375, 1440 ] } );
	assert.deepEqual( s.gaps, [] );
	assert.deepEqual( s.samples.map( ( x ) => [ x.width, x.t, x.values.width.inline ] ), [ [ 375, 0, '0px' ], [ 375, 100, '0px' ], [ 375, 200, '10px' ], [ 1440, 0, '0px' ], [ 1440, 100, '0px' ], [ 1440, 200, '10px' ] ] );
} );

test( 'the intake stage returns the inventory parts, and a missing Claude Design copy is a diff row', async () => {
	const out = await inventoryStage( { folder: EXPORT, entry: ENTRY, harPath, widths: [ 1440 ] }, { routing: null, censusFull: census } );
	assert.deepEqual( Object.keys( out.inventory ), [ 'animations', 'surfaces', 'diff', 'occurrences', 'propVariants', 'samples' ] );
	assert.deepEqual( out.inventory.diff.map( ( r ) => r.rowId ), [ 'inventory:animations:missing', 'inventory:surfaces:missing' ] );
	assert.equal( out.inventory.samples.length, 3 );
	assert.equal( rec( out.inventory, ( r ) => 'js-style-write' === r.mechanism ).trace.observed, 'yes' );
	assert.deepEqual( out.gaps, [] );
} );

test( 'MUST FAIL: a @keyframes rule\'s stops become properties in offset order; a stop key that is not an offset is skipped, never a crash', async () => {
	const { keyframeProperties } = await import( '../lib/intake-inventory-anim.mjs' );
	assert.deepEqual( keyframeProperties( [ { key: '100%', decls: [ [ 'opacity', '1' ] ] }, { key: '0%', decls: [ [ 'opacity', '0' ] ] } ] ), [ { property: 'opacity', from: '0', to: '1' } ], 'source order to-then-from still reads from 0 to 1' );
	assert.deepEqual( keyframeProperties( [ { key: 'foo', decls: [ [ 'opacity', '1' ] ] }, { key: '0%', decls: [ [ 'transform', 'none' ] ] }, { key: '100%', decls: [ [ 'transform', 'scale(2)' ] ] } ] ), [ { property: 'transform', from: 'none', to: 'scale(2)' } ] );
} );
