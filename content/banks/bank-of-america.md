---
name: "Bank of America"
slug: "bank-of-america-statement-to-csv"
description: "Convert a Bank of America checking or savings statement PDF to CSV or Excel, including statements with a separate daily-balance summary table."
dateFormat: "MM/DD/YY"
columnLayout: "Deposits and other additions / Withdrawals and other subtractions, each with Date, Description, Amount"
---

## What a Bank of America statement PDF looks like

Bank of America checking statements (Advantage Banking and its variants) follow a similar pattern to several other large national banks: transactions are grouped into labeled sections rather than one continuous list — typically "Deposits and other additions," "Withdrawals and other subtractions," and, if you write checks, a separate "Checks" section listing check number, date, and amount. Ahead of the transaction detail, Bank of America statements commonly print a "Daily ledger balance" summary — a compact table showing the account balance at the end of specific days during the period, which is a separate table from the transaction list and isn't meant to be combined with it row-for-row.

## Where to download it

In Bank of America's online banking, go to **Accounts**, select the account, and look for **Statements & Documents** (sometimes labeled **eStatements**). Statements are available as PDFs, typically going back several years depending on when the account was opened and enrolled in paperless statements.

## Date format and columns

Transactions print with a `MM/DD/YY` date, a description, and an amount — deposits and withdrawals are separated into their own sections rather than distinguished by sign within one combined column, similar to Chase's layout. The daily ledger balance summary table mentioned above uses full dates and a running dollar figure, but again, it's a distinct table from the itemized transaction sections.

## Common issues when converting

The daily ledger balance table is the detail most likely to confuse an automated parser, or a person doing this by hand: it visually resembles a two-column table (date, balance) sitting on the same page as the real transaction sections, and it's easy for a naive "grab every date-shaped row" approach to accidentally pull in ledger-balance rows as if they were transactions, which will throw off both the row count and the balance reconciliation. A parser that identifies genuine transaction rows by looking for a description alongside the date and amount — not just a date-shaped value — avoids picking up the ledger balance rows, since those don't have a transaction description attached to them.

The other thing worth checking is which section a given amount belongs to when combining sections back into one chronological list for reconciliation: because deposits and withdrawals live in separate sections rather than being distinguished by a plus/minus sign, it's important that a withdrawal row is treated as negative when you combine everything, even though the amount is printed as an unsigned positive number in its own section.
