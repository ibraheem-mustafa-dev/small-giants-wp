# SGS gift cards: an emailed gift card with a balance, redeemed in the block checkout

**Why:** Mama's Munches' draft sells a "Baby Shower Gift Card" (£15 / £25 / £40, `sites/mamas-munches-redesign/handoff/store.js` product `giftcard`, shown on Home, Gifts and its own product page). It cannot publish today: `Product_Preflight::evaluate` (check 6, `no_variesby`) unpublishes a variable product whose options map to no `Configurator_Meta::VARIESBY_ENUM` value, and an amount never maps. Bean chose to build gift cards into SGS rather than add a plugin (2026-10-28). Research: `.claude/reports/2026-10-28-gift-card-requirements.md` (§6 requirements, §7 decisions). Governing spec: Spec 27 (the SGS product + WooCommerce layer); this work adds its gift-card FRs.

## Decisions (Bean, 2026-10-28)

Each is a per-site setting whose default is Bean's answer, so any client can differ.
1. Delivery: emailed only (no printed card, no fulfilment step). The data model keeps a delivery-method field so a printed card can be added later.
2. Partial use: allowed; the balance stays on the card.
3. Expiry: 24 months from purchase (site setting, months), shown on the product page, checkout, emails and the card email.
4. Refunds: only the purchaser, only for a completely unused card, within 28 days of purchase (shop policy, above the 14-day legal minimum of the Consumer Contracts Regulations 2013 reg 30; site setting, days). Never to the recipient, never once any balance is spent. A lost code is reissued once to the purchaser with the old code disabled.
5. VAT: a site setting, default multi-purpose voucher (VAT is due when the card is spent, so redemption is a payment, not a discount); single-purpose is the other value. The client's accountant confirms per client.
6. Amounts: a list of fixed amounts per gift-card product (Mama's £15 / £25 / £40), plus an optional custom amount between a min and max, off by default.
7. Combining: allowed with coupon codes and on delivery charges; a gift card cannot buy another gift card.
8. Google feed: each fixed amount is listed as its own feed product; the page's structured data is `Product` with one `Offer` per amount, never `ProductGroup`.

## Requirements (from the report §6, adjusted to the decisions)

1. A gift-card product type with the amounts of decision 6, priced server-side; the preflight skips it.
2. Two tables, `{prefix}sgs_gift_cards` and an append-only `{prefix}sgs_gift_card_ledger`, amounts in integer pence, a row lock on redemption.
3. Codes: at least 80 bits of randomness, stored as an HMAC hash plus the last four characters; the plain code exists only in the issuing email.
4. Purchase fields: recipient name and email, optional message, sender name, optional send date.
5. Redemption as a payment line after tax, on the Cart and Checkout blocks (Store API extension data plus the block UI), shown on the order and its emails.
6. The balance is reserved at order creation, consumed on payment, released on cancel or failure, restored on refund.
7. Security: nonces, capability checks, sanitisation, `$wpdb->prepare()`, rate-limited code entry and balance lookup, one uniform error message, `hash_equals`.
8. Admin: list, search, ledger view, manual issue, balance adjustment with a reason, disable, change expiry, CSV export, liability total.
9. Emails through `SGS\Blocks\Mail\Sgs_Mailer`: purchaser confirmation, recipient delivery (on the send date), balance-after-use notice.
10. Customer balance lookup (rate limited) and "apply gift card" on the cart and checkout.
11. Every setting has an admin control (clients never touch code); UK English; no inline `style=""` (Spec 32); WCAG 2.1 AA.
12. Tests: PHPUnit for ledger maths, reservation and concurrency, code entropy and storage, preflight exemption, feed and schema output; a negative control for each refusal.

## Steps

1. Build on a worktree branch (one Sonnet subagent): requirements 1 to 12, Spec 27 gift-card FRs with Status lines, `plugins/sgs-blocks/CLAUDE.md` if its conventions call for it. Done when the PHPUnit suite, `audit-inline-styling.js --check`, phpcs on the new files and `check-no-client-names.py --check` pass.
2. Main thread reads the diff, merges to `main`.
3. Deploy to mamas-test after the Phase 2 re-clone's site runs end (never during a run; queue lines), then publish Mama's gift card with amounts £15 / £25 / £40 and check a real block-checkout purchase and redemption at 375/768/1440.

## Open

- The client's accountant confirms the VAT mode, and the client checks the refund wording, before real payments (go-live checklist).
