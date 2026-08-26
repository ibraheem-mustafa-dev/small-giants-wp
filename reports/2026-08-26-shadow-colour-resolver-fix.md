# Shadow-colour resolver fix — `resolveShadowPreviewComposed()` D792 sibling bug

## Confirmed diagnosis

Read both sides:

- **JS (buggy):** `resolveShadowPreviewComposed()`, `src/utils/tokens.js:135-144` (pre-fix). For a raw shape
  (`^inset|^-?\d`) it returned `` `${shape} ${colour || 'rgba(0,0,0,0.1)'}` `` — the `colour` argument was
  concatenated RAW, with no resolution step at all.
- **PHP twin (correct):** `sgs_shadow_value_composed()`, `includes/helpers-tokens.php:703-723`. For a raw
  shape it calls `sgs_colour_value( $colour ? $colour : '' )` (line 717) before composing the string —
  `sgs_colour_value()` slug-wraps a bare palette token into `var(--wp--preset--color--{slug})` and passes a
  raw CSS colour (`#hex`, `rgb()`, `var(...)`) through untouched.

So a palette slug such as `primary` produced `0 2px 4px primary` in the editor canvas — not a valid
`box-shadow` value — so the browser drops the whole declaration and the shadow silently disappears, while
`render.php`'s PHP path (going through `sgs_colour_value()`) renders the shadow correctly on the live page.
This is the exact D792 bug class (`colourVar()`'s old unconditional-wrap behaviour), reproduced independently
in a sibling function that composes a colour into a shadow string rather than emitting the colour alone.
**Bug confirmed as real.**

## The fix

`src/utils/tokens.js`, `resolveShadowPreviewComposed()`: route the `colour` argument through the existing
`colourVar()` (same file, the D792-fixed resolver) instead of concatenating it raw:

```js
// before
return `${ shape } ${ colour || 'rgba(0,0,0,0.1)' }`;

// after
return `${ shape } ${ colourVar( colour ) || 'rgba(0,0,0,0.1)' }`;
```

No second resolution path was written — `colourVar()` is reused verbatim, per the instruction and per the
existing D792 doc comment's own warning against "duplicating a resolver" (`tokens.js:35`).

## Worked example (before/after, exercised in Node)

Re-implemented the exact old vs new lines with a faithful `CSS.supports` stand-in (identical shape to the
one `scripts/check-colour-preview-resolver.js` already uses for the same reason: no CSSOM in Node) and ran
both against representative inputs, shape `'0 2px 4px'`:

| Input colour | OLD output | NEW output |
|---|---|---|
| `'primary'` (palette slug) | `0 2px 4px primary` (invalid CSS — dropped by the browser) | `0 2px 4px var(--wp--preset--color--primary)` |
| `'#00FF00'` (custom hex) | `0 2px 4px #00FF00` | `0 2px 4px #00FF00` (unchanged) |
| `''` (no colour, fallback) | `0 2px 4px rgba(0,0,0,0.1)` | `0 2px 4px rgba(0,0,0,0.1)` (unchanged) |
| `'var(--wp--preset--color--primary)'` (already-resolved, idempotency check) | n/a | `0 2px 4px var(--wp--preset--color--primary)` (unchanged — no double-wrap) |

Node script was written, run, then deleted (`scratch-exercise.mjs`) — command output captured above is the
actual run, not a description.

## Sibling audit of `src/utils/tokens.js`

Read every exported function in the file (8 total) and checked whether it interpolates or concatenates a
colour argument into a CSS value without resolving it first:

| Function | Colour handling | Verdict |
|---|---|---|
| `colourVar( slug )` | The resolver itself (D792-fixed) | not a sibling — the source of truth |
| `spacingVar`, `shadowVar`, `fontSizeVar`, `borderRadiusVar`, `transitionVar` | Wrap a slug into a `var()` reference; never take or compose a colour value | no bug — single-slug wrap, no raw-colour concatenation |
| `resolveShadowPreview( value )` | Treats the WHOLE value as one shadow-or-slug; never composes a separate colour argument | no bug |
| `resolveShadowPreviewComposed( shape, colour )` | Composed `colour` raw | **the bug — fixed above** |
| `resolveTextColourPreviewStyle( flatValue, gradientValue, resolveSolid )` | Calls `resolveSolid( flatValue )`, where the CALLER supplies a resolver (typically `colourVar`) | no bug — resolution is delegated, not skipped |
| `resolveBackgroundPaintPreviewStyle( flatValue, gradientValue )` | Calls `colourVar( flatValue )` directly | no bug — already resolves |

**Result: exactly one sibling found (`resolveShadowPreviewComposed`), now fixed. No other instance in this
file.** Established by reading the full file end to end (222 lines) and checking each function's colour
handling individually against the "raw concatenation without resolution" shape named in the brief, rather
than re-running the same grep the prior analysis used.

## Call sites verified

`resolveShadowPreviewComposed` has 4 call sites (found via `grep -rn` across `src/`):

| File | Call | Colour argument | Effect of the fix |
|---|---|---|---|
| `src/blocks/button/edit.js:313` | `resolveShadowPreviewComposed( boxShadow, resolveColourToken( boxShadowColour, palette ) )` | Pre-resolved by `resolveColourToken()` (`src/components/DesignTokenPicker.js:99`) — already returns a palette hex, an existing var()/hex/rgb/hsl passthrough, or a `var(--wp--preset--color--{slug})` fallback | **Safe — idempotent.** `colourVar()` only re-wraps a value that fails `CSS.supports('color', value)`. A hex from the palette match passes `CSS.supports` and returns unchanged; a `var(...)` string also passes (browsers treat any `var()` as syntactically supported) and returns unchanged. Verified this in the Node worked example above (row 4). No double-wrap. |
| `src/blocks/cta-section/edit.js:125` | `resolveShadowPreviewComposed( attributes.shadow, attributes.shadowColour )` | Raw stored attribute value, no local pre-resolution | **Was broken for palette slugs, now fixed.** No caller-side compensation existed to conflict with. |
| `src/blocks/team-member/edit.js:189` | `resolveShadowPreviewComposed( cardShadow, cardShadowColour )` | Raw stored attribute value, no local pre-resolution | Same as above — was broken, now fixed, no double-resolution risk. |
| `src/blocks/trust-bar/edit.js:313` and `:1019` | `resolveShadowPreviewComposed( iconCircleShadow, iconCircleShadowColour )` / `resolveShadowPreviewComposed( badgeImageShadow, badgeImageShadowColour )` | Raw stored attribute values, no local pre-resolution | Same as above. **`trust-bar/edit.js` was NOT edited** (constraint) — verification was read-only, and no edit was needed there since the fix is centralised in `tokens.js`. |

No call site was compensating for the old broken behaviour by pre-resolving in a way that would now
double-resolve badly — `button/edit.js`'s pre-resolution is compatible by construction because `colourVar()`
is idempotent on anything that already passes `CSS.supports`.

## Why the D792 gate (`scripts/check-colour-preview-resolver.js`) missed this

The gate imports and tests exactly one function — `colourVar` (`mod.colourVar` at line 105) — against a
fixed table of ten input/output cases, and its `--self-test` mode proves the gate can fail by replaying
those same cases against a hardcoded copy of the pre-D792 `legacyColourVar()`. It never imports, calls, or
has any contract case for `resolveShadowPreviewComposed`, `resolveShadowPreview`,
`resolveTextColourPreviewStyle`, or `resolveBackgroundPaintPreviewStyle` — so it only proves `colourVar()`
itself still obeys the passthrough-vs-slug-wrap contract in isolation. `resolveShadowPreviewComposed`'s bug
was never a regression IN `colourVar()` — `colourVar()` was and remains correct — the bug was a SECOND,
independent piece of code elsewhere in the same file that composes a colour into a different CSS property
(`box-shadow`) via its own hand-written raw string interpolation instead of calling `colourVar()` at all.
A gate scoped to one function's own contract cannot see a different function failing to call that function
in the first place; catching this class of bug for good would require either enumerating every colour-
consuming function in `tokens.js` (not just `colourVar`) or a structural check (e.g. "every function that
builds a CSS value from an attribute named `*Colour`/`*colour` must reference `colourVar` in its body").
**Diagnosis only — the gate itself was not modified, per instruction.**

## Files changed

- `plugins/sgs-blocks/src/utils/tokens.js` — `resolveShadowPreviewComposed()` fixed to resolve `colour`
  through `colourVar()`; doc comment extended to record the D792-sibling nature of the fix.

No other file was edited. `scratch-parsecheck.js` and `scratch-exercise.mjs` were created under
`plugins/sgs-blocks/` for verification and deleted afterwards — neither is present in the working tree.
