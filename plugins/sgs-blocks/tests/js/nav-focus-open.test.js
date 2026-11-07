/**
 * @jest-environment jsdom
 *
 * Keyboard-focus open for a bar disclosure: when focus opens a panel, and when focus leaving closes it.
 */
import {
	focusInDecision,
	focusOutShouldClose,
} from '../../src/shared/nav-interactivity/focus-open';

function build() {
	document.body.innerHTML =
		'<div id="root"><a id="link" href="#">About</a><button id="chev"></button><div id="panel"><a id="inner" href="#">Story</a></div></div><a id="outside" href="#">Elsewhere</a>';
	const $ = ( id ) => document.getElementById( id );
	return { root: $( 'root' ), panel: $( 'panel' ), link: $( 'link' ), chev: $( 'chev' ), inner: $( 'inner' ), outside: $( 'outside' ) };
}

describe( 'focusInDecision', () => {
	const base = { isOpen: false, refocusing: false, focusVisible: true };

	it( 'opens for keyboard focus on the item', () => {
		const { root, panel, link, chev } = build();
		expect( focusInDecision( { ...base, target: link, root, panel } ) ).toBe( 'open' );
		expect( focusInDecision( { ...base, target: chev, root, panel } ) ).toBe( 'open' );
	} );

	it( 'does nothing for a mouse press or tap (not focus-visible)', () => {
		const { root, panel, link } = build();
		expect( focusInDecision( { ...base, focusVisible: false, target: link, root, panel } ) ).toBe( 'none' );
	} );

	it( 'does nothing while focus is handed back after Escape', () => {
		const { root, panel, link } = build();
		expect( focusInDecision( { ...base, refocusing: true, target: link, root, panel } ) ).toBe( 'none' );
	} );

	it( 'does nothing for focus already inside the panel', () => {
		const { root, panel, inner } = build();
		expect( focusInDecision( { ...base, target: inner, root, panel } ) ).toBe( 'none' );
	} );

	it( 'does nothing for focus outside the root', () => {
		const { root, panel, outside } = build();
		expect( focusInDecision( { ...base, target: outside, root, panel } ) ).toBe( 'none' );
	} );

	it( 'only marks a panel that is already open', () => {
		const { root, panel, link } = build();
		expect( focusInDecision( { ...base, isOpen: true, target: link, root, panel } ) ).toBe( 'mark' );
	} );

	it( 'copes with a panel that is not in the root any more', () => {
		const { root, link } = build();
		expect( focusInDecision( { ...base, target: link, root, panel: null } ) ).toBe( 'open' );
	} );
} );

describe( 'focusOutShouldClose', () => {
	const base = { openedByFocus: true, isOpen: true, pointerInside: false };

	it( 'closes when focus leaves for somewhere else', () => {
		const { root, panel, outside } = build();
		expect( focusOutShouldClose( { ...base, related: outside, root, panel } ) ).toBe( true );
		expect( focusOutShouldClose( { ...base, related: null, root, panel } ) ).toBe( true );
	} );

	it( 'stays open while focus moves within the item or into the panel', () => {
		const { root, panel, chev, inner } = build();
		expect( focusOutShouldClose( { ...base, related: chev, root, panel } ) ).toBe( false );
		expect( focusOutShouldClose( { ...base, related: inner, root, panel } ) ).toBe( false );
	} );

	it( 'stays open for a panel moved out of the root when focus goes into it', () => {
		const { root, outside } = build();
		const moved = document.createElement( 'div' );
		const child = document.createElement( 'a' );
		moved.appendChild( child );
		document.body.appendChild( moved );
		expect( focusOutShouldClose( { ...base, related: child, root, panel: moved } ) ).toBe( false );
		expect( focusOutShouldClose( { ...base, related: outside, root, panel: moved } ) ).toBe( true );
	} );

	it( 'never closes a panel that focus did not open (hover or click opened it)', () => {
		const { root, panel, outside } = build();
		expect( focusOutShouldClose( { ...base, openedByFocus: false, related: outside, root, panel } ) ).toBe( false );
	} );

	it( 'leaves a pointer-held panel open, and does nothing once closed', () => {
		const { root, panel, outside } = build();
		expect( focusOutShouldClose( { ...base, pointerInside: true, related: outside, root, panel } ) ).toBe( false );
		expect( focusOutShouldClose( { ...base, isOpen: false, related: outside, root, panel } ) ).toBe( false );
	} );
} );
