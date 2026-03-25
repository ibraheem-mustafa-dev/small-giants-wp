/**
 * SGS Mobile Navigation — editor component.
 *
 * Shows a placeholder card in the editor (the actual drawer renders on the
 * frontend via render.php). Inspector controls let users configure variant,
 * colours, CTA, socials, and advanced features.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	TextControl,
	RangeControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

const VARIANT_OPTIONS = [
	{ label: __( 'Full-Screen Overlay', 'sgs-blocks' ), value: 'overlay' },
	{ label: __( 'Slide from Left', 'sgs-blocks' ), value: 'slide-left' },
	{ label: __( 'Slide from Right', 'sgs-blocks' ), value: 'slide-right' },
	{ label: __( 'Bottom Sheet', 'sgs-blocks' ), value: 'bottom-sheet' },
];

const SOCIAL_STYLE_OPTIONS = [
	{ label: __( 'Coloured Circles', 'sgs-blocks' ), value: 'coloured' },
	{ label: __( 'Plain Icons', 'sgs-blocks' ), value: 'plain' },
	{ label: __( 'Outline Circles', 'sgs-blocks' ), value: 'outline' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		accentColour,
		dividerColour,
		showCta,
		ctaText,
		ctaUrl,
		showContactIcons,
		showSocials,
		socialStyle,
		showSearch,
		showAccountTray,
		enableSwipe,
		desktopHamburger,
		staggerDelay,
		breakpoint,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-mobile-nav-editor',
	} );

	return (
		<>
			<InspectorControls>
				{ /* ── Layout ── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Drawer Style', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( { variant: value } )
						}
					/>
					<NumberControl
						label={ __( 'Breakpoint (px)', 'sgs-blocks' ) }
						value={ breakpoint }
						min={ 480 }
						max={ 1440 }
						step={ 1 }
						onChange={ ( value ) =>
							setAttributes( {
								breakpoint: parseInt( value, 10 ) || 1024,
							} )
						}
					/>
				</PanelBody>

				{ /* ── Colours ── */ }
				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Accent Colour', 'sgs-blocks' ) }
						value={ accentColour }
						onChange={ ( value ) =>
							setAttributes( { accentColour: value } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Divider Colour', 'sgs-blocks' ) }
						value={ dividerColour }
						onChange={ ( value ) =>
							setAttributes( { dividerColour: value } )
						}
					/>
				</PanelBody>

				{ /* ── CTA Section ── */ }
				<PanelBody
					title={ __( 'Call to Action', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show CTA Button', 'sgs-blocks' ) }
						checked={ showCta }
						onChange={ ( value ) =>
							setAttributes( { showCta: value } )
						}
					/>
					{ showCta && (
						<>
							<TextControl
								label={ __( 'CTA Text', 'sgs-blocks' ) }
								value={ ctaText }
								placeholder={ __(
									'Apply Now',
									'sgs-blocks'
								) }
								onChange={ ( value ) =>
									setAttributes( { ctaText: value } )
								}
							/>
							<TextControl
								label={ __( 'CTA URL', 'sgs-blocks' ) }
								value={ ctaUrl }
								placeholder="/apply-for-trade-account/"
								onChange={ ( value ) =>
									setAttributes( { ctaUrl: value } )
								}
							/>
							<ToggleControl
								label={ __(
									'Show Contact Icons',
									'sgs-blocks'
								) }
								help={ __(
									'Phone and email from Business Details',
									'sgs-blocks'
								) }
								checked={ showContactIcons }
								onChange={ ( value ) =>
									setAttributes( {
										showContactIcons: value,
									} )
								}
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Social Icons ── */ }
				<PanelBody
					title={ __( 'Social Icons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show Social Links', 'sgs-blocks' ) }
						help={ __(
							'URLs from Business Details settings',
							'sgs-blocks'
						) }
						checked={ showSocials }
						onChange={ ( value ) =>
							setAttributes( { showSocials: value } )
						}
					/>
					{ showSocials && (
						<SelectControl
							label={ __( 'Icon Style', 'sgs-blocks' ) }
							value={ socialStyle }
							options={ SOCIAL_STYLE_OPTIONS }
							onChange={ ( value ) =>
								setAttributes( { socialStyle: value } )
							}
						/>
					) }
				</PanelBody>

				{ /* ── Advanced Features ── */ }
				<PanelBody
					title={ __( 'Advanced', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Desktop Hamburger Mode',
							'sgs-blocks'
						) }
						help={ __(
							'Show the hamburger menu on all screen sizes, replacing the desktop navigation bar',
							'sgs-blocks'
						) }
						checked={ desktopHamburger }
						onChange={ ( value ) =>
							setAttributes( { desktopHamburger: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Search Bar', 'sgs-blocks' ) }
						checked={ showSearch }
						onChange={ ( value ) =>
							setAttributes( { showSearch: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Account Tray (B2B)', 'sgs-blocks' ) }
						help={ __(
							'Shows greeting and account link for logged-in users',
							'sgs-blocks'
						) }
						checked={ showAccountTray }
						onChange={ ( value ) =>
							setAttributes( { showAccountTray: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Swipe to Close', 'sgs-blocks' ) }
						checked={ enableSwipe }
						onChange={ ( value ) =>
							setAttributes( { enableSwipe: value } )
						}
					/>
					<RangeControl
						label={ __( 'Stagger Delay (ms)', 'sgs-blocks' ) }
						help={ __(
							'Time between each menu item appearing. 0 = instant.',
							'sgs-blocks'
						) }
						value={ staggerDelay }
						min={ 0 }
						max={ 120 }
						step={ 10 }
						onChange={ ( value ) =>
							setAttributes( { staggerDelay: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-mobile-nav-editor__card">
					<div className="sgs-mobile-nav-editor__icon">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 6h18M3 12h18M3 18h18"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>
					<div className="sgs-mobile-nav-editor__info">
						<strong>
							{ __( 'Mobile Navigation', 'sgs-blocks' ) }
						</strong>
						<span className="sgs-mobile-nav-editor__variant">
							{ VARIANT_OPTIONS.find(
								( o ) => o.value === variant
							)?.label || variant }
						</span>
						<span className="sgs-mobile-nav-editor__note">
							{ __(
								'Menu items read automatically from header navigation.',
								'sgs-blocks'
							) }
						</span>
					</div>
				</div>
			</div>
		</>
	);
}
