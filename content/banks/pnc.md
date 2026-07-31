---
name: "PNC Bank"
slug: "pnc-bank-statement-to-excel"
description: "Convert a PNC checking statement PDF to Excel or CSV, including Virtual Wallet statements that combine Spend, Reserve, and Growth sub-accounts on one PDF."
dateFormat: "MM/DD"
columnLayout: "Per sub-account sections (Spend/Reserve/Growth for Virtual Wallet), each with Date, Description, Amount, Balance"
---

## What a PNC statement PDF looks like

PNC's Virtual Wallet product is the detail that makes its statements meaningfully different from a standard single-account checking statement: Virtual Wallet combines up to three linked sub-accounts — Spend, Reserve, and Growth — on one statement PDF, each with its own transaction history and its own balance, printed as separate sections on the same document rather than as three separate statements. If you only need the Spend (everyday checking) activity, the Reserve and Growth sections further down the PDF are a different sub-account entirely and shouldn't be combined into the same reconciliation.

For standard PNC checking accounts (Standard, Performance, Performance Select — outside Virtual Wallet), statements are closer to a conventional single-account layout, often still grouping deposits and withdrawals into separate labeled sections.

## Where to download it

In PNC Online Banking, select the account and go to **Statements & Documents**. Virtual Wallet customers will see one combined statement covering all linked sub-accounts for the period; each sub-account's activity is clearly labeled within that single PDF.

## Date format and columns

PNC prints `MM/DD` dates per row (year from the statement header) with a description and directional amount, plus a running balance within each section or sub-account.

## Common issues when converting

For Virtual Wallet statements, the sub-account boundaries are the thing to get right: converting the whole PDF without separating Spend from Reserve and Growth will combine three genuinely different accounts' balances into one meaningless running total. Treat each sub-account section as its own statement for reconciliation purposes — enter that sub-account's own opening and closing balance, not a combined figure, when checking the math.

For standard (non-Virtual Wallet) PNC checking statements, the usual sectioned-layout caution applies: deposits and withdrawals sit in separate labeled blocks rather than one signed column, so combining them into a single chronological list correctly requires tracking which section (and therefore which direction) each row came from before summing anything.
