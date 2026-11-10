/**
 * Shared harness for the Spec 49 media control tests: stand-ins for the editor's data, block-editor and component
 * packages that expose the props a test needs (labels, values, callbacks), and small DOM helpers. Require this file
 * FIRST in a test so the mocks are registered before the components load.
 *
 * Globals a test sets: `__device` ('Desktop' | 'Tablet' | 'Mobile'), `__ratios` (theme aspect ratios) and `__picked`
 * (the attachment the Media Library hands back).
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

// Real i18n, so positional placeholders and a literal %% format as they do in WordPress.
jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );

jest.mock( '@wordpress/icons', () => ( {
	link: require( 'react' ).createElement( 'i', { 'data-icon': 'link' } ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useSelect: ( fn ) =>
		fn( ( store ) => ( 'core/editor' === store ? { getDeviceType: () => global.__device || 'Desktop' } : {} ) ),
} ) );

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		useSettings: () => [ global.__ratios ],
		MediaUploadCheck: ( { children } ) => R.createElement( R.Fragment, null, children ),
		MediaUpload: ( { onSelect, render } ) => render( { open: () => onSelect( global.__picked ) } ),
	};
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		Button: ( { children, onClick, className, ...rest } ) =>
			R.createElement( 'button', { type: 'button', onClick, className, 'aria-label': rest[ 'aria-label' ] }, children ),
	};
} );

jest.mock( '../../src/components/SgsLengthControl.js', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		default: ( { label, value, placeholder, onChange } ) =>
			R.createElement( 'input', {
				'data-testid': 'length',
				'aria-label': label,
				value: value || '',
				placeholder: placeholder || '',
				onChange: ( e ) => onChange( e.target.value ),
			} ),
	};
} );

const h = React.createElement;

function mount( element ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( element ) );
	return {
		container,
		unmount: () => {
			act( () => root.unmount() );
			container.remove();
		},
	};
}

const click = ( node ) => act( () => node.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );

const keydown = ( node, key, extra = {} ) =>
	act( () => node.dispatchEvent( new KeyboardEvent( 'keydown', { key, bubbles: true, cancelable: true, ...extra } ) ) );

/** Sets a controlled input's value the way a user typing does. */
function setValue( node, value ) {
	const proto = 'TEXTAREA' === node.tagName ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor( proto, 'value' ).set.call( node, value );
	act( () => node.dispatchEvent( new Event( 'input', { bubbles: true } ) ) );
}

const byRole = ( container, role, name ) =>
	[ ...container.querySelectorAll( `[role="${ role }"]` ) ].filter( ( n ) => ! name || n.textContent.trim() === name );

const button = ( container, text ) => [ ...container.querySelectorAll( 'button' ) ].find( ( b ) => b.textContent.trim() === text );

module.exports = { React, h, act, mount, click, keydown, setValue, byRole, button };
