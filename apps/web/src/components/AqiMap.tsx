import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import { aqiColor, type NeighborhoodForecast } from '@airsense/shared';

interface Props {
  forecasts: NeighborhoodForecast[];
  dayIndex: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AqiMap({ forecasts, dayIndex, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={[28.64, 77.15]} zoom={11} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {forecasts.map(({ neighborhood: n, points }) => {
        const p = points[dayIndex];
        if (!p) return null;
        const selected = n.id === selectedId;
        return (
          <CircleMarker
            key={`${n.id}-${dayIndex}`}
            center={[n.lat, n.lng]}
            radius={10 + Math.min(p.aqi, 500) / 25}
            pathOptions={{
              color: selected ? '#ffffff' : aqiColor(p.aqi),
              weight: selected ? 3 : 1,
              fillColor: aqiColor(p.aqi),
              fillOpacity: 0.75,
            }}
            eventHandlers={{ click: () => onSelect(n.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent={selected}>
              <strong>{n.name}</strong> · AQI {p.aqi} ({p.category})
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
