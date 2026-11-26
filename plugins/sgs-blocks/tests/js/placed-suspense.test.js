/**
 * Lazy content inside an inspector fill must land where the JSX puts it. Two fills portal into one slot container
 * (as `InspectorControls` fills do); the first holds a lazy child that resolves after the first render. With a plain
 * `Suspense` React appends the late nodes after the second fill's panel (the cause of the late Background and media
 * panels on first select); with `PlacedSuspense` they land between the first fill's own panel and the second fill's.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { createPortal } = require( 'react-dom' );

const PlacedSuspense = require( '../../src/components/PlacedSuspense' ).default;

const h = React.createElement;

async function run( Wrapper ) {
	let resolve;
	const Late = React.lazy(
		() =>
			new Promise( ( r ) => {
				resolve = () => r( { default: () => h( 'div', { id: 'late' } ) } );
			} )
	);
	const slot = document.createElement( 'div' );
	document.body.appendChild( slot );
	const host = document.createElement( 'div' );
	const root = createRoot( host );
	act( () => {
		root.render(
			h(
				React.Fragment,
				null,
				createPortal( h( React.Fragment, null, h( 'div', { id: 'a1' } ), h( Wrapper, null, h( Late ) ) ), slot ),
				createPortal( h( 'div', { id: 'b1' } ), slot )
			)
		);
	} );
	const before = [ ...slot.children ].map( ( n ) => n.id || n.className );
	await act( async () => {
		resolve();
		await Promise.resolve();
	} );
	const after = [ ...slot.children ].map( ( n ) => n.id || n.className );
	act( () => root.unmount() );
	slot.remove();
	return { before, after };
}

const Plain = ( { children } ) => h( React.Suspense, { fallback: null }, children );

describe( 'lazy content in a shared portal container', () => {
	it( 'with a plain Suspense lands after the next fill\'s panel (the cause)', async () => {
		const { after } = await run( Plain );
		expect( after ).toEqual( [ 'a1', 'b1', 'late' ] );
	} );

	it( 'with PlacedSuspense lands in place, and leaves no anchor behind', async () => {
		const { before, after } = await run( PlacedSuspense );
		expect( before ).toContain( 'sgs-placed-suspense__anchor' );
		expect( after ).toEqual( [ 'a1', 'late', 'b1' ] );
	} );
} );
