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
import { PanelBody, TextControl } from '@wordpress/components';
import { LinkPopoverField } from '../../components';
import { LINK_SOURCES_ALL } from '../../shared/link-source-options';
import { RICH_TEXT_EMPHASIS } from '../../utils/rich-text-formats';

export default function Edit( { attributes, setAttributes } ) {
	const { text, linkLabel, linkUrl, linkTarget, linkRel, linkUrlSource } =
		attributes;
	return (
		<div { ...useBlockProps( { className: 'sgs-commerce-note' } ) }>
			<InspectorControls>
				<PanelBody title={ __( 'Link', 'sgs-blocks' ) }>
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
