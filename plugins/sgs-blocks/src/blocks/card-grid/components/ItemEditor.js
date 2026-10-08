/**
 * One editable card in sgs/card-grid's manual-items inspector list.
 */
import { __ } from '@wordpress/i18n';
import {
	Button,
	SelectControl,
	TextControl,
	ToggleControl,
	FocalPointPicker,
} from '@wordpress/components';
import { LinkPopoverField, IconPicker } from '../../../components';
import MediaPicker from '../../../components/MediaPicker';

const BADGE_VARIANT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
];

export default function ItemEditor( { item, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...item, [ key ]: value } );
	};

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<p style={ { margin: '0 0 8px', fontWeight: 600 } }>
				{ __( 'Item', 'sgs-blocks' ) } { index + 1 }
			</p>
			<div style={ { marginBottom: '8px' } }>
				<MediaPicker
					value={ item.media || null }
					onChange={ ( media ) => onChange( { ...item, media } ) }
					onRemove={ () => onChange( { ...item, media: null } ) }
					label={ __( 'Select card media', 'sgs-blocks' ) }
					instructionsImage={ __(
						'Choose an image or video for this card',
						'sgs-blocks'
					) }
				/>
			</div>
			{ /* Gated on media existing — an unavailable image shows no crop
			     control, matching the avatar/work disclosure pattern on
			     sgs/testimonial. Spec 35 Part 4: per-item, keyed by item._key
			     in render.php, never by array index. */ }
			{ !! item.media?.url && (
				<>
					<SelectControl
						label={ __( 'Image fit', 'sgs-blocks' ) }
						value={ item.objectFit || 'cover' }
						options={ [
							{ label: __( 'Cover (crop to fill)', 'sgs-blocks' ), value: 'cover' },
							{ label: __( 'Contain (fit within, no crop)', 'sgs-blocks' ), value: 'contain' },
							{ label: __( 'Fill (stretch)', 'sgs-blocks' ), value: 'fill' },
							{ label: __( 'Scale down (never enlarged)', 'sgs-blocks' ), value: 'scale-down' },
							{ label: __( 'Natural size', 'sgs-blocks' ), value: 'none' },
						] }
						onChange={ ( val ) => update( 'objectFit', val ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'cover' === ( item.objectFit || 'cover' ) && (
						<FocalPointPicker
							label={ __( 'Focal point', 'sgs-blocks' ) }
							url={ item.media.url }
							value={ item.focalPoint || { x: 0.5, y: 0.5 } }
							onChange={ ( val ) => update( 'focalPoint', val ) }
						/>
					) }
				</>
			) }
			<ToggleControl
				label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
				checked={ !! item.decorative }
				onChange={ ( val ) => update( 'decorative', val ) }
				help={ __(
					'Turn on for a purely decorative card image with no informational content — screen readers will skip it entirely (WCAG 1.1.1).',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			{ /* Per-item glyph icon — reuses the
			   shared framework icon registry (same IconPicker as sgs/icon and
			   sgs/trust-bar's icon-circle items), never a second icon system.
			   Shown over the photo, or over the image-fallback tile below when
			   the card has no media (see the block-wide "Glyph & Image
			   Fallback" panel). Empty = no glyph. */ }
			<IconPicker
				label={ __( 'Glyph icon (optional)', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: item.glyph || '' } }
				onChange={ ( { name } ) => update( 'glyph', name || '' ) }
				sources={ [ 'lucide' ] }
			/>
			{ !! item.glyph && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => update( 'glyph', '' ) }
					size="small"
					style={ { marginBottom: '8px' } }
				>
					{ __( 'Remove glyph', 'sgs-blocks' ) }
				</Button>
			) }
			<p style={ { margin: '0 0 8px', fontSize: 12, color: '#757575' } }>
				{ __(
					'Shown over the photo, or over the fallback tile if this card has no image.',
					'sgs-blocks'
				) }
			</p>
			{ /* Uploaded IMAGE glyph (wave B round 2) — an alternative to the
			   Lucide icon above, in the SAME slot. Reuses the same
			   MediaPicker component as the card media picker above (never a
			   second media-picking mechanism), restricted to images since a
			   glyph is never a video. Wins over the Lucide glyph when set. */ }
			<div style={ { marginBottom: '8px' } }>
				<MediaPicker
					value={ item.glyphImage || null }
					onChange={ ( media ) =>
						onChange( {
							...item,
							glyphImage: media
								? { url: media.url, id: media.id, alt: media.alt || '' }
								: null,
						} )
					}
					onRemove={ () => onChange( { ...item, glyphImage: null } ) }
					allowedTypes={ [ 'image' ] }
					label={ __( 'Select an image glyph (optional)', 'sgs-blocks' ) }
					instructionsImage={ __(
						'Choose an image (a logo mark, a shape outline, a badge) instead of the Lucide icon above',
						'sgs-blocks'
					) }
				/>
			</div>
			{ !! item.glyphImage?.url && (
				<p style={ { margin: '0 0 8px', fontSize: 12, color: '#757575' } }>
					{ __(
						'This image glyph is shown instead of the Lucide icon above.',
						'sgs-blocks'
					) }
				</p>
			) }
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ item.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Subtitle', 'sgs-blocks' ) }
				value={ item.subtitle || '' }
				onChange={ ( val ) => update( 'subtitle', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Badge text', 'sgs-blocks' ) }
				value={ item.badge || '' }
				onChange={ ( val ) => update( 'badge', val ) }
				placeholder={ __(
					'e.g. Trade prices from £3.50/kg',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Badge style', 'sgs-blocks' ) }
				value={ item.badgeVariant || '' }
				options={ BADGE_VARIANT_OPTIONS }
				onChange={ ( val ) => update( 'badgeVariant', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* Spec 35 §2 LINK standard — replaces the superseded inline
			   `SgsLinkControl` mount. `item.linkTarget` is a boolean-shaped
			   enum ('_self'/'_blank' only per block.json), so
			   targetMode="boolean" matches the declared schema exactly. */ }
			<LinkPopoverField
				label={ __( 'Link', 'sgs-blocks' ) }
				help={ __(
					'Search your site or paste a URL to make this card clickable.',
					'sgs-blocks'
				) }
				value={ {
					url: item.link || '',
					linkTarget: item.linkTarget || '_self',
					rel: item.linkRel || '',
				} }
				targetMode="boolean"
				onChange={ ( next ) => {
					const patch = { ...item };
					if ( undefined !== next.url ) patch.link = next.url;
					if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
					if ( undefined !== next.rel ) patch.linkRel = next.rel;
					onChange( patch );
				} }
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove item', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}
