/**
 * "Menu button reach" panel — Wave 3C U-14.
 *
 * - `triggerSurface` (M-39, DEC-14 as amended): the whole header row opens the
 *   menu (includes/nav-trigger-surface-css.php).
 * - The `triggerDetach*` set (M-08): once the header's burger scrolls off
 *   screen it comes back as a fixed chip (includes/nav-detach-chip.php,
 *   src/shared/nav-interactivity/detach-chip.js). The chip's fill is a row in
 *   the block's colour panel (edit.js `colourRows`, "Detached button").
 *
 * Every per-device value goes through ResponsiveTriStateControl or
 * ResponsiveOverride under the global device toggle (R-31-9).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import {
	ResponsiveOverride,
	ResponsiveTriStateControl,
	SgsLengthControl,
} from '../../components';
import { resolveTier } from '../../utils';

/**
 * Whether a tri-state tier object is on at any tier.
 *
 * @param {Object} raw Tier object.
 * @return {boolean} On anywhere.
 */
function onAnywhere( raw ) {
	return [ 'desktop', 'tablet', 'mobile' ].some(
		( tier ) => 'on' === resolveTier( raw, tier, 'off' ).value
	);
}

/**
 * @param {Object}   props            Props.
 * @param {Object}   props.attributes Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The panel.
 */
export default function ButtonReachPanel( { attributes, setAttributes } ) {
	const {
		triggerSurface,
		triggerDetach,
		triggerDetachAfter,
		triggerDetachSize,
		triggerDetachOffset,
		triggerDetachRadius,
		triggerDetachZIndex,
	} = attributes;
	const detachOn = onAnywhere( triggerDetach );

	return (
		<PanelBody
			title={ __( 'Menu button reach', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ResponsiveTriStateControl
				label={ __( 'Whole row opens the menu', 'sgs-blocks' ) }
				help={ __(
					'While the menu shows its button, a click anywhere on the header row opens it. Other blocks in the row keep their own clicks.',
					'sgs-blocks'
				) }
				value={ triggerSurface }
				onChange={ ( value ) =>
					setAttributes( { triggerSurface: value } )
				}
				defaultValue="off"
			/>

			<ResponsiveTriStateControl
				label={ __( 'Detach when the header scrolls away', 'sgs-blocks' ) }
				help={ __(
					'Once the menu button scrolls off screen it comes back as a round button pinned to the top corner. A header that stays pinned never needs it.',
					'sgs-blocks'
				) }
				value={ triggerDetach }
				onChange={ ( value ) => setAttributes( { triggerDetach: value } ) }
				defaultValue="off"
			/>

			{ detachOn && (
				<>
					<ResponsiveOverride
						label={ __( 'Wait until scrolled', 'sgs-blocks' ) }
						value={ triggerDetachAfter }
						onChange={ ( obj ) =>
							setAttributes( { triggerDetachAfter: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<RangeControl
								label={ __( 'Wait until scrolled (px)', 'sgs-blocks' ) }
								help={ __(
									'0 shows it as soon as the header button leaves the screen.',
									'sgs-blocks'
								) }
								min={ 0 }
								max={ 2000 }
								step={ 10 }
								value={ ownValue ?? effectiveValue ?? 0 }
								onChange={ ( value ) => setOwnValue( value ?? undefined ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<ResponsiveOverride
						label={ __( 'Button size', 'sgs-blocks' ) }
						value={ triggerDetachSize }
						onChange={ ( obj ) =>
							setAttributes( { triggerDetachSize: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<RangeControl
								label={ __( 'Button size (px)', 'sgs-blocks' ) }
								min={ 44 }
								max={ 120 }
								value={ ownValue ?? effectiveValue ?? 56 }
								onChange={ ( value ) => setOwnValue( value ?? undefined ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>

					<ResponsiveOverride
						label={ __( 'Distance from the corner', 'sgs-blocks' ) }
						value={ triggerDetachOffset }
						onChange={ ( obj ) =>
							setAttributes( { triggerDetachOffset: obj } )
						}
					>
						{ ( { ownValue, effectiveValue, setOwnValue } ) => (
							<>
								<RangeControl
									label={ __( 'From the side (px)', 'sgs-blocks' ) }
									min={ 0 }
									max={ 120 }
									value={ ownValue?.x ?? effectiveValue?.x ?? 20 }
									onChange={ ( value ) =>
										setOwnValue( { ...( ownValue || {} ), x: value ?? 20 } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								<RangeControl
									label={ __( 'From the top (px)', 'sgs-blocks' ) }
									min={ 0 }
									max={ 120 }
									value={ ownValue?.y ?? effectiveValue?.y ?? 20 }
									onChange={ ( value ) =>
										setOwnValue( { ...( ownValue || {} ), y: value ?? 20 } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</>
						) }
					</ResponsiveOverride>

					<SgsLengthControl
						label={ __( 'Corner radius', 'sgs-blocks' ) }
						value={ triggerDetachRadius }
						onChange={ ( value ) =>
							setAttributes( { triggerDetachRadius: value || '9999px' } )
						}
					/>

					<RangeControl
						label={ __( 'Stacking order', 'sgs-blocks' ) }
						help={ __(
							'Keep it above the header’s own stacking order (100 by default).',
							'sgs-blocks'
						) }
						min={ 0 }
						max={ 10000 }
						value={ triggerDetachZIndex ?? 110 }
						onChange={ ( value ) =>
							setAttributes( { triggerDetachZIndex: value ?? 110 } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}
