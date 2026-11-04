/**
 * sgs/account — "Fields" inspector panels.
 *
 * The look of WooCommerce's own account inputs, selects, textareas and labels (log in, register, lost password,
 * addresses, account details), built from the same shared controls sgs/form's "Field style" panel uses and the same
 * attribute names, so a field carries one vocabulary wherever it sits. The four colour rows are exported for the
 * block's colour panel. Every attribute is absent until set (no block.json default), so an untouched block keeps
 * its uid class and WooCommerce's look.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import {
	BOX_UNITS,
	ResponsiveControl,
	ResponsiveOverride,
	SgsBorderControl,
	SgsBoxControl,
	SgsLengthControl,
	ShadowControl,
	TypographyControls,
	fillRow,
	textRow,
	normaliseResponsiveBox,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { patchTier } from '../../utils';

/**
 * Colour rows for the block's colour panel: field ground, typed text, placeholder and label colour.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Attribute setter.
 * @return {Array} Rows for SgsColourPanel.
 */
export function fieldColourRows( attributes, setAttributes ) {
	return [
		fillRow( {
			key: 'field-background',
			label: __( 'Field background', 'sgs-blocks' ),
			attrs: { base: 'fieldBackground' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'field-text',
			label: __( 'Field text', 'sgs-blocks' ),
			attrs: { base: 'fieldTextColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'field-placeholder',
			label: __( 'Field placeholder', 'sgs-blocks' ),
			attrs: { base: 'fieldPlaceholderColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'field-label',
			label: __( 'Field label', 'sgs-blocks' ),
			attrs: { base: 'labelColour' },
			attributes,
			setAttributes,
		} ),
	];
}

const TYPE_TARGET = {
	fontSizePresets: true,
	showFontFamily: true,
	showDecoration: true,
	showTransform: true,
	showLetterSpacing: true,
};

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Fields panels.
 */
export default function FieldsPanel( { attributes, setAttributes } ) {
	const { fieldBorderRadius, labelGap } = attributes;

	return (
		<>
			<PanelBody title={ __( 'Fields', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsBorderControl
					widthValues={ attributes.fieldBorderWidth ?? {} }
					onWidthChange={ ( next ) => setAttributes( { fieldBorderWidth: next } ) }
					widthPresets={ [ '10', '20', '30' ] }
					styleValue={ attributes.fieldBorderStyle }
					onStyleChange={ ( val ) => setAttributes( { fieldBorderStyle: val || undefined } ) }
					colourLabel={ __( 'Field border colour', 'sgs-blocks' ) }
					colourValue={ attributes.fieldBorderColour }
					onColourChange={ ( val ) => setAttributes( { fieldBorderColour: val || undefined } ) }
					colourLinked
					radiusValues={ {
						base: fieldBorderRadius?.desktop ?? {},
						tablet: fieldBorderRadius?.tablet ?? {},
						mobile: fieldBorderRadius?.mobile ?? {},
					} }
					onRadiusChange={ ( tier, next ) => {
						const key = 'base' === tier ? 'desktop' : tier;
						setAttributes( { fieldBorderRadius: { ...fieldBorderRadius, [ key ]: next } } );
					} }
				/>
				<ShadowControl
					label={ __( 'Field shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ { base: 'fieldShadow', colour: 'fieldShadowColour' } }
				/>
				<ResponsiveOverride
					value={ attributes.fieldPadding }
					onChange={ ( obj ) => setAttributes( { fieldPadding: obj } ) }
				>
					{ ( { ownValue, setOwnValue } ) => (
						<SgsBoxControl
							label={ __( 'Field padding', 'sgs-blocks' ) }
							values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
							units={ BOX_UNITS }
							presets
							onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
						/>
					) }
				</ResponsiveOverride>
				<ResponsiveOverride
					label={ __( 'Field minimum height', 'sgs-blocks' ) }
					value={ attributes.fieldMinHeight }
					onChange={ ( obj ) => setAttributes( { fieldMinHeight: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							presets={ false }
							label={ __( 'Field minimum height', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __( 'Inputs and selects. The height you set, even below 44px; empty keeps 44px.', 'sgs-blocks' ) }
							value={ ownValue ?? '' }
							placeholder={ inherited ? effectiveValue : '44px' }
							onChange={ ( val ) => setOwnValue( val || undefined ) }
						/>
					) }
				</ResponsiveOverride>
			</PanelBody>
			<PanelBody title={ __( 'Field labels', 'sgs-blocks' ) } initialOpen={ false }>
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={ __( 'Label position', 'sgs-blocks' ) }
					value={ 'above' === attributes.labelPosition ? 'above' : 'default' }
					onChange={ ( value ) =>
						setAttributes( { labelPosition: 'above' === value ? 'above' : undefined } )
					}
				>
					<ToggleGroupControlOption value="default" label={ __( 'WooCommerce default', 'sgs-blocks' ) } />
					<ToggleGroupControlOption value="above" label={ __( 'Above the field', 'sgs-blocks' ) } />
				</ToggleGroupControl>
				{ 'above' === attributes.labelPosition && (
					<ResponsiveControl label={ __( 'Space under the label', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<SgsLengthControl
								presets
								hideLabelFromVision
								label={ __( 'Space under the label', 'sgs-blocks' ) }
								value={ labelGap?.[ breakpoint ] ?? '' }
								onChange={ ( value ) =>
									patchTier( attributes, setAttributes, 'labelGap', breakpoint, value )
								}
							/>
						) }
					</ResponsiveControl>
				) }
			</PanelBody>
			<PanelBody title={ __( 'Field and label type', 'sgs-blocks' ) } initialOpen={ false }>
				<TypographyControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					targets={ [
						{ key: 'field', label: __( 'Field text', 'sgs-blocks' ), prefix: 'field', ...TYPE_TARGET },
						{ key: 'label', label: __( 'Label', 'sgs-blocks' ), prefix: 'label', ...TYPE_TARGET },
					] }
				/>
			</PanelBody>
		</>
	);
}
