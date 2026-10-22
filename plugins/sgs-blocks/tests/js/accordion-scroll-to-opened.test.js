/**
 * @jest-environment jsdom
 *
 * Accordion scroll-to-opened: scrolls only an opened header that is not fully in view, below the site header plus
 * the gap, and jumps under reduced motion. The markup tests pin the aria-controls pairing of both FAQ blocks.
 */
import fs from 'fs';
import path from 'path';
import {
	scrollOpenedIntoView,
	scheduleScrollToOpened,
} from '../../src/blocks/accordion/scroll-to-opened';

const blocks = path.join( __dirname, '../../src/blocks' );

function build( { top, bottom, open = true, enabled = 'true', gap = '' } ) {
	document.body.innerHTML = `<div class="sgs-accordion" data-scroll-to-opened="${ enabled }" data-scroll-gap="${ gap }"><details><summary>Q</summary><div>A</div></details></div>`;
	const accordion = document.querySelector( '.sgs-accordion' );
	const details = accordion.querySelector( 'details' );
	details.open = open;
	accordion.querySelector( 'summary' ).getBoundingClientRect = () => ( { top, bottom, height: bottom - top } );
	return { accordion, details };
}

function mockMotion( reduced ) {
	window.matchMedia = () => ( { matches: reduced } );
}

beforeEach( () => {
	window.scrollBy = jest.fn();
	window.innerHeight = 800;
	Element.prototype.getBoundingClientRect = function () {
		return { top: 0, bottom: 0, height: 0 };
	};
	mockMotion( false );
} );

describe( 'scrollOpenedIntoView', () => {
	it( 'does nothing when the header is fully in view', () => {
		const { accordion, details } = build( { top: 200, bottom: 250 } );
		expect( scrollOpenedIntoView( details, accordion ) ).toBe( false );
		expect( window.scrollBy ).not.toHaveBeenCalled();
	} );

	it( 'scrolls smoothly when the header sits above the visible area', () => {
		const { accordion, details } = build( { top: -40, bottom: 10 } );
		expect( scrollOpenedIntoView( details, accordion ) ).toBe( true );
		expect( window.scrollBy ).toHaveBeenCalledWith( { top: -40, behavior: 'smooth' } );
	} );

	it( 'scrolls when the header is cut off at the bottom', () => {
		const { accordion, details } = build( { top: 780, bottom: 830 } );
		expect( scrollOpenedIntoView( details, accordion ) ).toBe( true );
	} );

	it( 'jumps under reduced motion', () => {
		mockMotion( true );
		const { accordion, details } = build( { top: 900, bottom: 950 } );
		scrollOpenedIntoView( details, accordion );
		expect( window.scrollBy.mock.calls[ 0 ][ 0 ].behavior ).toBe( 'auto' );
	} );

	it( 'ignores a closed item', () => {
		const { accordion, details } = build( { top: -40, bottom: 10, open: false } );
		expect( scrollOpenedIntoView( details, accordion ) ).toBe( false );
	} );
} );

describe( 'scheduleScrollToOpened', () => {
	it( 'schedules nothing when the setting is off', () => {
		jest.useFakeTimers();
		const { accordion, details } = build( { top: -40, bottom: 10, enabled: 'false' } );
		scheduleScrollToOpened( details, accordion );
		jest.runAllTimers();
		expect( window.scrollBy ).not.toHaveBeenCalled();
		jest.useRealTimers();
	} );

	it( 'scrolls after the settle delay when the setting is on', () => {
		jest.useFakeTimers();
		const { accordion, details } = build( { top: -40, bottom: 10 } );
		scheduleScrollToOpened( details, accordion );
		expect( window.scrollBy ).not.toHaveBeenCalled();
		jest.advanceTimersByTime( 560 );
		expect( window.scrollBy ).toHaveBeenCalledTimes( 1 );
		jest.useRealTimers();
	} );
} );

describe( 'FAQ trigger and panel pairing', () => {
	it.each( [
		[ 'accordion-item', 'aria-controls="%s"', 'id="%s"' ],
	] )( '%s pairs aria-controls with a panel id', ( dir ) => {
		const src = fs.readFileSync( path.join( blocks, dir, 'render.php' ), 'utf8' );
		expect( src ).toMatch( /aria-controls="%s"/ );
		expect( src ).toMatch( /sgs-accordion-item__content" id="%s"/ );
		expect( src ).toMatch( /wp_unique_id\(/ );
	} );

	it( 'product-faq-item pairs aria-controls with the answer id', () => {
		const src = fs.readFileSync( path.join( blocks, 'product-faq-item/render.php' ), 'utf8' );
		expect( src ).toMatch( /aria-controls="<\?php echo esc_attr\( \$sgs_faq_panel_id \)/ );
		expect( src ).toMatch( /__answer" id="<\?php echo esc_attr\( \$sgs_faq_panel_id \)/ );
	} );

	it.each( [ 'accordion/style.css', 'product-faq/style.css' ] )( '%s leaves keyboard focus to the theme focus system', ( file ) => {
		const css = fs.readFileSync( path.join( blocks, file ), 'utf8' );
		expect( css ).not.toMatch( /:focus-visible\s*\{[^}]*outline:\s*(none|0)/ );
	} );
} );
