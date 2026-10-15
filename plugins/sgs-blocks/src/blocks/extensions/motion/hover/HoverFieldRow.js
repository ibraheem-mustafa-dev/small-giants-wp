/**
 * One Fine-tune field of a state layer (Spec 38A §5): the field's atom, a Customised tag with its own Reset, and the
 * per-device wrapper where the schema declares the field per device. The atom comes from the atom registry by the
 * field's type, so no raw WordPress control is drawn here.
 *
 * The atom shows the tag when the preset stamped a value the field now differs from. A field the preset did not stamp
 * has no value to compare, so this row shows the tag from the layer's `customised` paths and its Reset clears the field.
 *
 * @package
 */

import { ATOM_FOR_FIELD_TYPE } from '../../../../components/motion/atom-registry';
import PerDeviceAtom from '../../../../components/motion/PerDeviceAtom';
import CustomisedTag from '../../../../components/motion/CustomisedTag';
import { isCustomised, stampedValue } from '../layers/stamp';
import { clearField, pathAt, withTiers, withValue } from './hover-write';

const NUMBER_TYPES = [ 'ratio', 'scale', 'percentage', 'opacity' ];

// The atom for a field, with the props its type needs.
function FieldAtom( { field, value, presetValue, onChange, hideLabel } ) {
	const Atom = ATOM_FOR_FIELD_TYPE[ field.fieldType ];
	const extra = hideLabel ? { hideLabelFromVision: true } : {};
	if ( NUMBER_TYPES.includes( field.fieldType ) ) {
		extra.type = field.fieldType;
	}
	if ( field.fieldType === 'distance' && field.lift ) {
		extra.allowLift = true;
	}
	if ( field.fieldType === 'choice' && field.options ) {
		extra.options = field.options;
	}
	return (
		<Atom
			label={ field.label }
			value={ value }
			onChange={ onChange }
			fieldNode={ field.node }
			presetValue={ presetValue }
			{ ...extra }
		/>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.field   A field from `hover-fields.js::fieldGroups`.
 * @param {Object}   props.layer   The state layer.
 * @param {Function} props.onLayer Receives the edited layer.
 * @return {Element} The field.
 */
export default function HoverFieldRow( { field, layer, onLayer } ) {
	const unstampedTag = ( tier ) => {
		const path = pathAt( field.key, tier );
		return (
			stampedValue( layer, path ) === undefined &&
			isCustomised( layer, path ) && (
				<CustomisedTag
					label={ field.label }
					onReset={ () =>
						onLayer( clearField( layer, field.key, tier ) )
					}
				/>
			)
		);
	};

	if ( ! field.perDevice ) {
		return (
			<div className="sgs-motion-hover__field">
				<FieldAtom
					field={ field }
					value={ layer.values?.[ field.key ] }
					presetValue={ stampedValue(
						layer,
						pathAt( field.key, 'desktop' )
					) }
					onChange={ ( next ) =>
						onLayer( withValue( layer, field.key, next ) )
					}
				/>
				{ unstampedTag( 'desktop' ) }
			</div>
		);
	}

	return (
		<div className="sgs-motion-hover__field">
			<PerDeviceAtom
				label={ field.label }
				fieldKey={ field.key }
				type={ field.fieldType }
				fieldNode={ field.node }
				values={ layer.values }
				devices={ layer.devices }
				onChange={ ( { values, devices } ) =>
					onLayer( withTiers( layer, field.key, values, devices ) )
				}
			>
				{ ( { tier, value, onChange } ) => (
					<>
						<FieldAtom
							field={ field }
							hideLabel
							value={ value }
							presetValue={ stampedValue(
								layer,
								pathAt( field.key, tier )
							) }
							onChange={ onChange }
						/>
						{ unstampedTag( tier ) }
					</>
				) }
			</PerDeviceAtom>
		</div>
	);
}
