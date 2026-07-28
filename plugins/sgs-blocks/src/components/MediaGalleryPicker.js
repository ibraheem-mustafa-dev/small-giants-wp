/**
 * MediaGalleryPicker — shared bulk multi-select media component for SGS blocks.
 *
 * Sibling to `MediaPicker.js` (single-slot media). Wraps `MediaUpload` +
 * `MediaUploadCheck` for the BULK case: an operator picking/curating an
 * ordered array of media items (images and/or video) from the WordPress
 * media library in one modal session — the pattern used by `sgs/gallery`.
 *
 * Scope: SELECTION only. Reordering (drag-to-reorder) and per-item removal
 * are block-specific concerns that stay in the consuming block's own edit.js
 * (see `sgs/gallery` edit.js `handleDragStart`/`handleDrop`/`removeImage`) —
 * they operate on the block's local `mediaItems` state/attribute, not on
 * anything this component owns.
 *
 * Mirrors MediaPicker's API conventions: `value` / `onChange` props,
 * `MediaUploadCheck` gate, render-prop `Button` trigger. Differs from
 * MediaPicker by accepting a `resolveItem` prop, because different
 * consuming blocks need different mapped-item shapes (e.g. sgs/gallery's
 * `resolveGalleryMedia()` adds `caption`/`fullUrl`/`width`/`height` and
 * resolves the preferred image size from the block's own `imageSize`
 * attribute) — a single hardcoded shape would not fit every future adopter.
 *
 * @package
 */

import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @typedef {Object} SGSGalleryMedia
 * @property {number} id
 * @property {string} url
 * @property {'image'|'video'} type
 * @property {string} [alt]
 * @property {string} [mime]
 */

/**
 * Default item resolver — used only when the consuming block does not pass
 * its own `resolveItem`. Produces the minimal MediaPicker-compatible shape;
 * blocks that need extra fields (captions, preferred sizes, etc.) should
 * pass their own resolver instead of relying on this default.
 *
 * @param {Object} media WordPress media-library item (from MediaUpload onSelect).
 * @returns {SGSGalleryMedia|null}
 */
function defaultResolveItem( media ) {
	if ( ! media || ! media.url ) {
		return null;
	}
	const mime = media.mime || media.mime_type || '';
	const type = mime.indexOf( 'video/' ) === 0 ? 'video' : 'image';
	return {
		id: media.id || 0,
		url: media.url,
		type,
		alt: media.alt || '',
		mime,
	};
}

/**
 * MediaGalleryPicker component.
 *
 * @param {Object}     props
 * @param {Object[]}   props.value                  Current array of mapped media items (must each carry `id`).
 * @param {(items: Object[]) => void} props.onChange Called with the full replacement array after a library selection.
 * @param {(media: Object) => Object|null} [props.resolveItem] Maps a raw WP media object to the block's item shape.
 *                                                    Defaults to `defaultResolveItem` (id/url/type/alt/mime only).
 * @param {string[]}   [props.allowedTypes]          Defaults to ['image', 'video'].
 * @param {boolean|string} [props.multiple]          WordPress MediaUpload `multiple` prop. `true` (default) opens
 *                                                    a multi-select modal pre-populated from `value` and REPLACES
 *                                                    the selection on confirm (matches sgs/gallery's existing
 *                                                    "Edit gallery" behaviour). `"add"` opens without
 *                                                    pre-selection and grows the existing array instead.
 * @param {boolean}    [props.gallery]               WordPress MediaUpload `gallery` prop (gallery-mode UI chrome). Defaults to true.
 * @param {string}     [props.addLabel]              Button label when `value` is empty.
 * @param {string}     [props.editLabel]              Button label when `value` already has items. Defaults to `addLabel` when omitted.
 * @param {string}     [props.buttonVariant]          `Button` `variant` prop. Defaults to 'secondary'.
 * @param {string}     [props.className]              Extra class name(s) applied to the trigger `Button`.
 * @returns {JSX.Element}
 */
export default function MediaGalleryPicker( {
	value = [],
	onChange,
	resolveItem = defaultResolveItem,
	allowedTypes = [ 'image', 'video' ],
	multiple = true,
	gallery = true,
	addLabel = __( 'Add media', 'sgs-blocks' ),
	editLabel,
	buttonVariant = 'secondary',
	className,
} ) {
	const handleSelect = ( selectedMedia ) => {
		const mapped = ( selectedMedia || [] )
			.map( ( media ) => resolveItem( media ) )
			.filter( Boolean );
		onChange( mapped );
	};

	const hasItems = Array.isArray( value ) && value.length > 0;
	const label = hasItems ? ( editLabel || addLabel ) : addLabel;

	return (
		<MediaUploadCheck>
			<MediaUpload
				onSelect={ handleSelect }
				allowedTypes={ allowedTypes }
				multiple={ multiple }
				gallery={ gallery }
				value={ ( value || [] ).map( ( item ) => item.id ).filter( Boolean ) }
				render={ ( { open } ) => (
					<Button
						onClick={ open }
						variant={ buttonVariant }
						className={ className }
					>
						{ label }
					</Button>
				) }
			/>
		</MediaUploadCheck>
	);
}
