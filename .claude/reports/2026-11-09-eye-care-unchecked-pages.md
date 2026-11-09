# Eye Care unchecked pages (2026-11-09)

Read-only comparison of eye-care-test with the draft at 375, 768 and 1440, by a subagent. About 21 findings, about 17 real differences; the rest are decided items or WooCommerce or Stripe constraints.

## Checkout

- Address comes before the delivery method. At 375 and 768, "4 Payment" and "4 Order summary" share a number.
- The country select and "+ Add flat" link show. There is no "Mobile, so I can WhatsApp you updates" field.
- "Create an account with … (SGS test)" has no helper line. "Log in" is a link by the heading, not "Already have an account? Sign in".
- "FREE" is in capitals where the draft says "Free".
- Apple Pay and Google Pay labels are clipped, and a heading shows that the draft does not have.
- Order summary has no Edit link or brand label, a 48px thumbnail (draft 72px), and prices with .00. At 375 it sits before Pay now, not after it. Terms text is 14px with no rule.

## Account

- Wishlist and Addresses are swapped against the draft.
- The "Orders" and "Account details" headings are missing.
- The new and confirm password fields are stacked, not paired, and the labels are longer.

## Thank-you

- No account note or "View my orders" button for a signed-in customer.

## Confirm your email

Shows to the admin on `/my-account/`. It is WooCommerce's own verification notice, so non-admins likely see it too; untested.

## Not checked

Non-admin sessions (only the admin login exists), the real Stripe card frame and wallets, priced delivery under £75, a bag with lenses, the draft at 768.

Screenshots are in this folder.
