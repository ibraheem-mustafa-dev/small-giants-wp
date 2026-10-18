/**
 * Cursor-field rest point (restX, restY): a stored vw / vh value moves the resting position; absent keeps today's
 * defaults (the emitter's centre in viewport space, 50% / 30% in element space).
 */
function mount( attrs = {} ) {
	jest.resetModules();
	window.matchMedia = jest.fn( () => ( { matches: false, addEventListener() {}, removeEventListener() {} } ) );
	window.requestAnimationFrame = () => 1;
	window.cancelAnimationFrame = () => {};
	document.body.innerHTML = '<div id="t" data-sgs-cursor-field="glow"><p>x</p></div>';
	const el = document.getElementById( 't' );
	Object.entries( attrs ).forEach( ( [ k, v ] ) => el.setAttribute( k, v ) );
	el.getBoundingClientRect = () => ( { left: 100, top: 200, width: 400, height: 100, right: 500, bottom: 300 } );
	return { el, mod: require( '../../src/shared/effects/cursor-field.js' ) };
}

const get = ( el, name ) => el.style.getPropertyValue( name );

describe( 'cursor-field rest point', () => {
	test( 'absent attributes keep the emitter centre and the 50% / 30% element-space default', () => {
		const a = mount();
		a.mod.initCursorField( a.el );
		expect( get( a.el, '--sgs-cursor-x' ) ).toBe( '300px' );
		expect( get( a.el, '--sgs-cursor-y' ) ).toBe( '250px' );
		const b = mount();
		b.mod.initCursorField( b.el, { coordinateSpace: 'element' } );
		expect( get( b.el, '--mx' ) ).toBe( '50%' );
		expect( get( b.el, '--my' ) ).toBe( '30%' );
	} );

	test( 'restX and restY move the resting position', () => {
		const attrs = { 'data-sgs-fx-cursor-field-rest-x': '25', 'data-sgs-fx-cursor-field-rest-y': '10' };
		const a = mount( attrs );
		a.mod.initCursorField( a.el );
		expect( get( a.el, '--sgs-cursor-x' ) ).toBe( `${ Math.round( window.innerWidth * 0.25 ) }px` );
		expect( get( a.el, '--sgs-cursor-y' ) ).toBe( `${ Math.round( window.innerHeight * 0.1 ) }px` );
		const b = mount( attrs );
		b.mod.initCursorField( b.el, { coordinateSpace: 'element' } );
		expect( get( b.el, '--mx' ) ).toBe( '25%' );
		expect( get( b.el, '--my' ) ).toBe( '10%' );
	} );

	test( 'a non-numeric value is ignored and zero is a real value', () => {
		const { mod, el } = mount( { 'data-sgs-fx-cursor-field-rest-x': 'abc', 'data-sgs-fx-cursor-field-rest-y': '0' } );
		expect( mod.readRest( el, 'data-sgs-fx-cursor-field-rest-x' ) ).toBeNull();
		expect( mod.readRest( el, 'data-sgs-fx-cursor-field-rest-y' ) ).toBe( 0 );
	} );
} );
