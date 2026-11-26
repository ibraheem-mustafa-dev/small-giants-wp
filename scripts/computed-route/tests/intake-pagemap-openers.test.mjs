// Spec 48 FR-48-95: the page map records every control that opens a modal, starts a choice flow or fills a form row, as
// `opens: [{ kind, slug }]` on the row holding the control (lib/intake-pagemap-openers.mjs), read from the draft code.
// Fixture tests/fixtures/surface-openers: one draft routed by state. The header's "Size guide" link and the product page's
// "Which size am I?" open the size modal; the product buy box's "Add my prescription" and a lower section's "Add lenses" open
// the lens flow (only the first is in the buy box); the home page's "Planning an event?" fills the contact form's topic; the
// form's own "An event" chip and the size modal's own "Back to sizes" are part of their targets; the bag drawer's "Add lenses"
// sits in a part the cart block draws (a gap row). Negative controls rewrite a handler in a temp copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems } from '../lib/intake-pagemap.mjs';
import { surfaceOpeners, OPENABLE } from '../lib/intake-pagemap-openers.mjs';
import { mapChanges } from '../lib/intake-pagemap-regen.mjs';
import { loadExport, readRouting } from '../lib/intake-routing.mjs';
import { codeSurfaces } from '../lib/intake-pagemap-surfaces.mjs';
import { crossCheck } from '../lib/intake-pagemap-hints.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'surface-openers' );
const DRAFT = fs.readFileSync( path.join( FIX, 'Store.dc.html' ), 'utf8' );
const row = ( map, slug ) => map.rows.find( ( r ) => r.slug === slug );

// A temp copy of the fixture with each [ find, replace ] pair applied in turn (each find occurring once).
function variant( ...pairs ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'surface-openers-' ) );
	fs.copyFileSync( path.join( FIX, 'surfaces.json' ), path.join( dir, 'surfaces.json' ) );
	let text = DRAFT;
	for ( const [ find, replace ] of pairs ) {
		assert.equal( text.split( find ).length, 2, `the fixture holds "${ find }" once` );
		text = text.replace( find, replace );
	}
	fs.writeFileSync( path.join( dir, 'Store.dc.html' ), text );
	return dir;
}

// The reader run on its own over a proposed map's rows (with `opens` removed first): { gaps, list, rows }.
function read( folder ) {
	const rows = proposePageMap( { folder } ).rows.map( ( { opens, ...r } ) => ( void opens, { ...r } ) );
	const exp = loadExport( folder );
	const route = readRouting( { folder } );
	const code = codeSurfaces( exp, () => null, new Set( route.routes.map( ( x ) => x.key ) ), route.links );
	const hint = JSON.parse( fs.readFileSync( path.join( folder, 'surfaces.json' ), 'utf8' ) );
	return { ...surfaceOpeners( { exp, rows, hint, pageOfTag: code.pageOfTag, surfaces: crossCheck( code.surfaces, hint ).surfaces } ), rows };
}

test( 'MUST FAIL: the proposed page map lists each opener on the row holding it, one entry per target', () => {
	const map = proposePageMap( { folder: FIX } );
	assert.deepEqual( row( map, 'header' ).opens, [ { kind: 'modal', slug: 'modal-size-guide' } ] );
	assert.deepEqual( row( map, 'product' ).opens, [ { kind: 'modal', slug: 'modal-size-guide' }, { kind: 'flow', slug: 'choice-flow-lens-configurator', buyBox: true } ] );
	assert.deepEqual( row( map, 'home' ).opens, [ { kind: 'form', slug: 'form-contact-form' } ] );
	assert.deepEqual( map.rows.filter( ( r ) => r.opens ).map( ( r ) => r.slug ).sort(), [ 'header', 'home', 'product' ], 'no other row opens anything' );
	assert.deepEqual( pageMapProblems( map.rows ), [], 'the map with opens validates' );
	assert.equal( row( map, 'product' ).opensFlow, 'choice-flow-lens-configurator', 'opensFlow keeps working for its readers' );
	assert.ok( map.gaps.some( ( g ) => /"Add lenses" opens the flow choice-flow-lens-configurator, but it sits in the drawer "Your bag" that a block draws whole/.test( g.error ) ), 'the bag drawer control is a gap row' );
} );

test( 'MUST FAIL: each opening control is listed with its words, kind, target and holder; controls inside their own target are not', () => {
	const { list, gaps } = read( FIX );
	assert.deepEqual( list.map( ( o ) => [ o.words, o.kind, o.slug, o.holder, !! o.buyBox ] ), [
		[ 'Size guide', 'modal', 'modal-size-guide', 'header', false ],
		[ 'Planning an event?', 'form', 'form-contact-form', 'home', false ],
		[ 'Which size am I?', 'modal', 'modal-size-guide', 'product', false ],
		[ 'Add my prescription', 'flow', 'choice-flow-lens-configurator', 'product', true ],
		[ 'Add lenses', 'flow', 'choice-flow-lens-configurator', 'product', false ],
	] );
	assert.ok( list.every( ( o ) => /^Store\.dc\.html:\d+:\d+$/.test( o.control ) ), 'each control is named by file:line:col' );
	assert.equal( gaps.length, 1 );
	assert.match( gaps[ 0 ].draftId, /^Store\.dc\.html:\d+:\d+$/ );
} );

test( 'negative control: a control that closes, only steps the target or writes part of its opening is no opener', () => {
	const closes = read( variant( [ '<a href="#" onClick="{{ openSize }}">Size guide</a>', '<a href="#" onClick="{{ closeModal }}">Size guide</a>' ] ) );
	assert.equal( closes.rows.find( ( r ) => 'header' === r.slug ).opens, undefined );
	const steps = read( variant( [ '<button onClick="{{ openLens }}">Add my prescription</button>', '<button onClick="{{ closeLens }}">Add my prescription</button>' ] ) );
	assert.deepEqual( steps.list.filter( ( o ) => 'flow' === o.kind ).map( ( o ) => o.words ), [ 'Add lenses' ] );
	assert.equal( steps.rows.find( ( r ) => 'product' === r.slug ).opens.find( ( o ) => 'flow' === o.kind ).buyBox, undefined, 'only a lower section opens the flow: no buy box' );
	const part = read( variant( [ 'moreLens: () => setL({ open: true, step: 0 }),', 'moreLens: () => setL({ step: 0 }),' ] ) );
	assert.deepEqual( part.list.filter( ( o ) => 'Add lenses' === o.words ), [], 'a control writing only part of the opening writes opens nothing' );
	const other = read( variant( [ "askEvent: () => this.setState({ page: 'contact', topic: 'event' }),", "askEvent: () => this.setState({ page: 'contact', topic: 'other' })," ] ) );
	assert.equal( other.rows.find( ( r ) => 'home' === r.slug ).opens, undefined, 'another topic value fills nothing the record opens' );
	const none = read( FIX );
	assert.deepEqual( surfaceOpeners( { exp: loadExport( FIX ), rows: none.rows, hint: null, pageOfTag: () => null, surfaces: [] } ), { gaps: [], list: [] }, 'no surfaces.json, no opening writes, no opener' );
} );

test( 'MUST FAIL: only modal, flow and form rows are targets, and a regeneration prints an opens change', () => {
	assert.deepEqual( OPENABLE, { sgs_modal: 'modal', sgs_choice_flow: 'flow', sgs_form: 'form' } );
	const map = proposePageMap( { folder: FIX } );
	const bad = map.rows.map( ( r ) => ( r.opens ? { ...r, opens: [ { kind: 'popup', slug: 'modal-size-guide' } ] } : r ) );
	assert.ok( pageMapProblems( bad ).some( ( p ) => /opens/.test( p ) ), 'an opens entry of no known kind is refused' );
	const badSlug = map.rows.map( ( r ) => ( r.opens ? { ...r, opens: [ { kind: 'modal', slug: 'Size Guide' } ] } : r ) );
	assert.ok( pageMapProblems( badSlug ).some( ( p ) => /opens/.test( p ) ), 'an opens entry whose target is no slug is refused' );
	const before = map.rows.map( ( { opens, ...rest } ) => ( void opens, rest ) );
	assert.ok( mapChanges( before, map.rows ).includes( 'sgs_header:header: opens (none) -> [{"kind":"modal","slug":"modal-size-guide"}]' ), 'the change to opens is printed' );
} );

test( 'MUST FAIL: the surface holding a control wins over the page holding it', () => {
	const { list } = read( variant( [ '<footer><nav><a href="#" onClick="{{ toHome }}">Home</a></nav>', '<footer><nav><a href="#" onClick="{{ toHome }}">Home</a><a href="#" onClick="{{ openSize }}">Sizes</a></nav>' ] ) );
	assert.deepEqual( list.filter( ( o ) => 'Sizes' === o.words ).map( ( o ) => o.holder ), [ 'footer' ] );
	const inForm = read( variant( [ '<label>Name<input name="name"></label>', '<a href="#" onClick="{{ openSize }}">Size chart</a><label>Name<input name="name"></label>' ] ) );
	assert.deepEqual( inForm.list.filter( ( o ) => 'Size chart' === o.words ).map( ( o ) => o.holder ), [ 'form-contact-form' ], 'the form surface holding the control wins over the contact page' );
} );

test( 'MUST FAIL: buy box marks only the flow entry of a product row, whichever of its controls comes first', () => {
	const home = read( variant( [ '<main><h1>Welcome</h1>', '<main><div><h1>Welcome</h1><button onClick="{{ openLens }}">Try lenses</button></div>' ] ) );
	assert.deepEqual( home.list.filter( ( o ) => 'Try lenses' === o.words ).map( ( o ) => [ o.holder, !! o.buyBox ] ), [ [ 'home', false ] ] );
	assert.deepEqual( home.rows.find( ( r ) => 'home' === r.slug ).opens.find( ( o ) => 'flow' === o.kind ), { kind: 'flow', slug: 'choice-flow-lens-configurator' } );
	// The lower section moved above the buy box: its plain control is read first.
	const section = '  <section><h2>Lenses for any frame</h2><button onClick="{{ moreLens }}">Add lenses</button></section>\n';
	const first = read( variant( [ section, '' ], [ '<sc-if value="{{ isProduct }}"><main>\n', `<sc-if value="{{ isProduct }}"><main>\n${ section }` ] ) );
	assert.deepEqual( first.list.filter( ( o ) => 'flow' === o.kind ).map( ( o ) => o.words ), [ 'Add lenses', 'Add my prescription' ] );
	assert.deepEqual( first.rows.find( ( r ) => 'product' === r.slug ).opens.find( ( o ) => 'flow' === o.kind ), { kind: 'flow', slug: 'choice-flow-lens-configurator', buyBox: true }, 'a buy-box control after a plain one still marks the entry' );
} );

// A target whose open states run on a named component (`dcLogic('Home').setState(…)`) is opened only by a control in that
// component's draft (lib/intake-pagemap-flow-openers.mjs::openingComponents). On Mama's, the Home build form's subscribe state
// matched the product page's own subscribe button, so the product row listed the Home form as a flow its buy box opens.
function hintVariant( reach ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'surface-openers-' ) );
	fs.copyFileSync( path.join( FIX, 'Store.dc.html' ), path.join( dir, 'Store.dc.html' ) );
	const hint = JSON.parse( fs.readFileSync( path.join( FIX, 'surfaces.json' ), 'utf8' ) );
	hint.records.find( ( r ) => 'S-04' === r.id ).states.find( ( st ) => 'open' === st.name ).how_to_reach = reach;
	fs.writeFileSync( path.join( dir, 'surfaces.json' ), JSON.stringify( hint ) );
	return dir;
}

test( 'MUST FAIL: a flow whose open state runs on another component (dcLogic(\'Home\')) is opened by no control of the Store draft', () => {
	const map = proposePageMap( { folder: hintVariant( "dcLogic('Home').setState({lens:{open:true}})" ) } );
	assert.deepEqual( row( map, 'product' ).opens, [ { kind: 'modal', slug: 'modal-size-guide' } ] );
	assert.equal( row( map, 'product' ).opensFlow, undefined );
} );

test( 'negative control: the same open state naming the Store component still lists the buy box\'s flow', () => {
	const map = proposePageMap( { folder: hintVariant( "dcLogic('Store').setState({lens:{open:true}})" ) } );
	assert.deepEqual( row( map, 'product' ).opens, [ { kind: 'modal', slug: 'modal-size-guide' }, { kind: 'flow', slug: 'choice-flow-lens-configurator', buyBox: true } ] );
} );
