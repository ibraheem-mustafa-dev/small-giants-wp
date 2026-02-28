/**
 * Accordion Item block — no active deprecations.
 *
 * The v1 deprecated.js using <InnerBlocks.Content /> was incorrect because
 * the raw <p>text</p> innerHTML is NOT serialized inner block content — it
 * was stored as the outer block's own innerHTML (innerBlocks was []).
 * <InnerBlocks.Content /> rendered "" when innerBlocks=[], so it never matched.
 *
 * Fix was applied directly to the database (post 52) via wp eval-file:
 * raw <p> HTML was replaced with <!-- wp:paragraph --> inner block markup,
 * leaving outer innerHTML="" which matches the current save: () => null.
 */

export default [];
