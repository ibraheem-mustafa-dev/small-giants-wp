/**
 * PropertyRowAtom: one from and to row (the `propertyRow` field type): the property being animated, then its from and
 * to values, each edited by the value atom for that property's type (opacity and scale as numbers, x, y and blur as
 * distances, rotate as an angle, clip and background position as percentages, colour as a colour reference). Changing
 * the property drops the old values, since their type no longer applies. Only a schema-valid row leaves the atom.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { rowProperties, rowValueType } from './field-types';
import { sameValue, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';
import NumberAtom from './NumberAtom';
import DistanceAtom from './DistanceAtom';
import AngleAtom from './AngleAtom';
import ColourReferenceAtom from './ColourReferenceAtom';

const PROPERTY_LABELS = {
	opacity: __( 'Opacity', 'sgs-blocks' ),
	x: __( 'Move across (x)', 'sgs-blocks' ),
	y: __( 'Move down (y)', 'sgs-blocks' ),
	scale: __( 'Scale', 'sgs-blocks' ),
	rotate: __( 'Rotate', 'sgs-blocks' ),
	blur: __( 'Blur', 'sgs-blocks' ),
	clip: __( 'Reveal (clip)', 'sgs-blocks' ),
	colour: __( 'Colour', 'sgs-blocks' ),
	backgroundPosition: __( 'Background position', 'sgs-blocks' ),
};

// The value atom for each field type a row end can hold.
function EndAtom( { type, label, value, onChange } ) {
	if ( type === 'distance' ) {
		return (
			<DistanceAtom
				label={ label }
				value={ value }
				onChange={ onChange }
				allowLift
			/>
		);
	}
	if ( type === 'angle' ) {
		return (
			<AngleAtom label={ label } value={ value } onChange={ onChange } />
		);
	}
	if ( type === 'colourReference' ) {
		return (
			<ColourReferenceAtom
				label={ label }
				value={ value }
				onChange={ onChange }
			/>
		);
	}
	return (
		<NumberAtom
			label={ label }
			value={ value }
			onChange={ onChange }
			type={ type }
		/>
	);
}

/**
 * @param {Object}      props
 * @param {string}      props.label         Row label.
 * @param {unknown}     props.value         `{ property, from?, to? }`, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid row, or undefined to clear.
 * @param {string[]}    [props.properties]  Properties offered; defaults to every property the schema allows.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {unknown}     [props.presetValue] The preset's stamped row; a differing row shows the Customised tag.
 * @param {string}      [props.help]        Hint text.
 * @param {string}      [props.endLabel]    Names the from and to inputs when several rows share a property (Rotate, Rotate X, Rotate Y).
 * @return {Element} The control.
 */
export default function PropertyRowAtom( {
	label,
	value,
	onChange,
	properties,
	fieldNode = null,
	presetValue,
	help,
	endLabel,
} ) {
	const field = useAtomField( {
		type: 'propertyRow',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );
	const offered = properties || rowProperties();
	const row = value && typeof value === 'object' ? value : {};
	const valueType = row.property ? rowValueType( row.property ) : null;

	const setProperty = ( property ) => {
		if ( property === '' ) {
			field.commit( undefined );
		} else if ( ! sameValue( property, row.property ) ) {
			field.commit( { property } );
		}
	};
	const setEnd = ( end, next ) => {
		if ( next === undefined && ! ( end in row ) ) {
			return;
		}
		const nextRow = { ...row };
		if ( next === undefined ) {
			delete nextRow[ end ];
		} else {
			nextRow[ end ] = next;
		}
		field.commit( nextRow );
	};
	const propertyLabel =
		endLabel || PROPERTY_LABELS[ row.property ] || row.property;

	return (
		<AtomFrame
			kind="property-row"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<SelectControl
				label={ label }
				value={ row.property || '' }
				options={ [
					{
						label: __( 'Choose a property', 'sgs-blocks' ),
						value: '',
					},
					...offered.map( ( property ) => ( {
						label: PROPERTY_LABELS[ property ] || property,
						value: property,
					} ) ),
				] }
				onChange={ setProperty }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ valueType && (
				<>
					<EndAtom
						type={ valueType }
						label={ sprintf(
							/* translators: %s: the property being animated. */
							__( '%s: from', 'sgs-blocks' ),
							propertyLabel
						) }
						value={ row.from }
						onChange={ ( next ) => setEnd( 'from', next ) }
					/>
					<EndAtom
						type={ valueType }
						label={ sprintf(
							/* translators: %s: the property being animated. */
							__( '%s: to', 'sgs-blocks' ),
							propertyLabel
						) }
						value={ row.to }
						onChange={ ( next ) => setEnd( 'to', next ) }
					/>
				</>
			) }
		</AtomFrame>
	);
}
