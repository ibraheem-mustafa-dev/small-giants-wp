/**
 * Canvas summary of the frame sources the scroll effect will play on the live
 * site: one line per configured device (frame count and file type), or a note
 * that the block renders as a static thumbnail until a desktop source is set.
 * The editor canvas always shows the thumbnail frame, so this line is where
 * the configured sources are visible while editing.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';

/**
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @return {JSX.Element} The summary paragraph.
 */
export default function FrameSummary( { attributes } ) {
	const tiers = [
		{ label: __( 'Desktop', 'sgs-blocks' ), url: attributes.desktopFramesUrl, count: attributes.desktopFrameCount, ext: attributes.desktopFrameExt },
		{ label: __( 'Tablet', 'sgs-blocks' ), url: attributes.tabletFramesUrl, count: attributes.tabletFrameCount, ext: attributes.tabletFrameExt },
		{ label: __( 'Mobile', 'sgs-blocks' ), url: attributes.mobileFramesUrl, count: attributes.mobileFrameCount, ext: attributes.mobileFrameExt },
	].filter( ( tier ) => tier.url && tier.count > 0 );

	if ( ! attributes.desktopFramesUrl || ! ( attributes.desktopFrameCount > 0 ) ) {
		return (
			<p className="sgs-image-sequence-editor__frame-count">
				{ __(
					'No frame source configured yet — this block will render as a static thumbnail image until you add one.',
					'sgs-blocks'
				) }
			</p>
		);
	}

	return (
		<p className="sgs-image-sequence-editor__frame-count">
			{ tiers
				.map( ( tier ) =>
					/* translators: 1: device name, 2: frame count, 3: file extension. */
					sprintf( __( '%1$s: %2$d frames (.%3$s)', 'sgs-blocks' ), tier.label, tier.count, tier.ext || 'webp' )
				)
				.join( ' · ' ) }
		</p>
	);
}
