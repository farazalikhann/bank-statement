---
name: "American Express"
slug: "amex-statement-to-excel"
description: "Convert an American Express credit card statement PDF to Excel or CSV — a charges-and-payments format with no running balance column, unlike a checking account statement."
dateFormat: "MM/DD/YY"
columnLayout: "Date, Description, Amount per charge (no running balance; summarized against Previous/New Balance)"
---

## What an Amex statement PDF looks like

American Express statements are fundamentally different from a bank checking statement, because a credit card statement isn't tracking a running cash balance — it's tracking charges against a credit line. An Amex statement opens with a summary box (Previous Balance, Payments, Credits, New Charges, Fees, Interest Charged, New Balance) and then lists individual charges chronologically with a date, merchant description, and amount — but no running balance column threading through the transaction list the way a checking account statement has. The "balance" that matters is the single New Balance figure in the summary box, not a per-row running total.

Amex statements for small-business cards (Business Platinum, Business Gold) often add a "Spend by category" or expense-category breakdown page, and statements covering multiple employee cards on one account list each cardholder's charges in its own labeled section.

## Where to download it

In the Amex online account center or app, go to **Statements & Activity** and select **Statement** for the billing period you want. PDF statements are typically available for a couple of years of account history through the online portal, with older history available on request.

## Date format and columns

Amex prints a `MM/DD/YY` transaction date (and sometimes a separate "date posted" alongside the transaction date) with a merchant description and a single amount per charge — positive for charges, negative for payments and credits — but again, no per-row balance column.

## Common issues when converting

Because there's no running balance to check row-by-row, the reconciliation approach that works for a checking account doesn't directly apply — instead, the meaningful check is whether the sum of all charges and payments/credits, added to the Previous Balance, equals the New Balance printed in the summary box. That's a single end-to-end check rather than a row-by-row chain, and it's still worth doing before relying on an exported spreadsheet, since a misread charge amount is just as easy to miss without a per-row balance to catch it against.

For multi-cardholder business accounts, keep each cardholder's section separate when categorizing or reporting on the data — combining charges from different cardholders into one undifferentiated list loses information that's often specifically why a business wanted per-card statements in the first place.
