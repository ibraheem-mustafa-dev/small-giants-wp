// The accordion rule (Spec 48 FR-48-6, lib/skeleton-widgets.mjs::logicReadings) reads a unit's control through a list the
// draft's renderVals names by a local name (`return { faqs }` for `const faqs = list.map( … )`), and a keyed map of open items
// written with `Object.assign( {}, s.open, { [ i ]: ! s.open[ i ] } )` toggles like a spread one. Pure functions only: no
// command is spawned and no site is contacted. Mutation list: tests/skeleton-widgets-local-list.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, row } from './fixtures/skeleton-widgets/build.mjs';

const LIST = "[ [ 'Ordering', 'When will it arrive?', 'In three days.' ], [ 'Allergens', 'What is in them?', 'Oats and milk.' ], [ 'Gifts', 'Can I send one?', 'Yes, with a note.' ] ]";
// o.local: the list is a local const renderVals names by shorthand; o.write: the toggle's setState argument.
const LOGIC = ( o = {} ) => `class Component {
	state = { open: {} };
	renderVals() {
		const S = this.state;
		const faqs = ${ LIST }.map( ( [ c, qq, a ], i ) => ( { cat: c, q: qq, a, open: !! S.open[ i ], toggle: () => this.setState( ${ o.write ?? 's => ( { open: Object.assign( {}, s.open, { [ i ]: ! s.open[ i ] } ) } )' } ) } ) );
		return {
			${ false === o.local ? `faqs: ${ LIST }.map( ( [ c, qq, a ], i ) => ( { cat: c, q: qq, a, open: !! S.open[ i ], toggle: () => this.setState( ${ o.write ?? 's => ( { open: Object.assign( {}, s.open, { [ i ]: ! s.open[ i ] } ) } )' } ) } ) ),` : 'faqs,' }
		};
	}
}`;
const page = () => N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column' }, [ N( 'div', { loop: { list: 'faqs', as: 'f', copies: 3 } }, [
	N( 'button', { click: 'f.toggle' }, [
		N( 'span', { style: 'font-size:12px', words: ( c ) => [ 'Ordering', 'Allergens', 'Gifts' ][ c ], text: 'f.cat' } ),
		N( 'span', { style: 'font-size:19px', words: ( c ) => [ 'When will it arrive?', 'What is in them?', 'Can I send one?' ][ c ], text: 'f.q' } ),
	] ),
	N( 'p', { ifOn: '{{ f.open }}', shownIn: [ 0 ], words: ( c ) => [ 'In three days.', 'Oats and milk.', 'Yes, with a note.' ][ c ], text: 'f.a' } ),
] ) ] ) ] );

test( 'accordion: units whose list renderVals names by a local name, toggled through an Object.assign keyed map, are sgs/accordion letting several open; MUST FAIL without reading the name\'s declaration and the Object.assign map', () => {
	const r = run( page(), LOGIC() );
	const host = row( r, 'Root/2#0' );
	assert.deepEqual( [ host.block, host.rule ], [ 'sgs/accordion', 'accordion' ], 'MUST FAIL: the control is read through the local list' );
	assert.equal( host.attributes.allowMultiple, true, 'MUST FAIL: an Object.assign keyed map lets several open' );
	assert.deepEqual( [ 0, 1, 2 ].map( ( c ) => row( r, `Root/3#${ c }` ).block ), [ 'sgs/accordion-item', 'sgs/accordion-item', 'sgs/accordion-item' ] );
} );

test( 'accordion: the same Object.assign keyed map written inline in renderVals is an accordion too (the map alone)', () => {
	const r = run( page(), LOGIC( { local: false } ) );
	assert.equal( row( r, 'Root/2#0' ).block, 'sgs/accordion' );
	assert.equal( row( r, 'Root/2#0' ).attributes.allowMultiple, true );
} );

test( 'NEGATIVE accordion: an Object.assign that only sets an item (never flips it) and an Object.assign with no computed key open nothing', () => {
	const sets = run( page(), LOGIC( { write: 's => ( { open: Object.assign( {}, s.open, { [ i ]: true } ) } )' } ) );
	assert.ok( ! sets.proposal.rows.some( ( x ) => 'accordion' === x.rule ), 'a write that only adds an item is no toggle' );
	const plain = run( page(), LOGIC( { write: 's => ( { open: Object.assign( {}, s.open, { last: ! s.open.last } ) } )' } ) );
	assert.ok( ! plain.proposal.rows.some( ( x ) => 'accordion' === x.rule && x.attributes?.allowMultiple ), 'an object with no computed key is no keyed map' );
	const frozen = run( page(), LOGIC( { write: 's => ( { open: Object.freeze( { [ i ]: ! s.open[ i ] } ) } )' } ) );
	assert.ok( ! frozen.proposal.rows.some( ( x ) => 'accordion' === x.rule ), 'only Object.assign merges a map: another call is no keyed map write' );
} );
