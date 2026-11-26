/**
 * "Trim empty edges": a button on an image slot that saves a copy of the picture with its blank margins cut off.
 *
 * The server (`includes/class-sgs-media-trim.php`, POST /sgs/v1/media/trim) trims the file with Imagick and saves the
 * result as a NEW attachment: the original stays in the library, untouched. The slot is then pointed at the copy,
 * keeping everything else the device holds (its alt text, mime type) and the focal point. The button shows only where
 * the host has ImageMagick (`window.sgsMediaTrim.available`, printed by the plugin) and the device's file is a raster
 * picture the server can trim.
 *
 * It is its own component so any slot field can mount it with one line: `MediaSlotField` mounts it beside Replace and
 * Remove.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { writeDevice } from './deviceValues.js';

/** Raster types the server can trim; an SVG has no pixel margin. */
const TRIMMABLE = /^image\/(jpeg|png|webp|avif)$/;

/**
 * Whether a device's file can be trimmed here.
 *
 * @param {string} kind The slot kind at this device.
 * @param {Object} own  The device's stored file (`{ id, url, mime }`).
 * @param {Object} [flag] `window.sgsMediaTrim`.
 * @return {boolean} True when the button should show.
 */
export function canTrim( kind, own, flag ) {
	if (
		'image' !== kind ||
		! flag?.available ||
		! ( Number( own?.id ) > 0 )
	) {
		return false;
	}
	// A stored mime says it; without one, the address does.
	return own.mime
		? TRIMMABLE.test( String( own.mime ) )
		: /\.(jpe?g|png|webp|avif)(\?.*)?$/i.test( String( own.url || '' ) );
}

/**
 * A focal point {x, y} (0 to 1, a share of the picture) moved to the same spot of the trimmed copy: the kept part started
 * `left` and `top` pixels into the original, so the share is measured from there against the copy's size.
 *
 * @param {?{x: number, y: number}} focal   The device's focal point.
 * @param {Object}                  trimmed The server's answer (`width`, `height`, `from_width`, `from_height`, `left`, `top`).
 * @return {?{x: number, y: number}} The focal point on the copy, or the same value when there is nothing to convert.
 */
export function trimmedFocal( focal, trimmed ) {
	if (
		! focal ||
		'object' !== typeof focal ||
		! ( trimmed?.width > 0 ) ||
		! ( trimmed?.height > 0 ) ||
		! ( trimmed?.from_width > 0 ) ||
		! ( trimmed?.from_height > 0 )
	) {
		return focal;
	}
	const clamp = ( v ) => Math.max( 0, Math.min( 1, v ) );
	const round = ( v ) => Math.round( v * 10000 ) / 10000;
	return {
		x: round(
			clamp(
				( focal.x * trimmed.from_width - ( trimmed.left || 0 ) ) /
					trimmed.width
			)
		),
		y: round(
			clamp(
				( focal.y * trimmed.from_height - ( trimmed.top || 0 ) ) /
					trimmed.height
			)
		),
	};
}

/**
 * The patch that points one device at the trimmed copy: the device's own settings stay, the file and its size change, and
 * the focal point follows the picture to its new edges (a cover crop would otherwise show the wrong part).
 *
 * @param {Object} stored  The slot's stored `Source`.
 * @param {string} device  The active device.
 * @param {Object} own     The device's current file.
 * @param {Object} trimmed The server's answer.
 * @param {*}      [focal] The slot's stored `Focal` (a tier object), when it holds one for this device.
 * @return {Object} `{ Source }`, and `{ Focal }` when the device had its own focal point, for `slotAccess().write`.
 */
export function trimmedPatch( stored, device, own, trimmed, focal ) {
	const patch = {
		Source: writeDevice( stored, device, {
			...own,
			id: trimmed.id,
			url: trimmed.url,
			width: trimmed.width,
			height: trimmed.height,
		} ),
	};
	const ownFocal =
		focal && 'object' === typeof focal ? focal[ device ] : undefined;
	if ( ownFocal && 'object' === typeof ownFocal ) {
		patch.Focal = writeDevice(
			focal,
			device,
			trimmedFocal( ownFocal, trimmed )
		);
	}
	return patch;
}

/**
 * @param {Object} props
 * @param {string} props.kind   The slot kind at this device.
 * @param {Object} props.own    The device's stored file.
 * @param {string} props.device The active device.
 * @param {Object} props.access `slotAccess()` of the slot.
 * @return {JSX.Element|null} The button and its answer, or null where trimming is not offered.
 */
export default function TrimEdgesButton( { kind, own, device, access } ) {
	const [ state, setState ] = useState( { busy: false, message: '' } );
	const flag =
		typeof window !== 'undefined' ? window.sgsMediaTrim : undefined;
	if ( ! canTrim( kind, own, flag ) ) {
		return null;
	}

	const run = async () => {
		setState( { busy: true, message: '' } );
		try {
			const trimmed = await apiFetch( {
				path: flag.path,
				method: 'POST',
				data: { id: own.id },
			} );
			access.write(
				trimmedPatch(
					access.read( 'Source' ),
					device,
					own,
					trimmed,
					access.read( 'Focal' )
				)
			);
			setState( {
				busy: false,
				message: __(
					'Saved a trimmed copy. The original is still in the Media Library.',
					'sgs-blocks'
				),
			} );
		} catch ( error ) {
			setState( {
				busy: false,
				message:
					error?.message ||
					__( 'The picture could not be trimmed.', 'sgs-blocks' ),
			} );
		}
	};

	return (
		<>
			<button
				type="button"
				className="sgs-media-slot__button"
				onClick={ run }
				disabled={ state.busy }
				aria-busy={ state.busy }
			>
				{ state.busy
					? __( 'Trimming…', 'sgs-blocks' )
					: __( 'Trim empty edges', 'sgs-blocks' ) }
			</button>
			{ state.message && (
				<p
					className="sgs-media-slot__warning"
					role="status"
					style={ { flexBasis: '100%', fontWeight: 400 } }
				>
					{ state.message }
				</p>
			) }
		</>
	);
}
