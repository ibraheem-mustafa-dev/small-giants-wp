/**
 * sgs/icon inspector: the Signed-in dot panel (show, size, position, ring). The dot's colours are rows of the block's
 * one Colour panel (inspector.js). The switch is shown; the geometry controls are optional items of the tools panel.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { patchTier } from '../../utils';

const filled = ( value ) => !! value && Object.keys( value ).length > 0;

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @return {JSX.Element} The Signed-in dot panel.
 */
export default function IconDotPanel( { attributes, setAttributes } ) {
	const on = !! attributes.showSignedInDot;
	return (
		<ToolsPanel
			label={ __( 'Signed-in dot', 'sgs-blocks' ) }
			resetAll={ () =>
				setAttributes( {
					showSignedInDot: false,
					signedInDotSize: {},
					signedInDotTop: {},
					signedInDotRight: {},
					signedInDotRingWidth: '',
				} )
			}
		>
			<ToolsPanelItem
				label={ __( 'Show a signed-in dot', 'sgs-blocks' ) }
				hasValue={ () => on }
				onDeselect={ () => setAttributes( { showSignedInDot: false } ) }
				isShownByDefault
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Show a signed-in dot', 'sgs-blocks' ) }
					help={ __( 'A small dot on the icon, visible only to a signed-in visitor. Safe with page caching.', 'sgs-blocks' ) }
					checked={ on }
					onChange={ ( value ) => setAttributes( { showSignedInDot: value } ) }
				/>
			</ToolsPanelItem>
			{ on && (
				<ToolsPanelItem
					label={ __( 'Dot size', 'sgs-blocks' ) }
					hasValue={ () => filled( attributes.signedInDotSize ) }
					onDeselect={ () => setAttributes( { signedInDotSize: {} } ) }
				>
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
				</ToolsPanelItem>
			) }
			{ on && (
				<ToolsPanelItem
					label={ __( 'Distance from the top', 'sgs-blocks' ) }
					hasValue={ () => filled( attributes.signedInDotTop ) }
					onDeselect={ () => setAttributes( { signedInDotTop: {} } ) }
				>
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
				</ToolsPanelItem>
			) }
			{ on && (
				<ToolsPanelItem
					label={ __( 'Distance from the end edge', 'sgs-blocks' ) }
					hasValue={ () => filled( attributes.signedInDotRight ) }
					onDeselect={ () => setAttributes( { signedInDotRight: {} } ) }
				>
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
				</ToolsPanelItem>
			) }
			{ on && (
				<ToolsPanelItem
					label={ __( 'Ring width', 'sgs-blocks' ) }
					hasValue={ () => !! attributes.signedInDotRingWidth }
					onDeselect={ () => setAttributes( { signedInDotRingWidth: '' } ) }
				>
					<SgsLengthControl
						label={ __( 'Ring width', 'sgs-blocks' ) }
						help={ __( 'Used when a ring colour is set; empty = 2px.', 'sgs-blocks' ) }
						value={ attributes.signedInDotRingWidth ?? '' }
						onChange={ ( value ) => setAttributes( { signedInDotRingWidth: value || '' } ) }
					/>
				</ToolsPanelItem>
			) }
		</ToolsPanel>
	);
}
