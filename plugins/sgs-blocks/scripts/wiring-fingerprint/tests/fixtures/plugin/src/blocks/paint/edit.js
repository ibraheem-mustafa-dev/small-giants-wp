import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.gapUnit } onChange={ ( v ) => setAttributes( { gapUnit: v } ) } />
					<TextControl value={ attributes.titleText } onChange={ ( v ) => setAttributes( { titleText: v } ) } />
					<TextControl value={ attributes.boxRadius } onChange={ ( v ) => setAttributes( { boxRadius: v } ) } />
					<TextControl value={ attributes.fxTrigger } onChange={ ( v ) => setAttributes( { fxTrigger: v } ) } />
					<TextControl value={ attributes.layoutMode } onChange={ ( v ) => setAttributes( { layoutMode: v } ) } />
					<TextControl value={ attributes.autoplay } onChange={ ( v ) => setAttributes( { autoplay: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { className: 'sgs-paint--' + attributes.layoutMode, style: { borderRadius: attributes.boxRadius } } ) }>{ attributes.titleText }</div>
		</>
	);
}
