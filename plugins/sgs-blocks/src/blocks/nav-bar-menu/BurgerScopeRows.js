import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { SgsLengthControl } from '../../components';
import {
	ToggleGroupControl,
	ToggleGroupControlOption,
} from '../../components/primitives';
import {
	BURGER_SCOPE_PX,
	burgerScopeOf,
} from '../../shared/nav-menu-panels/utils';

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — the "Show the burger on" rows at the top of the "Menu Button" panel
 * (`BurgerPanel.js`): the scope toggle (`collapsePoint`) and, for Custom, the width below which the links collapse.
 * `showCustomCollapse` is local UI-only state (the stored value is `collapsePoint`).
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.collapsePoint The block's `collapsePoint` attribute.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function BurgerScopeRows( { collapsePoint, setAttributes } ) {
	const [ showCustomCollapse, setShowCustomCollapse ] = useState( false );

	return (
		<>
			<ToggleGroupControl
				label={ __( 'Show the burger on', 'sgs-blocks' ) }
				help={ __(
					'Choose how far up the burger reaches. Always turns this into a burger-only menu on every device — increasingly common on large sites. Below the chosen size the links collapse into the burger; above it they show as a bar.',
					'sgs-blocks'
				) }
				value={ burgerScopeOf( collapsePoint ) }
				isBlock
				__nextHasNoMarginBottom
				onChange={ ( value ) => {
					if ( value === 'custom' ) {
						setAttributes( {
							collapsePoint: collapsePoint || 768,
						} );
						setShowCustomCollapse( true );
						return;
					}
					setShowCustomCollapse( false );
					setAttributes( {
						collapsePoint: BURGER_SCOPE_PX[ value ],
					} );
				} }
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption
					value="always"
					label={ __( 'Always', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="tablet"
					label={ __( 'Tablet', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="mobile"
					label={ __( 'Mobile', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="custom"
					label={ __( 'Custom', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>

			{ ( showCustomCollapse ||
				burgerScopeOf( collapsePoint ) === 'custom' ) && (
				<SgsLengthControl
					label={ __( 'Switch to burger below', 'sgs-blocks' ) }
					value={ `${ collapsePoint }px` }
					units={ [ { value: 'px', label: 'px', default: 768 } ] }
					onChange={ ( val ) => {
						const n = parseInt( val, 10 );
						if ( ! Number.isNaN( n ) && n > 0 ) {
							setAttributes( { collapsePoint: n } );
						}
					} }
					help={ __(
						'Using two of these blocks either side of a logo (a split menu)? Give both instances the same value — a mismatch is harmless, but the two halves will switch to burger at different widths.',
						'sgs-blocks'
					) }
					presets={ false }
				/>
			) }
		</>
	);
}
