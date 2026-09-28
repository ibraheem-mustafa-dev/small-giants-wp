/**
 * sgs/site-header — "Rows vertical alignment" control (D-1).
 *
 * Where the header's rows sit inside it when the header is taller than their
 * own combined height — e.g. a `Min height` set above a single row's own
 * content height. The framework default is 'center' (render.php's
 * sgs_emit_tier_rules_map() resolves an untouched/inherited tier to 'center'),
 * matching what any flex/grid layout tool defaults to, so a fresh header
 * already centres its rows with no client action needed.
 *
 * Kept in its own file for the same reason FloatControls.js is: edit.js is
 * already well past the project's 250-line ceiling.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../../components';
import { ToolsPanelItem } from '../../../components/primitives';

const ROWS_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch to fill', 'sgs-blocks' ), value: 'stretch' },
];

// value -> label, derived from the options table so the two can never drift
// apart (same convention as site-header/edit.js's CONTRAST_SAFE_LABELS).
const ROWS_ALIGN_LABELS = ROWS_ALIGN_OPTIONS.reduce(
	( acc, opt ) => ( { ...acc, [ opt.value ]: opt.label } ),
	{}
);

/**
 * @param {Object}   props               Component props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The control.
 */
export default function RowsAlignControl( { attributes, setAttributes } ) {
	const rowsAlign = attributes.rowsAlign ?? {};

	return (
		<ToolsPanelItem
			label={ __( 'Rows vertical alignment', 'sgs-blocks' ) }
			hasValue={ () => Object.keys( rowsAlign ).length > 0 }
			onDeselect={ () => setAttributes( { rowsAlign: {} } ) }
		>
			<ResponsiveOverride
				value={ rowsAlign }
				onChange={ ( obj ) => setAttributes( { rowsAlign: obj } ) }
			>
				{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
					<SelectControl
						label={ __( 'Rows vertical alignment', 'sgs-blocks' ) }
						value={
							tier === 'desktop'
								? ownValue || 'center'
								: ownValue || ''
						}
						options={
							tier === 'desktop'
								? ROWS_ALIGN_OPTIONS
								: [
										{
											label: sprintf(
												/* translators: %s: the alignment inherited from the wider device, e.g. "Centre". */
												__( '— same as wider screens (%s) —', 'sgs-blocks' ),
												ROWS_ALIGN_LABELS[ effectiveValue ] || ROWS_ALIGN_LABELS.center
											),
											value: '',
										},
										...ROWS_ALIGN_OPTIONS,
								  ]
						}
						onChange={ ( value ) => setOwnValue( value || undefined ) }
						help={ __(
							'Where the rows sit when the header is taller than their own content — for example a Min height set above the tallest row. Stretch grows the rows to fill the extra height instead of leaving a gap.',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
			</ResponsiveOverride>
		</ToolsPanelItem>
	);
}
