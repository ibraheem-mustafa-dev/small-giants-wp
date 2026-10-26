// The four follow-ups of forms by reference: Fill writes nothing on or inside a linked `sgs/form` embed and reads the form
// surface's own component's schema (lib/fill-form.mjs::formWrites, formSources); the UNMAPPED rows keep the `checks` and
// `unchecked` fields (lib/fill-report.mjs::unmappedList); intake's own propose call passes the saved form links
// (lib/intake-skeletons.mjs::proposeSkeletons); a form surface's saved inventory has one implementation
// (lib/skeleton-saved-inventory.mjs::servedInventoryOf, used by site-run.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { formWrites, formSources } from '../lib/fill-form.mjs';
import { unmappedList } from '../lib/fill-report.mjs';
import { checksRan } from '../lib/fill-resolve-element.mjs';
import { mapResolverGap } from '../lib/gap-classes.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { surfaceRoots, proposeSkeletons } from '../lib/intake-skeletons.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import * as siteRun from '../site-run.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const attr = ( block, name, type, extra = {} ) => ( { block_slug: block, attr_name: name, attr_type: type, ...extra } );
const blocks = ( ...slugs ) => slugs.map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) );
const db = openDb( fixtureDb( {
	blocks: blocks( 'sgs/form', 'sgs/form-step', 'sgs/form-field-text' ),
	block_attributes: [
		attr( 'sgs/form', 'savedProgress', 'boolean', { default_value: 'false' } ),
		attr( 'sgs/form-step', 'label', 'string', { default_value: '""' } ),
		attr( 'sgs/form-field-text', 'placeholder', 'string', { default_value: '""' } ),
	],
} ) );

const step = ( label ) => ( { label, fields: [ { name: `${ label }Field`, label } ] } );
const entry = ( labels ) => ( { entries: [ { name: 'schema', source: 'getter', kind: 'array', length: labels.length, value: labels.map( step ) } ] } );
// Trade is the first schema in the record, Careers the second; only Trade's script stores progress in the browser.
const FACTS = { logic: { statics: { Trade: entry( [ 'Business', 'Contact' ] ), Careers: entry( [ 'Role', 'Referee' ] ) } }, elements: {} };
const FLAGS = [ { kind: 'prototype-only', draftId: 'Trade.dc.html:js:1:1', text: 'localStorage.setItem(KEY, v)', why: 'browser storage write' } ];

const rec = ( index, name ) => ( { index, name, targets: [ { id: `${ index }:`, slot: '' } ] } );
const run = ( { flat, component, nodes } ) => formWrites( { nodes: nodes || flat.map( ( n, i ) => rec( i, n.name ) ), flat, refOf: ( n ) => n.ref, reads: { widths: { 1440: {} } }, facts: FACTS, flags: FLAGS, db, component } );
const form = ( attributes = {}, innerBlocks = [] ) => ( { name: 'sgs/form', attributes, innerBlocks, ref: 'form' } );

test( 'MUST FAIL: a form surface is given its own component\'s schema, not the first schema in the record', () => {
	const own = [ form(), { name: 'sgs/form-step', attributes: {}, innerBlocks: [], ref: 's0' }, { name: 'sgs/form-step', attributes: {}, innerBlocks: [], ref: 's1' } ];
	const careers = run( { flat: own, component: 'Careers' } );
	assert.deepEqual( careers.writes.map( ( w ) => [ w.node, w.attr, w.after ] ), [ [ 's0', 'label', 'Role' ], [ 's1', 'label', 'Referee' ] ], 'Careers\' steps, and no savedProgress: only Trade\'s script stores progress' );
	const trade = run( { flat: [ form(), { name: 'sgs/form-step', attributes: {}, innerBlocks: [], ref: 's0' } ], component: 'Trade' } );
	assert.deepEqual( trade.writes.map( ( w ) => [ w.node, w.attr, w.after ] ), [ [ 'form', 'savedProgress', true ], [ 's0', 'label', 'Business' ] ] );
	assert.deepEqual( run( { flat: [ form() ], component: 'Nothing' } ).writes, [], 'a component that holds no schema writes no form settings' );
} );

test( 'MUST FAIL: Fill writes nothing on a linked sgs/form embed, nor on a block inside one', () => {
	const field = { name: 'sgs/form-field-text', attributes: {}, innerBlocks: [], ref: 'f' };
	const flat = [ form( { formIsLinked: true, formId: 'enquiry' }, [ field ] ), field ];
	const out = formWrites( { nodes: flat.map( ( n, i ) => rec( i, n.name ) ), flat, refOf: ( n ) => n.ref, reads: { widths: { 1440: { '1:': { form: { tag: 'input', type: 'text', placeholder: 'Your name' } } } } }, facts: FACTS, flags: FLAGS, db, component: 'Trade' } );
	assert.deepEqual( out.writes, [] );
	assert.deepEqual( out.unmapped, [] );
	assert.equal( run( { flat: [ form( { formIsLinked: false } ) ], component: 'Trade' } ).writes.length, 1, 'an unlinked form is written as before' );
} );

test( 'MUST FAIL: a read on a block inside a linked sgs/form embed ends as one settled row naming the linked form, never silence', () => {
	const field = { name: 'sgs/form-field-text', attributes: {}, innerBlocks: [], ref: 'f' };
	const quiet = { name: 'sgs/form-field-text', attributes: {}, innerBlocks: [], ref: 'q' };
	const flat = [ form( { formIsLinked: true, formId: 'enquiry' }, [ field, quiet ] ), field, quiet ];
	const reads = { widths: { 375: { '1:': { form: { tag: 'input', type: 'text' } } }, 1440: { '1:': { form: { tag: 'input', type: 'text' } }, '2:': { missing: true } } } };
	const out = formWrites( { nodes: flat.map( ( n, i ) => rec( i, n.name ) ), flat, refOf: ( n ) => n.ref, reads, facts: FACTS, flags: FLAGS, db, component: 'Trade' } );
	assert.equal( out.settled.length, 1, 'one row, for the node the draft read; a node that read missing has none' );
	const [ row ] = out.settled;
	assert.deepEqual( [ row.node, row.block, row.property, row.value, row.reason, row.widths ], [ 'f', 'sgs/form-field-text', '(linked form)', 'enquiry', 'row-held', [ 375, 1440 ] ] );
	assert.match( row.detail, /linked form "enquiry"/ );
	assert.deepEqual( run( { flat: [ form( { formIsLinked: false } ) ], component: 'Trade' } ).settled, [], 'an unlinked form raises no linked-form row' );
} );

test( 'MUST FAIL: formSources reads the form surface\'s own component, not the first schema\'s', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'form-sources-' ) );
	fs.writeFileSync( path.join( dir, 'Trade.dc.html' ), '<script>x</script>' );
	fs.writeFileSync( path.join( dir, 'Careers.dc.html' ), '<script>y</script>' );
	assert.deepEqual( Object.keys( formSources( dir, FACTS, 'Careers' ) ), [ 'Careers' ] );
	assert.deepEqual( Object.keys( formSources( dir, FACTS ) ), [ 'Trade' ], 'no component named: the first schema, as before' );
} );

test( 'MUST FAIL: an UNMAPPED row keeps the checks and unchecked fields the resolver recorded, so the census classes it from them', () => {
	const row = { property: 'color', value: '#fff', node: 'a', block: 'sgs/icon', slot: '', reason: 'no-setting: x', ...checksRan( { layer: false, alternates: [], res: { equivalence: true }, eq: null } ) };
	const [ out ] = unmappedList( [ row ] );
	assert.deepEqual( out.checks, row.checks );
	assert.deepEqual( out.unchecked, [ 'ancestor' ] );
	const done = unmappedList( [ { ...row, checks: [ ...row.checks, 'ancestor' ], unchecked: [] } ] )[ 0 ];
	assert.notEqual( mapResolverGap( 'no-setting', done ).reason, 'unchecked', 'a row that records every check is judged on them' );
	assert.equal( 'checks' in unmappedList( [ { property: 'gap', value: '4px', node: 'a', reason: 'y', block: 'sgs/icon' } ] )[ 0 ], false, 'a row with no checks adds no field' );
} );

test( 'a form surface\'s saved inventory has one implementation: site-run.mjs reuses lib/skeleton-saved-inventory.mjs', () => {
	assert.equal( 'servedInventory' in siteRun, false );
} );


test( 'MUST FAIL: intake\'s own propose call passes the saved form links', async () => {
	const FIXTURE = path.join( HERE, 'fixtures', 'intake-skeletons' );
	const { manifestHash } = recheckManifest( FIXTURE );
	const harPath = path.join( os.tmpdir(), 'sgs-intake-skeletons-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: 'Home.dc.html', harPath } );
	}
	const census = await staticCensus( { folder: FIXTURE, entry: 'Home.dc.html', harPath } );
	const surfaces = surfaceRoots( { folder: FIXTURE, census } ).surfaces.filter( ( s ) => 'site-header' === s.slug );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'intake-links-' ) );
	const build = path.join( repo, 'sites', 'links-fixture', 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { 'form-enquiry': { intakeSurface: 'enquiry-form', provides: [ 'sgs/form:enquiry' ] } } ) );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'enquiry-form': { id: 'S-59' } } } ) );
	const seen = [];
	const r = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces, client: 'links-fixture', repo, db, facts: loadFacts( { db, client: 'links-fixture' } ), propose: ( a ) => {
		seen.push( a.formLinks );
		return proposeSkeleton( a );
	} } );
	assert.equal( r.skeletons[ 0 ].gap, undefined );
	assert.deepEqual( seen, [ [ { recordId: 'S-59', slug: 'enquiry', block: 'sgs/form' } ] ] );
} );
