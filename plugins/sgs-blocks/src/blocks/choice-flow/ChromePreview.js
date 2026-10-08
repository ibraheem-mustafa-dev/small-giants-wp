/**
 * Editor-canvas preview of sgs/choice-flow's header, step-count line and
 * progress line, in the markup and classes `includes/choice-flow-chrome.php`
 * and `render.php` emit, so `style.css` paints them identically. Shows the
 * flow at question 1. The numbered-steps row, the step-count badge and the
 * summary help note are built by view.js and the summary helper on the front
 * end; the canvas shows the same elements so their colour controls preview.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';
import { colourVar } from '../../utils';
import { firstQuestionProgress } from './preview-style';

/**
 * @param {Object} props               Component props.
 * @param {Object} props.attributes    Block attributes.
 * @param {number} props.questionTotal Question steps in the flow.
 * @return {JSX.Element} The preview rows.
 */
export default function ChromePreview( { attributes, questionTotal } ) {
	const { showHeader, flowLayout, headerLogo, closeStyle, closeLabel, stepCountLabel, progressColour, progressColourGradient, progressStyle: progressVariant, showPricePanel, stageNote } = attributes;
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
	const logoUrl = headerLogo && headerLogo.url ? headerLogo.url : '';
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
						<img className="sgs-choice-flow__chrome-logo" src={ logoUrl } alt={ headerLogo.alt || '' } />
					) }
					<span className="sgs-choice-flow__chrome-eyebrow">{ eyebrowText }</span>
					{ 'text' === closeStyle ? (
						<span className="sgs-choice-flow__chrome-close sgs-choice-flow__chrome-close--text">
							<span className="sgs-choice-flow__chrome-close-text">{ closeText }</span>
							<span className="sgs-choice-flow__chrome-close-glyph" aria-hidden="true">
								&times;
							</span>
						</span>
					) : (
						<span className="sgs-choice-flow__chrome-close sgs-choice-flow__chrome-close--icon">
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
			{ noteText && ( showPricePanel || showcase ) && (
				<p className="sgs-choice-flow__summary-note sgs-choice-flow__summary-note--stage">
					<span className="sgs-choice-flow__summary-note-text">{ noteText }</span>
				</p>
			) }
		</>
	);
}
