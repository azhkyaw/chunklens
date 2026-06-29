import type { ExportFile } from "../../api/types";

export function serializeExport(data: ExportFile): string {
  return JSON.stringify(data, null, 2);
}

export function triggerDownload(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
