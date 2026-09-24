"use client";
import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BuildingCandidate } from "@/types/building";

type CvEvidenceMapProps = {
  building: BuildingCandidate;
};

export default function CvEvidenceMap({ building }: CvEvidenceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              ],
              tileSize: 256,
              attribution: "Esri World Imagery"
            }
          },
          layers: [
            {
              id: "satellite-layer",
              type: "raster",
              source: "satellite"
            }
          ]
        },
        center: [building.lng, building.lat],
        zoom: 17.5,
        interactive: false, // Disable pan/zoom/rotate for a fixed evidence frame
      });
    } else {
      // In a more complex app, we'd smoothly flyTo or update sources, 
      // but for this simple mount/unmount panel, we can rely on React lifecycle
      map.current.jumpTo({ center: [building.lng, building.lat], zoom: 17.5 });
    }

    const currentMap = map.current; // Store locally for cleanup

    const handleLoad = () => {
      if (!currentMap.getSource("roof")) {
        currentMap.addSource("roof", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: building.roof_geometry,
            properties: {}
          }
        });

        currentMap.addLayer({
          id: "roof-fill",
          type: "fill",
          source: "roof",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.3
          }
        });

        currentMap.addLayer({
          id: "roof-outline",
          type: "line",
          source: "roof",
          paint: {
            "line-color": "#3b82f6",
            "line-width": 2
          }
        });
      } else {
        // If the map was kept alive and the building changed, update data
        (currentMap.getSource("roof") as maplibregl.GeoJSONSource).setData({
          type: "Feature",
          geometry: building.roof_geometry,
          properties: {}
        });
      }

      // We remove old markers internally to keep it simple, 
      // but here we just re-mount the component whenever building changes normally.
      // Let's add the cooling tower markers. We'll use tiny hardcoded offsets since we don't have true sub-polygon geometry.
      if (building.cooling_tower_present && building.cooling_tower_count > 0) {
        // Pseudo-random offsets to place them around the centroid
        const offsets = [
          [0.00005, 0.00005], [-0.00008, 0.00002], [0.00002, -0.00006],
          [-0.00005, -0.00005], [0.0001, 0], [0, 0.0001]
        ];
        
        for (let i = 0; i < Math.min(building.cooling_tower_count, 6); i++) {
          const markerEl = document.createElement("div");
          markerEl.className = "w-2.5 h-2.5 bg-green-500 rounded-full border-[1.5px] border-green-900 shadow-sm opacity-90";
          markerEl.title = "Cooling tower detected";
          
          new maplibregl.Marker({ element: markerEl })
            .setLngLat([building.lng + (offsets[i]?.[0] || 0), building.lat + (offsets[i]?.[1] || 0)])
            .addTo(currentMap);
        }
      }
    };

    if (currentMap.loaded()) {
      handleLoad();
    } else {
      currentMap.once("load", handleLoad);
    }

    return () => {
      // Destructor
      if (currentMap) {
        currentMap.remove();
        map.current = null;
      }
    };
  }, [building]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
