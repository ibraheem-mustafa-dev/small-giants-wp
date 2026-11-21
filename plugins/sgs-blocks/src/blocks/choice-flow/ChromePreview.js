/**
 * Editor-canvas preview of sgs/choice-flow's header, step-count line and
 * progress line, in the markup and classes `includes/choice-flow-chrome.php`
 * and `render.php` emit, so `style.css` paints them identically. Shows the
 * flow at question 1. The numbered-steps row, the step-count badge and the
 * summary box (its lines, total and help note) are built by view.js and the
 * summary helper on the front end; the canvas shows the same elements so their
 * colour, border, padding and size controls preview.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import { colourVar } from '../../utils';
import { logoUrlFor } from '../../utils/logo-source';
import { buttonKitPreview, buttonPresetClass, firstQuestionProgress } from './preview-style';

import AuthoredText from '../../components/AuthoredText';
/**
 * @param {Object} props               Component props.
 * @param {Object} props.attributes    Block attributes.
 * @param {number} props.questionTotal Question steps in the flow.
 * @param {string} [props.tier]        Previewed device tier, for the Close button's kit look.
 * @param {Array}  [props.palette]     Theme colour palette.
 * @return {JSX.Element} The preview rows.
 */
export default function ChromePreview( { attributes, questionTotal, tier = 'desktop', palette } ) {
	const { showHeader, flowLayout, headerLogoSource, headerLogoAlt, headerLogoDecorative, closeStyle, closeLabel, stepCountLabel, progressColour, progressColourGradient, progressStyle: progressVariant, showPricePanel, stageNote } = attributes;
	const showcase = 'showcase' === flowLayout;
	const hasHeader = !! showHeader || showcase;
	const label = stepCountLabel && stepCountLabel.trim() ? stepCountLabel.trim() : __( 'Step', 'sgs-blocks' );
	const stepCountText = questionTotal > 0 ? `${ label } 1 of ${ questionTotal }` : '';
	// Showcase's header eyebrow starts as the server's "Step N of M" until the
	// runtime recomposes it; compact mirrors the step-count line.
	const eyebrowText =
		questionTotal > 0 && showcase
			? sprintf(
					/* translators: 1: current step number, 2: total step count. */
					__( 'Step %1$d of %2$d', 'sgs-blocks' ),
					1,
					questionTotal
			  )
			: stepCountText;
	const logoUrl = logoUrlFor( headerLogoSource, 'desktop' );
	// The Close button's own kit look (`closeButton*`): the preset's class and the look settings, as the page prints them.
	const closeClass = buttonPresetClass( attributes, 'closeButton' );
	const closeLook = buttonKitPreview( attributes, 'closeButton', { tier, palette } );
	const closeText = closeLabel && closeLabel.trim() ? closeLabel.trim() : __( 'Close', 'sgs-blocks' );
	const fillColour = colourVar( progressColour );
	const progressStyle = { '--sgs-choice-flow-progress': firstQuestionProgress( attributes, questionTotal ) };
	const fillStyle =
		fillColour || progressColourGradient
			? {
					...( fillColour ? { '--sgs-choice-flow-progress-colour': fillColour } : {} ),
					...( progressColourGradient ? { '--sgs-choice-flow-progress-colour-gradient': progressColourGradient } : {} ),
			  }
			: undefined;

	// view.js builds one circle per question (flow-progress.js::buildStepperMarkup); an empty flow shows three.
	const stepperTotal = questionTotal > 0 ? questionTotal : 3;
	const stepperItems = Array.from( { length: stepperTotal }, ( _, index ) => index + 1 );
	const noteText = stageNote && stageNote.trim() ? stageNote.trim() : '';

	return (
		<>
			{ 'circles' === progressVariant && (
				<div className="sgs-choice-flow__stepper" aria-hidden="true">
					{ stepperItems.map( ( number ) => (
						<Fragment key={ number }>
							<div className={ `sgs-choice-flow__stepper-item${ 1 === number ? ' is-current' : '' }` }>
								<span className="sgs-choice-flow__stepper-circle">{ number }</span>
								<span className="sgs-choice-flow__stepper-label">{ `${ label } ${ number }` }</span>
							</div>
							{ number < stepperTotal && <span className="sgs-choice-flow__stepper-connector" /> }
						</Fragment>
					) ) }
				</div>
			) }
			{ hasHeader && (
				<div className="sgs-choice-flow__chrome-header">
					{ logoUrl && (
						<img className="sgs-choice-flow__chrome-logo" src={ logoUrl } alt={ headerLogoDecorative ? '' : headerLogoAlt || '' } />
					) }
					<span className="sgs-choice-flow__chrome-eyebrow">{ eyebrowText }</span>
					{ 'text' === closeStyle ? (
						<span className={ `sgs-choice-flow__chrome-close sgs-choice-flow__chrome-close--text ${ closeClass }`.trim() } style={ closeLook }>
							<AuthoredText className="sgs-choice-flow__chrome-close-text" value={ closeText } />
							<span className="sgs-choice-flow__chrome-close-glyph" aria-hidden="true">
								&times;
							</span>
						</span>
					) : (
						<span className={ `sgs-choice-flow__chrome-close sgs-choice-flow__chrome-close--icon ${ closeClass }`.trim() } style={ closeLook }>
							<svg
								className="sgs-choice-flow__chrome-close-icon"
								viewBox="0 0 24 24"
								aria-hidden="true"
								focusable="false"
							>
								<path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</span>
					) }
				</div>
			) }
			{ ! showcase && (
				<div className="sgs-choice-flow__header">
					<div className="sgs-choice-flow__step-indicator">
						<span className="sgs-choice-flow__step-count">{ stepCountText }</span>
					</div>
				</div>
			) }
			<div className="sgs-choice-flow__progress" aria-hidden="true" style={ progressStyle }>
				<div className="sgs-choice-flow__progress-fill" style={ fillStyle } />
				{ 'badge' === progressVariant && (
					<span className="sgs-choice-flow__progress-badge" style={ { left: 'calc(var(--sgs-choice-flow-progress) * 100%)' } }>
						{ `1/${ stepperTotal }` }
					</span>
				) }
			</div>
			{ ( showPricePanel || showcase ) && <SummaryPreview attributes={ attributes } showcase={ showcase } noteText={ noteText } /> }
		</>
	);
}

/**
 * Lucide glyphs for the help note's icon, as `sgs_get_lucide_icon()` prints them on the page (phone, mail,
 * message-circle); the WhatsApp choice shows the message-circle outline on the canvas.
 */
const NOTE_ICON_PATHS = {
	phone: [ 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' ],
	email: [ 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' ],
	chat: [ 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z' ],
	whatsapp: [ 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z' ],
};

/**
 * The summary box as `includes/choice-flow-summary.php` reserves it, at the flow's first question: the base price line,
 * the total and the help note with its icon disc (`sgs_choice_flow_stage_note_html()`), in the page's classes so
 * `style.css` and `BandsStyle` paint them. The lines and total hold a dash until a visitor chooses.
 *
 * @param {Object}  props
 * @param {Object}  props.attributes Block attributes.
 * @param {boolean} props.showcase   The showcase layout (its stage is hidden below 768px of container on the page; the
 *                                   canvas always shows it).
 * @param {string}  props.noteText   The help note's text, '' for none.
 * @return {JSX.Element} The summary box.
 */
function SummaryPreview( { attributes, showcase, noteText } ) {
	const baseLabel = attributes.summaryBaseLabel && attributes.summaryBaseLabel.trim() ? attributes.summaryBaseLabel.trim() : __( 'Base price', 'sgs-blocks' );
	const iconPaths = NOTE_ICON_PATHS[ attributes.stageNoteIcon ];
	return (
		<div className="sgs-choice-flow__summary-body" style={ showcase ? { display: 'flex' } : undefined }>
			<ul className="sgs-choice-flow__summary-lines">
				<li>
					<span>{ baseLabel }</span>
					<span>&mdash;</span>
				</li>
			</ul>
			<div className="sgs-choice-flow__summary-total">
				<span className="sgs-choice-flow__summary-total-label">{ __( 'Total', 'sgs-blocks' ) }</span>
				<span className="sgs-choice-flow__summary-total-value">&mdash;</span>
			</div>
			{ noteText && (
				<p className={ `sgs-choice-flow__summary-note sgs-choice-flow__summary-note--stage${ iconPaths ? ' sgs-choice-flow__summary-note--has-icon' : '' }` }>
					{ iconPaths && (
						<span className="sgs-choice-flow__summary-note-icon" aria-hidden="true">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
								{ iconPaths.map( ( d ) => (
									<path key={ d } d={ d } />
								) ) }
							</svg>
						</span>
					) }
					<AuthoredText className="sgs-choice-flow__summary-note-text" value={ noteText } />
				</p>
			) }
		</div>
	);
}
