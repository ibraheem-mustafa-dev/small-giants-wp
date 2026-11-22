// rules.numberedSteps: a parent whose children are all steps, each typing its own number beside its words with the numbers
// counting up from 1, is one sgs/process-steps block (list layout when stacked, row layout side by side). Synthetic
// inventories in the reader's shape (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on the skeleton writer before
// the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const b = x.box || { x: 0, y: 100, w: 400, h: 24 };
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: x.allText ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ x.style ? ` style="${ x.style }"` : '' } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: b, 768: b, 1440: b }, visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );

// A list (Root/3#0) of steps. `at( i )` gives each step's position: stacked (one above the next) or side by side.
const TITLES = [ 'Pick a frame today', 'Tell me what it is for', 'Send your prescription now' ];
const stack = ( i ) => ( { x: 0, y: 100 + i * 60, w: 400, h: 40 } );
const side = ( i ) => ( { x: i * 300, y: 100, w: 280, h: 120 } );
const page = ( { count = 3, numbers = [ '1', '2', '3' ], at = stack, withLink = false, descriptions = false, titleTag = 'li', numberFirst = true, stepStyle = '', numberDisplay = 'block' } = {} ) => {
	const steps = [];
	for ( let i = 0; i < count; i++ ) {
		const k = 10 + i * 5;
		// Each step: a number span and the title as the step's own words (li style) or a title element and a description (div style).
		if ( 'li' === titleTag ) {
			steps.push( el( `Root/${ k }#0`, 'Root/3#0', 'li', TITLES[ i ], { depth: 3, box: at( i ), style: stepStyle } ), el( `Root/${ k + 1 }#0`, `Root/${ k }#0`, 'span', numbers[ i ], { depth: 4, box: at( i ), display: numberDisplay } ) );
		} else {
			steps.push( el( `Root/${ k }#0`, 'Root/3#0', 'div', '', { depth: 3, box: at( i ), style: stepStyle } ) );
			numberFirst && steps.push( el( `Root/${ k + 1 }#0`, `Root/${ k }#0`, 'span', numbers[ i ], { depth: 4, box: at( i ), display: numberDisplay } ) );
			steps.push( el( `Root/${ k + 2 }#0`, `Root/${ k }#0`, titleTag, TITLES[ i ], { depth: 4, box: at( i ) } ) );
			descriptions && steps.push( el( `Root/${ k + 3 }#0`, `Root/${ k }#0`, 'p', `We do step ${ i + 1 } for you.`, { depth: 4, box: at( i ) } ) );
			withLink && steps.push( el( `Root/${ k + 4 }#0`, `Root/${ k }#0`, 'a', 'Read more', { depth: 4, attrs: { href: 'https://example.com/more/' }, box: at( i ) } ) );
		}
	}
	return [
		el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
		el( 'Root/2#0', 'Root/1#0', 'section', '', { depth: 1 } ),
		el( 'Root/3#0', 'Root/2#0', 'li' === titleTag ? 'ol' : 'div', '', { depth: 2, box: { x: 0, y: 100, w: 900, h: 200 } } ),
		...steps,
		el( 'Root/90#0', 'Root/1#0', 'section', 'Visit us in store', { depth: 1 } ),
	];
};
const run = ( elements, surfaceKind = null ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', surfaceKind, db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};
const steps = ( tree ) => all( tree, 'sgs/process-steps' );

test( 'MUST FAIL: a stacked list whose items type 1, 2, 3 beside their words is one process-steps in its list layout', () => {
	const { skeleton, proposal } = run( page() );
	const [ block ] = steps( skeleton );
	assert.ok( block );
	assert.equal( block.draftRef.tpl, 'Root/3#0', 'placed at the steps\' parent' );
	assert.deepEqual( block.attributes.steps, [ { number: '1', title: 'Pick a frame today' }, { number: '2', title: 'Tell me what it is for' }, { number: '3', title: 'Send your prescription now' } ] );
	assert.equal( block.attributes.layout, 'list' );
	assert.equal( block.attributes.headingLevel, 'p', 'a title that is no h tag is the block\'s paragraph level' );
	assert.equal( all( skeleton, 'sgs/icon-list' ).length, 0, 'no numbered icon list' );
	assert.equal( proposal.rows.find( ( r ) => 'Root/11#0' === r.key )?.action, 'absorbed', 'the steps\' elements are drawn by the block' );
} );

test( 'MUST FAIL: steps side by side with a title heading and a description are the row layout at the heading\'s level', () => {
	const { skeleton } = run( page( { titleTag: 'h3', descriptions: true, at: side, numbers: [ '01', '02', '03' ] } ) );
	const [ block ] = steps( skeleton );
	assert.ok( block );
	assert.deepEqual( block.attributes.steps[ 1 ], { number: '02', title: 'Tell me what it is for', description: 'We do step 2 for you.' } );
	assert.equal( block.attributes.layout, 'row' );
	assert.equal( block.attributes.headingLevel, 'h3' );
} );

test( 'negative control: a number beside a short label is a contents list, the list block' + "'" + 's numbered marker', () => {
	const short = page().map( ( x ) => ( 'li' === x.tag ? { ...x, words: 'Orders', allText: 'Orders' } : x ) );
	assert.equal( steps( run( short ).skeleton ).length, 0 );
	const withDescription = page( { titleTag: 'h3', descriptions: true, at: side } ).map( ( x ) => ( 'h3' === x.tag ? { ...x, words: 'Orders', allText: 'Orders' } : x ) );
	assert.equal( steps( run( withDescription ).skeleton ).length, 1, 'a short title with a description is still a step' );
} );

test( 'negative control: a number typed inline in the own line of the title numbers a section of a document, not a step', () => {
	assert.equal( steps( run( page( { numberDisplay: 'inline' } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { titleTag: 'h3', descriptions: true, at: side, numberDisplay: 'inline' } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { numberDisplay: 'block' } ) ).skeleton ).length, 1, 'the same steps with the number in a box of its own are steps' );
} );

test( 'negative control: numbers that do not count up from 1 are no steps (years, a word)', () => {
	assert.equal( steps( run( page( { numbers: [ '1962', '1972', 'Now' ] } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { numbers: [ '2', '3', '4' ] } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { numbers: [ '1', '3', '2' ] } ) ).skeleton ).length, 0 );
} );

test( 'negative control: items with a link are cards, not steps', () => {
	assert.equal( steps( run( page( { titleTag: 'h3', withLink: true } ) ).skeleton ).length, 0 );
} );

test( 'negative control: a run of two items typing no number is no steps', () => {
	const elements = page( { count: 2, numbers: [ 'A', 'B' ] } );
	assert.equal( steps( run( elements ).skeleton ).length, 0 );
} );

test( 'negative control: numbered cards that paint their own box are containers, a ruled or padded step is still a step', () => {
	assert.equal( steps( run( page( { titleTag: 'h3', descriptions: true, at: side, stepStyle: 'background:#141414;padding:24px' } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { titleTag: 'h3', descriptions: true, at: side, stepStyle: 'border:1px solid #ccc' } ) ).skeleton ).length, 0 );
	assert.equal( steps( run( page( { titleTag: 'h3', descriptions: true, at: side, stepStyle: 'padding:0 12px 8px;border-bottom:1px solid #eee;border:none' } ) ).skeleton ).length, 1 );
} );

test( 'negative control: a form surface keeps its own steps', () => {
	assert.equal( steps( run( page(), 'form' ).skeleton ).length, 0 );
} );
