import { api } from "../../api/client";
import { toastError, toastSuccess } from "../../ui/toast";
import { serializeExport, triggerDownload } from "./download";

/** Shared by ExportButton and the palette Export command. */
export async function runExport(name: string, includeVectors: boolean): Promise<void> {
  try {
    const data = await api.exportCollection(name, includeVectors);
    triggerDownload(`${name}.chunklens.json`, serializeExport(data));
    toastSuccess(`Exported ${name}`);
  } catch (e) {
    toastError(`Export failed - ${(e as Error).message}`);
  }
}
