// Formats an ISO date string ('2026-07-15') for display. Parsed as UTC
// midnight and formatted in UTC too, so the displayed date can't shift by a
// day depending on the reader's (or the build server's) timezone.
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
