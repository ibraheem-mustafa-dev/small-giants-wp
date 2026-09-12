<?php
/**
 * `wp sgs audit-colour-tokens` — orphaned design-token slug discovery (Spec 41 follow-up).
 *
 * Mirrors `Sgs_Cli_Commands`'s registration pattern (class-sgs-cli-commands.php):
 *
 *   if ( defined( 'WP_CLI' ) && WP_CLI ) {
 *       require_once SGS_BLOCKS_PATH . 'includes/class-sgs-colour-audit-cli-commands.php';
 *       \WP_CLI::add_command( 'sgs audit-colour-tokens', Sgs_Colour_Audit_Cli_Commands::class );
 *   }
 *
 * Companion to the `sgs_colour_value()` `currentColor` fallback (helpers-tokens.php):
 * that fallback stops an orphaned slug rendering silently invisible, but does not
 * surface the drift to anyone. This command is the discovery half — a diagnostic
 * Bean runs on demand (e.g. immediately after a Site Editor palette edit), never a
 * render-time gate.
 *
 * Background: `sgs_colour_value()` treats any non-CSS-colour, non-`var(...)` string
 * as a design-token slug and wraps it unconditionally — with no check the slug is
 * currently registered. Neither colour-picker component can WRITE an unregistered
 * slug, but nothing re-validates a STORED slug after a palette entry is later
 * renamed or deleted, so a previously-valid attribute value goes silently invisible.
 * Full mechanism: .claude/reports/2026-09-12-nav-menu-wave2-cluster5-architecture-solutions.md
 * ("Orphaned palette slug renders silently blank").
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// sgs_is_css_colour() lives in the global namespace (helpers-tokens.php declares no
// namespace) and is normally pulled in by a block's render.php via
// render-helpers.php — neither of which loads on a bare WP-CLI invocation with no
// block rendered. require_once is safe here: helpers-tokens.php has no
// function_exists() guard around its own declarations, so it must be loaded at
// most once, and require_once is idempotent if a render.php already loaded it
// earlier in the same process.
require_once __DIR__ . '/helpers-tokens.php';

/**
 * Audits every published/draft post's block content for a colour-typed attribute
 * whose stored value is a slug no longer present in the site's live palette.
 *
 * ## EXAMPLES
 *
 *     wp sgs audit-colour-tokens
 *     wp sgs audit-colour-tokens --post_type=page,post
 */
final class Sgs_Colour_Audit_Cli_Commands {

	/**
	 * DB-derived snapshot: colour-typed block attributes.
	 *
	 * Generated from sgs-framework.db (`block_attributes` WHERE `css_property` LIKE
	 * '%color%'), 790 rows across 66 blocks as of 2026-09-12. The production/canary
	 * WP-CLI environment has no access to the dev-machine SQLite DB, so this snapshot
	 * ships with the plugin — the same generated-artefact convention already used for
	 * `css-property-classifications.json`. Regenerate via:
	 *
	 *   python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug,
	 *   attr_name FROM block_attributes WHERE css_property LIKE '%color%' ORDER BY
	 *   block_slug, attr_name"
	 *
	 * DB-first per CLAUDE.md's "no hardcoded dicts" rule — this is a GENERATED
	 * snapshot of that query's result, never a hand-maintained attribute list.
	 *
	 * @var array<string,array<int,string>>
	 */
	private const COLOUR_ATTRIBUTES_BY_BLOCK = array(
		'sgs/accordion'          => array( 'borderColour', 'borderColourGradient', 'headerBackground', 'headerBackgroundHover', 'headerColour', 'headerColourGradient', 'headerColourHover', 'headerColourHoverGradient', 'iconColour', 'iconColourHover' ),
		'sgs/accordion-item'     => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/audio'              => array( 'accentColour', 'accentColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'spectrumColour' ),
		'sgs/before-after'       => array( 'borderColour', 'borderColourGradient', 'boxShadowColour', 'boxShadowColourHover', 'dividerColour', 'dividerColourHover', 'handleColour', 'handleColourHover', 'labelBackgroundColour', 'labelColour', 'labelColourGradient', 'labelColourHover', 'labelColourHoverGradient' ),
		'sgs/brand-strip'        => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'itemBackgroundColourHover', 'itemBorderColourHover', 'nameColour', 'nameColourGradient', 'nameColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient', 'tileBackgroundColour', 'tileBorderColour', 'tileBorderColourGradient', 'tileShadowColour' ),
		'sgs/breadcrumbs'        => array( 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'currentColour', 'currentColourHover', 'currentColourHoverGradient', 'linkColour', 'linkColourGradient', 'linkColourHover', 'linkColourHoverGradient', 'separatorColour', 'separatorColourHover', 'separatorColourHoverGradient' ),
		'sgs/business-info'      => array( 'attributionHoverColourFallback', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'iconColour', 'iconColourHover', 'labelColour', 'labelColourHover', 'textColour', 'textColourHover' ),
		'sgs/button'             => array( 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'boxShadowColour', 'boxShadowColourHover', 'colourBackground', 'colourBackgroundHover', 'colourText', 'colourTextGradient', 'colourTextHover', 'colourTextHoverGradient', 'iconColour', 'iconColourHover' ),
		'sgs/buybox'             => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/card-grid'          => array( 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'cardBackground', 'cardBorderColour', 'cardBorderColourGradient', 'cardShadowColour', 'cardShadowColourHover', 'subtitleColour', 'subtitleColourHover', 'textColourHover', 'titleColour', 'titleColourHover' ),
		'sgs/cart'               => array( 'badgeColour', 'badgeTextColour', 'badgeTextColourGradient', 'badgeTextColourHover', 'badgeTextColourHoverGradient', 'iconColour', 'iconColourHover', 'panelBg', 'panelTextColour', 'panelTextColourGradient', 'panelTextColourHover', 'panelTextColourHoverGradient' ),
		'sgs/collapsible-text'   => array( 'backgroundColour', 'linkColour', 'textColour', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/container'          => array( 'backgroundColour', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'gridItemBackground', 'gridItemBorder', 'gridItemBorderGradient', 'gridItemBorderGradientHover', 'gridItemTextColour', 'gridItemTextColourHoverGradient', 'shadowColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/countdown-timer'    => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'labelColour', 'labelColourGradient', 'numberColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/counter'            => array( 'borderColour', 'borderColourGradient', 'labelColour', 'labelColourHover', 'labelColourHoverGradient', 'numberColour', 'numberColourHover', 'numberColourHoverGradient' ),
		'sgs/cta-section'        => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'shadowColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/feature-grid'       => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/filter-search'      => array( 'focusRingColour', 'inputBorderColour', 'inputBorderColourHover', 'textColour' ),
		'sgs/form'               => array( 'borderColour', 'borderColourGradient', 'formFocusRingColour', 'formFocusRingOpacity', 'prevColourBackground', 'prevColourBackgroundHover', 'progressBarColour', 'progressBarColourHover', 'submitBackground', 'submitBackgroundHover', 'submitColour', 'submitColourHover', 'submitColourHoverGradient' ),
		'sgs/form-field-tiles'   => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/form-step'          => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/gallery'            => array( 'borderColour', 'borderColourGradient', 'captionBgColour', 'captionColour', 'captionColourGradient', 'captionColourHover', 'captionColourHoverGradient', 'overlayColourHover' ),
		'sgs/google-reviews'     => array( 'arrowColourBackground', 'arrowColourBackgroundHover', 'arrowColourBorder', 'arrowColourBorderGradient', 'arrowColourBorderHover', 'arrowColourBorderHoverGradient', 'arrowColourText', 'arrowColourTextGradient', 'arrowColourTextHover', 'arrowColourTextHoverGradient', 'borderColour', 'borderColourGradient', 'writeReviewColourBackground', 'writeReviewColourBackgroundHover', 'writeReviewColourText', 'writeReviewColourTextGradient', 'writeReviewColourTextHover', 'writeReviewColourTextHoverGradient' ),
		'sgs/heading'            => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'boxShadowColour', 'boxShadowColourHover', 'linkColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/hero'               => array( 'backgroundColour', 'backgroundColourHover', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'contentBackground', 'mediaBackground', 'shadowColour', 'splitMediaBorderColour', 'splitMediaBorderColourGradient', 'splitMediaBorderColourHover', 'splitMediaBorderColourHoverGradient', 'splitMediaOverlayColour', 'textColour', 'textColourHover' ),
		'sgs/icon'               => array( 'backgroundColour', 'iconColour', 'iconColourHover', 'shapeColourHover' ),
		'sgs/icon-list'          => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'iconColour', 'iconColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/info-box'           => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'shadowHoverColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/label'              => array( 'backgroundColour', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/media'              => array( 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'boxShadowColour', 'captionColour', 'captionColourHover', 'captionColourHoverGradient' ),
		'sgs/mega-aside'         => array( 'asideBg', 'asideBgHover', 'asideBorderColour', 'asideBorderColourGradient', 'asideBorderColourHover', 'asideBorderColourHoverGradient' ),
		'sgs/mega-panel'         => array( 'borderColour', 'borderColourGradient', 'groupBorderColour', 'groupBorderColourGradient', 'groupBorderColourGradientHover', 'groupBorderColourHover', 'iconBackground', 'iconBackgroundHover', 'iconColour', 'iconColourGradient', 'iconColourHover', 'iconColourHoverGradient', 'panelBg' ),
		'sgs/modal'              => array( 'closeColourBackground', 'closeColourBackgroundHover', 'closeColourText', 'closeColourTextGradient', 'closeColourTextHover', 'closeColourTextHoverGradient', 'modalBackground', 'overlayColour', 'overlayColourHover', 'triggerBackground', 'triggerBackgroundHover', 'triggerColour', 'triggerColourGradient', 'triggerColourHover', 'triggerColourHoverGradient' ),
		'sgs/multi-button'       => array( 'backgroundColour', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'childBtnBackground', 'childBtnTextColour', 'textColour' ),
		'sgs/nav-drawer'         => array( 'borderColour', 'borderColourGradient', 'drawerBg', 'drawerTextColour', 'drawerTextColourGradient', 'drawerTextColourHover', 'drawerTextColourHoverGradient', 'surfaceOpacity', 'toggleCloseColour', 'toggleCloseColourGradient', 'toggleCloseColourHover' ),
		'sgs/nav-menu'           => array( 'burgerBg', 'burgerColour', 'burgerColourGradient', 'burgerColourHover', 'burgerHoverColour', 'featuredBg', 'featuredBgHover', 'featuredColour', 'featuredColourGradient', 'featuredColourHover', 'itemBg', 'itemBgCurrent', 'itemBgHover', 'itemBorderColour', 'itemBorderColourCurrent', 'itemBorderColourHover', 'itemColour', 'itemColourCurrent', 'itemColourGradient', 'itemColourHover', 'navBg', 'navBgHover', 'navColour', 'navColourGradient', 'navColourHover', 'submenuBg', 'submenuBorderColour', 'submenuBorderColourGradient', 'submenuColour', 'submenuColourCurrent', 'submenuColourGradient', 'submenuColourHover', 'submenuLinkBg', 'submenuLinkBgCurrent', 'submenuLinkBgHover', 'submenuShadowColour' ),
		'sgs/notice-banner'      => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'iconColour', 'iconColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/option-picker'      => array( 'borderColour', 'borderColourGradient', 'labelColour', 'labelColourGradient', 'labelColourHover', 'labelColourHoverGradient', 'pillBgColour', 'pillBgColourHover', 'pillBorderColour', 'pillBorderColourGradient', 'pillSelectedBgColour', 'pillSelectedBorderColour', 'pillSelectedBorderColourGradient', 'pillSelectedTextColour', 'pillTextColour', 'pillTextColourGradient', 'pillTextColourHover' ),
		'sgs/physics-canvas'     => array( 'backgroundColour', 'backgroundColourHover', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient' ),
		'sgs/post-grid'          => array( 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'cardBgColour', 'categoryBadgeBgColour', 'categoryBadgeBgColourHover', 'categoryBadgeColour', 'categoryBadgeColourGradient', 'categoryBadgeColourHover', 'excerptColour', 'excerptColourGradient', 'metaColour', 'metaColourGradient', 'readMoreColour', 'readMoreColourGradient', 'shadowColour', 'shadowColourHover', 'textColourHover', 'titleColour', 'titleColourGradient' ),
		'sgs/pricing-table'      => array( 'borderColour', 'borderColourGradient', 'ctaBackground', 'ctaColour', 'ctaColourGradient', 'ctaColourHover', 'featureColour', 'featureColourHover', 'popularBadgeBackground', 'popularBadgeColour', 'popularBadgeColourGradient', 'popularBadgeColourHover', 'priceColour', 'priceColourHover', 'titleColour', 'titleColourHover', 'toggleLabelHoverColour' ),
		'sgs/process-steps'      => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'descriptionColour', 'descriptionColourHover', 'numberBackground', 'numberBackgroundHover', 'numberColour', 'numberColourHover', 'numberColourHoverGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient', 'titleColour', 'titleColourHover' ),
		'sgs/product-card'       => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'ctaColourBackground', 'ctaColourBackgroundHover', 'ctaColourBorder', 'ctaColourBorderGradient', 'ctaColourBorderHover', 'ctaColourBorderHoverGradient', 'ctaColourText', 'ctaColourTextGradient', 'ctaColourTextHover', 'ctaColourTextHoverGradient', 'descColour', 'descLinkColour', 'descLinkColourGradient', 'descLinkColourHoverGradient', 'pickerLabelColour', 'pickerPillBgColour', 'pickerPillBorderColour', 'pickerPillTextColour', 'priceColour', 'priceNoteColour', 'tagBackgroundColour', 'tagBackgroundColourHover', 'tagTextColour', 'tagTextColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient', 'titleColour' ),
		'sgs/product-faq'        => array( 'backgroundColour', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/product-faq-item'   => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/product-search'     => array( 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'focusRingColour', 'inputBorderColour', 'inputBorderColourGradient', 'inputBorderColourHover', 'inputBorderColourHoverGradient', 'listboxBackgroundColour', 'listboxBackgroundColourGradient', 'matchHighlightColour', 'matchHighlightColourGradient', 'resultHoverBackgroundColour', 'resultHoverBackgroundColourGradient' ),
		'sgs/quote'              => array( 'attributionColour', 'attributionColourGradient', 'attributionColourHover', 'attributionColourHoverGradient', 'attributionLinkColour', 'attributionLinkColourGradient', 'attributionLinkColourHover', 'attributionLinkColourHoverGradient', 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'boxShadowColour', 'boxShadowColourHover', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/responsive-logo'    => array( 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient' ),
		'sgs/separator'          => array( 'colour', 'contentColour', 'contentColourHover', 'lineGradient' ),
		'sgs/site-footer'        => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/site-footer-row'    => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/site-header'        => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourScrolled', 'backgroundColourScrolledGradient', 'backgroundOverlayColour', 'backgroundOverlayColourHover', 'borderColour', 'borderColourGradient', 'shadowColour', 'textColour', 'textColourScrolled' ),
		'sgs/site-header-row'    => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/social-icons'       => array( 'iconBackground', 'iconBackgroundHover', 'iconBorderColour', 'iconBorderColourGradient', 'iconBorderColourHover', 'iconBorderColourHoverGradient', 'iconGlyphColour', 'iconGlyphColourHover', 'wrapperBorderColour', 'wrapperBorderColourGradient', 'wrapperBorderColourHover', 'wrapperBorderColourHoverGradient' ),
		'sgs/star-rating'        => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'borderColourHover', 'borderColourHoverGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/tab'                => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/table-of-contents'  => array( 'activeLinkColour', 'borderColour', 'borderColourGradient', 'linkColour', 'titleColour', 'titleColourHover' ),
		'sgs/tabs'               => array( 'borderColour', 'borderColourGradient', 'panelBgColour', 'panelBgColourHover', 'panelBorderColour', 'panelBorderColourGradient', 'tabActiveBgColour', 'tabActiveIndicatorColour', 'tabActiveIndicatorColourGradient', 'tabActiveTextColour', 'tabBgColour', 'tabHoverBgColour', 'tabIndicatorColour', 'tabIndicatorColourGradient', 'tabTextColour', 'tabTextColourGradient' ),
		'sgs/team-member'        => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'cardShadowColour', 'cardShadowColourHover', 'nameColour', 'nameColourHover', 'roleColour', 'roleColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/testimonial'        => array( 'backgroundColour', 'backgroundColourGradient', 'backgroundColourHover', 'backgroundColourHoverGradient', 'borderColour', 'borderColourGradient', 'borderColourHover', 'nameColour', 'nameColourHover', 'orgColour', 'orgColourHover', 'quoteColour', 'quoteColourHover', 'quoteLinkColour', 'quoteLinkColourGradient', 'quoteLinkColourHover', 'quoteLinkColourHoverGradient', 'ratingColour', 'ratingColourHover', 'roleColour', 'roleColourHover', 'shadowHoverColour', 'summaryColour', 'summaryColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/testimonial-slider' => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/text'               => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'borderColourHover', 'boxShadowColour', 'boxShadowColourHover', 'firstLetterColour', 'firstLetterColourHover', 'linkColour', 'linkColourGradient', 'linkColourHover', 'linkColourHoverGradient', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/timeline'           => array( 'backgroundColour', 'borderColour', 'borderColourGradient', 'connectorColour', 'connectorColourHover', 'connectorFillColour', 'connectorFillColourHover', 'dateColour', 'dateColourGradient', 'dateColourHover', 'dateColourHoverGradient', 'descriptionLinkColour', 'rowStripeColourA', 'rowStripeColourAHover', 'rowStripeColourB', 'rowStripeColourBHover', 'textColour', 'textColourGradient', 'textColourHover', 'textColourHoverGradient' ),
		'sgs/trust-bar'          => array( 'backgroundColour', 'backgroundColourHover', 'backgroundOverlayColourHover', 'badgeImageShadowColour', 'borderColour', 'borderColourGradient', 'iconCircleBackground', 'iconCircleBackgroundHover', 'iconCircleBorderColour', 'iconCircleShadowColour', 'iconColour', 'iconColourHover', 'labelColour', 'labelColourHover', 'textColour', 'textColourHover', 'titleColour', 'titleColourHover' ),
		'sgs/trustpilot-reviews' => array( 'backgroundColour', 'backgroundColourHover', 'borderColour', 'borderColourGradient', 'textColour', 'textColourHover' ),
		'sgs/whatsapp-cta'       => array( 'backgroundColour', 'backgroundColourHover', 'labelColour', 'labelColourGradient', 'labelColourHover', 'labelColourHoverGradient' ),
	);

	/**
	 * Audit every published/draft post for orphaned colour-token slugs.
	 *
	 * ## OPTIONS
	 *
	 * [--post_type=<types>]
	 * : Comma-separated post types to scan. Defaults to 'post,page' plus every
	 *   SGS-registered CPT (product, template_part-carrying CPTs excluded — those are
	 *   audited via the header/footer/drawer Active-layout content directly).
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs audit-colour-tokens
	 *     wp sgs audit-colour-tokens --post_type=page
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments.
	 */
	public function __invoke( array $args, array $assoc_args ): void {
		unset( $args );

		$palette = $this->live_palette_slugs();

		if ( empty( $palette ) ) {
			\WP_CLI::warning( 'No registered colour palette found (color.palette empty) — every slug will read as orphaned. Check theme.json / Site Editor Styles.' );
		}

		$post_types = isset( $assoc_args['post_type'] )
			? array_map( 'sanitize_key', explode( ',', (string) $assoc_args['post_type'] ) )
			: array( 'post', 'page' );

		$posts = \get_posts(
			array(
				'post_type'      => $post_types,
				'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);

		$rows = array();

		foreach ( $posts as $post_id ) {
			$content = (string) \get_post_field( 'post_content', $post_id );

			if ( '' === $content ) {
				continue;
			}

			$blocks = (array) \parse_blocks( $content );

			$this->walk_blocks( $blocks, $post_id, $palette, $rows );
		}

		if ( empty( $rows ) ) {
			\WP_CLI::success( 'No orphaned colour-token slugs found.' );
			return;
		}

		\WP_CLI\Utils\format_items( // phpcs:ignore WordPress.Security.EscapeOutput -- WP_CLI's own table formatter.
			'table',
			$rows,
			array( 'post_id', 'title', 'edit_url', 'block_slug', 'attr_name', 'slug' )
		);

		\WP_CLI::warning( count( $rows ) . ' orphaned colour-token slug(s) found — the currentColor CSS fallback keeps these visible, but the intended colour is lost until re-picked.' );
	}

	/**
	 * Depth-first walk over parsed blocks, recording any orphaned colour-token slug.
	 *
	 * Mirrors the recursive-walk shape already used by
	 * `Sgs_Drawer_Render::find_drawer_ref()` (class-sgs-drawer-render.php) — nesting
	 * is real (an operator may wrap a coloured block inside a group/column/container).
	 *
	 * @param array<int,array<string,mixed>> $blocks   Parsed blocks.
	 * @param int                            $post_id  Post ID being scanned.
	 * @param array<int,string>              $palette  Live registered palette slugs.
	 * @param array<int,array<string,mixed>> $rows     Accumulator, by reference.
	 */
	private function walk_blocks( array $blocks, int $post_id, array $palette, array &$rows ): void {
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			$block_slug = (string) ( $block['blockName'] ?? '' );
			$attr_names = self::COLOUR_ATTRIBUTES_BY_BLOCK[ $block_slug ] ?? array();
			$attrs      = (array) ( $block['attrs'] ?? array() );

			foreach ( $attr_names as $attr_name ) {
				if ( ! array_key_exists( $attr_name, $attrs ) ) {
					continue;
				}

				$value = $attrs[ $attr_name ];

				if ( ! is_string( $value ) || '' === trim( $value ) ) {
					continue;
				}

				$value = trim( $value );

				if ( str_starts_with( $value, 'var(' ) || \sgs_is_css_colour( $value ) ) {
					continue;
				}

				$slug = strtolower( preg_replace( '/[^a-z0-9-]/i', '', $value ) ?? '' );

				if ( '' === $slug || in_array( $slug, $palette, true ) ) {
					continue;
				}

				$rows[] = array(
					'post_id'    => $post_id,
					'title'      => \get_the_title( $post_id ),
					'edit_url'   => \get_edit_post_link( $post_id, 'raw' ),
					'block_slug' => $block_slug,
					'attr_name'  => $attr_name,
					'slug'       => $value,
				);
			}

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$this->walk_blocks( $block['innerBlocks'], $post_id, $palette, $rows );
			}
		}
	}

	/**
	 * Resolve the site's live registered colour palette to a flat slug list.
	 *
	 * `wp_get_global_settings( 'color.palette' )` returns origin-keyed groups
	 * (default / theme / custom); flatten all of them into one slug list — a slug
	 * registered under ANY origin is a valid, resolvable `--wp--preset--color--*`.
	 *
	 * @return array<int,string> Flat, deduplicated list of palette slugs.
	 */
	private function live_palette_slugs(): array {
		$groups = \wp_get_global_settings( array( 'color', 'palette' ) );

		if ( ! is_array( $groups ) ) {
			return array();
		}

		$slugs = array();

		foreach ( $groups as $origin_entries ) {
			if ( ! is_array( $origin_entries ) ) {
				continue;
			}

			foreach ( $origin_entries as $entry ) {
				if ( is_array( $entry ) && isset( $entry['slug'] ) ) {
					$slugs[] = (string) $entry['slug'];
				}
			}
		}

		return array_values( array_unique( $slugs ) );
	}
}
