/**
 * The carousel controls mount: one component for a slider block's arrows (and its pause button) and its dots.
 *
 * The arrows are the button kit's `arrow` button and the dots the carousel dots kit's `dot` set, so a block declares
 * `supports.sgs.builtinButtons` (prefix `arrow`) and `supports.sgs.carouselDots` (prefix `dot`), mounts this once, and prints the
 * look with `sgs_carousel_controls_css()` (`includes/helpers-carousel-dots.php`). The front-end behaviour is the shared runtime,
 * `src/shared/carousel/index.js`. Either kit a block does not declare renders nothing.
 *
 * @package
 */
import BuiltinButtonPanel, {
	builtinButtonAttrKeys,
} from './BuiltinButtonPanel';
import CarouselDotsPanel, { carouselDotsAttrKeys } from './CarouselDotsPanel';

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
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.blockName     Block name, to read its declarations.
 * @return {JSX.Element} The arrow and dot panels.
 */
export default function CarouselControls( {
	attributes,
	setAttributes,
	blockName,
} ) {
	return (
		<>
			<BuiltinButtonPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName={ blockName }
				prefix="arrow"
			/>
			<CarouselDotsPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName={ blockName }
				prefix="dot"
			/>
		</>
	);
}
