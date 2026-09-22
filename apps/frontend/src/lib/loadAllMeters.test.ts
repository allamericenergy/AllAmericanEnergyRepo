import { beforeEach, expect, it, vi } from "vitest";
import { api } from "./api";
import { loadAllMeters } from "./loadAllMeters";

vi.mock("./api", () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it("loads beyond 100 and 500 meters with the same company and product filters", async () => {
  const rows = Array.from({ length: 625 }, (_, id) => ({ id }));
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: { total: 625, data: rows.slice(0, 500) } })
    .mockResolvedValueOnce({ data: { total: 625, data: rows.slice(500) } });
  const signal = new AbortController().signal;
  expect(await loadAllMeters({ companyId: 42, productId: 2 }, signal)).toEqual({ total: 625, data: rows });
  expect(api.get).toHaveBeenNthCalledWith(2, "/reports/meters", {
    params: { companyId: 42, productId: 2, take: 500, skip: 500 }, signal
  });
});

it("handles an empty list without requesting more pages", async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { total: 0, data: [] } });
  expect(await loadAllMeters()).toEqual({ total: 0, data: [] });
  expect(api.get).toHaveBeenCalledTimes(1);
});

it("reports incomplete loading instead of silently showing a truncated list", async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { total: 200, data: [] } });
  await expect(loadAllMeters()).rejects.toThrow("complete meter list");
});
