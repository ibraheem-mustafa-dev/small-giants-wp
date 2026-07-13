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
			gridTemplateColumns: '2fr 1fr 1fr',
			// Explicit mobile 1-col: an explicit base gridTemplateColumns suppresses
			// the sgs-cols-mobile-1 shorthand (D228 gate), so the mobile collapse
			// must be an explicit responsive template rule.
			gridTemplateColumnsMobile: '1fr',
			gap: '48px',
		},
		[
			// Column 1 — brand: logo + tagline + socials from Business Details.
			[
				'core/group',
				{ className: 'sgs-site-footer__brand', layout: { type: 'constrained' } },
				[
					[ 'sgs/responsive-logo', { width: 160, linkToHome: true } ],
					[ 'sgs/business-info', { displayType: 'description' } ],
					[ 'sgs/business-info', { displayType: 'socials' } ],
				],
			],
			// Column 2 — Shop links.
			[
				'core/group',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'core/heading', { level: 2, content: __( 'Shop', 'sgs-blocks' ) } ],
					[
						'core/list',
						{},
						[
							[ 'core/list-item', { content: __( 'About Us', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'Contact', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'FAQs', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'Gift Ideas', 'sgs-blocks' ) } ],
						],
					],
				],
			],
			// Column 3 — Legal links.
			[
				'core/group',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'core/heading', { level: 2, content: __( 'Legal', 'sgs-blocks' ) } ],
					[
						'core/list',
						{},
						[
							[ 'core/list-item', { content: __( 'Privacy Policy', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'Shipping', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'Terms & Conditions', 'sgs-blocks' ) } ],
							[ 'core/list-item', { content: __( 'Allergen Info', 'sgs-blocks' ) } ],
						],
					],
				],
			],
		],
	],
	[
		'sgs/site-footer-row',
		{ rowSlot: 'bottom', layout: 'flex', justifyContent: 'center' },
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
