export const requiredCloudflareHeaders = ["cf-ray", "cf-connecting-ip", "cf-ipcountry"] as const;

export interface EdgeRequestSnapshot {
  rayId: string | null;
  ip: string | null;
  country: string | null;
}

export function readCloudflareHeaders(headers: Headers): EdgeRequestSnapshot {
  return {
    rayId: headers.get("cf-ray"),
    ip: headers.get("cf-connecting-ip"),
    country: headers.get("cf-ipcountry")
  };
}

export function hasRequiredEdgeHeaders(snapshot: EdgeRequestSnapshot) {
  return Boolean(snapshot.rayId && snapshot.ip);
}