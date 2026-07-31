const USERS = [
  {
    title: 'Bookkeepers',
    body: `Bookkeepers running 20-50 monthly clients spend the first week of every month pulling last month's statements and turning them into ledger entries before any actual bookkeeping starts. Cutting that from roughly an hour per client down to a few minutes each gives back most of a working week, every single month, indefinitely — time that goes back into billable advisory work instead of data entry.`,
  },
  {
    title: 'Mortgage brokers',
    body: `Mortgage brokers verifying income for a loan file often need 12-24 months of statements from more than one account, cross-checked for consistent deposits and unexplained gaps. Retyping two years of transactions by hand, per applicant, per account, is the part of underwriting nobody enjoys and every file still requires before it can move forward.`,
  },
  {
    title: 'Small business owners',
    body: `Small business owners doing their own quarterly taxes usually have one business account and a shoebox of statements they've been putting off since the last deadline. StatementKit turns an afternoon of manual entry into the kind of ten-minute task that stops quarterly taxes from being something you dread, and lets you actually start them on time.`,
  },
];

export function WhoUsesThis() {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">Who uses this</h2>
      <div className="flex flex-col gap-4">
        {USERS.map((user) => (
          <div key={user.title} className="flex flex-col gap-1.5">
            <h3 className="font-heading text-base font-medium text-ink">{user.title}</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{user.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
