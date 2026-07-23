import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { DesignTokenPicker, IconPicker } from '../../components';

/**
 * SGS Cart — Icon + Badge inspector controls. Split out of edit.js to keep
 * the file under the project's 250-line JS budget.
 *
 * @param {Object}   root0                 Props.
 * @param {string}   root0.iconName        Current icon name.
 * @param {number}   root0.iconSize        Current icon size (px).
 * @param {string}   root0.iconColour      Icon colour token.
 * @param {string}   root0.badgeColour     Badge background colour token.
 * @param {string}   root0.badgeTextColour Badge text colour token.
 * @param {boolean}  root0.showZero        Whether the badge shows on a zero count.
 * @param {boolean}  root0.hideWhenEmpty   Whether the whole trigger hides until non-empty.
 * @param {Function} root0.setAttributes   The block's attribute setter.
 */
export default function TriggerSettingsControls( {
	iconName,
	iconSize,
	iconColour,
	badgeColour,
	badgeTextColour,
	showZero,
	hideWhenEmpty,
	setAttributes,
} ) {
	return (
		<>
			<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
				<IconPicker
					label={ __( 'Cart icon', 'sgs-blocks' ) }
					value={ { source: 'lucide', name: iconName } }
					onChange={ ( { name } ) =>
						setAttributes( { iconName: name } )
					}
				/>
				<RangeControl
					label={ __( 'Icon size (px)', 'sgs-blocks' ) }
					value={ iconSize }
					onChange={ ( val ) => setAttributes( { iconSize: val } ) }
					min={ 16 }
					max={ 64 }
					step={ 4 }
					__nextHasNoMarginBottom
				/>
				<DesignTokenPicker
					label={ __( 'Icon colour', 'sgs-blocks' ) }
					value={ iconColour }
					onChange={ ( val ) => setAttributes( { iconColour: val } ) }
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Badge', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<DesignTokenPicker
					label={ __( 'Badge background', 'sgs-blocks' ) }
					value={ badgeColour }
					onChange={ ( val ) =>
						setAttributes( { badgeColour: val } )
					}
				/>
				<DesignTokenPicker
					label={ __( 'Badge text colour', 'sgs-blocks' ) }
					value={ badgeTextColour }
					onChange={ ( val ) =>
						setAttributes( { badgeTextColour: val } )
					}
				/>
				<ToggleControl
					label={ __(
						'Show badge when cart is empty',
						'sgs-blocks'
					) }
					help={ __(
						'When off, the badge hides until there is at least one item in the cart.',
						'sgs-blocks'
					) }
					checked={ showZero }
					onChange={ ( val ) => setAttributes( { showZero: val } ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Hide cart until it has items', 'sgs-blocks' ) }
					help={ __(
						'When on, the cart icon is hidden entirely until at least one item is in the cart.',
						'sgs-blocks'
					) }
					checked={ hideWhenEmpty }
					onChange={ ( val ) =>
						setAttributes( { hideWhenEmpty: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</>
	);
}
