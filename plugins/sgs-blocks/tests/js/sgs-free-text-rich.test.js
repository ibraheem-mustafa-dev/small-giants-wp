/**
 * SgsFreeTextField type="rich": every mounted RichText gets its own `identifier`. Two fields sharing one identifier in
 * a block fight over the editor's selection and remount on every keystroke (found live on sgs/wishlist-panel, which
 * mounts three).
 */
'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

global.IS_REACT_ACT_ENVIRONMENT = true;

const seen = [];
jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	RichText: ( props ) => {
		seen.push( props.identifier );
		return require( 'react' ).createElement( 'div', { 'data-identifier': props.identifier } );
	},
} ) );
jest.mock( '@wordpress/components', () => ( {
	__esModule: true,
	BaseControl: ( { children } ) => require( 'react' ).createElement( 'div', null, children ),
	TextControl: () => null,
	TextareaControl: () => null,
	RangeControl: () => null,
} ) );
jest.mock( '@wordpress/compose', () => {
	let n = 0;
	return { __esModule: true, useInstanceId: ( component, prefix ) => require( 'react' ).useRef( `${ prefix }-${ n++ }` ).current };
}, { virtual: true } );
jest.mock( '../../src/components/primitives', () => ( { __esModule: true, NumberControl: () => null } ) );

const SgsFreeTextField = require( '../../src/components/SgsFreeTextField' ).default;

test( 'MUST FAIL with a shared identifier: three rich fields in one block carry three identifiers', () => {
	const host = document.createElement( 'div' );
	const root = createRoot( host );
	act( () => root.render( React.createElement( 'div', null,
		React.createElement( SgsFreeTextField, { type: 'rich', label: 'A', value: '', onChange: () => {} } ),
		React.createElement( SgsFreeTextField, { type: 'rich', label: 'B', value: '', onChange: () => {} } ),
		React.createElement( SgsFreeTextField, { type: 'rich', noLink: true, label: 'C', value: '', onChange: () => {} } )
	) ) );
	const ids = [ ...host.querySelectorAll( '[data-identifier]' ) ].map( ( e ) => e.getAttribute( 'data-identifier' ) );
	expect( ids ).toHaveLength( 3 );
	expect( new Set( ids ).size ).toBe( 3 );
	act( () => root.unmount() );
} );
