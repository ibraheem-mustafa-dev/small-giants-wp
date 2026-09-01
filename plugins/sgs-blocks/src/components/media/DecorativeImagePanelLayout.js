/**
 * DecorativeImagePanelLayout — Wave 6 panel assembly for `sgs/decorative-image`.
 *
 * Sibling to `MediaPanelLayout.js` (built for `sgs/media`'s full 16-atom
 * set), NOT a reuse of it — this block adopts exactly three atoms
 * (`object-fit` / `focal-point` / `overlay`), unprefixed (one media slot),
 * and mounts them as bare rows inside ONE `PanelBody` rather than the
 * multi-section layout `sgs/media` needs for its much larger atom set.
 *
 * `box-shape` is deliberately NOT adopted here — border-radius/sizing-mode
 * is a genuinely new capability this block never exposed, and this
 * migration is scoped to preserving existing behaviour while wiring the
 * three atoms the block's block.json now declares. See block.json's
 * `_comment_mediaElements` for the full rationale.
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
 * @param {string}   [props.mediaType]   'image' | 'video' — gates which
 *                                       atoms' rows render (`overlay` alone
 *                                       also accepts 'svg', but this block
 *                                       has no svg media type).
 * @param {string}   [props.previewUrl]  Image URL for the focal-point preview.
 * @return {JSX.Element|null} The panel section, or null when this element
 *                             has no media selected yet (no atoms render).
 */
export default function DecorativeImagePanelLayout( {
	attributes,
	setAttributes,
	mediaType = 'image',
	previewUrl = '',
} ) {
	return (
		<PanelBody title={ __( 'Image Styling', 'sgs-blocks' ) } initialOpen={ false }>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix=""
				blockSlug="sgs/decorative-image"
				insertion="element"
				atoms={ [ 'object-fit', 'focal-point', 'overlay' ] }
				mediaType={ mediaType }
				scope="element"
				previewUrl={ previewUrl }
			/>
		</PanelBody>
	);
}
