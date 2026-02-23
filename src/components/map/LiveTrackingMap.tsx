import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import type { LiveTrackingData, CustomerVisit } from '../../services/api';
import 'leaflet/dist/leaflet.css';
import './MapStyles.css';

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface LiveTrackingMapProps {
  salesmen: LiveTrackingData[];
  selectedSalesmanId?: string | null;
  onSelectSalesman?: (id: string) => void;
  customerLocations?: Array<{ id: string; customerId: string; latitude: number; longitude: number; customer?: { name: string } }>;
  routePoints?: LocationPoint[];
  visits?: CustomerVisit[];
  height?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function createSalesmanIcon(name: string, isOnline: boolean, isSelected: boolean): L.DivIcon {
  const classes = `salesman-marker ${isOnline ? 'online' : 'offline'} ${isSelected ? 'selected' : ''}`;
  return L.divIcon({
    className: '',
    html: `<div class="${classes}">${getInitials(name)}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createCustomerIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="customer-marker">C</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createVisitIcon(index: number, outcome?: string): L.DivIcon {
  const colors: Record<string, string> = {
    'order_placed': '#22c55e',
    'payment_collected': '#3b82f6',
    'follow_up_needed': '#f59e0b',
    'not_interested': '#ef4444',
    'shop_closed': '#6b7280',
    'customer_not_available': '#6b7280',
  };
  const bg = colors[outcome || ''] || '#8b5cf6';
  return L.divIcon({
    className: '',
    html: `<div class="visit-marker" style="background:${bg}">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Auto-fit map bounds
function MapBoundsController({ salesmen, selectedSalesmanId, routePoints }: {
  salesmen: LiveTrackingData[];
  selectedSalesmanId?: string | null;
  routePoints?: LocationPoint[];
}) {
  const map = useMap();

  useEffect(() => {
    // If a route is showing, fit to route
    if (selectedSalesmanId && routePoints && routePoints.length > 0) {
      const bounds = L.latLngBounds(routePoints.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      return;
    }

    // If a salesman is selected, center on them
    if (selectedSalesmanId) {
      const s = salesmen.find(s => s.salesman.id === selectedSalesmanId);
      if (s?.lastLocation) {
        map.setView([s.lastLocation.latitude, s.lastLocation.longitude], 15, { animate: true });
        return;
      }
    }

    // Fit all salesmen with locations
    const withLoc = salesmen.filter(s => s.lastLocation);
    if (withLoc.length > 0) {
      const bounds = L.latLngBounds(
        withLoc.map(s => [s.lastLocation!.latitude, s.lastLocation!.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [selectedSalesmanId, routePoints, salesmen, map]);

  return null;
}

// Fit all button control
function FitAllButton({ salesmen }: { salesmen: LiveTrackingData[] }) {
  const map = useMap();

  const handleFitAll = () => {
    const withLoc = salesmen.filter(s => s.lastLocation);
    if (withLoc.length > 0) {
      const bounds = L.latLngBounds(
        withLoc.map(s => [s.lastLocation!.latitude, s.lastLocation!.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  return (
    <div className="map-fit-btn" onClick={handleFitAll} title="Fit all markers">
      Fit All
    </div>
  );
}

function getOutcomeLabel(outcome?: string): string {
  const labels: Record<string, string> = {
    'order_placed': 'Order Placed',
    'payment_collected': 'Payment Collected',
    'follow_up_needed': 'Follow-up',
    'not_interested': 'Not Interested',
    'shop_closed': 'Shop Closed',
    'customer_not_available': 'Customer N/A',
  };
  return labels[outcome || ''] || outcome || '-';
}

export function LiveTrackingMap({
  salesmen,
  selectedSalesmanId,
  onSelectSalesman,
  customerLocations = [],
  routePoints = [],
  visits = [],
  height = '500px',
}: LiveTrackingMapProps) {
  // Default center: India
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const defaultZoom = 5;

  // Compute route polyline coords
  const routeLatLngs = useMemo(() => {
    return routePoints.map(p => [p.latitude, p.longitude] as [number, number]);
  }, [routePoints]);

  // Customer icon (memoized)
  const custIcon = useMemo(() => createCustomerIcon(), []);

  return (
    <div className="map-container" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapBoundsController
          salesmen={salesmen}
          selectedSalesmanId={selectedSalesmanId}
          routePoints={routePoints}
        />

        <FitAllButton salesmen={salesmen} />

        {/* Salesman markers */}
        {salesmen.map((item) => {
          if (!item.lastLocation) return null;
          const isSelected = item.salesman.id === selectedSalesmanId;
          return (
            <Marker
              key={item.salesman.id}
              position={[item.lastLocation.latitude, item.lastLocation.longitude]}
              icon={createSalesmanIcon(item.salesman.name, item.isOnline, isSelected)}
              eventHandlers={{
                click: () => onSelectSalesman?.(item.salesman.id),
              }}
            >
              <Popup className="salesman-popup">
                <div className="popup-content">
                  <div className="popup-header">
                    <span className="popup-name">{item.salesman.name}</span>
                    <span className={`popup-badge ${item.isOnline ? 'online' : 'offline'}`}>
                      {item.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="popup-detail">{item.salesman.phone}</div>
                  {item.salesman.branch && (
                    <div className="popup-detail">{item.salesman.branch.name}</div>
                  )}
                  {item.lastSeen && (
                    <div className="popup-detail">
                      Last seen: {new Date(item.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {item.lastLocation.speed != null && item.lastLocation.speed > 0 && (
                    <div className="popup-detail">
                      Speed: {(item.lastLocation.speed * 3.6).toFixed(1)} km/h
                    </div>
                  )}
                  {item.lastLocation.batteryLevel != null && (
                    <div className="popup-detail">
                      Battery: {item.lastLocation.batteryLevel}%
                    </div>
                  )}
                  <div className="popup-stats">
                    <div className="popup-stat">
                      <div className="popup-stat-value">{item.todayStats.customersVisited}</div>
                      <div className="popup-stat-label">Visits</div>
                    </div>
                    <div className="popup-stat">
                      <div className="popup-stat-value">{item.todayStats.distanceKm.toFixed(1)} km</div>
                      <div className="popup-stat-label">Distance</div>
                    </div>
                    <div className="popup-stat">
                      <div className="popup-stat-value">{(item.todayStats.totalHours || 0).toFixed(1)}h</div>
                      <div className="popup-stat-label">Hours</div>
                    </div>
                    <div className="popup-stat">
                      <div className="popup-stat-value">
                        {item.todayStats.startTime
                          ? new Date(item.todayStats.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </div>
                      <div className="popup-stat-label">Started</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Customer location markers */}
        {customerLocations.map((cl) => (
          <Marker
            key={cl.id}
            position={[cl.latitude, cl.longitude]}
            icon={custIcon}
          >
            <Popup>
              <div style={{ padding: '0.25rem', fontSize: '0.8rem' }}>
                <strong>{cl.customer?.name || 'Customer'}</strong>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeLatLngs.length > 1 && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }}
          />
        )}

        {/* Visit markers along the route */}
        {visits.map((visit, index) => (
          <Marker
            key={visit.id}
            position={[visit.checkInLat, visit.checkInLng]}
            icon={createVisitIcon(index, visit.outcome)}
          >
            <Popup>
              <div style={{ padding: '0.25rem', fontSize: '0.8rem', minWidth: '150px' }}>
                <strong>{visit.customer?.name || visit.customerName || 'Visit'}</strong>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {new Date(visit.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {visit.checkOutTime && ` - ${new Date(visit.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </div>
                {visit.outcome && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', fontWeight: 500 }}>
                    {getOutcomeLabel(visit.outcome)}
                  </div>
                )}
                {visit.amountCollected != null && visit.amountCollected > 0 && (
                  <div style={{ marginTop: '0.125rem', fontSize: '0.7rem', color: '#22c55e' }}>
                    Collected: &#8377;{visit.amountCollected.toLocaleString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
