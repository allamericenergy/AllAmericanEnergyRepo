import { useQueryClient, type Query, type QueryKey } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Data is being loaded for the first time, or reloaded after a change (a save
// invalidates its list). Timed background refreshes, such as the activity
// count every 30 seconds, are not shown.
export const isLoadingData = (query: Query) => query.state.status === "pending" || query.state.isInvalidated;

// Short loads finish before the indicator appears, so it does not flicker.
const SHOW_DELAY_MS = 200;

const listNames: Record<string, string> = {
  "tbl-companies": "Companies",
  organizations: "Companies",
  meters: "Meters",
  contracts: "Contracts",
  members: "Members",
  "team-members": "Team Members",
  "company-documents": "Documents",
  "master-account-numbers": "MasterAccount Numbers",
  "upload-columns": "Upload Columns",
  "create-uploads": "Account Numbers",
  "viewed-meter-contracts": "Related Contracts",
  "viewed-contract-meters": "Related Meters",
  "contract-meters": "Related Meters",
  "company-activities": "Activity",
  "my-company-activities": "Activity",
  "activity-unread-counts": "Activity",
  audit: "Audit Log",
  "login-history": "Login History",
  "admin-requests": "Admin Requests",
  "organization-notes": "Notes",
  "utility-meter-value-sizes": "Utilities",
  "meter-lookups": "Meter Options",
  "contract-lookups": "Contract Options",
  "company-status-lookups": "Company Statuses",
  "us-states": "States",
  "us-cities": "Cities",
  "meter-zip-details": "ZIP Details",
  "sharepoint-file-content": "File",
  "my-account": "Account"
};

const titleCase = (text: string) => text.replace(/[-_/]+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());

/** A readable name for the list a query loads, taken from its query key. */
export function listName(queryKey: QueryKey): string {
  const [name, detail] = queryKey;
  // Organization tables carry their table in the key ("brokers", "zip-codes").
  if ((name === "organization-table" || name === "organization-locations") && typeof detail === "string") return titleCase(detail);
  return listNames[String(name)] ?? titleCase(String(name ?? "Data"));
}

/** Large animated loading image in the middle of the page, naming each list that is loading. */
export function GlobalLoadingIndicator() {
  const cache = useQueryClient().getQueryCache();
  const subscribe = useCallback((notify: () => void) => cache.subscribe(notify), [cache]);
  // A joined string keeps the snapshot stable between unrelated cache updates.
  const loadingNames = useSyncExternalStore(subscribe, () => [...new Set(cache
    .findAll({ fetchStatus: "fetching", predicate: isLoadingData })
    .map((query) => listName(query.queryKey)))].sort().join("\n"));
  const loading = loadingNames !== "";
  const [visible, setVisible] = useState(false);

  // The delay restarts only when loading starts, not each time the names change.
  useEffect(() => {
    if (!loading) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const names = loadingNames ? loadingNames.split("\n") : [];
  return (
    <div className="global-loading" role="status" aria-live="polite">
      {visible && names.length ? (
        <>
          <div className="global-loading-bar" aria-hidden="true" />
          <div className="global-loading-card">
            <span className="global-loading-image" aria-hidden="true">
              <span className="global-loading-ring" />
              <Zap size={40} />
            </span>
            <strong>Loading {names.length === 1 ? names[0] : "lists"}…</strong>
            {names.length > 1 ? <ul>{names.map((name) => <li key={name}>{name}</li>)}</ul> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
