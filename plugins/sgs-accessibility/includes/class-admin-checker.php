<?php
/**
 * Admin Accessibility Checker — WP admin WCAG 2.1 AA issue scanner.
 *
 * @package SGS\Accessibility
 */

namespace SGS\Accessibility;

defined( 'ABSPATH' ) || exit;

/**
 * Class Admin_Checker
 *
 * Provides a Tools → Accessibility Checker admin page and an AJAX handler
 * that fetches a published post/page and runs six WCAG 2.1 AA checks
 * against its rendered HTML via DOMDocument.
 */
class Admin_Checker {

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	public function register(): void {
		add_action( 'admin_menu', [ $this, 'add_menu_page' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'wp_ajax_sgs_a11y_check', [ $this, 'ajax_run_check' ] );
	}

	/**
	 * Register the Tools → Accessibility Checker submenu page.
	 *
	 * @return void
	 */
	public function add_menu_page(): void {
		add_management_page(
			__( 'Accessibility Checker', 'sgs-accessibility' ),
			__( 'Accessibility Checker', 'sgs-accessibility' ),
			'manage_options',
			'sgs-a11y-checker',
			[ $this, 'render_page' ]
		);
	}

	/**
	 * Enqueue admin CSS and JS only on the checker page.
	 *
	 * @param string $hook Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_assets( string $hook ): void {
		if ( 'tools_page_sgs-a11y-checker' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'sgs-a11y-admin',
			SGS_A11Y_URL . 'assets/admin.css',
			[],
			SGS_A11Y_VERSION
		);

		wp_enqueue_script(
			'sgs-a11y-admin',
			SGS_A11Y_URL . 'assets/admin.js',
			[],
			SGS_A11Y_VERSION,
			true
		);

		wp_localize_script(
			'sgs-a11y-admin',
			'sgsA11y',
			[
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'sgs_a11y_check' ),
			]
		);

		// Enqueue editor sidebar on block editor screens.
		$screen = get_current_screen();
		if ( $screen && $screen->is_block_editor() ) {
			wp_enqueue_script(
				'sgs-a11y-editor-sidebar',
				SGS_A11Y_URL . 'assets/editor-sidebar.js',
				[ 'wp-plugins', 'wp-editor', 'wp-element', 'wp-components', 'wp-data' ],
				SGS_A11Y_VERSION,
				true
			);
		}
	}

	/**
	 * Render the admin checker page HTML.
	 *
	 * @return void
	 */
	public function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$posts = get_posts( [
			'post_type'      => [ 'post', 'page' ],
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		] );
		?>
		<div class="wrap sgs-a11y-wrap">
			<h1><?php esc_html_e( 'Accessibility Checker', 'sgs-accessibility' ); ?></h1>
			<p><?php esc_html_e( 'Select a published post or page and run WCAG 2.1 AA checks against its rendered HTML.', 'sgs-accessibility' ); ?></p>

			<div class="sgs-a11y-controls">
				<label for="sgs-a11y-post-select"><?php esc_html_e( 'Select post / page:', 'sgs-accessibility' ); ?></label>
				<select id="sgs-a11y-post-select" name="post_id">
					<option value=""><?php esc_html_e( '— Choose —', 'sgs-accessibility' ); ?></option>
					<?php foreach ( $posts as $post ) : ?>
						<option value="<?php echo esc_attr( (string) $post->ID ); ?>">
							<?php echo esc_html( $post->post_title ); ?>
							(<?php echo esc_html( $post->post_type ); ?>)
						</option>
					<?php endforeach; ?>
				</select>
				<button id="sgs-a11y-run" class="button button-primary" type="button">
					<?php esc_html_e( 'Run Check', 'sgs-accessibility' ); ?>
				</button>
			</div>

			<div id="sgs-a11y-spinner" class="sgs-a11y-spinner" style="display:none;" aria-live="polite">
				<?php esc_html_e( 'Running checks…', 'sgs-accessibility' ); ?>
			</div>

			<div id="sgs-a11y-results" role="region" aria-label="<?php esc_attr_e( 'Accessibility check results', 'sgs-accessibility' ); ?>"></div>
		</div>
		<?php
	}

	/**
	 * AJAX handler: fetch page HTML and run all WCAG checks.
	 *
	 * @return void
	 */
	public function ajax_run_check(): void {
		check_ajax_referer( 'sgs_a11y_check', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => __( 'Insufficient permissions.', 'sgs-accessibility' ) ] );
		}

		$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
		if ( ! $post_id ) {
			wp_send_json_error( [ 'message' => __( 'Invalid post ID.', 'sgs-accessibility' ) ] );
		}

		$url = get_permalink( $post_id );
		if ( ! $url ) {
			wp_send_json_error( [ 'message' => __( 'Could not resolve permalink.', 'sgs-accessibility' ) ] );
		}

		$response = wp_remote_get( $url, [
			'timeout'    => 15,
			'user-agent' => 'SGS-Accessibility-Checker/1.0',
		] );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( [ 'message' => $response->get_error_message() ] );
		}

		$html   = wp_remote_retrieve_body( $response );
		$issues = $this->run_checks( $html );

		wp_send_json_success( [
			'url'    => esc_url( $url ),
			'issues' => $issues,
		] );
	}

	/**
	 * Run all WCAG checks against the provided HTML string.
	 *
	 * @param string $html Raw HTML from the fetched page.
	 * @return array<int, array{severity: string, criterion: string, issue: string, snippet: string}> List of issues found.
	 */
	public function run_checks( string $html ): array {
		$issues = [];

		libxml_use_internal_errors( true );
		$dom = new \DOMDocument();
		$dom->loadHTML( '<?xml encoding="utf-8" ?>' . $html );
		libxml_clear_errors();

		$xpath = new \DOMXPath( $dom );

		// 1. Page language.
		$html_nodes = $xpath->query( '//html' );
		if ( $html_nodes && $html_nodes->length > 0 ) {
			/** @var \DOMElement $html_node */
			$html_node = $html_nodes->item( 0 );
			$lang      = $html_node->getAttribute( 'lang' );
			if ( '' === trim( $lang ) ) {
				$issues[] = [
					'severity'  => 'Error',
					'criterion' => '3.1.1 Language of Page',
					'issue'     => 'The <html> element is missing a lang attribute.',
					'snippet'   => '<html>',
				];
			}
		}

		// 2. Images missing alt text.
		$imgs = $xpath->query( '//img' );
		if ( $imgs ) {
			foreach ( $imgs as $img ) {
				/** @var \DOMElement $img */
				if ( ! $img->hasAttribute( 'alt' ) ) {
					$issues[] = [
						'severity'  => 'Error',
						'criterion' => '1.1.1 Non-text Content',
						'issue'     => 'Image is missing an alt attribute.',
						'snippet'   => $this->get_opening_tag( $img ),
					];
				} elseif ( '' === trim( $img->getAttribute( 'alt' ) ) ) {
					// Empty alt is valid for decorative images but flag as warning for review.
					$issues[] = [
						'severity'  => 'Warning',
						'criterion' => '1.1.1 Non-text Content',
						'issue'     => 'Image has an empty alt attribute — confirm it is decorative.',
						'snippet'   => $this->get_opening_tag( $img ),
					];
				}
			}
		}

		// 3. Empty links.
		$links = $xpath->query( '//a' );
		if ( $links ) {
			foreach ( $links as $link ) {
				/** @var \DOMElement $link */
				$text       = trim( $link->textContent );
				$aria_label = trim( $link->getAttribute( 'aria-label' ) );
				$aria_lby   = trim( $link->getAttribute( 'aria-labelledby' ) );

				if ( '' === $text && '' === $aria_label && '' === $aria_lby ) {
					// Check for child img with alt.
					$child_imgs = $link->getElementsByTagName( 'img' );
					$has_img_alt = false;
					foreach ( $child_imgs as $ci ) {
						/** @var \DOMElement $ci */
						if ( '' !== trim( $ci->getAttribute( 'alt' ) ) ) {
							$has_img_alt = true;
							break;
						}
					}
					if ( ! $has_img_alt ) {
						$issues[] = [
							'severity'  => 'Error',
							'criterion' => '2.4.4 Link Purpose',
							'issue'     => 'Link has no accessible name (empty text, no aria-label).',
							'snippet'   => $this->get_opening_tag( $link ),
						];
					}
				}
			}
		}

		// 4. Empty buttons.
		$buttons = $xpath->query( '//button' );
		if ( $buttons ) {
			foreach ( $buttons as $button ) {
				/** @var \DOMElement $button */
				$text       = trim( $button->textContent );
				$aria_label = trim( $button->getAttribute( 'aria-label' ) );
				$aria_lby   = trim( $button->getAttribute( 'aria-labelledby' ) );
				$title      = trim( $button->getAttribute( 'title' ) );

				if ( '' === $text && '' === $aria_label && '' === $aria_lby && '' === $title ) {
					$issues[] = [
						'severity'  => 'Error',
						'criterion' => '4.1.2 Name, Role, Value',
						'issue'     => 'Button has no accessible name (empty text, no aria-label).',
						'snippet'   => $this->get_opening_tag( $button ),
					];
				}
			}
		}

		// 5. Missing form labels.
		$inputs = $xpath->query( '//input[not(@type="hidden") and not(@type="submit") and not(@type="button") and not(@type="reset") and not(@type="image")]' );
		if ( $inputs ) {
			foreach ( $inputs as $input ) {
				/** @var \DOMElement $input */
				$id         = $input->getAttribute( 'id' );
				$aria_label = trim( $input->getAttribute( 'aria-label' ) );
				$aria_lby   = trim( $input->getAttribute( 'aria-labelledby' ) );
				$title      = trim( $input->getAttribute( 'title' ) );

				if ( '' !== $aria_label || '' !== $aria_lby || '' !== $title ) {
					continue;
				}

				// Check for associated <label for="...">
				$has_label = false;
				if ( '' !== $id ) {
					$labels = $xpath->query( '//label[@for="' . addslashes( $id ) . '"]' );
					if ( $labels && $labels->length > 0 ) {
						$has_label = true;
					}
				}

				if ( ! $has_label ) {
					$issues[] = [
						'severity'  => 'Error',
						'criterion' => '1.3.1 Info and Relationships',
						'issue'     => 'Form input has no associated label.',
						'snippet'   => $this->get_opening_tag( $input ),
					];
				}
			}
		}

		// 6. Heading hierarchy.
		$headings = $xpath->query( '//h1|//h2|//h3|//h4|//h5|//h6' );
		if ( $headings && $headings->length > 0 ) {
			$levels    = [];
			foreach ( $headings as $heading ) {
				$levels[] = (int) substr( $heading->nodeName, 1 );
			}
			$prev = $levels[0];
			foreach ( array_slice( $levels, 1 ) as $level ) {
				if ( $level > $prev + 1 ) {
					$issues[] = [
						'severity'  => 'Warning',
						'criterion' => '1.3.1 Info and Relationships',
						'issue'     => sprintf(
							'Heading level skipped: H%d followed by H%d.',
							$prev,
							$level
						),
						'snippet'   => '<h' . $level . '>',
					];
				}
				$prev = $level;
			}
		}

		return $issues;
	}

	/**
	 * Serialize the opening tag of a DOMElement as a concise snippet.
	 *
	 * @param \DOMElement $node The element to inspect.
	 * @return string HTML opening tag string (truncated for display).
	 */
	private function get_opening_tag( \DOMElement $node ): string {
		$tag   = '<' . $node->nodeName;
		$attrs = [];
		if ( $node->hasAttributes() ) {
			foreach ( $node->attributes as $attr ) {
				$val    = esc_attr( $attr->value );
				$attrs[] = $attr->name . '="' . $val . '"';
			}
		}
		if ( $attrs ) {
			$tag .= ' ' . implode( ' ', $attrs );
		}
		$tag .= '>';

		// Truncate very long snippets.
		if ( mb_strlen( $tag ) > 120 ) {
			$tag = mb_substr( $tag, 0, 117 ) . '…>';
		}

		return $tag;
	}
}
