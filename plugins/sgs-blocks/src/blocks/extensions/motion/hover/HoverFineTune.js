/**
 * The grouped Fine-tune fields of a state layer (Spec 38A §5.1): one heading per group and one `HoverFieldRow` per
 * field the schema holds. The Rotate group is the one modular Rotate: a driver switch (Hover angles or Follow pointer)
 * decides whether the hover X and Y angles or the pointer fields are drawn and stored.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import ChoiceAtom from '../../../../components/motion/ChoiceAtom';
import { fieldGroups, RING_REFUSAL_MESSAGE } from './hover-fields';
import { driverOf, withDriver } from './hover-write';
import HoverFieldRow from './HoverFieldRow';

const DRIVER_OPTIONS = Object.freeze( [
	{ value: 'angles', label: __( 'Hover angles', 'sgs-blocks' ) },
	{ value: 'pointer', label: __( 'Follow pointer', 'sgs-blocks' ) },
] );

// The custom pivot point is drawn only while a Pivot of Custom point is chosen at some device.
const customPivotChosen = ( layer ) =>
	[ layer.values, layer.devices?.tablet, layer.devices?.mobile ].some(
		( values ) => values?.restOrigin === 'custom'
	);

function Fields( { fields, layer, onLayer, repeated } ) {
	return fields
		.filter(
			( field ) =>
				field.key !== 'restOriginCustom' || customPivotChosen( layer )
		)
		.map( ( field ) => (
			<HoverFieldRow
				key={ field.key }
				field={ field }
				layer={ layer }
				onLayer={ onLayer }
				repeated={ repeated }
			/>
		) );
}

/**
 * @param {Object}   props
 * @param {Object}   props.layer   The state layer.
 * @param {string}   props.defName The values `$def` the layer holds (`HoverStateValues`).
 * @param {Object[]} props.groups  `HOVER_GROUPS` or `FOCUS_GROUPS`.
 * @param {number}   props.level   The heading level of a group (3 under the panel, 4 under the Focus heading).
 * @param {string[]} props.omitKeys Keys not offered on this element; the ring group says why when its keys are left out.
 * @param {boolean}  [props.repeated] Whether the target is a repeated item.
 * @param {Function} props.onLayer Receives the edited layer.
 * @return {Element} The fields.
 */
export default function HoverFineTune( {
	layer,
	defName,
	groups,
	level = 3,
	omitKeys = [],
	repeated = false,
	onLayer,
} ) {
	const Heading = `h${ level }`;
	return (
		<>
			{ fieldGroups( defName, groups, undefined, omitKeys ).map( ( group ) => {
				const { driver } = group;
				const mode = driver ? driverOf( layer, driver ) : null;
				return (
					<section
						key={ group.id }
						className={ `sgs-motion-hover__group sgs-motion-hover__group--${ group.id }` }
					>
						<Heading className="sgs-motion-hover__heading">
							{ group.label }
						</Heading>
						{ group.refused && (
							<p
								className="sgs-motion-atom__help sgs-motion-hover__refusal"
								role="note"
							>
								{ RING_REFUSAL_MESSAGE }
							</p>
						) }
						<Fields
							fields={ group.fields }
							layer={ layer }
							onLayer={ onLayer }
							repeated={ repeated }
						/>
						{ driver && (
							<>
								<ChoiceAtom
									label={ __(
										'Rotate driven by',
										'sgs-blocks'
									) }
									options={ DRIVER_OPTIONS }
									emptyLabel={ null }
									value={ mode }
									onChange={ ( next ) =>
										next &&
										next !== mode &&
										onLayer(
											withDriver( layer, next, driver )
										)
									}
								/>
								<Fields
									fields={
										mode === 'pointer'
											? driver.pointerFields
											: driver.angleFields
									}
									layer={ layer }
									onLayer={ onLayer }
								/>
							</>
						) }
					</section>
				);
			} ) }
		</>
	);
}
