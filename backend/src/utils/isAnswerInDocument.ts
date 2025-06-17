export function isAnswerInDocument(answer: string): boolean {
  if (typeof answer !== "string") return false;
  return !answer.toLowerCase().includes("not found in the provided document.");
}
