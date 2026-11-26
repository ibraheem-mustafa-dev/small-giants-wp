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
 * The patch that points one device at the trimmed copy: the device's own settings stay, the file and its size change.
 *
 * @param {Object} stored  The slot's stored `Source`.
 * @param {string} device  The active device.
 * @param {Object} own     The device's current file.
 * @param {Object} trimmed The server's answer `{ id, url, width, height }`.
 * @return {Object} `{ Source }` for `slotAccess().write`.
 */
export function trimmedPatch( stored, device, own, trimmed ) {
	return {
		Source: writeDevice( stored, device, {
			...own,
			id: trimmed.id,
			url: trimmed.url,
			width: trimmed.width,
			height: trimmed.height,
		} ),
	};
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
				trimmedPatch( access.read( 'Source' ), device, own, trimmed )
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
