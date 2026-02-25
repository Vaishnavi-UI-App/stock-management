import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, ChevronLeft, ChevronRight, Eye, X, MapPin, Image, AlertTriangle, Download, FileText } from 'lucide-react';
import { attendanceApi, organizationApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

type CardFilter = 'all' | 'today_present' | 'month_present' | 'half_day' | 'absent_late' | 'pending';

export function AttendanceManagement() {
  const { users, fetchUsers, currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
  // For branch_manager, only show their branch employees in filters
  const filteredUsers = isBranchManager && currentUser?.branchId
    ? users.filter(u => u.branchId === currentUser.branchId)
    : users;
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allMonthData, setAllMonthData] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'history'>('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewDetail, setViewDetail] = useState<any>(null);
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [dlMonth, setDlMonth] = useState(new Date().getMonth() + 1);
  const [dlYear, setDlYear] = useState(new Date().getFullYear());
  const [dlEmployee, setDlEmployee] = useState('');
  const [showSalarySlip, setShowSalarySlip] = useState(false);
  const [slipMonth, setSlipMonth] = useState(new Date().getMonth() + 1);
  const [slipYear, setSlipYear] = useState(new Date().getFullYear());
  const [slipEmployee, setSlipEmployee] = useState('');
  const [slipCustomName, setSlipCustomName] = useState('');
  const [slipCustomDesignation, setSlipCustomDesignation] = useState('');
  const [orgData, setOrgData] = useState<any>(null);
  const [slipData, setSlipData] = useState<any>(null);

  useEffect(() => {
    fetchData();
    if (users.length === 0) {
      fetchUsers();
    }
    organizationApi.get().then(setOrgData).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, selectedMonth, selectedYear, filterUser, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [todayData, pending, sum, monthData] = await Promise.all([
        attendanceApi.getAll({ date: today }),
        attendanceApi.getPending(),
        attendanceApi.getSummary(new Date().getMonth() + 1, new Date().getFullYear()),
        attendanceApi.getAll({ month: new Date().getMonth() + 1, year: new Date().getFullYear() })
      ]);
      setAttendance(todayData);
      setPendingList(pending);
      setSummary(sum);
      setAllMonthData(monthData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const filters: any = { month: selectedMonth, year: selectedYear };
      if (filterUser) filters.userId = filterUser;
      if (filterStatus) filters.approvalStatus = filterStatus;
      const data = await attendanceApi.getAll(filters);
      setAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await attendanceApi.approve(id);
      setPendingList(prev => prev.filter(a => a.id !== id));
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const notes = prompt('Enter rejection reason (optional):');
    try {
      await attendanceApi.reject(id, notes || undefined);
      setPendingList(prev => prev.filter(a => a.id !== id));
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDateFull = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  // Get filtered data based on card click
  const getCardFilteredData = (): any[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    switch (cardFilter) {
      case 'today_present':
        return allMonthData.filter(a => {
          const d = new Date(a.date).toISOString().split('T')[0];
          return d === todayStr;
        });
      case 'month_present':
        return allMonthData.filter(a => a.status === 'present');
      case 'half_day':
        return allMonthData.filter(a => a.status === 'half_day');
      case 'absent_late':
        return allMonthData.filter(a => a.status === 'absent' || a.status === 'late');
      case 'pending':
        return allMonthData.filter(a => a.approvalStatus === 'pending');
      default:
        return [];
    }
  };

  const handleCardClick = (filter: CardFilter) => {
    if (cardFilter === filter) {
      setCardFilter('all');
    } else {
      setCardFilter(filter);
    }
  };

  // XLS Download
  const downloadXLS = (data: any[], fileName: string) => {
    if (data.length === 0) {
      alert('No data to download');
      return;
    }

    const headers = ['Employee', 'Employee Code', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Approval', 'Check-In Location', 'Check-Out Location', 'Check-In IP', 'Check-Out IP'];

    const rows = data.map(att => [
      att.user?.name || '',
      att.user?.employeeCode || '',
      formatDateFull(att.date),
      att.checkInTime ? formatTime(att.checkInTime) : '--',
      att.checkOutTime ? formatTime(att.checkOutTime) : '--',
      att.totalHours ? `${att.totalHours}` : '--',
      att.status?.replace('_', ' ').toUpperCase() || '',
      att.approvalStatus?.toUpperCase() || '',
      att.checkInLocation ? att.checkInLocation.replace(/\n/g, ' ') : '',
      att.checkOutLocation ? att.checkOutLocation.replace(/\n/g, ' ') : '',
      att.checkInIp || '',
      att.checkOutIp || ''
    ]);

    // Build XLS (tab-separated with HTML table for Excel compatibility)
    let xls = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Attendance</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>';
    xls += '<tr>' + headers.map(h => `<th style="background:#4338ca;color:white;font-weight:bold;padding:8px;border:1px solid #ccc">${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      xls += '<tr>' + row.map(cell => `<td style="padding:6px;border:1px solid #e2e8f0">${cell}</td>`).join('') + '</tr>';
    });
    xls += '</table></body></html>';

    const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEmployee = (userId: string, userName: string) => {
    const data = (activeTab === 'history' ? attendance : allMonthData).filter(a => a.userId === userId || a.user?.id === userId);
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    downloadXLS(data, `${userName}_Attendance_${monthName}`);
  };

  const handleFilteredDownload = async () => {
    try {
      const filters: any = { month: dlMonth, year: dlYear };
      if (dlEmployee) filters.userId = dlEmployee;
      const data = await attendanceApi.getAll(filters);
      const monthName = new Date(dlYear, dlMonth - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const empName = dlEmployee ? (users.find(u => u.id === dlEmployee)?.name || 'Employee') : 'All_Employees';
      downloadXLS(data, `${empName}_Attendance_${monthName}`);
      setShowDownloadPanel(false);
    } catch (err) {
      alert('Failed to fetch attendance data');
    }
  };

  const handleGenerateSalarySlip = async () => {
    if (!slipEmployee && !slipCustomName.trim()) {
      alert('Please select an employee or enter a custom name');
      return;
    }
    const emp = slipEmployee ? users.find(u => u.id === slipEmployee) : null;
    try {
      let presentDays = 0, halfDays = 0, lateDays = 0, totalWorkingDays = 0, totalHours = 0;
      if (slipEmployee) {
        const attData = await attendanceApi.getAll({ month: slipMonth, year: slipYear, userId: slipEmployee });
        presentDays = attData.filter((a: any) => a.status === 'present').length;
        halfDays = attData.filter((a: any) => a.status === 'half_day').length;
        lateDays = attData.filter((a: any) => a.status === 'late').length;
        totalHours = attData.reduce((sum: number, a: any) => sum + (a.totalHours || 0), 0);
        totalWorkingDays = presentDays + lateDays + halfDays * 0.5;
      }
      const daysInMonth = new Date(slipYear, slipMonth, 0).getDate();
      if (!slipEmployee) totalWorkingDays = daysInMonth; // custom person = full month
      const lopDays = Math.max(0, daysInMonth - totalWorkingDays);
      setSlipData({ emp, presentDays, halfDays, lateDays, totalWorkingDays, totalHours, lopDays, daysInMonth, customName: slipCustomName.trim(), customDesignation: slipCustomDesignation.trim() });
    } catch {
      alert('Failed to fetch attendance data');
    }
  };

  const printSalarySlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !slipData) return;
    const { emp, presentDays, halfDays, lateDays, totalWorkingDays, totalHours, lopDays, daysInMonth: slipDaysInMonth, customName, customDesignation } = slipData;
    const name = emp?.name || customName || 'N/A';
    const designation = emp?.designation || customDesignation || (emp?.role === 'salesman' ? 'Salesman' : emp?.role === 'branch_manager' ? 'Branch Manager' : emp?.role === 'account_manager' ? 'Account Manager' : emp?.role === 'stock_manager' ? 'Stock Manager' : 'N/A');
    const panNumber = emp?.panCard || 'N/A';
    const empLocation = emp?.location || orgData?.city || 'Pune';
    const daysInMonth = slipDaysInMonth || new Date(slipYear, slipMonth, 0).getDate();
    const paidDays = totalWorkingDays;
    const monthName = new Date(slipYear, slipMonth - 1).toLocaleString('en-IN', { month: 'long' });

    // Prorate factor: paid days / total days in month
    const prorateFactor = daysInMonth > 0 ? paidDays / daysInMonth : 1;

    // Full month earnings from profile allowances
    const basicFull = emp?.basicSalary || 0;
    const hraFull = emp?.houseRentAllowance || 0;
    const conveyanceFull = emp?.conveyanceAllowance || 0;
    const medicalFull = emp?.medicalAllowance || 0;
    const uniformFull = emp?.uniformAllowance || 0;
    const educationFull = emp?.educationAllowance || 0;
    const ltaFull = emp?.ltaAllowance || 0;
    const specialFull = emp?.specialAllowance || 0;
    const totalEarningFull = basicFull + hraFull + conveyanceFull + medicalFull + uniformFull + educationFull + ltaFull + specialFull;

    // Prorated earnings based on attendance
    const basic = Math.round(basicFull * prorateFactor);
    const hra = Math.round(hraFull * prorateFactor);
    const conveyance = Math.round(conveyanceFull * prorateFactor);
    const medical = Math.round(medicalFull * prorateFactor);
    const uniform = Math.round(uniformFull * prorateFactor);
    const education = Math.round(educationFull * prorateFactor);
    const lta = Math.round(ltaFull * prorateFactor);
    const special = Math.round(specialFull * prorateFactor);
    const totalEarning = basic + hra + conveyance + medical + uniform + education + lta + special;

    // LOP deduction (difference between full and prorated)
    const lopDeduction = totalEarningFull - totalEarning;

    // Deductions
    const pTax = 200;
    const pf = emp?.pfDeduction || 0;
    const advancePaid = 0;
    const totalDeduction = pTax + pf + lopDeduction + advancePaid;

    const netPay = totalEarning - (pTax + pf + advancePaid);
    const formattedDate = new Date(slipYear, slipMonth - 1, 1).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Number to words
    function numToWords(n: number): string {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      if (n === 0) return 'Zero';
      function conv(x: number): string {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
        return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + conv(x % 100) : '');
      }
      let r = '';
      const lakh = Math.floor(n / 100000);
      const thou = Math.floor((n % 100000) / 1000);
      const rem = Math.floor(n % 1000);
      if (lakh) r += conv(lakh) + ' Lakh ';
      if (thou) r += conv(thou) + ' Thousand ';
      if (rem) r += conv(rem);
      return '(RUPEES ' + r.trim() + ' ONLY.)';
    }

    printWindow.document.write(`
      <html><head><title>Salary Slip - ${name} - ${monthName} ${slipYear}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 5px; color: #333; background: #fff; }
        .slip { max-width: 800px; margin: auto; border: 2px solid #00a651; }
        .header { display: flex; align-items: center; padding: 8px 15px; border-bottom: 2px solid #00a651; }
        .header-logo { width: 60px; height: 60px; margin-right: 10px; }
        .header-logo img { width: 100%; height: 100%; object-fit: contain; }
        .header-info { flex: 1; }
        .header-info h1 { font-size: 15px; color: #00a651; margin-bottom: 1px; }
        .header-info p { font-size: 9px; color: #555; line-height: 1.3; }
        .header-right { text-align: right; }
        .header-right p { font-size: 9px; color: #555; line-height: 1.4; }
        .date-bar { text-align: right; padding: 4px 15px; background: #e8eaf6; font-size: 11px; font-weight: 600; color: #00a651; border-bottom: 1px solid #c5cae9; }
        .emp-row { display: flex; border-bottom: 1px solid #e0e0e0; font-size: 11px; }
        .emp-row .lbl { width: 130px; padding: 3px 10px; font-weight: 600; color: #333; background: #f5f5f5; border-right: 1px solid #e0e0e0; }
        .emp-row .val { flex: 1; padding: 3px 10px; }
        .emp-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .emp-grid .emp-row { border-right: 1px solid #e0e0e0; }
        .emp-grid .emp-row:nth-child(even) { border-right: none; }
        .payslip-title { text-align: center; padding: 5px; background: #00a651; color: white; font-size: 12px; font-weight: 600; letter-spacing: 1px; }
        .salary-table { width: 100%; border-collapse: collapse; }
        .salary-table th { background: #e8eaf6; color: #00a651; padding: 4px 10px; font-size: 11px; text-align: left; border: 1px solid #c5cae9; }
        .salary-table td { padding: 3px 10px; font-size: 11px; border: 1px solid #e0e0e0; }
        .salary-table .amount { text-align: right; font-weight: 500; }
        .salary-table .total-row td { font-weight: 700; background: #e8eaf6; border-top: 2px solid #00a651; }
        .net-section { padding: 6px 15px; display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #e0e0e0; }
        .net-section strong { color: #00a651; }
        .words-section { padding: 5px 15px; font-size: 10px; border-bottom: 1px solid #e0e0e0; }
        .sign-section { display: flex; justify-content: space-between; padding: 10px 30px 5px; min-height: 70px; }
        .sign-box { text-align: center; font-size: 10px; }
        .sign-box .line { border-top: 1px solid #333; width: 160px; margin-top: 30px; margin-bottom: 3px; }
        .footer-bar { padding: 5px 15px; background: #00a651; color: white; font-size: 9px; display: flex; justify-content: space-between; align-items: center; }
        .footer-bar a { color: #bbdefb; text-decoration: none; }
        @media print { body { padding: 0; margin: 0; } .slip { border: 2px solid #00a651; } @page { margin: 5mm; size: A4; } }
      </style></head><body>
      <div class="slip">
        <!-- Header -->
        <div class="header">
          <div class="header-logo">
            <img src="/logo.png" alt="Logo" onerror="this.style.display='none'" />
          </div>
          <div class="header-info">
            <h1>DYNAMIC CROP SCIENCE INDIA PVT LTD</h1>
            <p>FACTORY: S R NO - 96/2, Godown No. 5, Vighnaharta Services, Charholi Khurd, Malakar Road, Alandi, Pune, Maharashtra, 412105</p>
            <p>Email: dynamiccropscience@gmail.com | Ph: 7020455358</p>
          </div>
          <div class="header-right">
            <p>GST: 27AAWFD2451Q1ZN</p>
            <p>PAN: AAWFD2451Q</p>
            <p>Web: www.dynamiccrops.com</p>
          </div>
        </div>

        <!-- Date -->
        <div class="date-bar">Date : ${formattedDate}</div>

        <!-- Employee Info Grid -->
        <div class="emp-grid">
          <div class="emp-row"><div class="lbl">NAME</div><div class="val">: ${name}</div></div>
          <div class="emp-row"><div class="lbl">PAN NUMBER</div><div class="val">: ${panNumber}</div></div>
          <div class="emp-row"><div class="lbl">DESIGNATION</div><div class="val">: ${designation}</div></div>
          <div class="emp-row"><div class="lbl">LOCATION</div><div class="val">: ${empLocation}</div></div>
          <div class="emp-row"><div class="lbl">EMPLOYEE CODE</div><div class="val">: ${emp?.employeeCode || 'N/A'}</div></div>
          <div class="emp-row"><div class="lbl">UAN NO</div><div class="val">: ${emp?.uanNo || 'N/A'}</div></div>
          <div class="emp-row"><div class="lbl">ESIC NO</div><div class="val">: ${emp?.esicNo || 'N/A'}</div></div>
          <div class="emp-row"><div class="lbl">DAYS IN MONTH</div><div class="val">: ${daysInMonth}</div></div>
          <div class="emp-row"><div class="lbl">PRESENT DAYS</div><div class="val">: ${presentDays}${lateDays ? ' (+ ' + lateDays + ' late)' : ''}</div></div>
          <div class="emp-row"><div class="lbl">HALF DAYS</div><div class="val">: ${halfDays}</div></div>
          <div class="emp-row"><div class="lbl">PAID DAYS</div><div class="val">: ${paidDays}</div></div>
          <div class="emp-row"><div class="lbl">LOP DAYS</div><div class="val">: ${lopDays}</div></div>
          ${totalHours ? `<div class="emp-row"><div class="lbl">TOTAL HOURS</div><div class="val">: ${totalHours.toFixed(1)} hrs</div></div>` : ''}
          ${totalHours ? `<div class="emp-row"><div class="lbl"></div><div class="val"></div></div>` : ''}
        </div>

        <!-- Payslip Title -->
        <div class="payslip-title">PAYSLIP FOR THE MONTH OF ${monthName.toUpperCase()} ${slipYear}</div>

        <!-- Salary Table -->
        <table class="salary-table">
          <thead>
            <tr>
              <th style="width:35%">EARNINGS</th>
              <th style="width:15%; text-align:right">AMOUNT</th>
              <th style="width:35%">DEDUCTIONS</th>
              <th style="width:15%; text-align:right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic</td>
              <td class="amount">${basic.toLocaleString()}</td>
              <td>P.Tax</td>
              <td class="amount">${pTax.toLocaleString()}</td>
            </tr>
            <tr>
              <td>House Rent Allowance</td>
              <td class="amount">${hra.toLocaleString()}</td>
              <td>P.F</td>
              <td class="amount">${pf.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Conveyance Allowance</td>
              <td class="amount">${conveyance.toLocaleString()}</td>
              <td>LOP Deduction (${lopDays} days)</td>
              <td class="amount">${lopDeduction.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Medical Allowance</td>
              <td class="amount">${medical.toLocaleString()}</td>
              <td>Advanced Paid</td>
              <td class="amount">${advancePaid.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Uniform Allowance</td>
              <td class="amount">${uniform.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Education Allowance</td>
              <td class="amount">${education.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>LTA</td>
              <td class="amount">${lta.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td class="amount">${special.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td>TOTAL EARNING</td>
              <td class="amount">${totalEarning.toLocaleString()}</td>
              <td>TOTAL DEDUCTION</td>
              <td class="amount">${totalDeduction.toLocaleString()}</td>
            </tr>
            <tr style="background:#f0fdf4;">
              <td colspan="3" style="font-weight:700; color:#00a651;">GROSS SALARY (Full Month)</td>
              <td class="amount" style="font-weight:700; color:#00a651;">${totalEarningFull.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Net Pay -->
        <div class="net-section">
          <div><strong>NET PAY</strong></div>
          <div><strong>= ${netPay.toLocaleString()}.00</strong></div>
        </div>
        <div class="words-section">
          <strong>Rupees in Words :</strong> ${numToWords(netPay)}
        </div>

        <!-- Bank Details -->
        <div class="bank-details" style="display:flex; padding:6px 20px; font-size:11px; border-bottom:1px solid #e0e0e0; gap:10px;">
          <div style="flex:1;"><strong>A/C NO:</strong> ${emp?.bankAccountNo || 'N/A'}</div>
          <div style="flex:1;"><strong>Bank Name:</strong> ${emp?.bankName || 'N/A'}</div>
          <div style="flex:1;"><strong>IFSC NO:</strong> ${emp?.bankIfscCode || 'N/A'}</div>
        </div>

        <!-- Signatures -->
        <div style="display:flex; justify-content:space-between; padding:10px 40px 5px; min-height:70px;">
          <div style="text-align:center; font-size:10px;">
            <p>For Dynamic Crop Science India Pvt Ltd.</p>
            <img src="/stamp1.jpeg" alt="Company Stamp" style="width:120px;height:auto;margin-top:5px;object-fit:contain;" onerror="this.style.display='none'" />
            <div style="border-top:1px solid #333; width:160px; margin-top:10px; margin-bottom:3px;"></div>
            <p><strong>Authorised Sign</strong></p>
          </div>
          <div style="text-align:center; font-size:10px;">
            <p>Received / Accepted</p>
            <div style="border-top:1px solid #333; width:160px; margin-top:80px; margin-bottom:3px;"></div>
            <p><strong>${name}</strong></p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-bar">
          <span><a href="https://www.dynamiccrops.com">www.dynamiccrops.com</a></span>
          <span>Dynamic Crop Science India Pvt Ltd</span>
        </div>
      </div>
      <script>setTimeout(() => window.print(), 500);</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const cardFilteredData = cardFilter !== 'all' ? getCardFilteredData() : [];

  if (loading) {
    return <div className="stock-page"><div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div></div>;
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Attendance Management</h1>
          <p>Monitor, approve, and manage employee attendance</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowSalarySlip(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a' }}>
            <FileText size={16} /> Generate Salary Slip
          </button>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-primary" onClick={() => setShowDownloadPanel(!showDownloadPanel)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Download XLS
          </button>
          {showDownloadPanel && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '8px',
              background: 'white', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              padding: '20px', zIndex: 100, minWidth: '320px', border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px' }}>Download Attendance</h4>
                <button onClick={() => setShowDownloadPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Month</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="form-select" value={dlMonth} onChange={e => setDlMonth(Number(e.target.value))} style={{ flex: 1 }}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select className="form-select" value={dlYear} onChange={e => setDlYear(Number(e.target.value))} style={{ width: '90px' }}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Employee</label>
                  <select className="form-select" value={dlEmployee} onChange={e => setDlEmployee(e.target.value)}>
                    <option value="">All Employees</option>
                    {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.employeeCode ? `(${u.employeeCode})` : ''}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleFilteredDownload} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Summary Cards - Clickable */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div
            className="card"
            onClick={() => handleCardClick('today_present')}
            style={{
              padding: '20px', textAlign: 'center', borderLeft: '4px solid #22c55e',
              cursor: 'pointer', transition: 'all 0.2s',
              outline: cardFilter === 'today_present' ? '2px solid #22c55e' : 'none',
              transform: cardFilter === 'today_present' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{summary.todayPresent}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Present Today</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>of {summary.totalUsers} employees</div>
          </div>
          <div
            className="card"
            onClick={() => handleCardClick('month_present')}
            style={{
              padding: '20px', textAlign: 'center', borderLeft: '4px solid #6366f1',
              cursor: 'pointer', transition: 'all 0.2s',
              outline: cardFilter === 'month_present' ? '2px solid #6366f1' : 'none',
              transform: cardFilter === 'month_present' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>{summary.present}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Present (Month)</div>
          </div>
          <div
            className="card"
            onClick={() => handleCardClick('half_day')}
            style={{
              padding: '20px', textAlign: 'center', borderLeft: '4px solid #f59e0b',
              cursor: 'pointer', transition: 'all 0.2s',
              outline: cardFilter === 'half_day' ? '2px solid #f59e0b' : 'none',
              transform: cardFilter === 'half_day' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{summary.halfDay}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Half Days</div>
          </div>
          <div
            className="card"
            onClick={() => handleCardClick('absent_late')}
            style={{
              padding: '20px', textAlign: 'center', borderLeft: '4px solid #ef4444',
              cursor: 'pointer', transition: 'all 0.2s',
              outline: cardFilter === 'absent_late' ? '2px solid #ef4444' : 'none',
              transform: cardFilter === 'absent_late' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{summary.absent + summary.late}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Absent / Late</div>
          </div>
          <div
            className="card"
            onClick={() => handleCardClick('pending')}
            style={{
              padding: '20px', textAlign: 'center', borderLeft: '4px solid #f59e0b',
              cursor: 'pointer', transition: 'all 0.2s',
              outline: cardFilter === 'pending' ? '2px solid #f59e0b' : 'none',
              transform: cardFilter === 'pending' ? 'scale(1.02)' : 'none'
            }}
          >
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{summary.pending}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Pending Approval</div>
          </div>
        </div>
      )}

      {/* Card Filter Results */}
      {cardFilter !== 'all' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              {cardFilter === 'today_present' && 'Present Today'}
              {cardFilter === 'month_present' && 'Present This Month'}
              {cardFilter === 'half_day' && 'Half Day Records'}
              {cardFilter === 'absent_late' && 'Absent / Late Records'}
              {cardFilter === 'pending' && 'Pending Approval'}
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>({cardFilteredData.length} records)</span>
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setCardFilter('all')}>
              <X size={14} /> Clear Filter
            </button>
          </div>
          <div className="card" style={{ padding: '0' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cardFilteredData.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    cardFilteredData.map(att => {
                      const approval = getApprovalBadge(att.approvalStatus);
                      return (
                        <tr key={att.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px'
                              }}>
                                {att.user?.name?.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500 }}>{att.user?.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{att.user?.employeeCode || att.user?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(att.date)}</td>
                          <td style={{ color: '#22c55e', fontWeight: 500 }}>{formatTime(att.checkInTime)}</td>
                          <td style={{ color: att.checkOutTime ? '#ef4444' : '#94a3b8', fontWeight: 500 }}>
                            {att.checkOutTime ? formatTime(att.checkOutTime) : 'Working...'}
                          </td>
                          <td>{att.totalHours ? `${att.totalHours}h` : '--'}</td>
                          <td>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: `${getStatusColor(att.status)}20`, color: getStatusColor(att.status) }}>
                              {att.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: approval.bg, color: approval.color }}>
                              {approval.text}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setViewDetail(att)} title="View Details">
                                <Eye size={14} />
                              </button>
                              {att.approvalStatus === 'pending' && (
                                <>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleApprove(att.id)} style={{ background: '#22c55e' }} title="Approve">
                                    <CheckCircle size={14} />
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(att.id)} title="Reject">
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'today', label: "Today's Attendance", icon: Clock },
          { key: 'pending', label: `Pending (${pendingList.length})`, icon: AlertTriangle },
          { key: 'history', label: 'History', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setCardFilter('all'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              border: 'none', background: activeTab === tab.key ? '#6366f1' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b', borderRadius: '8px 8px 0 0',
              cursor: 'pointer', fontWeight: activeTab === tab.key ? 600 : 400, fontSize: '14px'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Today's Tab */}
      {activeTab === 'today' && (
        <div className="card" style={{ padding: '0' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No attendance records for today</td></tr>
                ) : (
                  attendance.map(att => {
                    const approval = getApprovalBadge(att.approvalStatus);
                    return (
                      <tr key={att.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              background: att.user?.profilePhoto ? `url(${att.user.profilePhoto}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px'
                            }}>
                              {!att.user?.profilePhoto && att.user?.name?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{att.user?.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{att.user?.employeeCode || att.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: '#22c55e', fontWeight: 500 }}>{formatTime(att.checkInTime)}</td>
                        <td style={{ color: att.checkOutTime ? '#ef4444' : '#94a3b8', fontWeight: 500 }}>
                          {att.checkOutTime ? formatTime(att.checkOutTime) : 'Working...'}
                        </td>
                        <td>{att.totalHours ? `${att.totalHours}h` : '--'}</td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: `${getStatusColor(att.status)}20`, color: getStatusColor(att.status) }}>
                            {att.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: approval.bg, color: approval.color }}>
                            {approval.text}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setViewDetail(att)} title="View Details">
                              <Eye size={14} />
                            </button>
                            {att.approvalStatus === 'pending' && (
                              <>
                                <button className="btn btn-sm btn-primary" onClick={() => handleApprove(att.id)} style={{ background: '#22c55e' }} title="Approve">
                                  <CheckCircle size={14} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(att.id)} title="Reject">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: '0' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <CheckCircle size={48} style={{ marginBottom: '12px', opacity: 0.3 }} /><br />
                    No pending approvals
                  </td></tr>
                ) : (
                  pendingList.map(att => (
                    <tr key={att.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px'
                          }}>
                            {att.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{att.user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{att.user?.employeeCode || att.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(att.date)}</td>
                      <td style={{ color: '#22c55e', fontWeight: 500 }}>{formatTime(att.checkInTime)}</td>
                      <td>{att.checkOutTime ? formatTime(att.checkOutTime) : 'Not checked out'}</td>
                      <td>{att.totalHours ? `${att.totalHours}h` : '--'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setViewDetail(att)}>
                            <Eye size={14} /> View
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApprove(att.id)} style={{ background: '#22c55e' }}>
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleReject(att.id)}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-select" style={{ maxWidth: '200px' }} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="">All Employees</option>
              {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="form-select" style={{ maxWidth: '160px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            {filterUser && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  const user = users.find(u => u.id === filterUser);
                  if (user) handleDownloadEmployee(filterUser, user.name);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={14} /> Download {users.find(u => u.id === filterUser)?.name}
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
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

          <div className="card" style={{ padding: '0' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    attendance.map(att => {
                      const approval = getApprovalBadge(att.approvalStatus);
                      return (
                        <tr key={att.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{att.user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{att.user?.employeeCode || ''}</div>
                          </td>
                          <td>{formatDate(att.date)}</td>
                          <td>{formatTime(att.checkInTime)}</td>
                          <td>{att.checkOutTime ? formatTime(att.checkOutTime) : '--'}</td>
                          <td>{att.totalHours ? `${att.totalHours}h` : '--'}</td>
                          <td>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: `${getStatusColor(att.status)}20`, color: getStatusColor(att.status) }}>
                              {att.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: approval.bg, color: approval.color }}>
                              {approval.text}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setViewDetail(att)}><Eye size={14} /></button>
                              {att.approvalStatus === 'pending' && (
                                <>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleApprove(att.id)} style={{ background: '#22c55e' }}><CheckCircle size={14} /></button>
                                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(att.id)}><XCircle size={14} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewDetail && (
        <div className="modal-overlay" onClick={() => setViewDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Attendance Details - {viewDetail.user?.name}</h3>
              <button className="modal-close" onClick={() => setViewDetail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Employee Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '18px'
                  }}>
                    {viewDetail.user?.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{viewDetail.user?.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{viewDetail.user?.employeeCode || viewDetail.user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: `${getStatusColor(viewDetail.status)}20`, color: getStatusColor(viewDetail.status) }}>
                    {viewDetail.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {viewDetail.totalHours && (
                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#e0e7ff', color: '#4338ca' }}>
                      {viewDetail.totalHours}h
                    </span>
                  )}
                </div>
              </div>

              {/* Check-In / Check-Out Cards Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Check-In Card */}
                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '18px' }}>→</span>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#22c55e' }}>Check-In Details</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} color="#94a3b8" />
                      <span>Time: <strong>{viewDetail.checkInTime ? formatTime(viewDetail.checkInTime) : '--'}</strong></span>
                    </div>
                    {viewDetail.checkInLocation && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <MapPin size={14} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{viewDetail.checkInLocation}</span>
                      </div>
                    )}
                    {viewDetail.checkInIp && (
                      <div style={{ color: '#94a3b8' }}>IP: {viewDetail.checkInIp}</div>
                    )}
                    {viewDetail.checkInDevice && (
                      <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all' }}>Device: {viewDetail.checkInDevice}</div>
                    )}
                    {viewDetail.checkInPhoto && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Image size={14} /> Check-In Photo
                        </div>
                        <img src={viewDetail.checkInPhoto} alt="Check-in" style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', border: '1px solid #334155' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-Out Card */}
                <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '18px' }}>⇥</span>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#f59e0b' }}>Check-Out Details</h4>
                  </div>
                  {viewDetail.checkOutTime ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} color="#94a3b8" />
                        <span>Time: <strong>{formatTime(viewDetail.checkOutTime)}</strong></span>
                      </div>
                      {viewDetail.checkOutLocation && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <MapPin size={14} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{viewDetail.checkOutLocation}</span>
                        </div>
                      )}
                      {viewDetail.checkOutIp && (
                        <div style={{ color: '#94a3b8' }}>IP: {viewDetail.checkOutIp}</div>
                      )}
                      {viewDetail.checkOutDevice && (
                        <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all' }}>Device: {viewDetail.checkOutDevice}</div>
                      )}
                      {viewDetail.checkOutPhoto && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Image size={14} /> Check-Out Photo
                          </div>
                          <img src={viewDetail.checkOutPhoto} alt="Check-out" style={{ width: '100%', maxWidth: '220px', borderRadius: '8px', border: '1px solid #334155' }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>Not checked out yet</div>
                  )}
                </div>
              </div>

              {viewDetail.notes && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#fff3cd', borderRadius: '8px', fontSize: '13px', color: '#856404' }}>
                  <strong>Admin Note:</strong> {viewDetail.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {viewDetail.approvalStatus === 'pending' && (
                <>
                  <button className="btn btn-primary" onClick={() => { handleApprove(viewDetail.id); setViewDetail(null); }} style={{ background: '#22c55e' }}>
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button className="btn btn-danger" onClick={() => { handleReject(viewDetail.id); setViewDetail(null); }}>
                    <XCircle size={16} /> Reject
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setViewDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {showSalarySlip && (
        <div className="modal-overlay" onClick={() => { setShowSalarySlip(false); setSlipData(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title"><FileText size={18} style={{ marginRight: '8px' }} /> Generate Salary Slip</h3>
              <button className="modal-close" onClick={() => { setShowSalarySlip(false); setSlipData(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Select Employee</label>
                  <select className="form-select" value={slipEmployee} onChange={e => { setSlipEmployee(e.target.value); setSlipCustomName(''); setSlipCustomDesignation(''); setSlipData(null); }}>
                    <option value="">-- Select Employee or Enter Custom --</option>
                    {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.employeeCode ? `(${u.employeeCode})` : ''}</option>)}
                  </select>
                </div>
                {!slipEmployee && (
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '4px', display: 'block' }}>Custom Person (e.g. Director)</label>
                    <input type="text" className="form-input" placeholder="Enter person name" value={slipCustomName} onChange={e => { setSlipCustomName(e.target.value); setSlipData(null); }} style={{ marginBottom: '8px' }} />
                    <input type="text" className="form-input" placeholder="Enter designation (e.g. Director)" value={slipCustomDesignation} onChange={e => { setSlipCustomDesignation(e.target.value); setSlipData(null); }} />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Month & Year</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="form-select" value={slipMonth} onChange={e => { setSlipMonth(Number(e.target.value)); setSlipData(null); }} style={{ flex: 1 }}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select className="form-select" value={slipYear} onChange={e => { setSlipYear(Number(e.target.value)); setSlipData(null); }} style={{ width: '90px' }}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const y = new Date().getFullYear() - 2 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleGenerateSalarySlip} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <FileText size={16} /> Generate
                </button>

                {slipData && (() => {
                  const e = slipData.emp;
                  const dIM = slipData.daysInMonth || new Date(slipYear, slipMonth, 0).getDate();
                  const pFactor = dIM > 0 ? slipData.totalWorkingDays / dIM : 1;
                  const totalEarnFull = (e?.basicSalary || 0) + (e?.houseRentAllowance || 0) + (e?.conveyanceAllowance || 0) + (e?.medicalAllowance || 0) + (e?.uniformAllowance || 0) + (e?.educationAllowance || 0) + (e?.ltaAllowance || 0) + (e?.specialAllowance || 0);
                  const totalEarn = Math.round(totalEarnFull * pFactor);
                  const lopDed = totalEarnFull - totalEarn;
                  const net = totalEarn - (200 + (e?.pfDeduction || 0));
                  return (
                    <div style={{ marginTop: '8px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Salary Summary - {e?.name || slipData.customName}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        {slipData.emp && <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Days in Month:</span><strong>{dIM}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Paid Days:</span><strong>{slipData.totalWorkingDays}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: slipData.lopDays > 0 ? '#ef4444' : '#16a34a' }}><span>LOP Days:</span><strong>{slipData.lopDays}</strong></div>
                        </>}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gross Salary (Full Month):</span><strong>₹{totalEarnFull.toLocaleString()}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Prorated Earnings:</span><strong style={{ color: '#16a34a' }}>₹{totalEarn.toLocaleString()}</strong></div>
                        {lopDed > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>LOP Deduction:</span><strong>-₹{lopDed.toLocaleString()}</strong></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Other Deductions (P.Tax + PF):</span><strong>-₹{(200 + (e?.pfDeduction || 0)).toLocaleString()}</strong></div>
                        <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#00a651' }}>
                          <span>Net Pay:</span>
                          <strong>₹{net.toLocaleString()}</strong>
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={printSalarySlip} style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#00a651' }}>
                        <FileText size={16} /> Print Salary Slip
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
