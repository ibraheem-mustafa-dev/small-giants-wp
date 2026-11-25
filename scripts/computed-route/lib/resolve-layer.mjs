// A setting that paints a cover layer (its `::before` or `::after`, switched on with `inset`) paints the element it covers
// (Spec 48 FR-48-8; plan RF1 (b)): the hover pill the nav items draw on `__link::before` (`itemBgHover`), the trigger fill on
// `__trigger::after` (`pillBgColourHover`), is what the draft states as the plain element's hover background. The record keeps the
// layer's `inset` among the setting's effects (`<path>|inset`), which is what marks the layer as covering.

const LAYER = /::(?:before|after)$/;
const COVER_PROPS = new Set( [ 'background-color', 'background-image' ] );

// Whether the record path `p` of setting entry `c` is a cover layer over the element at `slot`, for a draft value of `prop`.
export function coversSlot( c, p, slot, prop ) {
	return COVER_PROPS.has( prop ) && LAYER.test( String( p ) ) && String( p ).replace( LAYER, '' ) === slot && ( c?.effects || [] ).includes( `${ p }|inset` );
}
