---
name: "Capital One"
slug: "capital-one-statement-to-excel"
description: "Convert a Capital One 360 Checking or Savings statement PDF to Excel or CSV — a simpler, digital-first layout with one continuous transaction table."
dateFormat: "MM/DD/YYYY"
columnLayout: "Date, Description, Transaction Amount, Balance (single continuous table)"
---

## What a Capital One statement PDF looks like

Capital One 360 Checking and 360 Performance Savings statements tend to be simpler to work with than statements from banks with a long branch-banking legacy, largely because Capital One's online-first products were designed without decades of legacy paper-statement formatting to carry forward. Most 360 statements print one continuous chronological transaction table — Date, Description, Transaction Amount, and a running Balance — without splitting deposits and withdrawals into separate sections the way some older statement templates do.

Capital One also issues statements for its acquired ING Direct (now 360) accounts and, separately, for Capital One credit cards, which follow the different credit-card statement structure (previous balance, payments, purchases, new balance) rather than the checking-account running-balance format — worth knowing if you're converting a credit card statement rather than a 360 Checking one, since the column layout is genuinely different between the two products.

## Where to download it

In Capital One's online banking or mobile app, select the account and look for **Statements & Documents** or **Account Statements**. PDF statements are typically available for several years of account history.

## Date format and columns

Capital One 360 statements print a full `MM/DD/YYYY` date per row alongside a description and a signed transaction amount, with a running balance column — a comparatively clean, single-table structure that doesn't require combining multiple sections to get a full chronological view.

## Common issues when converting

Because the 360 Checking layout is more consistently single-table than several competitor banks, the main things worth double-checking are at the edges of the statement: opening and closing summary lines (sometimes labeled "Beginning Balance" and "Ending Balance") that sit visually close to the transaction table but aren't transactions themselves, and should be excluded from the row count even though they're date-adjacent and dollar-shaped like a real row.

If you're converting a Capital One credit card statement rather than a 360 Checking/Savings statement, don't expect a running balance column at all — credit card statements list individual charges and payments against a single previous/new balance summary at the top, which is a structurally different format from the checking-account layout described here.
