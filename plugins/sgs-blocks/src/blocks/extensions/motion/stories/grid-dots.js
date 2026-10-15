/**
 * The grid-dots canvas story (Spec 38 §9, FR-38-33): the resting dot lattice painted on the block in the editor canvas.
 * Moved out of `fx.js` (Spec 38A M3.6), which re-exports it until its panel is retired.
 *
 * @package
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';

/**
 * Static grid-dot preview in the EDITOR CANVAS (FR-38-33).
 *
 * Bean, seeing the shipped effect: "the dots aren't visible in the canvas too".
 * They were not, and by design — `data-sgs-fx` is stamped by a PHP `render_block`
 * filter that the editor canvas never runs, so no fx effect previews there. The
 * panel says so ("Scroll effects preview on the live site, not in the editor").
 *
 * ── WHAT THIS DOES AND DELIBERATELY DOES NOT DO ───────────────────────────
 * It paints the RESTING LATTICE only: dot placement, spacing, size and colour,
 * exactly as they sit before the pointer arrives. It does NOT run the effect —
 * no canvas, no rAF, no pointer tracking, no module import into the editor
 * bundle. The interaction remains a live-site thing.
 *
 * That is the whole point rather than a shortcut. The resting lattice is the
 * half a client must JUDGE while designing — is it too dense, too sparse, can I
 * see the dots against this background — and it is precisely what could not be
 * judged before: the 1.35:1 colour shipped because nobody could see the dots
 * until the page was live.
 *
 * ── WHY A GRADIENT AND NOT A CANVAS ───────────────────────────────────────
 * `radial-gradient` + `background-size` IS a dot lattice, natively, at any
 * pitch. A canvas in the editor would mean importing the engine into the editor
 * bundle, mounting per block, and tearing down on deselect — real work, real
 * lifecycle bugs, for a picture CSS already draws.
 *
 * ⛔ CUSTOM PROPERTIES ONLY on `wrapperProps.style`. Spec 32 forbids inline
 * style PROPERTY declarations; a `--var: value` is a VALUE, not a property
 * declaration (the same distinction `view.js` relies on for `--sgs-di-py`), and
 * this is editor chrome rather than rendered block output either way. The actual
 * `background-image` lives in `fx-panel.scss`.
 */
export const withGridDotsEditorPreview = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			const { attributes } = props;

			if ( ! attributes || 'grid-dots' !== attributes.fx ) {
				return <BlockListBlock { ...props } />;
			}

			/*
			 * Fall back to the ENGINE's Preset B values, not to invented ones.
			 * These three literals are the one place this file repeats them, and
			 * they exist because CSS cannot read `grid-dots.js`'s DEFAULTS table.
			 * If Preset B ever changes, it changes in grid-dots.js and here.
			 */
			const cell = attributes.fxGridCell || 40;
			const dot = attributes.fxGridDotSize || 2;

			/*
			 * Resolve the stored colour the SAME way `fx-grid-dots.php` does:
			 * a palette SLUG becomes its preset custom property (so the preview
			 * re-colours with the theme, exactly as the live field does), and a
			 * hex/hex8 passes through verbatim so a picked alpha previews too.
			 * An unset value emits nothing and the stylesheet's own fallback
			 * chain applies.
			 *
			 * This exists because the preview previously painted with
			 * `currentColor` — the block's TEXT colour — and so showed a colour
			 * that never ships. It drew crisp dark dots over the exact faint
			 * pink field Bean could not see on the live page.
			 */
			const stored = attributes.fxGridDotColour || '';
			let previewColour = '';
			if ( /^#/.test( stored ) ) {
				previewColour = stored;
			} else if ( /^[a-z0-9-]+$/.test( stored ) ) {
				previewColour = `var(--wp--preset--color--${ stored })`;
			}

			const wrapperProps = {
				...( props.wrapperProps || {} ),
				className: [
					props.wrapperProps?.className,
					'sgs-grid-dots-preview',
				]
					.filter( Boolean )
					.join( ' ' ),
				style: {
					...( props.wrapperProps?.style || {} ),
					'--sgs-gd-cell': `${ cell }px`,
					'--sgs-gd-dot': `${ dot }px`,
					...( previewColour
						? { '--sgs-gd-colour': previewColour }
						: {} ),
				},
			};

			return (
				<BlockListBlock { ...props } wrapperProps={ wrapperProps } />
			);
		};
	},
	'withGridDotsEditorPreview'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/fx-grid-dots-preview',
	withGridDotsEditorPreview
);
