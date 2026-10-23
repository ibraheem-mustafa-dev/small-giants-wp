// Shorthand families (lib/css-families.mjs) and the setting reach built on them (lib/db.mjs::candidates). The families come
// from mdn-data, so the matrix covers every family the browser has, not the ones a draft happened to use.
import test from 'node:test';
import assert from 'node:assert/strict';
import { familyOf, settingKey, reachedBy, physicalOf, expand, membersOf, foldParts, unfoldValue, completePaint } from '../lib/css-families.mjs';
import { candidates, openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const dbOf = ( props ) => openDb( fixtureDb( { blocks: [ { slug: 'sgs/x', title: 'X', category: 'sgs', type: 'dynamic' } ], block_attributes: props.map( ( [ attr, css_property, css_state = null ] ) => ( { block_slug: 'sgs/x', attr_name: attr, attr_type: 'string', css_property, css_state, source: 'sgs' } ) ) } ) );

// [ longhand, shorthand, part ]: one per family mdn-data defines for edges, corners and axes.
const FAMILIES = [
	[ 'border-top-left-radius', 'border-radius', 'top-left' ], [ 'border-bottom-right-radius', 'border-radius', 'bottom-right' ],
	[ 'padding-top', 'padding', 'top' ], [ 'padding-left', 'padding', 'left' ],
	[ 'margin-bottom', 'margin', 'bottom' ], [ 'margin-right', 'margin', 'right' ],
	[ 'border-top-width', 'border-width', 'top' ], [ 'border-left-color', 'border-color', 'left' ], [ 'border-bottom-style', 'border-style', 'bottom' ],
	[ 'top', 'inset', 'top' ], [ 'left', 'inset', 'left' ],
	[ 'row-gap', 'gap', 'row' ], [ 'column-gap', 'gap', 'column' ],
	[ 'overflow-x', 'overflow', 'x' ], [ 'overflow-y', 'overflow', 'y' ],
	[ 'align-items', 'place-items', 'align' ], [ 'justify-items', 'place-items', 'justify' ],
	[ 'align-content', 'place-content', 'align' ], [ 'justify-self', 'place-self', 'justify' ],
	[ 'scroll-margin-top', 'scroll-margin', 'top' ], [ 'scroll-padding-left', 'scroll-padding', 'left' ],
];

test( 'MUST FAIL: every family longhand is mapped to its shorthand from mdn-data, not from a hand-written list', () => {
	for ( const [ longhand, short, part ] of FAMILIES ) {
		const fam = familyOf( longhand );
		assert.equal( fam?.short, short, `${ longhand } belongs to ${ short }` );
		assert.equal( fam.part, part, `${ longhand } is the ${ part } part` );
		assert.ok( fam.members.includes( longhand ), `${ short } lists ${ longhand }` );
		assert.ok( reachedBy( longhand ).includes( short ), `${ longhand } reaches a ${ short } setting` );
	}
	// Negative controls: a property in no family, and a mixed shorthand whose longhands are different things.
	for ( const none of [ 'color', 'font-size', 'display', 'opacity', 'z-index' ] ) {
		assert.ok( ! familyOf( none ) || 'mixed' === familyOf( none ).kind, none );
		assert.deepEqual( reachedBy( none ), [ none ] );
	}
	for ( const mixed of [ 'outline-width', 'outline-color', 'transition-duration', 'text-decoration-color', 'flex-grow' ] ) {
		const fam = familyOf( mixed );
		assert.equal( fam?.kind, 'mixed', `${ mixed } is a part of a mixed shorthand` );
		assert.ok( ! reachedBy( mixed ).includes( fam.short ), `${ mixed } holds no ${ fam.short } value, so it reaches nothing through it` );
	}
	assert.equal( familyOf( 'outline-width' ).short, 'outline' );
} );

test( 'MUST FAIL: the settings key keeps the legacy shapes and maps the new corner longhands', () => {
	assert.equal( settingKey( 'margin-left' ), 'margin' );
	assert.equal( settingKey( 'border-top-color' ), 'border-color' );
	assert.equal( settingKey( 'row-gap' ), 'gap' );
	assert.equal( settingKey( 'text-decoration-line' ), 'text-decoration' );
	assert.equal( settingKey( 'border-top-left-radius' ), 'border-radius' );
	assert.equal( settingKey( 'inset-inline-start' ), 'inset' );
	// A standalone axis property keeps its own name (it has settings of its own) and reaches its shorthand only by reachedBy.
	assert.equal( settingKey( 'align-items' ), 'align-items' );
	assert.equal( settingKey( 'overflow-x' ), 'overflow-x' );
	assert.equal( settingKey( 'text-decoration-color' ), 'text-decoration-color' );
} );

test( 'MUST FAIL: logical spellings are the physical ones, and a right-to-left page flips the inline edges', () => {
	const cases = [
		[ 'padding-inline-start', 'padding-left' ], [ 'padding-inline-end', 'padding-right' ], [ 'margin-block-start', 'margin-top' ], [ 'margin-block-end', 'margin-bottom' ],
		[ 'border-inline-start-width', 'border-left-width' ], [ 'border-block-end-color', 'border-bottom-color' ], [ 'border-start-start-radius', 'border-top-left-radius' ],
		[ 'border-start-end-radius', 'border-top-right-radius' ], [ 'border-end-start-radius', 'border-bottom-left-radius' ], [ 'border-end-end-radius', 'border-bottom-right-radius' ],
		[ 'inset-inline-start', 'left' ], [ 'inset-inline-end', 'right' ], [ 'inset-block-start', 'top' ], [ 'inset-block-end', 'bottom' ], [ 'scroll-margin-inline-start', 'scroll-margin-left' ],
	];
	for ( const [ logical, physical ] of cases ) {
		assert.equal( physicalOf( logical ), physical );
		assert.equal( familyOf( logical ).short, familyOf( physical ).short, `${ logical } is in ${ familyOf( physical ).short }` );
		assert.equal( familyOf( logical ).part, familyOf( physical ).part );
	}
	assert.equal( physicalOf( 'padding-inline-start', 'rtl' ), 'padding-right' );
	assert.equal( physicalOf( 'border-start-start-radius', 'rtl' ), 'border-top-right-radius' );
	assert.equal( physicalOf( 'inset-inline-start', 'rtl' ), 'right' );
	assert.deepEqual( expand( 'margin-block' ), [ 'margin-top', 'margin-bottom' ] );
	assert.deepEqual( expand( 'inset-inline' ), [ 'left', 'right' ] );
	assert.deepEqual( expand( 'color' ), [ 'color' ] );
	assert.equal( expand( 'border-radius' ).length, 4 );
} );

test( 'MUST FAIL: parts fold to the shorthand\'s own serialisation, whatever the value shape', () => {
	const r = ( tl, tr, br, bl ) => ( { 'border-top-left-radius': tl, 'border-top-right-radius': tr, 'border-bottom-right-radius': br, 'border-bottom-left-radius': bl } );
	assert.deepEqual( foldParts( 'border-radius', r( '8px', '8px', '8px', '8px' ) ), { equal: true, value: '8px', distinct: [ '8px' ], missing: [], css: '8px' } );
	assert.equal( foldParts( 'border-radius', r( '8px', '4px', '8px', '4px' ) ).css, '8px 4px', 'top and bottom corners differ in pairs' );
	assert.equal( foldParts( 'border-radius', r( '1px', '2px', '3px', '2px' ) ).css, '1px 2px 3px' );
	assert.equal( foldParts( 'border-radius', r( '1px', '2px', '3px', '4px' ) ).css, '1px 2px 3px 4px', 'all different' );
	const some = foldParts( 'border-radius', { 'border-top-left-radius': '8px' } );
	assert.deepEqual( [ some.equal, some.css, some.missing.length ], [ true, null, 3 ], 'one corner stated: equal so far, no whole value' );
	assert.equal( foldParts( 'padding', { 'padding-top': '1px', 'padding-right': '2px', 'padding-bottom': '1px', 'padding-left': '2px' } ).css, '1px 2px' );
	assert.equal( foldParts( 'gap', { 'row-gap': '8px', 'column-gap': '16px' } ).css, '8px 16px' );
	assert.equal( foldParts( 'overflow', { 'overflow-x': 'hidden', 'overflow-y': 'hidden' } ).css, 'hidden' );
	assert.equal( foldParts( 'place-items', { 'align-items': 'center', 'justify-items': 'start' } ).css, 'center start' );
	assert.equal( foldParts( 'inset', { top: '0', right: '0', bottom: '0', left: '0' } ).css, '0' );
	assert.equal( foldParts( 'outline', {} ), null, 'a mixed shorthand has no fold' );
	assert.deepEqual( unfoldValue( 'border-radius', '8px 4px' ), r( '8px', '4px', '8px', '4px' ) );
	assert.equal( unfoldValue( 'border-radius', '8px / 4px' ), null, 'an elliptical radius is not parts' );
	assert.deepEqual( membersOf( 'margin' ), [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ] );
} );

test( 'MUST FAIL: a paint holding a shorthand gains its parts and a paint holding the parts gains the shorthand', () => {
	const a = completePaint( { 'border-radius': '8px 4px', display: 'flex' } );
	assert.equal( a[ 'border-top-left-radius' ], '8px' );
	assert.equal( a[ 'border-top-right-radius' ], '4px' );
	assert.equal( a[ 'border-bottom-left-radius' ], '4px' );
	assert.equal( completePaint( { 'overflow-x': 'hidden', 'overflow-y': 'auto' } ).overflow, 'hidden auto' );
	assert.equal( completePaint( { 'border-radius': '8px', 'border-top-left-radius': '2px' } )[ 'border-top-left-radius' ], '2px', 'a stated part is never replaced' );
	assert.equal( completePaint( { 'border-radius': '8px / 4px' } )[ 'border-top-left-radius' ], undefined, 'an elliptical radius cannot be split' );
} );

test( 'MUST FAIL: candidates reaches a shorthand setting from any longhand, in any spelling, and never a sibling longhand\'s setting', () => {
	const db = dbOf( [ [ 'radius', 'border-radius' ], [ 'pad', 'padding' ], [ 'over', 'overflow' ], [ 'floatingOffset', 'inset-block-end,inset-block-start,inset-inline-end,inset-inline-start' ], [ 'place', 'place-items' ], [ 'alignOnly', 'align-items' ], [ 'out', 'outline' ], [ 'radiusHover', 'border-radius', 'hover' ], [ 'gapAll', 'gap' ] ] );
	const names = ( prop, state = null ) => candidates( db, 'sgs/x', prop, state ).map( ( r ) => r.attr_name ).sort();
	assert.deepEqual( names( 'border-top-left-radius' ), [ 'radius' ] );
	assert.deepEqual( names( 'border-start-end-radius' ), [ 'radius' ], 'logical corner' );
	assert.deepEqual( names( 'border-bottom-right-radius', 'hover' ), [ 'radiusHover' ], 'the hover setting, by state' );
	assert.deepEqual( names( 'padding-inline-start' ), [ 'pad' ] );
	assert.deepEqual( names( 'overflow-y' ), [ 'over' ] );
	assert.deepEqual( names( 'top' ), [ 'floatingOffset' ], 'a physical edge reaches the stored logical list' );
	assert.deepEqual( names( 'inset-inline-end' ), [ 'floatingOffset' ] );
	assert.deepEqual( names( 'justify-items' ), [ 'place' ] );
	assert.deepEqual( names( 'align-items' ), [ 'alignOnly', 'place' ], 'a standalone axis property keeps its own setting beside its shorthand' );
	assert.deepEqual( names( 'row-gap' ), [ 'gapAll' ] );
	assert.deepEqual( names( 'outline-width' ), [], 'a mixed shorthand\'s setting is not reached from one part' );
	assert.deepEqual( names( 'justify-content' ), [], 'place-content has no setting here' );
	assert.deepEqual( names( 'border-top-left-radius', 'focus' ), [] );
	// Negative control: a setting for one longhand is not reached by its sibling.
	const own = dbOf( [ [ 'padTop', 'padding-top' ] ] );
	assert.deepEqual( candidates( own, 'sgs/x', 'padding-top' ).map( ( r ) => r.attr_name ), [ 'padTop' ] );
	assert.deepEqual( candidates( own, 'sgs/x', 'padding-left' ), [] );
} );
