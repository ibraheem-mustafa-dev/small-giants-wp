/**
 * MUST FLAG — detection 2, bare base + two tier siblings.
 *
 * Mirrors ContainerWrapperControls.js:1483-1511 (minHeight ×3 over a closed
 * option list). Deliberately placed under `<block>/components/` rather than
 * `_extensions/` so the self-test exercises BOTH corpus roots — a rule that
 * only ever reads one of its two roots would still pass a single-root fixture
 * set while being blind to half the files it claims to cover.
 */
export default function SiblingTripleBareBase( { attributes, setAttributes } ) {
	return (
		<PanelBody title="Section (outer)">
			<SelectControl
				label="Min height"
				value={ attributes.minHeight || '' }
				options={ MIN_HEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { minHeight: val } ) }
			/>
			<SelectControl
				label="Min height (tablet)"
				value={ attributes.minHeightTablet || '' }
				options={ MIN_HEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { minHeightTablet: val } ) }
			/>
			<SelectControl
				label="Min height (mobile)"
				value={ attributes.minHeightMobile || '' }
				options={ MIN_HEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { minHeightMobile: val } ) }
			/>
		</PanelBody>
	);
}
