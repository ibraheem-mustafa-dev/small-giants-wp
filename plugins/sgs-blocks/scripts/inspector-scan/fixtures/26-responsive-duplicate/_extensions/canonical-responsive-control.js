/**
 * MUST NOT FLAG — the canonical shape (contract §12 field 1).
 *
 * One control inside the wrapper, tier written via a COMPUTED key. This is the
 * shape every merge in Phase 1.4 converges on, so a rule that flagged it would
 * flag its own remedy and could never reach zero.
 */
export default function CanonicalResponsiveControl( { attributes, setAttributes } ) {
	const attrMap = {
		desktop: 'gap',
		tablet: 'gapTablet',
		mobile: 'gapMobile',
	};

	return (
		<ResponsiveControl label="Gap">
			{ ( breakpoint ) => (
				<UnitControl
					value={ attributes[ attrMap[ breakpoint ] ] || '' }
					onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val ?? '' } ) }
				/>
			) }
		</ResponsiveControl>
	);
}
