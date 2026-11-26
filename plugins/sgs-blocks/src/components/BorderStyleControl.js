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
 * ── The three icons are the default; the full set is opt-in ───────────
 * The previous hand-rolled `<SelectControl>` this replaces (duplicated
 * across 13 blocks with no shared component) offered
 * None/Solid/Dashed/Dotted/Double/Groove/Ridge/Inset/Outset. Bean confirmed
 * dropping the six rarely-used ones to match native exactly, rather than
 * keeping all nine as icon buttons. `sgs/media` still offers all nine, and the
 * PHP allow-list (`sgs_border_style_allowed()`) accepts them, so a block whose
 * attribute allows them passes `styles={ ALL_BORDER_STYLES }` and gets a
 * select of the nine. The default stays the three icons: a block whose
 * `block.json` enum is shorter would drop a style it does not list on reload,
 * so the full set is the caller's choice, never assumed.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { lineDashed, lineDotted, lineSolid } from '@wordpress/icons';
import { ToggleGroupControl, ToggleGroupControlOptionIcon } from './primitives';
import { BORDER_STYLE_KEYWORDS } from '../utils/border-style';

const BORDER_STYLES = [
	{ label: __( 'Solid', 'sgs-blocks' ), icon: lineSolid, value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), icon: lineDashed, value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), icon: lineDotted, value: 'dotted' },
];

const STYLE_LABELS = {
	none: __( 'None', 'sgs-blocks' ),
	solid: __( 'Solid', 'sgs-blocks' ),
	dashed: __( 'Dashed', 'sgs-blocks' ),
	dotted: __( 'Dotted', 'sgs-blocks' ),
	double: __( 'Double', 'sgs-blocks' ),
	groove: __( 'Groove', 'sgs-blocks' ),
	ridge: __( 'Ridge', 'sgs-blocks' ),
	inset: __( 'Inset', 'sgs-blocks' ),
	outset: __( 'Outset', 'sgs-blocks' ),
};

/** The three styles the icon buttons offer. */
export const ICON_BORDER_STYLES = Object.freeze( [
	'solid',
	'dashed',
	'dotted',
] );

/** Every style the PHP allow-list accepts, in the order the select lists them (None last). */
export const ALL_BORDER_STYLES = Object.freeze( [
	...BORDER_STYLE_KEYWORDS.filter( ( keyword ) => 'none' !== keyword ),
	'none',
] );

/**
 * @param {Object}   props
 * @param {string}   [props.label]   Field label.
 * @param {string}   [props.value]   A border-style keyword, or '' (unset, which paints solid).
 * @param {Function} props.onChange  Receives the next style value ('' on deselecting an icon).
 * @param {string[]} [props.styles]  The keywords to offer. The default is the three icon buttons; any list with a
 *                                   keyword beyond solid, dashed and dotted draws a select of exactly that list.
 * @return {JSX.Element} Controls fragment.
 */
export default function BorderStyleControl( {
	label = __( 'Style', 'sgs-blocks' ),
	value,
	onChange,
	styles = ICON_BORDER_STYLES,
} ) {
	const listed = styles.filter( ( keyword ) => keyword in STYLE_LABELS );
	if (
		listed.some( ( keyword ) => ! ICON_BORDER_STYLES.includes( keyword ) )
	) {
		// A stored style outside the list shows as itself, so it can be seen and changed.
		const shown = value || 'solid';
		const options = listed.includes( shown )
			? listed
			: [ shown, ...listed ];
		return (
			<SelectControl
				label={ label }
				value={ shown }
				options={ options.map( ( keyword ) => ( {
					value: keyword,
					label: STYLE_LABELS[ keyword ] || keyword,
				} ) ) }
				onChange={ ( next ) => onChange( next ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		);
	}
	return (
		<ToggleGroupControl
			label={ label }
			value={ value || undefined }
			isDeselectable
			onChange={ ( next ) => onChange( next || '' ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ BORDER_STYLES.filter( ( style ) =>
				listed.includes( style.value )
			).map( ( style ) => (
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
