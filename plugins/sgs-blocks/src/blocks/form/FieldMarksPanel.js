/**
 * The marks after a field label: the optional tag's text (each field switches the tag on itself) and the space before the required mark and the optional tag.
 * The mark and tag colours are rows in the form's Colours panel and the tag's type is the Optional tag target in
 * Typography.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { ResponsiveLengthControl } from '../../components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Form attributes (optionalText, requiredMarkGap).
 * @param {Function} props.setAttributes Form attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function FieldMarksPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Required and optional marks', 'sgs-blocks' ) } initialOpen={ false }>
			<ToolsPanel
				label={ __( 'Label marks', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { optionalText: '', requiredMarkGap: {} } ) }
			>
				<ToolsPanelItem
					label={ __( 'Optional tag text', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => '' !== ( attributes.optionalText ?? '' ) }
					onDeselect={ () => setAttributes( { optionalText: '' } ) }
				>
					<TextControl
						label={ __( 'Optional tag text', 'sgs-blocks' ) }
						value={ attributes.optionalText ?? '' }
						help={ __( 'The words of the Optional tag, shown on each field that switches the tag on (Show the Optional tag in the field settings). Empty uses "Optional".', 'sgs-blocks' ) }
						onChange={ ( optionalText ) => setAttributes( { optionalText } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __( 'Space before the mark', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => Object.keys( attributes.requiredMarkGap ?? {} ).length > 0 }
					onDeselect={ () => setAttributes( { requiredMarkGap: {} } ) }
				>
					<ResponsiveLengthControl
						label={ __( 'Space before the mark', 'sgs-blocks' ) }
						value={ attributes.requiredMarkGap }
						onChange={ ( next ) => setAttributes( { requiredMarkGap: next } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}
