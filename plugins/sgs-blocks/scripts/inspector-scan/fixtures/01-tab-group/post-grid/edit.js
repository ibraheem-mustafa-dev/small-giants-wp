import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl } from '@wordpress/components';

// POSITIVE EXEMPTION CASE (2026-09-03): folder name matches the REAL block
// slug 'sgs/post-grid' so rule 01's DB lookup resolves against real,
// already-verified sgs-framework.db rows -- 'layout' has no css_property/
// box_family and is string-typed (structural variant picker, no CSS form),
// while 'columns'/'aspectRatio' are real CSS in the SAME "Layout" panel. The
// second "Card Style" panel is anchored by 'cardStyle' (also structural, no
// css_property). Neither panel carries a group prop. Under the OLD rule
// (panelCount>=2, no group prop anywhere) this would flag; under the NEW
// mixed-panel exemption BOTH panels are exempt (each carries a structural
// anchor), so requiredPanelCount drops to 0 and this must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	const { layout, columns, aspectRatio, cardStyle } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Layout" initialOpen={ true }>
				<SelectControl
					label="Layout"
					value={ layout }
					options={ [
						{ label: 'Grid', value: 'grid' },
						{ label: 'List', value: 'list' },
						{ label: 'Masonry', value: 'masonry' },
					] }
					onChange={ ( value ) => setAttributes( { layout: value } ) }
				/>
				<RangeControl
					label="Columns"
					value={ columns }
					onChange={ ( value ) => setAttributes( { columns: value } ) }
					min={ 1 }
					max={ 6 }
				/>
				<SelectControl
					label="Aspect ratio"
					value={ aspectRatio }
					options={ [
						{ label: 'Auto', value: '' },
						{ label: '16:9', value: '16/9' },
						{ label: '1:1', value: '1/1' },
					] }
					onChange={ ( value ) => setAttributes( { aspectRatio: value } ) }
				/>
			</PanelBody>
			<PanelBody title="Card Style" initialOpen={ false }>
				<SelectControl
					label="Card style"
					value={ cardStyle }
					options={ [
						{ label: 'Default', value: 'default' },
						{ label: 'Minimal', value: 'minimal' },
					] }
					onChange={ ( value ) => setAttributes( { cardStyle: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
