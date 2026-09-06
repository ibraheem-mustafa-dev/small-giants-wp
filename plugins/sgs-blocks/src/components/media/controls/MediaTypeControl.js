/**
 * MediaTypeControl — the shared image/video/svg picker for the `media-type`
 * atom (`src/components/media/atoms/media-type.js`).
 *
 * ONE control, one enum, reused for the base attribute AND for a tiered
 * sibling when the surface declares one (hero's `splitMediaTypeTablet` /
 * `splitMediaTypeMobile`). The tiered case adds a 4th member, `''`, meaning
 * "inherit from the tier above" — never a real media type, so it is offered
 * only when `allowInherit` is explicitly set, and it is always the FIRST
 * option so inheriting is the obvious default rather than something the
 * client has to discover.
 *
 * Bare control — no `<InspectorControls>`, no `<PanelBody>`. The atom's own
 * `control()` composes this alongside its sibling rows; the calling block
 * owns the panel it lives in.
 *
 * A `ToggleGroupControl` button-group (2026-09-01, Bean's direction), NOT a
 * dropdown — matching `box-shape`'s own "pick one of a few options" control
 * (`MediaBoxShapeControls.js`'s `MODE_OPTIONS`/`ToggleGroupControl` block).
 * Four options (Inherit + Image/Video/SVG) fit the segmented control fine.
 *
 * ⛔ WRITTEN WITH `createElement()`, NOT JSX. This module is imported by
 * `scripts/tests/test-media-atom-parity.mjs` directly under plain Node (no
 * webpack/babel transform), and JSX syntax fails Node's parser at import
 * time regardless of whether the JSX is ever executed. `createElement()` is
 * valid ES that Node can load unmodified.
 *
 * @package SGS\Blocks
 */
import { createElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../primitives';

/** The three real media types. Canonical order matches the registry. */
export const MEDIA_TYPE_OPTIONS = [
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG / animation', 'sgs-blocks' ), value: 'svg' },
];

const INHERIT_OPTION = {
	label: __( 'Inherit from tier above', 'sgs-blocks' ),
	value: '',
};

/**
 * @param {Object}   props
 * @param {string}   props.value        Current stored value.
 * @param {Function} props.onChange     Receives the next raw value — the
 *                                      caller is responsible for validating it
 *                                      (see `validate()` in media-type.js).
 * @param {string}   [props.label]      Row label. Defaults to "Media type".
 * @param {boolean}  [props.disabled]   Disables the control.
 * @param {string}   [props.hiddenReason] Shown as help text when disabled.
 * @param {boolean}  [props.allowInherit] Adds the `''` = inherit option, for
 *                                        a tiered sibling attribute.
 */
export default function MediaTypeControl( {
	value,
	onChange,
	label,
	disabled = false,
	hiddenReason = '',
	allowInherit = false,
} ) {
	const options = allowInherit
		? [ INHERIT_OPTION, ...MEDIA_TYPE_OPTIONS ]
		: MEDIA_TYPE_OPTIONS;
	const resolved = value || ( allowInherit ? '' : 'image' );

	return createElement(
		ToggleGroupControl,
		{
			label: label || __( 'Media type', 'sgs-blocks' ),
			help: disabled ? hiddenReason || undefined : undefined,
			value: resolved,
			onChange,
			isBlock: true,
			__nextHasNoMarginBottom: true,
			__next40pxDefaultSize: true,
		},
		...options.map( ( opt ) =>
			createElement( ToggleGroupControlOption, {
				key: opt.value,
				value: opt.value,
				label: opt.label,
				// `ToggleGroupControl` itself has no `disabled` prop in the
				// stable Gutenberg API (WordPress/gutenberg#57862, still open) —
				// disabling it there is a silent no-op. Per-option `disabled`
				// IS supported (WordPress/gutenberg#63450) and is what actually
				// blocks selection, so it's applied here instead.
				disabled,
			} )
		)
	);
}
