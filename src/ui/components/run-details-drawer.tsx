export function runDetailsSummary(input: { status: string; error_message?: string | null }) {
  return {
    title: `Run status: ${input.status}`,
    error: input.error_message ?? "No error"
  };
}
