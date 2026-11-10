<?php
/**
 * SGS Theme — Font Preloading
 *
 * Dark-mode inline script and font preload hooks (the file is not required by functions.php).
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Inline critical dark mode script to prevent flash of wrong theme.
 * Runs before any CSS paints.
 */
function dark_mode_inline_script(): void {
	echo '<script>
(function(){try{var t=localStorage.getItem("sgs-theme-preference");if(t)document.documentElement.setAttribute("data-theme",t);var d=window.matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.setAttribute("data-prefers-dark",d?"true":"false")}catch(e){}})();
</script>' . "\n";
}

/**
 * Preload critical font files to prevent FOUT.
 *
 * NOTE: This file is NOT currently required by functions.php — the live
 * font preloads are printed by inc/font-fallback.php::preload_first_paint_fonts().
 * The WP style-variation overlay system was removed 2026-05-22 (Phase 5a
 * Decision 18); per-site branding now ships through a single per-site
 * theme.json snapshot at sites/<client>/theme-snapshot.json.
 *
 * Sites that need a different heading-font preload should add it via a
 * per-site mu-plugin or via the snapshot's customTemplates settings.
 */
function preload_fonts(): void {
	$fonts = array(
		'inter-variable-latin.woff2',
	);

	foreach ( $fonts as $font ) {
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) )
		);
	}
}
