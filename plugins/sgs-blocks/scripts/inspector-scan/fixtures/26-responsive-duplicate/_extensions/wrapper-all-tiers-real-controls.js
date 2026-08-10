/**
 * MUST NOT FLAG — a wrapper that branches per tier but returns a REAL control
 * on every branch.
 *
 * Branching inside a render prop is legitimate; only a branch that renders
 * static markup instead of a control is the "unmerged original" signature. A
 * rule keyed on "has a tier branch" rather than "that branch has no control"
 * would flag this and be useless.
 */
export default function WrapperAllTiersRealControls( { attributes, setAttributes } ) {
	return (
		<ResponsiveControl label="Columns">
			{ ( breakpoint ) => {
				if ( breakpoint === 'desktop' ) {
					return (
						<RangeControl
							value={ attributes.columns }
							onChange={ ( val ) => setAttributes( { columns: val } ) }
						/>
					);
				}
				const attr = breakpoint === 'tablet' ? 'columnsTablet' : 'columnsMobile';
				return (
					<RangeControl
						value={ attributes[ attr ] }
						onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
					/>
				);
			} }
		</ResponsiveControl>
	);
}
