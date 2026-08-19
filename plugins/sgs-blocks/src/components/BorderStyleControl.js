/**
 * BorderStyleControl — thin SGS wrapper matching WP core's native
 * `BorderControlStylePicker` exactly (Bean-directed, 2026-08-19).
 *
 * ── Source ──────────────────────────────────────────────────────────────
 * Pulled and read from the real `@wordpress/components` package source
 * (`border-control/border-control-style-picker/component.tsx`, v39.0.0):
 * a `ToggleGroupControl` with `isDeselectable`, three
 * `ToggleGroupControlOptionIcon` entries (Solid/Dashed/Dotted), using
 * `lineSolid`/`lineDashed`/`lineDotted` from `@wordpress/icons`. "None" is
 * reached by clicking the active option again (deselect), not a 4th icon.
 *
 * ── Deliberately NOT the old 9-option set ──────────────────────────────
 * The previous hand-rolled `<SelectControl>` this replaces (duplicated
 * across 13 blocks with no shared component) offered
 * None/Solid/Dashed/Dotted/Double/Groove/Ridge/Inset/Outset. Bean confirmed
 * dropping the six rarely-used ones (Double/Groove/Ridge/Inset/Outset) to
 * match native exactly, rather than keeping all nine as icon buttons.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { lineDashed, lineDotted, lineSolid } from '@wordpress/icons';
import { ToggleGroupControl, ToggleGroupControlOptionIcon } from './primitives';

const BORDER_STYLES = [
	{ label: __( 'Solid', 'sgs-blocks' ), icon: lineSolid, value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), icon: lineDashed, value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), icon: lineDotted, value: 'dotted' },
];

/**
 * @param {Object}   props
 * @param {string}   [props.label]    Field label.
 * @param {string}   [props.value]    'solid' | 'dashed' | 'dotted' | '' (none).
 * @param {Function} props.onChange   Receives the next style value ('' on deselect).
 * @return {JSX.Element} Controls fragment.
 */
export default function BorderStyleControl( { label = __( 'Style', 'sgs-blocks' ), value, onChange } ) {
	return (
		<ToggleGroupControl
			label={ label }
			value={ value || undefined }
			isDeselectable
			onChange={ ( next ) => onChange( next || '' ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ BORDER_STYLES.map( ( style ) => (
				<ToggleGroupControlOptionIcon
					key={ style.value }
					value={ style.value }
					icon={ style.icon }
					label={ style.label }
				/>
			) ) }
		</ToggleGroupControl>
	);
}
