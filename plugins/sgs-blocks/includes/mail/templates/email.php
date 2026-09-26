<?php
/**
 * SGS non-WooCommerce email template — table-based, inline-CSS, 600px max width.
 *
 * Included by {@see \SGS\Blocks\Mail\Sgs_Mail_Template::wrap_native()}, which
 * sets every variable this file reads before including it: `$heading`,
 * `$html`, `$site_name`, `$logo_url`, `$colour_text`, `$colour_surface`,
 * `$colour_primary`.
 *
 * `$html` is TRUSTED, pre-escaped caller HTML (see the class docblock's trust
 * boundary note) — every other variable here is escaped at the point of use.
 * Table layout with inline styles only, so it renders consistently across
 * email clients that strip `<style>` blocks; readable and full-width down to
 * 375px because nothing sets a fixed pixel width below the outer 600px shell.
 *
 * @package SGS\Blocks\Mail
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

$home_url       = \home_url();
$copyright_year = \gmdate( 'Y' );
$body_style     = 'margin:0;padding:0;background-color:#f2f2f2;';
$outer_style    = 'max-width:600px;width:100%;margin:0 auto;background-color:' . \esc_attr( $colour_surface ) . ';border-collapse:collapse;';
$pad_style      = 'padding:24px;';

?>
<!DOCTYPE html>
<html lang="<?php echo \esc_attr( \get_bloginfo( 'language' ) ); ?>">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title><?php echo \esc_html( $site_name ); ?></title>
</head>
<body style="<?php echo \esc_attr( $body_style ); ?>">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2;padding:24px 0;">
		<tr>
			<td align="center">
				<table role="presentation" cellpadding="0" cellspacing="0" style="<?php echo \esc_attr( $outer_style ); ?>">
					<tr>
						<td style="<?php echo \esc_attr( $pad_style . 'text-align:center;border-bottom:1px solid #e5e5e5;' ); ?>">
							<?php if ( '' !== $logo_url ) : ?>
								<img src="<?php echo \esc_url( $logo_url ); ?>" alt="<?php echo \esc_attr( $site_name ); ?>" style="max-width:200px;max-height:60px;height:auto;" />
							<?php else : ?>
								<span style="<?php echo \esc_attr( 'font-size:20px;font-weight:bold;color:' . $colour_primary . ';' ); ?>"><?php echo \esc_html( $site_name ); ?></span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<td style="<?php echo \esc_attr( $pad_style ); ?>">
							<h1 style="<?php echo \esc_attr( 'margin:0 0 16px;font-size:22px;line-height:1.3;color:' . $colour_text . ';' ); ?>">
								<?php echo \esc_html( $heading ); ?>
							</h1>
							<div style="<?php echo \esc_attr( 'font-size:16px;line-height:1.6;color:' . $colour_text . ';' ); ?>">
								<?php
								// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted, caller-escaped HTML; see class docblock.
								echo $html;
								?>
							</div>
						</td>
					</tr>
					<tr>
						<td style="<?php echo \esc_attr( $pad_style . 'border-top:1px solid #e5e5e5;text-align:center;font-size:13px;color:#666666;' ); ?>">
							<?php echo \esc_html( $site_name ); ?> &middot;
							<a href="<?php echo \esc_url( $home_url ); ?>" style="<?php echo \esc_attr( 'color:' . $colour_primary . ';text-decoration:underline;' ); ?>"><?php echo \esc_html( $home_url ); ?></a>
							&middot; &copy; <?php echo \esc_html( $copyright_year ); ?>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
