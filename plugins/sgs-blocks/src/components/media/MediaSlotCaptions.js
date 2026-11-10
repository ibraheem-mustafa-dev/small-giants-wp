/**
 * The captions picker of a video device (Spec 49 §8, §9.4 Video panel): a `.vtt` from the Media Library, a Label and a
 * Language, written to `Source.<device>.captions = { id, label, lang }` with Remove. Captions belong to the device's own
 * video: a device that uses a wider device's video says so instead of offering a picker. Every action is one
 * `setAttributes` call, so one undo step.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import { LibraryButton } from './MediaSlotField.js';
import { slotAccess } from './fieldBase.js';
import { deviceName, resolveTierSource, useActiveDevice, writeDevice } from './deviceValues.js';
import { hasFile } from './mediaSlotWrites.js';

const VTT_TYPES = [ 'text/vtt' ];

/** The captions of a stored source, with every key present. */
const captionsOf = ( source ) => ( {
	id: source?.captions?.id ?? 0,
	label: source?.captions?.label || '',
	lang: source?.captions?.lang || '',
} );

export default function MediaSlotCaptions( { attributes, setAttributes, prefix = '' } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	const stored = access.read( 'Source' );
	const media = resolveTierSource( stored, device, hasFile );

	if ( ! media.value || 'video' !== media.value.kind ) {
		return null;
	}
	if ( ! media.own ) {
		return (
			<p className="sgs-media-slot__help" role="status">
				{ sprintf(
					/* translators: %s: the wider device whose video this device uses. */
					__( "Captions belong to each device's own video. This device uses %s's video.", 'sgs-blocks' ),
					deviceName( media.from )
				) }
			</p>
		);
	}

	const captions = captionsOf( media.value );
	const has = !! captions.id;
	const write = ( next ) => access.write( { Source: writeDevice( stored, device, { ...media.value, captions: next } ) } );
	const writeWithout = () => {
		const { captions: dropped, ...rest } = media.value; // eslint-disable-line no-unused-vars
		access.write( { Source: writeDevice( stored, device, rest ) } );
	};

	return (
		<div className="sgs-media-slot__captions" role="group" aria-label={ __( 'Captions', 'sgs-blocks' ) }>
			<div className="sgs-media-slot__actions">
				<LibraryButton
					types={ VTT_TYPES }
					value={ captions.id || undefined }
					label={ has ? __( 'Replace captions (.vtt)', 'sgs-blocks' ) : __( 'Add captions (.vtt)', 'sgs-blocks' ) }
					onSelect={ ( file ) => write( { ...captions, id: file.id || 0 } ) }
				/>
				{ has && (
					<button type="button" className="sgs-media-slot__button" onClick={ writeWithout }>
						{ __( 'Remove captions', 'sgs-blocks' ) }
					</button>
				) }
			</div>
			{ has && (
				<>
					<label className="sgs-media-slot__field">
						{ __( 'Captions label', 'sgs-blocks' ) }
						<input type="text" value={ captions.label } onChange={ ( e ) => write( { ...captions, label: e.target.value } ) } />
					</label>
					<p className="sgs-media-slot__help">{ __( 'Shown in the player’s subtitle menu, for example English.', 'sgs-blocks' ) }</p>
					<label className="sgs-media-slot__field">
						{ __( 'Captions language code', 'sgs-blocks' ) }
						<input type="text" value={ captions.lang } onChange={ ( e ) => write( { ...captions, lang: e.target.value } ) } />
					</label>
					<p className="sgs-media-slot__help">{ __( 'A two or three letter code such as en, cy or fr.', 'sgs-blocks' ) }</p>
				</>
			) }
		</div>
	);
}
