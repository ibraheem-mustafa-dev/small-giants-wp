/**
 * KitColourPanel: a kit's own Colour panel, for a block that keeps the kit's colour rows apart.
 *
 * The kit bodies (`button-kit/BuiltinButtonPanelBody.js`, `carousel-dots/CarouselDotsPanelBody.js`) never mount a Colour
 * panel themselves: a block with 12 or fewer base colours passes the kit's rows to its one main `SgsColourPanel`
 * (`builtinButtonColourRows`, `carouselDotsColourRows`), and a block over 12 mounts the kit with its colour rows left in
 * the kit's own panel, which this component draws. Stage E3 places that panel per part.
 *
 * @package
 */
import SgsColourPanel from './SgsColourPanel';

/**
 * @param {Object} props
 * @param {Array}  props.rows The kit's colour rows (headed pairs).
 * @return {JSX.Element|null} The panel.
 */
export default function KitColourPanel( { rows } ) {
	return rows && rows.length ? <SgsColourPanel rows={ rows } /> : null;
}
