// A hero (or any block with a calibrated content band) whose children sit in a wrapper the block does not draw: the wrapper is the
// draft's real child of the block's element, so it is the evidence of the content band's width. Help's hero holds a 900px column
// centred by a wrapper (display flex, column, align-items centre); its heading shrinks to its own text (454px), and the band
// was written as that text plus the hero's padding (533.58px), so "Help & FAQs" wrapped onto two lines on the clone (2026-11-19).
// The skeleton records the dissolved wrapper (lib/skeleton-write-slots.mjs::bandWrapper, node key draftBandWrappers) and Fill reads
// the band from it (lib/fill-band.mjs::fillBand). Pure functions only. Mutation list: tests/hero-band-wrapper.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { bandNeed } from '../lib/fill-band.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree, skeletonProblems, BAND_WRAPPER_SLOT } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = loadFacts( { db, client: 'fixture-client', repo: REPO } );
const CONTENT = '.sgs-hero__content';
const BAND = '.sgs-container__inner';
const calSettings = ( slug ) => ( 'sgs/hero' === slug ? { contentGap: { slot: CONTENT, slots: [ CONTENT ] }, contentWidth: { slot: BAND, slots: [ BAND ] } } : {} );

function inventory( nested = false ) {
	const els = [];
	const add = ( id, parent, tag, words = '', style = '' ) => {
		const depth = parent ? els.find( ( p ) => p.key === `Root/${ parent }#0` ).depth + 1 : 0;
		els.push( { key: `Root/${ id }#0`, parentKey: parent ? `Root/${ parent }#0` : null, depth, tag, template: 'Root', tpl: id, attrs: style ? { style } : {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ id }">${ words }</${ tag }>`, box: { 375: { x: 0, y: id * 30, w: 300, h: 20 }, 768: { x: 0, y: id * 30, w: 300, h: 20 }, 1440: { x: 0, y: id * 30, w: 300, h: 20 } }, visible: { 375: true, 768: true, 1440: true }, display: 'flex' === ( /display:(\w+)/.exec( style ) || [] )[ 1 ] ? 'flex' : 'block', flexDirection: 'row', screenshots: {} } );
	};
	add( 1, null, 'main' );
	add( 2, 1, 'section', '', 'padding:64px 40px' );
	add( 3, 2, 'div', '', 'max-width:900px;margin:0 auto;display:flex;flex-direction:column;gap:14px;align-items:center' );
	add( 4, 3, 'p', 'ask us anything' );
	nested && add( 7, 3, 'div', '', 'display:flex;flex-direction:column;gap:8px' );
	add( 5, nested ? 7 : 3, 'h1', 'Help and FAQs' );
	add( 6, nested ? 7 : 3, 'p', 'Search the answers or write to us.' );
	add( 90, 1, 'section', '', 'padding:72px 40px' );
	add( 91, 90, 'div', '', 'display:flex;flex-direction:column;gap:24px' );
	add( 92, 91, 'h2', 'Write to us' );
	add( 93, 91, 'p', 'We reply within a day.' );
	for ( const e of [ ...els ].reverse() ) {
		const parent = els.find( ( p ) => p.key === e.parentKey );
		parent && ( parent.allText = [ parent.allText, e.allText ].filter( Boolean ).join( ' ' ).trim() );
	}
	return { checks: {}, source: 'fixture', root: 'main', generated: 'fixture', elements: els };
}
const all = ( list ) => list.flatMap( ( n ) => [ n, ...all( n.innerBlocks || [] ) ] );
const heroOf = ( cal, nested = false ) => all( proposeSkeleton( { inventory: inventory( nested ), facts, surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, calSettings: cal } ).skeleton ).find( ( n ) => 'sgs/hero' === n.name );

test( 'MUST FAIL: the wrapper a hero dissolves is recorded as the evidence of its content band', () => {
	const hero = heroOf( calSettings );
	assert.deepEqual( hero.draftBandWrappers, [ { tpl: 'Root/3#0' } ] );
	assert.deepEqual( skeletonProblems( [ hero ] ), [] );
} );

test( 'a wrapper inside the dissolved wrapper is not a child of the block element, so only the outer one is recorded', () => {
	assert.deepEqual( heroOf( calSettings, true ).draftBandWrappers, [ { tpl: 'Root/3#0' } ] );
} );

test( 'negative controls: a block with no calibrated band, and one with no calibration, record no wrapper', () => {
	assert.equal( heroOf( ( slug ) => ( 'sgs/hero' === slug ? { contentGap: { slot: CONTENT, slots: [ CONTENT ] } } : {} ) ).draftBandWrappers, undefined );
	assert.equal( heroOf( () => ( {} ) ).draftBandWrappers, undefined );
} );

test( 'the node key is a draft key (stripped from the block tree) and a malformed one is a problem', () => {
	const hero = { name: 'sgs/hero', draftRef: { tpl: 'Root/2#0' }, draftBandWrappers: [ { tpl: 'Root/3#0' } ], attributes: {}, innerBlocks: [] };
	assert.equal( 'draftBandWrappers' in cleanTree( [ hero ] )[ 0 ], false );
	assert.match( skeletonProblems( [ { ...hero, draftBandWrappers: 'x' } ] ).join( ' ' ), /draftBandWrappers must be a list of finders/ );
	assert.match( skeletonProblems( [ { name: 'sgs/hero', draftBandWrappers: [ { tpl: 'Root/3#0' } ], attributes: {}, innerBlocks: [] } ] ).join( ' ' ), /draftBandWrappers must be a list of finders on a node with a draftRef/ );
} );

// ---- Fill: the band from the wrapper ----
const own = ( w, pad = 0 ) => ( { rect: { x: 0, y: 0, w, h: 300 }, inFlow: true, styles: { display: 'block', 'flex-direction': 'row', 'padding-left': `${ pad }px`, 'padding-right': `${ pad }px`, 'border-left-width': '0px', 'border-right-width': '0px', 'max-width': 'none' } } );
const box = ( x, w, styles = {} ) => ( { rect: { x, y: 10, w, h: 40 }, inFlow: true, styles: { 'max-width': 'none', ...styles } } );

test( 'MUST FAIL: bandNeed takes a dissolved wrapper as the cap even when it declares its own max-width', () => {
	const wrapper = { ...box( 270, 900, { 'max-width': '900px', display: 'flex' } ), dissolved: true };
	assert.deepEqual( bandNeed( own( 1440, 40 ), [ wrapper ] ), { exact: 980, why: 'the children take 900px centred in a 1360px content box' } );
	const drawn = { ...wrapper, dissolved: false };
	assert.match( bandNeed( own( 1440, 40 ), [ drawn ] ).why, /sized by itself/, 'negative control: a wrapper the block draws carries its own cap' );
} );

const THREE = [ 375, 768, 1440 ];
const FOUR = [ 375, 768, 1440, 1920 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px', 'max-width': 'none' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, slot = '' ) => ( { slot, slots: [ slot ], reaches: [ slot ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ) }, discovered: {} },
	'sgs/hero': { block: 'sgs/hero', elements: { '': tiers( DEFAULT ), [ BAND ]: tiers( { ...DEFAULT, 'max-width': '1080px' } ) }, settings: { contentWidth: setting( 'max-width', BAND ) }, discovered: {} },
};
const snapOf = ( r ) => ( { ...r, styles: { ...DEFAULT, ...r.styles } } );
// One hero (the draft section) with two text children inside a wrapper the hero dissolves. The wrapper is `cap` wide and centred; each
// child shrinks to `kid` px (align-items centre).
function fill( { wrapped = true, cap = 900, kid = 454 } ) {
	const widths = Object.fromEntries( FOUR.map( ( w ) => {
		const pad = 1440 === w || 1920 === w ? 40 : 20;
		const inner = w - 2 * pad;
		const wide = Math.min( cap, inner );
		const wx = pad + ( inner - wide ) / 2;
		const k = Math.min( kid, wide );
		return [ w, { '0:': snapOf( own( w, pad ) ), '0:>band-wrapper:0': snapOf( box( wx, wide, { 'max-width': '900px', display: 'flex' } ) ), '1:': { ...snapOf( box( wx + ( wide - k ) / 2, k ) ), words: 'A' }, '2:': { ...snapOf( box( wx + ( wide - k ) / 2, k ) ), words: 'B' } } ];
	} ) );
	const skeleton = [ { name: 'sgs/hero', draftRef: 'section', attributes: {}, ...( wrapped ? { draftBandWrappers: [ '.wrap' ] } : {} ), innerBlocks: [
		{ name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } }, { name: 'sgs/text', draftRef: '.b', attributes: { text: 'B' } } ] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], rawSnapshot: { settings: { layout: { contentSize: '1080px', wideSize: '1400px' } } }, origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}

test( 'MUST FAIL THROUGH FILL: a hero whose children shrink inside a centred 900px wrapper gets the wrapper cap, not the children width', () => {
	assert.equal( BAND_WRAPPER_SLOT, '>band-wrapper:' );
	const r = fill( {} );
	assert.deepEqual( r.tree[ 0 ].attributes.contentWidth, { desktop: '980px' }, 'the wrapper 900px plus the hero padding 40px each side' );
	const without = fill( { wrapped: false } );
	assert.equal( without.tree[ 0 ].attributes.contentWidth.desktop, '534px', 'negative control: with no wrapper recorded the children width is the evidence, as before' );
} );
