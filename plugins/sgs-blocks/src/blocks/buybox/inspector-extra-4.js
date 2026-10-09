import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { NumberControl, ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { SpacingControl } from '../../components';

/**
 * Settings-tab (default InspectorControls group) extra panels for
 * sgs/buybox, size-band tiles (F1), a picker-label link
 * (F2), the gallery saving badge (F6), and the variation-photo swatch toggle
 * (F9). Split from inspector-extra.js/-2.js/-3.js — all already at or past
 * this block's 250-line JS budget.
 *
 * @param {Object}   o
 * @param {Object}   o.attributes    The block's attributes.
 * @param {Function} o.setAttributes The block's setAttributes.
 * @return {JSX.Element} PanelBody sections for the default InspectorControls group.
 */
export function BuyboxExtraSettingsPanels3( { attributes, setAttributes } ) {
	const {
		pickerAlwaysShowAxes,
		pickerBandAxis,
		pickerBandScale,
		pickerLabelLinkAxis,
		pickerLabelLinkText,
		pickerLabelLinkUrl,
		pickerVariationSwatch,
		gallerySavingBadge,
		gallerySavingBadgeFormat,
		gallerySavingBadgePosition,
		galleryColumnRatio,
		galleryColumnGap,
	} = attributes;

	return (
		<>
			<PanelBody
				title={ __( 'Size band tiles', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'Always-show axes', 'sgs-blocks' ) }
					value={ ( pickerAlwaysShowAxes || [] ).join( ', ' ) }
					onChange={ ( val ) =>
						setAttributes( {
							pickerAlwaysShowAxes: val
								.split( ',' )
								.map( ( s ) => s.trim() )
								.filter( Boolean ),
						} )
					}
					placeholder="pa_frame-size"
					help={ __(
						'Comma-separated taxonomy slugs. These axes show their picker even with only one choice (a one-size frame still shows its single tile).',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TextControl
					label={ __( 'Band axis', 'sgs-blocks' ) }
					value={ pickerBandAxis || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerBandAxis: val } )
					}
					placeholder="pa_frame-size"
					help={ __(
						'The taxonomy slug of the axis whose tiles show a band letter instead of the raw term name. Empty = off.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TextControl
					label={ __( 'Band scale', 'sgs-blocks' ) }
					value={ pickerBandScale || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerBandScale: val } )
					}
					placeholder="S:52,M:57,L"
					help={ __(
						'Ordered "Label:max" pairs, comma-separated. The last entry may drop ":max" for an open-ended top band. Two of this product’s own sizes sharing a band show the letter plus the number ("M 53", "M 56").',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Picker label link', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextControl
					label={ __( 'Axis', 'sgs-blocks' ) }
					value={ pickerLabelLinkAxis || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerLabelLinkAxis: val } )
					}
					placeholder="pa_frame-size"
					help={ __(
						'The taxonomy slug of the ONE axis whose label gets a text link at its right (e.g. "Which size am I?" beside Size). Empty = no link.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TextControl
					label={ __( 'Link text', 'sgs-blocks' ) }
					value={ pickerLabelLinkText || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerLabelLinkText: val } )
					}
					placeholder={ __( 'Which size am I?', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<TextControl
					label={ __( 'Link URL', 'sgs-blocks' ) }
					value={ pickerLabelLinkUrl || '' }
					onChange={ ( val ) =>
						setAttributes( { pickerLabelLinkUrl: val } )
					}
					placeholder="#size-guide"
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Colour tiles', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __(
						'Show each variation’s own photo as its tile',
						'sgs-blocks'
					) }
					checked={ !! pickerVariationSwatch }
					onChange={ ( val ) =>
						setAttributes( { pickerVariationSwatch: val } )
					}
					help={ __(
						'Shows the variation’s own photo when it has one — otherwise the colour/image tile.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody
				title={ __( 'Gallery saving badge', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __(
						'Show a saving badge on the main photo',
						'sgs-blocks'
					) }
					checked={ !! gallerySavingBadge }
					onChange={ ( val ) =>
						setAttributes( { gallerySavingBadge: val } )
					}
					help={ __(
						'Hidden automatically when there is no genuine saving.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
				/>
				{ !! gallerySavingBadge && (
					<>
						<TextControl
							label={ __( 'Badge text', 'sgs-blocks' ) }
							value={ gallerySavingBadgeFormat || '' }
							onChange={ ( val ) =>
								setAttributes( {
									gallerySavingBadgeFormat: val,
								} )
							}
							placeholder={ __(
								'Save {amount} off RRP',
								'sgs-blocks'
							) }
							help={ __(
								'{amount} is replaced with the formatted saving, e.g. "£51".',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<ToggleGroupControl
							label={ __( 'Position', 'sgs-blocks' ) }
							value={ gallerySavingBadgePosition || 'top-right' }
							onChange={ ( val ) =>
								setAttributes( {
									gallerySavingBadgePosition: val,
								} )
							}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption value="top-right" label={ __( 'Top right', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="top-left" label={ __( 'Top left', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="bottom-right" label={ __( 'Bottom right', 'sgs-blocks' ) } />
							<ToggleGroupControlOption value="bottom-left" label={ __( 'Bottom left', 'sgs-blocks' ) } />
						</ToggleGroupControl>
					</>
				) }
			</PanelBody>

			<PanelBody
				title={ __( 'Gallery column width', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<NumberControl
					label={ __( 'Gallery column ratio', 'sgs-blocks' ) }
					value={ galleryColumnRatio || '' }
					step={ 0.001 }
					min={ 0 }
					onChange={ ( val ) =>
						setAttributes( { galleryColumnRatio: parseFloat( val ) || 0 } )
					}
					placeholder="1.15"
					help={ __(
						'The gallery column’s share against the configurator column’s fixed 1fr, e.g. 1.353. Empty keeps today’s 1.15.',
						'sgs-blocks'
					) }
					__unstableInputWidth="100%"
					__next40pxDefaultSize
				/>
				<SpacingControl
					custom
					label={ __( 'Gap between columns', 'sgs-blocks' ) }
					value={ galleryColumnGap || '' }
					onChange={ ( val ) =>
						setAttributes( { galleryColumnGap: val ?? '' } )
					}
				/>
				<p className="components-base-control__help">
					{ __(
						"None keeps today's clamp(1.5rem, 4vw, 3rem). Applies only where the two columns sit side by side (see Layout → Where the columns stack).",
						'sgs-blocks'
					) }
				</p>
			</PanelBody>
		</>
	);
}
