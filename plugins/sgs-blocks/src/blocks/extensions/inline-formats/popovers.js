/**
 * The popovers and value helpers behind the two SGS rich-text formats (Spec 02 FR-2-4, FR-2-5).
 *
 * Highlight: a palette colour stored as a class (`sgs-highlight--{slug}`), so the saved markup carries no style and a
 * palette change recolours every highlight. Inline photo: an image object inserted at its `medium` size with
 * `wp-image-N`, so WordPress adds `srcset` on the page; its alt text is edited through `value.replacements`, the way
 * core's inline image format edits its object.
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import {
	Button,
	Notice,
	Popover,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import {
	applyFormat,
	removeFormat,
	remove,
	useAnchor,
} from '@wordpress/rich-text';
import DesignTokenPicker from '../../../components/DesignTokenPicker';

export const HIGHLIGHT_NAME = 'sgs/highlight';
export const PHOTO_NAME = 'sgs/inline-photo';

const HIGHLIGHT_MODIFIER = 'sgs-highlight--';
// The slugs a selector can carry; the server keeps the same set (helpers-inline-formats.php).
const SAFE_SLUG = /^[a-z0-9-]+$/;
const MAX_HIGHLIGHT_WORDS = 3;

/**
 * The modifier class for a palette slug, or '' for an empty or unsafe one.
 *
 * @param {string} slug Palette slug.
 * @return {string} `sgs-highlight--{slug}` or ''.
 */
export function highlightClass( slug ) {
	return slug && SAFE_SLUG.test( slug )
		? `${ HIGHLIGHT_MODIFIER }${ slug }`
		: '';
}

/**
 * The palette slug a saved highlight class names, or ''.
 *
 * @param {string|undefined} className The format's `class` attribute.
 * @return {string} The slug.
 */
export function highlightSlug( className ) {
	const token = String( className || '' )
		.split( /\s+/ )
		.find( ( c ) => c.startsWith( HIGHLIGHT_MODIFIER ) );
	return token ? token.slice( HIGHLIGHT_MODIFIER.length ) : '';
}

/**
 * Apply the highlight with a palette colour, or with the site's highlight colour when the slug is empty.
 *
 * @param {Object} value Rich-text value.
 * @param {string} slug  Palette slug, or ''.
 * @return {Object} The new value.
 */
export function applyHighlightColour( value, slug ) {
	const className = highlightClass( slug );
	return applyFormat(
		value,
		className
			? { type: HIGHLIGHT_NAME, attributes: { class: className } }
			: { type: HIGHLIGHT_NAME }
	);
}

/**
 * The text a highlight covers: the selection, or with a collapsed caret the run of the highlight around it.
 *
 * @param {Object} value Rich-text value (`text`, `formats`, `start`, `end`).
 * @return {string} The covered text.
 */
export function highlightedText( value ) {
	const { text = '', formats = [], start = 0, end = 0 } = value || {};
	if ( start !== end ) {
		return text.slice( start, end );
	}
	const has = ( i ) =>
		( formats[ i ] || [] ).some( ( f ) => f.type === HIGHLIGHT_NAME );
	let from = start;
	let to = start;
	while ( from > 0 && has( from - 1 ) ) {
		from--;
	}
	while ( to < text.length && has( to ) ) {
		to++;
	}
	return text.slice( from, to );
}

/**
 * Whether a highlight spans more words than one line can be trusted to hold (a highlight never wraps).
 *
 * @param {string} text Covered text.
 * @return {boolean} True over three words.
 */
export function isLongHighlight( text ) {
	return (
		String( text ).trim().split( /\s+/ ).filter( Boolean ).length >
		MAX_HIGHLIGHT_WORDS
	);
}

/**
 * The object a picked photo inserts: its `medium` size, `wp-image-N`, and an empty alt (decorative by default).
 *
 * @param {Object} media The media library selection.
 * @return {Object} The rich-text object format.
 */
export function photoObject( media ) {
	return {
		type: PHOTO_NAME,
		attributes: {
			className: `wp-image-${ media.id }`,
			url: media.sizes?.medium?.url || media.url,
			alt: '',
		},
	};
}

/**
 * The value with the selected photo's alt text replaced, through `value.replacements` as core's inline image does.
 *
 * @param {Object} value Rich-text value with the photo selected.
 * @param {string} alt   New alt text ('' for a decorative photo).
 * @return {Object} The new value.
 */
export function withPhotoAlt( value, alt ) {
	const replacements = value.replacements.slice();
	const current = replacements[ value.start ];
	replacements[ value.start ] = {
		...current,
		attributes: { ...current.attributes, alt },
	};
	return { ...value, replacements };
}

/**
 * The highlight's colour popover.
 *
 * @param {Object}   props
 * @param {Object}   props.value            Rich-text value.
 * @param {Function} props.onChange         Rich-text change handler.
 * @param {Object}   props.settings         The highlight format settings (anchors the popover).
 * @param {Object}   props.contentRef       The editable element.
 * @param {Object}   props.activeAttributes The active highlight's attributes.
 * @param {Function} props.onClose          Closes the popover.
 */
export function HighlightPopover( {
	value,
	onChange,
	settings,
	contentRef,
	activeAttributes,
	onClose,
} ) {
	const anchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings,
	} );
	const slug = highlightSlug( activeAttributes?.class );
	return (
		<Popover
			anchor={ anchor }
			onClose={ onClose }
			placement="bottom"
			focusOnMount="firstElement"
			className="sgs-inline-format-popover"
		>
			<div className="sgs-inline-format-popover__body">
				<DesignTokenPicker
					linked
					disableCustomColors
					clearable
					label={ __( 'Highlight colour', 'sgs-blocks' ) }
					states={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: slug,
							onChange: ( picked ) =>
								onChange(
									applyHighlightColour( value, picked )
								),
							linked: true,
						},
					] }
					help={ __(
						"Pick one of your site colours. Leave it clear to use the site's highlight colour.",
						'sgs-blocks'
					) }
				/>
				{ isLongHighlight( highlightedText( value ) ) && (
					<Notice status="info" isDismissible={ false }>
						{ __(
							'Best on one to three words: a highlight never breaks across lines.',
							'sgs-blocks'
						) }
					</Notice>
				) }
				<Button
					variant="secondary"
					isDestructive
					onClick={ () => {
						onChange( removeFormat( value, HIGHLIGHT_NAME ) );
						onClose();
					} }
				>
					{ __( 'Remove highlight', 'sgs-blocks' ) }
				</Button>
			</div>
		</Popover>
	);
}

/**
 * The selected photo's popover: decorative or described, replace, remove.
 *
 * @param {Object}   props
 * @param {Object}   props.value                  Rich-text value with the photo selected.
 * @param {Function} props.onChange               Rich-text change handler.
 * @param {Object}   props.settings               The photo format settings (anchors the popover).
 * @param {Object}   props.contentRef             The editable element.
 * @param {Object}   props.activeObjectAttributes The photo's attributes.
 * @param {Function} props.onReplace              Opens the media library to replace the photo.
 */
export function PhotoPopover( {
	value,
	onChange,
	settings,
	contentRef,
	activeObjectAttributes,
	onReplace,
} ) {
	const anchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings,
	} );
	const alt = activeObjectAttributes?.alt || '';
	// An empty alt is a decorative photo; turning the toggle off asks for a description.
	const [ described, setDescribed ] = useState( '' !== alt );
	return (
		<Popover
			anchor={ anchor }
			placement="bottom"
			focusOnMount={ false }
			className="sgs-inline-format-popover"
		>
			<div className="sgs-inline-format-popover__body">
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Decorative photo', 'sgs-blocks' ) }
					help={ __(
						'The words already say it all, so screen readers skip the photo.',
						'sgs-blocks'
					) }
					checked={ ! described }
					onChange={ ( decorative ) => {
						setDescribed( ! decorative );
						if ( decorative ) {
							onChange( withPhotoAlt( value, '' ) );
						}
					} }
				/>
				{ described && (
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Describe the photo', 'sgs-blocks' ) }
						help={ __(
							'Read aloud as part of the text, so keep it short.',
							'sgs-blocks'
						) }
						value={ alt }
						onChange={ ( next ) =>
							onChange( withPhotoAlt( value, next ) )
						}
					/>
				) }
				{ described && '' === alt.trim() && (
					<Notice status="warning" isDismissible={ false }>
						{ __(
							'Describe the photo, or turn Decorative photo back on.',
							'sgs-blocks'
						) }
					</Notice>
				) }
				<div className="sgs-inline-format-popover__actions">
					<Button variant="secondary" onClick={ onReplace }>
						{ __( 'Replace', 'sgs-blocks' ) }
					</Button>
					<Button
						variant="secondary"
						isDestructive
						onClick={ () =>
							onChange( remove( value, value.start, value.end ) )
						}
					>
						{ __( 'Remove', 'sgs-blocks' ) }
					</Button>
				</div>
			</div>
		</Popover>
	);
}
