<?php
/**
 * Render template for sgs/featured-product.
 * Scaffolded by spec-15-p5b.8 -- needs human polish before shipping.
 * Spec 13 BEM: .sgs-featured-product__<element>--<modifier>
 */
$attrs = is_array($attributes ?? null) ? $attributes : array();
$class = 'sgs-featured-product';
?>
<div class="<?php echo esc_attr($class); ?>" <?php echo get_block_wrapper_attributes(); ?>>
    <?php echo esc_html($attrs['text'] ?? ''); ?>
    <!-- TODO(human): polish for role=text-content -->
</div>
