/**
 * SGS Tier W — surface-treatment preset manifest (Spec 38 §1.2b, D479).
 *
 * A typed DATA manifest, not logic. Each preset names its GLSL fragment
 * (imported from its sibling `*.frag.js`) plus a `uniforms` map giving every
 * uniform's WebGL upload type, a real numeric default, and a real numeric
 * range — never an adjective like "subtle" or "strong". `fx-surface-
 * treatment.js` reads this manifest to seed `initSurface()` and to resolve
 * `data-sgs-fx-treatment-*` overrides against a known range; a future block
 * inspector (BoxControl-style range sliders) maps onto `min`/`max` directly.
 *
 * This manifest is deliberately declarative so it can later map mechanically
 * onto `block_attributes` (per this file's own docblock intent, mirrored
 * from the wider framework's DB-first discipline) — keep new entries to
 * `{ id, label, fragment, uniforms }` shape, no branching logic beyond
 * `resolvePreset()`'s fallback.
 *
 * WHY THESE SPECIFIC DEFAULTS. Chosen to read as a genuinely usable
 * out-of-the-box treatment rather than either "invisible" or "overpowering"
 * on a typical photographic hero image at 100% width:
 * - grain: `uIntensity` 0.08 is visible texture without crushing shadow
 *   detail; `uContrast` 1.06 is a gentle lift (1.0 = no change); `uSeed` 0
 *   is an arbitrary but reproducible starting pattern.
 * - halftone: `uScale` 90 gives a clearly "dot screen" read at typical hero
 *   width without the dots reading as noise; `uAngle` 0.4 rad (~23°) avoids
 *   the moiré-prone 0°/45° axis-aligned angles; `uSoftness` 0.35 keeps dot
 *   edges soft enough to avoid hard aliasing at screen resolution.
 * - duotone: `uMix` 0.85 keeps the treatment dominant while leaving a
 *   little of the source through, matching "dial it back" being the
 *   client-facing control rather than fully replacing the image; the
 *   shadow/highlight pair is a dark-navy → warm-cream split chosen as a
 *   neutral, brand-agnostic starting point (a client's own theme tokens are
 *   the intended long-term source once this maps onto `block_attributes`).
 *
 * @package
 */

import { GRAIN_FRAGMENT } from './grain.frag';
import { HALFTONE_FRAGMENT } from './halftone.frag';
import { DUOTONE_FRAGMENT } from './duotone.frag';

/**
 * @typedef {Object} SurfaceTreatmentUniformSpec
 * @property {'float'|'vec3'} type    The WebGL upload shape (see
 *                                     `../webgl/renderer.js` `uploadUniform`
 *                                     — only bare numbers and 2/3/4-length
 *                                     arrays are supported; no int/bool/mat).
 * @property {number|number[]} default The real numeric default value.
 * @property {number|number[]} min     The real numeric lower bound (per
 *                                      component, for vec3).
 * @property {number|number[]} max     The real numeric upper bound (per
 *                                      component, for vec3).
 */

/**
 * @typedef {Object} SurfaceTreatmentPreset
 * @property {string} id       The preset id (matches `data-sgs-fx-treatment`).
 * @property {string} label    Human-readable label for editor UI.
 * @property {string} fragment The GLSL ES 3.00 fragment shader source.
 * @property {Object<string, SurfaceTreatmentUniformSpec>} uniforms
 */

/** @type {Object<string, SurfaceTreatmentPreset>} */
export const TREATMENT_PRESETS = {
	grain: {
		id: 'grain',
		label: 'Grain',
		fragment: GRAIN_FRAGMENT,
		uniforms: {
			// Shared across every preset so the scroll driver is
			// preset-agnostic: 0 = treatment at full chosen strength
			// (the resting state), 1 = untouched source.
			uResolve: { type: 'float', default: 0, min: 0, max: 1 },
			uTint: {
				type: 'vec3',
				// Warm brand tone riding the grain. Deepened so it reads as
				// film stock rather than a colour wash.
				paletteFallback: 'primary',
				paletteTransform: 'deepen',
				default: [ 0.28, 0.18, 0.12 ],
				min: [ 0, 0, 0 ],
				max: [ 1, 1, 1 ],
			},
			uIntensity: { type: 'float', default: 0.08, min: 0, max: 0.4 },
			uContrast: { type: 'float', default: 1.06, min: 1, max: 1.4 },
			uSeed: { type: 'float', default: 0, min: 0, max: 1000 },
		},
	},
	halftone: {
		id: 'halftone',
		label: 'Halftone',
		fragment: HALFTONE_FRAGMENT,
		uniforms: {
			// Shared across every preset so the scroll driver is
			// preset-agnostic: 0 = treatment at full chosen strength
			// (the resting state), 1 = untouched source.
			uResolve: { type: 'float', default: 0, min: 0, max: 1 },
			uInk: {
				type: 'vec3',
				// THE dot colour. Deepened from the brand hue so an untouched
				// halftone prints in the client's ink rather than generic
				// black — the owner's question that prompted this uniform.
				paletteFallback: 'primary',
				// 'ink', NOT 'deepen'. Measured on the canary: a fully
				// deepened brand pink resolves to roughly rgb(60,33,51),
				// which at dot size still reads as BLACK — the owner would
				// have seen the same "black diagonal line pattern" he asked
				// about, from a control that claims to be coloured. Ink keeps
				// enough chroma to be recognisably the brand while staying
				// dark enough to print as ink rather than a wash.
				paletteTransform: 'ink',
				default: [ 0.08, 0.07, 0.09 ],
				min: [ 0, 0, 0 ],
				max: [ 1, 1, 1 ],
			},
			uScale: { type: 'float', default: 90, min: 20, max: 260 },
			uAngle: { type: 'float', default: 0.4, min: 0, max: 1.57 },
			uSoftness: { type: 'float', default: 0.35, min: 0.05, max: 1 },
		},
	},
	duotone: {
		id: 'duotone',
		label: 'Duotone',
		fragment: DUOTONE_FRAGMENT,
		uniforms: {
			// Shared across every preset so the scroll driver is
			// preset-agnostic: 0 = treatment at full chosen strength
			// (the resting state), 1 = untouched source.
			uResolve: { type: 'float', default: 0, min: 0, max: 1 },
			uShadow: {
				type: 'vec3',
				// Prefer the CLIENT'S OWN brand colour over this hard-coded
				// navy. A duotone exists to make an image look on-brand; a
				// duotone in colours that are not the client's just looks
				// like a filter. Measured 2026-08-21 on the Mama's Munches
				// canary: with the navy/cream defaults the owner read the
				// result as "just the black and white one" — correct, because
				// navy -> cream across a warm-brown photograph lands almost
				// neutral. The site's palette (pink #e68a95) was sitting
				// unused the whole time.
				paletteFallback: 'primary',
				// DERIVE a deep end from the brand hue rather than using it
				// raw. Measured on the Mama's canary: the palette primary
				// (#e68a95) is a MID-tone, so using it raw as the shadow gave
				// a ramp with no depth and the treated photo looked barely
				// touched — trading "looks black and white" for "looks like
				// nothing". A duotone needs a dark end and a light end; both
				// are derived from the same hue so the result stays on-brand.
				paletteTransform: 'deepen',
				default: [ 0.05, 0.08, 0.2 ],
				min: [ 0, 0, 0 ],
				max: [ 1, 1, 1 ],
			},
			uHighlight: {
				type: 'vec3',
				// `base` is this framework's conventional light ground. If a
				// site does not define it the warm cream below still reads
				// correctly against almost any brand colour.
				paletteFallback: 'primary',
				paletteTransform: 'lighten',
				default: [ 0.98, 0.93, 0.8 ],
				min: [ 0, 0, 0 ],
				max: [ 1, 1, 1 ],
			},
			uMix: { type: 'float', default: 0.85, min: 0, max: 1 },
		},
	},
};

/** Fallback preset id — see `resolvePreset()`. */
const FALLBACK_PRESET_ID = 'grain';

/**
 * Resolve a preset id to its manifest entry, falling back to the `grain`
 * entry for an unknown id. Never returns `undefined` — a caller that skips
 * this and indexes `TREATMENT_PRESETS[id]` directly could pass `undefined`
 * uniform defaults into `initSurface()`, which is worse than silently
 * picking a working preset: a NaN uniform upload doesn't fail loudly, it
 * just paints wrong (or not at all) with no console signal.
 *
 * @param {string} id Preset id, typically read from `data-sgs-fx-treatment`.
 * @return {SurfaceTreatmentPreset} The matching preset, or the `grain` preset.
 */
export function resolvePreset( id ) {
	return TREATMENT_PRESETS[ id ] || TREATMENT_PRESETS[ FALLBACK_PRESET_ID ];
}
