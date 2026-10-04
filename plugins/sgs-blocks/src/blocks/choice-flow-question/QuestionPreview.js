/**
 * Editor-canvas preview of sgs/choice-flow-question's heading and intro, in
 * the classes render.php emits (`__title--w{weight}` from
 * `sgs_choice_flow_question_title_weight_class()`, `__intro--w{n}` from
 * `sgs_choice_flow_question_intro_html()`), so style.css paints the weight and
 * the intro width exactly as the front end does. The intro width rules apply
 * under the showcase flow, whose class the parent flow's canvas carries.
 *
 * @package SGS\Blocks
 */

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
