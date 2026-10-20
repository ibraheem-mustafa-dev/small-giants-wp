/**
 * The two SGS rich-text formats, on the toolbar beside bold, italic and link (Spec 02 FR-2-4, FR-2-5).
 *
 * - `sgs/highlight` ("Highlight"): a stripe behind the selected words, saved as
 *   `<span class="sgs-highlight [sgs-highlight--{slug}]">`.
 * - `sgs/inline-photo` ("Inline photo"): a small photo inside a line of text, saved as
 *   `<img class="sgs-inline-photo wp-image-N" src alt>`.
 *
 * Both save class-only markup; the look comes from the client's theme snapshot through
 * `assets/css/inline-formats.css`. A block offers them by listing them in its RichText's `allowedFormats` (the shared
 * lists in `src/utils/rich-text-formats.js`); each format's toolbar control renders only inside an `sgs/` block, so a
 * core block that allows every format never shows them.
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { registerFormatType, insertObject } from '@wordpress/rich-text';
import {
	MediaUpload,
	MediaUploadCheck,
	RichTextToolbarButton,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { brush, image } from '@wordpress/icons';
import {
	HIGHLIGHT_NAME,
	PHOTO_NAME,
	HighlightPopover,
	PhotoPopover,
	applyHighlightColour,
	photoObject,
} from './popovers';

/**
 * Whether the selected block is an SGS block.
 *
 * @return {boolean} True inside an `sgs/` block.
 */
function useInSgsBlock() {
	return useSelect( ( select ) => {
		const editor = select( blockEditorStore );
		return String(
			editor.getBlockName( editor.getSelectedBlockClientId() ) || ''
		).startsWith( 'sgs/' );
	}, [] );
}

/**
 * The attachment id a photo's `wp-image-N` class names.
 *
 * @param {Object|undefined} attributes The photo's attributes.
 * @return {number|undefined} The id.
 */
function photoId( attributes ) {
	const match = String( attributes?.className || '' ).match(
		/wp-image-(\d+)/
	);
	return match ? parseInt( match[ 1 ], 10 ) : undefined;
}

function HighlightEdit( {
	isActive,
	activeAttributes,
	value,
	onChange,
	contentRef,
} ) {
	const inSgsBlock = useInSgsBlock();
	const [ isOpen, setOpen ] = useState( false );
	// The popover unmounts without onClose when the highlight goes away; close it so it cannot reopen unprompted.
	useEffect( () => {
		if ( ! isActive ) {
			setOpen( false );
		}
	}, [ isActive ] );
	if ( ! inSgsBlock ) {
		return null;
	}
	return (
		<>
			<RichTextToolbarButton
				icon={ brush }
				title={ __( 'Highlight', 'sgs-blocks' ) }
				isActive={ isActive }
				onClick={ () => {
					if ( ! isActive ) {
						onChange( applyHighlightColour( value, '' ) );
					}
					setOpen( true );
				} }
			/>
			{ isOpen && isActive && (
				<HighlightPopover
					value={ value }
					onChange={ onChange }
					settings={ highlightFormat }
					contentRef={ contentRef }
					activeAttributes={ activeAttributes }
					onClose={ () => setOpen( false ) }
				/>
			) }
		</>
	);
}

function InlinePhotoEdit( {
	value,
	onChange,
	onFocus,
	isObjectActive,
	activeObjectAttributes,
	contentRef,
} ) {
	const inSgsBlock = useInSgsBlock();
	// The photo selection the visitor closed the popover on; selecting a photo anywhere else opens it again.
	const [ closedAt, setClosedAt ] = useState( null );
	// Leaving the photo forgets the dismissal, so coming back to the same photo opens its popover again.
	useEffect( () => {
		if ( ! isObjectActive ) {
			setClosedAt( null );
		}
	}, [ isObjectActive ] );
	if ( ! inSgsBlock ) {
		return null;
	}
	const selection = `${ photoId( activeObjectAttributes ) ?? '' }-${
		value.start
	}`;
	return (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={ [ 'image' ] }
				value={ photoId( activeObjectAttributes ) }
				onSelect={ ( media ) => {
					onChange( insertObject( value, photoObject( media ) ) );
					if ( onFocus ) {
						onFocus();
					}
				} }
				render={ ( { open } ) => (
					<>
						<RichTextToolbarButton
							icon={ image }
							title={ __( 'Inline photo', 'sgs-blocks' ) }
							isActive={ isObjectActive }
							onClick={ open }
						/>
						{ isObjectActive && closedAt !== selection && (
							<PhotoPopover
								key={ selection }
								value={ value }
								onChange={ onChange }
								settings={ inlinePhotoFormat }
								contentRef={ contentRef }
								activeObjectAttributes={
									activeObjectAttributes
								}
								onReplace={ open }
								onClose={ () => {
									setClosedAt( selection );
									contentRef.current?.focus();
								} }
							/>
						) }
					</>
				) }
			/>
		</MediaUploadCheck>
	);
}

export const highlightFormat = {
	title: __( 'Highlight', 'sgs-blocks' ),
	tagName: 'span',
	className: 'sgs-highlight',
	attributes: { class: 'class' },
	edit: HighlightEdit,
};

export const inlinePhotoFormat = {
	title: __( 'Inline photo', 'sgs-blocks' ),
	keywords: [ __( 'photo', 'sgs-blocks' ), __( 'image', 'sgs-blocks' ) ],
	object: true,
	tagName: 'img',
	className: 'sgs-inline-photo',
	attributes: { className: 'class', url: 'src', alt: 'alt' },
	edit: InlinePhotoEdit,
};

registerFormatType( HIGHLIGHT_NAME, highlightFormat );
registerFormatType( PHOTO_NAME, inlinePhotoFormat );
