import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { IconPicker } from '../../components';

/**
 * SGS Cart — Trigger style + Icon + Badge inspector controls. Split out of
 * edit.js to keep the file under the project's 250-line JS budget.
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.iconName           Current icon name.
 * @param {number}   root0.iconSize           Current icon size (px).
 * @param {boolean}  root0.showZero           Whether the badge shows on a zero count.
 * @param {boolean}  root0.hideWhenEmpty      Whether the whole trigger hides until non-empty.
 * @param {string}   root0.triggerStyle       'icon' (icon+badge) or 'pill' (word+count).
 * @param {string}   root0.pillLabel          The pill trigger's editable word (e.g. "Cart"/"Bag").
 * @param {boolean}  root0.countPopAnimation  Whether the count plays a scale animation on increase.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 */
export default function TriggerSettingsControls( {
	iconName,
	iconSize,
	showZero,
	hideWhenEmpty,
	triggerStyle,
	pillLabel,
	countPopAnimation,
	setAttributes,
} ) {
	const isPill = 'pill' === ( triggerStyle || 'icon' );

	return (
		<>
			<PanelBody title={ __( 'Trigger style', 'sgs-blocks' ) }>
				<SelectControl
					label={ __( 'Trigger shows', 'sgs-blocks' ) }
					help={ __(
						'Icon: the existing icon with a count badge. Text pill: an editable word (e.g. "Cart" or "Bag") with the count beside it, in a pill.',
						'sgs-blocks'
					) }
					value={ triggerStyle || 'icon' }
					options={ [
						{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
						{ label: __( 'Text pill', 'sgs-blocks' ), value: 'pill' },
					] }
					onChange={ ( val ) => setAttributes( { triggerStyle: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ isPill && (
					<TextControl
						label={ __( 'Pill label', 'sgs-blocks' ) }
						value={ pillLabel }
						onChange={ ( val ) => setAttributes( { pillLabel: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
				{ /* Pill border colour + radius moved to the Styles tab's "Pill
				   border" panel (edit.js) — Spec 35 §14 / C1: border colour is
				   excluded from SgsColourPanel; radius sits with it as the pair. */ }
				<ToggleControl
					label={ __( 'Animate count on change', 'sgs-blocks' ) }
					help={ __(
						'A short scale animation on the count when an item is added. Always off when the visitor has requested reduced motion.',
						'sgs-blocks'
					) }
					checked={ !! countPopAnimation }
					onChange={ ( val ) =>
						setAttributes( { countPopAnimation: val } )
					}
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={ __( 'Icon', 'sgs-blocks' ) } initialOpen={ false }>
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
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Badge', 'sgs-blocks' ) }
				initialOpen={ false }
			>
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
