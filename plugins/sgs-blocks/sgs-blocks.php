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

// Variation activation REST — sgs/v1/active-variation endpoint used by
// /sgs-clone Stage 10 to flip active_theme_style on deploy.
// Shipped 2026-05-20 per Pipeline Root-Gap Council R1.
require_once SGS_BLOCKS_PATH . 'includes/class-variation-rest.php';
Variation_REST::register();

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

// SGS style variation picker (FR-S5-2) — Council N1 resolver-only activation + legacy theme_mod backup.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-legacy-theme-mod-migrator.php'; // Must load before picker (P-S17-W3-VARIATION-PICKER-SPLIT).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-variation-picker.php';
Sgs_Variation_Picker::register();

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
