import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { AQI_COLORS, aqiColor, type AqiCategory, type NeighborhoodForecast } from '@vaayuvision/shared';

interface Props {
  forecasts: NeighborhoodForecast[];
  dayIndex: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const PATIALA_CENTER: [number, number] = [30.342, 76.402];
const PATIALA_ZOOM = 13;

const LEGEND_ITEMS: Array<{ cat: AqiCategory; range: string }> = [
  { cat: 'Good', range: '0–50' },
  { cat: 'Satisfactory', range: '51–100' },
  { cat: 'Moderate', range: '101–200' },
  { cat: 'Poor', range: '201–300' },
  { cat: 'Very Poor', range: '301–400' },
  { cat: 'Severe', range: '401–500' },
];

function MapAutoBounds({ forecasts, resetTrigger }: { forecasts: NeighborhoodForecast[]; resetTrigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!forecasts.length) return;
    const bounds = L.latLngBounds(forecasts.map((f) => [f.neighborhood.lat, f.neighborhood.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: true });
  }, [map, forecasts.length, resetTrigger]);
  return null;
}

export function AqiMap({ forecasts, dayIndex, selectedId, onSelect }: Props) {
  const [showPlumes, setShowPlumes] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);

  return (
    <div className="map-wrapper">
      <div className="map-controls-overlay">
        <button
          type="button"
          className="map-chip"
          onClick={() => setResetTrigger((n) => n + 1)}
        >
          Center Patiala
        </button>
        <button
          type="button"
          className={`map-chip ${showPlumes ? 'active' : ''}`}
          onClick={() => setShowPlumes((v) => !v)}
        >
          {showPlumes ? 'Plume Halo: ON' : 'Plume Halo: OFF'}
        </button>
      </div>

      <MapContainer
        center={PATIALA_CENTER}
        zoom={PATIALA_ZOOM}
        className="map"
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer url={SATELLITE_URL} />
        <TileLayer url={LABELS_URL} />
        <MapAutoBounds forecasts={forecasts} resetTrigger={resetTrigger} />

        {forecasts.map(({ neighborhood: n, points }) => {
          const p = points[dayIndex];
          if (!p) return null;
          const selected = n.id === selectedId;
          const color = aqiColor(p.aqi);

          const labelIcon = L.divIcon({
            className: 'aqi-pin-wrapper',
            html: `<div class="aqi-pin ${selected ? 'selected' : ''}" style="background:${color};box-shadow:0 0 ${selected ? 18 : 10}px ${color};">
              <span>${p.aqi}</span>
            </div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          });

          return (
            <div key={`${n.id}-${dayIndex}`}>
              {showPlumes && (
                <Circle
                  center={[n.lat, n.lng]}
                  radius={380 + p.aqi * 1.1}
                  pathOptions={{
                    color,
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.22,
                  }}
                  eventHandlers={{ click: () => onSelect(n.id) }}
                />
              )}
              <CircleMarker
                center={[n.lat, n.lng]}
                radius={selected ? 22 : 16}
                pathOptions={{
                  color: selected ? '#ffffff' : color,
                  weight: selected ? 2.5 : 1,
                  fillColor: color,
                  fillOpacity: 0.35,
                }}
                eventHandlers={{ click: () => onSelect(n.id) }}
              />
              <Marker
                position={[n.lat, n.lng]}
                icon={labelIcon}
                eventHandlers={{ click: () => onSelect(n.id) }}
              >
                <Tooltip direction="top" offset={[0, -18]} permanent={selected}>
                  <strong>{n.name}</strong> · AQI {p.aqi} ({p.category}) · PM2.5 {p.pm25} µg/m³
                </Tooltip>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      <div className="map-legend">
        {LEGEND_ITEMS.map(({ cat, range }) => (
          <div key={cat} className="legend-item">
            <span className="legend-swatch" style={{ background: AQI_COLORS[cat] }} />
            <span>
              <strong>{cat}</strong> <span className="muted">({range})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
