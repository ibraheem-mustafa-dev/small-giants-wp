/**
 * The three SGS rich-text formats, on the toolbar beside bold, italic and link (Spec 02 FR-2-4, FR-2-5; Spec 27 FR-30-24).
 *
 * - `sgs/highlight` ("Highlight"): a stripe behind the selected words, saved as
 *   `<span class="sgs-highlight [sgs-highlight--{slug}]">`.
 * - `sgs/inline-photo` ("Inline photo"): a small photo inside a line of text, saved as
 *   `<img class="sgs-inline-photo wp-image-N" src alt>`.
 * - `sgs/basket-count` ("Basket count"): the selected words stand for the number of items in the basket, saved as
 *   `<span class="sgs-basket-count">`. The words show in the editor only; the front end prints the span empty and fills
 *   it from the basket (`src/shared/cart-live/basket-count.js`).
 *
 * Both save class-only markup; the look comes from the client's theme snapshot through
 * `assets/css/inline-formats.css`. A block offers them by listing them in its RichText's `allowedFormats` (the shared
 * lists in `src/utils/rich-text-formats.js`); each format's toolbar control renders only inside an `sgs/` block, so a
 * core block that allows every format never shows them.
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import {
	registerFormatType,
	insertObject,
	applyFormat,
	removeFormat,
} from '@wordpress/rich-text';
import {
	MediaUpload,
	MediaUploadCheck,
	RichTextToolbarButton,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { brush, cart, image } from '@wordpress/icons';
import {
	BASKET_COUNT_NAME,
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

function BasketCountEdit( { isActive, value, onChange } ) {
	const inSgsBlock = useInSgsBlock();
	if ( ! inSgsBlock ) {
		return null;
	}
	return (
		<RichTextToolbarButton
			icon={ cart }
			title={ __( 'Basket count', 'sgs-blocks' ) }
			isActive={ isActive }
			onClick={ () =>
				onChange(
					isActive
						? removeFormat( value, BASKET_COUNT_NAME )
						: applyFormat( value, { type: BASKET_COUNT_NAME } )
				)
			}
		/>
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

export const basketCountFormat = {
	title: __( 'Basket count', 'sgs-blocks' ),
	tagName: 'span',
	className: 'sgs-basket-count',
	edit: BasketCountEdit,
};

registerFormatType( HIGHLIGHT_NAME, highlightFormat );
registerFormatType( BASKET_COUNT_NAME, basketCountFormat );
registerFormatType( PHOTO_NAME, inlinePhotoFormat );
