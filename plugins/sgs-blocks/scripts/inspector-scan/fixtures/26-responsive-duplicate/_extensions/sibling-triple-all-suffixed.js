/**
 * MUST FLAG — detection 2, every attribute tier-suffixed.
 *
 * Mirrors image-controls.js:237-281: three hand-written RangeControls plus a
 * separate unit SelectControl, no <ResponsiveControl> anywhere in the file. No
 * attribute carries the bare base name, so a matcher keyed on "a base plus its
 * siblings" would miss this shape entirely.
 */
export default function SiblingTripleAllSuffixed( { attributes, setAttributes } ) {
	const { sgsHeightDesktop, sgsHeightTablet, sgsHeightMobile } = attributes;

	return (
		<>
			<RangeControl
				label="Height — desktop"
				value={ sgsHeightDesktop }
				onChange={ ( val ) => setAttributes( { sgsHeightDesktop: val ?? 0 } ) }
			/>
			<RangeControl
				label="Height — tablet"
				value={ sgsHeightTablet }
				onChange={ ( val ) => setAttributes( { sgsHeightTablet: val ?? 0 } ) }
			/>
			<RangeControl
				label="Height — mobile"
				value={ sgsHeightMobile }
				onChange={ ( val ) => setAttributes( { sgsHeightMobile: val ?? 0 } ) }
			/>
		</>
	);
}
