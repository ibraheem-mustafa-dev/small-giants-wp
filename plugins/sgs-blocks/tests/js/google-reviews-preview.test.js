/**
 * sgs/google-reviews — editor canvas preview.
 *
 * The canvas must be the server's own render (ServerSideRender), with:
 *  - one short warning notice above it ONLY for "Sample reviews";
 *  - the empty-state notice supplied to ServerSideRender (shown only when the server renders nothing);
 *  - attributes sanitised so a null never reaches the REST route (a null becomes "" in the query
 *    string and the block-renderer rejects it with 400 for a typed attribute);
 *  - ToolsPanel imported from the primitives boundary (the bare name is undefined on WP 7.1).
 *
 * edit.js is far too heavy to mount here, so the pure logic and the small components are exercised
 * directly, and edit.js is checked at source level for the wiring that matters (each
 * assertion was shown to fail when its wiring is broken).
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

// A Notice that exposes its status so warning / info / error can be told apart.
jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		Notice: ( { status, children } ) => R.createElement( 'div', { 'data-testid': 'notice', 'data-status': status }, children ),
		Spinner: () => R.createElement( 'span', { 'data-testid': 'spinner' } ),
	};
} );

const { omitNullish, showsSampleNotice } = require( '../../src/blocks/google-reviews/preview-plan' );
const { SampleNotice, EmptyState, LoadingState, ErrorState } = require( '../../src/blocks/google-reviews/editor-preview' );

const EDIT_JS = fs.readFileSync( path.join( __dirname, '../../src/blocks/google-reviews/edit.js' ), 'utf8' );

function mount( element ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	act( () => root.render( element ) );
	return { container, unmount: () => { act( () => root.unmount() ); container.remove(); } };
}

describe( 'omitNullish', () => {
	test( 'drops null and undefined at every depth, keeps false / 0 / empty string', () => {
		expect(
			omitNullish( {
				a: null,
				b: undefined,
				c: false,
				d: 0,
				e: '',
				f: { g: null, h: 'kept', i: { j: undefined } },
				k: [ { author: 'A', photo: null }, null, 'x' ],
			} )
		).toEqual( { c: false, d: 0, e: '', f: { h: 'kept', i: {} }, k: [ { author: 'A' }, 'x' ] } );
	} );

	test( 'a null attribute never reaches ServerSideRender (no "null" anywhere in the payload)', () => {
		const out = omitNullish( { dataSource: 'auto', autoplay: false, columns: null, reviews: [ { author: 'A', photo: null } ] } );
		expect( out ).toEqual( { dataSource: 'auto', autoplay: false, reviews: [ { author: 'A' } ] } );
		expect( JSON.stringify( out ) ).not.toContain( 'null' );
	} );
} );

describe( 'showsSampleNotice', () => {
	test( 'Sample reviews asks for the sample notice', () => {
		expect( showsSampleNotice( { dataSource: 'placeholder' } ) ).toBe( true );
	} );

	test.each( [
		[ 'auto with written reviews', { dataSource: 'auto', reviews: [ { author: 'A' } ] } ],
		[ 'auto with none', { dataSource: 'auto', reviews: [] } ],
		[ 'inline', { dataSource: 'inline', reviews: [ { author: 'A' } ] } ],
		[ 'synced', { dataSource: 'synced' } ],
		[ 'no attributes at all', undefined ],
	] )( '%s has NO sample notice (real data must never be labelled as invented)', ( _name, attrs ) => {
		expect( showsSampleNotice( attrs ) ).toBe( false );
	} );
} );

describe( 'canvas pieces', () => {
	test( 'SampleNotice is ONE short warning line that says the reviews are invented', () => {
		const view = mount( React.createElement( SampleNotice ) );
		const notices = view.container.querySelectorAll( '[data-testid="notice"]' );
		expect( notices ).toHaveLength( 1 );
		expect( notices[ 0 ].getAttribute( 'data-status' ) ).toBe( 'warning' );
		expect( notices[ 0 ].textContent ).toMatch( /invented/i );
		expect( notices[ 0 ].textContent.length ).toBeLessThan( 160 );
		view.unmount();
	} );

	test( 'EmptyState explains the three ways to fix an empty block', () => {
		const view = mount( React.createElement( EmptyState ) );
		const notice = view.container.querySelector( '[data-testid="notice"]' );
		expect( notice.getAttribute( 'data-status' ) ).toBe( 'info' );
		expect( notice.querySelectorAll( 'li' ) ).toHaveLength( 3 );
		expect( notice.textContent ).toContain( 'Written reviews' );
		expect( notice.textContent ).toContain( 'Place ID' );
		expect( notice.textContent ).toContain( 'Reviews source' );
		view.unmount();
	} );

	test( 'LoadingState shows a spinner', () => {
		const view = mount( React.createElement( LoadingState ) );
		expect( view.container.querySelector( '[data-testid="spinner"]' ) ).not.toBeNull();
		view.unmount();
	} );

	test( 'ErrorState shows the server message, or a fallback, and never throws', () => {
		const withMsg = mount( React.createElement( ErrorState, { response: { errorMsg: 'Boom' } } ) );
		expect( withMsg.container.querySelector( '[data-status="error"]' ).textContent ).toBe( 'Boom' );
		withMsg.unmount();
		const noResponse = mount( React.createElement( ErrorState, {} ) );
		expect( noResponse.container.querySelector( '[data-status="error"]' ).textContent.length ).toBeGreaterThan( 0 );
		noResponse.unmount();
	} );
} );

describe( 'edit.js wiring (source level)', () => {
	test( 'the canvas is a ServerSideRender of sgs/google-reviews with sanitised attributes and all three placeholders', () => {
		expect( EDIT_JS ).toMatch( /<ServerSideRender\s+block="sgs\/google-reviews"\s+attributes=\{ omitNullish\( attributes \) \}/ );
		expect( EDIT_JS ).toContain( 'EmptyResponsePlaceholder={ EmptyState }' );
		expect( EDIT_JS ).toContain( 'LoadingResponsePlaceholder={ LoadingState }' );
		expect( EDIT_JS ).toContain( 'ErrorResponsePlaceholder={ ErrorState }' );
		expect( EDIT_JS ).toContain( '<SsrPreviewGuard>' );
	} );

	test( 'the sample notice sits above the preview, gated by showsSampleNotice', () => {
		expect( EDIT_JS.indexOf( 'showsSampleNotice( attributes ) && <SampleNotice />' ) ).toBeGreaterThan( -1 );
		expect( EDIT_JS.indexOf( '<SampleNotice />' ) ).toBeLessThan( EDIT_JS.indexOf( '<ServerSideRender' ) );
	} );

	test( 'the bespoke stand-in is gone (no emoji stars, no debug Variant / Max Reviews lines)', () => {
		expect( EDIT_JS ).not.toContain( 'sgs-google-reviews__placeholder' );
		expect( EDIT_JS ).not.toContain( '⭐' );
		expect( EDIT_JS ).not.toMatch( /Variant:|Max Reviews:/ );
	} );

	test( 'ToolsPanel comes from the primitives boundary, never straight from @wordpress/components', () => {
		expect( EDIT_JS ).toContain( "import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';" );
		const wpComponentsImport = EDIT_JS.match( /import \{([^}]*)\} from '@wordpress\/components';/ );
		expect( wpComponentsImport[ 1 ] ).not.toMatch( /ToolsPanel/ );
	} );
} );
