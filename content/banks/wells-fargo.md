---
name: "Wells Fargo"
slug: "wells-fargo-statement-to-excel"
description: "Convert a Wells Fargo Everyday Checking or savings statement PDF to Excel or CSV, with a continuous transaction history and running balance column."
dateFormat: "MM/DD"
columnLayout: "Date, Description, Additions, Subtractions, Ending daily balance"
---

## What a Wells Fargo statement PDF looks like

Wells Fargo checking statements (Everyday Checking, Preferred Checking, Clear Access Banking) generally use a more continuous chronological transaction history than the sectioned layout Chase and Bank of America use — one table, moving through the statement period in date order, rather than being split into separate deposits/withdrawals sections. Many Wells Fargo statements print separate "Additions" and "Subtractions" columns side by side rather than a single signed amount column, plus an "Ending daily balance" column that only populates on days where the balance actually changed, leaving it blank on rows within the same day.

## Where to download it

From Wells Fargo's online banking, select the account and go to **Statements and Documents** (web) or the equivalent menu in the mobile app. PDF statements are typically available going back around 7 years for open accounts.

## Date format and columns

Dates print as `MM/DD` without the year on each row, relying on the statement period header for the year, similar to several other large banks. The two-column Additions/Subtractions layout (rather than one signed Amount column) means a transaction's direction is determined by which of the two columns holds a value, not by a sign in front of the number.

## Common issues when converting

The Additions/Subtractions split is the main thing that trips up a naive approach expecting a single "Amount" column: if a parser assumes there's exactly one amount column per transaction row, it can either miss half of the transactions (whichever column it didn't check) or double-count rows where it doesn't realize the two columns are mutually exclusive alternatives rather than two separate values to sum. Handling this correctly means recognizing both columns as one logical Amount field where a value in Subtractions is a negative and a value in Additions is a positive, rather than treating them as unrelated columns.

The "ending daily balance populated only when it changes" detail is the other one worth watching: several transactions can share a single balance figure that's printed once, next to the last transaction of that day, rather than next to every row. A balance-reconciliation check that expects every row to carry its own balance will see a lot of blank balance cells on a Wells Fargo statement — which is expected, not a parsing failure, and a good reconciliation approach re-anchors at the next row with a printed balance rather than treating every blank as an error.
