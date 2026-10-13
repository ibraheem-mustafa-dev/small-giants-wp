/**
 * PartReferenceAtom: which declared part of the block a `partReference` field names (magnet's moving part). The options
 * are the whole block (`root`) plus the parts the block declares in `supports.sgs.elements`, listed by `targetOptions`
 * (the same list the Target row offers). The stored value is the part key; a stored key the block no longer declares is
 * still shown, marked as no longer on this block, so it can be seen and changed.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';
import { SelectControl } from '@wordpress/components';
import { useAtomField } from './atom-utils';
import { humanise, targetOptions } from './TargetPicker';
import AtomFrame from './AtomFrame';

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         The chosen part key, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid part key, or undefined to clear.
 * @param {Object|null} [props.elements]    The block's `supports.sgs.elements`.
 * @param {string}      [props.blockName]   The block's name, used to read `supports.sgs.elements` when `elements` is not given.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function PartReferenceAtom( {
	label,
	value,
	onChange,
	elements,
	blockName,
	fieldNode = null,
	presetValue,
	help,
} ) {
	const declared =
		elements ?? getBlockType( blockName )?.supports?.sgs?.elements;
	const options = targetOptions( declared );
	if (
		typeof value === 'string' &&
		value !== '' &&
		! options.some( ( option ) => option.value === value )
	) {
		options.push( {
			value,
			label: sprintf(
				/* translators: %s: the stored part's name. */
				__( '%s (no longer on this block)', 'sgs-blocks' ),
				humanise( value )
			),
		} );
	}
	const field = useAtomField( {
		type: 'partReference',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );

	return (
		<AtomFrame
			kind="part-reference"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<SelectControl
				label={ label }
				value={ typeof value === 'string' ? value : '' }
				options={ [
					{ label: __( 'Not set', 'sgs-blocks' ), value: '' },
					...options,
				] }
				onChange={ ( next ) =>
					field.commit( next === '' ? undefined : next )
				}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</AtomFrame>
	);
}
