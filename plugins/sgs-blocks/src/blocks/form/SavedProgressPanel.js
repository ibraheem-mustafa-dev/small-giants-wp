/**
 * Inspector panel for the form's saved progress (Spec 04 FR-4-9): the switch and the two notice wordings. The dot
 * colour sits in the form's colour panel beside the other colours.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function SavedProgressPanel( { attributes, setAttributes } ) {
	const { savedProgress, savedProgressLabel, savedProgressSavedLabel } = attributes;

	return (
		<PanelBody title={ __( 'Saved progress', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Remember answers in the browser', 'sgs-blocks' ) }
				checked={ !! savedProgress }
				onChange={ ( value ) => setAttributes( { savedProgress: value } ) }
				help={ __(
					'Keeps every answer and the current step on the visitor’s device, restores them on their next visit and clears them once the form is sent. File uploads are not kept.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			{ savedProgress && (
				<>
					<TextControl
						label={ __( 'Notice before anything is saved', 'sgs-blocks' ) }
						value={ savedProgressLabel }
						onChange={ ( value ) => setAttributes( { savedProgressLabel: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Notice once progress is saved', 'sgs-blocks' ) }
						value={ savedProgressSavedLabel }
						onChange={ ( value ) => setAttributes( { savedProgressSavedLabel: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}
