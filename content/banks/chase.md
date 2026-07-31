---
name: "Chase Bank"
slug: "chase-bank-statement-to-excel"
description: "Convert a Chase checking or savings statement PDF to Excel or CSV, including statements that split transactions into separate deposits/checks/withdrawals sections."
dateFormat: "MM/DD"
columnLayout: "Sectioned by transaction type (Deposits, Checks, ATM & Debit), each with Date and Amount"
---

## What a Chase statement PDF looks like

Chase checking statements (Chase Total Checking, Chase Premier Plus, Chase Sapphire Checking) don't print one continuous chronological list of transactions the way some banks do. Instead, they group activity into labeled sections — typically "Deposits and Additions," "ATM & Debit Card Withdrawals," "Electronic Withdrawals," and "Checks Paid" — with each section internally chronological but not combined with the others. A statement with 45 transactions might show up as four shorter tables rather than one long one, each with its own Date and Amount columns and, in some sections, a brief reference or check number column instead of a running balance.

If you have a linked savings account, Chase often includes both accounts in a single combined statement PDF, with the savings activity appearing as its own section further down the page — worth knowing if you're trying to isolate just the checking activity.

## Where to download it

Log into Chase's online banking or the Chase Mobile app, go to the account, and look for **Statements & Documents** (web) or **Statements** under the account details (app). Statements are typically available as PDFs going back 7 years for checking and savings accounts opened as of a few years back; older accounts may have a shorter available history.

## Date format and columns

Chase statements use `MM/DD` (no year printed per row — the year is inferred from the statement period shown in the header) within each section, alongside a description and a single signed-direction amount (deposits and withdrawals are separated by section rather than by a plus/minus sign, since which section a row is in already tells you the direction).

## Common issues when converting

The sectioned layout is the main thing to watch for. Because each section is its own mini-table without a running balance column threading through the whole statement, reconciling the full period means combining every section back into one chronological list before checking the math against the opening and closing balance printed at the top of the statement. A whitespace-based column reader handles each section as its own table correctly, but it's worth confirming the combined transaction count matches what you'd expect from adding up each section's row count, since a missed section header can occasionally cause a section boundary to be misread as a data row.

Combined checking-plus-savings statements are the other thing to check for — make sure you're reconciling against the right account's opening/closing balance if both appear on one PDF, since it's easy to reconcile checking activity against the wrong balance figure if you're not looking carefully at which section belongs to which account.
