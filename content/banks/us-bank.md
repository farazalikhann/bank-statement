---
name: "US Bank"
slug: "us-bank-statement-to-excel"
description: "Convert a US Bank checking or savings statement PDF to Excel or CSV, including statements sectioned into deposits and withdrawals."
dateFormat: "MM/DD"
columnLayout: "Deposits/Other Credits and Withdrawals/Other Debits, each with Date, Description, Amount"
---

## What a US Bank statement PDF looks like

US Bank checking statements (Smartly Checking, Silver/Gold/Platinum Checking Packages) generally follow the sectioned layout common among larger national banks: transactions are grouped under headers like "Deposits and Other Credits" and "Withdrawals and Other Debits," each internally chronological, rather than one combined running list. If the account has check-writing activity, a separate "Checks" section lists check number, date, and amount. US Bank statements also commonly include a brief "Account Summary" box near the top — beginning balance, total deposits, total withdrawals, ending balance — before the itemized sections begin, which is useful as a built-in reconciliation target.

## Where to download it

Log into US Bank's online banking or mobile app, select the account, and go to **Statements & Documents** or **Account Statements**. PDFs are typically available for several years of account history.

## Date format and columns

Dates print as `MM/DD` per row within the statement period (year inferred from the statement header), alongside a description and an amount whose direction is determined by which section it's listed under rather than a sign in front of the number.

## Common issues when converting

As with other sectioned-layout banks, the main task is combining the separate Deposits/Withdrawals/Checks sections back into one chronological, correctly-signed list before reconciling against the account summary box's beginning and ending balance figures. Because that summary box already states the expected totals, it doubles as a built-in check: if your combined, converted spreadsheet's sum of transactions doesn't match "total deposits minus total withdrawals" as printed in the summary, that's a fast way to catch a missed or misread row without needing to trace through every individual balance.

Watch for the Checks section specifically if the account has check-writing activity — it's often formatted slightly differently from the Deposits/Withdrawals sections (check number as its own column, sometimes with gaps in the sequence for unused or voided checks), and a parser that expects every section to have an identical column structure can occasionally misalign a check-number column with a date or amount column if it's not treating each section independently.
