/**
 * The Alt box and Decorative checkbox of a media slot (Spec 49 §9.2).
 *
 * Alt is a multi-line box with one help line; Decorative is a checkbox beside it that hides it. A device with its
 * own file shows its own Alt (empty means it uses the wider device's alt) with "This file differs from Desktop's.
 * Describe it."; otherwise Alt is the slot's single alt and, off Desktop, says it applies to all devices.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import { deviceName, resolveTierSource } from './deviceValues.js';
import { hasFile } from './mediaSlotWrites.js';

/** The label of the box, per kind (§9.3). */
function altLabel( kind ) {
	if ( 'video' === kind || 'embed' === kind ) {
		return __( 'Title (for screen readers)', 'sgs-blocks' );
	}
	if ( 'svg' === kind ) {
		return __( 'Label (for screen readers)', 'sgs-blocks' );
	}
	return __( 'Alt text', 'sgs-blocks' );
}

export default function MediaSlotAlt( { access, device, kind, ownSource, staleAlt, altRef, onAltEdited, writeOwnAlt } ) {
	const decorative = !! access.read( 'Decorative' );
	const perDevice = 'desktop' !== device && !! ownSource && hasFile( ownSource );
	const widerDevice = 'mobile' === device ? 'tablet' : 'desktop';
	const widerFrom = resolveTierSource( access.read( 'Source' ), widerDevice, hasFile ).from || 'desktop';
	const value = perDevice ? ownSource.alt || '' : access.read( 'Alt' ) || '';
	const supportsDecorative = 'embed' !== kind;

	const onChange = ( event ) => {
		onAltEdited();
		if ( perDevice ) {
			writeOwnAlt( event.target.value );
		} else {
			access.write( { Alt: event.target.value } );
		}
	};

	return (
		<div className="sgs-media-slot__alt">
			{ ! decorative && (
				<label className="sgs-media-slot__alt-label">
					{ altLabel( kind ) }
					<textarea
						ref={ altRef }
						rows="3"
						value={ value }
						placeholder={ perDevice ? access.read( 'Alt' ) || '' : '' }
						aria-label={ sprintf( /* translators: 1: the box's label, 2: device name. */ __( '%1$s on %2$s', 'sgs-blocks' ), altLabel( kind ), deviceName( device ) ) }
						onChange={ onChange }
					/>
					<span className="sgs-media-slot__help">
						{ 'image' === kind
							? __( 'Describe the photo for someone who cannot see it.', 'sgs-blocks' )
							: __( 'Describe this for someone who cannot see it.', 'sgs-blocks' ) }
					</span>
				</label>
			) }
			{ perDevice && ! decorative && ! value && (
				<p className="sgs-media-slot__note" role="status">
					{ sprintf( /* translators: %s: the wider device. */ __( "This file differs from %s's. Describe it.", 'sgs-blocks' ), deviceName( widerFrom ) ) }
				</p>
			) }
			{ staleAlt && (
				<p className="sgs-media-slot__warning" role="alert">
					{ __( 'Alt text still describes the previous photo. Update it.', 'sgs-blocks' ) }
				</p>
			) }
			{ supportsDecorative && (
				<label className="sgs-media-slot__decorative">
					<input
						type="checkbox"
						checked={ decorative }
						onChange={ ( e ) => access.write( { Decorative: e.target.checked } ) }
					/>
					{ __( 'Decorative', 'sgs-blocks' ) }
				</label>
			) }
			{ 'desktop' !== device && ( decorative || ! perDevice ) && (
				<p className="sgs-media-slot__note">{ __( 'Applies to all devices', 'sgs-blocks' ) }</p>
			) }
		</div>
	);
}
