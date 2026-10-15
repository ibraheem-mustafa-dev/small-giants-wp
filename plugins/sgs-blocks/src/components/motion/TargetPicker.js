/**
 * TargetPicker: which part of the block a motion layer animates (Spec 38A §3: targets are declared parts, never a typed
 * selector). The options are the whole block (`root`) plus every part the block declares in `supports.sgs.elements`,
 * in the order the block declares, except a part marked `"motion": false` (an element the block does not print itself,
 * §6.2) and a part marked `isWrapper` (the renderer and the canvas resolve it to the root, so it is the whole block under
 * another name) unless it already holds a stored layer. A part marked `notInMode` (it holds a stored layer but the
 * block's current source mode does not print it, `delegate-parts.js`) is labelled as not shown, so its layer can still
 * be found and removed. M3.3's Target row composes this atom.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
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
 * @param {string[]}    [held]    Targets that already hold a stored layer; a wrapper part among them stays listed.
 * @return {{value: string, label: string}[]} The whole block first, then each declared part by its `order`, then key.
 */
export function targetOptions( elements, held = [] ) {
	const parts = Object.entries( elements || {} )
		.map( ( [ key, part ], index ) => ( {
			value: key,
			label: part?.notInMode
				? sprintf(
						/* translators: %s: the part's name. */
						__( '%s (not shown in this mode)', 'sgs-blocks' ),
						part?.label || humanise( key )
				  )
				: part?.label || humanise( key ),
			order: Number.isFinite( part?.order ) ? part.order : index + 1,
		} ) )
		.filter(
			( part ) =>
				part.value !== ROOT_TARGET &&
				elements[ part.value ]?.motion !== false &&
				( elements[ part.value ]?.isWrapper !== true ||
					held.includes( part.value ) )
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
 * @param {string[]}    [props.held]      Targets that already hold a stored layer, so a wrapper part among them stays listed.
 * @param {string}      [props.help]      Hint text.
 * @return {Element} The control.
 */
export default function TargetPicker( {
	label = __( 'Animate', 'sgs-blocks' ),
	value,
	onChange,
	elements,
	blockName,
	held,
	help,
} ) {
	const declared =
		elements ?? getBlockType( blockName )?.supports?.sgs?.elements;
	const options = targetOptions( declared, held );
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
			emptyLabel={ null }
		/>
	);
}
