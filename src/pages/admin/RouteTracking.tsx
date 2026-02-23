import { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  Calendar,
  DollarSign,
  ShoppingCart,
  Activity,
  Map as MapIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { gpsApi } from '../../services/api';
import type { LiveTrackingData, CustomerVisit, DailyRouteSummary } from '../../services/api';
import { LiveTrackingMap } from '../../components/map/LiveTrackingMap';
import '../stock/Stock.css';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export function RouteTracking() {
  const [liveData, setLiveData] = useState<LiveTrackingData[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [summary, setSummary] = useState<DailyRouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'live' | 'history'>('live');
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);
  const [routePoints, setRoutePoints] = useState<LocationPoint[]>([]);

  useEffect(() => {
    fetchLiveData();
    fetchCustomerLocations();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSalesman) {
      fetchSalesmanDetails();
      if (view === 'history') {
        fetchRouteHistory();
      } else {
        // In live view, fetch today's route
        fetchRouteHistory();
      }
    } else {
      setVisits([]);
      setSummary(null);
      setRoutePoints([]);
    }
  }, [selectedSalesman, selectedDate, view]);

  const fetchLiveData = async () => {
    try {
      setRefreshing(true);
      const data = await gpsApi.getLiveTracking();
      setLiveData(data);
    } catch (error) {
      console.error('Failed to fetch live tracking data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCustomerLocations = async () => {
    try {
      const data = await gpsApi.getAllCustomerLocations();
      setCustomerLocations(data);
    } catch (error) {
      console.error('Failed to fetch customer locations:', error);
    }
  };

  const fetchSalesmanDetails = async () => {
    if (!selectedSalesman) return;
    try {
      const date = view === 'live' ? format(new Date(), 'yyyy-MM-dd') : selectedDate;
      const [visitsData, summaryData] = await Promise.all([
        gpsApi.getVisits(selectedSalesman, date),
        gpsApi.getRouteSummary(selectedSalesman, date, date)
      ]);
      setVisits(visitsData);
      setSummary(summaryData[0] || null);
    } catch (error) {
      console.error('Failed to fetch salesman details:', error);
    }
  };

  const fetchRouteHistory = async () => {
    if (!selectedSalesman) return;
    try {
      const date = view === 'live' ? format(new Date(), 'yyyy-MM-dd') : selectedDate;
      const history = await gpsApi.getLocationHistory(selectedSalesman, date);
      setRoutePoints(history.map(h => ({
        latitude: h.latitude,
        longitude: h.longitude,
        timestamp: h.timestamp
      })));
    } catch (error) {
      console.error('Failed to fetch route history:', error);
      setRoutePoints([]);
    }
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? '#22c55e' : '#94a3b8';
  };

  const getOutcomeLabel = (outcome?: string) => {
    const labels: Record<string, string> = {
      'order_placed': 'Order Placed',
      'payment_collected': 'Payment Collected',
      'follow_up_needed': 'Follow-up Needed',
      'not_interested': 'Not Interested',
      'shop_closed': 'Shop Closed',
      'customer_not_available': 'Customer N/A',
      'other': 'Other'
    };
    return labels[outcome || ''] || outcome || '-';
  };

  const getOutcomeColor = (outcome?: string) => {
    const colors: Record<string, string> = {
      'order_placed': '#22c55e',
      'payment_collected': '#3b82f6',
      'follow_up_needed': '#f59e0b',
      'not_interested': '#ef4444',
      'shop_closed': '#6b7280',
      'customer_not_available': '#6b7280',
      'other': '#6b7280'
    };
    return colors[outcome || ''] || '#6b7280';
  };

  // Summary stats
  const totalOnline = liveData.filter(d => d.isOnline).length;
  const totalVisitsToday = liveData.reduce((sum, d) => sum + d.todayStats.customersVisited, 0);
  const totalDistanceToday = liveData.reduce((sum, d) => sum + d.todayStats.distanceKm, 0);
  const totalHoursToday = liveData.reduce((sum, d) => sum + (d.todayStats.totalHours || 0), 0);

  const selectedSalesmanData = liveData.find(d => d.salesman.id === selectedSalesman);

  if (loading) {
    return (
      <div className="stock-page">
        <div className="page-header">
          <h1>Route Tracking</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><Navigation size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Route Tracking</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Track salesman locations and customer visits in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn ${view === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setView('live'); setSelectedSalesman(null); }}
          >
            <Activity size={16} /> Live
          </button>
          <button
            className={`btn ${view === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setView('history'); setSelectedSalesman(null); }}
          >
            <Clock size={16} /> History
          </button>
          {view === 'history' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', marginLeft: '0.25rem' }}
            />
          )}
          <button className="btn btn-secondary" onClick={fetchLiveData} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Online Now</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalOnline}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>of {liveData.length} salesmen</div>
            </div>
            <Users size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Visits Today</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalVisitsToday}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>customer visits</div>
            </div>
            <MapPin size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Distance</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalDistanceToday.toFixed(1)} km</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>total covered</div>
            </div>
            <TrendingUp size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Hours</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalHoursToday.toFixed(1)}h</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>combined working</div>
            </div>
            <Clock size={40} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Sidebar - Salesman List */}
        <div className="card" style={{ maxHeight: '560px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ flexShrink: 0 }}>
            <h2 style={{ fontSize: '0.875rem' }}>
              <Users size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              Salesmen ({liveData.length})
            </h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
            {liveData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
                No salesmen found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {liveData.map((item) => (
                  <div
                    key={item.salesman.id}
                    onClick={() => setSelectedSalesman(
                      selectedSalesman === item.salesman.id ? null : item.salesman.id
                    )}
                    style={{
                      padding: '0.625rem',
                      borderRadius: '0.5rem',
                      border: selectedSalesman === item.salesman.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      background: selectedSalesman === item.salesman.id ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: getStatusColor(item.isOnline),
                          boxShadow: item.isOnline ? '0 0 6px #22c55e' : 'none',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.salesman.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {item.salesman.employeeCode || item.salesman.phone}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1e293b' }}>
                          {item.todayStats.customersVisited} visits
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          {item.todayStats.distanceKm.toFixed(1)} km
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '0.875rem' }}>
              <MapIcon size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              {view === 'live' ? 'Live Map' : 'Route History'}
              {selectedSalesmanData && (
                <span style={{ fontWeight: '400', color: '#64748b' }}> - {selectedSalesmanData.salesman.name}</span>
              )}
            </h2>
          </div>
          <LiveTrackingMap
            salesmen={liveData}
            selectedSalesmanId={selectedSalesman}
            onSelectSalesman={(id) => setSelectedSalesman(selectedSalesman === id ? null : id)}
            customerLocations={customerLocations}
            routePoints={selectedSalesman ? routePoints : []}
            visits={selectedSalesman ? visits : []}
            height="500px"
          />
        </div>
      </div>

      {/* Selected Salesman Details */}
      {selectedSalesman && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Summary */}
          {summary && (
            <div className="card">
              <div className="card-header">
                <h2 style={{ fontSize: '0.875rem' }}>
                  <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  Daily Summary - {view === 'live' ? 'Today' : format(new Date(selectedDate), 'dd MMM yyyy')}
                </h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color="#3b82f6" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Working Hours</div>
                      <div style={{ fontWeight: '600' }}>
                        {summary.startTime ? format(new Date(summary.startTime), 'HH:mm') : '-'} -
                        {summary.endTime ? format(new Date(summary.endTime), 'HH:mm') : 'now'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="#22c55e" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Customers Visited</div>
                      <div style={{ fontWeight: '600' }}>{summary.totalCustomersVisited}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={16} color="#8b5cf6" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Orders Taken</div>
                      <div style={{ fontWeight: '600' }}>{summary.totalOrdersTaken}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Amount Collected</div>
                      <div style={{ fontWeight: '600' }}>&#8377;{summary.totalAmountCollected.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation size={16} color="#ec4899" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Distance Covered</div>
                      <div style={{ fontWeight: '600' }}>{summary.totalDistanceKm.toFixed(1)} km</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} color="#8b5cf6" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Productive Hours</div>
                      <div style={{ fontWeight: '600' }}>{(summary.productiveHours || 0).toFixed(1)}h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visits Timeline */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: '0.875rem' }}>
                Customer Visits ({visits.length})
              </h2>
            </div>
            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {visits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No visits recorded
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {visits.map((visit, index) => (
                    <div
                      key={visit.id}
                      style={{
                        position: 'relative',
                        paddingLeft: '1.5rem',
                        paddingBottom: index < visits.length - 1 ? '0.75rem' : 0,
                        borderLeft: index < visits.length - 1 ? '2px solid #e2e8f0' : 'none'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '-6px',
                          top: '0',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: visit.checkOutTime ? getOutcomeColor(visit.outcome) : '#3b82f6',
                          border: '2px solid white',
                          boxShadow: '0 0 0 2px ' + (visit.checkOutTime ? getOutcomeColor(visit.outcome) : '#3b82f6')
                        }}
                      />
                      <div style={{ background: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>
                              {index + 1}. {visit.customer?.name || visit.customerName || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {visit.visitPurpose || 'Visit'}
                            </div>
                          </div>
                          {visit.outcome && (
                            <span
                              style={{
                                padding: '0.125rem 0.5rem',
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
                        </div>
                        <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                          {format(new Date(visit.checkInTime), 'HH:mm')}
                          {visit.checkOutTime && ` - ${format(new Date(visit.checkOutTime), 'HH:mm')}`}
                          {visit.durationMinutes && ` (${visit.durationMinutes} min)`}
                        </div>
                        {visit.amountCollected != null && visit.amountCollected > 0 && (
                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#22c55e', fontWeight: '500' }}>
                            <DollarSign size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                            &#8377;{visit.amountCollected.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .stock-page > div:nth-child(3) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
