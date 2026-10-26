import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  picker: vi.fn(),
  shareFile: vi.fn(),
  available: vi.fn(),
  shareText: vi.fn(),
  read: vi.fn(),
  create: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  Share: { share: mocks.shareText },
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: mocks.picker }));
vi.mock("expo-sharing", () => ({
  shareAsync: mocks.shareFile,
  isAvailableAsync: mocks.available,
}));
vi.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class {
    uri: string;
    size = 32;
    constructor(...parts: string[]) {
      this.uri = parts.join("/");
    }
    text = mocks.read;
    create = mocks.create;
    write = mocks.write;
    delete = mocks.remove;
  },
}));
import { pickCSV, saveCSV } from "../lib/budget/io";
describe("Native CSV transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.available.mockResolvedValue(true);
    mocks.read.mockResolvedValue("type,amount\nexpense,10");
  });
  it("reads a copied device CSV locally and deletes the temporary copy", async () => {
    mocks.picker.mockResolvedValue({
      canceled: false,
      assets: [
        { name: "ledger.csv", uri: "file:///cache/picked.csv", size: 32 },
      ],
    });
    await expect(pickCSV()).resolves.toBe("type,amount\nexpense,10");
    expect(mocks.picker).toHaveBeenCalledWith({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it("handles picker cancellation without importing", async () => {
    mocks.picker.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickCSV()).resolves.toBeNull();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("rejects oversized CSV files", async () => {
    mocks.picker.mockResolvedValue({
      canceled: false,
      assets: [
        { name: "ledger.csv", uri: "file:///large.csv", size: 6 * 1024 * 1024 },
      ],
    });
    await expect(pickCSV()).rejects.toThrow("5 MB");
  });
  it("writes a UTF-8 CSV file and opens the native file-share sheet", async () => {
    await saveCSV("month,amount\n2019-02,100", "budgets.csv");
    expect(mocks.create).toHaveBeenCalledWith({ overwrite: true });
    expect(mocks.write).toHaveBeenCalledWith("\uFEFFmonth,amount\n2019-02,100");
    expect(mocks.shareFile).toHaveBeenCalledWith(
      "file:///cache/budgets.csv",
      expect.objectContaining({ mimeType: "text/csv" }),
    );
  });
  it("offers a text-sharing fallback when file sharing is unavailable", async () => {
    mocks.available.mockResolvedValue(false);
    await saveCSV("type,amount", "ledger.csv");
    expect(mocks.shareText).toHaveBeenCalledWith({
      title: "ledger.csv",
      message: "type,amount",
    });
  });
});
