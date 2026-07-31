---
name: "Discover"
slug: "discover-statement-to-excel"
description: "Convert a Discover credit card statement PDF to Excel or CSV, plus notes on the different layout used by Discover Cashback Debit checking statements."
dateFormat: "MM/DD/YY"
columnLayout: "Date, Description, Amount per transaction (credit card format; Cashback Debit checking uses a running-balance format instead)"
---

## What a Discover statement PDF looks like

Most people encounter Discover as a credit card issuer, and Discover credit card statements follow the standard charges-against-a-credit-line format: a summary box (Previous Balance, Payments and Credits, New Purchases, Fees, Interest, New Balance) followed by an itemized transaction list with date, merchant description, and amount — no running balance column per row, since the relevant total is the New Balance figure in the summary. Discover statements also print a cashback rewards summary (cashback earned this period, by category) on a separate section of the same statement, which is not transaction data and shouldn't be included in a converted transaction spreadsheet.

Discover also offers Discover Cashback Debit, a checking-style account, which produces a genuinely different statement format — a continuous transaction list with a running balance, closer to a conventional bank checking statement than to the credit card format described above. If you're converting a Discover statement, it's worth confirming which product you're looking at before assuming which layout applies.

## Where to download it

For credit card statements, log into the Discover online account center or app and go to **Statements**, selecting the billing period you want. Cashback Debit statements are found under that account's own **Documents** section, separate from any Discover credit card the same person may also hold.

## Date format and columns

Discover credit card statements print `MM/DD/YY` transaction dates with description and amount per charge, no running balance. Cashback Debit statements use a running-balance format similar to other checking accounts.

## Common issues when converting

For the credit card format, the cashback rewards summary section is the main thing to exclude — it's a table of categories and dollar amounts that can visually resemble transaction rows but isn't part of the purchase history, and including it will overstate both the row count and any category-based spending total you calculate from the converted data.

For Cashback Debit statements, apply the same reconciliation approach you would for a standard checking account — enter the opening and closing balance and check that the running total lands correctly — since this product's statement is structured for that kind of check, unlike the credit card format.
