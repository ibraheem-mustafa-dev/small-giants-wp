/**
 * DurationAtom: a duration as a theme token or an exact number of milliseconds (the `duration` field type). The
 * options and the millisecond range come from the schema, narrowed by the field's own node; only a schema-valid value
 * leaves the atom.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { SelectControl } from '@wordpress/components';
import { NumberControl } from '../primitives';
import { TOKEN_BANDS } from './field-types';
import {
	boundsOf,
	clampToRange,
	numberDraft,
	parseNumberInput,
	tokenLabel,
	useAtomField,
} from './atom-utils';
import AtomFrame from './AtomFrame';

const EXACT = '__exact__';
const SEED_MS = 300;

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         A `token:duration.*` reference, a number of milliseconds, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid duration, or undefined to clear.
 * @param {Object|null} [props.fieldNode]   The field's schema node (its narrowing range or token pattern).
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.emptyLabel]  Label of the unset option.
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function DurationAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	emptyLabel = __( 'Not set', 'sgs-blocks' ),
	help,
} ) {
	const range = boundsOf( 'duration', fieldNode );
	const [ exactChosen, setExactChosen ] = useState( false );
	const field = useAtomField( {
		type: 'duration',
		fieldNode,
		value,
		onChange,
		presetValue,
		toDraft: numberDraft,
		parse: parseNumberInput,
	} );

	const isNumber = typeof value === 'number';
	const options = [
		{ label: emptyLabel, value: '' },
		...range.tokens.map( ( token ) => ( {
			label: tokenLabel( token ),
			value: token,
		} ) ),
		{ label: __( 'Exact (milliseconds)', 'sgs-blocks' ), value: EXACT },
	];
	let mode = '';
	if ( isNumber || ( exactChosen && value === undefined ) ) {
		mode = EXACT;
	} else if ( range.tokens.includes( value ) ) {
		mode = value;
	}

	const choose = ( next ) => {
		setExactChosen( next === EXACT );
		if ( next === '' ) {
			field.commit( undefined );
		} else if ( next === EXACT ) {
			const band =
				typeof value === 'string'
					? TOKEN_BANDS[ value.replace( 'token:', '' ) ]?.band
					: null;
			const seed = clampToRange(
				band?.kind === 'time' ? band.min : SEED_MS,
				range.min ?? 0,
				range.max ?? SEED_MS,
				SEED_MS
			);
			field.setDraft( String( seed ) );
			field.commit( seed );
		} else {
			field.commit( next );
		}
	};

	return (
		<AtomFrame
			kind="duration"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<SelectControl
				label={ label }
				value={ mode }
				options={ options }
				onChange={ choose }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ mode === EXACT && (
				<NumberControl
					label={ __( 'Exact duration (ms)', 'sgs-blocks' ) }
					value={ field.draft }
					min={ range.min ?? undefined }
					max={ range.max ?? undefined }
					step={ 10 }
					onChange={ field.edit }
					__next40pxDefaultSize
				/>
			) }
		</AtomFrame>
	);
}
