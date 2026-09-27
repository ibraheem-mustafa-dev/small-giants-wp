/**
 * "Label and headings" panel for SGS form fields: whether the field's label
 * shows or is read only by screen readers, and (for boxes laid out as a small
 * table, e.g. a prescription's SPH / CYL / AXIS) a short column heading shown
 * above the box and a row heading shown to its left. The headings are visual
 * only; the label stays the field's accessible name ("Right SPH").
 * Rendered by includes/forms/field-render-helpers.php::field_label() and
 * ::field_headings().
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes (labelStyle, columnHeading, rowHeading).
 * @param {Function} props.setAttributes Block attribute setter.
 * @param {boolean}  props.showHeadings  Offer the column and row headings.
 * @return {JSX.Element} The panel.
 */
export default function FieldLabelLayoutPanel( { attributes, setAttributes, showHeadings = false } ) {
	return (
		<PanelBody title={ __( 'Label and headings', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ attributes.labelStyle || 'visible' }
				options={ [
					{ label: __( 'Shown above the field', 'sgs-blocks' ), value: 'visible' },
					{ label: __( 'Screen readers only', 'sgs-blocks' ), value: 'hidden' },
				] }
				onChange={ ( labelStyle ) => setAttributes( { labelStyle } ) }
				help={ __( 'Hide the label when a heading, the placeholder or the panel\'s own text already says what the field is for.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ showHeadings && (
				<>
					<TextControl
						label={ __( 'Column heading', 'sgs-blocks' ) }
						value={ attributes.columnHeading || '' }
						onChange={ ( columnHeading ) => setAttributes( { columnHeading } ) }
						help={ __( 'A short heading above the box, e.g. "SPH". Set it on the first row only.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Row heading', 'sgs-blocks' ) }
						value={ attributes.rowHeading || '' }
						onChange={ ( rowHeading ) => setAttributes( { rowHeading } ) }
						help={ __( 'A short heading to the left of the row, e.g. "R". Set it on the first box of each row.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}
