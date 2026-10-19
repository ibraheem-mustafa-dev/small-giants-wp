/**
 * Editor-canvas preview of sgs/choice-flow-question's heading and intro, in
 * the classes render.php emits (`__title--w{weight}` from
 * `sgs_choice_flow_question_title_weight_class()`, `__intro--w{n}` from
 * `sgs_choice_flow_question_intro_html()`), so style.css paints the weight and
 * the intro width exactly as the front end does. The intro width rules apply
 * under the showcase flow, whose class the parent flow's canvas carries.
 *
 * The option description line's canvas twin (`OptionDescriptionStyle` + `OptionDescriptionPreview`) mirrors
 * `helpers-description-style.php`: the same span, its typography as one scoped rule, its colour on the span.
 *
 * @package SGS\Blocks
 */

import { useSettings } from '@wordpress/block-editor';
import { textPaintPreview, typographyPreviewCss, usePreviewTier } from '../../utils';

const TITLE_WEIGHTS = [ '400', '500', '600', '700', '800' ];
const INTRO_WIDTHS = [ '52', '56', '58', '60', '64', 'none' ];

/**
 * @param {Object} props            Component props.
 * @param {Object} props.attributes Block attributes.
 * @return {JSX.Element} The heading and intro preview.
 */
export default function QuestionPreview( { attributes } ) {
	const { question, intro, questionFontWeight, introWidth } = attributes;
	const weight = TITLE_WEIGHTS.includes( questionFontWeight ) ? questionFontWeight : '700';
	const introText = ( intro || '' ).trim();
	const introClass = INTRO_WIDTHS.includes( introWidth )
		? ` sgs-choice-flow-question__intro--w${ introWidth }`
		: '';

	return (
		<>
			{ question && (
				<h3 className={ `sgs-choice-flow-question__title sgs-choice-flow-question__title--w${ weight }` }>
					{ question }
				</h3>
			) }
			{ introText && <p className={ `sgs-choice-flow-question__intro${ introClass }` }>{ introText }</p> }
		</>
	);
}

/**
 * The scoped canvas rule for the option description typography.
 *
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.clientId   The block's client id, for the canvas selector.
 * @return {JSX.Element|null} A style element, or null when nothing is set.
 */
export function OptionDescriptionStyle( { attributes, clientId } ) {
	const previewTier = usePreviewTier();
	const css = typographyPreviewCss(
		attributes,
		'optionDescription',
		`#block-${ clientId } .sgs-choice-flow-question__option-description`,
		previewTier
	);
	return css ? <style>{ css }</style> : null;
}

/**
 * One option's description span, in the class render.php prints, cut at the same 140 characters.
 *
 * @param {Object} props
 * @param {string} props.description The option's description.
 * @param {string} props.colour      The `optionDescriptionColour` value.
 * @return {JSX.Element|null} The span, or null for a blank description.
 */
export function OptionDescriptionPreview( { description, colour } ) {
	const [ palette ] = useSettings( 'color.palette' );
	if ( ! description ) {
		return null;
	}
	return (
		<span className="sgs-choice-flow-question__option-description" style={ textPaintPreview( colour, '', palette ) }>
			{ description.slice( 0, 140 ) }
		</span>
	);
}
