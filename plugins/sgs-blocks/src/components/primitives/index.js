/**
 * WordPress primitive re-exports — the `__experimental*` compat boundary.
 *
 * WHAT THIS IS
 * ------------
 * A single place where this codebase names the unstable WordPress component
 * primitives. Every `__experimental*` import in `src/` goes through here, so
 * when core renames or stabilises one, ONE file changes instead of 47.
 *
 * ⛔ THIS IS NOT A SKIN LAYER, AND MUST NEVER BECOME ONE (Bean-ruled).
 * Zero styling. Zero added props. Zero wrapper components. Every line below is a
 * bare re-export under the same alias the tree already used, so behaviour is
 * byte-identical and the diff that introduced it changed no rendering at all.
 * If you find yourself wanting to wrap one of these to add a default prop, that
 * belongs in a real component in `src/components/`, not here — the moment this
 * file has behaviour, it stops being a boundary and becomes a dependency.
 *
 * WHY IT EXISTS (Spec 35 Phase 0 item 0d, D565)
 * ---------------------------------------------
 * Measured 2026-08-11: EVERY component primitive this tree imports from
 * WordPress is `__experimental*` — 115 import sites across **50** files, 10
 * distinct symbols. `__experimental` is core's explicit statement that the
 * export may be renamed or removed without a deprecation cycle. Before this
 * file, such a rename was a 50-file emergency; now it is a one-line edit here.
 *
 * ⛔ This comment said "47 files" when first committed — the number a
 * line-start-anchored grep produced, which the detector had ALREADY corrected to
 * 50 in the same commit's own message. Caught by a QC council (D566). The three
 * it missed put the specifier mid-line in a single-line import.
 *
 * ⚠ TWO SOURCE PACKAGES — this is the trap, and it is why a naive
 *   find-and-replace to a single package breaks the build:
 *   `__experimentalBorderRadiusControl` comes from `@wordpress/block-editor`;
 *   every other symbol comes from `@wordpress/components`.
 *
 * ⚠ `@wordpress/components` is a WEBPACK EXTERNAL, not an installed dependency —
 *   it resolves to `window.wp.components` at runtime and is NOT in
 *   `node_modules`. You cannot read its source to check a default; consult the
 *   Gutenberg source for the installed WP version instead of guessing.
 *
 * ENFORCEMENT
 * -----------
 * `scripts/surveys/survey-experimental-imports.js --check` fails the build on
 * any raw `__experimental*` component import outside this file. Wired into
 * `prebuild` in the same commit that created it.
 *
 * NOT IN SCOPE — deliberately absent, do not "fix" by adding them:
 *   `__experimentalSkipSerialization` and `__experimentalBorder` are `block.json`
 *   `supports` KEYS, not JS imports (every occurrence in `src/` is inside a
 *   comment), and `__experimentalGetPreviewDeviceType` is a data-store selector.
 *   Routing any of them through a component barrel would be meaningless.
 */

export {
	__experimentalUnitControl as UnitControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
	__experimentalNumberControl as NumberControl,
	__experimentalBoxControl as BoxControl,
	__experimentalDivider as Divider,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	__experimentalItemGroup as ItemGroup,
	__experimentalItem as Item,
	__experimentalZStack as ZStack,
	__experimentalHeading as Heading,
	__experimentalInputControl as InputControl,
	__experimentalInputControlPrefixWrapper as InputControlPrefixWrapper,
	__experimentalText as Text,
	__experimentalTruncate as Truncate,
} from '@wordpress/components';

// ⚠ block-editor, NOT components.
//
// ⛔ This line read "The only one" until 2026-09-06. It is no longer true and
// the count is deliberately not restated here — a number in a comment is a copy
// that rots (this file's own header carried a wrong "47" for exactly that
// reason). Read the export list below instead.
//
// The typography family was added 2026-09-06 when the shared TypographyControls
// component was rebuilt on WordPress's REAL native controls rather than
// SGS lookalikes. All of these live in `@wordpress/block-editor`, NOT
// `@wordpress/components` — the split this file exists to absorb.
export {
	__experimentalBorderRadiusControl as BorderRadiusControl,
	__experimentalLetterSpacingControl as LetterSpacingControl,
	__experimentalTextTransformControl as TextTransformControl,
	__experimentalTextDecorationControl as TextDecorationControl,
	__experimentalFontAppearanceControl as FontAppearanceControl,
	__experimentalFontFamilyControl as FontFamilyControl,
	__experimentalWritingModeControl as WritingModeControl,
} from '@wordpress/block-editor';

// STABLE, unprefixed exports — no `__experimental` alias to absorb, so they do
// NOT strictly need to route through this barrel. They are here anyway so that
// the whole native-typography family is named in ONE place: if core ever
// destabilises one (the reverse of the usual direction, but it has happened),
// this file is still the single edit. Verified stable + unprefixed against
// `packages/block-editor/src/components/index.js` on the `wp/7.1` branch.
export { LineHeightControl, FontSizePicker } from '@wordpress/block-editor';
