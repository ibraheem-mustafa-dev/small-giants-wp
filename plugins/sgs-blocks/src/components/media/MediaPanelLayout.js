/**
 * MediaPanelLayout — Wave 5a panel assembly for `sgs/media`.
 *
 * Assembles the media atom layer into the block's inspector: a media-type
 * switch, a "Source" section holding the current type's own controls
 * (`source` for all types, `meaning` for image/video, `svg-presentation` for
 * svg — each self-gates via the atom's own `types` list, so only the
 * relevant rows render for the active `mediaType`), an "Image Styling"
 * section (`object-fit` / `focal-point` / `motion`, also self-gated by
 * `types` so video gets them too), and an "Overlay" section that applies
 * regardless of the active type.
 *
 * Composes `<MediaElementPanel insertion="element">` calls per section
 * rather than re-implementing atom logic — kept under the 250-line JS limit
 * by design; every atom owns its own rows/CSS/disclosure.
 *
 * THREE atoms are DELIBERATELY NOT wired here (Wave 5a findings, not
 * oversights — see block.json's `_comment_mediaElements` for the full
 * reasoning): `box-shape` would create a second, conflicting `borderRadius`
 * mechanism alongside sgs/media's existing WP-native `style.border.radius`
 * for the base tier; `video-behaviour`'s toggles have no Tablet/Mobile tiers
 * while sgs/media's existing hand-rolled Playback Options panel already
 * offers per-device autoplay/loop/muted/etc; `overlay` paints via a
 * `.sgs-media-box::after` wrapper class that no render surface in this
 * plugin emits yet. Wiring any of the three in as-is would be a regression
 * or a silently-dead control, not a gap-fill — all three stay on the
 * existing behaviour (or absent) until a follow-up resolves the shape
 * mismatch.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import MediaElementPanel from '../MediaElementPanel.js';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.mediaType     'image' | 'video' | 'svg'.
 * @param {string}   [props.blockSlug]   Defaults to 'sgs/media'.
 * @param {string}   [props.previewUrl]  Image URL for the focal-point preview.
 * @return {JSX.Element} The full panel-layout section list.
 */
export default function MediaPanelLayout( {
	attributes,
	setAttributes,
	mediaType,
	blockSlug = 'sgs/media',
	previewUrl = '',
} ) {
	const commonProps = {
		attributes,
		setAttributes,
		blockSlug,
		insertion: 'element',
		mediaType,
	};

	return (
		<>
			<PanelBody title={ __( 'Media Type', 'sgs-blocks' ) } initialOpen>
				<MediaElementPanel { ...commonProps } atoms={ [ 'media-type' ] } mediaType={ undefined } />
			</PanelBody>

			<PanelBody title={ __( 'Source', 'sgs-blocks' ) } initialOpen>
				<MediaElementPanel { ...commonProps } atoms={ [ 'source' ] } />
				<MediaElementPanel { ...commonProps } atoms={ [ 'meaning' ] } />
				<MediaElementPanel { ...commonProps } atoms={ [ 'svg-presentation' ] } />
			</PanelBody>

			<PanelBody title={ __( 'Image Styling', 'sgs-blocks' ) } initialOpen={ false }>
				<MediaElementPanel
					{ ...commonProps }
					atoms={ [ 'object-fit', 'focal-point', 'motion' ] }
					previewUrl={ previewUrl }
				/>
			</PanelBody>
		</>
	);
}
