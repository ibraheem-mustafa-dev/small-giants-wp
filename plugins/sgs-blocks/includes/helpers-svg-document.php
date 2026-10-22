<?php
/**
 * A whole SVG file made safe: parsed as namespace-aware XML and rebuilt from the framework's SVG allowlist.
 *
 * Used for every SVG upload except a trusted uploader's (svg-upload.php, helpers-svg-trust.php) and for a logo printed inline from its uploaded file
 * (helpers-svg-inline-attachment.php). The file keeps its own animation (SMIL animate, animateTransform, animateMotion,
 * set, mpath and a <style> element with @keyframes) and its mesh gradients. Rebuilding through DOM keeps every element
 * and attribute name in its own case (viewBox, attributeName, animateTransform), so nothing is lowercased.
 *
 * Refused, with the reason (the same cases as the route's screen, scripts/computed-route/lib/svg-screen.mjs):
 * text that is not well-formed XML; a DOCTYPE carrying its own entity declarations; an element outside the SVG
 * namespace other than editor metadata; <foreignObject>; any on… attribute; an animation element whose
 * attributeName targets a link (href, xlink:href, …:href) or an on… attribute; an href, src, data, action or
 * formaction that is not a #fragment or a raster data:image; a CSS url() (in any attribute or a <style> element)
 * that is not a #fragment or a raster data:image; a CSS @import; javascript: or vbscript: anywhere; a comment,
 * processing instruction or element inside a <style> element. A <style> element's text and CDATA children are joined
 * and screened as one string, and the rebuilt file's <style> text is screened again, so a construct split across
 * nodes is caught. Any parser message above a warning refuses the file (an undeclared namespace prefix included), and
 * a link attribute is matched by the name after its last colon.
 *
 * Stripped silently: <script> (a mesh-gradient polyfill in editor exports), editor metadata elements and attributes
 * (Inkscape, Sodipodi, RDF and the rest), comments and processing instructions outside <style>, a plain DOCTYPE with no entity
 * declarations, elements and attributes the allowlist does not name.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-svg-kses.php';

defined( 'SGS_SVG_NS' ) || define( 'SGS_SVG_NS', 'http://www.w3.org/2000/svg' );
defined( 'SGS_XLINK_NS' ) || define( 'SGS_XLINK_NS', 'http://www.w3.org/1999/xlink' );
defined( 'SGS_XML_NS' ) || define( 'SGS_XML_NS', 'http://www.w3.org/XML/1998/namespace' );

if ( ! function_exists( 'sgs_svg_document_allowed_tags' ) ) {
	/**
	 * The whole-file allowlist: the shared inline list plus <style>, the SMIL animation elements (animate's full
	 * attribute set, set, animateTransform, animateMotion, mpath) and the mesh gradients. They are here and not in
	 * sgs_svg_kses_allowed_tags() because only this sanitiser screens the CSS inside <style> (url(), @import), every
	 * animation's attributeName and every link; a plain wp_kses caller screens none of them.
	 *
	 * @return array<string, array<string, bool>>
	 */
	function sgs_svg_document_allowed_tags(): array {
		$tags      = sgs_svg_kses_allowed_tags();
		$core      = $tags['g'];
		$animation = array_fill_keys(
			array( 'id', 'class', 'attributename', 'attributetype', 'values', 'from', 'to', 'by', 'dur', 'begin', 'end', 'repeatcount', 'repeatdur', 'fill', 'calcmode', 'keytimes', 'keysplines', 'keypoints', 'additive', 'accumulate', 'restart', 'min', 'max' ),
			true
		);

		$tags['style']            = array(
			'id'    => true,
			'type'  => true,
			'media' => true,
		);
		$tags['animate']          = $animation;
		$tags['set']              = $animation;
		$tags['animatetransform'] = array_merge( $animation, array( 'type' => true ) );
		$tags['animatemotion']    = array_merge(
			$animation,
			array(
				'path'   => true,
				'rotate' => true,
				'origin' => true,
			)
		);
		// An <animateMotion>'s path by reference: only a #fragment survives sgs_svg_attribute_problem().
		$tags['mpath'] = array(
			'id'         => true,
			'href'       => true,
			'xlink:href' => true,
		);
		// Mesh gradients (SVG 2, Inkscape exports). Each patch's <stop> carries its edge in `path`.
		$tags['meshgradient']  = array_merge(
			$core,
			array(
				'x'                 => true,
				'y'                 => true,
				'type'              => true,
				'gradientunits'     => true,
				'gradienttransform' => true,
				'href'              => true,
				'xlink:href'        => true,
			)
		);
		$tags['meshrow']       = $core;
		$tags['meshpatch']     = $core;
		$tags['stop']['path']  = true;
		return $tags;
	}
}

if ( ! function_exists( 'sgs_svg_link_is_safe' ) ) {
	/**
	 * Whether a link target stays inside the file: a #fragment or a raster data:image URI.
	 *
	 * @param string $value Link target.
	 * @return bool
	 */
	function sgs_svg_link_is_safe( string $value ): bool {
		return 1 === preg_match( '/^(?:#|data:image\/(?:png|jpe?g|gif|webp)[;,])/i', trim( $value ) );
	}
}

if ( ! function_exists( 'sgs_svg_css_problem' ) ) {
	/**
	 * Why a piece of CSS (a style attribute, a presentation attribute or a <style> element's text) is unsafe, or ''.
	 * CSS escapes are decoded and comments removed first, so `@\69mport`, `u\72l(` and `@import/**\/` are caught.
	 *
	 * @param string $css CSS text.
	 * @return string
	 */
	function sgs_svg_css_problem( string $css ): string {
		$plain = preg_replace_callback(
			'/\\\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\\\(.)/su',
			static function ( $m ) {
				return '' !== $m[1] ? (string) mb_chr( (int) hexdec( $m[1] ) ?: 0xFFFD, 'UTF-8' ) : $m[2];
			},
			$css
		);
		$plain = preg_replace( '#/\*.*?(?:\*/|$)#s', '', (string) $plain );
		$plain = (string) $plain;
		if ( preg_match( '/@import\b/i', $plain ) ) {
			return __( 'holds a CSS @import', 'sgs-blocks' );
		}
		if ( preg_match_all( '/url\(\s*([^)]*)(?:\)|$)/i', $plain, $urls ) ) {
			foreach ( $urls[1] as $target ) {
				$target = trim( trim( trim( $target ), '"\'' ) );
				if ( ! sgs_svg_link_is_safe( $target ) ) {
					/* translators: %s: the start of the URL. */
					return sprintf( __( 'holds a CSS url() to %s', 'sgs-blocks' ), substr( $target, 0, 60 ) );
				}
			}
		}
		if ( preg_match_all( '/image-set\(([^)]*)\)/i', $plain, $sets ) ) {
			foreach ( $sets[1] as $set ) {
				preg_match_all( '/(["\'])(.*?)\1/', $set, $strings );
				foreach ( $strings[2] as $target ) {
					if ( ! sgs_svg_link_is_safe( $target ) ) {
						/* translators: %s: the start of the URL. */
						return sprintf( __( 'holds a CSS image-set() to %s', 'sgs-blocks' ), substr( $target, 0, 60 ) );
					}
				}
			}
		}
		return sgs_svg_script_url_problem( $plain );
	}
}

if ( ! function_exists( 'sgs_svg_script_url_problem' ) ) {
	/**
	 * Why a decoded value holds a script URL, or ''. Whitespace and control characters are removed first, so
	 * `java\tscript:` and `JaVaScRiPt :` are caught.
	 *
	 * @param string $value Decoded text or attribute value.
	 * @return string
	 */
	function sgs_svg_script_url_problem( string $value ): string {
		$squashed = (string) preg_replace( '/[\s\x00-\x1F\x7F]+/', '', $value );
		return preg_match( '/(?:java|vb)script:/i', $squashed ) ? __( 'holds a javascript: URL', 'sgs-blocks' ) : '';
	}
}

if ( ! function_exists( 'sgs_svg_attribute_problem' ) ) {
	/**
	 * Why one attribute makes the file unsafe, or ''.
	 *
	 * @param string  $element Lowercase local name of the element.
	 * @param DOMAttr $attr    The attribute.
	 * @return string
	 */
	function sgs_svg_attribute_problem( string $element, DOMAttr $attr ): string {
		$local = strtolower( (string) $attr->localName );
		$colon = strrpos( $local, ':' );
		$local = false === $colon ? $local : substr( $local, $colon + 1 );
		$value = (string) $attr->value;
		if ( 0 === strpos( $local, 'on' ) ) {
			return __( 'holds an on…= event attribute', 'sgs-blocks' );
		}
		if ( 'attributename' === $local && in_array( $element, array( 'animate', 'set', 'animatetransform', 'animatemotion' ), true ) ) {
			$target = (string) preg_replace( '/\s+/', '', $value );
			if ( preg_match( '/(?:^|:)href$/i', $target ) || 0 === stripos( $target, 'on' ) ) {
				return __( 'holds an animation that rewrites a link or an event attribute', 'sgs-blocks' );
			}
		}
		if ( in_array( $local, array( 'href', 'src', 'data', 'action', 'formaction' ), true ) && ! sgs_svg_link_is_safe( $value ) ) {
			/* translators: %s: the start of the link. */
			return sprintf( __( 'holds a link to %s', 'sgs-blocks' ), substr( trim( $value ), 0, 60 ) );
		}
		$script = sgs_svg_script_url_problem( $value );
		return '' !== $script ? $script : sgs_svg_css_problem( $value );
	}
}

if ( ! function_exists( 'sgs_svg_document_copy' ) ) {
	/**
	 * Copy `$source`'s children into `$target` (in `$out`) through the allowlist.
	 *
	 * @param DOMNode     $source  Parsed node whose children are copied.
	 * @param DOMElement  $target  Rebuilt element receiving them.
	 * @param DOMDocument $out     Rebuilt document.
	 * @param array       $allowed Allowlist (lowercase element => lowercase attribute keys).
	 * @return string Why the file is refused, or ''.
	 */
	function sgs_svg_document_copy( DOMNode $source, DOMElement $target, DOMDocument $out, array $allowed ): string {
		$metadata_ns  = array(
			'http://www.inkscape.org/namespaces/inkscape',
			'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
			'http://c2pa.org/manifest',
			'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
			'http://creativecommons.org/ns#',
			'http://purl.org/dc/elements/1.1/',
		);
		$text_holders = array( 'text', 'tspan', 'textpath', 'title', 'desc', 'style' );
		$holder       = strtolower( (string) $target->localName );
		if ( 'style' === $holder ) {
			$css = '';
			foreach ( $source->childNodes as $child ) {
				if ( XML_TEXT_NODE !== $child->nodeType && XML_CDATA_SECTION_NODE !== $child->nodeType ) {
					return __( 'holds a comment, processing instruction or element inside a <style> element', 'sgs-blocks' );
				}
				$css .= (string) $child->nodeValue;
			}
			$problem = sgs_svg_css_problem( $css );
			if ( '' !== $problem ) {
				return $problem;
			}
			if ( '' !== $css ) {
				$target->appendChild( $out->createTextNode( $css ) );
			}
			return '';
		}
		foreach ( $source->childNodes as $child ) {
			if ( XML_TEXT_NODE === $child->nodeType || XML_CDATA_SECTION_NODE === $child->nodeType ) {
				if ( ! in_array( $holder, $text_holders, true ) ) {
					continue;
				}
				$text    = (string) $child->nodeValue;
				$problem = sgs_svg_script_url_problem( $text );
				if ( '' !== $problem ) {
					return $problem;
				}
				$target->appendChild( $out->createTextNode( $text ) );
				continue;
			}
			if ( XML_ELEMENT_NODE !== $child->nodeType ) {
				continue; // Comments, processing instructions, entity references.
			}
			$uri  = (string) $child->namespaceURI;
			$name = strtolower( (string) $child->localName );
			if ( in_array( $uri, $metadata_ns, true ) ) {
				continue;
			}
			if ( SGS_SVG_NS !== $uri ) {
				/* translators: 1: element name, 2: its namespace. */
				return sprintf( __( 'holds a <%1$s> element outside the SVG namespace (%2$s)', 'sgs-blocks' ), $child->nodeName, '' !== $uri ? $uri : 'none' );
			}
			if ( 'foreignobject' === $name ) {
				return __( 'holds a <foreignObject> element', 'sgs-blocks' );
			}
			foreach ( $child->attributes as $attr ) {
				$problem = sgs_svg_attribute_problem( $name, $attr );
				if ( '' !== $problem ) {
					return $problem;
				}
			}
			if ( 'script' === $name || ! isset( $allowed[ $name ] ) ) {
				continue;
			}
			$element = $out->createElementNS( SGS_SVG_NS, (string) $child->localName );
			foreach ( $child->attributes as $attr ) {
				$attr_uri = (string) $attr->namespaceURI;
				$local    = (string) $attr->localName;
				$prefix   = array(
					''           => '',
					SGS_XLINK_NS => 'xlink:',
					SGS_XML_NS   => 'xml:',
				)[ $attr_uri ] ?? null;
				if ( null === $prefix || empty( $allowed[ $name ][ $prefix . strtolower( $local ) ] ) ) {
					continue;
				}
				if ( '' === $prefix ) {
					$element->setAttribute( $local, (string) $attr->value );
				} else {
					$element->setAttributeNS( $attr_uri, $prefix . $local, (string) $attr->value );
				}
			}
			$target->appendChild( $element );
			$problem = sgs_svg_document_copy( $child, $element, $out, $allowed );
			if ( '' !== $problem ) {
				return $problem;
			}
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_svg_parse_problem' ) ) {
	/**
	 * Why a file cannot be used as an SVG at all, or '': it declares entities, is not well-formed XML or has no <svg>
	 * root in the SVG namespace. Nothing else is screened; a trusted upload keeps everything but these.
	 *
	 * @param string $markup Raw file contents.
	 * @return string
	 */
	function sgs_svg_parse_problem( string $markup ): string {
		$markup = (string) preg_replace( '/^\xEF\xBB\xBF/', '', $markup );
		if ( preg_match( '/<!ENTITY/i', $markup ) || preg_match( '/<!DOCTYPE[^>\[]*\[/i', $markup ) ) {
			return __( 'holds a DOCTYPE with entity declarations', 'sgs-blocks' );
		}
		$markup = (string) preg_replace( '/<!DOCTYPE[^>\[]*>/i', '', $markup );
		if ( '' === trim( $markup ) ) {
			return __( 'is empty', 'sgs-blocks' );
		}
		$doc       = new DOMDocument();
		$previous  = libxml_use_internal_errors( true );
		$parsed    = $doc->loadXML( $markup, LIBXML_NONET );
		$xml_error = null;
		foreach ( libxml_get_errors() as $message ) {
			if ( LIBXML_ERR_WARNING < $message->level ) {
				$xml_error = $message;
				break;
			}
		}
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		if ( ! $parsed || $xml_error ) {
			$detail = $xml_error ? trim( (string) $xml_error->message ) : '';
			/* translators: %s: the parser's message. */
			return sprintf( __( 'is not well-formed XML (%s)', 'sgs-blocks' ), substr( $detail, 0, 80 ) );
		}
		$root = $doc->documentElement;
		if ( ! $root || SGS_SVG_NS !== $root->namespaceURI || 'svg' !== $root->localName ) {
			return __( 'has no <svg> root in the SVG namespace', 'sgs-blocks' );
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_svg_sanitise_document' ) ) {
	/**
	 * Make a whole SVG file safe, or say why it cannot be.
	 *
	 * @param string $markup Raw file contents.
	 * @return array{svg: string, error: string} The safe markup ('' when refused) and the reason it was refused.
	 */
	function sgs_svg_sanitise_document( string $markup ): array {
		$refuse = static function ( string $why ): array {
			return array(
				'svg'   => '',
				'error' => $why,
			);
		};
		$markup = (string) preg_replace( '/^\xEF\xBB\xBF/', '', $markup );
		if ( preg_match( '/<!ENTITY/i', $markup ) || preg_match( '/<!DOCTYPE[^>\[]*\[/i', $markup ) ) {
			return $refuse( __( 'holds a DOCTYPE with entity declarations', 'sgs-blocks' ) );
		}
		// A DOCTYPE with no internal subset declares no entities, and the external DTD is never loaded: drop it.
		$markup = (string) preg_replace( '/<!DOCTYPE[^>\[]*>/i', '', $markup );
		if ( '' === trim( $markup ) ) {
			return $refuse( __( 'is empty', 'sgs-blocks' ) );
		}

		$doc       = new DOMDocument();
		$previous  = libxml_use_internal_errors( true );
		$parsed    = $doc->loadXML( $markup, LIBXML_NONET );
		$xml_error = null;
		foreach ( libxml_get_errors() as $message ) {
			if ( LIBXML_ERR_WARNING < $message->level ) {
				$xml_error = $message;
				break;
			}
		}
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		if ( ! $parsed || $xml_error ) {
			$detail = $xml_error ? trim( (string) $xml_error->message ) : '';
			/* translators: %s: the parser's message. */
			return $refuse( sprintf( __( 'is not well-formed XML (%s)', 'sgs-blocks' ), substr( $detail, 0, 80 ) ) );
		}
		if ( null !== $doc->doctype ) {
			return $refuse( __( 'holds a DOCTYPE', 'sgs-blocks' ) );
		}
		$root = $doc->documentElement;
		if ( ! $root || SGS_SVG_NS !== $root->namespaceURI || 'svg' !== $root->localName ) {
			return $refuse( __( 'has no <svg> root in the SVG namespace', 'sgs-blocks' ) );
		}

		$allowed = sgs_svg_document_allowed_tags();
		foreach ( $root->attributes as $attr ) {
			$problem = sgs_svg_attribute_problem( 'svg', $attr );
			if ( '' !== $problem ) {
				return $refuse( $problem );
			}
		}
		$out      = new DOMDocument( '1.0', 'UTF-8' );
		$new_root = $out->createElementNS( SGS_SVG_NS, 'svg' );
		$out->appendChild( $new_root );
		foreach ( $root->attributes as $attr ) {
			$prefix = array(
				''           => '',
				SGS_XLINK_NS => 'xlink:',
				SGS_XML_NS   => 'xml:',
			)[ (string) $attr->namespaceURI ] ?? null;
			if ( null !== $prefix && ! empty( $allowed['svg'][ $prefix . strtolower( (string) $attr->localName ) ] ) ) {
				if ( '' === $prefix ) {
					$new_root->setAttribute( (string) $attr->localName, (string) $attr->value );
				} else {
					$new_root->setAttributeNS( (string) $attr->namespaceURI, $prefix . $attr->localName, (string) $attr->value );
				}
			}
		}
		$problem = sgs_svg_document_copy( $root, $new_root, $out, $allowed );
		if ( '' !== $problem ) {
			return $refuse( $problem );
		}

		foreach ( $out->getElementsByTagNameNS( SGS_SVG_NS, 'style' ) as $style ) {
			$problem = sgs_svg_css_problem( (string) $style->textContent );
			if ( '' !== $problem ) {
				return $refuse( $problem );
			}
		}
		$svg = (string) $out->saveXML( $new_root );
		// The end state never holds what the screen refuses on the raw text.
		if ( preg_match( '/javascript\s*:|@import\b/i', $svg ) || 0 !== strpos( $svg, '<svg' ) ) {
			return $refuse( __( 'could not be rebuilt safely', 'sgs-blocks' ) );
		}
		return array(
			'svg'   => $svg,
			'error' => '',
		);
	}
}
