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
import BuiltinButtonPanel from './BuiltinButtonPanel';
import CarouselDotsPanel from './CarouselDotsPanel';

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
