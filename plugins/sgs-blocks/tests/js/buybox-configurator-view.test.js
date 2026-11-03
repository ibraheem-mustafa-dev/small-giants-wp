/**
 * @jest-environment jsdom
 */

const GROUP = ( share, start = '' ) => `
<div class="sgs-buybox sgs-buybox--configurator" data-sgs-pick-summary="1" data-wp-context='{"selectedAxes":{"pa_size":"small"},"combos":{"pa_size:small":{"priceMinor":2380}},"currencySymbol":"£"}'>
  <div data-sgs-pick data-summary="Your {pack}: {split}" data-pack-axis="pa_size" data-pack-units='{"small":20}' data-pack-labels='{"small":"20 pack"}' data-layer-axis="" data-layer-colours="{}">
    <div class="sgs-buybox-pick__groups">
      <div data-sgs-pick-group="flavour" data-least="1" data-most="3" data-overflow="replace" data-share="${ share }" data-label="Flavour" data-limit-message="Up to 3" data-least-message="Choose at least 1 flavour">
        ${ [ 'vanilla', 'mango', 'mint', 'plum' ].map( ( s ) => `<label><input class="sgs-buybox-pick__input" type="checkbox" value="${ s }" data-label="${ s[ 0 ].toUpperCase() + s.slice( 1 ) }" data-colour="#abcdef" ${ s === start ? 'checked' : '' }><span data-sgs-stepper hidden><button type="button" data-step="-1">-</button><output class="sgs-buybox-pick__count">0</output><button type="button" data-step="1">+</button><input type="hidden" data-sgs-count disabled></span></label>` ).join( '' ) }
        <p class="sgs-buybox-pick__group-error" id="err1" hidden></p>
      </div>
    </div>
    <div data-sgs-preview role="img" aria-label=""><span data-sgs-dots></span></div>
    <p data-sgs-caption></p><p data-sgs-per-unit hidden></p>
    <p data-sgs-live></p><p data-sgs-undo-row hidden><button type="button" data-sgs-undo>Undo</button></p>
  </div>
  <p class="sgs-buybox__bar-variant"></p>
  <form class="buybox__cart-form"><button type="submit" class="buybox__add-to-cart">Add</button></form>
</div>`;

async function setup( share, start ) {
	jest.resetModules();
	document.body.innerHTML = GROUP( share, start );
	window.requestAnimationFrame = ( cb ) => cb();
	await import( '../../src/blocks/buybox/configurator-view.js' );
	return document.querySelector( '.sgs-buybox' );
}

const click = ( root, slug ) => {
	const input = root.querySelector( `input[value="${ slug }"]` );
	input.checked = ! input.checked;
	input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
};

describe( 'Pick a set view', () => {
	test( 'Start with is selected and the equal split is shown', async () => {
		const root = await setup( 'equal', 'vanilla' );
		expect( root.querySelector( '[data-sgs-caption]' ).textContent ).toBe( 'Your 20: All 20 Vanilla' );
		click( root, 'mango' );
		click( root, 'mint' );
		expect( root.querySelector( '[data-sgs-caption]' ).textContent ).toBe( 'Your 20: 7 Vanilla · 7 Mango · 6 Mint' );
		expect( root.querySelector( '[data-sgs-preview]' ).getAttribute( 'aria-label' ) ).toContain( '7 Vanilla' );
		expect( root.querySelector( '.sgs-buybox__bar-variant' ).textContent ).toContain( '7 Vanilla' );
		expect( root.querySelector( '[data-sgs-per-unit]' ).textContent ).toBe( '£1.19 each' );
	} );

	test( 'the last pick of a least-1 group cannot be cleared', async () => {
		const root = await setup( 'equal', 'vanilla' );
		click( root, 'vanilla' );
		expect( root.querySelector( 'input[value="vanilla"]' ).checked ).toBe( true );
		expect( root.querySelector( '[data-sgs-live]' ).textContent ).toBe( 'Keep at least 1' );
	} );

	test( 'a fourth pick swaps out the oldest, announces it and Undo restores it with focus', async () => {
		const root = await setup( 'equal', 'vanilla' );
		click( root, 'mango' );
		click( root, 'mint' );
		click( root, 'plum' );
		expect( root.querySelector( 'input[value="vanilla"]' ).checked ).toBe( false );
		expect( root.querySelector( '[data-sgs-live]' ).textContent ).toBe( 'Plum added, Vanilla removed' );
		expect( root.querySelector( '[data-sgs-undo-row]' ).hidden ).toBe( false );
		root.querySelector( '[data-sgs-undo]' ).click();
		expect( root.querySelector( 'input[value="vanilla"]' ).checked ).toBe( true );
		expect( root.querySelector( 'input[value="plum"]' ).checked ).toBe( false );
		expect( document.activeElement ).toBe( root.querySelector( 'input[value="vanilla"]' ) );
	} );

	test( 'Add is gated with a message when the least is not met, and passes picks when it is', async () => {
		const root = await setup( 'equal', '' );
		const form = root.querySelector( 'form' );
		const blocked = new Event( 'submit', { bubbles: true, cancelable: true } );
		form.dispatchEvent( blocked );
		expect( blocked.defaultPrevented ).toBe( true );
		expect( root.querySelector( '#err1' ).textContent ).toBe( 'Choose at least 1 flavour' );
		expect( root.querySelector( '.buybox__add-to-cart' ).getAttribute( 'aria-describedby' ) ).toBe( 'err1' );
		click( root, 'mango' );
		const ok = new Event( 'submit', { bubbles: true, cancelable: true } );
		form.dispatchEvent( ok );
		expect( ok.defaultPrevented ).toBe( false );
		expect( JSON.parse( root.dataset.extraPicks ) ).toEqual( { flavour: [ { slug: 'mango', count: 0 } ] } );
	} );

	test( 'shopper-set counts: the total must equal the pack', async () => {
		const root = await setup( 'counts', 'vanilla' );
		click( root, 'mango' );
		const step = ( slug, delta ) => root.querySelector( `input[value="${ slug }"]` ).closest( 'label' ).querySelector( `[data-step="${ delta }"]` );
		step( 'mango', 1 ).click(); // The pack is full, so a step up is refused.
		expect( root.querySelector( 'input[value="mango"]' ).closest( 'label' ).querySelector( '.sgs-buybox-pick__count' ).textContent ).toBe( '1' );
		step( 'vanilla', -1 ).click();
		step( 'mango', 1 ).click();
		const form = root.querySelector( 'form' );
		const ok = new Event( 'submit', { bubbles: true, cancelable: true } );
		form.dispatchEvent( ok );
		expect( ok.defaultPrevented ).toBe( false );
		expect( JSON.parse( root.dataset.extraPicks ).flavour ).toEqual( [ { slug: 'vanilla', count: 18 }, { slug: 'mango', count: 2 } ] );
	} );
} );
