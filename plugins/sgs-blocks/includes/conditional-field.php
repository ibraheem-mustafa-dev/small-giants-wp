<?php
/**
 * Form show/hide condition: the one shared source for the `data-conditional-*` output.
 *
 * A form field block (`conditionalField`, `conditionalOperator`, `conditionalValue` in its block.json) prints
 * the condition through `conditional_data_attributes()` (includes/forms/field-render-helpers.php::field_open).
 * Any other block carries the same condition as the form-answer rule of the conditional visibility extension
 * (`sgsConditionFormField`, `sgsConditionFormOperator`, `sgsConditionFormValue`);
 * includes/conditional-visibility.php::check_conditional_visibility adds the same data attributes to its root
 * element through `inject_form_answer_condition()`. The form's view.js (applyConditionalLogic) shows or hides every
 * `[data-conditional-field]` element inside the form.
 *
 * Output is data attributes only, never an inline style. A non-field block gets no server-side hidden class: the
 * visitor's answers are unknown at render time, so it stays visible until view.js evaluates the condition (and
 * stays visible when JavaScript does not run).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * The data attributes (name => unescaped value) a condition prints; empty when it has no watched field.
 *
 * The watched field submits under its fieldName cleaned by sanitize_key() (field_submission_name()).
 *
 * @param array $attributes Attributes carrying conditionalField, conditionalOperator, conditionalValue.
 * @return array<string,string>
 */
function conditional_data_attributes( array $attributes ): array {
	$field = sanitize_key( (string) ( $attributes['conditionalField'] ?? '' ) );
	if ( '' === $field ) {
		return array();
	}
	return array(
		'data-conditional-field'    => $field,
		'data-conditional-operator' => (string) ( $attributes['conditionalOperator'] ?? 'equals' ),
		'data-conditional-value'    => (string) ( $attributes['conditionalValue'] ?? '' ),
	);
}

/**
 * Print a block's form-answer condition (sgsConditionForm*) on its root element.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $attrs         Block attributes.
 * @return string
 */
function inject_form_answer_condition( string $block_content, array $attrs ): string {
	$data = conditional_data_attributes(
		array(
			'conditionalField'    => $attrs['sgsConditionFormField'] ?? '',
			'conditionalOperator' => $attrs['sgsConditionFormOperator'] ?? 'equals',
			'conditionalValue'    => $attrs['sgsConditionFormValue'] ?? '',
		)
	);
	if ( array() === $data ) {
		return $block_content;
	}
	$tags = new \WP_HTML_Tag_Processor( $block_content );
	if ( ! $tags->next_tag() ) {
		return $block_content;
	}
	foreach ( $data as $key => $value ) {
		$tags->set_attribute( $key, $value );
	}
	return $tags->get_updated_html();
}
