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
 * Wave 5b (2026-09-01) closes the Wave 5a gap list: `box-shape` now owns
 * sizing/shape/border for this block outright (its own `aspectRatio`/
 * `borderRadius`/`borderWidth`/`borderStyle`/`borderColour`/
 * `borderColourGradient` attrs replace the retired native
 * `__experimentalBorder` + `style.dimensions.aspectRatio` — see block.json's
 * `_comment_mediaElements`), so the old "Media Sizing" (MediaSizingPanel) and
 * "Border radius" rows are gone from `media/edit.js`'s own ToolsPanel.
 * `video-behaviour` now renders its 6 boolean bases through the shared
 * tiered `BooleanResponsiveControl`, matching (not falling short of) the old
 * hand-rolled Playback Options panel, which is also gone from `edit.js`.
 * `overlay` paints via `.sgs-media-box::after`; `render.php` now adds the
 * `sgs-media-box` marker class whenever a box atom is declared.
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

			{ /* Wave 5c (2026-09-01): padding/opacity/shadow join box-shape here —
			     all four are box-presentation controls for the same element,
			     so they share one panel rather than each opening its own. */ }
			<PanelBody title={ __( 'Box & Border', 'sgs-blocks' ) } initialOpen={ false }>
				<MediaElementPanel { ...commonProps } atoms={ [ 'box-shape', 'media-padding', 'opacity', 'shadow' ] } />
			</PanelBody>

			{ /* video-behaviour's `types:['video']` gate returns no rows for
			     image/svg — mounting the PanelBody unconditionally would open
			     onto blank space for those types (empty-inspector-container),
			     so this section is gated on mediaType here rather than inside
			     MediaElementPanel. */ }
			{ 'video' === mediaType && (
				<PanelBody title={ __( 'Playback', 'sgs-blocks' ) } initialOpen={ false }>
					<MediaElementPanel { ...commonProps } atoms={ [ 'video-behaviour' ] } />
				</PanelBody>
			) }

			<PanelBody title={ __( 'Overlay', 'sgs-blocks' ) } initialOpen={ false }>
				<MediaElementPanel { ...commonProps } atoms={ [ 'overlay' ] } />
			</PanelBody>

			{ /* Wave 5c: caption is image/video; link is image-only — each
			     atom's own `types` gate already returns no rows outside its
			     media type, so this section is safe to mount unconditionally
			     (unlike Playback above, which would open onto blank space for
			     every non-video type and is gated in JSX instead). */ }
			<PanelBody title={ __( 'Caption & Link', 'sgs-blocks' ) } initialOpen={ false }>
				<MediaElementPanel { ...commonProps } atoms={ [ 'caption', 'link' ] } />
			</PanelBody>
		</>
	);
}
