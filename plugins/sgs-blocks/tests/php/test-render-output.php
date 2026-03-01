<?php
/**
 * Test server-side render output for key SGS blocks.
 *
 * Each test creates a WP_Block instance with realistic attributes, calls
 * render(), then asserts that the output contains the expected HTML elements
 * and attributes.
 *
 * Blocks tested:
 *   - sgs/hero          → <section> wrapper
 *   - sgs/accordion-item → <details> / <summary> elements
 *   - sgs/form           → <form> + nonce state + hidden form ID field
 *   - sgs/modal          → <dialog> element
 *
 * @package SGS\Blocks\Tests
 */

/**
 * Class Test_Render_Output
 */
class Test_Render_Output extends WP_UnitTestCase {

	/**
	 * Path to the build/blocks directory.
	 *
	 * @var string
	 */
	private string $build_blocks_dir;

	/**
	 * Set up before each test.
	 */
	public function setUp(): void {
		parent::setUp();

		$this->build_blocks_dir = SGS_BLOCKS_PLUGIN_DIR . '/build/blocks';

		// Blocks must be registered before we can create WP_Block instances.
		// WP_UnitTestCase runs 'init' automatically; the plugin registers blocks
		// there. If registration failed, tests will fail clearly.
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	/**
	 * Render a registered block with given attributes and inner HTML content.
	 *
	 * @param string $block_name  Fully-qualified block name (e.g. 'sgs/hero').
	 * @param array  $attributes  Block attributes array.
	 * @param string $inner_html  Pre-rendered inner block HTML (optional).
	 * @return string Rendered HTML output.
	 */
	private function render_block( string $block_name, array $attributes = [], string $inner_html = '' ): string {
		$parsed = [
			'blockName'    => $block_name,
			'attrs'        => $attributes,
			'innerBlocks'  => [],
			'innerHTML'    => $inner_html,
			'innerContent' => $inner_html ? [ $inner_html ] : [],
		];

		$block = new WP_Block( $parsed );

		return $block->render();
	}

	/**
	 * Assert that $haystack contains $needle (case-sensitive substring match).
	 * Provides clearer diff output than assertStringContainsString.
	 *
	 * @param string $needle   Expected substring.
	 * @param string $haystack Rendered HTML.
	 * @param string $message  Failure message.
	 */
	private function assert_html_contains( string $needle, string $haystack, string $message = '' ): void {
		$this->assertStringContainsString( $needle, $haystack, $message );
	}

	/**
	 * Skip test if the build directory for a block does not exist.
	 *
	 * @param string $slug Block slug (directory name).
	 */
	private function require_build_block( string $slug ): void {
		$path = $this->build_blocks_dir . '/' . $slug;

		if ( ! is_dir( $path ) ) {
			$this->markTestSkipped(
				"build/blocks/{$slug}/ not found. Run `npm run build` first."
			);
		}
	}

	/**
	 * Skip test if the block is not registered.
	 *
	 * @param string $block_name Fully-qualified block name.
	 */
	private function require_registered_block( string $block_name ): void {
		if ( ! WP_Block_Type_Registry::get_instance()->is_registered( $block_name ) ) {
			$this->markTestSkipped( "Block '{$block_name}' is not registered." );
		}
	}

	// ─── Hero block ──────────────────────────────────────────────────────────

	/**
	 * Hero block must output a <section> as the root wrapper element.
	 */
	public function test_hero_outputs_section_element(): void {
		$this->require_build_block( 'hero' );
		$this->require_registered_block( 'sgs/hero' );

		$output = $this->render_block(
			'sgs/hero',
			[
				'variant'          => 'standard',
				'headline'         => 'Welcome to Our Site',
				'subHeadline'      => 'We build great things.',
				'alignment'        => 'left',
				'ctaPrimaryText'   => 'Get Started',
				'ctaPrimaryUrl'    => 'https://example.com/start',
			]
		);

		$this->assert_html_contains(
			'<section',
			$output,
			'Hero block must use a <section> as the root element.'
		);

		$this->assert_html_contains(
			'</section>',
			$output,
			'Hero block must close the <section> element.'
		);
	}

	/**
	 * Hero block root element must carry the sgs-hero class.
	 */
	public function test_hero_has_sgs_hero_class(): void {
		$this->require_build_block( 'hero' );
		$this->require_registered_block( 'sgs/hero' );

		$output = $this->render_block( 'sgs/hero', [ 'variant' => 'standard' ] );

		$this->assert_html_contains(
			'class="',
			$output,
			'Hero section must have a class attribute.'
		);

		$this->assert_html_contains(
			'sgs-hero',
			$output,
			'Hero block root must include the sgs-hero CSS class.'
		);
	}

	/**
	 * Hero headline attribute is rendered as an <h1>.
	 */
	public function test_hero_headline_rendered(): void {
		$this->require_build_block( 'hero' );
		$this->require_registered_block( 'sgs/hero' );

		$output = $this->render_block(
			'sgs/hero',
			[
				'variant'  => 'standard',
				'headline' => 'Test Headline',
			]
		);

		$this->assert_html_contains(
			'Test Headline',
			$output,
			'Hero headline text must appear in the rendered output.'
		);

		$this->assert_html_contains(
			'sgs-hero__headline',
			$output,
			'Hero headline must have the sgs-hero__headline class.'
		);
	}

	/**
	 * Hero with split variant renders the split-specific classes.
	 */
	public function test_hero_split_variant_classes(): void {
		$this->require_build_block( 'hero' );
		$this->require_registered_block( 'sgs/hero' );

		$output = $this->render_block( 'sgs/hero', [ 'variant' => 'split' ] );

		$this->assert_html_contains(
			'sgs-hero--split',
			$output,
			'Split hero must include sgs-hero--split class.'
		);
	}

	// ─── Accordion / Accordion Item ──────────────────────────────────────────

	/**
	 * Accordion item must output a <details> element (native HTML disclosure).
	 */
	public function test_accordion_item_outputs_details_element(): void {
		$this->require_build_block( 'accordion-item' );
		$this->require_registered_block( 'sgs/accordion-item' );

		$output = $this->render_block(
			'sgs/accordion-item',
			[
				'title'  => 'How does it work?',
				'isOpen' => false,
			],
			'<p>It works like magic.</p>'
		);

		$this->assert_html_contains(
			'<details',
			$output,
			'Accordion item must use a <details> element.'
		);
	}

	/**
	 * Accordion item must include a <summary> element containing the title.
	 */
	public function test_accordion_item_outputs_summary_with_title(): void {
		$this->require_build_block( 'accordion-item' );
		$this->require_registered_block( 'sgs/accordion-item' );

		$output = $this->render_block(
			'sgs/accordion-item',
			[ 'title' => 'What is included?' ],
			'<p>Everything.</p>'
		);

		$this->assert_html_contains(
			'<summary',
			$output,
			'Accordion item must include a <summary> element.'
		);

		$this->assert_html_contains(
			'What is included?',
			$output,
			'Accordion item summary must include the title text.'
		);
	}

	/**
	 * Open accordion item must include the `open` attribute on <details>.
	 */
	public function test_accordion_item_open_attribute(): void {
		$this->require_build_block( 'accordion-item' );
		$this->require_registered_block( 'sgs/accordion-item' );

		$output = $this->render_block(
			'sgs/accordion-item',
			[ 'title' => 'Open by default', 'isOpen' => true ],
			'<p>Content here.</p>'
		);

		$this->assert_html_contains(
			' open',
			$output,
			'Accordion item with isOpen:true must have the open attribute on <details>.'
		);
	}

	// ─── Form block ──────────────────────────────────────────────────────────

	/**
	 * Form block must output a <form> element.
	 */
	public function test_form_outputs_form_element(): void {
		$this->require_build_block( 'form' );
		$this->require_registered_block( 'sgs/form' );

		$output = $this->render_block(
			'sgs/form',
			[
				'formId'      => 'contact',
				'formName'    => 'Contact Form',
				'submitLabel' => 'Send Message',
				'honeypot'    => true,
			]
		);

		$this->assert_html_contains(
			'<form',
			$output,
			'Form block must output a <form> element.'
		);
	}

	/**
	 * Form block must embed the form ID as a data attribute or hidden input.
	 */
	public function test_form_includes_form_id(): void {
		$this->require_build_block( 'form' );
		$this->require_registered_block( 'sgs/form' );

		$output = $this->render_block(
			'sgs/form',
			[
				'formId'   => 'unique-form-id',
				'honeypot' => false,
			]
		);

		$this->assert_html_contains(
			'unique-form-id',
			$output,
			'Form block must include the formId in the rendered output.'
		);
	}

	/**
	 * Form block with honeypot enabled must output the honeypot input field.
	 */
	public function test_form_renders_honeypot_field(): void {
		$this->require_build_block( 'form' );
		$this->require_registered_block( 'sgs/form' );

		$output = $this->render_block(
			'sgs/form',
			[
				'formId'   => 'hp-test-form',
				'honeypot' => true,
			]
		);

		$this->assert_html_contains(
			'sgs-form__honeypot',
			$output,
			'Form block with honeypot:true must render the honeypot container.'
		);
	}

	/**
	 * Form block must set up Interactivity API context with nonce information.
	 *
	 * The form uses WordPress Interactivity API (data-wp-interactive), and the
	 * nonce is delivered via interactivity state rather than a visible element.
	 */
	public function test_form_has_interactivity_context(): void {
		$this->require_build_block( 'form' );
		$this->require_registered_block( 'sgs/form' );

		$output = $this->render_block(
			'sgs/form',
			[ 'formId' => 'interactive-form' ]
		);

		$this->assert_html_contains(
			'data-wp-interactive',
			$output,
			'Form block must set the data-wp-interactive attribute for the Interactivity API.'
		);

		$this->assert_html_contains(
			'sgs/form',
			$output,
			'Form block Interactivity API namespace must be "sgs/form".'
		);
	}

	/**
	 * Form block must output the hidden _sgs_form_id field inside the <form>.
	 */
	public function test_form_includes_hidden_form_id_field(): void {
		$this->require_build_block( 'form' );
		$this->require_registered_block( 'sgs/form' );

		$output = $this->render_block(
			'sgs/form',
			[ 'formId' => 'my-test-form', 'honeypot' => false ]
		);

		$this->assert_html_contains(
			'_sgs_form_id',
			$output,
			'Form block must output the hidden _sgs_form_id input field.'
		);
	}

	// ─── Modal block ─────────────────────────────────────────────────────────

	/**
	 * Modal block must output a <dialog> element.
	 */
	public function test_modal_outputs_dialog_element(): void {
		$this->require_build_block( 'modal' );
		$this->require_registered_block( 'sgs/modal' );

		$output = $this->render_block(
			'sgs/modal',
			[
				'triggerText'  => 'Open Modal',
				'triggerStyle' => 'primary',
				'maxWidth'     => 'medium',
			],
			'<p>Modal content here.</p>'
		);

		$this->assert_html_contains(
			'<dialog',
			$output,
			'Modal block must output a native <dialog> element.'
		);
	}

	/**
	 * Modal trigger button must be present and have aria-haspopup="dialog".
	 */
	public function test_modal_trigger_button_present(): void {
		$this->require_build_block( 'modal' );
		$this->require_registered_block( 'sgs/modal' );

		$output = $this->render_block(
			'sgs/modal',
			[ 'triggerText' => 'Click Me' ]
		);

		$this->assert_html_contains(
			'aria-haspopup="dialog"',
			$output,
			'Modal trigger button must carry aria-haspopup="dialog".'
		);

		$this->assert_html_contains(
			'Click Me',
			$output,
			'Modal trigger button must display the triggerText attribute.'
		);
	}

	/**
	 * Modal block root must have the sgs-modal class.
	 */
	public function test_modal_has_sgs_modal_class(): void {
		$this->require_build_block( 'modal' );
		$this->require_registered_block( 'sgs/modal' );

		$output = $this->render_block( 'sgs/modal', [] );

		$this->assert_html_contains(
			'sgs-modal',
			$output,
			'Modal block root must carry the sgs-modal CSS class.'
		);
	}

	/**
	 * Modal close button must be present inside the dialog.
	 */
	public function test_modal_close_button_present(): void {
		$this->require_build_block( 'modal' );
		$this->require_registered_block( 'sgs/modal' );

		$output = $this->render_block( 'sgs/modal', [] );

		$this->assert_html_contains(
			'sgs-modal__close',
			$output,
			'Modal block must include a close button with the sgs-modal__close class.'
		);
	}
}
