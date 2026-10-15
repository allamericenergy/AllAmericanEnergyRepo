import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: {
    SHAREPOINT_TENANT_ID: "tenant",
    SHAREPOINT_CLIENT_ID: "client",
    SHAREPOINT_CLIENT_SECRET: "secret",
    SHAREPOINT_SITE_ID: "site",
    SHAREPOINT_DRIVE_ID: "drive",
    SHAREPOINT_COMPANY_ROOT_PATH: "Companies",
    SHAREPOINT_COMPANY_SUBFOLDERS: "Contracts,UtilityBills",
    SHAREPOINT_COMPANY_SUBFOLDERS_UTILITYBILLS: "Power"
  }
}));

import { env } from "../config/env.js";
import { addAccountReportsFolders, createCompanySharePointFolders, listCompanySharePointDocuments } from "./sharepointFolders.js";

afterEach(() => {
  vi.unstubAllGlobals();
  env.SHAREPOINT_COMPANY_SUBFOLDERS = "Contracts,UtilityBills";
});

describe("company SharePoint folders", () => {
  it("backfills missing folders, keeps existing folders, skips unlinked companies and continues after errors", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes("/oauth2/")) return Response.json({ access_token: "token" });
      if (url.includes("/items/existing:")) return Response.json({ folder: {} });
      if (url.includes("/items/broken:")) return Response.json({}, { status: 403 });
      if (options?.method === "POST") return Response.json({ id: "new-folder" }, { status: 201 });
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await addAccountReportsFolders([
      { id: 1, companyName: "Existing", companyFolderId: "existing" },
      { id: 2, companyName: "Unlinked", companyFolderId: null },
      { id: 3, companyName: "Broken", companyFolderId: "broken" },
      { id: 4, companyName: "Missing", companyFolderId: "missing" }
    ]);
    expect(result).toEqual({ created: 1, existing: 1, skipped: 1, failed: [{ id: 3, companyName: "Broken", error: "Unable to check folder (403)." }] });
    const posts = fetchMock.mock.calls.filter(([url, options]) => url.endsWith("/children") && options?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({ name: "Account Reports", folder: {}, "@microsoft.graph.conflictBehavior": "fail" });
  });

  it("handles concurrent creation without making a renamed duplicate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "token" }))
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ folder: {} }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await addAccountReportsFolders([{ id: 1, companyName: "Company", companyFolderId: "company" }]))
      .toEqual({ created: 0, existing: 1, skipped: 0, failed: [] });
  });

  it.each(["Contracts,UtilityBills", "Contracts,UtilityBills,Account Reports"])(
    "creates Account Reports once with configuration %s",
    async (subfolders) => {
      env.SHAREPOINT_COMPANY_SUBFOLDERS = subfolders;
      const created: Array<{ url: string; name: string }> = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
        if (url.includes("/oauth2/")) return Response.json({ access_token: "token" });
        const body = JSON.parse(String(options?.body));
        created.push({ url, name: body.name });
        return Response.json({ id: body.name, name: body.name });
      }));

      await createCompanySharePointFolders("Example Company");

      expect(created.filter((folder) => folder.name === "Account Reports")).toEqual([
        {
          url: "https://graph.microsoft.com/v1.0/sites/site/drives/drive/root:/Companies/Example%20Company:/children",
          name: "Account Reports"
        }
      ]);
      expect(created.map((folder) => folder.name)).toContain("Power");
    }
  );

  it.each([{ files: [] }, { files: [{ id: "report", name: "Summary.pdf", file: {} }] }])(
    "includes Account Reports and its contents when other folder IDs are already saved (%j)",
    async ({ files }) => {
      vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        if (url.includes("/oauth2/")) return Response.json({ access_token: "token" });
        if (url.endsWith("/items/company/children")) {
          return Response.json({ value: [{ id: "reports", name: "Account Reports", folder: {} }] });
        }
        return Response.json({ value: url.endsWith("/items/reports/children") ? files : [] });
      }));

      const result = await listCompanySharePointDocuments({
        companyFolderId: "company",
        contractFolderId: "contracts",
        utilityBillsFolderId: "bills"
      });

      expect(result.tree.map((node) => node.name)).toEqual(["Contracts", "UtilityBills", "Account Reports"]);
      expect(result.tree[2].children).toHaveLength(files.length);
    }
  );
});
