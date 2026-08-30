/**
 * VideoSourceControl — external URL vs WordPress media library, for the
 * `media-type` atom's `VideoSource` base (`MEDIA_BASES.type`).
 *
 * Bare control, matching `sgs/media`'s existing "Video Source" `SelectControl`
 * byte-for-byte (`src/blocks/media/edit.js`) so adopting the atom changes
 * nothing about the control a client already knows.
 *
 * ⛔ WRITTEN WITH `createElement()`, NOT JSX — see MediaTypeControl.js's
 * docblock for why (this module is imported raw by
 * `scripts/tests/test-media-atom-parity.mjs` under plain Node).
 *
 * @package SGS\Blocks
 */
import { createElement } from '@wordpress/element';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export const VIDEO_SOURCE_OPTIONS = [
	{
		label: __( 'External URL (YouTube, Vimeo, MP4)', 'sgs-blocks' ),
		value: 'external',
	},
	{
		label: __( 'WordPress Media Library', 'sgs-blocks' ),
		value: 'internal',
	},
];

/**
 * @param {Object}   props
 * @param {string}   props.value          Current stored value ('external' | 'internal').
 * @param {Function} props.onChange       Receives the next raw value.
 * @param {boolean}  [props.disabled]     Disables the control.
 * @param {string}   [props.hiddenReason] Shown as help text when disabled.
 */
export default function VideoSourceControl( {
	value,
	onChange,
	disabled = false,
	hiddenReason = '',
} ) {
	return createElement( SelectControl, {
		label: __( 'Video source', 'sgs-blocks' ),
		help: hiddenReason || undefined,
		value: value || 'external',
		options: VIDEO_SOURCE_OPTIONS,
		disabled,
		onChange,
		__next40pxDefaultSize: true,
		__nextHasNoMarginBottom: true,
	} );
}
