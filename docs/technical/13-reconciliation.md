# Payment Reconciliation (VietQR / bank matching)

| Field      | Value                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Status     | Active                                                                |
| Date       | 2026-07-06                                                            |
| Scope      | Ingesting bank credits and matching them to receivables               |
| Depends on | `11-billing.md`, `06-finance.md`, `10-cross-cutting-conventions.md`   |

## 1. Purpose

Closes the money-in loop. At 500+ learners paying mostly by bank transfer,
matching each incoming credit to the right learner's receivable by hand is the
biggest collection toil and error source. This subsystem auto-matches what it
can and surfaces the rest for a human — turning `11-billing.md`'s cash
application from a manual step into a mostly-automated one.

Market-validated approach (VN): a static center bank account + a **reference
code in the transfer memo**, with incoming credits delivered in real time by a
bank-webhook aggregator (SePay/Casso-class), plus statement import as the
universal fallback. Money lands directly in the center's account.

## 2. Pipeline

```txt
Payment request (VietQR, memo carries ref code)
        │  learner/guardian transfers
        ▼
BankTransaction ── ingested (webhook or CSV import), deduped by bank txn id
        ▼
MatchingEngine ── exact-by-code → high-confidence → fuzzy candidates → unmatched
        ▼
PaymentTransaction (payer-level)  ──►  CashApplication (11-billing §9)
        │                                   allocate across receivables
        ▼                                   over → credit balance; none → suspense
   Receivable settled / AR aging updated
```

Reconciliation stops at producing a payer-level `PaymentTransaction` and handing
it to the existing cash application; it does not re-implement allocation.

## 3. Ingestion (adapter pattern)

A `BankTransactionSource` interface with pluggable implementations; provider
payloads stay in infrastructure adapters (`06-finance.md` rule 5). Never
hard-couple to one provider.

| Source | Phase | Notes |
| --- | --- | --- |
| Aggregator webhook (SePay/Casso-class) | 1 | real-time; 12+ banks; money to own account |
| Statement import (CSV/Excel) | 1 | universal fallback; works with any bank |
| Direct bank API / gateway | later | same interface, new adapter |

Rules:

1. **Idempotency: dedup by the source transaction id.** Aggregators retry and
   may double-send (their docs warn of this); re-importing a statement is
   common. Store the source txn id; a duplicate is a no-op. A `bank_transactions`
   table is the ingestion ledger (append-only).
2. **Verify webhook signatures** (HMAC-SHA256 / API key per provider); reject
   unsigned/invalid. Respond 200 fast; do matching asynchronously (enqueue), so
   the webhook ack never waits on matching.
3. Store the raw provider reference and payload snapshot on the
   `bank_transactions` row for audit and re-matching.
4. Ingestion is tenant-scoped: each tenant configures its own account/aggregator
   credentials; a credit is attributed to the owning tenant before matching.

## 4. The Match Reference Code

Generated when a **payment request** is issued (a payment request bundles a
payer's due receivables — often a guardian's children). The code goes into the
VietQR `addInfo` (transfer memo), so a clean transfer carries it back.

- Format: short, tagged, checksummed, regex-extractable — e.g. `HP` + base36(id)
  + check char → `HP2K7QX`; extract with `/HP[0-9A-Z]{5,8}/`.
- One code maps to one payment request → one payer's outstanding set, so one
  transfer can settle several children via allocation.
- Must survive human mangling: the QR pre-fills the memo (clean path); if the
  payer retypes and drops/garbles it, the fuzzy tier (section 5) catches it.

## 5. Matching Engine (tiered, deterministic first)

For each ingested `BankTransaction`:

1. **Exact by code** — a valid ref code in the memo resolves to a payment
   request → create the `PaymentTransaction`, auto-apply via cash application.
   This is the gold path and should cover most transfers.
2. **High confidence** — no code, but amount exactly equals a single open
   payment request for an identifiable payer (name/phone in memo) → auto-apply
   or suggest, per a tenant policy (`auto_apply_high_confidence` on/off).
3. **Fuzzy candidates** — amount / payer name / time window produce a ranked
   candidate list for a human to confirm; confirming applies it.
4. **Unmatched** — nothing plausible → the transaction sits in **suspense**
   (section 6).

Every automatic decision is recorded with its tier and confidence for audit and
later review.

## 6. Suspense (unapplied cash)

Money received but not yet allocated is **suspense** — a real holding state, not
a loss and not yet revenue against a receivable:

1. It is visible and worked down (an accountant queue), and reported (money we
   hold but have not attributed).
2. Resolving suspense = manual match to receivables (via cash application), or
   → credit balance (identified payer, no matching charge), or → refund/return
   (wrong transfer).
3. Suspense is a derived view over ingested-but-unapplied `BankTransaction`s
   plus unapplied `PaymentTransaction`s — consistent with derived balances
   (`11-billing.md` §12).

## 7. Corrections and Audit

1. Every match, auto-apply, manual match, and unmatch writes an audit row in the
   same transaction (`10-cross-cutting-conventions.md` §3).
2. Undo a wrong match via a **compensating reversal**, never by editing a
   settled application (append-only). Re-matching then proceeds normally.
3. Re-import / webhook replay is idempotent by source txn id — no double credit.

## 8. Provider Stance

- Adapter pattern; pick one aggregator (SePay/Casso-class) for phase 1 plus CSV
  import. Provider payloads and signature logic live in infrastructure adapters,
  out of domain code.
- Webhooks: idempotent, signature-verified, fast-ack + async match.
- Store provider reference ids on our records; never let a provider outage block
  ingestion (statement import is always available as fallback).

## 9. Testing Requirements

- Exact-code match auto-applies and settles the right receivables.
- Idempotency: replaying the same webhook / re-importing the same statement
  creates no duplicate credit (dedup by source txn id).
- One transfer with one code settles multiple children (allocation).
- Overpayment → credit balance; unidentifiable credit → suspense.
- Fuzzy candidate confirm applies; wrong match undo leaves a compensating
  reversal and correct final state.
- Webhook with bad signature is rejected.

## 10. Phase-1 Scope

Build:

- ref code generation on payment requests (VietQR `addInfo`)
- `bank_transactions` ingestion ledger; one aggregator webhook adapter
  (signed, idempotent, async match) + CSV statement import
- matching engine tiers 1, 2 (policy-gated), and the manual path for 3–4
- suspense queue + resolution to cash application / credit balance
- audit + compensating reversal for mismatches

Defer:

- direct bank-API adapters beyond the first aggregator
- ML/advanced fuzzy scoring (simple deterministic rules first)
- payout-side reconciliation (confirming disbursements) — reuses ingestion, low
  volume, later
