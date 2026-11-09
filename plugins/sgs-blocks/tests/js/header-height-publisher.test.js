/**
 * Behaviour of the live header height (src/header-behaviours/live-header-height.js) in jsdom: a stylesheet, consumers, a publisher.
 * Each test pairs the behaviour with a negative control: the element or call that must NOT be affected.
 */
import {
	createHeightPublisher,
	createLiveHeight,
	hostSelector,
	splitSelectorList,
} from '../../src/header-behaviours/live-header-height';

const DELAY = 200;
const PROP = '--sgs-header-height';
const read = ( el ) => el.style.getPropertyValue( PROP );

function addStyle( css ) {
	const style = document.createElement( 'style' );
	style.textContent = css;
	document.head.appendChild( style );
	return style;
}

function addEl( cls ) {
	const el = document.createElement( 'div' );
	el.className = cls;
	document.body.appendChild( el );
	return el;
}

// The mutation observer delivers in a microtask; the rebuild runs after the delay.
async function settle() {
	await Promise.resolve();
	jest.advanceTimersByTime( DELAY + 1 );
}

beforeEach( () => {
	jest.useFakeTimers();
	document.head.innerHTML = '';
	document.body.innerHTML = '';
} );
afterEach( () => jest.useRealTimers() );

describe( 'consumers receive the live value', () => {
	test( 'an element a rule positions from the property gets it; one that does not stays untouched', () => {
		addStyle( '.stick{position:sticky;top:calc(var(--sgs-header-height,0px) + 10px)}.plain{top:5px}' );
		const consumer = addEl( 'stick' );
		const other = addEl( 'plain' );
		const live = createLiveHeight( { delay: DELAY } );
		live.set( '65px' );
		expect( read( consumer ) ).toBe( '65px' );
		expect( read( other ) ).toBe( '' );
	} );

	test( 'a later value replaces the earlier one without any query', () => {
		addStyle( '.stick{top:var(--sgs-header-height,0px)}' );
		const consumer = addEl( 'stick' );
		const live = createLiveHeight( { delay: DELAY } );
		live.set( '85px' );
		const spy = jest.spyOn( document, 'querySelectorAll' );
		live.set( '65px' );
		live.set( '70px' );
		expect( read( consumer ) ).toBe( '70px' );
		expect( spy ).not.toHaveBeenCalled();
		spy.mockRestore();
	} );

	test( 'a pseudo-element consumer reaches its host element', () => {
		addStyle( '.host::before{top:var(--sgs-header-height,0px)}.bare::before{top:3px}' );
		const host = addEl( 'host' );
		const bare = addEl( 'bare' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		expect( read( host ) ).toBe( '65px' );
		expect( read( bare ) ).toBe( '' );
	} );

	test( 'one unparseable member does not drop the rest of its list', () => {
		addStyle( '.good,.bad:not-a-real-pseudo(1){top:var(--sgs-header-height,0px)}' );
		const good = addEl( 'good' );
		const bad = addEl( 'bad' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		expect( read( good ) ).toBe( '65px' );
		expect( read( bad ) ).toBe( '' );
	} );

	test( 'rules inside a media query are collected', () => {
		addStyle( '@media (min-width:1px){.inmedia{top:var(--sgs-header-height,0px)}}' );
		const el = addEl( 'inmedia' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		expect( read( el ) ).toBe( '65px' );
	} );
} );

describe( 'the cache follows the page', () => {
	test( 'an element added later receives the current value after the delay, not before', async () => {
		addStyle( '.stick{top:var(--sgs-header-height,0px)}' );
		const live = createLiveHeight( { delay: DELAY } );
		live.set( '65px' );
		const late = addEl( 'stick' );
		await Promise.resolve();
		jest.advanceTimersByTime( DELAY - 50 );
		expect( read( late ) ).toBe( '' );
		jest.advanceTimersByTime( 100 );
		expect( read( late ) ).toBe( '65px' );
	} );

	test( 'a burst of additions rebuilds once', async () => {
		addStyle( '.burst{top:var(--sgs-header-height,0px)}' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		const spy = jest.spyOn( document, 'querySelectorAll' );
		for ( let i = 0; i < 20; i++ ) {
			addEl( 'x' );
			await Promise.resolve();
			jest.advanceTimersByTime( 5 );
		}
		await settle();
		expect( spy.mock.calls.filter( ( c ) => '.burst' === c[ 0 ] ) ).toHaveLength( 1 );
		spy.mockRestore();
	} );

	test( 'an element that stops matching loses the property; one that still matches keeps it', async () => {
		addStyle( '.stick{top:var(--sgs-header-height,0px)}' );
		const leaving = addEl( 'stick' );
		const staying = addEl( 'stick' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		expect( read( leaving ) ).toBe( '65px' );
		leaving.className = 'other';
		addEl( 'trigger' );
		await settle();
		expect( read( leaving ) ).toBe( '' );
		expect( read( staying ) ).toBe( '65px' );
	} );

	test( 'a stylesheet added later is collected', async () => {
		const live = createLiveHeight( { delay: DELAY } );
		live.set( '65px' );
		const el = addEl( 'late-rule' );
		addStyle( '.late-rule{top:var(--sgs-header-height,0px)}' );
		await settle();
		expect( read( el ) ).toBe( '65px' );
	} );

	test( 'a <link> load re-collects rules even when the sheet count is unchanged; another element load does not', async () => {
		const style = addStyle( '.a{top:1px}' );
		const el = addEl( 'b' );
		createLiveHeight( { delay: DELAY } ).set( '65px' );
		style.textContent = '.a{top:1px}.b{top:var(--sgs-header-height,0px)}';
		document.body.dispatchEvent( new Event( 'load' ) );
		await settle();
		expect( read( el ) ).toBe( '' );
		const link = document.createElement( 'link' );
		document.head.appendChild( link );
		await settle();
		link.dispatchEvent( new Event( 'load' ) );
		await settle();
		expect( read( el ) ).toBe( '65px' );
	} );
} );

describe( 'the resting value', () => {
	function sinks() {
		return { live: jest.fn(), resting: jest.fn() };
	}

	test( 'is not rewritten when the header shrinks while scrolled, and the live value still is', () => {
		const s = sinks();
		const publish = createHeightPublisher( s );
		publish( 85, true, false );
		publish( 65, false, true );
		expect( s.resting ).toHaveBeenCalledTimes( 1 );
		expect( s.resting ).toHaveBeenCalledWith( '85px' );
		expect( s.live ).toHaveBeenLastCalledWith( '65px' );
	} );

	test( 'is rewritten on a rise, on an exact publish, at the top of the page and on an unpin', () => {
		const s = sinks();
		const publish = createHeightPublisher( s );
		publish( 65, true, false );
		publish( 85, false, true );
		expect( s.resting ).toHaveBeenLastCalledWith( '85px' );
		publish( 60, true, true );
		expect( s.resting ).toHaveBeenLastCalledWith( '60px' );
		publish( 50, false, false );
		expect( s.resting ).toHaveBeenLastCalledWith( '50px' );
		publish( 0, false, true );
		expect( s.resting ).toHaveBeenLastCalledWith( '0px' );
	} );

	test( 'an unchanged edge writes nothing', () => {
		const s = sinks();
		const publish = createHeightPublisher( s );
		publish( 85, true, false );
		publish( 85, false, false );
		expect( s.resting ).toHaveBeenCalledTimes( 1 );
		expect( s.live ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'selector helpers', () => {
	test( 'split on top-level commas only', () => {
		expect( splitSelectorList( '.a:is(.b,.c),.d[x="1,2"] , .e' ) ).toEqual( [ '.a:is(.b,.c)', '.d[x="1,2"]', '.e' ] );
	} );
	test( 'pseudo-elements are stripped, pseudo-classes kept', () => {
		expect( hostSelector( '.x::before' ) ).toBe( '.x' );
		expect( hostSelector( '.x:hover::after' ) ).toBe( '.x:hover' );
		expect( hostSelector( '.x:before' ) ).toBe( '.x' );
	} );
} );
