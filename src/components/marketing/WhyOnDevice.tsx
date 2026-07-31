export function WhyOnDevice() {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">Why on-device matters</h2>
      <p className="text-sm leading-relaxed text-ink">
        A bank statement isn't just numbers. It carries an account number, a
        running balance, and months of merchant history — enough on its own
        to piece together someone's identity, and often, if you're a
        bookkeeper, someone else's client data you're contractually and
        legally on the hook for. Uploading that to a stranger's server is a
        real risk, not a theoretical one, and no "we don't store your
        files" promise on a pricing page can fully close it — you're still
        trusting a claim you can't verify, about a server you'll never see.
      </p>
      <p className="text-sm leading-relaxed text-ink">
        StatementKit removes the question instead of answering it. There's
        no upload button that sends your file anywhere, because there's no
        server on the other end to receive it. The PDF parsing, the balance
        check, the Excel file it hands back — all of it runs in the
        JavaScript already loaded into your browser tab, the same way a
        spreadsheet formula runs on your machine and not ours. Close the
        tab, and nothing you dropped in it persists anywhere outside that
        browser session.
      </p>
      <p className="text-sm font-medium leading-relaxed text-ink">
        You don't have to take that on faith either. Turn off your WiFi.
        Drop a PDF. It still works.
      </p>
    </section>
  );
}
