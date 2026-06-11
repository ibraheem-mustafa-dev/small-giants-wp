import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useDispatch } from '@wordpress/data';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
} from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing only).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

/**
 * FR-22-6 migration: all card content (icon/media, heading, subtitle,
 * description, and button) is now rendered as InnerBlocks child blocks.
 * RichText inline editing of heading/description/subtitle has been removed —
 * those elements are now editable as child blocks in the InnerBlocks slot.
 *
 * Inspector controls cover only WRAPPER-level styling/layout that render.php
 * actually consumes:
 *   - cardStyle, hoverEffect, iconPosition (drive wrapper BEM classes)
 *   - the shared sgs/container wrapper controls (width/spacing, content kind)
 *
 * HC2 cleanup (2026-06-08): the per-element colour / font-size / icon-size and
 * legacy-link controls were removed. They were dead — the child blocks
 * (sgs/icon, sgs/heading, sgs/text, sgs/multi-button) own their own colour,
 * font size and link, so the parent controls set attributes render.php never
 * read. The removed attrs survive only in deprecated.js for back-compat.
 */

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

/**
 * Media type options for the "Media type" convenience dropdown.
 * A leading placeholder covers the "custom first child" case — where the
 * first child is not one of the recognised block/attribute combinations.
 * In that case the dropdown shows "— Custom —" and does nothing on change.
 */
const MEDIA_TYPE_OPTIONS = [
	{ label: __( '— Custom —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
	{ label: __( 'Emoji', 'sgs-blocks' ), value: 'emoji' },
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG / Animation', 'sgs-blocks' ), value: 'svg' },
];

/**
 * Default attributes inserted when swapping TO each media type.
 * These are purposely minimal — only the attrs that distinguish the media
 * type are set here; the child block's own defaults cover the rest.
 */
const MEDIA_TYPE_DEFAULTS = {
	icon:  { blockName: 'sgs/icon',  attrs: { iconSource: 'lucide', icon: 'star-filled', iconColour: 'primary', iconBackgroundColour: 'accent-light', iconSize: 'medium' } },
	emoji: { blockName: 'sgs/icon',  attrs: { iconSource: 'emoji', emojiChar: '⭐' } },
	image: { blockName: 'sgs/media', attrs: { mediaType: 'image' } },
	video: { blockName: 'sgs/media', attrs: { mediaType: 'video' } },
	svg:   { blockName: 'sgs/media', attrs: { mediaType: 'svg' } },
};

/**
 * Derive the current media-type value from the FIRST inner block of this
 * info-box. Returns one of 'icon' | 'emoji' | 'image' | 'video' | 'svg' | ''.
 * An empty string means "custom" (unknown / non-standard first child).
 *
 * @param {Object|undefined} firstBlock - The first inner block object, or undefined.
 * @return {string} The derived media type value.
 */
function deriveMediaType( firstBlock ) {
	if ( ! firstBlock ) {
		return '';
	}
	if ( firstBlock.name === 'sgs/icon' ) {
		// Distinguish emoji from standard icon by iconSource attribute.
		return firstBlock.attributes?.iconSource === 'emoji' ? 'emoji' : 'icon';
	}
	if ( firstBlock.name === 'sgs/media' ) {
		const mt = firstBlock.attributes?.mediaType;
		if ( mt === 'image' || mt === 'video' || mt === 'svg' ) {
			return mt;
		}
	}
	// First child is present but not a recognised media block — show "Custom".
	return '';
}

/**
 * Default InnerBlocks template for a new info-box.
 * Produces: icon → heading → description paragraph → button.
 * Operators customise the child blocks in place in the editor.
 */
const INFO_BOX_TEMPLATE = [
	[ 'sgs/icon', { icon: 'star-filled', iconColour: 'primary', iconBackgroundColour: 'accent-light', iconSize: 'medium' } ],
	[ 'sgs/heading', { level: 'h3', headingRole: 'heading', content: __( 'Feature heading', 'sgs-blocks' ) } ],
	[ 'sgs/text', { text: __( 'Describe the feature or benefit here.', 'sgs-blocks' ) } ],
	[
		'sgs/multi-button',
		{},
		[ [ 'sgs/button', { inheritStyle: 'primary', label: __( 'Learn More', 'sgs-blocks' ) } ] ],
	],
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		cardStyle,
		hoverEffect,
		iconPosition,
	} = attributes;

	// -------------------------------------------------------------------------
	// Read the inner blocks of THIS info-box so we can derive the current
	// media type without storing a redundant scalar attr on the parent block.
	// Keyed on clientId so the selector re-runs only when this block's children
	// change (not on unrelated blocks in the page).
	// -------------------------------------------------------------------------
	const innerBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks( clientId ),
		[ clientId ]
	);

	const { replaceBlock, updateBlockAttributes, insertBlock } = useDispatch( 'core/block-editor' );

	// Derived — never stored on the info-box itself.
	const firstBlock     = innerBlocks[ 0 ];
	const currentMediaType = deriveMediaType( firstBlock );

	/**
	 * Handle a change in the "Media type" dropdown.
	 *
	 * Rules:
	 * 1. Empty value ("— Custom —") selected → do nothing; preserve first child.
	 * 2. Icon ↔ Emoji (both use sgs/icon): update attrs IN PLACE so the client
	 *    keeps size/colour/link choices they may have already set.
	 * 3. Cross-type switch (e.g. Icon → Image): replace the first child block.
	 * 4. No children yet: insert a new block at index 0.
	 *
	 * In all cases, children at index 1+ (heading, text, button) are NEVER
	 * touched — only index 0 is ever affected.
	 *
	 * @param {string} newValue - The newly selected media type value.
	 */
	function handleMediaTypeChange( newValue ) {
		// Ignore the placeholder "— Custom —" option.
		if ( ! newValue ) {
			return;
		}

		const target = MEDIA_TYPE_DEFAULTS[ newValue ];
		if ( ! target ) {
			return;
		}

		if ( ! firstBlock ) {
			// No children at all — insert at index 0 only.
			insertBlock( createBlock( target.blockName, target.attrs ), 0, clientId );
			return;
		}

		const isIconSwitch = firstBlock.name === 'sgs/icon' && target.blockName === 'sgs/icon';

		if ( isIconSwitch ) {
			// Icon ↔ Emoji: same underlying block — update attrs in place.
			// This preserves any iconSize / iconColour the client already set.
			// When switching TO emoji, only set emojiChar default if it is empty.
			const patch = { iconSource: target.attrs.iconSource };
			if ( newValue === 'emoji' ) {
				patch.iconSource = 'emoji';
				if ( ! firstBlock.attributes?.emojiChar ) {
					patch.emojiChar = target.attrs.emojiChar;
				}
			} else {
				// Switching back to Icon: restore the lucide defaults for source/icon.
				// Intentionally NOT overwriting iconColour / iconSize so the client
				// keeps any customisation they made in icon mode.
				patch.iconSource = 'lucide';
				if ( ! firstBlock.attributes?.icon ) {
					patch.icon = target.attrs.icon;
				}
			}
			updateBlockAttributes( firstBlock.clientId, patch );
			return;
		}

		// Cross-type switch (e.g. Icon → Image, Image → Video, etc.):
		// replace the first child block entirely. All other children are unaffected.
		replaceBlock( firstBlock.clientId, createBlock( target.blockName, target.attrs ) );
	}

	// -------------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------------

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// FR-22-6: single InnerBlocks slot covers ALL card content.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template:     INFO_BOX_TEMPLATE,
		// Open: converter injects varied child block combinations.
		// Do not lock allowedBlocks so the editor remains flexible.
	} );

	return (
		<>
			<InspectorControls>
				{ /* ===== Media type (convenience swap — first child only) ===== */ }
				<PanelBody title={ __( 'Media', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Media type', 'sgs-blocks' ) }
						help={ __( 'Swaps the visual element at the top of this card. Your heading, text and button are never changed.', 'sgs-blocks' ) }
						value={ currentMediaType }
						options={ MEDIA_TYPE_OPTIONS }
						onChange={ handleMediaTypeChange }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* WS-4: mirrored sgs/container wrapper controls (content kind = width/spacing). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				{ /* ===== Card Style ===== */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { hoverEffect: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Layout ===== */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Media position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

			</InspectorControls>

			{ /* FR-22-6: innerBlocksProps spread onto the wrapper div — the
			     InnerBlocks slot IS the card content area. */ }
			<div { ...innerBlocksProps } />
		</>
	);
}
