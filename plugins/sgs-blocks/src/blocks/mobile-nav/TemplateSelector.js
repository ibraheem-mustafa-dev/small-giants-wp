/**
 * Template Selector — card grid shown above all inspector panels.
 *
 * Each card batch-sets 15–20 attributes. A confirmation notice warns the
 * user before overwriting their settings. Inner blocks are never touched.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, Notice } from '@wordpress/components';

/** Preset attribute maps — every key must exist in block.json attributes. */
const TEMPLATES = [
	{
		id: 'default',
		label: __( 'Default', 'sgs-blocks' ),
		description: __( 'Overlay drawer — accent CTA, socials on, no logo.', 'sgs-blocks' ),
		attributes: {
			variant: 'overlay',
			showLogo: false,
			showCta: true,
			ctaStyle: 'filled',
			showSecondaryCta: false,
			showSocials: true,
			showTagline: false,
			showSearch: false,
			showAccountTray: false,
			showWhatsApp: false,
			contactDisplayMode: 'icon-only',
			drawerPosition: 'top',
			staggerDelay: 25,
			animationDuration: 400,
			animationEasing: 'spring',
		},
	},
	{
		id: 'ecommerce',
		label: __( 'E-commerce', 'sgs-blocks' ),
		description: __( 'Slide-right, search, account tray, WhatsApp, icon+text contacts.', 'sgs-blocks' ),
		attributes: {
			variant: 'slide-right',
			showLogo: true,
			showCta: true,
			ctaStyle: 'filled',
			showSecondaryCta: false,
			showSocials: true,
			showTagline: false,
			showSearch: true,
			showAccountTray: true,
			showWhatsApp: true,
			contactDisplayMode: 'icon-text',
			drawerPosition: 'top',
			staggerDelay: 20,
			animationDuration: 350,
			animationEasing: 'ease',
		},
	},
	{
		id: 'restaurant',
		label: __( 'Restaurant', 'sgs-blocks' ),
		description: __( 'Bottom sheet, logo on, WhatsApp, "Book a Table" tagline.', 'sgs-blocks' ),
		attributes: {
			variant: 'bottom-sheet',
			showLogo: true,
			logoMaxWidth: 140,
			showCta: true,
			ctaText: 'Book a Table',
			ctaStyle: 'filled',
			showSecondaryCta: true,
			secondaryCtaText: 'Order Online',
			secondaryCtaStyle: 'ghost',
			showSocials: true,
			showTagline: true,
			taglineText: '',
			showSearch: false,
			showAccountTray: false,
			showWhatsApp: true,
			contactDisplayMode: 'icon-only',
			drawerPosition: 'space-between',
			staggerDelay: 30,
			animationDuration: 420,
			animationEasing: 'spring',
		},
	},
	{
		id: 'b2b-trade',
		label: __( 'B2B Trade', 'sgs-blocks' ),
		description: __( 'Overlay, "Apply for Account" CTA, "Call Us" secondary, icon+text contacts, account tray.', 'sgs-blocks' ),
		attributes: {
			variant: 'overlay',
			showLogo: false,
			showCta: true,
			ctaText: 'Apply for Account',
			ctaStyle: 'filled',
			showSecondaryCta: true,
			secondaryCtaText: 'Call Us',
			secondaryCtaStyle: 'outline',
			showSocials: false,
			showTagline: false,
			showSearch: false,
			showAccountTray: true,
			showWhatsApp: false,
			contactDisplayMode: 'icon-text',
			drawerPosition: 'top',
			staggerDelay: 20,
			animationDuration: 380,
			animationEasing: 'ease-in-out',
		},
	},
	{
		id: 'minimal',
		label: __( 'Minimal', 'sgs-blocks' ),
		description: __( 'Slide-left, no CTA, no socials, plain close button, reduced stagger.', 'sgs-blocks' ),
		attributes: {
			variant: 'slide-left',
			showLogo: false,
			showCta: false,
			showSecondaryCta: false,
			showSocials: false,
			showTagline: false,
			showSearch: false,
			showAccountTray: false,
			showWhatsApp: false,
			contactDisplayMode: 'hidden',
			closeButtonStyle: 'plain',
			drawerPosition: 'top',
			staggerDelay: 10,
			animationDuration: 300,
			animationEasing: 'ease',
		},
	},
	{
		id: 'brand-forward',
		label: __( 'Brand Forward', 'sgs-blocks' ),
		description: __( 'Overlay, large logo, centre-aligned, filled CTA, gradient background.', 'sgs-blocks' ),
		attributes: {
			variant: 'overlay',
			showLogo: true,
			logoMaxWidth: 180,
			showCta: true,
			ctaStyle: 'filled',
			showSecondaryCta: false,
			showSocials: true,
			showTagline: true,
			taglineText: '',
			showSearch: false,
			showAccountTray: false,
			showWhatsApp: false,
			contactDisplayMode: 'icon-only',
			drawerPosition: 'centre',
			staggerDelay: 35,
			animationDuration: 450,
			animationEasing: 'spring',
		},
	},
];

/**
 * @param {Object}   props
 * @param {Function} props.setAttributes  Block setAttributes.
 */
export default function TemplateSelector( { setAttributes } ) {
	const [ pending, setPending ] = useState( null );

	function handleCardClick( template ) {
		setPending( template );
	}

	function applyTemplate() {
		if ( pending ) {
			setAttributes( pending.attributes );
			setPending( null );
		}
	}

	return (
		<div className="sgs-template-selector">
			<p className="sgs-template-selector__label">
				{ __( 'Start from a template — or skip to customise manually below.', 'sgs-blocks' ) }
			</p>

			{ pending && (
				<Notice
					status="warning"
					isDismissible={ false }
					className="sgs-template-selector__confirm"
				>
					<p>
						{ __(
							'This will override your current settings. Inner blocks content will not be affected.',
							'sgs-blocks'
						) }
					</p>
					<div className="sgs-template-selector__confirm-actions">
						<Button
							variant="primary"
							onClick={ applyTemplate }
							isSmall
						>
							{ __( 'Apply Template', 'sgs-blocks' ) }
						</Button>
						<Button
							variant="tertiary"
							onClick={ () => setPending( null ) }
							isSmall
						>
							{ __( 'Cancel', 'sgs-blocks' ) }
						</Button>
					</div>
				</Notice>
			) }

			<div className="sgs-template-selector__grid">
				{ TEMPLATES.map( ( tpl ) => (
					<button
						key={ tpl.id }
						type="button"
						className="sgs-template-selector__card"
						onClick={ () => handleCardClick( tpl ) }
					>
						<strong className="sgs-template-selector__card-name">
							{ tpl.label }
						</strong>
						<span className="sgs-template-selector__card-desc">
							{ tpl.description }
						</span>
					</button>
				) ) }
			</div>
		</div>
	);
}
