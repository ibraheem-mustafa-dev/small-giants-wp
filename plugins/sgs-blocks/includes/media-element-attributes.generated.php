<?php
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: src/components/MediaElementControls.js
 *         ( MEDIA_ATTR_TYPES + MEDIA_BASES )
 * Regenerate: node scripts/generate-media-attributes.mjs
 * Gate:       node scripts/generate-media-attributes.mjs --check
 *
 * The declared TYPE for every media attribute base, mirrored for the server so
 * register_block_type_args() can register the same schema the editor injects.
 * Editing this by hand makes the two sides disagree - and a type mismatch does
 * not error, it makes WordPress silently coerce the stored value back to its
 * default, deleting the client's media on load.
 *
 * @package SGS\Blocks
 */

return array(
	'bases'  => array(
		"DecorMedia"               => "object",
		"Image"                    => "object",
		"ImageAlt"                 => "string",
		"ImageHeight"              => "number",
		"ImageId"                  => "integer",
		"ImageIsDecorative"        => "boolean",
		"ImageUrl"                 => "string",
		"ImageWidth"               => "number",
		"MediaType"                => "string",
		"Svg"                      => "string",
		"SvgAnimation"             => "string",
		"SvgAnimationSpeed"        => "string",
		"SvgContent"               => "string",
		"SvgMinHeight"             => "string",
		"SvgOpacity"               => "number",
		"SvgPosition"              => "string",
		"SvgTextShadow"            => "boolean",
		"Thumbnail"                => "object",
		"ThumbnailId"              => "integer",
		"Video"                    => "object",
		"VideoAlt"                 => "string",
		"VideoAutoplay"            => "boolean",
		"VideoCaptionsId"          => "integer",
		"VideoCaptionsLabel"       => "string",
		"VideoCaptionsSrcLang"     => "string",
		"VideoCaptionsUrl"         => "string",
		"VideoControls"            => "boolean",
		"VideoId"                  => "integer",
		"VideoLazyLoad"            => "boolean",
		"VideoLoop"                => "boolean",
		"VideoMimeType"            => "string",
		"VideoMuted"               => "boolean",
		"VideoPlaysInline"         => "boolean",
		"VideoSource"              => "string",
		"VideoUrl"                 => "string",
	),
	'groups' => array(
		"behaviour"    => array(
			"VideoAutoplay",
			"VideoLoop",
			"VideoMuted",
			"VideoControls",
			"VideoPlaysInline",
			"VideoLazyLoad",
			"VideoCaptionsId",
			"VideoCaptionsUrl",
			"VideoCaptionsLabel",
			"VideoCaptionsSrcLang",
		),
		"intrinsic"    => array(
			"ImageWidth",
			"ImageHeight",
		),
		"meaning"      => array(
			"ImageAlt",
			"VideoAlt",
			"ImageIsDecorative",
		),
		"source"       => array(
			"Image",
			"ImageId",
			"ImageUrl",
			"Video",
			"VideoId",
			"VideoUrl",
			"Svg",
			"SvgContent",
			"Thumbnail",
			"ThumbnailId",
		),
		"svg"          => array(
			"SvgAnimation",
			"SvgAnimationSpeed",
			"SvgOpacity",
			"SvgPosition",
			"SvgMinHeight",
			"SvgTextShadow",
		),
		"type"         => array(
			"MediaType",
			"VideoSource",
			"VideoMimeType",
		),
	),
);
