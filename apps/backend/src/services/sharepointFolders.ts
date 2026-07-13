import { env } from "../config/env.js";

interface GraphTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface SharePointFolderResult {
  skipped: boolean;
  folderName?: string;
  companyFolderId?: string;
  contractFolderId?: string;
  utilityBillsFolderId?: string;
  webUrl?: string;
}

export interface SharePointDocumentNode {
  id: string;
  name: string;
  type: "folder" | "file";
  webUrl?: string;
  downloadUrl?: string;
  children?: SharePointDocumentNode[];
}

interface DriveItemResponse {
  id?: string;
  name?: string;
  webUrl?: string;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
  "@microsoft.graph.downloadUrl"?: string;
}

interface DriveChildrenResponse {
  value?: DriveItemResponse[];
  error?: { message?: string };
}

const invalidSharePointNameChars = /["*:<>?/\\|#%{}~&]/g;

function isSharePointConfigured() {
  return Boolean(
    env.SHAREPOINT_TENANT_ID &&
      env.SHAREPOINT_CLIENT_ID &&
      env.SHAREPOINT_CLIENT_SECRET &&
      env.SHAREPOINT_SITE_ID &&
      env.SHAREPOINT_DRIVE_ID
  );
}

function sanitizeFolderName(value: string) {
  return value
    .replace(invalidSharePointNameChars, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function graphPath(pathValue: string) {
  return pathValue
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function getGraphAccessToken() {
  const body = new URLSearchParams({
    client_id: env.SHAREPOINT_CLIENT_ID ?? "",
    client_secret: env.SHAREPOINT_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default"
  });

  const response = await fetch(`https://login.microsoftonline.com/${env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = (await response.json()) as GraphTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Unable to authenticate with Microsoft Graph.");
  }

  return data.access_token;
}

async function createFolder(accessToken: string, parentPath: string, folderName: string) {
  const rootPath = parentPath.trim().replace(/^\/+|\/+$/g, "");
  const parentUrl = rootPath
    ? `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/root:/${graphPath(rootPath)}:/children`
    : `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/root/children`;

  const response = await fetch(parentUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename"
    })
  });
  const data = (await response.json()) as { id?: string; name?: string; webUrl?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Unable to create SharePoint folder "${folderName}".`);
  }

  return data;
}

async function listFolderChildren(accessToken: string, folderId: string, depth = 0): Promise<SharePointDocumentNode[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/items/${encodeURIComponent(folderId)}/children`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  const data = (await response.json()) as DriveChildrenResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to list SharePoint folder contents.");
  }

  const nodes: SharePointDocumentNode[] = [];

  for (const item of data.value ?? []) {
    if (!item.id || !item.name) continue;

    const isFolder = Boolean(item.folder);
    const node: SharePointDocumentNode = {
      id: item.id,
      name: item.name,
      type: isFolder ? "folder" : "file",
      webUrl: item.webUrl,
      downloadUrl: item["@microsoft.graph.downloadUrl"]
    };

    if (isFolder && depth < 4) {
      node.children = await listFolderChildren(accessToken, item.id, depth + 1);
    }

    nodes.push(node);
  }

  return nodes.sort((first, second) => {
    if (first.type !== second.type) return first.type === "folder" ? -1 : 1;
    return first.name.localeCompare(second.name);
  });
}

export async function listCompanySharePointDocuments(folderIds: {
  companyFolderId?: string | null;
  contractFolderId?: string | null;
  utilityBillsFolderId?: string | null;
}) {
  if (!isSharePointConfigured()) return { skipped: true, tree: [] as SharePointDocumentNode[] };

  const accessToken = await getGraphAccessToken();
  const tree: SharePointDocumentNode[] = [];
  let contractFolderId = folderIds.contractFolderId;
  let utilityBillsFolderId = folderIds.utilityBillsFolderId;

  if (folderIds.companyFolderId && (!contractFolderId || !utilityBillsFolderId)) {
    const companyChildren = await listFolderChildren(accessToken, folderIds.companyFolderId);
    contractFolderId =
      contractFolderId ?? companyChildren.find((node) => node.type === "folder" && node.name.toLowerCase() === "contracts")?.id;
    utilityBillsFolderId =
      utilityBillsFolderId ?? companyChildren.find((node) => node.type === "folder" && node.name.toLowerCase().replace(/\s+/g, "") === "utilitybills")?.id;
  }

  if (contractFolderId) {
    tree.push({
      id: contractFolderId,
      name: "Contracts",
      type: "folder",
      children: await listFolderChildren(accessToken, contractFolderId)
    });
  }

  if (utilityBillsFolderId) {
    tree.push({
      id: utilityBillsFolderId,
      name: "UtilityBills",
      type: "folder",
      children: await listFolderChildren(accessToken, utilityBillsFolderId)
    });
  }

  return { skipped: false, tree };
}

export async function getSharePointFileContent(itemId: string) {
  if (!isSharePointConfigured()) throw new Error("SharePoint is not configured.");

  const accessToken = await getGraphAccessToken();
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/items/${encodeURIComponent(itemId)}/content`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      redirect: "follow"
    }
  );

  if (!response.ok) {
    throw new Error(`Unable to load SharePoint file content (${response.status}).`);
  }

  return {
    contentType: response.headers.get("content-type") ?? "application/pdf",
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

export async function uploadSharePointFile(folderId: string, file: { name: string; contentBase64: string; contentType?: string }) {
  if (!isSharePointConfigured()) throw new Error("SharePoint is not configured.");

  const accessToken = await getGraphAccessToken();
  const fileName = sanitizeFolderName(file.name);
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.contentType ?? "application/octet-stream"
      },
      body: Buffer.from(file.contentBase64, "base64")
    }
  );
  const data = (await response.json()) as { id?: string; name?: string; webUrl?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Unable to upload SharePoint file "${fileName}".`);
  }

  return data;
}

export async function ensureContractsFolder(companyFolderId: string) {
  if (!isSharePointConfigured()) throw new Error("SharePoint is not configured.");

  const accessToken = await getGraphAccessToken();
  const companyChildren = await listFolderChildren(accessToken, companyFolderId);
  const existingFolder = companyChildren.find((node) => node.type === "folder" && node.name.toLowerCase() === "contracts");
  if (existingFolder) return existingFolder.id;

  const createdFolder = await createFolderByParentId(accessToken, companyFolderId, "Contracts");
  if (!createdFolder.id) throw new Error("Unable to create Contracts folder.");

  return createdFolder.id;
}

async function createFolderByParentId(accessToken: string, parentFolderId: string, folderName: string) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${env.SHAREPOINT_SITE_ID}/drives/${env.SHAREPOINT_DRIVE_ID}/items/${encodeURIComponent(parentFolderId)}/children`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename"
      })
    }
  );
  const data = (await response.json()) as { id?: string; name?: string; webUrl?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Unable to create SharePoint folder "${folderName}".`);
  }

  return data;
}

function configuredFolderNames(value: string) {
  return value
    .split(",")
    .map((name) => sanitizeFolderName(name))
    .filter(Boolean);
}

export async function createCompanySharePointFolders(companyName: string): Promise<SharePointFolderResult> {
  if (!isSharePointConfigured()) return { skipped: true };

  const folderName = sanitizeFolderName(companyName);
  if (!folderName) throw new Error("Company name cannot be used as a SharePoint folder name.");

  const accessToken = await getGraphAccessToken();
  const companyFolder = await createFolder(accessToken, env.SHAREPOINT_COMPANY_ROOT_PATH, folderName);
  const subfolders = configuredFolderNames(env.SHAREPOINT_COMPANY_SUBFOLDERS);
  const utilityBillSubfolders = configuredFolderNames(env.SHAREPOINT_COMPANY_SUBFOLDERS_UTILITYBILLS);
  const companyPath = [env.SHAREPOINT_COMPANY_ROOT_PATH, companyFolder.name ?? folderName].filter(Boolean).join("/");
  let contractFolderId: string | undefined;
  let utilityBillsFolderId: string | undefined;

  for (const subfolder of subfolders) {
    const createdSubfolder = await createFolder(accessToken, companyPath, subfolder);
    const normalizedSubfolder = subfolder.toLowerCase().replace(/\s+/g, "");

    if (normalizedSubfolder === "contracts") {
      contractFolderId = createdSubfolder.id;
    }

    if (normalizedSubfolder === "utilitybills") {
      utilityBillsFolderId = createdSubfolder.id;
      const utilityBillsPath = [companyPath, createdSubfolder.name ?? subfolder].filter(Boolean).join("/");

      for (const utilityBillSubfolder of utilityBillSubfolders) {
        await createFolder(accessToken, utilityBillsPath, utilityBillSubfolder);
      }
    }
  }

  return {
    skipped: false,
    folderName: companyFolder.name ?? folderName,
    companyFolderId: companyFolder.id,
    contractFolderId,
    utilityBillsFolderId,
    webUrl: companyFolder.webUrl
  };
}
