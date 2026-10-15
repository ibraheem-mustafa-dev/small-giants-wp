/**
 * The Target row at the top of each motion panel (Spec 38A §5): the block root plus its declared parts
 * (`supports.sgs.elements`, a part marked `"motion": false` left out, as `TargetPicker` and
 * `Sgs_Motion_Targets::parts` do) plus any custom target the cloning tool wrote, with a dot on every target, the root
 * included, that already carries a layer of this panel's type.
 *
 * The options come from `TargetPicker.js::targetOptions`, the one list of a block's targets; the row marks their labels
 * and draws them with the same choice atom `TargetPicker` uses.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';
import ChoiceAtom from '../../../../components/motion/ChoiceAtom';
import {
	ROOT_TARGET,
	targetOptions,
} from '../../../../components/motion/TargetPicker';
import { targetsWithLayers } from './use-motion-layers';

const DOT = '•';
const CUSTOM_PREFIX = 'custom:';

/**
 * Every target the row offers, each label marked with a dot when the target carries a layer of the panel.
 *
 * @param {Object|null}      elements `supports.sgs.elements`.
 * @param {Object|undefined} motion   The block's motion value.
 * @param {string}           panel    `hover`, `entrance` or `effects`.
 * @return {{value: string, label: string}[]} The options.
 */
export function targetRowOptions( elements, motion, panel ) {
	const marked = targetsWithLayers( motion, panel );
	const custom = Object.keys( motion?.elements || {} )
		.filter( ( key ) => key.startsWith( CUSTOM_PREFIX ) )
		.map( ( key ) => ( {
			value: key,
			label: sprintf(
				/* translators: %s: the custom target's number. */
				__( 'Custom target %s', 'sgs-blocks' ),
				key.slice( CUSTOM_PREFIX.length )
			),
		} ) );
	const held = Object.keys( motion?.elements || {} );
	return [ ...targetOptions( elements, held ), ...custom ].map( ( option ) => ( {
		value: option.value,
		label: marked.includes( option.value )
			? `${ option.label } ${ DOT }`
			: option.label,
	} ) );
}

/**
 * @param {Object}           props
 * @param {string}           props.blockName  The block's name.
 * @param {Object|null}      [props.elements] The block's `supports.sgs.elements`; read from the block type when absent.
 * @param {Object|undefined} props.motion     The block's motion value.
 * @param {string}           props.panel      `hover`, `entrance` or `effects`.
 * @param {string}           props.value      The chosen target.
 * @param {Function}         props.onChange   Receives the chosen target key.
 * @return {Element} The row.
 */
export default function TargetRow( {
	blockName,
	elements,
	motion,
	panel,
	value,
	onChange,
} ) {
	const declared =
		elements ?? getBlockType( blockName )?.supports?.sgs?.elements ?? null;
	const options = targetRowOptions( declared, motion, panel );
	return (
		<ChoiceAtom
			label={ __( 'Target', 'sgs-blocks' ) }
			help={ sprintf(
				/* translators: %s: the dot symbol. */
				__( '%s marks a part that already moves here.', 'sgs-blocks' ),
				DOT
			) }
			options={ options }
			value={ value || ROOT_TARGET }
			onChange={ ( next ) => onChange( next || ROOT_TARGET ) }
			emptyLabel={ null }
		/>
	);
}
