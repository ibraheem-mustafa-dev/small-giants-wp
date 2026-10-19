/**
 * "Pin to edge" — sgs/container's per-device sticky setting (`pinEdge`;
 * includes/container-pin-edge-css.php).
 *
 * At a device where it is Top or Bottom, the container sticks to that edge of
 * the nearest scrolling area (a drawer, a panel or the page) while the content
 * around it scrolls, and adds the phone's safe-area inset to its padding on
 * that edge. At a device where the pin is Top it also offers "Stop below the
 * site header" (`pinBelowHeader`) and "Gap below the header" (`pinGap`), which
 * keep the pinned container clear of a sticky header. Mounted inside the
 * container's Layout panel.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl } from '@wordpress/components';
import { ResponsiveOverride, SpacingControl } from '../../../components';
import { resolveTier } from '../../../utils/responsive';
import { usePreviewTier } from '../../../utils/usePreviewTier';

const PIN_EDGE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Not pinned', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The control.
 */
export default function PinEdgeControl( { attributes, setAttributes } ) {
	const { pinEdge, pinBelowHeader, pinGap } = attributes;
	const previewTier = usePreviewTier();
	const pinnedToTop =
		'top' === resolveTier( pinEdge, previewTier, 'none' ).value;
	return (
		<>
			<ResponsiveOverride
				label={ __( 'Pin to edge', 'sgs-blocks' ) }
				value={ pinEdge }
				onChange={ ( obj ) => setAttributes( { pinEdge: obj } ) }
			>
				{ ( { ownValue, inherited, setOwnValue } ) => (
					<SelectControl
						value={ ownValue || '' }
						options={ PIN_EDGE_OPTIONS }
						onChange={ ( val ) => setOwnValue( val || undefined ) }
						help={
							inherited
								? __(
										'Default follows the larger device. Top or Bottom keeps this container at that edge of the scrolling area (a drawer or the page) while the rest scrolls.',
										'sgs-blocks'
								  )
								: __(
										'Top or Bottom keeps this container at that edge of the scrolling area (a drawer or the page) while the rest scrolls, with room for the phone’s home bar.',
										'sgs-blocks'
								  )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
			{ pinnedToTop && (
				<ResponsiveOverride
					value={ pinBelowHeader }
					onChange={ ( obj ) =>
						setAttributes( { pinBelowHeader: obj } )
					}
				>
					{ ( { ownValue, effectiveValue, setOwnValue } ) => (
						<ToggleControl
							label={ __(
								'Stop below the site header',
								'sgs-blocks'
							) }
							help={ __(
								'Keeps the pinned column clear of a sticky header instead of sliding under it. Ignored inside drawers and pop-ups.',
								'sgs-blocks'
							) }
							checked={ 'on' === ( ownValue || effectiveValue ) }
							onChange={ ( checked ) =>
								setOwnValue( checked ? 'on' : 'off' )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveOverride>
			) }
			{ pinnedToTop &&
				'on' ===
					resolveTier( pinBelowHeader, previewTier, 'off' ).value && (
					<ResponsiveOverride
						label={ __( 'Gap below the header', 'sgs-blocks' ) }
						value={ pinGap }
						onChange={ ( obj ) => setAttributes( { pinGap: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<>
								<SpacingControl
									custom
									label={ __(
										'Gap below the header',
										'sgs-blocks'
									) }
									hideLabelFromVision
									value={ ownValue }
									onChange={ ( value ) =>
										setOwnValue( value || undefined )
									}
								/>
								<p className="components-base-control__help">
									{ __(
										'Space between the header and the pinned column.',
										'sgs-blocks'
									) }
								</p>
							</>
						) }
					</ResponsiveOverride>
				) }
		</>
	);
}
