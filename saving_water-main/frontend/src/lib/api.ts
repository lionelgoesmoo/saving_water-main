import type { ROIResponse, BuildingInfo, BriefAPIResponse } from "@/types/roi";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchBuilding(buildingId: string): Promise<BuildingInfo> {
  const res = await fetch(`${API_BASE}/buildings/${buildingId}`);
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? `Building "${buildingId}" not found`
        : `Failed to load building (${res.status})`
    );
  }
  return res.json();
}

export async function fetchROI(
  buildingId: string,
  scenario: "conservative" | "base" | "upside"
): Promise<ROIResponse> {
  const res = await fetch(`${API_BASE}/roi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ building_id: buildingId, scenario }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ?? `ROI request failed (${res.status})`
    );
  }
  return res.json();
}

export async function fetchBrief(buildingId: string): Promise<BriefAPIResponse> {
  const res = await fetch(`${API_BASE}/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ building_id: buildingId }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ?? `Brief request failed (${res.status})`
    );
  }
  return res.json();
}

export async function loadBuildings() {
  const res = await fetch("/data/buildings.json");
  if (!res.ok) throw new Error("Failed to load buildings");
  return res.json();
}

export async function loadStateScores() {
  const res = await fetch("/data/state_scores.json");
  if (!res.ok) throw new Error("Failed to load state scores");
  return res.json();
}

export async function sendBriefByEmail(
  buildingId: string,
  email: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/email-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ building_id: buildingId, email }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ?? `Email failed (${res.status})`
    );
  }
}

export async function loadStatesGeoJSON() {
  // The choropleth uses 'feature.properties.postal' mapping to 'state_code' in state_scores.json
  const res = await fetch("/data/africa.optimized.geojson");
  if (!res.ok) throw new Error("Failed to load Africa GeoJSON");
  return res.json();
}
