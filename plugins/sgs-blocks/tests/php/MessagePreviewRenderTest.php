<?php
/**
 * The sgs/message-preview and sgs/message-preview-line render: labelled boxes, a line that shows its starting text
 * without script, escaped output, no submission, no inline style, and the optional session copy flag.
 *
 * Run with: vendor/bin/phpunit --filter MessagePreviewRenderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Message preview markup.
 */
final class MessagePreviewRenderTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The three boxes a gift note uses.
	 *
	 * @return array<int, array<string, mixed>> Field definitions.
	 */
	private function fields(): array {
		return array(
			array(
				'key'          => 'to',
				'label'        => 'To',
				'fieldType'    => 'text',
				'placeholder'  => 'Her name',
				'defaultValue' => 'Aisha',
				'maxLength'    => 30,
			),
			array(
				'key'          => 'message',
				'label'        => 'Your message',
				'fieldType'    => 'textarea',
				'rows'         => 4,
				'defaultValue' => 'Well done <b>you</b>',
				'maxLength'    => 200,
			),
			array(
				'key'       => 'from',
				'label'     => 'From',
				'fieldType' => 'text',
			),
		);
	}

	/**
	 * Render the fields block.
	 *
	 * @param array<string, mixed>   $extra  Extra attributes.
	 * @param array<int, mixed>|null $fields Field definitions (the gift note's when null).
	 * @return array{html: string, css: string} Rendered HTML and CSS.
	 */
	private function fields_block( array $extra = array(), ?array $fields = null ): array {
		return $this->render_block( 'sgs/message-preview', array_merge( array( 'fields' => $fields ?? $this->fields() ), $extra ), array(), array(), '', true );
	}

	/**
	 * Every box has a real label tied to its control.
	 */
	public function test_each_field_has_a_label_for_its_control(): void {
		$html = $this->fields_block()['html'];

		$this->assertMatchesRegularExpression( '/<label class="sgs-message-preview__label" for="([^"]+)">To<\/label>/', $html );
		preg_match( '/<label class="sgs-message-preview__label" for="([^"]+)">To<\/label>/', $html, $m );
		$this->assertStringContainsString( 'id="' . $m[1] . '"', $html );
		$this->assertStringContainsString( '<textarea rows="4"', $html );
		$this->assertStringContainsString( 'maxlength="30"', $html );
		$this->assertStringContainsString( 'placeholder="Her name"', $html );
		$this->assertStringContainsString( 'value="Aisha"', $html );
		$this->assertStringContainsString( 'data-group="note"', $html );
	}

	/**
	 * A default is cut to its limit and escaped.
	 */
	public function test_a_default_is_cut_to_the_limit_and_escaped(): void {
		$fields                    = $this->fields();
		$fields[0]['defaultValue'] = '"><script>x</script>' . str_repeat( 'a', 40 );
		$html                      = $this->fields_block( array(), $fields )['html'];

		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( 'value="&quot;&gt;&lt;script&gt;x&lt;/script&gt;', $html );
		$this->assertDoesNotMatchRegularExpression( '/a{21}/', $html );
		$this->assertStringContainsString( 'Well done &lt;b&gt;you&lt;/b&gt;</textarea>', $html );
	}

	/**
	 * Nothing is submitted and nothing is styled inline.
	 */
	public function test_it_has_no_form_no_button_and_no_inline_style(): void {
		$html = $this->fields_block( array( 'inputMinHeight' => array( 'desktop' => '60px' ) ) )['html'];

		$this->assertStringNotContainsString( '<form', $html );
		$this->assertStringNotContainsString( '<button', $html );
		$this->assertStringNotContainsString( 'type="submit"', $html );
		$this->assertDoesNotMatchRegularExpression( '/<[a-z]+[^>]*\sstyle="/', $html );
	}

	/**
	 * The session copy flag prints only when the setting is on; the group is the key's name.
	 */
	public function test_the_session_copy_is_off_unless_set(): void {
		$off = $this->fields_block()['html'];
		$on  = $this->fields_block(
			array(
				'rememberNote' => true,
				'group'        => 'Gift Note',
			)
		)['html'];

		$this->assertStringNotContainsString( 'data-remember', $off );
		$this->assertStringContainsString( 'data-remember="true"', $on );
		$this->assertStringContainsString( 'data-group="giftnote"', $on );
	}

	/**
	 * Settings print as one scoped rule.
	 */
	public function test_look_settings_print_in_a_scoped_rule(): void {
		$out = $this->fields_block(
			array(
				'inputBackgroundColour' => '#FFFAF0',
				'labelColour'           => '#3A2A22',
				'inputMinHeight'        => array( 'desktop' => '52px' ),
				'gap'                   => array( 'desktop' => '14px' ),
			)
		);

		$this->assertStringContainsString( 'background-color:#FFFAF0', $out['css'] );
		$this->assertStringContainsString( 'color:#3A2A22', $out['css'] );
		$this->assertStringContainsString( 'min-height:52px', $out['css'] );
		$this->assertStringContainsString( 'gap:14px', $out['css'] );
	}

	/**
	 * A line prints its starting text and the data the script needs.
	 */
	public function test_a_line_shows_its_starting_text_without_script(): void {
		$html = $this->render_block(
			'sgs/message-preview-line',
			array(
				'group'        => 'note',
				'field'        => 'to',
				'startingText' => 'Dear <i>Aisha</i>,',
				'prefix'       => 'Dear ',
				'suffix'       => ',',
				'fallback'     => 'Dear you,',
			),
			array(),
			array(),
			'',
			true
		)['html'];

		$this->assertMatchesRegularExpression( '/<p [^>]*data-sgs-mp-line data-group="note" data-field="to" data-prefix="Dear " data-suffix="," data-fallback="Dear you,">Dear &lt;i&gt;Aisha&lt;\/i&gt;,<\/p>/', $html );
		$this->assertDoesNotMatchRegularExpression( '/<p[^>]*\sstyle="/', $html );
	}

	/**
	 * A line's look prints in a scoped rule.
	 */
	public function test_a_line_look_prints_in_a_scoped_rule(): void {
		$out = $this->render_block(
			'sgs/message-preview-line',
			array(
				'field'      => 'message',
				'textColour' => '#3A2A22',
				'padding'    => array( 'desktop' => array( 'right' => '60px' ) ),
				'fontFamily' => 'caveat',
				'fontSize'   => array( 'desktop' => 33 ),
			),
			array(),
			array(),
			'',
			true
		);

		$this->assertStringContainsString( 'color:#3A2A22', $out['css'] );
		$this->assertStringContainsString( 'padding-right:60px', $out['css'] );
		$this->assertStringContainsString( 'font-size:33px', $out['css'] );
	}
}
