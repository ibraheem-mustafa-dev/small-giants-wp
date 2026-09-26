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
 * Requires at least: 6.9
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

define( 'SGS_BLOCKS_VERSION', '0.1.8' );
define( 'SGS_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SGS_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

/*
 * Agency attribution — the FRAMEWORK's own constant, deliberately NOT client data.
 *
 * This is the one identity string that is legitimately hardcoded: it belongs to the
 * agency that ships the framework, not to the client site rendering it. It is NOT in
 * Sgs_Site_Info precisely because that store is client-owned and client-editable —
 * routing the backlink through it would let a client blank it, and would put agency
 * data in a client record. (The rule: a hardcoded CLIENT value in a framework file is
 * a bug; the component's OWN constant stays.)
 *
 * Rendered by sgs/business-info displayType="attribution" as a placeable, movable
 * element. define()d here — not in the block — so a white-label/reseller build can
 * override both before plugin load without patching a block.
 */
defined( 'SGS_ATTRIBUTION_URL' ) || define( 'SGS_ATTRIBUTION_URL', 'https://smallgiantsstudio.co.uk/' );
defined( 'SGS_ATTRIBUTION_TEXT' ) || define( 'SGS_ATTRIBUTION_TEXT', 'Website by Small Giants Studio' );

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

// Content-derived ?ver for this plugin's assets. Block versions are frozen,
// so a block's CSS URL never changes while its content does — and the CDN
// caches it for 7 days. Read the header of this file before touching it.
require_once SGS_BLOCKS_PATH . 'includes/asset-cache-busting.php';

// Form processing classes.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-activator.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-processor.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-upload.php';
// Must load before class-form-rest-api.php — that file's route registration
// references Form_REST_Submission::class as its REST callback. Without this
// require WordPress registers the /submit route but cannot DISPATCH it —
// every submission attempt returns a bare 500 rest_invalid_handler, with
// nothing in any PHP error log (WordPress's REST dispatcher fails the
// is_callable() check silently).
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-submission.php';
// Same shape: Form_REST_Upload::handle_upload (/sgs-forms/v1/upload) and every
// Form_REST_Admin method (/submissions, /submissions/{id}, /submissions/export)
// are REST callbacks too, so both classes must be require'd before route
// registration. scripts/check-rest-route-require.py flags a REST callback class
// that is never loaded.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-upload.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-admin.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-rest-api.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-admin.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-privacy.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/class-form-download.php';
require_once SGS_BLOCKS_PATH . 'includes/forms/field-render-helpers.php';
// Choice-flow email-capture terminal (Spec 43 FR-43-4) — its own self-registering
// route class, same shape as Flow_Fields_Upload.
require_once SGS_BLOCKS_PATH . 'includes/forms/class-choice-flow-submit.php';

// Schema output filters.
require_once SGS_BLOCKS_PATH . 'includes/review-schema.php';

// Heading anchor injection for Table of Contents.
require_once SGS_BLOCKS_PATH . 'includes/heading-anchors.php';

// Device visibility — server-side class injection for show/hide per device.
require_once SGS_BLOCKS_PATH . 'includes/device-visibility.php';

// Conditional visibility — server-side block suppression by rules (login, date, etc).
require_once SGS_BLOCKS_PATH . 'includes/conditional-visibility.php';

// Shared helper — scoped-<style> per-instance CSS var injection (Spec 32
// no-inline contract). Required before hover-effects.php / parallax.php /
// image-controls.php, which all depend on it.
require_once SGS_BLOCKS_PATH . 'includes/helpers-scoped-instance-vars.php';

// Universal hover effects — server-side CSS variable injection.
require_once SGS_BLOCKS_PATH . 'includes/hover-effects.php';

// Dark-background shadow presets: the stylesheet a dark container's children use.
require_once SGS_BLOCKS_PATH . 'includes/shadow-dark-assets.php';

// Shared slider navigation (arrows, dots, placements): markup helpers + its on-demand stylesheet.
require_once SGS_BLOCKS_PATH . 'includes/helpers-slider-nav.php';

// SGS Cart — dequeue wc-cart-fragments on pages using sgs/cart + inject REST config.
require_once SGS_BLOCKS_PATH . 'includes/wc-cart-fragments.php';

// Configurator — dequeue the redundant WooCommerce jQuery frontend stack on
// pages with a bound (wc-product) sgs/product-card (FR-27-H1 JS budget).
require_once SGS_BLOCKS_PATH . 'includes/configurator-asset-optimiser.php';

// Configurator — single registration point for all Spec 27 presentation meta
// (swatch/variesBy term_meta + gallery/per-unit/discount-label variation postmeta).
require_once SGS_BLOCKS_PATH . 'includes/class-configurator-meta.php';
Configurator_Meta::register();

// Configurator — product-level value-ladder authoring fields.
// Self-hooks woocommerce_product_options_general_product_data + the save handler
// (delegates to Configurator_Meta::save_product_fields). No-op without WooCommerce.
require_once SGS_BLOCKS_PATH . 'includes/configurator-product-fields.php';

// Choice Flow — "Customisation flow" product link (Spec 43 FR-43-25).
// Self-hooks woocommerce_product_options_general_product_data + its own save
// handler + register_post_meta(). No-op without WooCommerce.
require_once SGS_BLOCKS_PATH . 'includes/product-choice-flow-link.php';

// Demand Analytics — privacy-safe aggregate counter for unbuyable combos
// (Spec 27). REST endpoint POST /sgs/v1/demand/attempt +
// admin meta-box on product edit screen. ZERO PII stored.
require_once SGS_BLOCKS_PATH . 'includes/class-demand-analytics.php';
Demand_Analytics::register();

// Turnstile — Cloudflare Turnstile helper + Settings > SGS Turnstile page.
// Provides bot-protection for public REST endpoints (Stock Notify et al.).
require_once SGS_BLOCKS_PATH . 'includes/class-turnstile.php';
Turnstile::register();

// Stock Notify — back-in-stock email capture (Spec 30).
// REST endpoint POST /sgs/v1/notify/subscribe + product edit-screen meta-box.
// Stores ONLY email + timestamp — no IP ever persisted.
require_once SGS_BLOCKS_PATH . 'includes/class-stock-notify.php';
Stock_Notify::register();
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-wishlist-rest.php';
Sgs_Wishlist_Rest::register();
// Lottie media type (Spec 38 §1.2a Tier H, D1151): the upload validator for
// .json animation files and the shared render helper.
require_once SGS_BLOCKS_PATH . 'includes/lottie-upload.php';
require_once SGS_BLOCKS_PATH . 'includes/lottie-render.php';

// Configurator — swatch fields on WooCommerce attribute term screens (FR-27-B2 authoring UI).
require_once SGS_BLOCKS_PATH . 'includes/configurator-term-fields.php';

// Configurator — badge + short-description term fields, beside the swatch fields above
// (Spec 43 FR-43-25 guided-buybox peripherals; configurator-term-fields.php is already
// over the 300-line cap, so this is a new file, same registration pattern).
require_once SGS_BLOCKS_PATH . 'includes/configurator-term-badge-fields.php';

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

// Button preset tokens in the Customiser, with postMessage live preview.
// Registers a `customize_register` action, which is ALSO what makes WordPress
// re-show the Appearance > Customize link for a block theme (wp-admin/menu.php:246).
require_once SGS_BLOCKS_PATH . 'includes/class-button-presets-customiser.php';

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
require_once SGS_BLOCKS_PATH . 'includes/media-element-attrs-register.php';

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

// Image Sequence block — "Verify frames" REST endpoint (Spec 38).
require_once SGS_BLOCKS_PATH . 'includes/class-image-sequence-verify.php';
Image_Sequence_Verify::register();

// Stripe payment settings and PaymentIntent AJAX handler.
require_once SGS_BLOCKS_PATH . 'includes/stripe-settings.php';
require_once SGS_BLOCKS_PATH . 'includes/sgs-order-confirmation-messages.php';
Stripe_Settings::init();

// Google Fonts catalogue — registers ~1,900 fonts in the editor's Manage fonts modal.
// Zero frontend cost: fonts are only enqueued when an operator explicitly installs them.
require_once SGS_BLOCKS_PATH . 'includes/class-font-collection.php';
new Font_Collection();

// Register REST API endpoints.
Forms\Form_REST_API::register();
Forms\Choice_Flow_Submit::register();

// No Lucide icon REST bridge is registered: WP 7.0's icon registry
// (wp-includes/class-wp-icons-registry.php) is deliberately CLOSED to third
// parties (protected constructor + protected register(), hardcoded core-only
// manifest), with no filter, action or global function to register through.
// `sgs_get_lucide_icon()` in lucide-icons.php is the supported path.

// Per-site branding flows through the per-site theme.json snapshot at
// sites/<client>/theme-snapshot.json, pushed via
// plugins/sgs-blocks/scripts/push-theme-snapshot.py — no theme_mod, no REST.

// Register admin settings page (webhook URL + submissions viewer).
Forms\Form_Admin::register();
Forms\Form_Download::register();
// A deleted SGS upload takes its private file with it (core only deletes inside uploads/).
Forms\Form_Upload::register();

// SGS top-level admin menu (FR-S5-1) — must register BEFORE any submenu class.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-admin-menu.php';
Sgs_Admin_Menu::register();

// SGS Site Info — public store + admin settings page (FR-S4-3) + split notices class.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-logo.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-cache-purge.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin-fields.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin-notices.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-admin.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-binding.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-rest.php';
Sgs_Site_Info::register();
// The store feeds site-wide chrome, so an edit invalidates every cached page.
Sgs_Site_Info_Cache_Purge::register();
Sgs_Site_Info_Admin::register();
// Tier-1 pipeline business-info sync — capability-gated remote write endpoint
// (POST /sgs/v1/site-info, fill-if-empty).
Sgs_Site_Info_Rest::register();
// FR-S9-10: boot the sgs/site-info block-bindings source so header/footer
// paragraphs bound to copyright/tagline/socials/contact resolve on the frontend.
// The class does not self-register; this call is what wires it.
Sgs_Site_Info_Binding::register();

// Block bindings support — widens WP core's hardcoded metadata.bindings
// allowlist (wp-includes/block-bindings.php get_block_bindings_supported_attributes(),
// verified live WP 7.0.1) to include sgs/text, sgs/heading, sgs/button via the
// WP 6.9+ block_bindings_supported_attributes_{block_type} filter. Without this,
// contact-form.php / contact-minimal.php patterns cannot migrate their
// sgs/site-info-bound core/paragraph + core/button instances to native SGS
// blocks — the binding would silently render inert.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-block-bindings-support.php';
Sgs_Block_Bindings_Support::register();

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

// SGS header behaviours (F1+F2+F4) — class injector + asset enqueuer.
// Must load after Sgs_Header_Rules::register() so the sgs_header_rule_resolved filter point exists.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-behaviours.php';
Sgs_Header_Behaviours::register();

// SGS conditional footer rules (FR-S3-3) — mirror of header rules for the footer area.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-rules.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-footer-rules-admin.php';
Sgs_Footer_Rules::register();
Sgs_Footer_Rules_Admin::register();

// SGS Motion Diagnostics (Spec 38) — admin-only support
// surface: which motion effects a page shipped, their byte cost against the
// Spec 02 per-page budget, and which effects were skipped (and why) —
// without SSH or WP_DEBUG. Never loaded on the frontend request path.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-motion-diagnostics.php';
// Serves the measurement above to the editor (`extensions/fx.js` requests this
// route). Must load AFTER the diagnostics class it calls.
require_once SGS_BLOCKS_PATH . 'includes/rest-motion-budget.php';
Sgs_Motion_Diagnostics::register();

// SGS template-part resetter (FR-S2-3) — admin button + public helper for FR-S5-3 CLI wrap.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-template-part-resetter.php';
Sgs_Template_Part_Resetter::register();

// SGS Advanced Headers / Footers CPTs (FR-S3-4) — REST gated to edit_theme_options (Council M1).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-block-cpts.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-rest-gate.php';
Sgs_Block_CPTs::register();
Sgs_Cpt_Rest_Gate::register();

// SGS active header/footer binding (FR-37-2 / FR-37-3 / FR-37-5 / FR-37-25, Spec 37) —
// the pointer that makes a CPT-authored header the LIVE header. Loaded after the CPTs
// because Sgs_Active_Layout maps an area token onto Sgs_Block_CPTs' post-type constants.
// The rules engines registered earlier reference Sgs_Active_Layout only at render time,
// so this ordering is correct: register() there merely attaches the filter.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-active-layout.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-active-layout-admin.php';
Sgs_Active_Layout_Admin::register();

// Auto-seed one published, Active starter post per header/footer/drawer CPT
// on activation (FR-37-48, Spec 37) — so a fresh install never shows an
// empty list table. Single canonical trigger: register_activation_hook,
// guarded per-area on a zero published-post count (see the class for why
// that guard alone is sufficient to prevent double-seeding).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-starter-library-seeder.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-footer-starter-seeder.php';
register_activation_hook( __FILE__, array( Sgs_Header_Footer_Starter_Seeder::class, 'seed_all' ) );

// Existing sites updated by a file overwrite never fire the activation hook above,
// so seed the default drawer + looks library once per plugin version on `init`.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-starter-library-migration.php';
Sgs_Starter_Library_Migration::register();

// SGS "_sgs_is_default" post meta (sgs_modal only — sgs_header/sgs_footer are
// covered by Sgs_Active_Layout's "Active" pointer, see
// class-sgs-cpt-default-meta.php) + the read-only "Used by" list-table column
// (sgs_header/sgs_footer/sgs_drawer/sgs_modal/sgs_form/sgs_choice_flow). Loaded after
// the CPTs + Active-layout + rules engines because both classes below read
// Sgs_Block_CPTs' post-type constants and, for the usage column, resolve
// against Sgs_Header_Rules / Sgs_Footer_Rules / Sgs_Active_Layout at render
// time (not registration time), so load order here only needs the class
// definitions to exist, which require_once already guarantees.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-default-meta.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-references.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-usage-columns.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-cpt-delete-guard.php';
Sgs_Cpt_Default_Meta::register();
Sgs_Cpt_Usage_Columns::register();
// Refuse trashing/deleting a form or flow that is still embedded or product-linked (Spec 42 FR-42-7b).
Sgs_Cpt_Delete_Guard::register();

// "Framework look" post-state + "Framework looks (N)" view on the list table of
// every CPT that has a seeded starter library (FR-37-48). Needs the CPT + Active-layout
// classes defined; the hooks only fire in wp-admin list screens.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-starter-library-admin.php';
Sgs_Starter_Library_Admin::register();

// SGS Active menu-drawer render path (Spec 36 + 37) — the drawer
// has no core/template-part slot to intercept, so it renders on wp_footer instead
// of via pre_render_block. Loaded after Sgs_Active_Layout because every read
// resolves through it. Emits NOTHING when no Active drawer pointer is set, so this
// is additive: the 8 pattern-embedded drawers keep working untouched.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-drawer-render.php';
Sgs_Drawer_Render::register();

// SGS Mega Menu CPT (FR-36-3 / FR-36-5, Spec 36) — sgs_mega_menu, attached to a
// classic nav menu item the native WordPress way (Appearance > Menus).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-mega-menu-cpt.php';
Sgs_Mega_Menu_CPT::register();

// SGS Configurator compatibility (Spec 27 FR-27-A5, U11) — WC version floor +
// graceful read-only degradation below it + dismissible admin notices. The
// render-time gate Sgs_Configurator_Compat::is_supported() is read by
// product-card/render.php; the notices hook admin_notices.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-configurator-compat.php';
Sgs_Configurator_Compat::register();

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

// SGS Floating UI — Customiser controls + frontend renderer (back-to-top + reading-progress).
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-customiser.php';
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-floating-ui-renderer.php';
Sgs_Floating_UI_Customiser::register();
Sgs_Floating_UI_Renderer::register();

// SGS AI Connector — wrapper around WP 7.0 native AI Connectors API.
// Infrastructure-only: no AI calls. Safe-fail when no provider plugin is active.
// The function_exists() guard means the class is also safe to load on WP <7.0 (every
// method returns a safe empty/false/WP_Error value), so we load unconditionally and
// rely on the in-class guards rather than a separate is_wp_7_or_later() check.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-ai-connector.php';
if ( function_exists( 'wp_get_connector' ) ) {
	add_action( 'wp_connectors_init', array( Sgs_Ai_Connector::class, 'on_connectors_init' ) );
}

// SGS Site Info Customiser — live preview of the shared Site Info store.
// Header/footer editing lives in the Site Editor (block controls + FR-S9-9 behaviour toggles),
// not the Customiser. class-sgs-customiser-info-control.php extends
// WP_Customize_Control (admin/customise-only) — loaded lazily inside customize_register (priority 1)
// so it never fatals on the frontend; Sgs_Site_Info_Customiser still depends on it.
require_once SGS_BLOCKS_PATH . 'includes/class-sgs-site-info-customiser.php';
add_action(
	'customize_register',
	static function () {
		require_once SGS_BLOCKS_PATH . 'includes/class-sgs-customiser-info-control.php';
	},
	1
);
Sgs_Site_Info_Customiser::register();

// Wire View Transitions into Customiser navigation (WP 7.0+ native API).
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

	// Header/footer/drawer LIFECYCLE command set (FR-37-30, Spec 37) — one class,
	// three area-bound instances registered under separate `sgs header` /
	// `sgs footer` / `sgs drawer` namespaces alongside the existing `sgs` command
	// tree. The class is fully area-parameterised (it resolves the option key and
	// post type through Sgs_Active_Layout), so the drawer instance needs ZERO new
	// command logic — `set-active`, `clear-active`, `list` and `seed-starter` all
	// work as soon as the area token maps.
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-starter-cli-seeder.php';
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-footer-cli-commands.php';
	\WP_CLI::add_command( 'sgs header', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_HEADER ) );
	\WP_CLI::add_command( 'sgs footer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_FOOTER ) );
	\WP_CLI::add_command( 'sgs drawer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_DRAWER ) );

	// Orphaned colour-token discovery (companion to the sgs_colour_value() currentColor
	// fallback in helpers-tokens.php).
	require_once SGS_BLOCKS_PATH . 'includes/class-sgs-colour-audit-cli-commands.php';
	\WP_CLI::add_command( 'sgs audit-colour-tokens', Sgs_Colour_Audit_Cli_Commands::class );
}

SGS_Blocks::instance();
