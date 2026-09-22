import { api } from "./api";

export async function loadAllMeters<T>(
  filters: { companyId?: string | number; productId?: number } = {},
  signal?: AbortSignal
): Promise<{ total: number; data: T[] }> {
  const data: T[] = [];
  let total = 0;
  do {
    const response = await api.get<{ total: number; data: T[] }>("/reports/meters", {
      params: { ...filters, take: 500, skip: data.length },
      signal
    });
    total = response.data.total;
    if (!response.data.data.length && data.length < total) {
      throw new Error("Unable to load the complete meter list. Please refresh and try again.");
    }
    data.push(...response.data.data);
  } while (data.length < total);
  return { total, data };
}
