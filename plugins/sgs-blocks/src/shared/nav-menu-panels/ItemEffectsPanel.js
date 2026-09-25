import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { MotionEasingControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const LABEL_ROLL_OPTIONS = [
	{ value: 'off', label: __( 'Off', 'sgs-blocks' ) },
	{ value: 'up', label: __( 'Roll up', 'sgs-blocks' ) },
	{ value: 'up-scale', label: __( 'Roll + shrink', 'sgs-blocks' ) },
];

/**
 * "Item effects" PanelBody, shared by sgs/nav-drawer-menu, sgs/nav-bar-menu
 * and sgs/icon-list (Wave 3C U-6; design
 * `.claude/reports/2026-09-25-u6-u7-design.md` 3c, 3d).
 *
 * - Sibling dim (M-24): the OTHER items in a list fade while one is hovered
 *   or keyboard-focused. The dim colour is a row in the block's Colour panel;
 *   the opacity lives here. Not on the bar (no reference dims bar items).
 * - Label roll (M-25): the label rolls to a copy of itself on hover.
 * - One motion time and curve for every item effect of the block.
 *
 * @param {Object}   root0                        Props.
 * @param {boolean}  root0.showDim                Show the sibling-dim opacity control.
 * @param {number}   root0.siblingDimOpacity      `siblingDimOpacity`.
 * @param {string}   root0.labelRoll              `labelRoll`.
 * @param {number}   root0.itemMotionDuration     `itemMotionDuration`.
 * @param {string}   root0.itemMotionEasing       `itemMotionEasing`.
 * @param {string}   root0.itemMotionEasingCustom `itemMotionEasingCustom`.
 * @param {Function} root0.setAttributes          The block's attribute setter.
 */
export default function ItemEffectsPanel( {
	showDim = true,
	siblingDimOpacity,
	labelRoll,
	itemMotionDuration,
	itemMotionEasing,
	itemMotionEasingCustom,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Item effects', 'sgs-blocks' ) } initialOpen={ false }>
			{ showDim && (
				<RangeControl
					label={ __( 'Dim other items (opacity)', 'sgs-blocks' ) }
					help={ __(
						'While one item is hovered or focused, the others in the same list fade to this opacity. Set a dim colour in the Colour panel for a colour change instead.',
						'sgs-blocks'
					) }
					value={ typeof siblingDimOpacity === 'number' ? siblingDimOpacity : undefined }
					min={ 0 }
					max={ 1 }
					step={ 0.05 }
					onChange={ ( val ) =>
						setAttributes( { siblingDimOpacity: typeof val === 'number' ? val : undefined } )
					}
					allowReset
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			<ToggleGroupControl
				label={ __( 'Label roll', 'sgs-blocks' ) }
				help={ __(
					'On hover the label rolls up to a copy of itself. Honours reduced motion.',
					'sgs-blocks'
				) }
				value={ labelRoll || 'off' }
				onChange={ ( val ) => setAttributes( { labelRoll: val && 'off' !== val ? val : '' } ) }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				{ LABEL_ROLL_OPTIONS.map( ( option ) => (
					<ToggleGroupControlOption
						key={ option.value }
						value={ option.value }
						label={ option.label }
					/>
				) ) }
			</ToggleGroupControl>

			<RangeControl
				label={ __( 'Effect speed', 'sgs-blocks' ) }
				help={ __( 'Milliseconds, for every item effect on this block.', 'sgs-blocks' ) }
				value={ typeof itemMotionDuration === 'number' ? itemMotionDuration : 300 }
				min={ 0 }
				max={ 3000 }
				step={ 10 }
				onChange={ ( val ) =>
					setAttributes( { itemMotionDuration: typeof val === 'number' ? val : undefined } )
				}
				allowReset
				resetFallbackValue={ 300 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<MotionEasingControl
				label={ __( 'Effect easing', 'sgs-blocks' ) }
				value={ itemMotionEasing }
				custom={ itemMotionEasingCustom }
				onChange={ ( val ) => setAttributes( { itemMotionEasing: val } ) }
				onCustomChange={ ( val ) => setAttributes( { itemMotionEasingCustom: val } ) }
			/>
		</PanelBody>
	);
}
