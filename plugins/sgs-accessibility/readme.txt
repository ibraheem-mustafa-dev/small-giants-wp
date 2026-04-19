=== SGS Accessibility ===
Contributors: smallgiantsstudio
Tags: accessibility, wcag, a11y, skip-navigation, gutenberg
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 8.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WCAG 2.1 AA accessibility tools for SGS client sites. Admin checker, block editor hints, and skip navigation.

== Description ==

A focused, lightweight plugin that helps SGS client sites achieve WCAG 2.1 AA compliance across three areas:

**1. Admin Accessibility Checker (Tools → Accessibility Checker)**

Select any published post or page from the dropdown and click "Run Check". The plugin fetches the rendered HTML and runs the following checks:

* Images missing alt text (WCAG 1.1.1)
* Empty links with no accessible name (WCAG 2.4.4)
* Empty buttons with no accessible name (WCAG 4.1.2)
* Form inputs not associated with a label (WCAG 1.3.1)
* Skipped heading levels, e.g. H1 → H3 (WCAG 1.3.1)
* Missing or empty `<html lang="">` attribute (WCAG 3.1.1)

Results are shown in a table with Severity (Error / Warning), the relevant WCAG criterion, a description, and the offending HTML snippet.

**2. Block Editor Sidebar (Gutenberg)**

A sidebar panel titled "Accessibility" appears in the block editor. It shows:

* A warning when the currently selected Image block has no alt text.
* A count of all images in the post with missing alt text.
* The full heading hierarchy of the current post, indented by level, with red indicators for skipped levels.

**3. Skip Navigation Link (Frontend)**

Outputs a visually-hidden skip link at the top of every front-end page. The link becomes visible on keyboard focus, allowing keyboard users to jump straight to the main content area — conforming to WCAG 2.4.1.

Configure via Settings → SGS Accessibility:

* Enable or disable the skip link.
* Set the target element's ID (default: `main-content`).

== Installation ==

1. Upload the `sgs-accessibility` folder to `/wp-content/plugins/`.
2. Activate the plugin through the Plugins screen in WordPress.
3. Visit Tools → Accessibility Checker to run your first scan.
4. Visit Settings → SGS Accessibility to configure the skip navigation link.

== Frequently Asked Questions ==

= Will this make my site fully WCAG 2.1 AA compliant? =

No. Automated checks can catch a subset of accessibility issues. Manual testing with assistive technologies (screen readers, keyboard navigation) is always required for full compliance.

= Does the admin checker require a public URL? =

The checker uses `wp_remote_get()` to fetch the page HTML, so the URL must be accessible from the server. On local/staging environments protected by HTTP auth, add a bypass for the loopback IP or use a plugin like "Disable HTTP Authentication for Localhost".

= Does the Gutenberg sidebar require a build step? =

No. `editor-sidebar.js` uses the global `wp.*` variables provided by WordPress core. No Node.js or build process is required.

== Changelog ==

= 1.0.0 =
* Initial release.
* Feature: Admin accessibility checker (6 WCAG checks, AJAX-powered).
* Feature: Block editor sidebar with image alt-text warnings and heading hierarchy.
* Feature: Frontend skip navigation link with settings page.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
