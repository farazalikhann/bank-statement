---
name: "Citibank"
slug: "citibank-statement-to-excel"
description: "Convert a Citibank checking or savings statement PDF to Excel or CSV, including accounts with multi-currency or international activity."
dateFormat: "MM/DD/YY"
columnLayout: "Date, Description, Amount, Balance (single continuous table)"
---

## What a Citibank statement PDF looks like

Citibank checking statements (Citi Priority, Citigold, and standard Citibank Account Package) typically run as one continuous chronological table — Date, Description, Amount, and a running Balance column — rather than being split into separate sections by transaction type. Citigold and other relationship-tier accounts sometimes include additional summary pages ahead of the transaction detail (average balance calculations, relationship-tier qualification summaries), which sit on their own pages separate from the actual transaction table.

Citibank's international footprint means some account holders see statements with foreign transaction detail — a purchase in a foreign currency alongside its converted USD amount — which adds an extra number per row that isn't part of the core Date/Description/Amount/Balance structure.

## Where to download it

In Citibank Online, go to the account and select **Statements** from the account menu, or **Documents & Statements** from the main account services menu. Statements are available as PDFs, generally for several years of account history depending on enrollment date in paperless statements.

## Date format and columns

Citibank prints dates as `MM/DD/YY` and maintains a single running balance column alongside a signed (or clearly directional) amount per transaction, which makes the core table more straightforward to work with than banks that split deposits and withdrawals into separate sections.

## Common issues when converting

The relationship-tier summary pages are the main thing to watch for — average daily balance tables and tier-qualification summaries can visually resemble transaction tables (they're tables of dates and dollar amounts, after all) but aren't part of the actual transaction history, and including them in a converted spreadsheet will throw off both the row count and any balance reconciliation. A parser that requires a description alongside the date and amount — not just a date-shaped and currency-shaped pair — correctly skips these summary tables, since they typically don't have a transaction description field.

For accounts with foreign-currency activity, the extra converted-currency figure printed alongside some rows can occasionally get picked up as a second amount column if a parser isn't specifically distinguishing the primary transaction amount from a secondary reference figure — worth double-checking any row involving a foreign transaction against the original PDF before relying on the converted spreadsheet for that row.
