import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import {
	WidthPanel,
	ResponsiveSpacingPanel,
} from '../container/components/ContainerWrapperControls';

const CONTRAST_SAFE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Scrim overlay', 'sgs-blocks' ), value: 'scrim' },
	{
		label: __( 'Text shadow (not WCAG-safe)', 'sgs-blocks' ),
		value: 'shadow',
	},
	{ label: __( 'Force solid', 'sgs-blocks' ), value: 'force-solid' },
];

const ALLOWED_BLOCKS = [ 'sgs/site-header-row' ];

// Three fixed rows. The middle row is pre-filled to match the current site
// header (logo + navigation + cart) so content parity holds on first insert.
// The mobile burger + drawer are owned entirely by sgs/adaptive-nav (Task 1 /
// D336) — no separate toggle block. Top and bottom rows start empty and emit
// zero output until an operator adds elements (FR-S9-2 empty-row-zero-output).
const TEMPLATE = [
	[ 'sgs/site-header-row', { rowSlot: 'top' } ],
	[
		'sgs/site-header-row',
		{ rowSlot: 'middle', justifyContent: 'space-between' },
		[
			// Logo (left). SGS per-breakpoint logo block (falls back to the site
			// custom_logo when no per-breakpoint images set). Draft: logo | nav | icons.
			[ 'sgs/responsive-logo', { width: 180, linkToHome: true } ],
			// Primary nav (centre on desktop; hidden <768 → lives in the drawer).
			// sgs/adaptive-nav — matches the live header part (theme/sgs-theme/parts/header.html)
			// so a fresh insert doesn't re-arm the WooCommerce mini-cart/customer-account
			// auto-injection that WC hooks onto core/navigation via Block Hooks, and keeps
			// the mega-menu capability that core/navigation doesn't have.
			[
				'sgs/adaptive-nav',
				{
					linkColour: 'text',
					gap: { desktop: '28px' },
				},
			],
			// Icons cluster (right): cart. Grouped so the row has exactly 3 flex
			// children → logo-left / nav-centre / icons-right. (The burger is no
			// longer listed here: sgs/adaptive-nav renders its own toggle + drawer
			// since D336/D337, and sgs/mobile-nav-toggle is deleted — a TEMPLATE
			// entry for a deleted block would make every FRESH header insert render
			// an invalid-content placeholder.)
			//
			// sgs/container, NOT core/group: the DB (`blocks.replaces`) records
			// sgs/container as the replacement for core/group|core/columns|core/column,
			// and a replaced core block must never be used. Flat `layout`/`flexWrap`
			// strings are sgs/container's own attrs — NOT core/group's nested
			// `layout:{type,flexWrap}` object, which sgs/container does not read.
			[
				'sgs/container',
				{
					className: 'sgs-header-icons',
					layout: 'flex',
					flexWrap: 'nowrap',
				},
				[
					[ 'sgs/cart', {} ],
				],
			],
		],
	],
	[ 'sgs/site-header-row', { rowSlot: 'bottom' } ],
];

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-header' } );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
		// Fixed three rows: operators can't add/remove/reorder rows, but can
		// fully edit the elements inside each row (the rows set their own
		// templateLock:false for their content).
		templateLock: 'insert',
		orientation: 'vertical',
	} );

	const { headerSticky, headerTransparent, headerShrink, contrastSafe } =
		attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Header width', 'sgs-blocks' ) }>
					<WidthPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
				</PanelBody>
				<ResponsiveSpacingPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Header behaviour', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							headerSticky: false,
							headerTransparent: false,
							headerShrink: false,
							contrastSafe: 'none',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
						hasValue={ () => headerSticky !== false }
						onDeselect={ () =>
							setAttributes( { headerSticky: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
							checked={ !! headerSticky }
							onChange={ ( value ) =>
								setAttributes( { headerSticky: value } )
							}
							help={ __(
								'Pins the header to the top of the viewport while the visitor scrolls.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __(
							'Transparent until scrolled',
							'sgs-blocks'
						) }
						hasValue={ () => headerTransparent !== false }
						onDeselect={ () =>
							setAttributes( { headerTransparent: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __(
								'Transparent until scrolled',
								'sgs-blocks'
							) }
							checked={ !! headerTransparent }
							onChange={ ( value ) =>
								setAttributes( { headerTransparent: value } )
							}
							help={ __(
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. A contrast-safe scrim is applied automatically over the hero so text stays readable — change it below if you need a different look.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
						hasValue={ () => headerShrink !== false }
						onDeselect={ () =>
							setAttributes( { headerShrink: false } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
							checked={ !! headerShrink }
							onChange={ ( value ) =>
								setAttributes( { headerShrink: value } )
							}
							help={ __(
								'Reduces the header height as the visitor scrolls down the page.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __(
							'Contrast safety over hero',
							'sgs-blocks'
						) }
						hasValue={ () => contrastSafe !== 'none' }
						onDeselect={ () =>
							setAttributes( { contrastSafe: 'none' } )
						}
						isShownByDefault
					>
						<SelectControl
							label={ __(
								'Contrast safety over hero',
								'sgs-blocks'
							) }
							value={ contrastSafe || 'none' }
							options={ CONTRAST_SAFE_OPTIONS }
							onChange={ ( value ) =>
								setAttributes( { contrastSafe: value } )
							}
							help={ __(
								'Keeps header text readable when it sits over a hero image (used with Transparent until scrolled).',
								'sgs-blocks'
							) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
