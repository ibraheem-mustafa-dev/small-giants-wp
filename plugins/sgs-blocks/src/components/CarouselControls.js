/**
 * The carousel controls mount: one component for a slider block's arrows (and its pause button) and its dots.
 *
 * The arrows are the button kit's `arrow` button and the dots the carousel dots kit's `dot` set, so a block declares
 * `supports.sgs.builtinButtons` (prefix `arrow`) and `supports.sgs.carouselDots` (prefix `dot`), mounts this once, and prints the
 * look with `sgs_carousel_controls_css()` (`includes/helpers-carousel-dots.php`). The front-end behaviour is the shared runtime,
 * `src/shared/carousel/index.js`. Either kit a block does not declare renders nothing.
 *
 * A block with 12 or fewer base colours passes `colourInMainPanel` and spreads `carouselControlsColourRows()` into its one
 * main `SgsColourPanel`; any other block leaves the colour rows in each kit's own Colour panel.
 *
 * @package
 */
import BuiltinButtonPanel, {
	builtinButtonAttrKeys,
	builtinButtonColourRows,
} from './BuiltinButtonPanel';
import CarouselDotsPanel, {
	carouselDotsAttrKeys,
	carouselDotsColourRows,
} from './CarouselDotsPanel';

/**
 * Every attribute the arrow and dot kits generate for a carousel block, so a caller derives the names instead of typing
 * them (the same pair `typographyAttrKeys` is for typography).
 *
 * @param {string[]} [groups] The arrow button's declared groups (`builtinButtonAttrKeys`); all groups when omitted.
 * @return {string[]} The attribute names.
 */
export function carouselControlsAttrKeys( groups ) {
	return [
		...builtinButtonAttrKeys( 'arrow', groups ),
		...carouselDotsAttrKeys( 'dot' ),
	];
}

/**
 * The arrow and dot kits' colour rows, for a block's own main `SgsColourPanel`.
 *
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block `setAttributes`.
 * @param {string}   args.blockName     Block name, to read its declarations.
 * @return {Array} Rows to spread into `SgsColourPanel`'s `rows`.
 */
export function carouselControlsColourRows( {
	attributes,
	setAttributes,
	blockName,
} ) {
	return [
		...builtinButtonColourRows( {
			attributes,
			setAttributes,
			blockName,
			prefix: 'arrow',
		} ),
		...carouselDotsColourRows( {
			attributes,
			setAttributes,
			blockName,
			prefix: 'dot',
		} ),
	];
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.blockName     Block name, to read its declarations.
 * @param {boolean}  [props.colourInMainPanel=false] True when the block draws both kits' colour rows in its main Colour panel.
 * @return {JSX.Element} The arrow and dot panels.
 */
export default function CarouselControls( {
	attributes,
	setAttributes,
	blockName,
	colourInMainPanel = false,
} ) {
	return (
		<>
			<BuiltinButtonPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName={ blockName }
				prefix="arrow"
				colourInMainPanel={ colourInMainPanel }
			/>
			<CarouselDotsPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName={ blockName }
				prefix="dot"
				colourInMainPanel={ colourInMainPanel }
			/>
		</>
	);
}
