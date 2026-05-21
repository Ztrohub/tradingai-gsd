export function runStatusColor(status: string): string {
  switch (status) {
    case "queued":
      return "#1F3A5F";
    case "running":
      return "#E06C2F";
    case "succeeded":
      return "#2E7D32";
    case "failed":
      return "#C62828";
    case "skipped_overlap":
      return "#6D4C41";
    case "canceled":
      return "#546E7A";
    default:
      return "#1F3A5F";
  }
}
