import { useState } from 'react';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { AQI_COLORS, aqiColor, type AqiCategory, type NeighborhoodForecast } from '@airsense/shared';

interface Props {
  forecasts: NeighborhoodForecast[];
  dayIndex: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type TileStyle = 'dark' | 'street' | 'satellite';

/** 100% free tile servers that require NO API key and never show a watermark. */
const TILE_URLS: Record<TileStyle, { label: string; url: string }> = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
  street: {
    label: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
};

const LEGEND_ITEMS: Array<{ cat: AqiCategory; range: string }> = [
  { cat: 'Good', range: '0–50' },
  { cat: 'Satisfactory', range: '51–100' },
  { cat: 'Moderate', range: '101–200' },
  { cat: 'Poor', range: '201–300' },
  { cat: 'Very Poor', range: '301–400' },
  { cat: 'Severe', range: '401–500' },
];

export function AqiMap({ forecasts, dayIndex, selectedId, onSelect }: Props) {
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark');
  const [showPlumes, setShowPlumes] = useState(true);

  return (
    <div className="map-wrapper">
      <div className="map-controls-overlay">
        <div className="map-style-switcher">
          {(Object.keys(TILE_URLS) as TileStyle[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`map-chip ${tileStyle === k ? 'active' : ''}`}
              onClick={() => setTileStyle(k)}
            >
              {TILE_URLS[k].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`map-chip ${showPlumes ? 'active' : ''}`}
          onClick={() => setShowPlumes((v) => !v)}
        >
          {showPlumes ? '🔥 Plume Halo: ON' : 'Plume Halo: OFF'}
        </button>
      </div>

      <MapContainer
        center={[30.34, 76.398]}
        zoom={13}
        className="map"
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer key={tileStyle} url={TILE_URLS[tileStyle].url} />

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
                  radius={450 + p.aqi * 1.4}
                  pathOptions={{
                    color,
                    weight: 0,
                    fillColor: color,
                    fillOpacity: 0.18,
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
