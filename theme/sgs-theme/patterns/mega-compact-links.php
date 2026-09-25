<?php
/**
 * Title: Mega: compact link list
 * Slug: sgs/mega-compact-links
 * Categories: sgs
 * Block Types: core/post-content
 * Post Types: sgs_mega_menu
 * Description: A narrow two-column link list capped at 620px, for a small panel centred on the page. Built from one grid container, so the width, the columns and the gap stay editable. Reference: a real-site wholesale header whose smaller menus open as narrow centred panels.
 *
 * @package SGS\Theme
 */

?>
<!-- wp:sgs/container {"layout":"grid","tagName":"div","columns":{"desktop":2,"mobile":1},"gap":{"desktop":"24px"},"maxWidth":{"desktop":"620px"},"padding":{"desktop":{"top":"24px","right":"28px","bottom":"24px","left":"28px"}}} -->
<!-- wp:sgs/container {"layout":"stack","tagName":"div","contentWidth":{"desktop":"full"}} -->
<!-- wp:sgs/heading {"content":"About us","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"chevron-right","text":"Our story","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Our values","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Careers","url":"#"}]} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"stack","tagName":"div","contentWidth":{"desktop":"full"}} -->
<!-- wp:sgs/heading {"content":"Get in touch","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"iconSource":"lucide","iconName":"chevron-right","text":"Contact","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Find us","url":"#"},{"iconSource":"lucide","iconName":"chevron-right","text":"Trade enquiries","url":"#"}]} /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/container -->
