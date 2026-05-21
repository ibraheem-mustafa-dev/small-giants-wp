<?php
/**
 * Plugin Name: SGS Blocks
 * Plugin URI:  https://smallgiants.studio
 * Description: Custom Gutenberg block library for Small Giants Studio client sites.
 * Version:     0.1.1
 * Author:      Small Giants Studio
 * Author URI:  https://smallgiants.studio
 * Text Domain: sgs-blocks
 * Domain Path: /languages
 * Requires at least: 6.7
 * Requires PHP: 8.0
 * License:     GPL-2.0-or-later
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Composer autoloader — spatie/color, league/csv, nesbot/carbon.
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

define( 'SGS_BLOCKS_VERSION', '0.1.2' );
define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

// Composer autoloader (fallback — theme provides these when SGS theme is active).
if ( file_exists( SGS_BLOCKS_PATH . 'vendor/autoload.php' ) ) {
	require_once SGS_BLOCKS_PATH . 'vendor/autoload.php';
}

// Colour helpers — use theme's version if available, else load own copy.
if ( ! function_exists( 'SGS\Theme\sgs_generate_palette' ) ) {
	require_once SGS_BLOCKS_PATH . 'includes/colour-helpers.php';
}

require_once SGS_BLOCKS_PATH . 'includes/class-sgs-blocks.php';
require_once SGS_BLOCKS_PATH . 'includes/block-categories.php';

// Form processing classes.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-activator.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-processor.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-upload.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-api.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-admin.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-privacy.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/field-render-helpers.php';

// Schema output filters.
require_once SGS_BLOCKS_PATH . 'includes/review-schema.php';

// Heading anchor injection for Table of Contents.
require_once SGS_BLOCKS_PATH . 'includes/heading-anchors.php';

// Device visibility — server-side class injection for show/hide per device.
require_once SGS_BLOCKS_PATH . 'includes/device-visibility.php';

// Conditional visibility — server-side block suppression by rules (login, date, etc).
require_once SGS_BLOCKS_PATH . 'includes/conditional-visibility.php';

// Universal hover effects — server-side CSS variable injection.
require_once SGS_BLOCKS_PATH . 'includes/hover-effects.php';

// Animation attributes — server-side data-attribute injection for scroll reveals.
require_once SGS_BLOCKS_PATH . 'includes/animation-attributes.php';

// Custom CSS per block — server-side scoped <style> output.
require_once SGS_BLOCKS_PATH . 'includes/custom-css.php';

// Parallax scroll — server-side class, custom property, and data-attribute injection.
require_once SGS_BLOCKS_PATH . 'includes/parallax.php';

// Global block defaults — REST API for save/load per-block defaults.
require_once SGS_BLOCKS_PATH . 'includes/block-defaults.php';

// Google Reviews settings and API integration.
require_once SGS_BLOCKS_PATH . 'includes/google-reviews-settings.php';

// Trustpilot Reviews shared helpers (score label, asset URL, relative date).
require_once SGS_BLOCKS_PATH . 'includes/trustpilot-helpers.php';

// Trustpilot Sync — admin settings, REST endpoint, WP-cron, scrape logic.
require_once SGS_BLOCKS_PATH . 'includes/trustpilot/class-trustpilot-sync.php';
require_once SGS_BLOCKS_PATH . 'includes/trustpilot/class-trustpilot-rest.php';
require_once SGS_BLOCKS_PATH . 'includes/trustpilot/class-trustpilot-cron.php';
require_once SGS_BLOCKS_PATH . 'includes/trustpilot/class-trustpilot-settings.php';
Trustpilot\Trustpilot_REST::register();
Trustpilot\Trustpilot_Cron::register();
Trustpilot\Trustpilot_Settings::register();

// Stripe payment settings and PaymentIntent AJAX handler.
require_once SGS_BLOCKS_PATH . 'includes/stripe-settings.php';
Stripe_Settings::init();

// Mobile nav block patterns (6 presets).
require_once SGS_BLOCKS_PATH . 'includes/mobile-nav-patterns.php';

// Google Fonts catalogue — registers ~1,900 fonts in the editor's Manage fonts modal.
// Zero frontend cost: fonts are only enqueued when an operator explicitly installs them.
require_once SGS_BLOCKS_PATH . 'includes/class-font-collection.php';
new Font_Collection();

// Register REST API endpoints.
Forms\Form_REST_API::register();

// Variation activation REST + WP style-variation picker DELETED 2026-05-22
// (Phase 5a Decision 18). Per-site branding now flows through the per-site
// theme.json snapshot at sites/<client>/theme-snapshot.json pushed via
// plugins/sgs-blocks/scripts/push-theme-snapshot.py — no theme_mod, no REST.

// Register admin settings page (webhook URL + submissions viewer).
Forms\Form_Admin::register();

// SGS top-level admin menu (FR-S5-1) — must register BEFORE any submenu class.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-admin-menu.php';
Sgs_Admin_Menu::register();

// SGS Site Info — public store + admin settings page (FR-S4-3) + Wave 2.5 split notices class.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin-fields.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin-notices.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin.php';
Sgs_Site_Info::register();
Sgs_Site_Info_Admin::register();

// SGS existing-site safety guard (FR-S7-3) — gates seeding on plugin upgrade.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-migrations.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-safety-guard.php';
Sgs_Safety_Guard::register();

// SGS template-part seeder (FR-S2-1) — seeds wp_template_part records on variation activation.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-meta.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-seeder.php';
Sgs_Template_Part_Meta::register();
Sgs_Template_Part_Seeder::register();

// SGS conditional header rules (FR-S3-2) — pre_render_block filter + admin UI + ReDoS guard.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-rules-redos-guard.php'; // Must load before main engine.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-rules.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-rules-admin.php';
Sgs_Header_Rules::register();
Sgs_Header_Rules_Admin::register();

// SGS header behaviours (F1+F2+F4, Phase 2A) — class injector + asset enqueuer.
// Must load after Sgs_Header_Rules::register() so the sgs_header_rule_resolved filter point exists.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-behaviours.php';
Sgs_Header_Behaviours::register();

// SGS conditional footer rules (FR-S3-3) — mirror of header rules for the footer area.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-rules.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-rules-admin.php';
Sgs_Footer_Rules::register();
Sgs_Footer_Rules_Admin::register();

// SGS style variation picker DELETED 2026-05-22 (Phase 5a Decision 18).
// class-sgs-variation-picker.php + class-sgs-legacy-theme-mod-migrator.php
// archived at plugins/sgs-blocks/_retired/. WP style variations are no longer
// the per-site branding mechanism — see push-theme-snapshot.py instead.

// SGS template-part resetter (FR-S2-3) — admin button + public helper for FR-S5-3 CLI wrap.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-resetter.php';
Sgs_Template_Part_Resetter::register();

// SGS Advanced Headers / Footers CPTs (FR-S3-4) — REST gated to edit_theme_options (Council M1).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-block-cpts.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-rest-gate.php';
Sgs_Block_CPTs::register();
Sgs_Cpt_Rest_Gate::register();

// SGS Floating UI — Customiser controls + frontend renderer (replaces retired back-to-top + reading-progress blocks).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-customiser.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-renderer.php';
Sgs_Floating_UI_Customiser::register();
Sgs_Floating_UI_Renderer::register();

// SGS Customiser sections — Phase 5b (Decision 21) — Header / Footer / Site Info live preview.
// class-sgs-customiser-info-control.php extends WP_Customize_Control which is
// only defined in admin / customise context — load it lazily inside the
// customize_register hook (priority 1) so it never fatals on the frontend.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-customiser.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-renderer.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-customiser.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-renderer.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-customiser.php';
add_action(
	'customize_register',
	static function () {
		require_once SGS_BLOCKS_PATH . 'includes/class-sgs-customiser-info-control.php';
	},
	1
);
Sgs_Header_Customiser::register();
Sgs_Header_Renderer::register();
Sgs_Footer_Customiser::register();
Sgs_Footer_Renderer::register();
Sgs_Site_Info_Customiser::register();

// Phase 5b Decision 27 — wire View Transitions into Customiser navigation.
// WP 6.9.4 lacks wp_enqueue_view_transitions_admin_css() (WP 7.0+), so we emit
// the @view-transition rule directly via customize_controls_enqueue_scripts.
add_action(
	'customize_controls_enqueue_scripts',
	function () {
		if ( function_exists( 'wp_enqueue_view_transitions_admin_css' ) ) {
			wp_enqueue_view_transitions_admin_css();
			return;
		}
		// Fallback: inline @view-transition rule for browsers that support it.
		wp_register_style( 'sgs-customiser-view-transitions', false, array(), SGS_BLOCKS_VERSION );
		wp_enqueue_style( 'sgs-customiser-view-transitions' );
		wp_add_inline_style( 'sgs-customiser-view-transitions', '@view-transition{navigation:auto;}' );
	}
);

// Register GDPR personal data exporters and erasers.
Forms\Form_Privacy::register();

// Activation hook for database setup.
register_activation_hook( __FILE__, array( Forms\Form_Activator::class, 'activate' ) );

// Register mega menu template part area.
add_filter(
	'default_wp_template_part_areas',
	function ( $areas ) {
		$areas[] = array(
			'area'        => 'mega-menu',
			'area_tag'    => 'div',
			'label'       => __( 'Mega Menu', 'sgs-blocks' ),
			'description' => __( 'Mega menu dropdown panel content.', 'sgs-blocks' ),
			'icon'        => 'layout',
		);
		return $areas;
	}
);

// WP-CLI command surface (FR-S5-3) — loaded only when WP-CLI is active; zero frontend cost.
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cli-commands.php';
	\WP_CLI::add_command( 'sgs', Sgs_Cli_Commands::class );
}

SGS_Blocks::instance();
