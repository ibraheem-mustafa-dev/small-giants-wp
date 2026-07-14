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
	{ label: __( 'Text shadow', 'sgs-blocks' ), value: 'shadow' },
	{ label: __( 'Force solid', 'sgs-blocks' ), value: 'force-solid' },
];

const ALLOWED_BLOCKS = [ 'sgs/site-header-row' ];

// Three fixed rows. The middle row is pre-filled to match the current site
// header (logo + navigation + mobile-nav toggle + cart) so content parity holds
// on first insert. Top and bottom rows start empty and emit zero output until
// an operator adds elements (FR-S9-2 empty-row-zero-output).
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
			[
				'core/navigation',
				{
					textColor: 'text',
					fontSize: 'medium',
					style: {
						typography: { fontWeight: '600' },
						spacing: { blockGap: 'var:preset|spacing|40' },
					},
					overlayMenu: 'never',
				},
			],
			// Icons cluster (right): cart (always) + burger (only <768). Grouped so the
			// row has exactly 3 flex children → logo-left / nav-centre / icons-right.
			[
				'core/group',
				{
					className: 'sgs-header-icons',
					layout: { type: 'flex', flexWrap: 'nowrap' },
				},
				[
					[ 'sgs/cart', {} ],
					[ 'sgs/mobile-nav-toggle', {} ],
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
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. Use the contrast-safety option below when the header sits over a hero image.',
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
