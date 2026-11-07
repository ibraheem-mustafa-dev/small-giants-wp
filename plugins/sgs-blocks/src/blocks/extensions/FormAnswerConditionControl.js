/**
 * "Show when a form answer matches" — the form-answer condition of the conditional visibility extension.
 *
 * Attributes: sgsConditionFormField (the watched field's name), sgsConditionFormOperator and sgsConditionFormValue.
 * Only blocks inside an sgs/form show the control. The frontend output (data-conditional-* attributes) is added by
 * includes/conditional-visibility.php through includes/conditional-field.php::conditional_data_attributes(); the
 * form's view.js shows or hides the element as the visitor answers.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { SelectControl, TextControl } from '@wordpress/components';

const OPERATORS = [
	{ value: 'equals', label: __( 'Equals', 'sgs-blocks' ) },
	{ value: 'not_equals', label: __( 'Does not equal', 'sgs-blocks' ) },
	{ value: 'contains', label: __( 'Contains', 'sgs-blocks' ) },
	{ value: 'greater_than', label: __( 'Is greater than', 'sgs-blocks' ) },
	{ value: 'is_empty', label: __( 'Is empty', 'sgs-blocks' ) },
];

if ( ! window.__sgsFormAnswerConditionRegistered ) {
	window.__sgsFormAnswerConditionRegistered = true;

	addFilter( 'blocks.registerBlockType', 'sgs/form-answer-condition/attributes', ( settings ) => {
		if ( settings?.supports?.className === false ) {
			return settings;
		}
		return {
			...settings,
			attributes: {
				...settings.attributes,
				sgsConditionFormField: { type: 'string', default: '' },
				sgsConditionFormOperator: { type: 'string', default: 'equals' },
				sgsConditionFormValue: { type: 'string', default: '' },
			},
		};
	} );
}

/**
 * Every named field block under a block list, depth first.
 *
 * @param {Array} blocks Block objects.
 * @return {string[]} Field names.
 */
function collectFieldNames( blocks ) {
	const names = [];
	blocks.forEach( ( block ) => {
		const name = block.attributes?.fieldName;
		if ( 'string' === typeof name && '' !== name ) {
			names.push( name );
		}
		names.push( ...collectFieldNames( block.innerBlocks || [] ) );
	} );
	return names;
}

/**
 * Whether any form-answer condition is set.
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when a watched field is chosen.
 */
export function isFormAnswerConditionActive( attributes ) {
	return !! attributes.sgsConditionFormField;
}

/**
 * Summary of the condition for the active-condition notice.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Summary text.
 */
export function formAnswerConditionSummary( attributes ) {
	return `${ __( 'form answer', 'sgs-blocks' ) } ${ attributes.sgsConditionFormField } ${ attributes.sgsConditionFormOperator || 'equals' } ${ attributes.sgsConditionFormValue || '' }`.trim();
}

export default function FormAnswerConditionControl( { clientId, attributes, setAttributes } ) {
	const fieldNames = useSelect(
		( select ) => {
			const store = select( 'core/block-editor' );
			const forms = store.getBlockParentsByBlockName( clientId, 'sgs/form' );
			if ( ! forms.length ) {
				return null;
			}
			return [ ...new Set( collectFieldNames( store.getBlocks( forms[ forms.length - 1 ] ) ) ) ];
		},
		[ clientId ]
	);
	if ( null === fieldNames ) {
		return null;
	}
	const watched = attributes.sgsConditionFormField || '';
	const operator = attributes.sgsConditionFormOperator || 'equals';
	const options = [
		{ value: '', label: __( 'Any answer', 'sgs-blocks' ) },
		...fieldNames.map( ( n ) => ( { value: n, label: n } ) ),
	];
	if ( watched && ! fieldNames.includes( watched ) ) {
		options.push( { value: watched, label: watched } );
	}

	return (
		<div style={ { marginTop: '16px' } }>
			<SelectControl
				label={ __( 'Show when form field', 'sgs-blocks' ) }
				value={ watched }
				options={ options }
				onChange={ ( v ) => setAttributes( { sgsConditionFormField: v } ) }
				help={ __( 'Shows this block only while the chosen field of this form matches. Fields are listed by their field name.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ '' !== watched && (
				<>
					<SelectControl
						label={ __( 'Condition', 'sgs-blocks' ) }
						value={ operator }
						options={ OPERATORS }
						onChange={ ( v ) => setAttributes( { sgsConditionFormOperator: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'is_empty' !== operator && (
						<TextControl
							label={ __( 'Value', 'sgs-blocks' ) }
							value={ attributes.sgsConditionFormValue || '' }
							onChange={ ( v ) => setAttributes( { sgsConditionFormValue: v } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</>
			) }
		</div>
	);
}
