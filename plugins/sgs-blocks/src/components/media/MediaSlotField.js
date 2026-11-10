/**
 * MediaSlotField: the one picker for a media slot, per device (Spec 49 §9.2, §9.5).
 *
 * Through `ResponsiveOverride`: a kind choice limited to the slot's allowed kinds (hidden when it allows one), the
 * Media Library first, a preview, Replace and Remove, the inherited media off Desktop ("Mobile: using Desktop's
 * video"), and a required Cover image for video. On Replace, Focal resets to centre unless "Keep focal point" is
 * ticked, and a non-empty Alt gets "Alt text still describes the previous photo. Update it." with focus on Alt. A
 * device with its own file has its own Alt (empty means it uses the wider device's). Every action is one
 * `setAttributes` call, so one undo step.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import ResponsiveOverride from '../ResponsiveOverride.js';
import Chips from './Chips.js';
import MediaSlotPreview from './MediaSlotPreview.js';
import MediaSlotAlt from './MediaSlotAlt.js';
import { slotAccess } from './fieldBase.js';
import { resolveTierSource, useActiveDevice, writeDevice } from './deviceValues.js';
import { LIBRARY_TYPES, embedSrc, hasFile, kindNoun, kindOptions, pickPatch, posterPatch, removePatch } from './mediaSlotWrites.js';
import './MediaSlotField.css';

/** A Media Library button that hands the chosen attachment to `onSelect`. */
function LibraryButton( { types, label, onSelect, value } ) {
	return (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={ types }
				value={ value }
				onSelect={ onSelect }
				render={ ( { open } ) => (
					<button type="button" className="sgs-media-slot__button" onClick={ open }>
						{ label }
					</button>
				) }
			/>
		</MediaUploadCheck>
	);
}

export default function MediaSlotField( { attributes, setAttributes, prefix, slot, label } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	const kinds = slot?.kinds?.length ? slot.kinds : [ 'image' ];
	const [ keepFocal, setKeepFocal ] = useState( false );
	const [ staleAlt, setStaleAlt ] = useState( false );
	const altRef = useRef( null );

	useEffect( () => {
		if ( staleAlt ) {
			altRef.current?.focus();
		}
	}, [ staleAlt ] );

	const stored = access.read( 'Source' );
	const media = resolveTierSource( stored, device, hasFile );
	const kind = media.value?.kind || resolveTierSource( stored, device, ( s ) => !! s?.kind ).value?.kind || kinds[ 0 ];

	const pick = ( attachment, pickedKind ) => {
		const { patch, staleAlt: stale } = pickPatch( { read: access.read, device, media: attachment, kind: pickedKind, keepFocal } );
		access.write( patch );
		setStaleAlt( stale );
	};

	return (
		<ResponsiveOverride
			label={ label || __( 'Media', 'sgs-blocks' ) }
			value={ stored }
			onChange={ ( next ) => access.write( { Source: next } ) }
			inheritedNoun={ kindNoun( kind ) }
			desktopReset={ false }
		>
			{ ( { tier, ownValue, setOwnValue } ) => {
				const own = media.own ? media.value : null;
				const shown = media.value;
				return (
					<div className="sgs-media-slot">
						{ kinds.length > 1 && (
							<Chips
								label={ __( 'What kind of media', 'sgs-blocks' ) }
								options={ kindOptions().filter( ( o ) => kinds.includes( o.value ) ) }
								value={ kind }
								onChange={ ( next ) => setOwnValue( { kind: next } ) }
							/>
						) }

						{ shown && <MediaSlotPreview source={ shown } /> }

						{ 'embed' === kind ? (
							<div className="sgs-media-slot__embed-field">
								<label>
									{ __( 'YouTube or Vimeo address', 'sgs-blocks' ) }
									<input
										type="url"
										value={ own?.url || '' }
										onChange={ ( e ) => setOwnValue( { kind: 'embed', url: e.target.value } ) }
									/>
								</label>
								{ own?.url && ! embedSrc( own.url ) && (
									<p className="sgs-media-slot__warning" role="alert">
										{ __( 'This address is not a supported video', 'sgs-blocks' ) }
									</p>
								) }
							</div>
						) : (
							<div className="sgs-media-slot__actions">
								<LibraryButton
									types={ LIBRARY_TYPES[ kind ] || [ 'image' ] }
									value={ own?.id }
									label={ own && hasFile( own ) ? __( 'Replace', 'sgs-blocks' ) : __( 'Choose from Media Library', 'sgs-blocks' ) }
									onSelect={ ( attachment ) => pick( attachment, kind ) }
								/>
								{ own && hasFile( own ) && (
									<button
										type="button"
										className="sgs-media-slot__button"
										onClick={ () => {
											access.write( removePatch( { read: access.read, device } ) );
											setStaleAlt( false );
										} }
									>
										{ __( 'Remove', 'sgs-blocks' ) }
									</button>
								) }
							</div>
						) }

						{ own && hasFile( own ) && 'embed' !== kind && (
							<label className="sgs-media-slot__keep">
								<input type="checkbox" checked={ keepFocal } onChange={ ( e ) => setKeepFocal( e.target.checked ) } />
								{ __( 'Keep focal point', 'sgs-blocks' ) }
							</label>
						) }

						{ 'video' === kind && shown && (
							<div className="sgs-media-slot__cover">
								{ ! shown.poster?.url && (
									<p className="sgs-media-slot__warning" role="status">
										{ __( 'A video needs a cover image.', 'sgs-blocks' ) }
									</p>
								) }
								<LibraryButton
									types={ [ 'image' ] }
									value={ shown.poster?.id }
									label={ shown.poster?.url ? __( 'Replace cover image', 'sgs-blocks' ) : __( 'Choose cover image', 'sgs-blocks' ) }
									onSelect={ ( attachment ) => access.write( posterPatch( { read: access.read, device, media: attachment } ) ) }
								/>
							</div>
						) }

						<MediaSlotAlt
							access={ access }
							device={ tier }
							kind={ kind }
							ownSource={ own }
							staleAlt={ staleAlt }
							altRef={ altRef }
							onAltEdited={ () => setStaleAlt( false ) }
							writeOwnAlt={ ( alt ) => access.write( { Source: writeDevice( stored, device, { ...( ownValue || own ), alt } ) } ) }
						/>
					</div>
				);
			} }
		</ResponsiveOverride>
	);
}
