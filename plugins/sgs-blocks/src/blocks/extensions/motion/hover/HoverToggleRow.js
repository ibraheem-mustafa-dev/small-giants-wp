/**
 * The block-declared toggle row of the Hover panel (`supports.sgs.motion.hoverToggle`): a boolean attribute of the block
 * itself that governs a hover movement the block's own stylesheet paints, shown on the root target only. `sgs/button` uses
 * it for "Button style's built-in lift" (`builtInHoverLift`); a block that does not declare it shows nothing.
 *
 * @package
 */

import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { getBlockType } from '@wordpress/blocks';
import BooleanAtom from '../../../../components/motion/BooleanAtom';

/**
 * @param {Object} props
 * @param {string} props.blockName The block's name.
 * @param {string} props.clientId  The block's client id.
 * @return {Element|null} The row, or null when the block declares no toggle.
 */
export default function HoverToggleRow( { blockName, clientId } ) {
	const toggle =
		getBlockType( blockName )?.supports?.sgs?.motion?.hoverToggle;
	const attribute = toggle?.attribute;
	const value = useSelect(
		( select ) =>
			attribute
				? select( blockEditorStore ).getBlockAttributes( clientId )?.[
						attribute
				  ]
				: undefined,
		[ clientId, attribute ]
	);
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	if ( ! attribute ) {
		return null;
	}
	return (
		<BooleanAtom
			label={ toggle.label }
			help={ toggle.help }
			value={ value !== false }
			presetValue={ true }
			onChange={ ( next ) =>
				updateBlockAttributes( clientId, {
					[ attribute ]: next !== false,
				} )
			}
		/>
	);
}
