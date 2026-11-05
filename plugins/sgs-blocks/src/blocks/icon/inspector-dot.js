/**
 * sgs/icon inspector: the Signed-in dot panel (show, size, position, ring). The dot's colour is a row of the block's
 * one Colour panel (inspector.js).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl } from '../../components';
import { patchTier } from '../../utils';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @return {JSX.Element} The Signed-in dot panel.
 */
export default function IconDotPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Signed-in dot', 'sgs-blocks' ) } initialOpen={ !! attributes.showSignedInDot }>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show a signed-in dot', 'sgs-blocks' ) }
				help={ __( 'A small dot on the icon, visible only to a signed-in visitor. Safe with page caching.', 'sgs-blocks' ) }
				checked={ !! attributes.showSignedInDot }
				onChange={ ( value ) => setAttributes( { showSignedInDot: value } ) }
			/>
			{ attributes.showSignedInDot && (
				<>
					<ResponsiveControl label={ __( 'Dot size', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<SgsLengthControl
								label={ __( 'Dot size', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ attributes.signedInDotSize?.[ tier ] ?? '' }
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'signedInDotSize', tier, value ) }
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Distance from the top', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<SgsLengthControl
								label={ __( 'Distance from the top', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ attributes.signedInDotTop?.[ tier ] ?? '' }
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'signedInDotTop', tier, value ) }
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Distance from the end edge', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<SgsLengthControl
								label={ __( 'Distance from the end edge', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ attributes.signedInDotRight?.[ tier ] ?? '' }
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'signedInDotRight', tier, value ) }
							/>
						) }
					</ResponsiveControl>
					<SgsLengthControl
						label={ __( 'Ring width', 'sgs-blocks' ) }
						help={ __( 'Used when a ring colour is set; empty = 2px.', 'sgs-blocks' ) }
						value={ attributes.signedInDotRingWidth ?? '' }
						onChange={ ( value ) => setAttributes( { signedInDotRingWidth: value || '' } ) }
					/>
				</>
			) }
		</PanelBody>
	);
}
