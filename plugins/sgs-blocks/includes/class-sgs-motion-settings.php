<?php
/**
 * SGS → Motion settings page (Spec 38 §7 / FR-38-18, D422).
 *
 * Site-LEVEL motion capabilities live here rather than in a block inspector,
 * because they describe the whole site and there is no block to attach them to.
 * Spec 38 §7 is explicit about that placement.
 *
 * One option row holds every site-level motion setting
 * (`sgs_motion_settings`), so adding page transitions later is a new key
 * rather than a second option and a second sanitiser.
 *
 * Read-side defaulting lives on {@see SGS_Motion_Registry::settings()} — the
 * frontend must never depend on this admin class being loaded.
 *
 * @package SGS\Blocks
 * @since   1.18.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Settings
 */
final class Sgs_Motion_Settings {

	const OPTION_KEY = 'sgs_motion_settings';
	const PAGE_SLUG  = 'sgs-motion';
	const CAP        = 'manage_options';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_init', array( __CLASS__, 'register_setting' ) );
		\add_action( 'admin_menu', array( __CLASS__, 'add_page' ), 20 );
		\add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_admin_assets' ) );
	}

	/**
	 * Page hook returned by add_submenu_page(), so the dependent-control script
	 * loads on THIS screen only rather than across wp-admin.
	 *
	 * @var string
	 */
	private static $page_hook = '';

	/**
	 * Enqueue the dependent-control script on this settings screen only.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public static function enqueue_admin_assets( string $hook ): void {
		if ( '' === self::$page_hook || $hook !== self::$page_hook ) {
			return;
		}

		$rel = 'assets/admin/motion-settings.js';
		if ( ! \file_exists( SGS_BLOCKS_PATH . $rel ) ) {
			return;
		}

		\wp_enqueue_script(
			'sgs-motion-settings',
			SGS_BLOCKS_URL . $rel,
			array(),
			SGS_BLOCKS_VERSION,
			true
		);
	}

	/**
	 * Register the option with a strict sanitiser.
	 *
	 * @return void
	 */
	public static function register_setting(): void {
		\register_setting(
			'sgs_motion',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise' ),
				'default'           => array(
					'smooth_scroll'             => false,
					'smooth_scroll_strength'    => 3,
					'page_transitions'          => false,
					'page_transition_style'     => 'fade',
					'animate_product_filtering' => false,
					'treatment_palette_base'    => 'primary',
				),
			)
		);
	}

	/**
	 * Sanitise the whole settings array.
	 *
	 * An absent checkbox is how HTML says "off", so `smooth_scroll` is derived
	 * from presence, never from a submitted falsy value. Strength is clamped to
	 * the 1–5 the control offers — a value outside it could only arrive from a
	 * hand-crafted POST or WP-CLI, and the frontend maps it into a physics
	 * constant, so it is clamped rather than trusted.
	 *
	 * @param mixed $value Submitted value.
	 * @return array
	 */
	public static function sanitise( $value ): array {
		$value = \is_array( $value ) ? $value : array();

		$strength = isset( $value['smooth_scroll_strength'] )
			? (int) $value['smooth_scroll_strength']
			: 3;

		if ( $strength < 1 || $strength > 5 ) {
			$strength = 3;
		}

		$touch_strength = isset( $value['smooth_touch_strength'] )
			? (int) $value['smooth_touch_strength']
			: 1;

		if ( $touch_strength < 1 || $touch_strength > 5 ) {
			$touch_strength = 1;
		}

		// Page transitions (FR-38-19). The style names reach a CSS
		// animation-name, so an unknown value is replaced rather than stored.
		$style = isset( $value['page_transition_style'] )
			? (string) $value['page_transition_style']
			: 'fade';

		if ( ! \in_array( $style, SGS_Motion_Registry::transition_styles(), true ) ) {
			$style = 'fade';
		}

		// Treatment colour source (Tier W grain/halftone/duotone, D-treatment-palette-base).
		// This reaches a CSS custom-property NAME (`--wp--preset--color--<slug>`),
		// so — same as `page_transition_style` above — an unknown value is
		// replaced rather than stored. A valid WordPress preset slug is
		// `[a-z0-9-]+` only; anything else falls back to `'primary'`.
		$treatment_palette_base = isset( $value['treatment_palette_base'] )
			? (string) $value['treatment_palette_base']
			: 'primary';

		if ( ! \preg_match( '/^[a-z0-9-]+$/', $treatment_palette_base ) ) {
			$treatment_palette_base = 'primary';
		}

		return array(
			'smooth_scroll'             => ! empty( $value['smooth_scroll'] ),
			'smooth_scroll_strength'    => $strength,
			'smooth_touch'              => ! empty( $value['smooth_touch'] ),
			'smooth_touch_strength'     => $touch_strength,
			'page_transitions'          => ! empty( $value['page_transitions'] ),
			'page_transition_style'     => $style,
			// Shared with the read side rather than duplicated: one definition
			// of what a valid override is, so the two can never disagree.
			'page_transition_templates' => SGS_Motion_Registry::sanitise_template_styles(
				$value['page_transition_templates'] ?? array()
			),
			// FR-38-12 (redirected 2026-08-20). A plain checkbox presence
			// test, same as every other boolean setting on this page.
			'animate_product_filtering' => ! empty( $value['animate_product_filtering'] ),
			'treatment_palette_base'    => $treatment_palette_base,
		);
	}

	/**
	 * The site's registered palette slugs, as slug => name.
	 *
	 * Enumerated from the active theme rather than hard-coded, so this control
	 * is correct on any client site without an edit — the same discipline
	 * `templates()` below already follows for page templates. Merges the
	 * theme/default/custom origins `wp_get_global_settings()` can return and
	 * de-duplicates by slug (first origin wins), mirroring
	 * `sgs_resolve_palette_hex()` in `helpers-colour-wcag.php`.
	 *
	 * @return array<string, string>
	 */
	private static function palette_slugs(): array {
		$out = array();

		$palette = \wp_get_global_settings( array( 'color', 'palette' ) );

		// wp_get_global_settings() may return the palette keyed by origin
		// (default/theme/custom) or, in some WP versions, a flat list.
		$lists = array();
		if ( \is_array( $palette ) && ( isset( $palette['custom'] ) || isset( $palette['theme'] ) || isset( $palette['default'] ) ) ) {
			foreach ( array( 'theme', 'custom', 'default' ) as $origin ) {
				if ( ! empty( $palette[ $origin ] ) && \is_array( $palette[ $origin ] ) ) {
					$lists[] = $palette[ $origin ];
				}
			}
		} elseif ( \is_array( $palette ) ) {
			$lists[] = $palette;
		}

		foreach ( $lists as $list ) {
			foreach ( $list as $entry ) {
				if ( ! \is_array( $entry ) || ! isset( $entry['slug'] ) ) {
					continue;
				}

				$slug = (string) $entry['slug'];
				if ( isset( $out[ $slug ] ) ) {
					continue;
				}

				$out[ $slug ] = ! empty( $entry['name'] ) ? (string) $entry['name'] : $slug;
			}
		}

		return $out;
	}

	/**
	 * The style menu, as value => human label, in menu order.
	 *
	 * The VALUES come from SGS_Motion_Registry::transition_styles() — the one
	 * source of truth — rather than a second list maintained here. A style
	 * present in the admin's list but absent from the registry's would be
	 * accepted, stored, and then silently coerced back to the default on every
	 * frontend read: a setting that looks saved and does nothing.
	 *
	 * A style with no label falls back to its own key, so adding one to the
	 * registry surfaces it here immediately (unlabelled, but functional and
	 * visible) instead of vanishing from the menu.
	 *
	 * `none` is a real choice at both levels: site-wide it means the feature is
	 * configured but currently silent; per template it means this one template
	 * opts out while the rest transition.
	 *
	 * @return array<string, string>
	 */
	private static function style_labels(): array {
		$labels = array(
			'fade'  => \__( 'Fade', 'sgs-blocks' ),
			'slide' => \__( 'Slide', 'sgs-blocks' ),
			'none'  => \__( 'No transition', 'sgs-blocks' ),
		);

		$menu = array();
		foreach ( SGS_Motion_Registry::transition_styles() as $style ) {
			$menu[ $style ] = $labels[ $style ] ?? $style;
		}

		return $menu;
	}

	/**
	 * The theme's page templates, as slug => title.
	 *
	 * Enumerated from the theme rather than hard-coded, so this page is correct
	 * on any client site without an edit — the same DB/source-first discipline
	 * the rest of the framework follows. Template PARTS are excluded: a header
	 * or footer is not a navigable destination and has no transition of its own.
	 *
	 * @return array<string, string>
	 */
	private static function templates(): array {
		$templates = \get_block_templates( array(), 'wp_template' );
		$out       = array();

		foreach ( (array) $templates as $template ) {
			if ( empty( $template->slug ) ) {
				continue;
			}

			$title = '';
			if ( ! empty( $template->title ) ) {
				$title = \is_string( $template->title )
					? $template->title
					: (string) ( $template->title->rendered ?? '' );
			}

			$out[ (string) $template->slug ] = '' !== $title
				? $title
				: (string) $template->slug;
		}

		\ksort( $out );

		return $out;
	}

	/**
	 * Add the submenu page under the SGS menu.
	 *
	 * @return void
	 */
	public static function add_page(): void {
		self::$page_hook = (string) \add_submenu_page(
			'sgs',
			\__( 'Motion', 'sgs-blocks' ),
			\__( 'Motion', 'sgs-blocks' ),
			self::CAP,
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die(
				\esc_html__( 'You do not have permission to access this page.', 'sgs-blocks' ),
				'',
				array( 'response' => 403 )
			);
		}

		$settings = SGS_Motion_Registry::settings();
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'SGS — Motion', 'sgs-blocks' ); ?></h1>

			<form method="post" action="options.php">
				<?php \settings_fields( 'sgs_motion' ); ?>

				<h2><?php \esc_html_e( 'Smooth scrolling', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Gives scrolling a slight weight, so the page eases to a stop instead of stopping dead. It is the effect used on high-end agency sites. Off by default — when it is off, none of its code is sent to the browser at all.', 'sgs-blocks' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Smooth scrolling', 'sgs-blocks' ); ?></th>
							<td>
								<label>
									<input
										type="checkbox"
										id="sgs-smooth-scroll-toggle"
										name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_scroll]"
										value="1"
										<?php \checked( true, $settings['smooth_scroll'] ); ?>
									/>
									<?php \esc_html_e( 'Turn on smooth scrolling for this site', 'sgs-blocks' ); ?>
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="sgs-smooth-strength"><?php \esc_html_e( 'Strength', 'sgs-blocks' ); ?></label>
							</th>
							<td>
								<input
									type="range"
									id="sgs-smooth-strength"
									name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_scroll_strength]"
									min="1"
									max="5"
									step="1"
									value="<?php echo \esc_attr( (string) $settings['smooth_scroll_strength'] ); ?>"
								/>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( '1 is barely noticeable, 5 is heavy and cinematic. 3 is the recommended starting point. Heavier settings feel more dramatic but can feel sluggish to visitors who scroll quickly.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Touch devices', 'sgs-blocks' ); ?></th>
							<td>
								<label>
									<input
										type="checkbox"
										id="sgs-smooth-touch-toggle"
										name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_touch]"
										value="1"
										<?php \checked( true, $settings['smooth_touch'] ); ?>
									/>
									<?php \esc_html_e( 'Also smooth scrolling on phones and tablets', 'sgs-blocks' ); ?>
								</label>
								<p class="description" style="max-width:44rem">
									<strong><?php \esc_html_e( 'Not recommended — tested and rejected on a real device.', 'sgs-blocks' ); ?></strong>
									<?php \esc_html_e( 'Phones already have their own scrolling, and visitors have years of muscle memory for how it feels. Replacing it is the single most common reason people describe a site as laggy, and it is felt most by anyone prone to motion sickness. This was tried on a real phone at the lightest setting (strength 1) on 30 July 2026 and judged abrupt and janky — worse than leaving it off, not better. It is kept here as a deliberate choice for the rare case that wants it, not as a suggestion. If you do switch it on, start at 1 and check it on an actual phone, never a desktop browser at a narrow width.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="sgs-smooth-touch-strength"><?php \esc_html_e( 'Touch strength', 'sgs-blocks' ); ?></label>
							</th>
							<td>
								<input
									type="range"
									id="sgs-smooth-touch-strength"
									name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[smooth_touch_strength]"
									min="1"
									max="5"
									step="1"
									value="<?php echo \esc_attr( (string) $settings['smooth_touch_strength'] ); ?>"
								/>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( '1 is a light touch — smooth, but still close to how the phone normally feels. This is the recommended setting if you use it at all. Higher values increasingly override the phone\'s own scrolling; 5 is heavy and most people will not like it.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<h2><?php \esc_html_e( 'Who does not get this', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Smooth scrolling is switched off automatically, with no action needed from you, for: visitors whose device asks for reduced motion (a health setting people use for motion sickness and migraine); and the block editor and all admin screens. Touch devices keep their own native scrolling unless you switch on the touch setting above. Your header, anchor links and in-page search are unaffected either way.', 'sgs-blocks' ); ?>
				</p>

				<h2><?php \esc_html_e( 'Page transitions', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Softens the jump between pages: instead of the next page appearing instantly, the browser blends from one to the other as the visitor clicks through. It is done entirely by the browser itself — no extra code is downloaded to make it work, and a browser that does not support it simply loads the next page as normal. Off by default.', 'sgs-blocks' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Page transitions', 'sgs-blocks' ); ?></th>
							<td>
								<label>
									<input
										type="checkbox"
										id="sgs-page-transitions-toggle"
										name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[page_transitions]"
										value="1"
										<?php \checked( true, $settings['page_transitions'] ); ?>
									/>
									<?php \esc_html_e( 'Turn on page transitions for this site', 'sgs-blocks' ); ?>
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row">
								<label for="sgs-page-transition-style"><?php \esc_html_e( 'Style', 'sgs-blocks' ); ?></label>
							</th>
							<td>
								<select
									id="sgs-page-transition-style"
									class="sgs-page-transition-style"
									name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[page_transition_style]"
								>
									<?php foreach ( self::style_labels() as $value => $label ) : ?>
										<option
											value="<?php echo \esc_attr( $value ); ?>"
											<?php \selected( $value, $settings['page_transition_style'] ); ?>
										>
											<?php echo \esc_html( $label ); ?>
										</option>
									<?php endforeach; ?>
								</select>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( 'Fade is the recommended choice — it signals that a new page has arrived without moving anything across the screen, which is the part that can make people feel unwell. Slide adds a small sideways shift as well; it is more noticeable, and better kept for one or two templates than used everywhere.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<?php $templates = self::templates(); ?>
				<?php if ( ! empty( $templates ) ) : ?>
					<h3><?php \esc_html_e( 'Per page type', 'sgs-blocks' ); ?></h3>
					<p style="max-width:46rem">
						<?php \esc_html_e( 'Optional. Each of your page types can use a different style, or none at all. Leave them on "Use site style" unless you want a specific one to behave differently.', 'sgs-blocks' ); ?>
						<br />
						<?php \esc_html_e( 'One thing worth knowing: a transition needs BOTH the page being left and the page being opened to have one. So if you set a page type to "No transition", clicking into it or out of it will be an ordinary instant load.', 'sgs-blocks' ); ?>
					</p>

					<table class="form-table" role="presentation">
						<tbody>
							<?php foreach ( $templates as $slug => $title ) : ?>
								<?php $field_id = 'sgs-vt-template-' . $slug; ?>
								<tr>
									<th scope="row">
										<label for="<?php echo \esc_attr( $field_id ); ?>">
											<?php echo \esc_html( $title ); ?>
										</label>
									</th>
									<td>
										<select
											id="<?php echo \esc_attr( $field_id ); ?>"
											class="sgs-page-transition-style"
											name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[page_transition_templates][<?php echo \esc_attr( $slug ); ?>]"
										>
											<option value=""><?php \esc_html_e( 'Use site style', 'sgs-blocks' ); ?></option>
											<?php foreach ( self::style_labels() as $value => $label ) : ?>
												<option
													value="<?php echo \esc_attr( $value ); ?>"
													<?php \selected( $value, $settings['page_transition_templates'][ $slug ] ?? '' ); ?>
												>
													<?php echo \esc_html( $label ); ?>
												</option>
											<?php endforeach; ?>
										</select>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>
				<?php endif; ?>

				<p style="max-width:46rem">
					<?php \esc_html_e( 'Page transitions are switched off automatically for visitors whose device asks for reduced motion, and they never run in the block editor or admin screens.', 'sgs-blocks' ); ?>
				</p>

				<h2><?php \esc_html_e( 'WooCommerce product filtering', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'When a visitor narrows a Product Collection block by price, attribute or rating, the product cards animate to their new positions instead of snapping instantly. Requires WooCommerce. Off by default.', 'sgs-blocks' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row"><?php \esc_html_e( 'Animate product re-filtering', 'sgs-blocks' ); ?></th>
							<td>
								<label>
									<input
										type="checkbox"
										id="sgs-animate-product-filtering-toggle"
										name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[animate_product_filtering]"
										value="1"
										<?php \checked( true, $settings['animate_product_filtering'] ); ?>
									/>
									<?php \esc_html_e( 'Animate WooCommerce product re-filtering', 'sgs-blocks' ); ?>
								</label>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( 'Applies only to the Product Collection block. Switched off automatically for visitors whose device asks for reduced motion.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<h2><?php \esc_html_e( 'Surface treatments', 'sgs-blocks' ); ?></h2>
				<p style="max-width:46rem">
					<?php \esc_html_e( 'Grain, halftone and duotone are WebGL image finishes; each derives all of its colours from a single palette colour (deepened for shadow/ink, lightened for highlight). This sets that source for the whole site. Off by default it uses your Primary colour.', 'sgs-blocks' ); ?>
				</p>

				<table class="form-table" role="presentation">
					<tbody>
						<tr>
							<th scope="row">
								<label for="sgs-treatment-palette-base"><?php \esc_html_e( 'Treatment colour source', 'sgs-blocks' ); ?></label>
							</th>
							<td>
								<?php $palette_slugs = self::palette_slugs(); ?>
								<?php if ( empty( $palette_slugs ) ) : ?>
									<?php $palette_slugs = array( 'primary' => \__( 'Primary', 'sgs-blocks' ) ); ?>
								<?php endif; ?>
								<select
									id="sgs-treatment-palette-base"
									name="<?php echo \esc_attr( self::OPTION_KEY ); ?>[treatment_palette_base]"
								>
									<?php foreach ( $palette_slugs as $slug => $name ) : ?>
										<option
											value="<?php echo \esc_attr( $slug ); ?>"
											<?php \selected( $slug, $settings['treatment_palette_base'] ); ?>
										>
											<?php echo \esc_html( $name ); ?>
										</option>
									<?php endforeach; ?>
								</select>
								<p class="description" style="max-width:44rem">
									<?php \esc_html_e( 'Grain, halftone and duotone derive their colours from this palette colour. Individual blocks can still override it.', 'sgs-blocks' ); ?>
								</p>
							</td>
						</tr>
					</tbody>
				</table>

				<?php \submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
