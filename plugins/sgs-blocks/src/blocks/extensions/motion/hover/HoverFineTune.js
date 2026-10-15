/**
 * The grouped Fine-tune fields of a state layer (Spec 38A §5.1): one heading per group and one `HoverFieldRow` per
 * field the schema holds. The Rotate group is the one modular Rotate: a driver switch (Hover angles or Follow pointer)
 * decides whether the hover X and Y angles or the pointer fields are drawn and stored.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import ChoiceAtom from '../../../../components/motion/ChoiceAtom';
import { fieldGroups } from './hover-fields';
import { driverOf, withDriver } from './hover-write';
import HoverFieldRow from './HoverFieldRow';

const DRIVER_OPTIONS = Object.freeze( [
	{ value: 'angles', label: __( 'Hover angles', 'sgs-blocks' ) },
	{ value: 'pointer', label: __( 'Follow pointer', 'sgs-blocks' ) },
] );

function Fields( { fields, layer, onLayer } ) {
	return fields.map( ( field ) => (
		<HoverFieldRow
			key={ field.key }
			field={ field }
			layer={ layer }
			onLayer={ onLayer }
		/>
	) );
}

/**
 * @param {Object}   props
 * @param {Object}   props.layer   The state layer.
 * @param {string}   props.defName The values `$def` the layer holds (`HoverStateValues`).
 * @param {Object[]} props.groups  `HOVER_GROUPS` or `FOCUS_GROUPS`.
 * @param {number}   props.level   The heading level of a group (3 under the panel, 4 under the Focus heading).
 * @param {Function} props.onLayer Receives the edited layer.
 * @return {Element} The fields.
 */
export default function HoverFineTune( {
	layer,
	defName,
	groups,
	level = 3,
	onLayer,
} ) {
	const Heading = `h${ level }`;
	return (
		<>
			{ fieldGroups( defName, groups ).map( ( group ) => {
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
						<Fields
							fields={ group.fields }
							layer={ layer }
							onLayer={ onLayer }
						/>
						{ driver && (
							<>
								<ChoiceAtom
									label={ __(
										'Rotate driven by',
										'sgs-blocks'
									) }
									options={ DRIVER_OPTIONS }
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
