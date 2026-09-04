/**
 * L2b — the ATOM registry. The middle level between names and panels.
 *
 * Names group into ATOMS; atoms group into PANELS; panels are chosen by CONTEXT.
 * That middle level is what makes the RANGE of controls uniform across the
 * library: a surface adopts an ATOM, not a list of attribute names, so it
 * cannot adopt half of one and cannot quietly skip a control another surface
 * offers.
 *
 * ⛔ ABSENCE IS A GAP, NOT A DECISION. The nine media surfaces were built one at
 * a time and never standardised against each other, so a name missing from a
 * surface is an accidental gap. Never read this registry as "what each surface
 * has" — read it as what every surface adopting the atom GETS. The measured
 * gaps live in `reports/migrations/media-element-census.json` under `gaps`.
 *
 * ⛔ THIS FILE DECLARES DATA ONLY. An atom's control UI, CSS emitter, validator
 * and disclosure rule live in its own module beside this one and are added per
 * atom. Nothing here is a placeholder: every field below is fully populated and
 * consumed today by the two injection filters.
 *
 * @package
 */

import { MEDIA_BASES } from '../../MediaElementControls.js';

/**
 * Every atom, with the base set it owns.
 *
 * `bases` is load-bearing — it drives SELECTIVE INJECTION. A surface declaring
 * `atoms: [ 'source', 'media-type' ]` receives the union of those atoms' bases
 * and nothing else. Without it a single declared prefix injects all 59 bases
 * (109 keys with tiers), which is the dead-control class the framework gates.
 *
 * `types` is the media types the atom applies to. It is enforced, not advisory:
 * a picker is hard-restricted to it, so a video cannot land in an image
 * attribute and render as a broken `<img src="….mp4">`.
 *
 * `scope` is which surface kind the atom styles — `element` (a replaced <img> or
 * <video>), `backdrop` (a painted background box), or `both`. Two vocabularies
 * for one concept live in the same atom precisely so the client sees one
 * control: object-fit and background-size are the same question asked of
 * different DOM.
 *
 * `disclosure()` has TWO legal return shapes, and the second is not a
 * concession. An atom governing ONE control returns
 * `{ state, hiddenReason }`. An atom governing SEVERAL controls with different
 * rules returns a MAP of base -> that same object: `video-behaviour` owns ten
 * toggles where autoplay locks two of them, and flattening it to a single state
 * would lose exactly the per-toggle disclosure the lock exists to express.
 *
 * ⛔ `state` is a CLOSED vocabulary: `shown` | `disabled` | `omitted`. OMITTED
 * means the control structurally cannot apply here; DISABLED means it does not
 * apply YET and carries a hiddenReason the client can act on. A third word that
 * could mean either reintroduces the ambiguity hiddenReason exists to prevent -
 * four branches produced five words for these three states before the purity
 * gate closed the vocabulary.
 *
 * ⛔ `css()` returns declaration STRINGS with NO trailing semicolon. The joiner
 * adds separators. Five of the first ten atoms appended their own and one did
 * not, which is invalid CSS the moment a panel concatenates two atoms - and the
 * JS/PHP parity check cannot see it, because it compares an atom against its
 * own twin, never across atoms.
 *
 * ⛔ `css()` emits NOTHING for an empty attribute set. A value the client never
 * set overrides the stylesheet's own `var( …, default )` fallback with a default
 * they never saw.
 *
 * `reads` names existing stored attributes whose SHAPE or VOCABULARY differs
 * from this atom's canonical one. It is how "zero renames" is honoured — the
 * atom reads what the surface already stores rather than proposing a new name.
 */
export const MEDIA_ATOMS = {
	source: {
		id: 'source',
		bases: MEDIA_BASES.source,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'box',
		requires: {},
		reads: {
			// Five storage shapes for one concept, all measured by the census.
			// `sgs_media_element_value()` already normalises every one of them.
			'sgs/product-card': {
				image: 'bare URL string, no attachment ID, no tiers',
			},
			'sgs/decorative-image': {
				decorMedia: 'legacy composite object with no prefix/base decomposition',
			},
			'sgs/before-after': {
				beforeImageId: 'integer|string union',
				afterImageId: 'integer|string union',
			},
			// The block's OWN block.json still declares these three as plain
			// strings (pre-atom-migration poster-image shape), and render.php
			// (§12a, "thumbnailId wins; fall back to thumbnail") deliberately
			// keeps reading them as a legacy fallback for stored content that
			// predates the ThumbnailId/Thumbnail object pair this atom now
			// injects. Documented here (rather than migrated) because the block
			// ALREADY declares them — the injection filter's "the block's own
			// declaration always wins" rule means the atom-shaped Thumbnail
			// object is never what these three names actually resolve to.
			'sgs/media': {
				thumbnail: 'legacy string URL, pre-atom-migration; ThumbnailId/Thumbnail wins when set',
				thumbnailTablet: 'legacy string URL, pre-atom-migration; ThumbnailId/Thumbnail wins when set',
				thumbnailMobile: 'legacy string URL, pre-atom-migration; ThumbnailId/Thumbnail wins when set',
			},
		},
	},

	'media-type': {
		id: 'media-type',
		bases: MEDIA_BASES.type,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {
			// The tier enum carries a 4th member, '', as an inherit sentinel.
			'sgs/hero': {
				splitMediaTypeTablet: "'' = inherit from the tier above",
				splitMediaTypeMobile: "'' = inherit from the tier above",
			},
			// ⛔ No attribute at all. The type is inferred at render from which
			// of backgroundImage / bgVideo / bgSvgContent is non-empty, and
			// video silently beats image with no editor warning. Adopting this
			// atom is what gives the client the choice.
			'sgs/container': {
				'(none)': 'type inferred from which source attribute is non-empty',
			},
		},
	},

	'video-behaviour': {
		id: 'video-behaviour',
		bases: MEDIA_BASES.behaviour,
		types: [ 'video' ],
		scope: 'element',
		attachesTo: 'element',
		// ⛔ Enforced on BOTH sides, not just the client. A browser refuses to
		// autoplay an unmuted video, and `playsinline` is required on iOS or the
		// video takes over the screen. Today the coupling exists only in
		// `media/view.js`, so a no-JS visitor gets markup that cannot play.
		requires: {
			VideoAutoplay: [ 'VideoMuted', 'VideoPlaysInline' ],
		},
		reads: {
			// ONE toggle governing BOTH video slots, per this block's sync
			// contract — deliberately block-level, not per-prefix.
			'sgs/before-after': {
				videoAutoplay: 'block-level, shared by both slots',
				videoAutoplayTablet: 'block-level, shared by both slots',
				videoAutoplayMobile: 'block-level, shared by both slots',
			},
		},
	},

	meaning: {
		id: 'meaning',
		bases: MEDIA_BASES.meaning,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		// Alt text is meaningless once the client marks the media decorative,
		// and leaving both live produces an alt string no screen reader reads.
		requires: {
			ImageAlt: [ '!ImageDecorative' ],
		},
		reads: {},
	},

	intrinsic: {
		id: 'intrinsic',
		bases: MEDIA_BASES.intrinsic,
		types: [ 'image' ],
		scope: 'element',
		attachesTo: 'element',
		requires: {},
		// ⛔ NO CONTROL. These are written from the chosen media so the renderer
		// can emit width/height and avoid layout shift. A client never edits
		// them, and exposing them would invite a value that contradicts the file.
		reads: {},
		clientEditable: false,
	},

	'svg-presentation': {
		id: 'svg-presentation',
		bases: MEDIA_BASES.svg,
		types: [ 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {},
	},

	'object-fit': {
		id: 'object-fit',
		bases: MEDIA_BASES.fit,
		types: [ 'image', 'video' ],
		// ⛔ NOT 'svg'. object-fit does nothing to an inline <svg>; the SVG path
		// needs preserveAspectRatio or a sized wrapper. `sgs/hero` already gets
		// this right — render.php scopes its fit selector to `--image, --video`
		// and excludes the SVG tier's <span> deliberately. Adopt that scoping.
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {
			// `custom` is a SIZING MODE, not a CSS fit value: render.php gates
			// object-fit off for it so explicit width/height take over. Read it
			// as "sizing mode = explicit" and hand it to the box-shape atom.
			'sgs/hero': {
				splitMediaObjectFit: "'custom' means sizing mode = explicit; declares no enum",
			},
			// The backdrop vocabulary is NARROWER: cover/contain/auto only.
			'sgs/container': {
				backgroundSize: 'backdrop vocabulary — cover/contain/auto, no fill/none/scale-down',
			},
			// `fit`'s bases are `[ 'ObjectFit', 'Size' ]` — declaring the atom for
			// ANY prefix injects both, even when only ObjectFit is wanted (no
			// per-base selection exists in a `mediaElements` entry). trust-bar's
			// `badgeImage` prefix generates `badgeImageSize` for the `Size` base,
			// which collides BY NAME ONLY with the block's own pre-existing
			// `badgeImageSize` (a NUMBER px dimension driving the badge <img>'s
			// width/height, block.json since before this atom adoption) — not the
			// same concept as the atom's backdrop `Size` (a background-size STRING
			// keyword). The element context never renders a background on the
			// badge image, so the atom's Size resolution is inert here regardless.
			'sgs/trust-bar': {
				badgeImageSize: 'pre-existing NUMBER px dimension (width+height), unrelated to the Size base\'s background-size vocabulary',
			},
		},
		vocabulary: {
			element: [ 'cover', 'contain', 'fill', 'none', 'scale-down' ],
			backdrop: [ 'cover', 'contain', 'auto' ],
		},
	},

	'focal-point': {
		id: 'focal-point',
		bases: MEDIA_BASES.focal,
		types: [ 'image', 'video' ],
		scope: 'both',
		attachesTo: 'element',
		// A focal point only means anything when the media is being cropped.
		requires: {
			ObjectPosition: [ 'ObjectFit:cover|contain|none|scale-down' ],
		},
		reads: {
			// Two storage shapes, already bridged: `FocalPositionField` takes a
			// `format` prop ('xy' | 'css-string') and src/utils/objectPosition.js
			// converts between them.
			'*': {
				sgsObjectPosition: '{x,y} floats 0-1 (FocalPointPicker native shape)',
			},
		},
	},

	'box-shape': {
		id: 'box-shape',
		bases: MEDIA_BASES.shape,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		// The three sizing modes are mutually exclusive — this is what
		// `MediaSizing` exists to express, and why a fixed height and an aspect
		// ratio can never both be live.
		requires: {
			Height: [ 'MediaSizing:height' ],
			AspectRatio: [ 'MediaSizing:ratio' ],
		},
		reads: {
			'sgs/product-card': {
				imageHeight: 'plain "180px" STRING, non-responsive — not the tier object',
			},
			'sgs/hero': {
				splitMediaWidth: 'NUMBER paired with splitMediaWidthUnit, not a tier object',
				splitMediaObjectFit: "'custom' arrives here as sizing mode = explicit",
				// Legacy per-tier scalars from hero's pre-atom bespoke width UI
				// (deleted in the C19 box-shape migration, 2026-09-04). Kept
				// editor-inert and read-only by render.php's back-compat CSS
				// emission — nothing writes to them any more, so they never
				// collide with the atom's own tier-object Width in practice,
				// but the STATIC declared type (NUMBER, matching the base
				// splitMediaWidth above) genuinely differs from the atom's
				// generic tiered-Width expectation (OBJECT). Renaming them
				// would silently drop any pre-existing stored value on a live
				// hero instance, which is a worse outcome than a documented
				// static exception.
				splitMediaWidthTablet: 'NUMBER, same legacy shape as splitMediaWidth — editor-inert, render.php-only',
				splitMediaWidthMobile: 'NUMBER, same legacy shape as splitMediaWidth — editor-inert, render.php-only',
			},
			'sgs/decorative-image': {
				maxWidthPercent: 'a bare percentage number, not a length+unit pair',
			},
		},
		vocabulary: {
			// Spaced, matching MediaSizingPanel's RATIO_OPTIONS and the only
			// server-side ratio allowlist (image-sequence/render.php).
			// `card-grid`/`gallery`/`post-grid` take free unspaced strings and
			// are READ, not matched.
			ratio: [ '1 / 1', '4 / 3', '3 / 2', '16 / 9', '21 / 9', '3 / 4', '2 / 3', '9 / 16' ],
			shape: [ 'none', 'rounded', 'circle', 'square' ],
			sizing: [ 'auto', 'height', 'ratio' ],
		},
	},

	overlay: {
		id: 'overlay',
		bases: MEDIA_BASES.overlay,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'box',
		// An opacity or blend mode with nothing to tint is a dead control.
		requires: {
			OverlayOpacity: [ 'OverlayColour|OverlayGradient' ],
			OverlayBlendMode: [ 'OverlayColour|OverlayGradient' ],
		},
		reads: {
			// The split-column overlay bypasses the shared emitter and has no
			// opacity, blend mode, hover or tiers. Routing it through the atom
			// is what gives that surface the missing four.
			'sgs/hero': {
				mediaOverlayColour: 'split-column overlay, bypasses sgs_overlay_decls()',
				mediaOverlayGradient: 'split-column overlay, bypasses sgs_overlay_decls()',
			},
		},
	},

	// Atom 11 — added 2026-09-01 (Bean-directed, harvested not designed).
	// Ken-burns and parallax are a mutually-exclusive pair on TWO working
	// surfaces already: sgs/hero's split-media (mediaParallax/mediaKenBurns/
	// mediaAnimationDuration) and sgs/container's background
	// (bgParallax/bgKenBurns/bgAnimationDuration). `types` is confirmed from
	// hero's own help text ("the split media (image, video, or SVG)") and its
	// render.php gate (`$media_ken_burns = !empty(...) && !$media_parallax`),
	// which carries NO type restriction — never assume image-only.
	motion: {
		id: 'motion',
		bases: MEDIA_BASES.motion,
		types: [ 'image', 'video', 'svg' ],
		scope: 'element',
		attachesTo: 'element',
		// Mutual exclusivity (KenBurns vs Parallax) is enforced in the
		// control's own onChange, mirroring both reference implementations —
		// `requires` here expresses "X requires Y", not "X excludes Y", so
		// there is no registry field for this yet.
		requires: {},
		reads: {},
	},

	// Atoms 12-16 — Wave 5c (2026-09-01, Bean-directed). The five atoms the
	// original design doc's Layer 1 list named but never built:
	// media-padding/opacity/shadow/caption/link. Harvested from `sgs/media`'s
	// own hand-rolled controls, not designed fresh — see each atom's own
	// module docblock for its exact prior location.
	opacity: {
		id: 'opacity',
		bases: MEDIA_BASES.opacity,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {},
	},

	shadow: {
		id: 'shadow',
		bases: MEDIA_BASES.shadow,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		// The hover colour is meaningless without a shape already set.
		requires: {
			BoxShadowColourHover: [ 'BoxShadow' ],
		},
		reads: {},
	},

	// ⛔ NOT "media-border"/"media-radius" — see this atom's own module
	// docblock. `box-shape` already owns the media element's border+radius
	// (Wave 5a/5b); this atom is scoped to the one BOX-family property that
	// was never covered anywhere: padding. Brand new capability, not a
	// retrofit — `sgs/media` never declared a padding attribute before this.
	'media-padding': {
		id: 'media-padding',
		bases: MEDIA_BASES.padding,
		types: [ 'image', 'video', 'svg' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {},
	},

	// NON-PAINT — see this atom's own module docblock. `caption`/`captionTag`
	// are the SAME names the census's `sgs/media` reads already, so this is a
	// zero-rename control promotion, not a new storage shape.
	caption: {
		id: 'caption',
		bases: MEDIA_BASES.caption,
		types: [ 'image', 'video' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {},
	},

	// NON-PAINT, IMAGE-ONLY — mirrors the hand-rolled `{ isImage && … }` gate
	// this atom replaces. `linkUrl`/`linkOpensNewTab`/`linkRel` are the SAME
	// names the census's `sgs/media` reads already.
	link: {
		id: 'link',
		bases: MEDIA_BASES.link,
		types: [ 'image' ],
		scope: 'both',
		attachesTo: 'element',
		requires: {},
		reads: {},
	},
};

/** Atom ids, in panel order. */
export const MEDIA_ATOM_IDS = Object.keys( MEDIA_ATOMS );

/**
 * The union of bases contributed by a set of atom ids.
 *
 * This is the selective-injection primitive. An unknown id THROWS rather than
 * being skipped: a typo in a block.json would otherwise silently inject fewer
 * attributes than the author asked for, and the block would look like it simply
 * lacked the controls.
 *
 * @param {string[]} atomIds Atom ids from a `mediaElements` entry.
 * @return {string[]} Deduplicated base names.
 */
export function basesForAtoms( atomIds ) {
	const out = [];
	( atomIds || [] ).forEach( ( id ) => {
		const atom = MEDIA_ATOMS[ id ];
		if ( ! atom ) {
			throw new Error(
				`sgs/media-elements: unknown atom "${ id }". Known atoms: ${ MEDIA_ATOM_IDS.join(
					', '
				) }`
			);
		}
		atom.bases.forEach( ( base ) => {
			if ( ! out.includes( base ) ) {
				out.push( base );
			}
		} );
	} );
	return out;
}

/**
 * Resolve which atoms an entry wants.
 *
 * Omitting `atoms` means ALL of them. That is the honest default for a
 * standardisation layer whose whole premise is that a missing control is a gap:
 * a surface that has not thought about it should get the full set, and narrow
 * deliberately. A surface that genuinely needs less names what it needs.
 *
 * @param {Object} element A `mediaElements` entry.
 * @return {string[]} Atom ids.
 */
export function atomsForElement( element ) {
	const declared = element?.atoms;
	return Array.isArray( declared ) && declared.length
		? declared
		: MEDIA_ATOM_IDS;
}
