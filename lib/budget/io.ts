import { Platform, Share } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
const LIMIT = 5 * 1024 * 1024;
export async function pickCSV(): Promise<string | null> {
  if (Platform.OS !== "web") {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset.name.toLowerCase().endsWith(".csv"))
      throw new Error("Please select a .csv file.");
    const file = new File(asset.uri);
    if ((asset.size ?? file.size) > LIMIT)
      throw new Error("Please choose a CSV smaller than 5 MB.");
    try {
      return await file.text();
    } finally {
      try {
        file.delete();
      } catch {}
    }
  }
  const doc = (globalThis as any).document;
  return new Promise((resolve, reject) => {
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv,text/plain";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > LIMIT)
        return reject(new Error("Please choose a CSV smaller than 5 MB."));
      try {
        resolve(await file.text());
      } catch {
        reject(
          new Error("Could not read this file. Try pasting its contents."),
        );
      }
    };
    input.click();
  });
}
export async function saveCSV(text: string, filename: string) {
  if (Platform.OS !== "web") {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write("\uFEFF" + text);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Save your Birrbook CSV backup",
        UTI: "public.comma-separated-values-text",
      });
    else await Share.share({ title: filename, message: text });
    return;
  }
  const g = globalThis as any;
  const blob = new g.Blob(["\uFEFF" + text], {
    type: "text/csv;charset=utf-8;",
  });
  const url = g.URL.createObjectURL(blob);
  const link = g.document.createElement("a");
  link.href = url;
  link.download = filename;
  g.document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => g.URL.revokeObjectURL(url), 2000);
}
