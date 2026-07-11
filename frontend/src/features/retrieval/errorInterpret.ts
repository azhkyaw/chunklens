import type { CollectionDetails } from "../../api/types";

/**
 * The API rejects a malformed request body with a 422 whose payload is a list of
 * machine-readable validation errors, and api/client.ts throws it as
 * `422: {"detail":[...]}`. Rendering that string verbatim puts raw JSON in front
 * of the user, so pull out the offending fields and their messages.
 * Returns undefined when `message` is not a validation failure.
 */
function interpretValidationError(message: string): string | undefined {
  const body = /^422:\s*([\s\S]*)$/.exec(message)?.[1];
  if (body === undefined) return undefined;

  let fields: string[] = [];
  try {
    const detail = (JSON.parse(body) as { detail?: unknown }).detail;
    if (Array.isArray(detail)) {
      fields = detail.map((d) => {
        const e = d as { loc?: unknown[]; msg?: unknown };
        // loc is ["body", "<field>", ...]; the "body" prefix is noise to a user.
        const where = Array.isArray(e.loc)
          ? e.loc.filter((p) => p !== "body").join(".")
          : "";
        const msg = typeof e.msg === "string" ? e.msg : "is not valid";
        return where ? `${where} - ${msg}` : msg;
      });
    }
  } catch {
    // Not the JSON shape we expect (a proxy error page, say). Fall through to
    // the generic sentence rather than leaking the body.
  }

  return fields.length > 0
    ? `Invalid query: ${fields.join("; ")}.`
    : "Invalid query: the server rejected this request. Check n_results and your filters.";
}

export function interpretQueryError(message: string, ctx: { details?: CollectionDetails }): string {
  const invalid = interpretValidationError(message);
  if (invalid) return invalid;
  if (/dimension/i.test(message)) {
    const dim = ctx.details?.dimensionality;
    return `Your query vector's dimensionality doesn't match the collection${dim ? ` (it expects ${dim})` : ""}.`;
  }
  if (/embedding function/i.test(message) || /no embedding/i.test(message)) {
    return "This collection has no embedding function; text queries can't be embedded. Provide a raw vector.";
  }
  return message;
}
