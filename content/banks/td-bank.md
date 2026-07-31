---
name: "TD Bank"
slug: "td-bank-statement-to-excel"
description: "Convert a TD Bank checking or savings statement PDF to Excel or CSV — a continuous transaction table typical of TD's East Coast retail banking statements."
dateFormat: "MM/DD/YY"
columnLayout: "Date, Description, Amount, Balance (single continuous table)"
---

## What a TD Bank statement PDF looks like

TD Bank (the US retail bank, part of TD Bank Group and distinct from TD's Canadian personal banking arm) issues checking and savings statements — TD Simple Checking, TD Beyond Checking, TD Convenience Checking — that generally use a single continuous chronological transaction table with a running balance, rather than splitting deposits and withdrawals into separate labeled sections. A summary box near the top of the statement (beginning balance, total deposits and credits, total withdrawals and debits, ending balance) is common, similar to other regional and national retail banks, and is useful as a quick reconciliation target before checking row-by-row.

## Where to download it

In TD Bank's online banking or the TD app, select the account and look for **Statements**. PDF statements are typically available for several years of account history, with paperless enrollment affecting how far back electronic copies go versus needing to request older paper statement copies.

## Date format and columns

TD Bank statements print a `MM/DD/YY` date per transaction alongside a description, a signed (directional) amount, and a running balance column, giving a comparatively straightforward single-table structure to work with.

## Common issues when converting

Because TD's layout is a single continuous table rather than multiple sections, the most common source of a bad conversion is at the statement's edges rather than in the body: opening and closing balance summary lines, and occasionally a "Service Charge Summary" or fee-schedule box, can sit close enough to the transaction table that a parser without a clear rule for "what counts as a transaction row" may pick one up as if it were a real transaction. A row that has a date and a dollar amount but no merchant-style description (or one that reads like a summary label instead of a transaction) is usually the tell that it's a summary line rather than an actual transaction, and it's worth spot-checking the first and last few rows of any converted TD statement against the original PDF for exactly this reason.
