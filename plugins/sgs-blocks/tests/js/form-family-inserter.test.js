/**
 * The form family is easy to find in the editor, and every SGS block's inserter icon is SGS teal (Bean, 2026-11-22).
 *
 * - The form's allowed children are block.json's list: the editor's own copy had lost the date, number, hidden and
 *   address fields, so those four could not be added to a form.
 * - "Add field" and the inserter inside a form or step list the fields first (FORM_FIELDS, from that same list).
 * - The forms editor opens the inserter inside the form's first step once the post holds a form, and never on an
 *   empty post (that one gets WordPress's pattern window).
 * - Every sgs/* block, and each variation with an icon, gets the teal foreground; a colour an icon sets is kept; core
 *   blocks are untouched.
 */

'use strict';

jest.mock( '@wordpress/data', () => ( { subscribe: () => () => {}, select: () => ( {} ), dispatch: () => ( {} ) } ) );
jest.mock( '@wordpress/block-editor', () => ( { BlockControls: () => null, Inserter: () => null } ) );
jest.mock( '@wordpress/components', () => ( { ToolbarGroup: () => null, ToolbarButton: () => null } ) );
jest.mock( '@wordpress/blocks', () => ( { createBlock: ( name ) => ( { name } ) } ) );

const { createElement } = require( '@wordpress/element' );
const FORM = require( '../../src/blocks/form/block.json' );
const { FORM_FIELDS } = require( '../../src/blocks/form/AddFieldControl' );
const { fieldContainer, shouldStartForm } = require( '../../src/blocks/extensions/form-cpt-editor' );
const { tealBlockIcon, withSgsTeal } = require( '../../src/blocks/extensions/sgs-block-icon' );
const { SGS_TEAL } = require( '../../src/utils/icons' );

describe( 'the form family in the inserter', () => {
	test( 'every field the form allows is offered, the four the editor had lost included', () => {
		for ( const name of [ 'sgs/form-field-date', 'sgs/form-field-number', 'sgs/form-field-hidden', 'sgs/form-field-address' ] ) {
			expect( FORM.allowedBlocks ).toContain( name );
			expect( FORM_FIELDS ).toContain( name );
		}
		// the form's editor reads block.json's list, never a copy of its own (the copy is what lost the four)
		const editSource = require( 'fs' ).readFileSync( require( 'path' ).join( __dirname, '../../src/blocks/form/edit.js' ), 'utf8' );
		expect( editSource ).toContain( 'allowedBlocks: metadata.allowedBlocks' );
		expect( editSource ).not.toContain( "'sgs/form-field-text'," );
		expect( FORM_FIELDS ).not.toContain( 'sgs/form-step' );
		expect( FORM_FIELDS.every( ( n ) => n.startsWith( 'sgs/form-field-' ) ) ).toBe( true );
	} );

	test( 'the forms editor opens inside the first step, the form itself without steps, and nothing on an empty post', () => {
		const step = { name: 'sgs/form-step', clientId: 's1', innerBlocks: [] };
		const form = { name: 'sgs/form', clientId: 'f', innerBlocks: [ step, { name: 'sgs/form-step', clientId: 's2', innerBlocks: [] } ] };
		expect( fieldContainer( [ form ] ) ).toBe( step );
		const flat = { name: 'sgs/form', clientId: 'f2', innerBlocks: [ { name: 'sgs/form-field-text', clientId: 't', innerBlocks: [] } ] };
		expect( fieldContainer( [ flat ] ) ).toBe( flat );
		expect( fieldContainer( [ { name: 'sgs/form', clientId: 'f3', innerBlocks: [] } ] ) ).toBeNull(); // template not filled yet
		expect( fieldContainer( [] ) ).toBeNull();
	} );

	test( 'a new empty form starts with a form block, unless starter patterns exist for forms', () => {
		expect( shouldStartForm( [], true, [] ) ).toBe( true );
		expect( shouldStartForm( [], false, [] ) ).toBe( false ); // a saved form is never changed
		expect( shouldStartForm( [ { name: 'sgs/form' } ], true, [] ) ).toBe( false );
		const starter = { postTypes: [ 'sgs_form' ], blockTypes: [ 'core/post-content' ] };
		expect( shouldStartForm( [], true, [ starter ] ) ).toBe( false ); // WordPress's pattern window offers them
		expect( shouldStartForm( [], true, [ { postTypes: [ 'page' ], blockTypes: [ 'core/post-content' ] } ] ) ).toBe( true );
	} );
} );

describe( 'SGS teal inserter icons', () => {
	test( 'a dashicon name, an element and a missing icon all become teal', () => {
		expect( tealBlockIcon( { icon: 'slides' }, 'sgs/gallery' ).icon ).toEqual( { src: 'slides', foreground: SGS_TEAL } );
		const el = createElement( 'svg' );
		expect( tealBlockIcon( { icon: el }, 'sgs/hero' ).icon ).toEqual( { src: el, foreground: SGS_TEAL } );
		expect( tealBlockIcon( {}, 'sgs/feature-grid' ).icon ).toEqual( { src: 'block-default', foreground: SGS_TEAL } );
	} );

	test( 'a colour the icon sets is kept, variations follow, core blocks are untouched', () => {
		expect( withSgsTeal( { src: 'x', foreground: '#123456' } ).foreground ).toBe( '#123456' );
		const out = tealBlockIcon( { icon: 'star-filled', variations: [ { name: 'a', icon: 'heart' }, { name: 'b' } ] }, 'sgs/star-rating' );
		expect( out.variations[ 0 ].icon ).toEqual( { src: 'heart', foreground: SGS_TEAL } );
		expect( out.variations[ 1 ] ).toEqual( { name: 'b' } );
		const core = { icon: 'paragraph' };
		expect( tealBlockIcon( core, 'core/paragraph' ) ).toBe( core );
	} );
} );
