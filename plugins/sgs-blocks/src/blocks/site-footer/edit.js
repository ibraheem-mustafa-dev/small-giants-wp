import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import {
	WidthPanel,
	ResponsiveSpacingPanel,
} from '../container/components/ContainerWrapperControls';

const ALLOWED_BLOCKS = [ 'sgs/site-footer-row' ];

// Three rows matching the draft `.mm-footer`: an optional top strip (CTA /
// newsletter, empty by default → zero output), a columns grid (brand + link
// groups, collapsing to 1 column below 768), and a centred bottom bar. Every
// business-data field (tagline/socials/copyright) uses the sgs/business-info
// block, which reads live from Business Details (no hardcoded client data, no
// per-field bindings — FR-S9-10 / FR-S4-5). Generic link labels are not personal data.
const TEMPLATE = [
	[ 'sgs/site-footer-row', { rowSlot: 'top', layout: 'flex' } ],
	[
		'sgs/site-footer-row',
		{
			rowSlot: 'columns',
			layout: 'grid',
			columns: 3,
			columnsTablet: 3,
			columnsMobile: 1,
			// OBJECT shape is mandatory — this is D328, still live until now.
			// site-footer-row declares gridTemplateColumns + gap as `type: object`
			// ({desktop, mobile}). A flat string here is silently COERCED to the
			// block.json default at render (WP prepare_attributes_for_render), so
			// '2fr 1fr 1fr' became the default `repeat(3, 1fr)` — EQUAL THIRDS
			// instead of the draft's 2fr 1fr 1fr — with no error and no test failure.
			// `gridTemplateColumnsMobile` was not a declared attr at all and was
			// discarded outright; the mobile collapse belongs in the `mobile` tier.
			gridTemplateColumns: { desktop: '2fr 1fr 1fr', mobile: '1fr' },
			gap: { desktop: '48px', mobile: '32px' },
		},
		[
			// Column 1 — brand: logo + tagline + socials from Business Details.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__brand', layout: { type: 'constrained' } },
				[
					[ 'sgs/responsive-logo', { width: 160, linkToHome: true } ],
					[ 'sgs/business-info', { displayType: 'description' } ],
					[ 'sgs/business-info', { displayType: 'socials' } ],
				],
			],
			// Column 2 — Shop links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 2 } ],
						[
							'sgs/text',
							{},
						],
				],
			],
			// Column 3 — Legal links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 2 } ],
						[
							'sgs/text',
							{},
						],
				],
			],
		],
	],
	[
		'sgs/site-footer-row',
		// Shapes here are NOT free-form — they mirror framework-footer-default.php's
		// bottom row exactly, because site-footer-row declares gap/padding/margin as
		// OBJECT attrs. A flat value (gap:'8px') or a missing tier (padding:{top})
		// is silently COERCED to the block.json default at render — no error, no test
		// failure, just the wrong spacing (D328). `border` is a SUPPORT, not an attr,
		// so it must live under `style`, or WP discards it as an unknown attribute.
		{
			rowSlot: 'bottom',
			layout: 'flex',
			justifyContent: 'center',
			gap: { desktop: '8px' },
			padding: {
				desktop: {
					top: 'var(--wp--preset--spacing--40)',
					bottom: 'var(--wp--preset--spacing--40)',
				},
			},
			margin: { desktop: { top: 'var(--wp--preset--spacing--50)' } },
			style: { border: { top: { color: 'var:preset|color|accent', width: '1px' } } },
		},
		[
			[ 'sgs/business-info', { displayType: 'copyright' } ],
		],
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps( { className: 'sgs-site-footer' } );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
		// Fixed rows: operators can't add/remove/reorder rows, but can fully edit
		// the elements inside each row (the rows set their own templateLock:false).
		templateLock: 'insert',
		orientation: 'vertical',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Footer width', 'sgs-blocks' ) }>
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

			<div { ...innerBlocksProps } />
		</>
	);
}
