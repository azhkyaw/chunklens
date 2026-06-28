import type { CollectionDetails } from "../../api/types";

export function interpretQueryError(message: string, ctx: { details?: CollectionDetails }): string {
  if (/dimension/i.test(message)) {
    const dim = ctx.details?.dimensionality;
    return `Your query vector's dimensionality doesn't match the collection${dim ? ` (it expects ${dim})` : ""}.`;
  }
  if (/embedding function/i.test(message) || /no embedding/i.test(message)) {
    return "This collection has no embedding function; text queries can't be embedded. Provide a raw vector.";
  }
  return message;
}
