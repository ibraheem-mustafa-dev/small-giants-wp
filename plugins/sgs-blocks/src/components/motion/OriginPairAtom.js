/**
 * OriginPairAtom: a transform origin as two percentages (the `originPair` field type), stored as `"<x>% <y>%"`: how far
 * across and how far down the element the rotation pivots (0% 0% is the top left corner, 50% 50% the centre).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { NumberControl } from '../primitives';
import AtomFrame from './AtomFrame';
import { validateField } from './field-types';

const PAIR = /^(-?\d{1,3}(?:\.\d+)?)% (-?\d{1,3}(?:\.\d+)?)%$/;

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         `"<x>% <y>%"`, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid pair, or undefined to clear.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {unknown}     [props.presetValue] The preset's stamped value.
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function OriginPairAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	help,
} ) {
	const match = typeof value === 'string' ? PAIR.exec( value ) : null;
	const x = match ? Number( match[ 1 ] ) : 50;
	const y = match ? Number( match[ 2 ] ) : 50;
	const write = ( nextX, nextY ) => {
		const next = `${ nextX }% ${ nextY }%`;
		if ( validateField( 'originPair', next, fieldNode ).ok ) {
			onChange( next );
		}
	};
	return (
		<AtomFrame
			kind="origin-pair"
			label={ label }
			help={ help }
			customised={ presetValue !== undefined && presetValue !== value }
			onReset={ () => onChange( presetValue ) }
		>
			<div style={ { display: 'flex', gap: 8 } }>
				<NumberControl
					label={ __( 'Across (%)', 'sgs-blocks' ) }
					value={ x }
					min={ -999 }
					max={ 999 }
					onChange={ ( next ) =>
						next !== '' && write( Number( next ), y )
					}
					__next40pxDefaultSize
				/>
				<NumberControl
					label={ __( 'Down (%)', 'sgs-blocks' ) }
					value={ y }
					min={ -999 }
					max={ 999 }
					onChange={ ( next ) =>
						next !== '' && write( x, Number( next ) )
					}
					__next40pxDefaultSize
				/>
			</div>
		</AtomFrame>
	);
}
