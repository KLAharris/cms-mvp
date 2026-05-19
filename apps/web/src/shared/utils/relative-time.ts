export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${String(minutes)} min ago`;
  } else if (hours < 24) {
    return `${String(hours)} hr ago`;
  } else {
    return `${String(days)} day${days !== 1 ? 's' : ''} ago`;
  }
}
