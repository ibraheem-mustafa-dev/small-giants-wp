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

// SGS Cart — dequeue wc-cart-fragments on pages using sgs/cart + inject REST config.
require_once SGS_BLOCKS_PATH . 'includes/wc-cart-fragments.php';

// Configurator — dequeue the redundant WooCommerce jQuery frontend stack on
// pages with a bound (wc-product) sgs/product-card (FR-27-H1 JS budget).
require_once SGS_BLOCKS_PATH . 'includes/configurator-asset-optimiser.php';

// Configurator — single registration point for all Spec 27 presentation meta
// (swatch/variesBy term_meta + gallery/per-unit/discount-label variation postmeta).
require_once SGS_BLOCKS_PATH . 'includes/class-configurator-meta.php';
Configurator_Meta::register();

// Configurator — product-level value-ladder authoring fields (Wave-2 #1/#9).
// Self-hooks woocommerce_product_options_general_product_data + the save handler
// (delegates to Configurator_Meta::save_product_fields). No-op without WooCommerce.
require_once SGS_BLOCKS_PATH . 'includes/configurator-product-fields.php';

// Demand Analytics — privacy-safe aggregate counter for unbuyable combos
// (Spec 27 Phase-2 Step 7). REST endpoint POST /sgs/v1/demand/attempt +
// admin meta-box on product edit screen. ZERO PII stored.
require_once SGS_BLOCKS_PATH . 'includes/class-demand-analytics.php';
Demand_Analytics::register();

// Turnstile — Cloudflare Turnstile helper + Settings > SGS Turnstile page.
// Provides bot-protection for public REST endpoints (Stock Notify et al.).
require_once SGS_BLOCKS_PATH . 'includes/class-turnstile.php';
Turnstile::register();

// Stock Notify — back-in-stock email capture (Spec 30 Step 10).
// REST endpoint POST /sgs/v1/notify/subscribe + product edit-screen meta-box.
// Stores ONLY email + timestamp — no IP ever persisted.
require_once SGS_BLOCKS_PATH . 'includes/class-stock-notify.php';
Stock_Notify::register();

// Configurator — swatch fields on WooCommerce attribute term screens (FR-27-B2 authoring UI).
require_once SGS_BLOCKS_PATH . 'includes/configurator-term-fields.php';

// Configurator — per-unit / unit-label / discount-label fields on the WooCommerce
// variation editor panel (FR-27-B3 authoring UI).
require_once SGS_BLOCKS_PATH . 'includes/configurator-variation-fields.php';

// Configurator — edit-safety hooks (FR-27-R3): slug-rename warning on pa_* attribute
// terms + variation-delete order warning + Configurator_Meta orphan cleanup.
require_once SGS_BLOCKS_PATH . 'includes/class-configurator-edit-safety.php';
Configurator_Edit_Safety::register();

// Configurator — <head> emitter (ProductGroup JSON-LD / canonical / OG). Step-0
// scaffold; filled by FR-27-E1/E2/E3.
require_once SGS_BLOCKS_PATH . 'includes/configurator-head.php';

// Configurator — canonical URL override for the indexed-variation escape-hatch (FR-27-E2).
require_once SGS_BLOCKS_PATH . 'includes/class-product-canonical.php';
Product_Canonical::register();

// Configurator — WP core sitemap lastmod accuracy for variable products (FR-27-E3 / SEC-6).
// Fixes the stale <lastmod> that results from variation price/stock changes not bumping
// the parent post_modified. SEC-9: no-op when Yoast / RankMath is active (they own the
// sitemap). Transient cache (6 h) busted by WooCommerce price/stock change hooks.
require_once SGS_BLOCKS_PATH . 'includes/class-product-sitemap.php';
Product_Sitemap::register();

// Page-level ItemList JSON-LD (FP-E) — ONE node per singular front-end page,
// collecting wc-product card-grids + loose wc-product product-cards from the
// queried post's block tree (recursive innerBlocks walk, document order).
// SEC-9: defers to Yoast / RankMath when active; skips when WC inactive.
// v1 limitation: blocks in template parts / synced patterns outside
// post_content are not scanned.
require_once SGS_BLOCKS_PATH . 'includes/class-product-item-list.php';
Product_Item_List::register();

// Organization + WebSite JSON-LD emitter — front page only (FR-30-9 F2).
// SEC-9: defers to any of the 7 recognised SEO plugins when active.
require_once SGS_BLOCKS_PATH . 'includes/class-org-website-schema.php';
Org_Website_Schema::register();

// Store-page noindex emitter — cart/checkout/account/WC endpoints (FR-30-9 F3).
// SEC-9: defers to active SEO plugin on cart/checkout; always noindexes account + endpoints.
require_once SGS_BLOCKS_PATH . 'includes/class-noindex-store-pages.php';
Noindex_Store_Pages::register();

// llms.txt + llms-full.txt — AI navigation files at site root (FR-27-F2 llms clause).
// Serves curated navigation map + per-product expansion in llmstxt.org shape.
// SEC-9: defers to Yoast / RankMath when active. Rate-limited 60/hr per IP.
// Content transient-cached (6 h); busted on woocommerce_update_product + save_post.
require_once SGS_BLOCKS_PATH . 'includes/class-llms-txt.php';
Llms_Txt::register();

// Animation attributes — server-side data-attribute injection for scroll reveals.
require_once SGS_BLOCKS_PATH . 'includes/animation-attributes.php';

// Custom CSS per block — server-side scoped <style> output.
require_once SGS_BLOCKS_PATH . 'includes/custom-css.php';

// Scoped-CSS consolidation (Spec 32 §6.2 / FR-32-11) — lifts every SGS block's
// per-instance <style> tag into ONE consolidated output (front end only; editor
// keeps inline). Loads AFTER custom-css.php so its render_block residual filter
// (priority 10) runs before this collector's lift filter (priority 99).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-css-registry.php';

// SGS → CSS Output settings page (choose file vs inline-head delivery + the
// recommended optimisation-plugin guidance).
require_once SGS_BLOCKS_PATH . 'includes/class-css-output-settings.php';
Css_Output_Settings::register();

// Register the JS-added sgs* extension attributes server-side (for every
// className-supporting block) so the ServerSideRender block-renderer route
// stops rejecting them with "Invalid parameter(s): attributes". Attribute list
// is generated from the extension JS by scripts/generate-extension-attributes.js.
require_once SGS_BLOCKS_PATH . 'includes/extension-attrs-rest-register.php';

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

// Lucide Icons REST bridge — registers icon collection via WP 7.0 WP_REST_Icons_Controller.
// Safe no-op on WP 6.x (class_exists guard inside). See class-sgs-lucide-icons-rest.php.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-lucide-icons-rest.php';

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

// SGS Content Types per-site capability flag (Spec 27 FR-24-1 / FR-24 #9, U1) —
// owns the `sgs_content_types` option + the manage_options toggle + the one-time
// backward-compat migration (init @1). Must register BEFORE Product_CPT so the
// migration's init @1 hook is wired before the CPT's init @5 gate reads the flag.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-content-types-settings.php';
Sgs_Content_Types_Settings::register();

// SGS Product CPT (Spec 24 FR-24-1) — sgs_product, sgs_product_cat, sgs_product_tag + meta.
// Registers ONLY when 'sgs_product' is enabled in sgs_content_types (FR-24 #9, U1).
require_once SGS_BLOCKS_PATH . 'includes/content-types/class-product-cpt.php';
Product_CPT::register();

// SGS Configurator compatibility (Spec 27 FR-27-A5, U11) — WC version floor +
// graceful read-only degradation below it + dismissible admin notices. The
// render-time gate Sgs_Configurator_Compat::is_supported() is read by
// product-card/render.php; the notices hook admin_notices.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-configurator-compat.php';
Sgs_Configurator_Compat::register();

// WooCommerce runtime compatibility self-check (Spec 30 FR-30-0a) — version-band
// audit + relied-on block registry check. Surfaces one dismissible admin notice
// when WC is outside the tested band or blocks are missing. Written contract:
// plugins/sgs-blocks/WC-DEPENDENCY-MANIFEST.md.
require_once SGS_BLOCKS_PATH . 'includes/class-wc-compat-check.php';
Wc_Compat_Check::init();

// SGS Product Authoring — REST controller for FR-27-R1: updates variable-product
// parent attributes + individual variations via WC data-store setters so the
// wc_product_attributes_lookup table is kept in sync (byte-identical to the
// native WC product editor). Routes: POST /sgs/v1/products/{id}/variations/{vid}
// and POST /sgs/v1/products/{id}/attributes.
require_once SGS_BLOCKS_PATH . 'includes/class-product-authoring.php';
Product_Authoring::register();

// SGS Product Provisioning — REST controller for FR-27-R2: conflict-safe
// attribute/term provisioning, Cartesian variation generation with upsert dedup,
// and full transactional rollback. Shares R1's security chain via
// Product_Authoring_Security. Routes: POST /sgs/v1/products/{id}/provision and
// POST /sgs/v1/products/{id}/variations/bulk.
require_once SGS_BLOCKS_PATH . 'includes/class-product-provisioning.php';
Product_Provisioning::register();

// SGS Product Templates — CPT + REST routes for FR-27-R4: agency slug-templates.
// Snapshot a product's attribute/term slugs + presentation config into a portable
// sgs_product_template CPT post; export/import between sites; apply provisions
// attributes/terms via R2 and returns the card-link config (sourceMode/productId)
// for the operator to set on the page's product-card block. Routes:
// POST /sgs/v1/product-templates, GET /sgs/v1/product-templates/{id}/export,
// POST /sgs/v1/product-templates/import, POST /sgs/v1/product-templates/{id}/apply.
require_once SGS_BLOCKS_PATH . 'includes/class-product-templates.php';
Product_Templates::register();

// SGS Product Template admin UI — product-data panel for FR-27-R4: save, apply,
// export, and import templates directly from the WooCommerce product editor.
require_once SGS_BLOCKS_PATH . 'includes/product-template-fields.php';

// SGS Product Preflight — hard go-live gate + cart £0 guard + weekly health cron
// (FR-27-PREFLIGHT / SEC-5). Blocks a variable product from publishing if it has
// zero-priced variations, missing images, an over-cap manifest, no variesBy mapping,
// or invalid JSON-LD. Also guards add-to-cart at the proxy layer (HTTP 422) and
// via the universal woocommerce_add_to_cart_validation filter. REST read endpoint:
// GET /sgs/v1/products/{id}/preflight.
require_once SGS_BLOCKS_PATH . 'includes/class-product-preflight.php';
Product_Preflight::register();

// SGS Google Merchant feed (FR-27-F2) — public, rate-limited RSS 2.0 + g: namespace
// feed at GET /sgs/v1/merchant-feed, one <item> per variation. SEC-1: prices and
// availability come ONLY from Product_Manifest (the same source the JSON-LD schema
// reads), so feed↔page↔schema can never mismatch. Hourly transient cache busted on
// woocommerce_update_product. Split across class-product-feed{,-items,-cache}.php.
require_once SGS_BLOCKS_PATH . 'includes/class-product-feed.php';
Product_Feed::register();

// Clear the preflight health-cron schedule on plugin deactivation.
register_deactivation_hook(
	__FILE__,
	static function () {
		$timestamp = \wp_next_scheduled( \SGS\Blocks\Product_Preflight::CRON_HOOK );
		if ( $timestamp ) {
			\wp_unschedule_event( $timestamp, \SGS\Blocks\Product_Preflight::CRON_HOOK );
		}
	}
);

// SGS Floating UI — Customiser controls + frontend renderer (replaces retired back-to-top + reading-progress blocks).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-customiser.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-renderer.php';
Sgs_Floating_UI_Customiser::register();
Sgs_Floating_UI_Renderer::register();

// SGS AI Connector — wrapper around WP 7.0 native AI Connectors API (Phase 7, Decision 26).
// Infrastructure-only: no AI calls. Safe-fail when no provider plugin is active.
// API surface verified 2026-05-22 against developer.wordpress.org/reference/functions/
// (wp_get_connector, wp_get_connectors, wp_is_connector_registered all return HTTP 200).
// The function_exists() guard means the class is also safe to load on WP <7.0 (every
// method returns a safe empty/false/WP_Error value), so we load unconditionally and
// rely on the in-class guards rather than a separate is_wp_7_or_later() check.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-ai-connector.php';
if ( function_exists( 'wp_get_connector' ) ) {
	add_action( 'wp_connectors_init', array( Sgs_Ai_Connector::class, 'on_connectors_init' ) );
}

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
// WP 7.0+ native API; WP 6.x fallback retired 2026-05-22 (all clients on WP 7.0+).
add_action(
	'customize_controls_enqueue_scripts',
	function () {
		if ( function_exists( 'wp_enqueue_view_transitions_admin_css' ) ) {
			wp_enqueue_view_transitions_admin_css();
		}
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
