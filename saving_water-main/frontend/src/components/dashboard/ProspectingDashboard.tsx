"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import MainMap from "../map/MainMap";
import { BuildingCandidate } from "@/types/building";
import { StateScore } from "@/types/state";
import { RoiResult } from "@/types/roi";
import { BriefResult } from "@/types/brief";
import { loadBuildings, loadStateScores, loadStatesGeoJSON } from "@/lib/api";
import { FeatureCollection } from "geojson";

export type MapMode = "national" | "state" | "metro" | "building";

export type Filters = {
  roofAboveThreshold: boolean;
  coolingTowerOnly: boolean;
  highWaterCostOnly: boolean;
  esgPrioritizedOnly: boolean;
};

export type SelectionState = {
  selectedState: string | null;
  selectedMetro: string | null;
  selectedBuildingId: string | null;
  mapMode: MapMode;
  filters: Filters;
};

const initialSelectionState: SelectionState = {
  selectedState: null,
  selectedMetro: null,
  selectedBuildingId: null,
  mapMode: "national",
  filters: {
    roofAboveThreshold: false,
    coolingTowerOnly: false,
    highWaterCostOnly: false,
    esgPrioritizedOnly: false,
  },
};

export default function ProspectingDashboard() {
  const router = useRouter();
  const [selection, setSelection] = useState<SelectionState>(initialSelectionState);

  // Global Data State
  const [buildings, setBuildings] = useState<BuildingCandidate[]>([]);
  const [stateScores, setStateScores] = useState<StateScore[]>([]);
  const [statesGeo, setStatesGeo] = useState<FeatureCollection | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Async API State
  const [roiResult, setRoiResult] = useState<RoiResult | null>(null);
  const [isCalculatingRoi] = useState(false);
  const [roiError, setRoiError] = useState<string | null>(null);

  const [briefResult, setBriefResult] = useState<BriefResult | null>(null);
  const [isGeneratingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Initial Data Load
  useEffect(() => {
    async function loadAllData() {
      setIsLoadingData(true);
      setDataError(null);
      try {
        const [bData, sScores, sGeo] = await Promise.all([
          loadBuildings(),
          loadStateScores(),
          loadStatesGeoJSON(),
        ]);
        setBuildings(bData);
        setStateScores(sScores);
        setStatesGeo(sGeo);
      } catch (err: any) {
        console.error("Failed to load global application data:", err);
        setDataError(err.message || "Failed to load global data");
      } finally {
        setIsLoadingData(false);
      }
    }
    loadAllData();
  }, []);

  // Filter computation
  const filteredBuildings = useMemo(() => {
    let result = buildings;

    // Filter by selection
    if (selection.selectedMetro) {
      result = result.filter(b => b.metro === selection.selectedMetro);
    } else if (selection.selectedState) {
      result = result.filter(b => b.state === selection.selectedState || (b as any).country_code === selection.selectedState || (b as any).country === selection.selectedState);
    }

    // Filter by toggle states
    const f = selection.filters;
    if (f.roofAboveThreshold) {
      result = result.filter(b => b.roof_area_sqft > 50000);
    }
    if (f.coolingTowerOnly) {
      result = result.filter(b => b.cooling_tower_present);
    }
    if (f.highWaterCostOnly) {
      result = result.filter(b => b.water_rate_per_kgal >= 10.0);
    }
    if (f.esgPrioritizedOnly) {
      result = result.filter(b => b.sbti_committed || b.leed_certified || (b.esg_score_proxy && b.esg_score_proxy > 80));
    }

    return result;
  }, [buildings, selection]);


  // Action handlers — navigate to dedicated analysis pages
  const handleCalculateRoi = (building: BuildingCandidate) => {
    router.push(`/roi/${building.building_id}`);
  };

  const handleGenerateBrief = (building: BuildingCandidate) => {
    router.push(`/brief/${building.building_id}`);
  };

  // Reset API states when building selection changes
  useEffect(() => {
    setRoiResult(null);
    setRoiError(null);
    setBriefResult(null);
    setBriefError(null);
  }, [selection.selectedBuildingId]);

  if (isLoadingData) {
    return (
      <div className="flex h-screen w-full items-center justify-center dashboard-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 animate-spin" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <path d="M24 4 a20 20 0 0 1 20 20" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="text-slate-300 text-sm font-medium tracking-wide">Loading Foundation Data...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex h-screen w-full items-center justify-center dashboard-bg">
        <div className="glass-card-dark p-6 max-w-sm text-center">
          <p className="text-red-400 font-medium">Error: {dataError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full dashboard-bg text-slate-100 overflow-hidden">
      {/* Left Panel */}
      <div className="w-56 h-full flex flex-col shrink-0 z-10 hidden md:flex border-r border-white/[0.08]">
        <LeftPanel selection={selection} setSelection={setSelection} />
      </div>

      {/* Center — Main Map */}
      <div className="flex-1 h-full relative">
        <MainMap
          selection={selection}
          setSelection={setSelection}
          filteredBuildings={filteredBuildings}
          stateScores={stateScores}
          statesGeo={statesGeo}
        />
      </div>

      {/* Right Panel */}
      <div className="w-[340px] h-full flex flex-col shrink-0 z-10 overflow-y-auto hidden lg:flex border-l border-white/[0.08]">
        <RightPanel
          selection={selection}
          setSelection={setSelection}
          buildings={buildings}
          filteredBuildings={filteredBuildings}
          stateScores={stateScores}
          roiResult={roiResult}
          isCalculatingRoi={isCalculatingRoi}
          roiError={roiError}
          onCalculateRoi={handleCalculateRoi}
          briefResult={briefResult}
          isGeneratingBrief={isGeneratingBrief}
          briefError={briefError}
          onGenerateBrief={handleGenerateBrief}
        />
      </div>
    </div>
  );
}
