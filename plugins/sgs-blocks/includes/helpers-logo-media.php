<?php
/**
 * Logo media helpers (Spec 49 §10.4): the slot a logo block declares, the files it shows per device, and the one call
 * that prints them through `SGS_Media_Element::render()`. Shared by `sgs/responsive-logo`, `sgs/nav-drawer`'s chrome
 * logo and `sgs/choice-flow`'s header logo.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/media/render-item-slot.php';

if ( ! function_exists( 'sgs_logo_media_slot' ) ) {
	/**
	 * A logo slot: its `supports.sgs.mediaElements` entry, or the entry's defaults.
	 *
	 * @param \WP_Block|null $block  The block instance.
	 * @param string         $prefix The slot prefix (`logo`, `logoDark`, `chromeLogo`, `headerLogo`).
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_logo_media_slot( $block, string $prefix ): array {
		return sgs_media_item_slot_for( $block, $prefix, array( 'image', 'svg' ), 'content' );
	}
}

if ( ! function_exists( 'sgs_logo_device_entry' ) ) {
	/**
	 * One device's stored Source entry when it names a file (an attachment id or an address).
	 *
	 * @param mixed  $source Stored Source object `{desktop,tablet,mobile}`.
	 * @param string $device Device.
	 * @return array<string,mixed>|null
	 */
	function sgs_logo_device_entry( $source, string $device ): ?array {
		$entry = is_array( $source ) && is_array( $source[ $device ] ?? null ) ? $source[ $device ] : null;
		if ( null === $entry ) {
			return null;
		}
		$has_id  = absint( $entry['id'] ?? 0 ) > 0;
		$has_url = is_string( $entry['url'] ?? null ) && '' !== trim( $entry['url'] );
		return $has_id || $has_url ? $entry : null;
	}
}

if ( ! function_exists( 'sgs_logo_entry_url' ) ) {
	/**
	 * The address of a stored Source entry: the attachment's current file when it has an id, else the stored address.
	 *
	 * @param array|null $entry Source entry.
	 * @return string
	 */
	function sgs_logo_entry_url( ?array $entry ): string {
		if ( null === $entry ) {
			return '';
		}
		$id  = absint( $entry['id'] ?? 0 );
		$url = $id > 0 ? (string) wp_get_attachment_url( $id ) : '';
		return '' !== $url ? $url : (string) ( $entry['url'] ?? '' );
	}
}

if ( ! function_exists( 'sgs_logo_switched_source' ) ) {
	/**
	 * The Source the renderer prints for a logo with a compact alternative, and the media conditions that place it.
	 *
	 * Mode `mobile` gives each device its own file (a missing one shows the desktop file); `tablet` shows the compact
	 * file (the mobile entry, else the tablet entry) at 1023px and below; `custom` shows it at `$custom_px` and below.
	 * With no compact file, or only the desktop file, the Source is the desktop file alone.
	 *
	 * @param mixed  $source    Stored Source object.
	 * @param string $mode      `mobile`, `tablet` or `custom`.
	 * @param int    $custom_px The custom switch width in px.
	 * @return array{source:array<string,array>,queries:array<string,string>}
	 */
	function sgs_logo_switched_source( $source, string $mode, int $custom_px ): array {
		$desktop = sgs_logo_device_entry( $source, 'desktop' );
		$tablet  = sgs_logo_device_entry( $source, 'tablet' );
		$mobile  = sgs_logo_device_entry( $source, 'mobile' );
		if ( null === $desktop ) {
			return array(
				'source'  => array(),
				'queries' => array(),
			);
		}
		$compact = $mobile ?? $tablet;
		if ( null === $compact ) {
			return array(
				'source'  => array( 'desktop' => $desktop ),
				'queries' => array(),
			);
		}
		if ( 'custom' === $mode ) {
			$px = max( 320, min( 2000, $custom_px ) );
			return array(
				'source'  => array(
					'desktop' => $desktop,
					'tablet'  => $compact,
					'mobile'  => $compact,
				),
				'queries' => array( 'tablet' => SGS_Breakpoints::query_width( 'max', $px ) ),
			);
		}
		if ( 'tablet' === $mode ) {
			return array(
				'source'  => array(
					'desktop' => $desktop,
					'tablet'  => $compact,
					'mobile'  => $compact,
				),
				'queries' => array(),
			);
		}
		return array(
			'source'  => array(
				'desktop' => $desktop,
				'tablet'  => $tablet ?? $desktop,
				'mobile'  => $mobile ?? $desktop,
			),
			'queries' => array(),
		);
	}
}

if ( ! function_exists( 'sgs_logo_render' ) ) {
	/**
	 * Print one logo slot through the shared media renderer.
	 *
	 * @param array  $slot     The slot (`sgs_logo_media_slot()`).
	 * @param array  $attrs    Block attributes the renderer reads (`<prefix>Source`, `<prefix>Alt`, `<prefix>Decorative`).
	 * @param string $uid      Scope class for the slot's rules.
	 * @param string $block    Block name.
	 * @param array  $context  Extra renderer context (`extra_class`, `device_queries`, `hidden`).
	 * @return array{html:string,css:string}
	 */
	function sgs_logo_render( array $slot, array $attrs, string $uid, string $block, array $context = array() ): array {
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return array(
				'html' => '',
				'css'  => '',
			);
		}
		$out = SGS_Media_Element::render(
			$slot,
			$attrs,
			array_merge(
				array(
					'uid'       => $uid,
					'block'     => $block,
					'role'      => 'logo',
					'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
				),
				$context
			)
		);
		return array(
			'html' => (string) $out['html'],
			'css'  => (string) $out['css'],
		);
	}
}
