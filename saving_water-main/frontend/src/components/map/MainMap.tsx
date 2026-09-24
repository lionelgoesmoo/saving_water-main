"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SelectionState } from "../dashboard/ProspectingDashboard";
import { BuildingCandidate } from "@/types/building";
import { StateScore } from "@/types/state";
import { FeatureCollection } from "geojson";
import {
  getOpportunityColor,
  getOpportunityTier,
  scoreStateOpportunity,
  LEGEND_ITEMS,
} from "@/lib/stateOpportunity";
import { formatRainfall } from "@/lib/unitConversion";

type MainMapProps = {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  filteredBuildings: BuildingCandidate[];
  stateScores: StateScore[];
  statesGeo: FeatureCollection | null;
};

type TooltipState = {
  x: number;
  y: number;
  stateName: string;
  score: number | null;
  tier: string;
  candidateCount: number;
  avgSavings: number | null;
  avgRainfall: number | null;
  topDrivers: string[];
};

// Pseudo-random offsets to spread cooling tower markers around building centroid
const COOLING_TOWER_OFFSETS = [
  [0.00005, 0.00005],
  [-0.00008, 0.00002],
  [0.00002, -0.00006],
  [-0.00005, -0.00005],
  [0.0001, 0],
  [0, 0.0001],
];

function getBuildingsBounds(buildings: BuildingCandidate[]): L.LatLngBoundsExpression | null {
  if (buildings.length === 0) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const b of buildings) {
    if (b.lng < minLng) minLng = b.lng;
    if (b.lng > maxLng) maxLng = b.lng;
    if (b.lat < minLat) minLat = b.lat;
    if (b.lat > maxLat) maxLat = b.lat;
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export default function MainMap({
  selection,
  setSelection,
  filteredBuildings,
  stateScores,
  statesGeo,
}: MainMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Leaflet Layer References
  const choroplethLayer = useRef<L.GeoJSON | null>(null);
  const buildingsLayer = useRef<L.LayerGroup | null>(null);
  const roofLayer = useRef<L.GeoJSON | null>(null);
  const coolingTowersLayer = useRef<L.LayerGroup | null>(null);

  // Keep latest refs for event handlers
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const stateScoresRef = useRef(stateScores);
  stateScoresRef.current = stateScores;

  // ── Initialize Leaflet map once ──────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const mapInstance = L.map(mapContainer.current, {
      center: [-1.286389, 36.817223],
      zoom: 12,
      minZoom: 2.5,
      maxZoom: 19,
      zoomControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(mapInstance);

    // 1. Satellite Base Layer (Esri World Imagery)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      }
    ).addTo(mapInstance);

    // 2. Reference Labels Overlay (Boundaries & Places)
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 19,
        opacity: 0.65,
      }
    ).addTo(mapInstance);

    // Layer groups for dynamic data
    buildingsLayer.current = L.layerGroup().addTo(mapInstance);
    coolingTowersLayer.current = L.layerGroup().addTo(mapInstance);

    map.current = mapInstance;
    setIsMapLoaded(true);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  // ── Update African Choropleth Layer ──────────────────────────────────────
  useEffect(() => {
    if (!isMapLoaded || !map.current || !statesGeo) return;

    if (choroplethLayer.current) {
      map.current.removeLayer(choroplethLayer.current);
      choroplethLayer.current = null;
    }

    const showChoropleth = selection.mapMode === "national";

    const layer = L.geoJSON(statesGeo, {
      style: (feature) => {
        const stateCode = feature?.properties?.postal || feature?.properties?.country_code || feature?.properties?.name;
        const s = stateScores.find(
          (x) => x.state_code === stateCode || x.state === stateCode
        );
        const score = s ? scoreStateOpportunity(s) : null;
        const isSelected = selection.selectedState === stateCode || selection.selectedState === s?.state;

        return {
          fillColor: getOpportunityColor(score),
          weight: isSelected ? 2.5 : 0.8,
          opacity: 1,
          color: isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.4)",
          fillOpacity: showChoropleth ? (isSelected ? 0.85 : 0.65) : 0,
        };
      },
      onEachFeature: (feature, l) => {
        const stateCode = feature.properties?.postal || feature.properties?.country_code || feature.properties?.name;
        const s = stateScores.find(
          (x) => x.state_code === stateCode || x.state === stateCode
        );
        const score = s ? scoreStateOpportunity(s) : null;
        const tier = getOpportunityTier(score);

        l.on("mouseover", (e: L.LeafletMouseEvent) => {
          if (selectionRef.current.mapMode !== "national") return;

          const target = e.target as L.Path;
          target.setStyle({
            fillOpacity: 0.88,
            weight: 2,
            color: "#ffffff",
          });

          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            target.bringToFront();
          }

          const containerPoint = map.current?.latLngToContainerPoint(e.latlng);
          if (containerPoint) {
            setTooltip({
              x: containerPoint.x,
              y: containerPoint.y,
              stateName: s?.state || feature.properties?.name || stateCode,
              score,
              tier: tier.label,
              candidateCount: s?.candidate_count ?? 0,
              avgSavings: s?.avg_annual_savings_usd ?? null,
              avgRainfall: s?.avg_annual_rainfall_in ?? null,
              topDrivers: s?.top_drivers ?? [],
            });
          }
        });

        l.on("mousemove", (e: L.LeafletMouseEvent) => {
          if (selectionRef.current.mapMode !== "national") return;
          const containerPoint = map.current?.latLngToContainerPoint(e.latlng);
          if (containerPoint) {
            setTooltip((prev) => (prev ? { ...prev, x: containerPoint.x, y: containerPoint.y } : null));
          }
        });

        l.on("mouseout", (e: L.LeafletMouseEvent) => {
          if (selectionRef.current.mapMode !== "national") return;
          const target = e.target as L.Path;
          const isSelected = selectionRef.current.selectedState === stateCode || selectionRef.current.selectedState === s?.state;
          target.setStyle({
            fillOpacity: 0.65,
            weight: isSelected ? 2.5 : 0.8,
            color: isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.4)",
          });
          setTooltip(null);
        });

        l.on("click", () => {
          setSelection((prev) => ({
            ...prev,
            selectedState: stateCode,
            mapMode: "state",
            selectedMetro: null,
            selectedBuildingId: null,
          }));
          setTooltip(null);
        });
      },
    });

    if (showChoropleth) {
      layer.addTo(map.current);
    }
    choroplethLayer.current = layer;
  }, [isMapLoaded, statesGeo, stateScores, selection.selectedState, selection.mapMode, setSelection]);

  // ── Update Building Markers ──────────────────────────────────────────────
  useEffect(() => {
    if (!isMapLoaded || !buildingsLayer.current) return;

    buildingsLayer.current.clearLayers();

    // In national view, don't overwhelm with individual dots unless desired;
    // but at state, metro, building level, show candidates.
    const showBuildings = selection.mapMode !== "national";
    if (!showBuildings) return;

    filteredBuildings.forEach((b) => {
      const isSelected = b.building_id === selection.selectedBuildingId;
      const marker = L.circleMarker([b.lat, b.lng], {
        radius: isSelected ? 8 : (selection.mapMode === "building" ? 7 : 5.5),
        fillColor: isSelected ? "#f59e0b" : "#2563eb",
        color: "#ffffff",
        weight: isSelected ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      });

      marker.bindTooltip(
        `<div class="font-sans text-xs">
          <div class="font-bold text-slate-900">${b.building_type}</div>
          <div class="text-slate-600">${b.address}</div>
          <div class="text-blue-600 font-semibold mt-0.5">Score: ${Math.round(b.viability_score)}</div>
        </div>`,
        { direction: "top", offset: [0, -6] }
      );

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSelection((prev) => ({
          ...prev,
          selectedBuildingId: b.building_id,
          mapMode: "building",
        }));
      });

      buildingsLayer.current?.addLayer(marker);
    });
  }, [isMapLoaded, filteredBuildings, selection.selectedBuildingId, selection.mapMode, setSelection]);

  // ── Update Selected Building Roof Polygon & Cooling Towers ───────────────
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;

    if (roofLayer.current) {
      map.current.removeLayer(roofLayer.current);
      roofLayer.current = null;
    }

    if (coolingTowersLayer.current) {
      coolingTowersLayer.current.clearLayers();
    }

    if (selection.mapMode !== "building" || !selection.selectedBuildingId) return;

    const building = filteredBuildings.find((b) => b.building_id === selection.selectedBuildingId);
    if (!building) return;

    // Roof Polygon
    if (building.roof_geometry) {
      const featureData: GeoJSON.Feature = {
        type: "Feature",
        geometry: building.roof_geometry,
        properties: {},
      };
      const rLayer = L.geoJSON(featureData, {
        style: {
          color: "#38bdf8",
          weight: 2.5,
          fillColor: "#38bdf8",
          fillOpacity: 0.35,
        },
      }).addTo(map.current);
      roofLayer.current = rLayer;
    }

    // Cooling Tower Circles
    if (building.cooling_tower_present && coolingTowersLayer.current) {
      const count = Math.min(building.cooling_tower_count || 1, 6);
      for (let i = 0; i < count; i++) {
        const offset = COOLING_TOWER_OFFSETS[i] || [0, 0];
        const ctMarker = L.circleMarker([building.lat + offset[0], building.lng + offset[1]], {
          radius: 7,
          fillColor: "#22c55e",
          color: "#166534",
          weight: 1.5,
          fillOpacity: 0.95,
        }).bindTooltip(`<div class="text-xs font-semibold text-emerald-800">Cooling Tower #${i + 1}</div>`);
        coolingTowersLayer.current.addLayer(ctMarker);
      }
    }
  }, [isMapLoaded, selection.mapMode, selection.selectedBuildingId, filteredBuildings]);

  // ── Camera Navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMapLoaded || !map.current) return;

    if (selection.mapMode === "national") {
      map.current.flyTo([-1.286389, 36.817223], 12, { duration: 1.2 });
    } else if (selection.mapMode === "building" && selection.selectedBuildingId) {
      const b = filteredBuildings.find((x) => x.building_id === selection.selectedBuildingId);
      if (b) {
        map.current.flyTo([b.lat, b.lng], 17.5, { duration: 1.2 });
      }
    } else if (selection.mapMode === "metro" && selection.selectedMetro) {
      const mBuildings = filteredBuildings.filter((b) => b.metro === selection.selectedMetro);
      const bounds = getBuildingsBounds(mBuildings);
      if (bounds) {
        map.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
      }
    } else if (selection.mapMode === "state" && selection.selectedState) {
      const sBuildings = filteredBuildings.filter((b) => b.state === selection.selectedState || b.country_code === selection.selectedState);
      const bounds = getBuildingsBounds(sBuildings);
      if (bounds) {
        map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      } else {
        // Fallback to finding country bounds from geojson layer
        if (choroplethLayer.current) {
          choroplethLayer.current.eachLayer((l: any) => {
            const code = l.feature?.properties?.postal || l.feature?.properties?.name;
            if (code === selection.selectedState && l.getBounds) {
              map.current?.fitBounds(l.getBounds(), { padding: [50, 50] });
            }
          });
        }
      }
    }
  }, [isMapLoaded, selection.mapMode, selection.selectedMetro, selection.selectedState, selection.selectedBuildingId, filteredBuildings]);

  // ── Tooltip Style ────────────────────────────────────────────────────────
  const containerRef = mapContainer;
  const tooltipStyle: React.CSSProperties = tooltip
    ? (() => {
        const containerWidth = containerRef.current?.offsetWidth ?? 800;
        const flipX = tooltip.x > containerWidth * 0.6;
        return {
          position: "absolute",
          left: flipX ? undefined : tooltip.x + 14,
          right: flipX ? containerWidth - tooltip.x + 14 : undefined,
          top: Math.max(8, tooltip.y - 90),
          zIndex: 1000,
          pointerEvents: "none",
        };
      })()
    : {};

  return (
    <div className="w-full h-full relative bg-slate-900">
      <div ref={mapContainer} style={{ position: "absolute", inset: 0, zIndex: 1 }} />

      {/* View mode badge */}
      <div className="absolute top-3 left-3 bg-gray-900/85 backdrop-blur-sm border border-gray-700/60 px-3 py-1.5 rounded-md shadow text-xs font-semibold text-gray-300 pointer-events-none z-10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span className="capitalize text-white">
          {selection.mapMode === "national"
            ? "Continental Africa View"
            : selection.mapMode === "state"
            ? "Country View"
            : selection.mapMode === "metro"
            ? "Metro View"
            : "Building View"}
        </span>
      </div>

      {/* Choropleth legend — continental view only */}
      {selection.mapMode === "national" && (
        <div className="absolute bottom-8 left-3 z-10 pointer-events-none bg-gray-900/88 backdrop-blur-sm border border-gray-700/60 rounded-xl px-3 py-2.5 shadow-lg">
          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
            Market Opportunity
          </p>
          <div className="space-y-1.5">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-gray-300 leading-none">
                  {item.label}
                  <span className="text-gray-500 ml-1">{item.range}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div style={tooltipStyle}>
          <div className="bg-gray-900/96 backdrop-blur-sm border border-gray-700/70 rounded-xl shadow-2xl px-3.5 py-3 text-white min-w-[200px] max-w-[240px]">
            {/* Country name + score */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-bold text-white leading-tight">{tooltip.stateName}</span>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xl font-bold leading-none text-white">
                  {tooltip.score != null ? Math.round(tooltip.score) : "—"}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${
                    getOpportunityTier(tooltip.score).textClass
                  }`}
                >
                  {tooltip.tier}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-2" />

            {/* Supporting metrics */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Prospect Buildings</span>
                <span className="text-gray-100 font-medium tabular-nums">
                  {tooltip.candidateCount.toLocaleString()}
                </span>
              </div>
              {tooltip.avgSavings != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Annual Savings</span>
                  <span className="text-gray-100 font-medium tabular-nums">
                    ${Math.round(tooltip.avgSavings).toLocaleString()}
                  </span>
                </div>
              )}
              {tooltip.avgRainfall != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Rainfall</span>
                  <span className="text-gray-100 font-medium tabular-nums">
                    {formatRainfall(tooltip.avgRainfall)}
                  </span>
                </div>
              )}
            </div>

            {/* Top drivers */}
            {tooltip.topDrivers.length > 0 && (
              <div className="mt-2.5">
                <div className="flex flex-wrap gap-1">
                  {tooltip.topDrivers.slice(0, 2).map((d, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/40 leading-snug"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* No-data fallback */}
            {tooltip.score == null && (
              <p className="text-[10px] text-gray-500 mt-1.5">Data unavailable for this country.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
