import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	RangeControl,
	SelectControl,
	CheckboxControl,
	ColorPalette,
	UnitControl,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { a, b, c, d, e, f, g } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Everything">
				<TextControl label="A" value={ a } onChange={ ( v ) => setAttributes( { a: v } ) } />
				<ToggleControl label="B" checked={ b } onChange={ ( v ) => setAttributes( { b: v } ) } />
				<RangeControl label="C" value={ c } onChange={ ( v ) => setAttributes( { c: v } ) } />
				<SelectControl label="D" value={ d } options={ [] } onChange={ ( v ) => setAttributes( { d: v } ) } />
				<CheckboxControl label="E" checked={ e } onChange={ ( v ) => setAttributes( { e: v } ) } />
				<ColorPalette value={ f } onChange={ ( v ) => setAttributes( { f: v } ) } />
				<UnitControl label="G" value={ g } onChange={ ( v ) => setAttributes( { g: v } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
