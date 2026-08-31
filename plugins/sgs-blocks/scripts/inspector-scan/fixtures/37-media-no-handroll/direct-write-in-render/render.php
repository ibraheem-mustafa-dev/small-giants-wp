<?php
/**
 * Fixture render.php — mirrors the real `sgs/hero` shape (render.php:628):
 * an object-fit declaration built via PHP string concatenation rather than
 * via `sgs_media_element_style()`. Must be caught by condition 2's
 * presence-only regex (a captured-value regex would miss this, since the
 * character right after the colon is the closing quote of a PHP string).
 */

defined( 'ABSPATH' ) || exit;

$safe_fit        = 'cover';
$responsive_css   = '';
$selector         = '.sgs-direct-write-in-render__img';
$responsive_css  .= $selector . '{object-fit:' . $safe_fit . '}';

echo '<style>' . $responsive_css . '</style>';
