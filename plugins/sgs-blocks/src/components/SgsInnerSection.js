/**
 * SgsInnerSection: a light collapsible section inside a panel.
 *
 * A `PanelBody` with the `sgs-inner-section` class (no card border, no side padding, a small title; the styles live in
 * `assets/css/inspector-controls.css`), collapsed by default and always closed on first select. One level deep only: a
 * panel holds inner sections, an inner section holds controls. A second level warns here at run time, and
 * `scripts/check-inner-section-depth.js` refuses a `PanelBody` three deep in the source.
 *
 * Props: `title` (string), `children`, optional `hasValue` (a small bar beside the title says the closed section holds a
 * value) and `className`.
 *
 * Usage:
 *   <PanelBody title="Background">
 *     <SgsInnerSection title={ __( 'Extra SVG layer', 'sgs-blocks' ) } hasValue={ !! attributes.bgSvgContent }>
 *       ...controls
 *     </SgsInnerSection>
 *   </PanelBody>
 */
import { createContext, useContext } from '@wordpress/element';
import { PanelBody } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/** How many inner sections enclose the current one. */
const InnerSectionDepth = createContext( 0 );

export default function SgsInnerSection( {
	title,
	children,
	hasValue = false,
	className = '',
} ) {
	const depth = useContext( InnerSectionDepth );
	if ( depth >= 1 && 'production' !== process.env.NODE_ENV ) {
		// eslint-disable-next-line no-console
		console.warn(
			`SgsInnerSection "${ title }" is inside another inner section: a panel holds inner sections one level deep.`
		);
	}
	const heading = hasValue ? (
		<span className="sgs-inner-section__title">
			{ title }
			<span
				role="img"
				className="sgs-inner-section__value-mark"
				aria-label={ sprintf(
					/* translators: %s: the section's title. */
					__( '%s has a value', 'sgs-blocks' ),
					title
				) }
			/>
		</span>
	) : (
		title
	);
	return (
		<InnerSectionDepth.Provider value={ depth + 1 }>
			<PanelBody
				title={ heading }
				initialOpen={ false }
				className={ `sgs-inner-section${
					className ? ` ${ className }` : ''
				}` }
			>
				{ children }
			</PanelBody>
		</InnerSectionDepth.Provider>
	);
}
