/**
 * "When the menu collapses to a burger" — the `sgsCollapseVisibility` control.
 *
 * Rendered under the device toggles in conditional-visibility.js, and only for
 * a block inside an `sgs/site-header`: the header writes the hide/show rules at
 * the collapse point of the menu that owns its burger (site-header/render.php),
 * so outside a header the setting would do nothing.
 *
 * @package SGS\Blocks
 */
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props               Component props.
 * @param {string}   props.clientId      The block's client id.
 * @param {string}   props.value         Stored `sgsCollapseVisibility`.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element|null} The control, or null outside a header.
 */
export default function CollapseVisibilityControl( {
	clientId,
	value,
	setAttributes,
} ) {
	const inHeader = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockParentsByBlockName(
				clientId,
				'sgs/site-header'
			).length > 0,
		[ clientId ]
	);

	if ( ! inHeader ) {
		return null;
	}

	return (
		<SelectControl
			label={ __( 'When the menu collapses to a burger', 'sgs-blocks' ) }
			help={ __(
				'Follows the header menu’s own collapse size, not the device sizes. Put a copy in the menu drawer to move this block there.',
				'sgs-blocks'
			) }
			value={ value || '' }
			options={ [
				{ label: __( 'Always show', 'sgs-blocks' ), value: '' },
				{ label: __( 'Hide', 'sgs-blocks' ), value: 'hide' },
				{ label: __( 'Show only then', 'sgs-blocks' ), value: 'only' },
			] }
			onChange={ ( next ) =>
				setAttributes( { sgsCollapseVisibility: next } )
			}
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
