/**
 * BackgroundPanel: the shared Background panel of the blocks that render their background through the media system
 * (`backgroundSource`, Spec 49 §9.4): the shared media panel plus the wrapper's own surface and extra-SVG-layer sections.
 *
 * @package SGS\Blocks
 */
import { BackgroundMediaPanel } from './BackgroundMediaPanel';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.name          Block name.
 * @return {JSX.Element} The panel.
 */
export function BackgroundPanel( props ) {
	return <BackgroundMediaPanel { ...props } />;
}
