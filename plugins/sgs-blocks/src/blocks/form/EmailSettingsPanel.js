/**
 * "Email" inspector panel for `sgs/form` (Spec 04, unified-email plan phase 4).
 *
 * Every SGS email goes through `Sgs_Mailer`/`wp_mail()` over the site's own
 * SMTP — this panel is the block-editor surface for the four attrs
 * `Form_Mailer` reads server-side: who gets notified of a submission, and
 * whether the submitter also gets a confirmation email.
 *
 * Kept as its own file (rather than inline in edit.js, already at its
 * 250-line JS budget) per `.claude/rules/block-authoring.md` file-length
 * discipline — a plain settings panel, no shared control primitive needed.
 *
 * @package SGS\Blocks\Forms
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, TextareaControl, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props                        Component props.
 * @param {string}   props.notifyEmail             Owner notification recipient.
 * @param {boolean}  props.confirmationEmail       Whether the submitter also gets a confirmation email.
 * @param {string}   props.confirmationSubject     Confirmation email subject.
 * @param {string}   props.confirmationMessage     Confirmation email body.
 * @param {Function} props.setAttributes           Block attribute setter.
 * @return {JSX.Element} The Email settings panel.
 */
export default function EmailSettingsPanel( {
	notifyEmail,
	confirmationEmail,
	confirmationSubject,
	confirmationMessage,
	setAttributes,
} ) {
	return (
		<PanelBody title={ __( 'Email', 'sgs-blocks' ) } initialOpen={ false }>
			<TextControl
				type="email"
				label={ __( 'Send submissions to', 'sgs-blocks' ) }
				value={ notifyEmail || '' }
				onChange={ ( value ) => setAttributes( { notifyEmail: value } ) }
				help={ __(
					'Blank uses the Site Info email.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Email the person a confirmation', 'sgs-blocks' ) }
				checked={ !! confirmationEmail }
				onChange={ ( value ) => setAttributes( { confirmationEmail: value } ) }
				help={ __(
					'Sends only when the form has a valid email field.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			{ confirmationEmail && (
				<>
					<TextControl
						label={ __( 'Confirmation subject', 'sgs-blocks' ) }
						value={ confirmationSubject || '' }
						onChange={ ( value ) =>
							setAttributes( { confirmationSubject: value } )
						}
						help={ __(
							'Blank sends “Thanks for your submission”.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextareaControl
						label={ __( 'Confirmation message', 'sgs-blocks' ) }
						value={ confirmationMessage || '' }
						onChange={ ( value ) =>
							setAttributes( { confirmationMessage: value } )
						}
						rows={ 4 }
						help={ __(
							'Blank sends a short thank-you saying you will be in touch.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</PanelBody>
	);
}
