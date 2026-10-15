/**
 * The editor-canvas motion preview (Spec 38A §11; FR-38A-28), mounted through the real `editor.BlockListBlock` filter
 * (`with-canvas-motion.js`): one `<style>` per block in the canvas document, the resting data attributes on the
 * block's canvas elements (never the entrance ones, never inside a nested block), a block that mounts later found by
 * the mutation observer, a hover group on a linked block with no motion of its own, nothing in a block preview, and
 * everything removed on unmount. `replay()` plays a target's entrance once and returns it to rest when its animations
 * settle; under reduced motion it moves nothing and shows the one-line notice.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );

const mockHero = JSON.parse(
	fs.readFileSync( path.resolve( __dirname, '../../src/blocks/hero/block.json' ), 'utf8' )
);
const mockCreateNotice = jest.fn();
const mockFilters = {};
let mockPreview = false;

jest.mock( '@wordpress/element', () => {
	const R = require( 'react' );
	return { useEffect: R.useEffect, useMemo: R.useMemo };
} );
jest.mock( '@wordpress/compose', () => ( {
	createHigherOrderComponent: ( fn ) => fn,
} ) );
jest.mock( '@wordpress/i18n', () => ( { __: ( text ) => text } ) );
jest.mock( '@wordpress/hooks', () => ( {
	addFilter: ( hook, ns, fn ) => {
		mockFilters[ hook ] = fn;
	},
} ) );
jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: ( name ) =>
		name === 'sgs/hero' || name === 'sgs/plain-linked' ? { supports: mockHero.supports } : { supports: {} },
} ) );
jest.mock( '@wordpress/data', () => ( {
	dispatch: () => ( { createNotice: mockCreateNotice } ),
	useSelect: ( fn ) =>
		fn( () => ( { getSettings: () => ( { __unstableIsPreviewMode: mockPreview } ) } ) ),
} ) );

require( '../../src/blocks/extensions/motion/canvas/with-canvas-motion' );
const {
	replay,
	canReplay,
	REPLAY_REDUCED_NOTICE,
} = require( '../../src/blocks/extensions/motion/canvas/use-canvas-motion' );

const CLIENT = 'abc-123';
const MOTION_KEY = [ 'sgs', 'Motion' ].join( '' );
const review = { draftNode: 'lede', reason: 'no part' };
const motion = {
	v: 1,
	elements: {
		media: { hover: { state: { values: { scale: 1.04 } } } },
		root: { entrance: { base: { trigger: 'scroll', values: { from: { opacity: 0 } } } } },
	},
};

let reactRoot;
let reduced = false;

const BlockListBlock = () => null;
const block = () => document.getElementById( `block-${ CLIENT }` );
const media = () => block().querySelector( ':scope > .sgs-hero__media' );
const style = () => document.getElementById( `sgs-motion-canvas-${ CLIENT }` );
const flush = () => act( async () => new Promise( ( r ) => setTimeout( r, 20 ) ) );

const BLOCK_HTML = `<div id="block-${ CLIENT }" data-block="${ CLIENT }" class="wp-block-sgs-hero"><div class="sgs-hero__media"></div><div class="sgs-hero__content"><p class="lede">Hi</p><a class="cta" href="#">Go</a></div><div data-block="child-1" class="wp-block-sgs-hero"><div class="sgs-hero__media"></div></div></div>`;

async function mount( attrs, name = 'sgs/hero' ) {
	const Filtered = mockFilters[ 'editor.BlockListBlock' ]( BlockListBlock );
	await act( async () => {
		reactRoot.render( React.createElement( Filtered, { clientId: CLIENT, name, attributes: attrs } ) );
	} );
}

beforeEach( () => {
	document.head.innerHTML = '';
	document.body.innerHTML = `${ BLOCK_HTML }<div id="app"></div>`;
	reactRoot = createRoot( document.getElementById( 'app' ) );
	reduced = false;
	mockPreview = false;
	mockCreateNotice.mockClear();
	window.matchMedia = () => ( { matches: reduced } );
	window.requestAnimationFrame = ( cb ) => setTimeout( cb, 0 );
	window.cancelAnimationFrame = ( id ) => clearTimeout( id );
} );

afterEach( async () => {
	await act( async () => reactRoot.unmount() );
} );

describe( 'canvas motion preview', () => {
	it( 'writes one scoped style keyed by an attribute selector, and the resting markers only', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		expect( style().textContent ).toContain( `[id="block-${ CLIENT }"] .sgs-hero__media{--sgs-mh-to-s:1.04;` );
		expect( document.querySelectorAll( 'style[id^="sgs-motion-canvas-"]' ) ).toHaveLength( 1 );
		expect( media().getAttribute( 'data-sgs-mh' ) ).toBe( 'self' );
		expect( media().getAttribute( 'data-sgs-mc' ) ).toBe( 'scale' );
		expect( block().hasAttribute( 'data-sgs-me' ) ).toBe( false );
		expect( block().hasAttribute( 'style' ) ).toBe( false );
		expect( canReplay( CLIENT, 'root' ) ).toBe( true );
		expect( canReplay( CLIENT, 'media' ) ).toBe( false );
	} );

	it( 'never stamps an element of a nested block', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		const nested = document.querySelector( '[data-block="child-1"] .sgs-hero__media' );
		expect( nested.hasAttribute( 'data-sgs-mh' ) ).toBe( false );
	} );

	it( 'stamps custom targets by their last compound, with a leading > and a :hover', async () => {
		await mount( {
			[ MOTION_KEY ]: {
				v: 1,
				elements: {
					'custom:1': { selector: '> .sgs-hero__content p.lede', review, hover: { state: { values: { translateX: 2 } } } },
					'custom:2': { selector: 'a.cta:hover', review, hover: { state: { values: { scale: 1.03 } } } },
				},
			},
		} );
		expect( block().querySelector( 'p.lede' ).getAttribute( 'data-sgs-mc' ) ).toBe( 'translate' );
		expect( block().querySelector( 'a.cta' ).getAttribute( 'data-sgs-mc' ) ).toBe( 'scale' );
	} );

	it( 'restamps a part the block re-renders, and updates the style on change', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		await act( async () => {
			media().replaceWith( Object.assign( document.createElement( 'div' ), { className: 'sgs-hero__media' } ) );
		} );
		await flush();
		expect( media().getAttribute( 'data-sgs-mh' ) ).toBe( 'self' );
		const next = JSON.parse( JSON.stringify( motion ) );
		next.elements.media.hover.state.values.scale = 1.1;
		await mount( { [ MOTION_KEY ]: next } );
		expect( style().textContent ).toContain( '--sgs-mh-to-s:1.1;' );
	} );

	it( 'finds a block that mounts after the hook runs, with no timer', async () => {
		block().remove();
		await mount( { [ MOTION_KEY ]: motion } );
		expect( style() ).toBeNull();
		await act( async () => {
			document.body.insertAdjacentHTML( 'afterbegin', BLOCK_HTML );
		} );
		await flush();
		expect( style() ).not.toBeNull();
		expect( media().getAttribute( 'data-sgs-mh' ) ).toBe( 'self' );
	} );

	it( 'marks a linked block as the hover group even with no motion of its own', async () => {
		await mount( { sgsBlockLink: { url: '/x' } } );
		expect( block().hasAttribute( 'data-sgs-hover-group' ) ).toBe( true );
		expect( style() ).toBeNull();
	} );

	it( 'does nothing inside a block preview', async () => {
		mockPreview = true;
		await mount( { [ MOTION_KEY ]: motion } );
		expect( style() ).toBeNull();
		expect( media().hasAttribute( 'data-sgs-mh' ) ).toBe( false );
	} );

	it( 'removes the style and every marker on unmount', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		await act( async () => reactRoot.render( null ) );
		expect( style() ).toBeNull();
		expect( media().hasAttribute( 'data-sgs-mh' ) ).toBe( false );
		expect( media().hasAttribute( 'data-sgs-mc' ) ).toBe( false );
		expect( canReplay( CLIENT ) ).toBe( false );
	} );

	it( 'leaves a block without the support untouched', async () => {
		await mount( { [ MOTION_KEY ]: motion }, 'sgs/other' );
		expect( style() ).toBeNull();
		expect( media().attributes ).toHaveLength( 1 );
	} );
} );

describe( 'replay', () => {
	it( 'plays the entrance once and returns the element to rest when its animations settle', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		let settle;
		const finished = new Promise( ( resolve ) => {
			settle = resolve;
		} );
		block().getAnimations = () => [ { finished } ];
		const playing = replay( CLIENT, 'root' );
		expect( block().getAttribute( 'data-sgs-me' ) ).toBe( 'scroll opacity' );
		expect( block().hasAttribute( 'data-sgs-in' ) ).toBe( true );
		await act( async () => Promise.resolve() );
		expect( block().getAttribute( 'data-sgs-me' ) ).toBe( 'scroll opacity' );
		settle();
		await expect( playing ).resolves.toEqual( { played: true, reduced: false } );
		expect( block().hasAttribute( 'data-sgs-me' ) ).toBe( false );
		expect( block().hasAttribute( 'data-sgs-in' ) ).toBe( false );
		expect( mockCreateNotice ).not.toHaveBeenCalled();
	} );

	it( 'under reduced motion moves nothing and shows the one-line notice', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		reduced = true;
		await expect( replay( CLIENT, 'root' ) ).resolves.toEqual( { played: false, reduced: true } );
		expect( block().hasAttribute( 'data-sgs-me' ) ).toBe( false );
		expect( mockCreateNotice ).toHaveBeenCalledWith(
			'info',
			REPLAY_REDUCED_NOTICE,
			expect.objectContaining( { type: 'snackbar' } )
		);
	} );

	it( 'does nothing for a target without an entrance or an unknown block', async () => {
		await mount( { [ MOTION_KEY ]: motion } );
		await expect( replay( CLIENT, 'media' ) ).resolves.toEqual( { played: false, reduced: false } );
		await expect( replay( 'nope', 'root' ) ).resolves.toEqual( { played: false, reduced: false } );
	} );
} );
