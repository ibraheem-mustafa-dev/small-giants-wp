/**
 * SGS fork of WordPress core's `ColorPalette` (`@wordpress/components`),
 * forked verbatim (behaviour) at commit
 * 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4) so it can be
 * customised in a later pass without waiting on WordPress core.
 *
 * Directory layout mirrors core's own module boundaries so future work
 * (e.g. a gradient-bar rebuild importing `color-picker/` directly, the way
 * core's own gradient-bar does) can follow the same paths:
 *
 *   color-picker/            — hex/RGB/HSL inputs + alpha slider (react-colorful)
 *   circular-option-picker/  — the swatch grid
 *   color-palette/           — composes the two above (THE export below)
 *   dropdown/                — dropdown-content-wrapper, a shared dependency
 *   utils/                   — small forked helpers shared across the above
 *
 * This pass is verbatim-behaviour-only — no customisation. Every file
 * carries its own header noting exactly where and why it diverges from
 * core's TypeScript source (mechanical type-stripping aside): mainly the
 * `@emotion/styled` → plain SCSS class substitution (this project has no
 * `@emotion/styled` dependency) and the `contextConnect`/`useContextSystem`
 * private polymorphism system being stripped (unused by this fork's fixed,
 * non-context-wrapped usage).
 *
 * Internal dependencies
 */
export { ColorPalette, default } from './color-palette';
export { ColorPicker } from './color-picker';
