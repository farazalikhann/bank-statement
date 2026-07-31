---
title: "How Mortgage Brokers Process 24 Months of Bank Statements for a Loan File"
slug: "mortgage-brokers-24-months-bank-statements"
description: "A practical approach to turning 12-24 months of an applicant's bank statements into a spreadsheet an underwriter can actually work from, checking for consistent deposits and unexplained gaps along the way."
date: "2026-07-07"
author: "Faraz Ali Khan"
tags: ["mortgage", "workflow"]
readingTime: "6 min read"
---

A self-employed applicant, a non-traditional income source, or a lender that wants deeper income verification than a pay stub provides — any of these can turn a straightforward loan file into one where you need 12 to 24 months of bank statements, often across more than one account, cross-checked for consistent deposits and unexplained gaps before the file can move to underwriting. Retyping two years of transactions by hand, per applicant, per account, is the part of this job that nobody enjoys and every file still requires.

## What underwriting actually needs from this data

It's worth being precise about what you're building toward, because it shapes how you should process the statements in the first place. An underwriter reviewing bank statement income typically wants to see:

- **Deposit consistency** — do recurring deposits (payroll, client payments, rental income) show up at a regular cadence and amount, or is there unexplained variance?
- **Unexplained large deposits** — a single large deposit that doesn't match the applicant's documented income pattern is something underwriting will flag and ask about, so finding it yourself before submission saves a round-trip.
- **Account activity gaps** — a month with unusually low activity, or a period where the account looks dormant, can raise questions about whether this is really the applicant's primary operating account.
- **NSF or overdraft activity** — even a single instance often needs an explanation letter, so it's worth knowing it's there before the file reaches an underwriter who will definitely find it.

None of this is answerable from a stack of PDFs on their own. It's answerable from a clean, chronological spreadsheet of every transaction across the full period, which is what you're actually building when you convert these statements.

## The actual process across multiple statements and accounts

**1. Convert each monthly statement separately, verifying its own balance first.** Even though the end goal is one combined view across 24 months, each individual PDF still needs its own accuracy check before it goes into that combined view. Enter the opening and closing balance printed on each statement, and [StatementKit](/) walks every transaction forward from the opening figure, flagging the exact row if the running total doesn't land on the closing balance. A single misread transaction compounding silently across 24 months of combined data is a much harder problem to find later than catching it against one month's printed balance right after conversion.

**2. Watch for date-format and column-layout shifts between statements from the same account.** It's more common than you'd expect for a bank to change its statement template between an applicant's older and more recent statements — a column that used to show signed amounts switches to a debit/credit split, or the date format changes. Because the underlying approach reads column positions from whitespace per page rather than assuming a fixed template, each statement gets parsed on its own terms rather than needing a format you have to notice and manually account for.

**3. Combine the exported data into one chronological file per applicant, per account.** With each month exported to a consistent column structure, stacking them into a single running spreadsheet becomes a matter of concatenation rather than reconciliation — and because the amounts are real numeric values rather than text, a running total or a `SUMIFS` by month is something you can build once and trust, rather than something you have to first clean up.

**4. Scan the combined view specifically for the four things underwriting cares about**, listed above, before the file goes anywhere. Sorting the combined sheet by amount, descending, surfaces large deposits fast. Sorting by date and eyeballing gaps between consecutive transaction dates surfaces dormant periods. This is a five-minute pass once the data is clean, and it's the difference between submitting a file that answers underwriting's questions before they're asked and submitting one that bounces back with a request for an explanation letter two weeks into processing.

## Why this matters more per-applicant than per-transaction

The volume math here is different from a bookkeeping workflow. A bookkeeper processes many clients' statements every month, indefinitely. A broker processes many months of statements for one applicant, once, under time pressure to keep a loan file moving. The time saved isn't spread evenly across a routine — it's concentrated at exactly the moment a file is sitting in your queue while a rate lock clock is running. Getting from "24 PDFs" to "one clean, checked spreadsheet ready for underwriting" in an afternoon instead of two days is often the difference between a file that stays on schedule and one that doesn't.

## Handling this for an applicant's sensitive financial history

Two years of an applicant's bank statements is about as complete a financial picture of a person as exists in a loan file — every merchant, every payroll deposit, every recurring bill. Running that through an upload-based converter means it sits on a third party's server, even briefly, for every single one of those 24 files. Processing them in a tool that runs entirely in the browser — verifiable by disconnecting from the internet and confirming it still works exactly the same — means that exposure simply doesn't exist for a category of document where it arguably matters more than almost any other type of financial paperwork you'll handle in this job.

[StatementKit](/) doesn't have a server in the loop at all, which means there's nothing to configure, trust, or worry about for the applicant whose full financial history you're about to spend an afternoon combing through.
