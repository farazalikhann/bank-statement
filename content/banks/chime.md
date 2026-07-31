---
name: "Chime"
slug: "chime-statement-to-excel"
description: "Convert a Chime spending account statement PDF to Excel or CSV — a simple debit-only transaction list with no checks section and no separate balance column per row."
dateFormat: "MM/DD/YYYY"
columnLayout: "Date, Description, Amount (no per-row running balance; period summary only)"
---

## What a Chime statement PDF looks like

Chime is a fintech (technically a financial technology company, with banking services provided by partner banks like The Bancorp Bank or Stride Bank) built entirely around a mobile-first debit spending account, and its statements are correspondingly simple. There's no check-writing feature on a Chime account at all, so unlike a traditional checking statement, you'll never see a "Checks Paid" section — every transaction is a debit card purchase, a transfer, an ATM withdrawal, or a direct deposit. Chime statements print one continuous chronological list: date, description, and a signed amount, without the multi-section deposits/withdrawals split some traditional banks use, and often without a running balance column printed next to every individual row — instead showing a beginning and ending balance for the period as summary figures.

## Where to download it

In the Chime app, go to **Settings**, then **Documents**, and select the statement for the month you want. Chime is app-first, so statement access through a desktop browser is more limited than through the mobile app itself.

## Date format and columns

Chime statements print a full `MM/DD/YYYY` date, a transaction description (often the merchant name as it appears on the card network's transaction data), and a signed amount, with beginning and ending period balances shown as summary figures rather than a running per-row balance.

## Common issues when converting

Because there's no per-row balance column, the reconciliation approach is closer to Amex's than to a traditional bank's: check that the sum of all transactions, added to the beginning balance, equals the ending balance printed for the period, rather than checking a running total row by row. This is a single end-to-end check instead of a chain, but it's still worth doing, since a misread amount is otherwise just as easy to miss.

The simplicity of Chime's format is generally an advantage when converting — there's no sectioning, no check-number column, and no legacy formatting inconsistency to account for — but it does mean there's less redundancy in the data to catch an error against, so the beginning/ending balance check matters more here than it would on a statement with a full running-balance column doing that verification work on every single row.
