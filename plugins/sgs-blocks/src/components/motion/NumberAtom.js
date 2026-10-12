/**
 * NumberAtom: a plain number field for a ratio, scale, percentage or opacity (strengths, factors, opacities, speeds).
 * The minimum, maximum and step come from the schema entry, narrowed by the field's own node; a number outside the
 * range is refused with a message and is not passed on.
 *
 * @package
 */

import { NumberControl } from '../primitives';
import {
	boundsOf,
	numberDraft,
	parseNumberInput,
	useAtomField,
} from './atom-utils';
import AtomFrame from './AtomFrame';

const DEFAULT_STEPS = { opacity: 0.05, scale: 0.05, ratio: 0.1, percentage: 1 };

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         The stored number, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid number, or undefined to clear.
 * @param {string}      [props.type]        `ratio` (default), `scale`, `percentage` or `opacity`.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {number}      [props.step]        Spinner step; defaults to the node's `multipleOf`, else a step for the type.
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function NumberAtom( {
	label,
	value,
	onChange,
	type = 'ratio',
	fieldNode = null,
	step,
	presetValue,
	help,
} ) {
	const range = boundsOf( type, fieldNode );
	const field = useAtomField( {
		type,
		fieldNode,
		value,
		onChange,
		presetValue,
		toDraft: numberDraft,
		parse: parseNumberInput,
	} );

	return (
		<AtomFrame
			kind={ type }
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<NumberControl
				label={ label }
				value={ field.draft }
				min={ range.min ?? undefined }
				max={ range.max ?? undefined }
				step={
					step ?? fieldNode?.multipleOf ?? DEFAULT_STEPS[ type ] ?? 1
				}
				onChange={ field.edit }
				__next40pxDefaultSize
			/>
		</AtomFrame>
	);
}
