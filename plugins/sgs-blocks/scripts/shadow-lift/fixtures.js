'use strict';

/**
 * Self-test fixtures for scripts/shadow-lift — one CSS input + an assertion
 * function per case. run.js's `--self-test` drives these; kept in their own
 * module (per the brief) so run.js stays a thin CLI.
 *
 * GROUND-TRUTH: the "hoverMap"/"presetSlugs" shapes here mirror the REAL
 * `theme/sgs-theme/theme.json::settings.custom.shadowHover` +
 * `settings.shadow.presets` written by the sibling H1/H3 track (confirmed by
 * reading theme.json directly, 2026-09-23): `whisper -> soft`, `soft ->
 * lifted`, `lifted -> floating` (slug targets), `floating -> <literal>`
 * (a real string, not a slug), `pressed -> pressed` (self-slug, since a
 * pressed/inset look stays as it is).
 *
 * @package SGS\Blocks
 */

const HOVER_MAP = {
	whisper: 'soft',
	soft: 'lifted',
	lifted: 'floating',
	floating:
		'0px 3px 5px 0px color-mix(in srgb, var(--wp--custom--shadow-colour) 4%, transparent), 0px 10px 20px 0px color-mix(in srgb, var(--wp--custom--shadow-colour) 6%, transparent)',
	pressed: 'pressed',
};

const PRESET_SLUGS = new Set( [ 'whisper', 'soft', 'lifted', 'floating', 'crisp', 'long', 'outline', 'grounded', 'glow', 'pressed', 'hard' ] );

const BASE_CTX = { hoverMap: HOVER_MAP, presetSlugs: PRESET_SLUGS };

module.exports = {
	BASE_CTX,
	HOVER_MAP,
	PRESET_SLUGS,

	/** A plain resting shadow with no existing hover gets a lifted sibling. */
	basicLift: {
		css: '.a{box-shadow:0px 4px 8px 0px color-mix(in srgb, var(--x) 8%, transparent)}',
		ctx: BASE_CTX,
	},

	/** Running the transform's OWN output back through it changes nothing. */
	idempotent: true, // driven by re-running basicLift's result, not a separate fixture

	/** A selector list mixing a liftable and an already-guarded member. */
	mixedSelectorList: {
		css:
			'.a,.b:hover{box-shadow:0px 2px 4px 0px color-mix(in srgb, var(--x) 6%, transparent)}\n' +
			'.b:hover{color:red}',
		ctx: BASE_CTX,
	},

	/** A bare preset-variable value resolves through the theme's hover map (slug target). */
	presetVarSlugTarget: {
		css: '.a{box-shadow:var(--wp--preset--shadow--whisper)}',
		ctx: BASE_CTX,
		expectContains: 'var(--wp--preset--shadow--soft)',
	},

	/** A bare preset-variable value resolves through the theme's hover map (literal target). */
	presetVarLiteralTarget: {
		css: '.a{box-shadow:var(--wp--preset--shadow--floating)}',
		ctx: BASE_CTX,
		expectContains: 'var(--wp--custom--shadow-hover--floating, var(--wp--preset--shadow--floating))',
	},

	/** No hover map at all (the other agent hasn't written theme.json's map yet). */
	presetVarNoMap: {
		css: '.a{box-shadow:var(--wp--preset--shadow--whisper)}',
		ctx: { hoverMap: null, presetSlugs: PRESET_SLUGS },
	},

	/** A mixed inset+outer value lifts only the outer layer. */
	mixedInsetOuter: {
		css:
			'.a{box-shadow:inset 0px 2px 4px 0px color-mix(in srgb, var(--x) 14%, transparent), 0px 8px 16px 0px color-mix(in srgb, var(--x) 6%, transparent)}',
		ctx: BASE_CTX,
	},

	/** A single-layer inset-only value has no outer edge — no lift, reported. */
	insetOnly: {
		css: '.a{box-shadow:inset 0 0 2px red}',
		ctx: BASE_CTX,
		expectSkipReason: 'inset-only',
	},

	/** `none` draws nothing — not even a candidate. */
	none: {
		css: '.a{box-shadow:none}',
		ctx: BASE_CTX,
	},

	/** A rule whose own selector is already a transient state is not resting. */
	transientSelector: {
		css: '.a:hover{box-shadow:0 1px 2px red}',
		ctx: BASE_CTX,
	},

	/** A pseudo-element selector is never a lift target. */
	pseudoElement: {
		css: '.a::after{box-shadow:0 1px 2px red}',
		ctx: BASE_CTX,
	},

	/** A resting rule that already has its own explicit hover is left alone. */
	explicitHoverAlreadyExists: {
		css: '.a{box-shadow:0 1px 2px red}\n.a:hover{box-shadow:0 4px 12px 4px red}',
		ctx: BASE_CTX,
		expectSkipReason: 'explicit-hover-exists',
	},

	/** Inside a forced-colours query — already an accessibility fallback context. */
	forcedColours: {
		css: '@media (forced-colors:active){.a{box-shadow:0 1px 2px red}}',
		ctx: BASE_CTX,
	},

	/** Inside @keyframes — not a resting rule. */
	keyframes: {
		css: '@keyframes k{from{box-shadow:0 1px 2px red}}',
		ctx: BASE_CTX,
	},

	/** A value this module cannot parse with confidence — never guessed. */
	unparseableValue: {
		css: '.a{box-shadow:some-unrecognised-token}',
		ctx: BASE_CTX,
		expectSkipReason: 'unparseable-value',
	},

	/** A block that opted out entirely (supports.sgs.shadowLift === false). */
	disabledBlock: {
		css: '.a{box-shadow:0 1px 2px red}',
		ctx: Object.assign( {}, BASE_CTX, { disabled: true } ),
		expectSkipReason: 'block-shadow-lift-disabled',
	},

	/**
	 * Theme CSS (`--fix-theme`) is never scanned by hover-guard's own
	 * postbuild wiring, so it must get the touch-safe guarded shape directly
	 * — `ctx.wrapGuard: true`.
	 */
	themeWrapGuard: {
		css: '.a{box-shadow:0px 4px 8px 0px color-mix(in srgb, var(--x) 8%, transparent)}',
		ctx: Object.assign( {}, BASE_CTX, { wrapGuard: true } ),
	},

	/** A lift-shaped rule already in the correct guarded form — must NOT be flagged (negative control for findUnguardedLiftRules). */
	guardedLiftRuleAlreadyCorrect:
		'@media (hover: hover) and (pointer: fine){:where(:root:not(.sgs-touch-input)) .a:hover{box-shadow:0px 5px 10px 0px red}}',

	/** The same rule shipped WITHOUT the guard — must be flagged. */
	unguardedLiftRule: '.a:hover{box-shadow:0px 5px 10px 0px red}',
};
