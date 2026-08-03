<?php
/**
 * NEGATIVE CONTROL fixture — a chrome/component-builder pattern (declares a
 * "Post Types:" header, e.g. sgs_header/sgs_footer/sgs_mega_menu/sgs_drawer),
 * excluded on that grounds regardless of templateLock. Must NOT be flagged
 * even though it has no templateLock — this replaces the earlier
 * filename-prefix fixture (framework-chrome-default.php), which the
 * coordinator's review showed was the wrong exclusion mechanism: it excluded
 * only 3 files by name while 20 real chrome/builder patterns (header-*.php,
 * footer-*.php, mega-*.php, drawer-scratch.php) slipped through and were
 * wrongly counted as unlocked client content.
 *
 * Title: Fixture — Chrome Builder Pattern
 * Slug: sgs/chrome-builder-pattern
 * Categories: sgs
 * Post Types: sgs_header
 */
?>
<!-- wp:sgs/site-header {"align":"full"} -->
<!-- wp:sgs/site-header-row {"rowSlot":"top"} /-->
<!-- /wp:sgs/site-header -->
