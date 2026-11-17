/**
 * @jest-environment jsdom
 *
 * The three public hooks of the Pick a set preview: `--sgs-pick-axis-<axis>` on the root, `is-changed` on the preview,
 * and the dot custom properties a site's CSS can restyle.
 */

const MARKUP = `
<style>
  #b1 + .sgs-option-picker__pill .sgs-option-picker__swatch--colour{--sgs-op-swatch-bg:#7A4A2E;}
  #b2 + .sgs-option-picker__pill .sgs-option-picker__swatch--colour{--sgs-op-swatch-bg:#FFF6E6;}
</style>
<div class="sgs-buybox sgs-buybox--configurator" data-wp-context='{"selectedAxes":{"pa_size":"small","pa_base":"milk","pa_chip":"milk"},"combos":{}}'>
  <div data-sgs-pick data-summary="Your {pack}: {split}" data-pack-axis="pa_size" data-pack-units='{"small":20}' data-pack-labels='{"small":"20 pack"}' data-layer-axis="pa_chip" data-layer-colours='{"milk":"#7A4A2E"}'>
    <fieldset class="sgs-option-picker"><div class="sgs-option-picker__options" data-type-key="pa_size">
      <label><input type="radio" name="u-s" id="s1" value="small" checked><span class="sgs-option-picker__pill"><span class="sgs-option-picker__pill-label">20 pack</span></span></label>
    </div></fieldset>
    <fieldset class="sgs-option-picker"><div class="sgs-option-picker__options" data-type-key="pa_base_type">
      <label><input type="radio" name="u-b" id="b1" value="milk" checked><span class="sgs-option-picker__pill"><span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour"></span><span class="sgs-option-picker__pill-label">Milk</span></span></label>
      <label><input type="radio" name="u-b" id="b2" value="white"><span class="sgs-option-picker__pill"><span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour"></span><span class="sgs-option-picker__pill-label">White</span></span></label>
      <label><input type="radio" name="u-b" id="b3" value="plain"><span class="sgs-option-picker__pill"><span class="sgs-option-picker__pill-label">Plain</span></span></label>
    </div></fieldset>
    <div data-sgs-pick-group="flavour" data-least="1" data-most="3" data-overflow="replace" data-share="none" data-label="Flavour">
      <label><input class="sgs-buybox-pick__input" type="checkbox" value="mango" data-label="Mango" data-colour="#abcdef" checked></label>
      <p class="sgs-buybox-pick__group-error" id="e1" hidden></p>
    </div>
    <div data-sgs-preview role="img" aria-label=""><span data-sgs-dots></span></div>
    <p data-sgs-caption></p><p data-sgs-live></p>
  </div>
  <form class="buybox__cart-form"><button type="submit" class="buybox__add-to-cart">Add</button></form>
</div>`;

async function setup( reduced = false ) {
	jest.resetModules();
	jest.useFakeTimers();
	document.body.innerHTML = MARKUP;
	window.requestAnimationFrame = ( cb ) => cb();
	window.matchMedia = () => ( { matches: reduced } );
	await import( '../../src/blocks/buybox/configurator-view.js' );
	return document.querySelector( '.sgs-buybox' );
}

const choose = ( id ) => {
	const input = document.getElementById( id );
	input.checked = true;
	input.closest( 'label' ).parentElement.dispatchEvent( new Event( 'x' ) );
	document.querySelector( '.sgs-buybox' ).dispatchEvent( new CustomEvent( 'sgs:option-selected', { detail: { typeKey: 'pa_base_type', selectedKey: input.value } } ) );
	jest.runOnlyPendingTimers();
};

afterEach( () => jest.useRealTimers() );

describe( 'Pick a set preview hooks', () => {
	test( 'the chosen option colour is published per axis and removed when the option has none', async () => {
		const root = await setup();
		expect( root.style.getPropertyValue( '--sgs-pick-axis-base-type' ) ).toBe( '#7A4A2E' );
		expect( root.style.getPropertyValue( '--sgs-pick-axis-size' ) ).toBe( '' );
		choose( 'b2' );
		expect( root.style.getPropertyValue( '--sgs-pick-axis-base-type' ) ).toBe( '#FFF6E6' );
		choose( 'b3' );
		expect( root.style.getPropertyValue( '--sgs-pick-axis-base-type' ) ).toBe( '' );
	} );

	test( 'is-changed is not set at load, is set on a change and goes after the timeout or animationend', async () => {
		const root = await setup();
		const preview = root.querySelector( '[data-sgs-preview]' );
		expect( preview.classList.contains( 'is-changed' ) ).toBe( false );
		choose( 'b2' );
		expect( preview.classList.contains( 'is-changed' ) ).toBe( true );
		preview.dispatchEvent( new Event( 'animationend' ) );
		expect( preview.classList.contains( 'is-changed' ) ).toBe( false );
		choose( 'b1' );
		expect( preview.classList.contains( 'is-changed' ) ).toBe( true );
		jest.advanceTimersByTime( 1100 );
		expect( preview.classList.contains( 'is-changed' ) ).toBe( false );
	} );

	test( 'is-changed is skipped when the visitor prefers reduced motion', async () => {
		const root = await setup( true );
		choose( 'b2' );
		expect( root.querySelector( '[data-sgs-preview]' ).classList.contains( 'is-changed' ) ).toBe( false );
	} );

	test( 'a pick-group change also toggles it', async () => {
		const root = await setup();
		const box = root.querySelector( 'input[value="mango"]' );
		box.checked = false;
		box.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		// The last pick of a least-1 group is kept, but the change still ran the hook.
		expect( root.querySelector( '[data-sgs-preview]' ).classList.contains( 'is-changed' ) ).toBe( true );
	} );

	test( 'chips and dots are classed by kind and coloured by custom properties, not an inline background', async () => {
		const root = await setup();
		const chips = root.querySelectorAll( '.sgs-buybox-pick__dot--chip' );
		const flavours = root.querySelectorAll( '.sgs-buybox-pick__dot--flavour' );
		expect( chips ).toHaveLength( 12 );
		expect( flavours ).toHaveLength( 7 );
		expect( chips[ 0 ].style.getPropertyValue( '--sgs-pick-dot-bg' ) ).toBe( '#7A4A2E' );
		expect( chips[ 0 ].style.getPropertyValue( '--sgs-pick-dot-radius' ) ).toBe( '4px' );
		expect( flavours[ 0 ].style.getPropertyValue( '--sgs-pick-dot-bg' ) ).toBe( '#abcdef' );
		expect( flavours[ 0 ].style.getPropertyValue( '--sgs-pick-dot-radius' ) ).toBe( '50%' );
		expect( flavours[ 0 ].style.background ).toBe( '' );
		expect( flavours[ 0 ].style.left ).toBe( '' );
	} );
} );
