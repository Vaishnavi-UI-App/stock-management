import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, LogIn, LogOut, MapPin, Camera, CheckCircle, XCircle, Calendar, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { attendanceApi } from '../../services/api';
import '../stock/Stock.css';

export function MyAttendance() {
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
  const [location, setLocation] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = await attendanceApi.getToday();
      setTodayAttendance(today);
    } catch (err) {
      // not checked in yet
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await attendanceApi.getMyHistory(selectedMonth, selectedYear);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const [locationError, setLocationError] = useState('');

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    } catch {
      // fallback to coordinates
    }
    return `Lat: ${lat.toFixed(6)}, Lng: ${lon.toFixed(6)}`;
  };

  const getGeoPosition = (highAccuracy: boolean): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: highAccuracy ? 10000 : 15000,
        enableHighAccuracy: highAccuracy,
        maximumAge: 0
      });
    });
  };

  const getLocation = async (): Promise<string> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser. Please use a modern browser.');
    }

    let position: GeolocationPosition;
    try {
      // Try high accuracy (GPS) first
      position = await getGeoPosition(true);
    } catch {
      try {
        // Fall back to lower accuracy (network-based)
        position = await getGeoPosition(false);
      } catch (error: any) {
        let msg = 'Location access is required for attendance.';
        if (error.code === 1) {
          msg = 'Location permission denied. Please enable location access in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Set Location to "Allow"\n3. Refresh the page and try again';
        } else if (error.code === 2) {
          msg = 'Unable to determine your location. Please check your device GPS/location settings.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please check your internet and GPS, then try again.';
        }
        throw new Error(msg);
      }
    }

    const { latitude, longitude, accuracy } = position.coords;
    const address = await reverseGeocode(latitude, longitude);
    const accStr = accuracy ? `±${Math.round(accuracy)}m` : '';
    return `${address}\nLat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)} (${accStr})`;
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    return ua.substring(0, 200);
  };

  const startCamera = async (type: 'check-in' | 'check-out') => {
    setActionType(type);
    setCapturedPhoto('');
    setLocation('');
    setLocationError('');

    // Get location first - COMPULSORY
    try {
      const loc = await getLocation();
      setLocation(loc);
    } catch (err: any) {
      setLocationError(err.message);
      alert(err.message);
      return; // Block check-in/check-out without location
    }

    // Then open camera
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access is required for attendance. Please enable camera permissions in your browser settings.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photo = canvas.toDataURL('image/jpeg', 0.6);
        setCapturedPhoto(photo);
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const handleSubmitAttendance = async () => {
    if (!capturedPhoto) {
      alert('Please capture a photo first');
      return;
    }
    if (!location) {
      alert('Location is required for attendance. Please enable location access and try again.');
      return;
    }

    setActionLoading(true);
    try {
      const data = {
        photo: capturedPhoto,
        location,
        device: getDeviceInfo()
      };

      if (actionType === 'check-in') {
        const result = await attendanceApi.checkIn(data);
        setTodayAttendance(result);
      } else {
        const result = await attendanceApi.checkOut(data);
        setTodayAttendance(result);
      }

      stopCamera();
      fetchHistory();
      // Re-fetch to ensure state is in sync
      const refreshed = await attendanceApi.getToday();
      if (refreshed) setTodayAttendance(refreshed);
    } catch (err: any) {
      alert(err.message || `${actionType} failed`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#22c55e';
      case 'half_day': return '#f59e0b';
      case 'late': return '#ef4444';
      case 'absent': return '#ef4444';
      case 'on_leave': return '#6366f1';
      default: return '#94a3b8';
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#d4edda', color: '#155724', text: 'Approved' };
      case 'rejected': return { bg: '#f8d7da', color: '#721c24', text: 'Rejected' };
      default: return { bg: '#fff3cd', color: '#856404', text: 'Pending' };
    }
  };

  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const isCheckedIn = todayAttendance && todayAttendance.checkInTime;
  const isCheckedOut = todayAttendance && todayAttendance.checkOutTime;

  // Count stats from history
  const presentCount = history.filter(a => a.status === 'present').length;
  const halfDayCount = history.filter(a => a.status === 'half_day').length;
  const absentCount = history.filter(a => a.status === 'absent').length;

  if (loading) {
    return <div className="stock-page"><div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div></div>;
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>My Attendance</h1>
          <p>Check in, check out, and view your attendance history</p>
        </div>
      </div>

      {/* Current Time & Status */}
      <div className="card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '16px' }}>
        <Clock size={32} style={{ marginBottom: '12px', opacity: 0.8 }} />
        <div style={{ fontSize: '42px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>
          {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </div>
        <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '8px' }}>
          {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* Today's Status */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Check In</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {isCheckedIn ? formatTime(todayAttendance.checkInTime) : '--:--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Check Out</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {isCheckedOut ? formatTime(todayAttendance.checkOutTime) : '--:--'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Total Hours</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>
              {todayAttendance?.totalHours ? `${todayAttendance.totalHours}h` : '--'}
            </div>
          </div>
        </div>

        {/* Location Display */}
        {(todayAttendance?.checkInLocation || todayAttendance?.checkOutLocation) && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {todayAttendance?.checkInLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: 0.9 }}>
                <MapPin size={14} />
                <span>In: {todayAttendance.checkInLocation}</span>
              </div>
            )}
            {todayAttendance?.checkOutLocation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', opacity: 0.9 }}>
                <MapPin size={14} />
                <span>Out: {todayAttendance.checkOutLocation}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Always show both */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => startCamera('check-in')}
            disabled={!!isCheckedIn}
            style={{
              background: isCheckedIn ? 'rgba(255,255,255,0.2)' : 'white',
              color: isCheckedIn ? 'rgba(255,255,255,0.6)' : '#22c55e',
              fontWeight: 600,
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              cursor: isCheckedIn ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogIn size={20} />
            {isCheckedIn ? 'Checked In' : 'Check In'}
          </button>
          <button
            className="btn"
            onClick={() => startCamera('check-out')}
            disabled={!isCheckedIn || !!isCheckedOut}
            style={{
              background: (!isCheckedIn || isCheckedOut) ? 'rgba(255,255,255,0.2)' : 'white',
              color: (!isCheckedIn || isCheckedOut) ? 'rgba(255,255,255,0.6)' : '#ef4444',
              fontWeight: 600,
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              cursor: (!isCheckedIn || isCheckedOut) ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogOut size={20} />
            {isCheckedOut ? 'Checked Out' : 'Check Out'}
          </button>
        </div>
        {isCheckedOut && (
          <div style={{ marginTop: '16px', padding: '10px 24px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} />
            Attendance Completed for Today
          </div>
        )}
        {locationError && (
          <div style={{ marginTop: '16px', padding: '12px 20px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <AlertTriangle size={18} color="#fbbf24" />
            <span>Location required. Enable location in browser settings and try again.</span>
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{presentCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Present</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{halfDayCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Half Day</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{absentCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Absent</div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#22c55e' }}>Attendance Records</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>Click on a record to see full details with photos and location</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 500, minWidth: '120px', textAlign: 'center' }}>
              {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button className="btn btn-sm btn-secondary" onClick={() => {
              if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }}><ChevronRight size={16} /></button>
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <Calendar size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No attendance records for this month</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {history.map(att => {
              const approval = getApprovalBadge(att.approvalStatus);
              const isExpanded = selectedRecord?.id === att.id;
              return (
                <div key={att.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Summary Row - clickable */}
                  <div
                    onClick={() => setSelectedRecord(isExpanded ? null : att)}
                    style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'white', flexWrap: 'wrap', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', minWidth: '160px' }}>{formatDate(att.date)}</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        {att.checkInTime ? formatTime(att.checkInTime) : '--'} → {att.checkOutTime ? formatTime(att.checkOutTime) : '--'}
                      </span>
                      {att.totalHours && <span style={{ fontSize: '13px', fontWeight: 500 }}>{att.totalHours}h</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, background: `${getStatusColor(att.status)}20`, color: getStatusColor(att.status) }}>
                        {att.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, background: approval.bg, color: approval.color }}>
                        {approval.text}
                      </span>
                      <ChevronRight size={16} style={{ color: '#94a3b8', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', background: '#f8fafc' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* Check-In Details */}
                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <LogIn size={18} color="#22c55e" />
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#22c55e' }}>Check-In Details</h4>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Clock size={14} color="#94a3b8" />
                              <span>Time: <strong>{att.checkInTime ? formatTime(att.checkInTime) : '--'}</strong></span>
                            </div>
                            {att.checkInLocation && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <MapPin size={14} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{att.checkInLocation}</span>
                              </div>
                            )}
                            {att.checkInIp && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                <span>IP: {att.checkInIp}</span>
                              </div>
                            )}
                            {att.checkInPhoto && (
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Check-In Photo</div>
                                <img src={att.checkInPhoto} alt="Check-in" style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', border: '1px solid #334155' }} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Check-Out Details */}
                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <LogOut size={18} color="#f59e0b" />
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#f59e0b' }}>Check-Out Details</h4>
                          </div>
                          {att.checkOutTime ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={14} color="#94a3b8" />
                                <span>Time: <strong>{formatTime(att.checkOutTime)}</strong></span>
                              </div>
                              {att.checkOutLocation && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <MapPin size={14} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                                  <span style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{att.checkOutLocation}</span>
                                </div>
                              )}
                              {att.checkOutIp && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                  <span>IP: {att.checkOutIp}</span>
                                </div>
                              )}
                              {att.checkOutPhoto && (
                                <div style={{ marginTop: '8px' }}>
                                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Check-Out Photo</div>
                                  <img src={att.checkOutPhoto} alt="Check-out" style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', border: '1px solid #334155' }} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Not checked out yet</div>
                          )}
                        </div>
                      </div>

                      {/* Notes / Rejection reason */}
                      {att.notes && (
                        <div style={{ marginTop: '12px', padding: '12px 16px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                          <strong>Admin Note:</strong> {att.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={() => { stopCamera(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {actionType === 'check-in' ? 'Check In' : 'Check Out'} - Take Photo
              </h3>
              <button className="modal-close" onClick={stopCamera}><XCircle size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {!capturedPhoto ? (
                <div style={{ textAlign: 'center' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '300px', borderRadius: '12px', background: '#000' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button className="btn btn-primary" onClick={capturePhoto} style={{ marginTop: '16px', padding: '12px 32px' }}>
                    <Camera size={18} />
                    Capture Photo
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <img src={capturedPhoto} alt="Captured" style={{ width: '100%', maxHeight: '300px', borderRadius: '12px', objectFit: 'cover' }} />
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                    <button className="btn btn-secondary" onClick={() => setCapturedPhoto('')}>
                      Retake
                    </button>
                  </div>
                </div>
              )}

              {/* Location info */}
              {location && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <MapPin size={16} color="#22c55e" />
                  <span style={{ color: '#166534' }}>{location}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={stopCamera}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAttendance}
                disabled={!capturedPhoto || actionLoading}
                style={{ background: actionType === 'check-in' ? '#22c55e' : '#ef4444' }}
              >
                {actionLoading ? 'Processing...' : actionType === 'check-in' ? 'Confirm Check In' : 'Confirm Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
