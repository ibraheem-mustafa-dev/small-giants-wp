/**
 * Editor-only "Preview drawer open" state shared by the blocks that own a drawer
 * (sgs/nav-drawer, sgs/cart).
 *
 * The drawer is collapsed (or not drawn) in the canvas by default so it never moves the
 * surrounding layout; this hook holds the session-only open state and returns the
 * inspector panel that flips it. The state is never serialised.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { PanelBody, ToggleControl } from '@wordpress/components';

/**
 * @param {Object} [options]
 * @param {string} [options.title] Inspector panel title.
 * @param {string} [options.help]  Help text under the toggle.
 * @return {Array} [ previewOpen, control ] where control is the inspector PanelBody to render inside InspectorControls.
 */
export default function useDrawerPreviewToggle( { title, help } = {} ) {
	const [ previewOpen, setPreviewOpen ] = useState( false );
	const control = (
		<PanelBody title={ title || __( 'Drawer', 'sgs-blocks' ) }>
			<ToggleControl
				label={ __( 'Preview drawer open', 'sgs-blocks' ) }
				help={
					help ||
					__(
						'Expands the drawer in the editor so you can edit its contents. Affects this editing session only — it is not saved and does not change the site.',
						'sgs-blocks'
					)
				}
				checked={ previewOpen }
				onChange={ setPreviewOpen }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
	return [ previewOpen, control ];
}
