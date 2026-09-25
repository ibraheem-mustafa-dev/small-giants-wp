<?php
/**
 * Title: Mega: numbered compact link list
 * Slug: sgs/mega-compact-links-numbered
 * Categories: sgs
 * Block Types: core/post-content
 * Post Types: sgs_mega_menu
 * Description: The compact link list with numbered rows (01, 02 ...) and a short description under each link, capped at 620px for a small panel centred on the page. Built from one grid container and two numbered icon lists, so the width, columns, number style and descriptions stay editable. Reference: a real-site wholesale header whose "More" menu opens as a narrow centred panel of numbered, described links. Authored in the editor and serialised from the saved post.
 *
 * @package SGS\Theme
 */

?>
<!-- wp:sgs/container {"layout":"grid","tagName":"div","columns":{"desktop":2,"mobile":1},"gap":{"desktop":"24px"},"maxWidth":{"desktop":"620px"},"padding":{"desktop":{"top":"24px","right":"28px","bottom":"24px","left":"28px"}}} -->
<!-- wp:sgs/container {"layout":"stack","tagName":"div","contentWidth":{"desktop":"full"}} -->
<!-- wp:sgs/heading {"content":"About us","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"text":"Our story","url":"#","description":"Where we started and why"},{"text":"Our values","url":"#","description":"What we stand for"},{"text":"Careers","url":"#","description":"Join the team"}],"markerType":"numbered","numberFormat":"decimal-leading-zero","numberFontSize":"12px","numberFontWeight":"700"} /-->
<!-- /wp:sgs/container -->

<!-- wp:sgs/container {"layout":"stack","tagName":"div","contentWidth":{"desktop":"full"}} -->
<!-- wp:sgs/heading {"content":"Get in touch","level":"h3"} /-->

<!-- wp:sgs/icon-list {"items":[{"text":"Contact","url":"#","description":"Ways to reach us"},{"text":"Find us","url":"#","description":"Opening hours and directions"},{"text":"Trade enquiries","url":"#","description":"Wholesale and partnerships"}],"markerType":"numbered","numberFormat":"decimal-leading-zero","numberFontSize":"12px","numberFontWeight":"700"} /-->
<!-- /wp:sgs/container -->
<!-- /wp:sgs/container -->
