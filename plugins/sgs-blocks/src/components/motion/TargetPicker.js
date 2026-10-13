/**
 * TargetPicker: which part of the block a motion layer animates (Spec 38A §3: targets are declared parts, never a typed
 * selector). The options are the whole block (`root`) plus every part the block declares in `supports.sgs.elements`,
 * in the order the block declares, except a part marked `"motion": false` (an element the block does not print itself,
 * §6.2). M3.3's Target row composes this atom.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';
import ChoiceAtom from './ChoiceAtom';

export const ROOT_TARGET = 'root';
const CUSTOM_PREFIX = 'custom:';

export const humanise = ( key ) => {
	const text = key.replace( /[-_]/g, ' ' );
	return text.charAt( 0 ).toUpperCase() + text.slice( 1 );
};

/**
 * The target options for a block's declared parts.
 *
 * @param {Object|null} elements `supports.sgs.elements`: `{ <partKey>: { label, order } }`.
 * @return {{value: string, label: string}[]} The whole block first, then each declared part by its `order`, then key.
 */
export function targetOptions( elements ) {
	const parts = Object.entries( elements || {} )
		.map( ( [ key, part ], index ) => ( {
			value: key,
			label: part?.label || humanise( key ),
			order: Number.isFinite( part?.order ) ? part.order : index + 1,
		} ) )
		.filter(
			( part ) =>
				part.value !== ROOT_TARGET &&
				elements[ part.value ]?.motion !== false
		)
		.sort( ( a, b ) => a.order - b.order );
	return [
		{ value: ROOT_TARGET, label: __( 'Whole block', 'sgs-blocks' ) },
		...parts.map( ( { value, label } ) => ( { value, label } ) ),
	];
}

/**
 * @param {Object}      props
 * @param {string}      [props.label]     Field label.
 * @param {string}      [props.value]     The chosen target key; `root` (or unset) is the whole block.
 * @param {Function}    props.onChange    Receives the chosen target key.
 * @param {Object|null} [props.elements]  The block's `supports.sgs.elements`.
 * @param {string}      [props.blockName] The block's name, used to read `supports.sgs.elements` when `elements` is not given.
 * @param {string}      [props.help]      Hint text.
 * @return {Element} The control.
 */
export default function TargetPicker( {
	label = __( 'Animate', 'sgs-blocks' ),
	value,
	onChange,
	elements,
	blockName,
	help,
} ) {
	const declared =
		elements ?? getBlockType( blockName )?.supports?.sgs?.elements;
	const options = targetOptions( declared );
	// A target the cloning tool wrote by selector is shown, never offered.
	if (
		typeof value === 'string' &&
		value.startsWith( CUSTOM_PREFIX ) &&
		! options.some( ( option ) => option.value === value )
	) {
		options.push( { value, label: __( 'Custom target', 'sgs-blocks' ) } );
	}
	return (
		<ChoiceAtom
			label={ label }
			help={ help }
			options={ options }
			value={ value || ROOT_TARGET }
			onChange={ ( next ) => onChange( next || ROOT_TARGET ) }
			emptyLabel={ options[ 0 ].label }
		/>
	);
}
