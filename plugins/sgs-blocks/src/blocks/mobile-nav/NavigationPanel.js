/**
 * Navigation Panel — typography, dividers, and indent for Panel 4.
 *
 * Migrated from legacy blank-box/token SelectControl font controls to the
 * shared TypographyControls component (Bean R-22-13, 2026-06-11).
 * Two prefixes: 'link' (top-level nav links) and 'sublink' (sub-menu items).
 * Line-height is hidden for both — not a meaningful control for nav items.
 *
 * Extracted from edit.js to keep it under 500 lines.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { ToggleControl, RangeControl, Button } from '@wordpress/components';
import TypographyControls from '../../components/TypographyControls';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes   Full block attributes object.
 * @param {Function} props.setAttributes Block setAttributes.
 */
export default function NavigationPanel( { attributes, setAttributes } ) {
	const {
		showDividers,
		submenuIndent,
		submenuIndentMobile,
		submenuIndentTablet,
	} = attributes;

	const [ showIndentResponsive, setShowIndentResponsive ] = useState( false );

	return (
		<>
			<p className="sgs-inspector-label">
				{ __( 'Link typography', 'sgs-blocks' ) }
			</p>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="link"
				showLineHeight={ false }
			/>

			<p className="sgs-inspector-label" style={ { marginTop: '16px' } }>
				{ __( 'Sub-link typography', 'sgs-blocks' ) }
			</p>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="sublink"
				showLineHeight={ false }
			/>

			<ToggleControl
				label={ __( 'Show Dividers Between Links', 'sgs-blocks' ) }
				checked={ showDividers }
				onChange={ ( value ) => setAttributes( { showDividers: value } ) }
			/>
			<RangeControl
				label={ __( 'Sub-menu Indent (px)', 'sgs-blocks' ) }
				help={ __( 'Left padding for sub-menu items.', 'sgs-blocks' ) }
				value={ submenuIndent }
				min={ 0 }
				max={ 48 }
				step={ 4 }
				onChange={ ( value ) => setAttributes( { submenuIndent: value } ) }
			/>
			<Button
				variant="tertiary"
				isSmall
				onClick={ () => setShowIndentResponsive( ( v ) => ! v ) }
				style={ { marginBottom: '8px' } }
			>
				{ showIndentResponsive
					? __( '- Hide responsive overrides', 'sgs-blocks' )
					: __( '+ Responsive indent overrides', 'sgs-blocks' ) }
			</Button>
			{ showIndentResponsive && (
				<>
					<RangeControl
						label={ __( 'Sub-menu Indent — Tablet (px)', 'sgs-blocks' ) }
						help={ __( 'Override below 768px. Leave at 0 to use the base value.', 'sgs-blocks' ) }
						value={ submenuIndentTablet === '' ? 0 : parseInt( submenuIndentTablet, 10 ) }
						min={ 0 }
						max={ 48 }
						step={ 4 }
						onChange={ ( value ) =>
							setAttributes( {
								submenuIndentTablet: value === 0 ? '' : String( value ),
							} )
						}
					/>
					<RangeControl
						label={ __( 'Sub-menu Indent — Mobile (px)', 'sgs-blocks' ) }
						help={ __( 'Override below 480px. Leave at 0 to use the base value.', 'sgs-blocks' ) }
						value={ submenuIndentMobile === '' ? 0 : parseInt( submenuIndentMobile, 10 ) }
						min={ 0 }
						max={ 48 }
						step={ 4 }
						onChange={ ( value ) =>
							setAttributes( {
								submenuIndentMobile: value === 0 ? '' : String( value ),
							} )
						}
					/>
				</>
			) }
		</>
	);
}
