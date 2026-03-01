<?php
defined( 'ABSPATH' ) || exit;

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => 'sgs-tab-panel',
	'role'  => 'tabpanel',
) );
?>
<div <?php echo $wrapper_attributes; ?>>
	<?php echo $content; ?>
</div>
