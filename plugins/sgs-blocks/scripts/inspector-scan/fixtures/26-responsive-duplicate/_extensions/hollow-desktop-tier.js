/**
 * MUST FLAG — detection 1, `if` form.
 *
 * Mirrors ContainerWrapperControls.js:276-307 ("Outer max-width" +
 * "Outer max-width by viewport"): a non-responsive original still owns desktop,
 * so the responsive wrapper added beside it has a hole where the desktop
 * control should be and returns help text instead.
 */
export default function HollowDesktopTier( { attributes, setAttributes } ) {
	const { maxWidth } = attributes;

	return (
		<>
			<UnitControl
				label="Outer max-width"
				value={ maxWidth || '' }
				onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
			/>
			<ResponsiveControl label="Outer max-width by viewport">
				{ ( breakpoint ) => {
					if ( breakpoint === 'desktop' ) {
						return <p className="sgs-inspector-help">Desktop max-width is set above.</p>;
					}
					const attrMap = { tablet: 'maxWidthTablet', mobile: 'maxWidthMobile' };
					return (
						<UnitControl
							value={ attributes[ attrMap[ breakpoint ] ] || '' }
							onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val ?? '' } ) }
						/>
					);
				} }
			</ResponsiveControl>
		</>
	);
}
