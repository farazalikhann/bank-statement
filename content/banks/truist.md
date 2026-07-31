---
name: "Truist Bank"
slug: "truist-statement-to-excel"
description: "Convert a Truist checking or savings statement PDF to Excel or CSV — including older accounts still carrying legacy BB&T or SunTrust statement formatting."
dateFormat: "MM/DD/YY"
columnLayout: "Date, Description, Amount, Balance (format varies by legacy BB&T vs. SunTrust conversion history)"
---

## What a Truist statement PDF looks like

Truist was formed from the 2019 merger of BB&T and SunTrust, and because account migrations to a unified Truist platform happened gradually over several years, statement formatting isn't perfectly uniform across every account — an account that migrated from legacy BB&T systems can look subtly different from one migrated from legacy SunTrust, and both eventually converge on Truist's standard template. If you're working with statements spanning the migration period for a given account, don't be surprised if the column layout, date format, or section headers shift partway through a run of monthly statements — that's the platform migration showing up in the paperwork, not an error in the PDF.

Current Truist checking statements (Truist One Checking and similar) generally use a single continuous transaction table with a running balance column, without the multi-section deposits/withdrawals split some other large banks use.

## Where to download it

In Truist online banking, go to the account and select **Statements & Documents**. Depending on which legacy bank the account originated from, statement history further back than the 2019-2022 migration window may be limited or may need to be requested separately.

## Date format and columns

Current-era Truist statements use `MM/DD/YY` with a description and signed amount alongside a running balance. If you're working with pre-migration statements from either legacy institution, treat each as its own format — don't assume a template that worked on a 2023 Truist statement will necessarily match a 2019 legacy BB&T or SunTrust one from the same account.

## Common issues when converting

The main practical issue is consistency across a multi-month or multi-year run of statements for accounts that existed before the 2019 merger: a bookkeeper pulling 18 months of history to build a combined ledger may find the column layout genuinely changes partway through, which is worth checking for explicitly (rather than assuming) if the account has been open since before 2020. Because a whitespace-based approach reads each statement's own layout independently rather than assuming one fixed template across every file, a format shift mid-history doesn't require a different tool or process — just awareness that it can happen, so an unexpected column-count difference between two consecutive months isn't necessarily a parsing error.
