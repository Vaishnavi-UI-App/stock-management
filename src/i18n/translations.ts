// Translation files for multi-language support

export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  // Common
  dashboard: string;
  profile: string;
  logout: string;
  save: string;
  cancel: string;
  submit: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  loading: string;
  noData: string;
  success: string;
  error: string;
  confirm: string;
  yes: string;
  no: string;
  ok: string;
  close: string;
  back: string;
  next: string;
  previous: string;

  // Navigation - Salesman
  attendance: string;
  myRoute: string;
  myStock: string;
  takeProduct: string;
  createBill: string;
  myOrders: string;
  mySales: string;
  expenditures: string;
  myLeaves: string;

  // Route Tracking
  trackingActive: string;
  trackingOff: string;
  startTracking: string;
  stopTracking: string;
  refreshLocation: string;
  checkIn: string;
  checkOut: string;
  customersVisited: string;
  ordersPlaced: string;
  amountCollected: string;
  distance: string;
  todaysVisits: string;
  noVisitsYet: string;
  selectCustomer: string;
  customerName: string;
  visitPurpose: string;
  currentLocation: string;
  visitOutcome: string;
  notes: string;

  // Visit Purposes
  salesVisit: string;
  paymentCollection: string;
  delivery: string;
  followUp: string;
  other: string;

  // Visit Outcomes
  orderPlaced: string;
  paymentCollected: string;
  followUpNeeded: string;
  notInterested: string;
  shopClosed: string;
  customerNotAvailable: string;

  // Bills
  billNumber: string;
  customer: string;
  items: string;
  quantity: string;
  price: string;
  total: string;
  discount: string;
  finalAmount: string;
  paymentMethod: string;
  cash: string;
  card: string;
  upi: string;
  credit: string;

  // Stock
  product: string;
  availableStock: string;
  takenQuantity: string;

  // Attendance
  checkInTime: string;
  checkOutTime: string;
  present: string;
  absent: string;
  halfDay: string;
  late: string;
  onLeave: string;

  // Leaves
  applyLeave: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  casualLeave: string;
  sickLeave: string;
  earnedLeave: string;
  unpaidLeave: string;
  pending: string;
  approved: string;
  rejected: string;

  // Language Settings
  languageSettings: string;
  selectLanguage: string;
  languageChanged: string;
  currentlySelected: string;
  translationPreview: string;

  // Additional Navigation
  products: string;
  sales: string;
  reports: string;
  customers: string;
  orders: string;
  settings: string;
  totalAmount: string;
  paymentReceived: string;

  // Days
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  today: string;

  // Dashboard
  welcomeBack: string;
  productsWithMe: string;
  totalItems: string;
  totalSales: string;
  thisMonth: string;
  myCurrentStock: string;
  recentSales: string;
  noRecentSales: string;
  noProductsWithYou: string;
  takeProductsFromBranch: string;
  perUnit: string;

  // MyStock Page
  productsCurrentlyWithYou: string;
  productTypes: string;
  totalValue: string;
  value: string;
  goToTakeProduct: string;

  // Common Actions
  viewDetails: string;
  print: string;
  download: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    dashboard: 'Dashboard',
    profile: 'Profile',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    noData: 'No data available',
    success: 'Success',
    error: 'Error',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',

    // Navigation - Salesman
    attendance: 'Attendance',
    myRoute: 'My Route',
    myStock: 'My Stock',
    takeProduct: 'Take Product',
    createBill: 'Create Bill',
    myOrders: 'My Orders',
    mySales: 'My Sales',
    expenditures: 'Expenditures',
    myLeaves: 'My Leaves',

    // Route Tracking
    trackingActive: 'Tracking Active',
    trackingOff: 'Tracking Off',
    startTracking: 'Start Tracking',
    stopTracking: 'Stop Tracking',
    refreshLocation: 'Refresh Location',
    checkIn: 'Check In',
    checkOut: 'Check Out',
    customersVisited: 'Customers Visited',
    ordersPlaced: 'Orders Placed',
    amountCollected: 'Amount Collected',
    distance: 'Distance',
    todaysVisits: "Today's Visits",
    noVisitsYet: 'No visits yet today. Start by checking in to a customer.',
    selectCustomer: 'Select Customer',
    customerName: 'Customer Name',
    visitPurpose: 'Visit Purpose',
    currentLocation: 'Current Location',
    visitOutcome: 'Visit Outcome',
    notes: 'Notes',

    // Visit Purposes
    salesVisit: 'Sales Visit',
    paymentCollection: 'Payment Collection',
    delivery: 'Delivery',
    followUp: 'Follow-up',
    other: 'Other',

    // Visit Outcomes
    orderPlaced: 'Order Placed',
    paymentCollected: 'Payment Collected',
    followUpNeeded: 'Follow-up Needed',
    notInterested: 'Not Interested',
    shopClosed: 'Shop Closed',
    customerNotAvailable: 'Customer Not Available',

    // Bills
    billNumber: 'Bill Number',
    customer: 'Customer',
    items: 'Items',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    discount: 'Discount',
    finalAmount: 'Final Amount',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    upi: 'UPI',
    credit: 'Credit',

    // Stock
    product: 'Product',
    availableStock: 'Available Stock',
    takenQuantity: 'Taken Quantity',

    // Attendance
    checkInTime: 'Check-in Time',
    checkOutTime: 'Check-out Time',
    present: 'Present',
    absent: 'Absent',
    halfDay: 'Half Day',
    late: 'Late',
    onLeave: 'On Leave',

    // Leaves
    applyLeave: 'Apply Leave',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    reason: 'Reason',
    casualLeave: 'Casual Leave',
    sickLeave: 'Sick Leave',
    earnedLeave: 'Earned Leave',
    unpaidLeave: 'Unpaid Leave',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',

    // Language Settings
    languageSettings: 'Language Settings',
    selectLanguage: 'Select Language',
    languageChanged: 'Language changed successfully',
    currentlySelected: 'Currently selected',
    translationPreview: 'Translation Preview',

    // Additional Navigation
    products: 'Products',
    sales: 'Sales',
    reports: 'Reports',
    customers: 'Customers',
    orders: 'Orders',
    settings: 'Settings',
    totalAmount: 'Total Amount',
    paymentReceived: 'Payment Received',

    // Days
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    today: 'Today',

    // Dashboard
    welcomeBack: 'Welcome back',
    productsWithMe: 'Products with Me',
    totalItems: 'Total Items',
    totalSales: 'Total Sales',
    thisMonth: 'This Month',
    myCurrentStock: 'My Current Stock',
    recentSales: 'Recent Sales',
    noRecentSales: 'No recent sales',
    noProductsWithYou: 'No products with you',
    takeProductsFromBranch: 'Take products from branch',
    perUnit: 'per',

    // MyStock Page
    productsCurrentlyWithYou: 'Products currently with you',
    productTypes: 'Product Types',
    totalValue: 'Total Value',
    value: 'Value',
    goToTakeProduct: 'Go to "Take Product" to collect products from branch stock',

    // Common Actions
    viewDetails: 'View Details',
    print: 'Print',
    download: 'Download',
  },

  hi: {
    // Common - Hindi
    dashboard: 'डैशबोर्ड',
    profile: 'प्रोफ़ाइल',
    logout: 'लॉग आउट',
    save: 'सेव करें',
    cancel: 'रद्द करें',
    submit: 'जमा करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    add: 'जोड़ें',
    search: 'खोजें',
    loading: 'लोड हो रहा है...',
    noData: 'कोई डेटा उपलब्ध नहीं',
    success: 'सफल',
    error: 'त्रुटि',
    confirm: 'पुष्टि करें',
    yes: 'हाँ',
    no: 'नहीं',
    ok: 'ठीक है',
    close: 'बंद करें',
    back: 'वापस',
    next: 'अगला',
    previous: 'पिछला',

    // Navigation - Salesman
    attendance: 'उपस्थिति',
    myRoute: 'मेरा रूट',
    myStock: 'मेरा स्टॉक',
    takeProduct: 'उत्पाद लें',
    createBill: 'बिल बनाएं',
    myOrders: 'मेरे ऑर्डर',
    mySales: 'मेरी बिक्री',
    expenditures: 'खर्चे',
    myLeaves: 'मेरी छुट्टियाँ',

    // Route Tracking
    trackingActive: 'ट्रैकिंग चालू',
    trackingOff: 'ट्रैकिंग बंद',
    startTracking: 'ट्रैकिंग शुरू करें',
    stopTracking: 'ट्रैकिंग बंद करें',
    refreshLocation: 'लोकेशन रिफ्रेश करें',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    customersVisited: 'ग्राहक मिले',
    ordersPlaced: 'ऑर्डर लिए',
    amountCollected: 'राशि एकत्र',
    distance: 'दूरी',
    todaysVisits: 'आज की विज़िट',
    noVisitsYet: 'आज कोई विज़िट नहीं। ग्राहक के पास चेक इन करें।',
    selectCustomer: 'ग्राहक चुनें',
    customerName: 'ग्राहक का नाम',
    visitPurpose: 'विज़िट का उद्देश्य',
    currentLocation: 'वर्तमान स्थान',
    visitOutcome: 'विज़िट का परिणाम',
    notes: 'नोट्स',

    // Visit Purposes
    salesVisit: 'बिक्री विज़िट',
    paymentCollection: 'भुगतान वसूली',
    delivery: 'डिलीवरी',
    followUp: 'फॉलो-अप',
    other: 'अन्य',

    // Visit Outcomes
    orderPlaced: 'ऑर्डर मिला',
    paymentCollected: 'भुगतान मिला',
    followUpNeeded: 'फॉलो-अप जरूरी',
    notInterested: 'रुचि नहीं',
    shopClosed: 'दुकान बंद',
    customerNotAvailable: 'ग्राहक उपलब्ध नहीं',

    // Bills
    billNumber: 'बिल नंबर',
    customer: 'ग्राहक',
    items: 'आइटम',
    quantity: 'मात्रा',
    price: 'कीमत',
    total: 'कुल',
    discount: 'छूट',
    finalAmount: 'अंतिम राशि',
    paymentMethod: 'भुगतान का तरीका',
    cash: 'नकद',
    card: 'कार्ड',
    upi: 'यूपीआई',
    credit: 'उधार',

    // Stock
    product: 'उत्पाद',
    availableStock: 'उपलब्ध स्टॉक',
    takenQuantity: 'ली गई मात्रा',

    // Attendance
    checkInTime: 'चेक-इन समय',
    checkOutTime: 'चेक-आउट समय',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    halfDay: 'आधा दिन',
    late: 'देर से',
    onLeave: 'छुट्टी पर',

    // Leaves
    applyLeave: 'छुट्टी के लिए आवेदन करें',
    leaveType: 'छुट्टी का प्रकार',
    startDate: 'शुरू की तारीख',
    endDate: 'समाप्ति तिथि',
    reason: 'कारण',
    casualLeave: 'आकस्मिक छुट्टी',
    sickLeave: 'बीमारी की छुट्टी',
    earnedLeave: 'अर्जित छुट्टी',
    unpaidLeave: 'बिना वेतन छुट्टी',
    pending: 'लंबित',
    approved: 'स्वीकृत',
    rejected: 'अस्वीकृत',

    // Language Settings
    languageSettings: 'भाषा सेटिंग्स',
    selectLanguage: 'भाषा चुनें',
    languageChanged: 'भाषा सफलतापूर्वक बदल गई',
    currentlySelected: 'वर्तमान में चयनित',
    translationPreview: 'अनुवाद पूर्वावलोकन',

    // Additional Navigation
    products: 'उत्पाद',
    sales: 'बिक्री',
    reports: 'रिपोर्ट',
    customers: 'ग्राहक',
    orders: 'ऑर्डर',
    settings: 'सेटिंग्स',
    totalAmount: 'कुल राशि',
    paymentReceived: 'भुगतान प्राप्त',

    // Days
    monday: 'सोमवार',
    tuesday: 'मंगलवार',
    wednesday: 'बुधवार',
    thursday: 'गुरुवार',
    friday: 'शुक्रवार',
    saturday: 'शनिवार',
    sunday: 'रविवार',
    today: 'आज',

    // Dashboard
    welcomeBack: 'वापस स्वागत है',
    productsWithMe: 'मेरे पास उत्पाद',
    totalItems: 'कुल आइटम',
    totalSales: 'कुल बिक्री',
    thisMonth: 'इस महीने',
    myCurrentStock: 'मेरा वर्तमान स्टॉक',
    recentSales: 'हाल की बिक्री',
    noRecentSales: 'कोई हाल की बिक्री नहीं',
    noProductsWithYou: 'आपके पास कोई उत्पाद नहीं',
    takeProductsFromBranch: 'शाखा से उत्पाद लें',
    perUnit: 'प्रति',

    // MyStock Page
    productsCurrentlyWithYou: 'आपके पास मौजूद उत्पाद',
    productTypes: 'उत्पाद प्रकार',
    totalValue: 'कुल मूल्य',
    value: 'मूल्य',
    goToTakeProduct: '"उत्पाद लें" पर जाएं शाखा स्टॉक से उत्पाद लेने के लिए',

    // Common Actions
    viewDetails: 'विवरण देखें',
    print: 'प्रिंट',
    download: 'डाउनलोड',
  },

  mr: {
    // Common - Marathi
    dashboard: 'डॅशबोर्ड',
    profile: 'प्रोफाइल',
    logout: 'लॉग आउट',
    save: 'सेव्ह करा',
    cancel: 'रद्द करा',
    submit: 'सबमिट करा',
    delete: 'हटवा',
    edit: 'संपादित करा',
    add: 'जोडा',
    search: 'शोधा',
    loading: 'लोड होत आहे...',
    noData: 'डेटा उपलब्ध नाही',
    success: 'यशस्वी',
    error: 'त्रुटी',
    confirm: 'पुष्टी करा',
    yes: 'होय',
    no: 'नाही',
    ok: 'ठीक आहे',
    close: 'बंद करा',
    back: 'मागे',
    next: 'पुढे',
    previous: 'मागील',

    // Navigation - Salesman
    attendance: 'उपस्थिती',
    myRoute: 'माझा मार्ग',
    myStock: 'माझा स्टॉक',
    takeProduct: 'उत्पादन घ्या',
    createBill: 'बिल बनवा',
    myOrders: 'माझे ऑर्डर',
    mySales: 'माझी विक्री',
    expenditures: 'खर्च',
    myLeaves: 'माझ्या सुट्ट्या',

    // Route Tracking
    trackingActive: 'ट्रॅकिंग चालू',
    trackingOff: 'ट्रॅकिंग बंद',
    startTracking: 'ट्रॅकिंग सुरू करा',
    stopTracking: 'ट्रॅकिंग थांबवा',
    refreshLocation: 'स्थान रिफ्रेश करा',
    checkIn: 'चेक इन',
    checkOut: 'चेक आउट',
    customersVisited: 'ग्राहक भेटले',
    ordersPlaced: 'ऑर्डर घेतले',
    amountCollected: 'रक्कम जमा',
    distance: 'अंतर',
    todaysVisits: 'आजच्या भेटी',
    noVisitsYet: 'आज भेटी नाहीत. ग्राहकाकडे चेक इन करा.',
    selectCustomer: 'ग्राहक निवडा',
    customerName: 'ग्राहकाचे नाव',
    visitPurpose: 'भेटीचा उद्देश',
    currentLocation: 'सध्याचे स्थान',
    visitOutcome: 'भेटीचा निकाल',
    notes: 'नोट्स',

    // Visit Purposes
    salesVisit: 'विक्री भेट',
    paymentCollection: 'पेमेंट वसूली',
    delivery: 'डिलिव्हरी',
    followUp: 'फॉलो-अप',
    other: 'इतर',

    // Visit Outcomes
    orderPlaced: 'ऑर्डर मिळाला',
    paymentCollected: 'पेमेंट मिळाले',
    followUpNeeded: 'फॉलो-अप आवश्यक',
    notInterested: 'रस नाही',
    shopClosed: 'दुकान बंद',
    customerNotAvailable: 'ग्राहक उपलब्ध नाही',

    // Bills
    billNumber: 'बिल क्रमांक',
    customer: 'ग्राहक',
    items: 'वस्तू',
    quantity: 'प्रमाण',
    price: 'किंमत',
    total: 'एकूण',
    discount: 'सवलत',
    finalAmount: 'अंतिम रक्कम',
    paymentMethod: 'पेमेंट पद्धत',
    cash: 'रोख',
    card: 'कार्ड',
    upi: 'यूपीआय',
    credit: 'उधार',

    // Stock
    product: 'उत्पादन',
    availableStock: 'उपलब्ध स्टॉक',
    takenQuantity: 'घेतलेले प्रमाण',

    // Attendance
    checkInTime: 'चेक-इन वेळ',
    checkOutTime: 'चेक-आउट वेळ',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    halfDay: 'अर्धा दिवस',
    late: 'उशीरा',
    onLeave: 'सुट्टीवर',

    // Leaves
    applyLeave: 'सुट्टीसाठी अर्ज करा',
    leaveType: 'सुट्टीचा प्रकार',
    startDate: 'सुरुवात तारीख',
    endDate: 'शेवटची तारीख',
    reason: 'कारण',
    casualLeave: 'आकस्मिक सुट्टी',
    sickLeave: 'आजारपणाची सुट्टी',
    earnedLeave: 'कमावलेली सुट्टी',
    unpaidLeave: 'विना वेतन सुट्टी',
    pending: 'प्रलंबित',
    approved: 'मंजूर',
    rejected: 'नाकारले',

    // Language Settings
    languageSettings: 'भाषा सेटिंग्ज',
    selectLanguage: 'भाषा निवडा',
    languageChanged: 'भाषा यशस्वीपणे बदलली',
    currentlySelected: 'सध्या निवडलेले',
    translationPreview: 'अनुवाद पूर्वावलोकन',

    // Additional Navigation
    products: 'उत्पादने',
    sales: 'विक्री',
    reports: 'अहवाल',
    customers: 'ग्राहक',
    orders: 'ऑर्डर',
    settings: 'सेटिंग्ज',
    totalAmount: 'एकूण रक्कम',
    paymentReceived: 'पेमेंट मिळाले',

    // Days
    monday: 'सोमवार',
    tuesday: 'मंगळवार',
    wednesday: 'बुधवार',
    thursday: 'गुरुवार',
    friday: 'शुक्रवार',
    saturday: 'शनिवार',
    sunday: 'रविवार',
    today: 'आज',

    // Dashboard
    welcomeBack: 'पुन्हा स्वागत आहे',
    productsWithMe: 'माझ्याकडे उत्पादने',
    totalItems: 'एकूण वस्तू',
    totalSales: 'एकूण विक्री',
    thisMonth: 'या महिन्यात',
    myCurrentStock: 'माझा सध्याचा स्टॉक',
    recentSales: 'अलीकडील विक्री',
    noRecentSales: 'अलीकडील विक्री नाही',
    noProductsWithYou: 'तुमच्याकडे उत्पादने नाहीत',
    takeProductsFromBranch: 'शाखेतून उत्पादने घ्या',
    perUnit: 'प्रति',

    // MyStock Page
    productsCurrentlyWithYou: 'तुमच्याकडे सध्या असलेली उत्पादने',
    productTypes: 'उत्पादन प्रकार',
    totalValue: 'एकूण मूल्य',
    value: 'मूल्य',
    goToTakeProduct: '"उत्पादन घ्या" वर जा शाखा स्टॉकमधून उत्पादने घेण्यासाठी',

    // Common Actions
    viewDetails: 'तपशील पहा',
    print: 'प्रिंट',
    download: 'डाउनलोड',
  },
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  mr: 'मराठी (Marathi)',
};
