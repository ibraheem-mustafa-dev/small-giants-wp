<?php
/**
 * Cross-block wrapper extensions: render_block filters that add classes and a
 * scoped <style> to any opted-in block's root element.
 *
 * - Hover effects (`supports.sgs.enabledExtensions: ["hover"]`, ["blockLink"]).
 * - Child sizing (`["childSizing"]`): fit / fill / fixed inside a flex row.
 *
 * Both depend on helpers-scoped-instance-vars.php, which sgs-blocks.php
 * requires first.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/hover-effects/hover-effects.php';
require_once __DIR__ . '/child-sizing.php';
