<?php
/**
 * Title: Mega: 2 columns + side CTA
 * Slug: sgs/mega-general-2col-aside
 * Categories: sgs
 * Block Types: core/post-content
 * Post Types: sgs_mega_menu
 * Description: Two-column mega panel with a side call-to-action panel (media, heading, text, button). Starter template for the sgs_mega_menu CPT (Spec 36).
 *
 * @package SGS\Theme
 */

?>

<!-- wp:sgs/mega-panel {"variant":"general","style":"columns"} -->

<!-- wp:sgs/mega-group -->
<!-- wp:sgs/heading {"content":"Products","level":3} /-->
<!-- wp:sgs/icon-list {"heading":"","items":[{"iconSource":"lucide","iconName":"check","text":"Product One","url":"#"},{"iconSource":"lucide","iconName":"check","text":"Product Two","url":"#"},{"iconSource":"lucide","iconName":"check","text":"Product Three","url":"#"}]} /-->
<!-- /wp:sgs/mega-group -->

<!-- wp:sgs/mega-group -->
<!-- wp:sgs/heading {"content":"Resources","level":3} /-->
<!-- wp:sgs/icon-list {"heading":"","items":[{"iconSource":"lucide","iconName":"check","text":"Guides","url":"#"},{"iconSource":"lucide","iconName":"check","text":"Case Studies","url":"#"},{"iconSource":"lucide","iconName":"check","text":"Support","url":"#"}]} /-->
<!-- /wp:sgs/mega-group -->

<!-- wp:sgs/mega-aside -->
<!-- wp:sgs/media {"mediaType":"image","imageUrl":"https://placehold.co/400x300/0F7E80/FFFFFF?text=Featured","imageAlt":"Featured"} /-->
<!-- wp:sgs/label {"text":"New in","textColour":"accent"} /-->
<!-- wp:sgs/heading {"content":"New This Season","level":3} /-->
<!-- wp:sgs/text {"text":"Discover our latest range, curated for you."} /-->
<!-- wp:sgs/button {"label":"Shop Now","url":"#"} /-->
<!-- /wp:sgs/mega-aside -->

<!-- /wp:sgs/mega-panel -->
