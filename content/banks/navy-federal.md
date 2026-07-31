---
name: "Navy Federal Credit Union"
slug: "navy-federal-statement-to-excel"
description: "Convert a Navy Federal Credit Union statement PDF to Excel or CSV, including combined statements covering multiple share accounts (checking, savings, money market) at once."
dateFormat: "MM/DD"
columnLayout: "Per share-account sections (e.g. Checking, Regular Share/Savings), each with Date, Description, Amount, Balance"
---

## What a Navy Federal statement PDF looks like

As a credit union, Navy Federal uses "share" terminology rather than "account" — your savings account is technically your "Regular Share," reflecting the member-ownership structure credit unions are built on — and its statements commonly combine multiple share accounts into a single PDF for a member: Checking, Regular Share (savings), and any Money Market or share certificate accounts often appear as separate labeled sections within one combined statement, rather than each requiring its own separate document. This is genuinely useful for members with several linked share accounts, but it means a converted spreadsheet needs to track which section a given transaction came from rather than treating the whole PDF as one account.

Military members and their families (Navy Federal's core membership base) sometimes have activity tied to military pay schedules — mid-month and end-of-month direct deposits — which shows up as a distinctly regular pattern in the checking share's transaction history, worth noting if you're specifically checking for deposit consistency.

## Where to download it

In Navy Federal's online banking or mobile app, go to **Statements & Documents** or **eStatements** from the main account menu. Combined statements covering multiple share accounts are typically available as a single PDF per statement period.

## Date format and columns

Navy Federal prints `MM/DD` dates per row (year from the statement period header) with description, amount, and a running balance within each share-account section.

## Common issues when converting

The combined multi-share-account structure is the main thing to handle correctly: reconcile each share account against its own opening and closing balance rather than combining Checking and Regular Share activity into one undifferentiated running total, which would produce a balance figure that doesn't correspond to any real account. If you only need Checking activity — for example, for a loan application or expense tracking — make sure you're isolating just that section's rows before exporting, rather than the full combined statement.

The regular military-pay deposit pattern, while not a parsing issue, is worth being aware of if you're using a converted statement to check deposit consistency (for a mortgage file, for instance) — mid-month and end-of-month deposits of the same amount are normal and expected here, not a duplicate to flag.
