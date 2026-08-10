/**
 * MUST FLAG — detection 1, ternary form.
 *
 * Same defect as hollow-desktop-tier, written as a conditional expression
 * instead of an `if`. Present because a matcher that only walks IfStatement
 * would go green on a refactor that changed nothing about the defect — the
 * "same failure, different syntax" gap a QC council found in rule 25 on
 * 2026-08-10 (the array-mapped switcher idiom).
 */
export default function HollowTierTernary( { attributes, setAttributes } ) {
	return (
		<ResponsiveControl label="Content band width by viewport">
			{ ( bp ) =>
				bp === 'desktop' ? (
					<span className="sgs-inspector-help">Desktop content band width is set above.</span>
				) : (
					<UnitControl
						value={ attributes[ `contentWidth${ bp }` ] || '' }
						onChange={ ( val ) => setAttributes( { [ `contentWidth${ bp }` ]: val ?? '' } ) }
					/>
				)
			}
		</ResponsiveControl>
	);
}
