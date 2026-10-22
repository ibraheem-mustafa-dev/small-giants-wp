/**
 * sgs/business-info hours: today's row gets the modifier class in the browser, in the
 * business's own time zone.
 */
import { markToday, initialiseHoursToday, TODAY_CLASS } from '../../src/blocks/business-info/hours-today';

const LIST = `<dl data-sgs-hours-today data-timezone="Europe/London">
	<div class="sgs-business-hours__row" data-days="mon tue wed thu fri"></div>
	<div class="sgs-business-hours__row" data-days="sat"></div>
	<div class="sgs-business-hours__row" data-days="sun"></div>
</dl>`;

const marked = () => [ ...document.querySelectorAll( '.' + TODAY_CLASS ) ].map( ( row ) => row.getAttribute( 'data-days' ) );

describe( 'hours today row', () => {
	beforeEach( () => {
		document.body.innerHTML = LIST;
	} );

	it( 'marks the row whose days include the day', () => {
		markToday( document.querySelector( 'dl' ), 'wed' );
		expect( marked() ).toEqual( [ 'mon tue wed thu fri' ] );
		markToday( document.querySelector( 'dl' ), 'sun' );
		expect( marked() ).toEqual( [ 'sun' ] );
	} );

	it( 'reads the day in the business time zone', () => {
		// Saturday 23:30 UTC is already Sunday in +02:00.
		document.querySelector( 'dl' ).setAttribute( 'data-timezone', '+02:00' );
		initialiseHoursToday( document, new Date( '2026-10-24T23:30:00Z' ) );
		expect( marked() ).toEqual( [ 'sun' ] );
	} );

	it( 'marks Saturday in London on a Saturday afternoon', () => {
		initialiseHoursToday( document, new Date( '2026-10-24T12:00:00Z' ) );
		expect( marked() ).toEqual( [ 'sat' ] );
	} );
} );
