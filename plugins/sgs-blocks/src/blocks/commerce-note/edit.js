/**
 * Commerce note: editor component. The text is edited in place; the optional
 * link has its own inspector settings.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import {
	LinkPopoverField,
	SGS_FONT_WEIGHT_OPTIONS,
	SgsColourPanel,
	TypographyControls,
	textRow,
} from '../../components';
import { colourVar, typographyPreviewStyle, usePreviewTier } from '../../utils';
import { LINK_SOURCES_ALL } from '../../shared/link-source-options';
import { RICH_TEXT_EMPHASIS } from '../../utils/rich-text-formats';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { text, linkLabel, linkUrl, linkTarget, linkRel, linkUrlSource } =
		attributes;
	const tier = usePreviewTier();
	const linkColour = colourVar( attributes.commerceNoteLinkColour );
	const linkHover = colourVar( attributes.commerceNoteLinkColourHover );
	const linkWeight = attributes.commerceNoteLinkFontWeight;
	const linkCss = [
		linkWeight
			? `#block-${ clientId } .sgs-commerce-note__link{font-weight:${ linkWeight };}`
			: '',
		linkColour
			? `#block-${ clientId } .sgs-commerce-note__link{color:${ linkColour };}`
			: '',
		linkHover
			? `#block-${ clientId } .sgs-commerce-note__link:hover{color:${ linkHover };}`
			: '',
	].join( '' );
	return (
		<div
			{ ...useBlockProps( {
				className: 'sgs-commerce-note',
				style: {
					...typographyPreviewStyle(
						attributes,
						'commerceNote',
						tier
					),
				},
			} ) }
		>
			{ linkCss ? <style>{ linkCss }</style> : null }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Note text', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="commerceNote"
						showResponsive
						fontSizePresets
						showFontFamily
						showWeight
						showLineHeight
						showLetterSpacing
						showTransform
						showTextAlign
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsColourPanel
						rows={ [
							textRow( {
								key: 'noteLink',
								label: __( 'Link', 'sgs-blocks' ),
								attrs: {
									base: 'commerceNoteLinkColour',
									hover: 'commerceNoteLinkColourHover',
								},
								attributes,
								setAttributes,
							} ),
						] }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
				<PanelBody title={ __( 'Link', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Link weight', 'sgs-blocks' ) }
						value={ attributes.commerceNoteLinkFontWeight || '' }
						options={ SGS_FONT_WEIGHT_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( {
								commerceNoteLinkFontWeight: value,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Link text', 'sgs-blocks' ) }
						value={ linkLabel }
						onChange={ ( value ) =>
							setAttributes( { linkLabel: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<LinkPopoverField
						label={ __( 'Link address', 'sgs-blocks' ) }
						help={ __(
							'The link shows only when both the text and the address are filled in.',
							'sgs-blocks'
						) }
						value={ {
							url: linkUrl,
							linkTarget,
							rel: linkRel,
							linkSource: linkUrlSource,
						} }
						linkSources={ LINK_SOURCES_ALL }
						targetMode="boolean"
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) {
								patch.linkUrl = next.url;
							}
							if ( undefined !== next.linkTarget ) {
								patch.linkTarget = next.linkTarget;
							}
							if ( undefined !== next.rel ) {
								patch.linkRel = next.rel;
							}
							if ( undefined !== next.linkSource ) {
								patch.linkUrlSource = next.linkSource;
							}
							setAttributes( patch );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<RichText
				tagName="span"
				className="sgs-commerce-note__text"
				value={ text }
				onChange={ ( value ) => setAttributes( { text: value } ) }
				allowedFormats={ RICH_TEXT_EMPHASIS }
				placeholder={ __( 'Write the note', 'sgs-blocks' ) }
			/>
			{ linkLabel && ( linkUrl || linkUrlSource ) ? (
				<>
					{ ' ' }
					<a
						className="sgs-commerce-note__link"
						href={ linkUrl }
						{ ...( '_blank' === linkTarget
							? { target: '_blank', rel: 'noopener noreferrer' }
							: { rel: linkRel || undefined } ) }
						onClick={ ( event ) => event.preventDefault() }
					>
						{ linkLabel }
					</a>
				</>
			) : null }
		</div>
	);
}
