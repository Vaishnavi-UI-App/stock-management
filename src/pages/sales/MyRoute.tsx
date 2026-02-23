import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Play,
  Square,
  CheckCircle,
  XCircle,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { gpsApi, customersApi } from '../../services/api';
import type { CustomerVisit, DailyRouteSummary } from '../../services/api';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../i18n/useLanguage';
import '../stock/Stock.css';

export function MyRoute() {
  const { currentUser } = useStore();
  const { t } = useLanguage();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [todayVisits, setTodayVisits] = useState<CustomerVisit[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailyRouteSummary | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeVisit, setActiveVisit] = useState<CustomerVisit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Check-in form
  const [checkInData, setCheckInData] = useState({
    customerId: '',
    customerName: '',
    visitPurpose: 'Sales',
    photo: ''
  });

  // Check-out form
  const [checkOutData, setCheckOutData] = useState({
    outcome: '',
    notes: '',
    amountCollected: 0
  });

  const [_localDistance, setLocalDistance] = useState(0);
  const trackingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchId = useRef<number | null>(null);
  const previousPosition = useRef<{ lat: number; lng: number } | null>(null);

  const GPS_STORAGE_KEY = 'gps-tracking-state';

  const saveTrackingState = (state: { isTracking: boolean; startedAt?: string; localDistance: number; lastLat?: number; lastLng?: number }) => {
    localStorage.setItem(GPS_STORAGE_KEY, JSON.stringify(state));
  };

  const clearTrackingState = () => {
    localStorage.removeItem(GPS_STORAGE_KEY);
  };

  useEffect(() => {
    fetchInitialData();
    getCurrentLocation();

    // Restore tracking state from localStorage on mount
    try {
      const saved = localStorage.getItem(GPS_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.isTracking) {
          setLocalDistance(state.localDistance || 0);
          if (state.lastLat && state.lastLng) {
            previousPosition.current = { lat: state.lastLat, lng: state.lastLng };
          }
          // Auto-resume tracking
          resumeTracking(state.localDistance || 0);
        }
      }
    } catch {
      // Ignore parse errors
    }

    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const fetchInitialData = async () => {
    if (!currentUser) return;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [visitsData, summaryData, customersData] = await Promise.all([
        gpsApi.getVisits(currentUser.id, today),
        gpsApi.getRouteSummary(currentUser.id, today, today),
        customersApi.getAll()
      ]);
      setTodayVisits(visitsData);
      setTodaySummary(summaryData[0] || null);
      setCustomers(customersData);

      // Check if there's an active visit (checked in but not checked out)
      const active = visitsData.find(v => !v.checkOutTime);
      if (active) setActiveVisit(active);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setLocationError(null);

        // Try to get address using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            setCurrentLocation(prev => prev ? { ...prev, address: data.display_name } : null);
          }
        } catch {
          // Ignore geocoding errors
        }
      },
      (error) => {
        setLocationError('Unable to get your location: ' + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Local Haversine distance calculation (meters)
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startWatchingPosition = (initialDistance: number) => {
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        // Track local distance
        if (previousPosition.current) {
          const dist = haversineDistance(
            previousPosition.current.lat, previousPosition.current.lng,
            latitude, longitude
          );
          if (dist >= 50 && dist <= 500) {
            setLocalDistance(prev => {
              const updated = prev + dist / 1000;
              saveTrackingState({
                isTracking: true,
                startedAt: new Date().toISOString(),
                localDistance: updated,
                lastLat: latitude,
                lastLng: longitude
              });
              return updated;
            });
          } else {
            // Still update last position in storage
            saveTrackingState({
              isTracking: true,
              startedAt: new Date().toISOString(),
              localDistance: initialDistance,
              lastLat: latitude,
              lastLng: longitude
            });
          }
        } else {
          saveTrackingState({
            isTracking: true,
            startedAt: new Date().toISOString(),
            localDistance: initialDistance,
            lastLat: latitude,
            lastLng: longitude
          });
        }
        previousPosition.current = { lat: latitude, lng: longitude };

        try {
          await gpsApi.recordLocation({
            latitude,
            longitude,
            accuracy: accuracy || undefined,
            speed: speed || undefined,
            heading: heading || undefined,
            altitude: altitude || undefined,
            batteryLevel: await getBatteryLevel()
          });
        } catch (error) {
          console.error('Failed to record location:', error);
        }
      },
      (error) => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );

    trackingInterval.current = setInterval(async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;
          try {
            await gpsApi.recordLocation({
              latitude,
              longitude,
              accuracy: accuracy || undefined,
              speed: speed || undefined,
              heading: heading || undefined,
              altitude: altitude || undefined,
              batteryLevel: await getBatteryLevel()
            });
          } catch (error) {
            console.error('Failed to record location:', error);
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }, 5 * 60 * 1000);
  };

  const startTracking = () => {
    if (!navigator.geolocation) return;

    setIsTracking(true);
    setLocalDistance(0);
    previousPosition.current = null;

    saveTrackingState({ isTracking: true, startedAt: new Date().toISOString(), localDistance: 0 });
    startWatchingPosition(0);
  };

  const resumeTracking = (restoredDistance: number) => {
    if (!navigator.geolocation) return;
    setIsTracking(true);
    startWatchingPosition(restoredDistance);
  };

  const stopTracking = () => {
    setIsTracking(false);
    clearTrackingState();
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
  };

  const getBatteryLevel = async (): Promise<number | undefined> => {
    try {
      // @ts-ignore - Battery API
      const battery = await navigator.getBattery?.();
      return battery ? Math.round(battery.level * 100) : undefined;
    } catch {
      return undefined;
    }
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      alert('Please wait for location to be detected');
      return;
    }

    // Get customer name if customerId is selected
    let custName = checkInData.customerName;
    if (checkInData.customerId) {
      const selectedCustomer = customers.find(c => c.id === checkInData.customerId);
      custName = selectedCustomer?.name || checkInData.customerName;
    }

    try {
      const visit = await gpsApi.visitCheckIn({
        customerId: checkInData.customerId || undefined,
        customerName: custName || undefined,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address: currentLocation.address || undefined,
        photo: checkInData.photo || undefined,
        visitPurpose: checkInData.visitPurpose
      });

      setActiveVisit(visit);
      setTodayVisits(prev => [...prev, visit]);
      setShowCheckIn(false);
      setCheckInData({ customerId: '', customerName: '', visitPurpose: 'Sales', photo: '' });

      // Refresh summary
      const today = format(new Date(), 'yyyy-MM-dd');
      const summary = await gpsApi.getRouteSummary(currentUser!.id, today, today);
      setTodaySummary(summary[0] || null);
    } catch (error: any) {
      console.error('Check-in error:', error);
      const errorMsg = error?.message || error?.error || 'Unknown error';
      alert(`Failed to check in: ${errorMsg}`);
    }
  };

  const handleCheckOut = async () => {
    if (!activeVisit || !currentLocation) return;

    if (!checkOutData.outcome) {
      alert(t.selectCustomer);
      return;
    }

    try {
      const updatedVisit = await gpsApi.visitCheckOut(activeVisit.id, {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address: currentLocation.address,
        outcome: checkOutData.outcome,
        notes: checkOutData.notes || undefined,
        amountCollected: checkOutData.amountCollected || undefined
      });

      setTodayVisits(prev => prev.map(v => v.id === updatedVisit.id ? updatedVisit : v));
      setActiveVisit(null);
      setShowCheckOut(false);
      setCheckOutData({ outcome: '', notes: '', amountCollected: 0 });

      // Refresh summary
      const today = format(new Date(), 'yyyy-MM-dd');
      const summary = await gpsApi.getRouteSummary(currentUser!.id, today, today);
      setTodaySummary(summary[0] || null);
    } catch (error) {
      alert('Failed to check out. Please try again.');
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    const labels: Record<string, string> = {
      'order_placed': t.orderPlaced,
      'payment_collected': t.paymentCollected,
      'follow_up_needed': t.followUpNeeded,
      'not_interested': t.notInterested,
      'shop_closed': t.shopClosed,
      'customer_not_available': t.customerNotAvailable,
      'other': t.other
    };
    return labels[outcome] || outcome;
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: Record<string, string> = {
      'order_placed': '#22c55e',
      'payment_collected': '#3b82f6',
      'follow_up_needed': '#f59e0b',
      'not_interested': '#ef4444',
      'shop_closed': '#6b7280',
      'customer_not_available': '#6b7280',
      'other': '#6b7280'
    };
    return colors[outcome] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="stock-page">
        <div className="page-header">
          <h1>{t.myRoute}</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1><Navigation size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />{t.myRoute}</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={getCurrentLocation}>
          <RefreshCw size={16} /> {t.refreshLocation}
        </button>
      </div>

      {/* Location Status */}
      {locationError && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
            <AlertCircle size={20} />
            <span>{locationError}</span>
          </div>
        </div>
      )}

      {/* Tracking Control */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isTracking ? '#22c55e' : '#94a3b8',
                    boxShadow: isTracking ? '0 0 8px #22c55e' : 'none'
                  }}
                />
                <span style={{ fontWeight: '600' }}>
                  {isTracking ? t.trackingActive : t.trackingOff}
                </span>
              </div>
              {currentLocation && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  {currentLocation.address?.substring(0, 50) || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isTracking ? (
                <button className="btn btn-primary" onClick={startTracking}>
                  <Play size={16} /> {t.startTracking}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={stopTracking}>
                  <Square size={16} /> {t.stopTracking}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <MapPin size={24} color="#3b82f6" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            {todaySummary?.totalCustomersVisited || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.customersVisited}</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <ShoppingCart size={24} color="#22c55e" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            {todaySummary?.totalOrdersTaken || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.ordersPlaced}</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <DollarSign size={24} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            ₹{(todaySummary?.totalAmountCollected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.amountCollected}</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Navigation size={24} color="#8b5cf6" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            {(todaySummary?.totalDistanceKm || 0).toFixed(1)} km
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.distance}</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Clock size={24} color="#ec4899" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
            {todaySummary?.startTime
              ? ((
                  (todaySummary.endTime ? new Date(todaySummary.endTime).getTime() : new Date().getTime())
                  - new Date(todaySummary.startTime).getTime()
                ) / (1000 * 60 * 60)).toFixed(1)
              : '0'}h
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Working Hours</div>
        </div>
      </div>

      {/* Active Visit or Check-in Button */}
      {activeVisit ? (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #3b82f6' }}>
          <div className="card-header" style={{ background: '#eff6ff' }}>
            <h2 style={{ color: '#1e40af' }}>
              <MapPin size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
              {t.checkIn}
            </h2>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                {activeVisit.customer?.name || activeVisit.customerName || 'Unknown Customer'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {t.checkInTime}: {format(new Date(activeVisit.checkInTime), 'HH:mm')}
              </div>
              {activeVisit.checkInAddress && (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {activeVisit.checkInAddress}
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => setShowCheckOut(true)}>
              <CheckCircle size={16} /> {t.checkOut}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setShowCheckIn(true)}>
              <MapPin size={20} /> {t.checkIn} - {t.customer}
            </button>
          </div>
        </div>
      )}

      {/* Today's Visits */}
      <div className="card">
        <div className="card-header">
          <h2>{t.todaysVisits} ({todayVisits.length})</h2>
        </div>
        <div className="card-body">
          {todayVisits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              {t.noVisitsYet}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todayVisits.map((visit, index) => (
                <div
                  key={visit.id}
                  style={{
                    padding: '1rem',
                    background: visit.checkOutTime ? '#f8fafc' : '#eff6ff',
                    borderRadius: '0.5rem',
                    border: visit.checkOutTime ? '1px solid #e2e8f0' : '2px solid #3b82f6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>
                        {index + 1}. {visit.customer?.name || visit.customerName || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        {format(new Date(visit.checkInTime), 'HH:mm')}
                        {visit.checkOutTime && ` - ${format(new Date(visit.checkOutTime), 'HH:mm')}`}
                        {visit.durationMinutes && ` (${visit.durationMinutes} min)`}
                      </div>
                    </div>
                    {visit.outcome && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          background: getOutcomeColor(visit.outcome) + '20',
                          color: getOutcomeColor(visit.outcome)
                        }}
                      >
                        {getOutcomeLabel(visit.outcome)}
                      </span>
                    )}
                    {!visit.checkOutTime && (
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          background: '#dbeafe',
                          color: '#1e40af'
                        }}
                      >
                        {t.pending}
                      </span>
                    )}
                  </div>
                  {visit.amountCollected && visit.amountCollected > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#22c55e', fontWeight: '500' }}>
                      <DollarSign size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      ₹{visit.amountCollected.toLocaleString()} {t.amountCollected}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Check-in Modal */}
      {showCheckIn && (
        <div className="modal-overlay" onClick={() => setShowCheckIn(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{t.checkIn} - {t.customer}</h2>
              <button className="modal-close" onClick={() => setShowCheckIn(false)}>
                <XCircle size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t.selectCustomer}</label>
                <select
                  className="form-input"
                  value={checkInData.customerId}
                  onChange={e => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setCheckInData({
                      ...checkInData,
                      customerId: e.target.value,
                      customerName: customer?.name || ''
                    });
                  }}
                >
                  <option value="">-- {t.selectCustomer} --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              </div>

              {!checkInData.customerId && (
                <div className="form-group">
                  <label>{t.customerName}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t.customerName}
                    value={checkInData.customerName}
                    onChange={e => setCheckInData({ ...checkInData, customerName: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t.visitPurpose}</label>
                <select
                  className="form-input"
                  value={checkInData.visitPurpose}
                  onChange={e => setCheckInData({ ...checkInData, visitPurpose: e.target.value })}
                >
                  <option value="Sales">{t.salesVisit}</option>
                  <option value="Collection">{t.paymentCollection}</option>
                  <option value="Delivery">{t.delivery}</option>
                  <option value="Follow-up">{t.followUp}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t.currentLocation}</label>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                  <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  {currentLocation
                    ? currentLocation.address || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                    : t.loading}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCheckIn(false)}>{t.cancel}</button>
              <button
                className="btn btn-primary"
                onClick={handleCheckIn}
                disabled={!currentLocation || (!checkInData.customerId && !checkInData.customerName)}
              >
                <CheckCircle size={16} /> {t.checkIn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Modal */}
      {showCheckOut && activeVisit && (
        <div className="modal-overlay" onClick={() => setShowCheckOut(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{t.checkOut}</h2>
              <button className="modal-close" onClick={() => setShowCheckOut(false)}>
                <XCircle size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: '600' }}>
                  {activeVisit.customer?.name || activeVisit.customerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {t.checkInTime}: {format(new Date(activeVisit.checkInTime), 'HH:mm')}
                </div>
              </div>

              <div className="form-group">
                <label>{t.visitOutcome} *</label>
                <select
                  className="form-input"
                  value={checkOutData.outcome}
                  onChange={e => setCheckOutData({ ...checkOutData, outcome: e.target.value })}
                  required
                >
                  <option value="">-- {t.visitOutcome} --</option>
                  <option value="order_placed">{t.orderPlaced}</option>
                  <option value="payment_collected">{t.paymentCollected}</option>
                  <option value="follow_up_needed">{t.followUpNeeded}</option>
                  <option value="not_interested">{t.notInterested}</option>
                  <option value="shop_closed">{t.shopClosed}</option>
                  <option value="customer_not_available">{t.customerNotAvailable}</option>
                  <option value="other">{t.other}</option>
                </select>
              </div>

              {(checkOutData.outcome === 'order_placed' || checkOutData.outcome === 'payment_collected') && (
                <div className="form-group">
                  <label>{t.amountCollected} (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={checkOutData.amountCollected || ''}
                    onChange={e => setCheckOutData({ ...checkOutData, amountCollected: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t.notes}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={t.notes}
                  value={checkOutData.notes}
                  onChange={e => setCheckOutData({ ...checkOutData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCheckOut(false)}>{t.cancel}</button>
              <button
                className="btn btn-primary"
                onClick={handleCheckOut}
                disabled={!checkOutData.outcome}
              >
                <CheckCircle size={16} /> {t.checkOut}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
