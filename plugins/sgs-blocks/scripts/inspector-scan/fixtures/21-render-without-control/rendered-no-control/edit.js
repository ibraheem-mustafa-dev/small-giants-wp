/**
 * PLANTED DEFECT: `shadowHover` is painted by render.php (see this fixture's
 * render.php) but the inspector below offers no way to set it. This is the
 * fourth quadrant — declared + rendered + NO CONTROL.
 *
 * `headingText` is the negative control inside the same fixture: it is both
 * rendered and controlled, so only ONE finding may come out of this block.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Heading"
					value={ attributes.headingText }
					onChange={ ( v ) => setAttributes( { headingText: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
