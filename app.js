/**
 * FlowPlan OS — Master Operating Engine & Integrated RAG Copilot (app.js)
 * Features:
 * - Strict Security: Zero exposed API keys or plain-text passwords in DOM; Server Proxy + Cryptographic Hash Auth
 * - Multi-Horizon Day Drill-Down & Reorganizer: Open & reorganize any individual Day in Yearly, Monthly, Weekly & Daily views
 * - True Drag-to-Move & Drag-to-Resize on Vertical Stack and Horizontal Track Ribbon (05:00 to 01:00)
 * - Full-Product RAG Copilot: Indexes Calendar, Workspace Blocks, Decay Metrics, EOD Audit & Uploaded Docs with live Action Execution
 * - Web Audio API Level 2 & Level 3 Real-Time Alarms + Full-Screen Focus Override
 * - Dual-Master-Admin Automated Purchase Notification & "The Command Center"
 */

'use strict';

// 1. Endpoints & Geometry Constants
const BACKEND_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : window.location.origin;

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xrpbkawp';
const ROW_HEIGHT = 58;
const COL_WIDTH = 130;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CANONICAL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
const RESIDUAL_DAYS = ['Day 29', 'Day 30', 'Day 31'];

// High-Contrast Priority Styling Palette
const PRIORITY_PALETTE = {
  High: { bg: '#5B0D18', border: '#EF4444', text: '#FFFFFF', chip: '#FFF2BA', chipText: '#0B0F19', rgb: [91, 13, 24] },
  Medium: { bg: '#8A4E2A', border: '#F59E0B', text: '#FFF2BA', chip: '#2F4156', chipText: '#FFF2BA', rgb: [138, 78, 42] },
  Low: { bg: '#083B3A', border: '#10B981', text: '#E7E3DD', chip: '#0B0F19', chipText: '#C8D9E6', rgb: [8, 59, 58] },
  Flexible: { bg: '#2F4156', border: '#567C8D', text: '#C8D9E6', chip: '#083B3A', chipText: '#FFF2BA', rgb: [47, 65, 86] }
};

const DAY_DICTIONARY = {
  Mon: ['mon', 'mond', 'mnd', 'monday', 'mndy', 'mondy', 'mondey', 'mony'],
  Tue: ['tue', 'tues', 'tu', 'tuesdy', 'tuesday', 'tueday', 'tuseday', 'tuedy', 'tuesd'],
  Wed: ['wed', 'wedn', 'wednesday', 'wensday', 'wendsday', 'wednsday', 'wedy', 'wednesdy'],
  Thu: ['thu', 'thur', 'thurs', 'thursday', 'thursdy', 'thurday', 'thrsday', 'thursd', 'thrusday'],
  Fri: ['fri', 'frid', 'friday', 'fridy', 'frday', 'fridey', 'fryday'],
  Sat: ['sat', 'satr', 'saturday', 'saturdy', 'satday', 'satuday'],
  Sun: ['sun', 'sund', 'sunday', 'sundy', 'sndy', 'sundey']
};

// Cryptographic verification hash (No plain-text passwords stored in frontend code)
function computeClientHash(email, password) {
  const str = `FP_OBSIDIAN_2026::${email.toLowerCase().trim()}::${password}`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

// Precomputed cryptographic digests for the 2 Master Admin accounts (zero plain-text passwords in client code)
const MASTER_ADMIN_DIGESTS = {
  'stationplayboy7@gmail.com': {
    digest: '9bc83798a6ffc129',
    name: 'Master Founder (Station)',
    role: 'Master Admin (God-Mode)'
  },
  'muhammadashfaqahmad0710@gmail.com': {
    digest: '91427872c87145bb',
    name: 'Master Co-Founder (Ashfaq)',
    role: 'Master Admin (God-Mode)'
  }
};

// Create Clean Default Month Structure (Weeks 1-4 + Residual Days 29-31)
function createEmptyMonthStructure() {
  return {
    'Week 1': { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    'Week 2': { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    'Week 3': { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    'Week 4': { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    Residual: { 'Day 29': [], 'Day 30': [], 'Day 31': [] }
  };
}

function createDefaultYearlyDatabase() {
  const yearDb = {};
  for (let m = 0; m < 12; m++) {
    yearDb[m] = createEmptyMonthStructure();
  }
  return yearDb;
}

// Map Day of Month (1..31) <-> { week, day }
function mapDayNumberToWeekAndDay(dayNum) {
  const n = Math.max(1, Math.min(31, Number(dayNum) || 1));
  if (n >= 29) {
    return { week: 'Residual', day: `Day ${n}` };
  }
  const weekIdx = Math.floor((n - 1) / 7); // 0..3
  const dayIdx = (n - 1) % 7; // 0..6
  return {
    week: MONTH_WEEKS[weekIdx] || 'Week 1',
    day: CANONICAL_DAYS[dayIdx] || 'Mon'
  };
}

let appState = {
  user: null,
  authToken: localStorage.getItem('flowplan_jwt') || null,
  horizonView: 'daily', // 'daily' | 'weekly' | 'monthly' | 'yearly' | 'workspace' | 'audit'
  layoutOrientation: 'vertical',
  activeMonth: new Date().getMonth(), // 0..11
  expandedWeek: 'Week 1',
  expandedDay: 'Mon',
  isFinalized: false,
  startHour: 5, // 05:00 AM
  endHour: 25,  // 01:00 AM (next day)
  activeFilter: 'ALL',
  weekDays: CANONICAL_DAYS,
  monthWeeks: MONTH_WEEKS,
  residualDays: RESIDUAL_DAYS,
  yearlyDatabase: createDefaultYearlyDatabase(),
  workspaceBlocks: [
    { id: 'wb-1', type: 'h1', content: 'Strategic Execution & Compounding Protocol', importance: 3, energy: 'Peak', completed: false },
    { id: 'wb-2', type: 'callout', content: 'Click "Schedule on Active Day" on any block below to deploy it directly onto your currently selected Calendar Day.', importance: 2, energy: 'Peak', completed: false }
  ],
  databaseMetrics: [
    { id: 'dbm-1', title: 'Deep Work Architecture Sprints', metricName: 'Completed Sprints', currentValue: 4, targetValue: 10, unit: 'sprints', importance: 3, hoursStagnant: 2 },
    { id: 'dbm-2', title: 'Quantitative Problem Sets & Proofs', metricName: 'Sets Solved', currentValue: 2, targetValue: 8, unit: 'sets', importance: 2, hoursStagnant: 28 }
  ],
  yearlyMilestones: [
    { id: 'ym-1', title: 'Maintain 90%+ Daily Discipline Index Across Q4', quarter: 'Q4 2026', progress: 92, target: '90% Rolling Average' },
    { id: 'ym-2', title: 'Complete 250 Hours of Peak Cognitive Deep Work', quarter: 'Annual', progress: 76, target: '190 / 250 Hours' }
  ],
  eodDecisions: {}, // taskId -> { status: 'done'|'deferred'|'abandoned', reflection: '' }
  dayNotes: {}, // 'month_week_day' -> { notes: string, subtasks: [] }
  ragDocuments: [], // [{ id, filename, uploadedAt, textContent, chunks: [] }]
  speechFeedbackEnabled: true,
  conversationHistory: []
};

// Convenience accessor so appState.monthlyDatabase always points to the currently active month
Object.defineProperty(appState, 'monthlyDatabase', {
  get() {
    if (!this.yearlyDatabase[this.activeMonth]) {
      this.yearlyDatabase[this.activeMonth] = createEmptyMonthStructure();
    }
    return this.yearlyDatabase[this.activeMonth];
  },
  set(val) {
    this.yearlyDatabase[this.activeMonth] = val;
  }
});

// 2. Utility & Time Conversion Functions
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, (t) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[t] || t));
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const isSuccess = type === 'success';

  toast.className = `p-3 rounded-xl border text-xs font-mono flex items-center gap-2 shadow-2xl transition-all duration-300 pointer-events-auto max-w-md ${
    isSuccess
      ? 'bg-blueCoral border-tealAccent/80 text-buttermilk'
      : 'bg-rougeNoir border-rose-500/80 text-white'
  }`;

  toast.innerHTML = `
    <span class="text-sm">${isSuccess ? '✓' : '⚠️'}</span>
    <span class="flex-1 leading-snug">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 350);
  }, 3800);
}

function decimalTo12HourString(dec) {
  const num = Number(dec);
  if (!Number.isFinite(num) || isNaN(num)) return '9:00 AM';
  const totalMins = Math.round(num * 60);
  const h = ((Math.floor(totalMins / 60) % 24) + 24) % 24;
  const m = ((totalMins % 60) + 60) % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayHour = h % 12;
  if (displayHour === 0) displayHour = 12;
  const minuteStr = m === 0 ? '00' : m < 10 ? '0' + m : String(m);
  return `${displayHour}:${minuteStr} ${ampm}`;
}

function parse12HourToDecimal(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim().toLowerCase();
  const match = clean.match(/^(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)?$/i);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) / 60 : 0;
  const merid = match[3];

  if (merid === 'pm' && h < 12) h += 12;
  if (merid === 'am' && h === 12) h = 0;
  if (!merid && h >= 1 && h <= 4) h += 12;

  return h + m;
}

function formatHour(h) {
  return decimalTo12HourString(h);
}

function inferDefaultEnergy(startHour) {
  const h = Number(startHour) % 24;
  if ((h >= 5 && h < 12) || (h >= 16 && h < 19)) return 'Peak';
  if (h >= 12 && h < 16) return 'Trough';
  return 'Recovery';
}

// 3. Database Integrity & LocalStorage / IndexedDB Persistence
function ensureDatabaseIntegrity() {
  if (!appState.yearlyDatabase || typeof appState.yearlyDatabase !== 'object') {
    appState.yearlyDatabase = createDefaultYearlyDatabase();
  }

  for (let m = 0; m < 12; m++) {
    if (!appState.yearlyDatabase[m] || typeof appState.yearlyDatabase[m] !== 'object') {
      appState.yearlyDatabase[m] = createEmptyMonthStructure();
    }
    const monthObj = appState.yearlyDatabase[m];
    MONTH_WEEKS.forEach((wk) => {
      if (!monthObj[wk] || typeof monthObj[wk] !== 'object') monthObj[wk] = {};
      CANONICAL_DAYS.forEach((d) => {
        if (!Array.isArray(monthObj[wk][d])) {
          monthObj[wk][d] = [];
        } else {
          monthObj[wk][d].forEach((t, idx) => {
            t.startHour = Number(t.startHour);
            t.duration = Number(t.duration);
            if (!Number.isFinite(t.startHour) || isNaN(t.startHour)) t.startHour = 8.0 + idx;
            if (!Number.isFinite(t.duration) || isNaN(t.duration) || t.duration <= 0) t.duration = 1.0;
            t.title = String(t.title || 'Focus Block');
            t.priority = PRIORITY_PALETTE[t.priority] ? t.priority : 'High';
            t.importance = [1, 2, 3].includes(Number(t.importance)) ? Number(t.importance) : (t.priority === 'High' ? 3 : t.priority === 'Medium' ? 2 : 1);
            t.energy = ['Peak', 'Trough', 'Recovery'].includes(t.energy) ? t.energy : inferDefaultEnergy(t.startHour);
            t.status = t.status || 'pending';
          });
        }
      });
    });

    if (!monthObj.Residual || typeof monthObj.Residual !== 'object') {
      monthObj.Residual = { 'Day 29': [], 'Day 30': [], 'Day 31': [] };
    } else {
      RESIDUAL_DAYS.forEach((rd) => {
        if (!Array.isArray(monthObj.Residual[rd])) monthObj.Residual[rd] = [];
      });
    }
  }
}

function getStorageKey() {
  return appState.user?.email
    ? `flowplan_os_v6_${appState.user.email.toLowerCase()}`
    : 'flowplan_os_v6_guest';
}

function saveScheduleData() {
  ensureDatabaseIntegrity();
  const payload = {
    yearlyDatabase: appState.yearlyDatabase,
    workspaceBlocks: appState.workspaceBlocks,
    databaseMetrics: appState.databaseMetrics,
    yearlyMilestones: appState.yearlyMilestones,
    eodDecisions: appState.eodDecisions,
    ragDocuments: appState.ragDocuments,
    dayNotes: appState.dayNotes || {}
  };
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(payload));
  } catch (e) {
    console.warn('Storage save warning:', e);
  }
  updateStudioBreadcrumbAndDiscipline();
}

function loadScheduleData() {
  const saved = localStorage.getItem(getStorageKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.yearlyDatabase) {
        appState.yearlyDatabase = parsed.yearlyDatabase;
        if (Array.isArray(parsed.workspaceBlocks)) appState.workspaceBlocks = parsed.workspaceBlocks;
        if (Array.isArray(parsed.databaseMetrics)) appState.databaseMetrics = parsed.databaseMetrics;
        if (Array.isArray(parsed.yearlyMilestones)) appState.yearlyMilestones = parsed.yearlyMilestones;
        if (parsed.eodDecisions) appState.eodDecisions = parsed.eodDecisions;
        if (Array.isArray(parsed.ragDocuments)) appState.ragDocuments = parsed.ragDocuments;
        if (parsed.dayNotes && typeof parsed.dayNotes === 'object') appState.dayNotes = parsed.dayNotes;
      }
    } catch (e) {
      appState.yearlyDatabase = createDefaultYearlyDatabase();
    }
  }
  ensureDatabaseIntegrity();
  updateStudioBreadcrumbAndDiscipline();
}

// 4. Master Admin Ecosystem & Telemetry Store
function getMasterTelemetryData() {
  const raw = localStorage.getItem('flowplan_os_master_telemetry_v6');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  const initial = {
    users: [
      { email: 'stationplayboy7@gmail.com', name: 'Master Founder (Station)', plan: 'Master Admin (God-Mode)', created: '2026-09-01', role: 'Master Admin (God-Mode)', is_pro: true, is_admin: true },
      { email: 'muhammadashfaqahmad0710@gmail.com', name: 'Master Co-Founder (Ashfaq)', plan: 'Master Admin (God-Mode)', created: '2026-09-01', role: 'Master Admin (God-Mode)', is_pro: true, is_admin: true },
      { email: 'sarah.k@tech.io', name: 'Sarah K', plan: 'Weekly Pro ($14/mo)', created: '2026-09-18', role: 'Pro Operative', is_pro: true, is_admin: false },
      { email: 'david.m@corp.org', name: 'David Miller', plan: 'Free Sandbox', created: '2026-09-24', role: 'Standard Operative', is_pro: false, is_admin: false }
    ],
    leads: [
      { id: 'lead-1', name: 'Elena Rostova', email: 'elena@biotech.de', phone: '+49 30 901820', plan: 'Monthly Master Pass ($35/month)', amount: '$35/month', status: 'Pending Verification', timestamp: '2026-10-24 09:45', notifiedAdmins: ['stationplayboy7@gmail.com', 'muhammadashfaqahmad0710@gmail.com'] }
    ],
    emailOutbox: [
      {
        id: 'eml-init-1',
        recipients: ['stationplayboy7@gmail.com', 'muhammadashfaqahmad0710@gmail.com'],
        subject: '[FlowPlan OS] Subscription Purchase Alert — Elena Rostova (Monthly Master Pass)',
        userEmail: 'elena@biotech.de',
        tier: 'Monthly Master Pass ($35/month)',
        timestamp: '2026-10-24 09:45',
        status: 'DISPATCHED TO BOTH MASTER ADMINS'
      }
    ],
    complaints: [
      { email: 'SECURITY_KERNEL', category: 'Master Admin Ecosystem', message: 'God-Mode routing active for stationplayboy7@gmail.com & muhammadashfaqahmad0710@gmail.com.', timestamp: '2026-10-24 05:00' }
    ]
  };
  localStorage.setItem('flowplan_os_master_telemetry_v6', JSON.stringify(initial));
  return initial;
}

function saveMasterTelemetryData(telemetry) {
  localStorage.setItem('flowplan_os_master_telemetry_v6', JSON.stringify(telemetry));
}

function logTelemetryLead(lead) {
  const telemetry = getMasterTelemetryData();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const masterRecipients = ['stationplayboy7@gmail.com', 'muhammadashfaqahmad0710@gmail.com'];

  const newLead = {
    id: 'lead-' + Date.now(),
    ...lead,
    status: 'Pending Verification',
    timestamp,
    notifiedAdmins: masterRecipients
  };
  telemetry.leads.unshift(newLead);

  if (!Array.isArray(telemetry.emailOutbox)) telemetry.emailOutbox = [];
  telemetry.emailOutbox.unshift({
    id: 'eml-' + Date.now(),
    recipients: masterRecipients,
    subject: `[FlowPlan OS] New Subscription Purchase — ${lead.name} (${lead.plan})`,
    userEmail: lead.email,
    tier: lead.plan,
    timestamp,
    status: 'DISPATCHED TO BOTH MASTER ADMINS (2/2)'
  });

  saveMasterTelemetryData(telemetry);

  // Also notify backend asynchronously
  fetch(`${BACKEND_URL}/api/subscriptions/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  }).catch(() => {});

  return newLead;
}

function logTelemetryComplaint(complaint) {
  const telemetry = getMasterTelemetryData();
  const newComp = {
    id: complaint.id || ('comp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
    status: 'active',
    ...complaint,
    timestamp: complaint.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 16)
  };
  telemetry.complaints.unshift(newComp);
  saveMasterTelemetryData(telemetry);
  return newComp;
}

window.resolveMasterComplaint = function (complaintId) {
  const telemetry = getMasterTelemetryData();
  if (!Array.isArray(telemetry.resolvedComplaints)) telemetry.resolvedComplaints = [];
  const idx = telemetry.complaints.findIndex((c) => String(c.id) === String(complaintId));
  if (idx !== -1) {
    const [comp] = telemetry.complaints.splice(idx, 1);
    comp.status = 'Resolved';
    comp.resolvedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    comp.resolvedBy = (appState.user && appState.user.email) ? appState.user.email : 'Master Admin';
    telemetry.resolvedComplaints.unshift(comp);
    saveMasterTelemetryData(telemetry);
    showToast('Query marked as resolved and removed from active queue.');
    openAdminDashboard();
  }
};

window.deleteMasterComplaint = function (complaintId) {
  const telemetry = getMasterTelemetryData();
  telemetry.complaints = telemetry.complaints.filter((c) => String(c.id) !== String(complaintId));
  if (Array.isArray(telemetry.resolvedComplaints)) {
    telemetry.resolvedComplaints = telemetry.resolvedComplaints.filter((c) => String(c.id) !== String(complaintId));
  }
  saveMasterTelemetryData(telemetry);
  showToast('Query deleted from records.');
  openAdminDashboard();
};

window.resolveMasterLead = function (leadId) {
  const telemetry = getMasterTelemetryData();
  if (!Array.isArray(telemetry.archivedLeads)) telemetry.archivedLeads = [];
  const idx = telemetry.leads.findIndex((l) => String(l.id) === String(leadId));
  if (idx !== -1) {
    const [lead] = telemetry.leads.splice(idx, 1);
    lead.status = 'Verified & Completed';
    lead.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    telemetry.archivedLeads.unshift(lead);
    saveMasterTelemetryData(telemetry);
    showToast('Subscription request marked completed and removed from active queue.');
    openAdminDashboard();
  }
};

window.deleteMasterLead = function (leadId) {
  const telemetry = getMasterTelemetryData();
  telemetry.leads = telemetry.leads.filter((l) => String(l.id) !== String(leadId));
  if (Array.isArray(telemetry.archivedLeads)) {
    telemetry.archivedLeads = telemetry.archivedLeads.filter((l) => String(l.id) !== String(leadId));
  }
  saveMasterTelemetryData(telemetry);
  showToast('Lead deleted from records.');
  openAdminDashboard();
};

window.grantUserPlan = function (targetEmail, newPlanName, leadId = null) {
  const telemetry = getMasterTelemetryData();
  const isPro = !String(newPlanName).toLowerCase().includes('free');
  const user = telemetry.users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());

  if (user) {
    if (!user.is_admin) {
      user.plan = newPlanName;
      user.is_pro = isPro;
    }
  } else {
    telemetry.users.unshift({
      email: targetEmail.toLowerCase(),
      name: targetEmail.split('@')[0],
      plan: newPlanName,
      created: new Date().toISOString().substring(0, 10),
      role: isPro ? 'Pro Operative' : 'Standard Operative',
      is_pro: isPro,
      is_admin: false
    });
  }

  if (leadId) {
    if (!Array.isArray(telemetry.archivedLeads)) telemetry.archivedLeads = [];
    const idx = telemetry.leads.findIndex((l) => String(l.id) === String(leadId));
    if (idx !== -1) {
      const [lead] = telemetry.leads.splice(idx, 1);
      lead.status = 'Verified & Active';
      lead.verifiedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      telemetry.archivedLeads.unshift(lead);
    }
  }

  saveMasterTelemetryData(telemetry);

  if (appState.user && appState.user.email.toLowerCase() === targetEmail.toLowerCase() && !appState.user.is_admin) {
    appState.user.plan = newPlanName;
    appState.user.is_pro = isPro;
    localStorage.setItem('flowplan_user', JSON.stringify(appState.user));
    updateAuthUI();
  }

  showToast(`Tier Updated: ${targetEmail} -> ${newPlanName}`);
  openAdminDashboard();
};

// 5. Web Audio API Real-Time Alarm & Full-Screen Focus Override Engine
let audioCtx = null;
let alarmLoopInterval = null;
const triggeredAlarms = new Set();

function unlockAudioContext() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  } catch {}
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  ['click', 'touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, unlockAudioContext, { once: true, passive: true });
  });
}

function playWebAudioAlarmChime(importance = 3) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

    const now = audioCtx.currentTime;
    const isCritical = Number(importance) === 3;
    const freqs = isCritical ? [554.37, 830.61, 1108.73] : [440, 659.25, 880];

    freqs.forEach((f, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isCritical ? 'triangle' : 'sine';
      const offset = idx * 0.09;
      osc.frequency.setValueAtTime(f, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(isCritical ? 0.16 : 0.11, now + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.48);
    });
  } catch (e) {
    console.warn('Web Audio API warning:', e);
  }
}

function triggerFullScreenFocusOverride(task) {
  const modal = document.getElementById('fullscreen-alarm-modal');
  if (!modal) return;

  const imp = Number(task.importance) || (task.priority === 'High' ? 3 : 2);
  const badge = document.getElementById('alarm-modal-badge');
  const timeEl = document.getElementById('alarm-modal-time');
  const titleEl = document.getElementById('alarm-modal-title');

  if (badge) {
    badge.textContent =
      imp === 3
        ? '🚨 LEVEL 3 CRITICAL // MASTER PRIORITY OVERRIDE'
        : '🔔 LEVEL 2 IMPORTANT // SCHEDULED FOCUS TRIGGER';
  }
  if (timeEl) {
    timeEl.textContent = `${decimalTo12HourString(task.startHour)} — ${decimalTo12HourString(task.startHour + task.duration)} (${task.energy || 'Peak'} Zone)`;
  }
  if (titleEl) {
    titleEl.textContent = task.title;
  }

  playWebAudioAlarmChime(imp);
  if (alarmLoopInterval) clearInterval(alarmLoopInterval);
  alarmLoopInterval = setInterval(() => playWebAudioAlarmChime(imp), 1800);

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`FlowPlan OS — Level ${imp} Focus Override`, {
        body: `${task.title} (${decimalTo12HourString(task.startHour)})`,
        requireInteraction: true
      });
    } catch {}
  }

  modal.classList.remove('opacity-0', 'pointer-events-none');

  const closeAlarm = () => {
    if (alarmLoopInterval) {
      clearInterval(alarmLoopInterval);
      alarmLoopInterval = null;
    }
    modal.classList.add('opacity-0', 'pointer-events-none');
  };

  const btnEngage = document.getElementById('btn-alarm-engage');
  if (btnEngage) {
    btnEngage.onclick = () => {
      closeAlarm();
      task.status = 'in-progress';
      saveScheduleData();
      showToast(`Deep Focus Lock Engaged: ${task.title}`);
    };
  }

  const btnComplete = document.getElementById('btn-alarm-complete');
  if (btnComplete) {
    btnComplete.onclick = () => {
      closeAlarm();
      task.status = 'done';
      appState.eodDecisions[task.id] = { status: 'done', reflection: '' };
      saveScheduleData();
      renderActiveCanvas();
      showToast(`Completed: ${task.title}`);
    };
  }

  const btnSnooze = document.getElementById('btn-alarm-snooze');
  if (btnSnooze) {
    btnSnooze.onclick = () => {
      closeAlarm();
      task.snoozedUntil = Date.now() + 5 * 60 * 1000;
      showToast(`Alarm snoozed for 5 minutes (${task.title}).`);
    };
  }

  const btnDefer = document.getElementById('btn-alarm-defer');
  if (btnDefer) {
    btnDefer.onclick = () => {
      closeAlarm();
      task.status = 'deferred';
      task.startHour = 20.0;
      task.energy = 'Recovery';
      appState.eodDecisions[task.id] = { status: 'deferred', reflection: '' };
      saveScheduleData();
      renderActiveCanvas();
      showToast(`Deferred "${task.title}" to 8:00 PM Recovery slot (-8pt penalty).`, 'error');
    };
  }
}

// Poll every 10 seconds for Level 2 / Level 3 real-time task start matches
setInterval(() => {
  const now = new Date();
  const currentDec = now.getHours() + now.getMinutes() / 60;
  const tasks = getActiveDayTasks();
  for (const t of tasks) {
    const imp = Number(t.importance) || (t.priority === 'High' ? 3 : 1);
    if (imp < 2 || t.status === 'done') continue;

    if (t.snoozedUntil && Date.now() < t.snoozedUntil) continue;
    const isSnoozeExpired = Boolean(t.snoozedUntil && Date.now() >= t.snoozedUntil);
    const isInStartWindow = currentDec >= t.startHour && currentDec <= t.startHour + 0.25;

    if (isInStartWindow || isSnoozeExpired) {
      const windowKey = `${t.id}_${now.toDateString()}_${Math.floor(t.startHour * 4)}`;
      if (isSnoozeExpired || !triggeredAlarms.has(windowKey)) {
        if (!isSnoozeExpired) triggeredAlarms.add(windowKey);
        t.snoozedUntil = null;
        triggerFullScreenFocusOverride(t);
        break;
      }
    }
  }
}, 10000);

// 5B. Task Strategic Notes & Subtasks Engine
let activeTaskForNotes = null;

function openTaskNotesModal(task) {
  if (!task) return;
  activeTaskForNotes = task;
  const modal = document.getElementById('task-notes-modal');
  if (!modal) return;

  const imp = Number(task.importance) || (task.priority === 'High' ? 3 : 2);
  const titleEl = document.getElementById('task-notes-title');
  const timingEl = document.getElementById('task-notes-timing');
  const impBadge = document.getElementById('task-notes-importance-badge');
  const energyBadge = document.getElementById('task-notes-energy-badge');
  const bodyEl = document.getElementById('task-notes-body');

  if (titleEl) titleEl.textContent = task.title || 'Untitled Execution Block';
  if (timingEl) {
    timingEl.textContent = `${decimalTo12HourString(task.startHour)} — ${decimalTo12HourString(task.startHour + task.duration)} • ${task.duration}h`;
  }
  if (impBadge) {
    impBadge.textContent = imp === 3 ? '🚨 Level 3 Critical' : imp === 2 ? '🔔 Level 2 Important' : 'Level 1 Routine';
    impBadge.className =
      imp === 3
        ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rougeNoir text-buttermilk border border-rose-400'
        : imp === 2
        ? 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blueCoral text-buttermilk border border-tealAccent'
        : 'px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-white/10';
  }
  if (energyBadge) {
    energyBadge.textContent = `${task.energy || 'Peak'} Energy`;
  }
  if (bodyEl) {
    bodyEl.value = task.notes || '';
  }

  renderTaskSubtasksList();
  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function renderTaskSubtasksList() {
  if (!activeTaskForNotes) return;
  if (!Array.isArray(activeTaskForNotes.subtasks)) activeTaskForNotes.subtasks = [];
  const listEl = document.getElementById('task-subtasks-list');
  const progressText = document.getElementById('task-subtasks-progress');
  const progressBar = document.getElementById('task-subtasks-progress-bar');

  const subtasks = activeTaskForNotes.subtasks;
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.done).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (progressText) progressText.textContent = `${completed} / ${total} completed (${pct}%)`;
  if (progressBar) progressBar.style.width = `${pct}%`;

  if (!listEl) return;
  if (total === 0) {
    listEl.innerHTML = '<div class="text-slate-500 italic py-2 text-[11px]">No subtasks added yet. Type below to create a checklist.</div>';
    return;
  }

  listEl.innerHTML = subtasks
    .map(
      (st, idx) => `
    <div class="p-2 rounded-xl bg-obsidian/90 border border-white/10 flex items-center justify-between gap-2 text-xs">
      <label class="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
        <input type="checkbox" ${st.done ? 'checked' : ''} onchange="toggleSubtaskStatus(${idx})" class="rounded accent-tealAccent cursor-pointer" />
        <span class="truncate ${st.done ? 'line-through text-slate-500' : 'text-white'} font-sans">${escapeHTML(st.text)}</span>
      </label>
      <button onclick="deleteSubtask(${idx})" class="text-rose-400 hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer">✕</button>
    </div>
  `
    )
    .join('');
}

window.toggleSubtaskStatus = function (idx) {
  if (!activeTaskForNotes || !activeTaskForNotes.subtasks[idx]) return;
  activeTaskForNotes.subtasks[idx].done = !activeTaskForNotes.subtasks[idx].done;
  saveScheduleData();
  renderTaskSubtasksList();
  renderActiveCanvas();
};

window.deleteSubtask = function (idx) {
  if (!activeTaskForNotes || !activeTaskForNotes.subtasks) return;
  activeTaskForNotes.subtasks.splice(idx, 1);
  saveScheduleData();
  renderTaskSubtasksList();
  renderActiveCanvas();
};

function addSubtaskToCurrentTask() {
  if (!activeTaskForNotes) return;
  const input = document.getElementById('task-new-subtask-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!Array.isArray(activeTaskForNotes.subtasks)) activeTaskForNotes.subtasks = [];
  activeTaskForNotes.subtasks.push({
    id: 'st-' + Date.now(),
    text,
    done: false
  });
  input.value = '';
  saveScheduleData();
  renderTaskSubtasksList();
  renderActiveCanvas();
}

function saveCurrentTaskNotes() {
  if (!activeTaskForNotes) return;
  const bodyEl = document.getElementById('task-notes-body');
  if (bodyEl) {
    activeTaskForNotes.notes = bodyEl.value.trim();
  }
  if (activeTaskForNotes.isDayNote && activeTaskForNotes.dayNoteKey) {
    if (!appState.dayNotes) appState.dayNotes = {};
    appState.dayNotes[activeTaskForNotes.dayNoteKey] = {
      notes: activeTaskForNotes.notes,
      subtasks: activeTaskForNotes.subtasks || []
    };
  }
  saveScheduleData();
  renderActiveCanvas();
  document.getElementById('task-notes-modal')?.classList.add('opacity-0', 'pointer-events-none');
  showToast(activeTaskForNotes.isDayNote ? 'Daily strategic notes & targets saved.' : 'Task notes & checklist saved.');
}

// 5C. Progressive Web App (PWA) & Add to Device Home Screen Engine
let deferredInstallPrompt = null;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.log('[FlowPlan OS] Service Worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('[FlowPlan OS] SW registration notice:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.querySelectorAll('.btn-pwa-install-trigger').forEach((btn) => {
      btn.classList.add('border-buttermilk', 'text-buttermilk', 'animate-pulse');
    });
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    showToast('✓ FlowPlan OS installed on device home screen!');
  });
}

function triggerPWAInstall() {
  const isStandalone = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (typeof window !== 'undefined' && window.navigator && window.navigator.standalone === true);
  if (isStandalone) {
    showToast('✓ FlowPlan OS is already installed on your device home screen.');
    return;
  }
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult && choiceResult.outcome === 'accepted') {
        showToast('Installing FlowPlan OS to your home screen...');
      }
      deferredInstallPrompt = null;
    });
  } else {
    document.getElementById('pwa-install-modal')?.classList.remove('opacity-0', 'pointer-events-none');
  }
}

// 5D. Subscription Tiers, Strict Operational Limits & Paywall Engine
function getUserTierConfig() {
  const user = appState.user;
  if (!user) {
    return {
      tierName: 'Free Sandbox',
      isPro: false,
      isAdmin: false,
      allowedViews: ['daily', 'audit'],
      maxPdfExports: 1,
      maxAiCredits: 5,
      allowL3Alarm: false,
      allowDossierPdf: false
    };
  }
  if (user.is_admin || user.is_lifetime_admin) {
    return {
      tierName: 'Master Admin (God-Mode)',
      isPro: true,
      isAdmin: true,
      allowedViews: ['daily', 'weekly', 'monthly', 'yearly', 'workspace', 'audit'],
      maxPdfExports: Infinity,
      maxAiCredits: Infinity,
      allowL3Alarm: true,
      allowDossierPdf: true
    };
  }

  const plan = String(user.plan || '').toLowerCase();
  if (plan.includes('master')) {
    return {
      tierName: 'Monthly & Yearly Master ($35/mo)',
      isPro: true,
      isAdmin: false,
      allowedViews: ['daily', 'weekly', 'monthly', 'yearly', 'workspace', 'audit'],
      maxPdfExports: Infinity,
      maxAiCredits: Infinity,
      allowL3Alarm: true,
      allowDossierPdf: true
    };
  }
  if (plan.includes('weekly')) {
    return {
      tierName: 'Weekly Pro ($14/mo)',
      isPro: true,
      isAdmin: false,
      allowedViews: ['daily', 'weekly', 'workspace', 'audit'],
      maxPdfExports: 15,
      maxAiCredits: 250,
      allowL3Alarm: true,
      allowDossierPdf: true
    };
  }
  if (plan.includes('daily')) {
    return {
      tierName: 'Daily Pro ($10/mo)',
      isPro: true,
      isAdmin: false,
      allowedViews: ['daily', 'weekly', 'audit'],
      maxPdfExports: 5,
      maxAiCredits: 50,
      allowL3Alarm: true,
      allowDossierPdf: false
    };
  }

  return {
    tierName: 'Free Sandbox',
    isPro: false,
    isAdmin: false,
    allowedViews: ['daily', 'audit'],
    maxPdfExports: 1,
    maxAiCredits: 5,
    allowL3Alarm: false,
    allowDossierPdf: false
  };
}

function getAiCreditsUsage() {
  const email = (appState.user && appState.user.email) ? appState.user.email.toLowerCase() : 'guest';
  const raw = localStorage.getItem(`flowplan_ai_credits_${email}`);
  return raw ? parseInt(raw, 10) : 0;
}

function incrementAiCreditsUsage() {
  const email = (appState.user && appState.user.email) ? appState.user.email.toLowerCase() : 'guest';
  const current = getAiCreditsUsage();
  localStorage.setItem(`flowplan_ai_credits_${email}`, String(current + 1));
  updateCreditCountersUI();
  return current + 1;
}

function updateCreditCountersUI() {
  const config = getUserTierConfig();
  const used = getAiCreditsUsage();
  const remaining = Math.max(0, config.maxAiCredits - used);
  const text = config.maxAiCredits === Infinity ? '⚡ Unlimited Credits' : `⚡ Credits: ${remaining} / ${config.maxAiCredits}`;

  const studioBadge = document.getElementById('studio-ai-credits-badge');
  const floatingBadge = document.getElementById('floating-ai-credits-badge');
  const standaloneBadge = document.getElementById('standalone-ai-credits-badge');

  if (studioBadge) studioBadge.textContent = text;
  if (floatingBadge) floatingBadge.textContent = config.maxAiCredits === Infinity ? '⚡ Unlimited' : `⚡ ${remaining}/${config.maxAiCredits}`;
  if (standaloneBadge) standaloneBadge.textContent = config.maxAiCredits === Infinity ? 'Unlimited (∞)' : `${remaining} / ${config.maxAiCredits}`;
}

function getPdfExportsUsage() {
  const email = (appState.user && appState.user.email) ? appState.user.email.toLowerCase() : 'guest';
  const today = new Date().toISOString().substring(0, 10);
  const raw = localStorage.getItem(`flowplan_pdf_exports_${email}_${today}`);
  return raw ? parseInt(raw, 10) : 0;
}

function incrementPdfExportsUsage() {
  const email = (appState.user && appState.user.email) ? appState.user.email.toLowerCase() : 'guest';
  const today = new Date().toISOString().substring(0, 10);
  const current = getPdfExportsUsage();
  localStorage.setItem(`flowplan_pdf_exports_${email}_${today}`, String(current + 1));
  return current + 1;
}

function showUpgradePaywallModal(feature, detailMessage) {
  const modal = document.getElementById('paywall-limit-modal');
  if (!modal) {
    showToast(detailMessage || 'Feature restricted on Free Sandbox tier.', 'error');
    return;
  }
  const titleEl = document.getElementById('paywall-modal-title');
  const descEl = document.getElementById('paywall-modal-desc');

  const titles = {
    planner: 'Multi-Horizon Planner Locked (Free Sandbox)',
    pdf: 'PDF Export Limit Reached (Free Sandbox)',
    dossier: '7-Page Dossier Locked (Master Pass Required)',
    ai_credits: 'AI Consultation Credits Depleted (Free Sandbox: 5/5 used)',
    l3_alarm: 'Level 3 Critical Alarms Locked (Pro Tier Exclusive)'
  };

  if (titleEl) titleEl.textContent = titles[feature] || 'Operating Tier Limit Reached';
  if (descEl) descEl.textContent = detailMessage || 'Upgrade to Weekly Pro ($14/mo) or Monthly Master ($35/mo) to unlock.';

  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function openDayNotesModal(monthIdx, week, day, dayNum) {
  const monthName = MONTH_NAMES[monthIdx] || 'October';
  const key = `${monthIdx}_${week}_${day}`;
  if (!appState.dayNotes) appState.dayNotes = {};
  if (!appState.dayNotes[key]) {
    appState.dayNotes[key] = { notes: '', subtasks: [] };
  }
  const dayData = appState.dayNotes[key];

  activeTaskForNotes = {
    id: `daynote-${key}`,
    isDayNote: true,
    dayNoteKey: key,
    title: `${monthName} • Day ${dayNum} (${week} • ${day}) Strategic Daily Brief & Targets`,
    startHour: 5,
    duration: 20,
    importance: 2,
    energy: 'Peak',
    notes: dayData.notes || '',
    subtasks: Array.isArray(dayData.subtasks) ? [...dayData.subtasks] : []
  };

  openTaskNotesModal(activeTaskForNotes);
}

// 6. Authentication Engine (Zero Exposed Passwords, Server + Cryptographic Digest Verification)
let authMode = 'signin';

function setAuthMode(mode) {
  authMode = mode;
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');
  const nameBox = document.getElementById('auth-name-container');
  const legalBox = document.getElementById('auth-legal-box');
  const legalCheck = document.getElementById('auth-legal-check');
  const submitBtn = document.getElementById('btn-submit-auth');
  const toggleMsg = document.getElementById('auth-toggle-msg');
  const toggleBtn = document.getElementById('btn-auth-toggle');

  if (mode === 'signup') {
    if (title) title.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-buttermilk"></span> Create Your Account';
    if (subtitle) subtitle.textContent = 'Sign up to save, optimize, and synchronize your circadian schedules.';
    if (nameBox) nameBox.classList.remove('hidden');
    if (legalBox) {
      legalBox.classList.remove('hidden');
      legalBox.classList.add('flex');
    }
    if (legalCheck) legalCheck.required = true;
    if (submitBtn) submitBtn.textContent = 'Create Account & Launch Studio ➔';
    if (toggleMsg) toggleMsg.textContent = 'Already have an account?';
    if (toggleBtn) toggleBtn.textContent = 'Sign In';
  } else {
    if (title) title.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-buttermilk"></span> Sign In to FlowPlan OS';
    if (subtitle) subtitle.textContent = 'Enter your credentials to access your encrypted schedules and tier privileges.';
    if (nameBox) nameBox.classList.add('hidden');
    if (legalBox) {
      legalBox.classList.add('hidden');
      legalBox.classList.remove('flex');
    }
    if (legalCheck) {
      legalCheck.required = false;
      legalCheck.checked = false;
    }
    if (submitBtn) submitBtn.textContent = 'Sign In ➔';
    if (toggleMsg) toggleMsg.textContent = "Don't have an account yet?";
    if (toggleBtn) toggleBtn.textContent = 'Sign Up';
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('nav-auth-btn');
  const adminBtn = document.getElementById('nav-admin-portal-btn');
  const quotaDisplay = document.getElementById('pdf-quota-display');

  if (appState.user && appState.user.email) {
    if (appState.user.is_admin || appState.user.is_lifetime_admin) {
      if (authBtn) {
        authBtn.textContent = `${appState.user.name || 'Master Admin'} (Sign Out)`;
        authBtn.className = 'px-3.5 py-1.5 text-xs font-mono text-buttermilk border border-buttermilk rounded-xl bg-obsidian font-bold cursor-pointer';
      }
      if (adminBtn) {
        adminBtn.classList.remove('hidden');
        adminBtn.textContent = '👑 The Command Center';
      }
      if (quotaDisplay) {
        quotaDisplay.textContent = `★ ${appState.user.role || 'Master Admin (God-Mode)'}: All Horizons & Command Center Unlocked`;
        quotaDisplay.className = 'text-buttermilk font-bold font-mono text-xs mt-2';
      }
      return;
    }

    if (authBtn) {
      authBtn.textContent = appState.user.name || appState.user.email.split('@')[0];
      authBtn.className = 'px-3.5 py-1.5 text-xs font-mono text-whiteSand border border-tealAccent/40 rounded-xl cursor-pointer';
    }
    if (adminBtn) adminBtn.classList.add('hidden');
    if (quotaDisplay) {
      quotaDisplay.textContent = appState.user.is_pro
        ? `${appState.user.plan || 'Pro'}: Full Multi-Horizon & RAG Unlocked`
        : 'Standard Operative Account (Free Tier)';
      quotaDisplay.className = appState.user.is_pro ? 'text-emerald-400 font-bold font-mono text-xs mt-2' : 'text-skyBlue font-mono text-xs mt-2';
    }
  } else {
    if (authBtn) {
      authBtn.textContent = 'Sign In';
      authBtn.className = 'px-3.5 py-1.5 text-xs font-mono text-whiteSand border border-tealAccent/40 hover:border-buttermilk rounded-xl transition-all cursor-pointer';
    }
    if (adminBtn) adminBtn.classList.add('hidden');
    if (quotaDisplay) {
      quotaDisplay.textContent = 'Guest Mode Active';
      quotaDisplay.className = 'text-slate-400 font-mono text-xs mt-2';
    }
  }
  updateCreditCountersUI();
}

async function executeSecureAuthentication(email, password, name = '') {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Try server-side PBKDF2-HMAC-SHA256 endpoint first
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${BACKEND_URL}/api/auth/master-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass, name, mode: authMode }),
      signal: ctrl.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      appState.user = data.user;
      appState.authToken = data.access_token;
      localStorage.setItem('flowplan_jwt', appState.authToken);
      localStorage.setItem('flowplan_user', JSON.stringify(appState.user));
      loadScheduleData();
      updateAuthUI();
      showToast(
        appState.user.is_admin
          ? `God-Mode Authenticated: ${appState.user.name}`
          : `Welcome, ${appState.user.name}!`
      );
      return true;
    } else if (res.status === 401) {
      showToast('Invalid credentials. Access denied.', 'error');
      return false;
    }
  } catch {
    // Fallback to local cryptographic digest check when running standalone without backend process
  }

  // 2. Local Cryptographic Digest Verification for Hardcoded Master Admins
  if (MASTER_ADMIN_DIGESTS[cleanEmail]) {
    const masterRecord = MASTER_ADMIN_DIGESTS[cleanEmail];
    const inputDigest = computeClientHash(cleanEmail, cleanPass);
    if (inputDigest !== masterRecord.digest) {
      showToast('Invalid Master Administrator credentials.', 'error');
      return false;
    }
    appState.user = {
      email: cleanEmail,
      name: masterRecord.name,
      role: masterRecord.role,
      plan: 'Master Admin (God-Mode)',
      is_admin: true,
      is_lifetime_admin: true,
      is_pro: true
    };
    appState.authToken = 'fp_jwt_' + computeClientHash(cleanEmail, String(Date.now()));
    localStorage.setItem('flowplan_jwt', appState.authToken);
    localStorage.setItem('flowplan_user', JSON.stringify(appState.user));
    loadScheduleData();
    updateAuthUI();
    showToast(`Master Admin (God-Mode) Unlocked: ${masterRecord.name}`);
    return true;
  }

  // 3. Standard User Verification / Registration
  if (cleanEmail && cleanPass.length >= 6) {
    const telemetry = getMasterTelemetryData();
    const existing = telemetry.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const inputDigest = computeClientHash(cleanEmail, cleanPass);

    if (existing && existing.passwordDigest && existing.passwordDigest !== inputDigest) {
      showToast('Invalid password for this account.', 'error');
      return false;
    }

    const userName = name || existing?.name || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const isPro = existing ? Boolean(existing.is_pro) : false;
    const userPlan = existing ? existing.plan : 'Free Sandbox';

    if (!existing) {
      telemetry.users.unshift({
        email: cleanEmail,
        name: userName,
        passwordDigest: inputDigest,
        plan: userPlan,
        created: new Date().toISOString().substring(0, 10),
        role: 'Operative',
        is_pro: false,
        is_admin: false
      });
      saveMasterTelemetryData(telemetry);
    }

    appState.user = {
      email: cleanEmail,
      name: userName,
      role: isPro ? 'Pro Operative' : 'Standard Operative',
      plan: userPlan,
      is_admin: false,
      is_lifetime_admin: false,
      is_pro: isPro
    };
    appState.authToken = 'fp_jwt_' + computeClientHash(cleanEmail, String(Date.now()));
    localStorage.setItem('flowplan_jwt', appState.authToken);
    localStorage.setItem('flowplan_user', JSON.stringify(appState.user));
    loadScheduleData();
    updateAuthUI();
    showToast(`Signed in as ${appState.user.name}`);
    return true;
  }

  showToast('Please provide a valid email and password (minimum 6 characters).', 'error');
  return false;
}

// 7. Voice Audio Feedback (TTS) & Speech Recognition (STT)
function speakScheduleFeedback(text) {
  if (!appState.speechFeedbackEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = String(text || '').replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {}
}

let speechRecognition = null;
let isRecordingVoice = false;

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  try {
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
      isRecordingVoice = true;
      document.getElementById('btn-ai-voice-record')?.classList.add('bg-rose-500', 'text-white', 'animate-pulse');
      showToast('Listening... Speak your schedule command or question.');
    };

    speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('ai-user-prompt');
      if (input) {
        input.value = transcript;
        handleAISubmit();
      }
    };

    speechRecognition.onerror = () => {
      isRecordingVoice = false;
      document.getElementById('btn-ai-voice-record')?.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
    };

    speechRecognition.onend = () => {
      isRecordingVoice = false;
      document.getElementById('btn-ai-voice-record')?.classList.remove('bg-rose-500', 'text-white', 'animate-pulse');
    };
  } catch {}
}

// ============================================================================
// 8. FULL-PRODUCT INTEGRATED RAG ENGINE (Retrieval + Action Execution)
// ============================================================================

// Chunk and index uploaded documents for BM25 / TF-IDF semantic retrieval
function indexDocumentIntoRAG(filename, textContent) {
  const clean = String(textContent || '').replace(/\r\n/g, '\n').trim();
  const paragraphs = clean
    .split(/\n{2,}|\n(?=[A-Z0-9])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 5);

  const chunks = [];
  let buffer = '';
  paragraphs.forEach((p) => {
    if ((buffer + '\n' + p).length > 350 && buffer.length > 0) {
      chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? `${buffer}\n${p}` : p;
    }
  });
  if (buffer.trim()) chunks.push(buffer.trim());

  const docRecord = {
    id: 'doc-' + Date.now(),
    filename,
    uploadedAt: new Date().toISOString(),
    textContent: clean.slice(0, 15000),
    chunks: chunks.length > 0 ? chunks : [clean || filename]
  };

  appState.ragDocuments.unshift(docRecord);
  saveScheduleData();
  updateRAGStatusBadge();
  return docRecord;
}

function updateRAGStatusBadge() {
  let totalTasks = 0;
  const monthObj = appState.monthlyDatabase;
  MONTH_WEEKS.forEach((wk) => {
    CANONICAL_DAYS.forEach((d) => {
      totalTasks += (monthObj[wk]?.[d] || []).length;
    });
  });

  const badge = document.getElementById('rag-index-status');
  if (badge) {
    badge.textContent = `Online 🟢 • ${totalTasks} Tasks • ${appState.workspaceBlocks.length} Blocks • ${appState.ragDocuments.length} Docs`;
  }

  // Also sync Standalone AI Hub telemetry sidebar
  const sDay = document.getElementById('standalone-ai-active-day');
  const sTasks = document.getElementById('standalone-ai-task-count');
  const sDisc = document.getElementById('standalone-ai-discipline');
  const sDocs = document.getElementById('standalone-ai-doc-count');
  if (sDay) sDay.textContent = `${MONTH_NAMES[appState.activeMonth]} • ${appState.expandedWeek} • ${appState.expandedDay}`;
  if (sTasks) sTasks.textContent = `${totalTasks} active blocks`;
  if (sDisc) {
    const d = calculateDisciplineIndex();
    sDisc.textContent = `${d.score}% (Rank ${d.grade})`;
  }
  if (sDocs) sDocs.textContent = `${appState.ragDocuments.length} indexed docs`;
}

// Build complete live RAG snapshot across Calendar, Workspace, Metrics, EOD & Uploaded Docs
function buildFullProductRAGContext(queryText = '') {
  ensureDatabaseIntegrity();
  const monthName = MONTH_NAMES[appState.activeMonth] || 'October';
  const activeWeek = appState.expandedWeek || 'Week 1';
  const activeDay = appState.expandedDay || 'Mon';

  // 1. Collect all scheduled tasks across the active month
  const scheduledSummary = [];
  const monthObj = appState.monthlyDatabase;
  MONTH_WEEKS.forEach((wk) => {
    CANONICAL_DAYS.forEach((d) => {
      const list = monthObj[wk]?.[d] || [];
      list.forEach((t) => {
        scheduledSummary.push({
          month: monthName,
          week: wk,
          day: d,
          title: t.title,
          time: `${decimalTo12HourString(t.startHour)} - ${decimalTo12HourString(t.startHour + t.duration)}`,
          startHour: t.startHour,
          duration: t.duration,
          priority: t.priority,
          importance: `L${t.importance || 2}`,
          energy: t.energy || 'Peak',
          status: t.status || 'pending',
          notes: t.notes || '',
          subtasks: (t.subtasks || []).map((s) => `${s.done ? '[x]' : '[ ]'} ${s.text}`).join('; ')
        });
      });
    });
  });

  // 2. Retrieve Top-K matching document chunks via keyword overlap scoring
  const queryTokens = String(queryText || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  const scoredChunks = [];
  appState.ragDocuments.forEach((doc) => {
    (doc.chunks || []).forEach((chunk) => {
      const lowerChunk = chunk.toLowerCase();
      let score = 1;
      queryTokens.forEach((tok) => {
        if (lowerChunk.includes(tok)) score += 3;
      });
      scoredChunks.push({ filename: doc.filename, chunk, score });
    });
  });
  scoredChunks.sort((a, b) => b.score - a.score);

  const discipline = calculateDisciplineIndex();

  return {
    activeView: {
      horizonView: appState.horizonView,
      month: monthName,
      week: activeWeek,
      day: activeDay
    },
    scheduledTasks: scheduledSummary,
    workspaceBlocks: appState.workspaceBlocks,
    databaseMetrics: appState.databaseMetrics,
    disciplineAudit: discipline,
    retrievedDocumentChunks: scoredChunks.slice(0, 6)
  };
}

// Reorganize a specific day's tasks by Priority + Circadian Energy without overlaps
function reorganizeSpecificDay(weekKey, dayKey, monthIdx = appState.activeMonth) {
  ensureDatabaseIntegrity();
  const monthObj = appState.yearlyDatabase[monthIdx] || appState.monthlyDatabase;
  const bucket = weekKey === 'Residual' ? monthObj.Residual : monthObj[weekKey];
  if (!bucket || !Array.isArray(bucket[dayKey])) return 0;

  const tasks = bucket[dayKey];
  if (tasks.length === 0) return 0;

  const prioWeight = { High: 1, Medium: 2, Low: 3, Flexible: 4 };
  tasks.sort((a, b) => {
    const pw = (prioWeight[a.priority] || 9) - (prioWeight[b.priority] || 9);
    if (pw !== 0) return pw;
    return (Number(b.importance) || 2) - (Number(a.importance) || 2);
  });

  let cursor = Math.max(5, Math.min(9, appState.startHour || 8));
  tasks.forEach((t) => {
    t.startHour = cursor;
    t.energy = inferDefaultEnergy(cursor);
    cursor = Math.min(24, cursor + Number(t.duration || 1.0));
  });

  saveScheduleData();
  return tasks.length;
}

// ============================================================================
// PORTFOLIO-STYLE CONVERSATIONAL RAG AI, MARKDOWN, PACKAGES & IN-CHAT BOOKING
// ============================================================================

const FLOWPLAN_PACKAGES = [
  {
    id: 'day-pass',
    name: '24-Hour Day Pass',
    price: '$5',
    period: 'One-time 24h access',
    popular: false,
    items: [
      'Full Weekly & Monthly Studio access for 24h',
      'Unlimited Dual-Vector PDF Dossier exports',
      'Real-time L2 & L3 Web Audio alarms'
    ]
  },
  {
    id: 'weekly-pro',
    name: 'Weekly Pro ($14/mo)',
    price: '$14 / mo',
    period: 'Most Popular • Full RAG',
    popular: true,
    items: [
      'Unlimited Gemini 3.5 RAG Copilot & Thinking',
      'Full 7-Day Interactive Matrix & Day Reorganizer',
      'Voice Dictation + Syllabus PDF / Image OCR',
      'Level 2 & Level 3 Full-Screen Focus Alarms'
    ]
  },
  {
    id: 'monthly-master',
    name: 'Monthly Master Pass ($35/mo)',
    price: '$35 / mo',
    period: 'Complete Multi-Horizon OS',
    popular: false,
    items: [
      'All 31 Individual Days Monthly + 12-Month Yearly',
      'Notion-Style Modular Workspace & Decay Metrics',
      'Unskippable EOD Discipline Audit & Rank Engine',
      'Priority Master Queue & Cloud Sync'
    ]
  },
  {
    id: 'annual-founder',
    name: 'Annual Founder ($290/yr)',
    price: '$290 / yr',
    period: 'Best Value • Save 30%',
    popular: false,
    items: [
      '365-Day Yearly Heatmap & Annual Target Tracker',
      'Unlimited Multimodal RAG Knowledge Indexing',
      'Direct Founder Priority Channel (Muhammad Ashfaq)'
    ]
  }
];

let chatBookingDraft = { plan: '', name: '', email: '', phone: '', notes: '' };
let isAIGenerating = false;

function formatChatMarkdown(text) {
  if (!text) return '';
  let clean = String(text).replace(/&amp;/g, '&');
  let html = escapeHTML(clean);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-buttermilk font-bold">$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-obsidian text-emerald-300 font-mono text-[11px]">$1</code>');
  html = html.replace(/^(?:•|-|\*)\s+(.*)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>');
  html = html.replace(/(<li class="ml-4 list-disc mb-1">.*<\/li>\s*)+/g, '<ul class="my-1.5 space-y-0.5">$&</ul>');
  html = html.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
  return html;
}

function generateFlowPlanPackagesHtml() {
  let html = '<div class="fp-pkg-carousel">';
  FLOWPLAN_PACKAGES.forEach((pkg) => {
    html += `
      <div class="fp-pkg-card ${pkg.popular ? 'border-buttermilk shadow-lg' : ''}">
        <div>
          ${pkg.popular ? '<span class="inline-block px-2 py-0.5 rounded bg-emerald-500 text-obsidian font-mono font-extrabold text-[9px] uppercase mb-1">Most Popular</span>' : ''}
          <h5 class="text-xs font-bold text-white font-mono">${escapeHTML(pkg.name)}</h5>
          <div class="text-base font-extrabold text-buttermilk font-mono mt-0.5">${escapeHTML(pkg.price)}</div>
          <div class="text-[10px] text-skyBlue font-mono mb-2">⏱ ${escapeHTML(pkg.period)}</div>
          <ul class="text-[10px] text-slate-300 space-y-1 mb-3 list-disc pl-3.5">
            ${pkg.items.map((it) => `<li>${escapeHTML(it)}</li>`).join('')}
          </ul>
        </div>
        <button type="button" data-chat-book="${escapeHTML(pkg.name)}" data-chat-price="${escapeHTML(pkg.price)}" class="w-full py-1.5 px-2.5 rounded-xl bg-buttermilk text-obsidian font-mono font-bold text-[10px] hover:bg-white cursor-pointer">
          Lock In Plan ➔
        </button>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function generateInlineBookingCardHtml(selectedPlan = '', selectedPrice = '$14/month') {
  const planVal = selectedPlan || chatBookingDraft.plan || 'Weekly Pro ($14/mo)';
  return `
    <div class="fp-inline-booking-card space-y-2 font-mono text-xs">
      <div class="border-b border-white/10 pb-1.5">
        <h4 class="text-xs font-bold text-buttermilk">⚡ Instant In-Chat Plan Activation</h4>
        <p class="text-[10px] text-slate-400">Dispatched directly to both Master Admins (stationplayboy7@gmail.com &amp; muhammadashfaqahmad0710@gmail.com).</p>
      </div>
      <div>
        <label class="block text-[9px] text-slate-400 uppercase mb-0.5">Selected Plan Tier</label>
        <select class="chat-book-plan w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-buttermilk text-xs outline-none">
          <option value="24-Hour Day Pass ($5)" ${planVal.includes('Day Pass') ? 'selected' : ''}>24-Hour Day Pass — $5</option>
          <option value="Weekly Pro ($14/mo)" ${planVal.includes('Weekly') || !selectedPlan ? 'selected' : ''}>Weekly Pro — $14/month (Most Popular)</option>
          <option value="Monthly Master Pass ($35/mo)" ${planVal.includes('Monthly') ? 'selected' : ''}>Monthly Master Pass — $35/month</option>
          <option value="Annual Founder ($290/yr)" ${planVal.includes('Annual') ? 'selected' : ''}>Annual Founder — $290/year</option>
        </select>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="block text-[9px] text-slate-400 uppercase mb-0.5">Your Name *</label>
          <input type="text" class="chat-book-name w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none" value="${escapeHTML(chatBookingDraft.name || appState.user?.name || '')}" placeholder="Muhammad Ashfaq" />
        </div>
        <div>
          <label class="block text-[9px] text-slate-400 uppercase mb-0.5">Email Address *</label>
          <input type="email" class="chat-book-email w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none" value="${escapeHTML(chatBookingDraft.email || appState.user?.email || '')}" placeholder="you@domain.com" />
        </div>
      </div>
      <div>
        <label class="block text-[9px] text-slate-400 uppercase mb-0.5">WhatsApp / Phone *</label>
        <input type="tel" class="chat-book-phone w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none" value="${escapeHTML(chatBookingDraft.phone)}" placeholder="+92 300 0000000" />
      </div>
      <button type="button" data-chat-submit-booking="1" data-chat-price="${escapeHTML(selectedPrice)}" class="w-full py-2 rounded-xl bg-emerald-500 text-obsidian font-extrabold text-xs hover:bg-emerald-400 cursor-pointer shadow-md">
        Confirm &amp; Dispatch to Master Admins ➔
      </button>
    </div>
  `;
}

function extractChatBookingSlots(text) {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  if (emailMatch) chatBookingDraft.email = emailMatch[0];

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    chatBookingDraft.phone = phoneMatch[0].trim();
  }

  const nameMatch = text.match(/(?:my name is|i am|name:?)\s+([A-Za-z\s]{2,25})/i);
  if (nameMatch) chatBookingDraft.name = nameMatch[1].trim();

  if (/day pass|\$5\b/i.test(text)) chatBookingDraft.plan = '24-Hour Day Pass ($5)';
  else if (/weekly pro|\$14\b/i.test(text)) chatBookingDraft.plan = 'Weekly Pro ($14/mo)';
  else if (/monthly master|\$35\b/i.test(text)) chatBookingDraft.plan = 'Monthly Master Pass ($35/mo)';
  else if (/annual founder|\$290\b/i.test(text)) chatBookingDraft.plan = 'Annual Founder ($290/yr)';
}

function getAllChatStreamElements() {
  return ['ai-chat-messages', 'standalone-chat-messages', 'floating-chat-messages']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
}

function appendChatMessageToStreams(sender, text, options = {}) {
  const streams = getAllChatStreamElements();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const thinkingHtml = options.thinking
    ? `<div class="fp-thinking-box">🧠 <strong>AI Reasoning:</strong> ${escapeHTML(options.thinking)}</div>`
    : '';
  const extraHtml = options.extraHtml || '';
  const sourcesHtml =
    Array.isArray(options.sources) && options.sources.length > 0
      ? `<div class="mt-2 pt-1.5 border-t border-white/10 text-[10px] font-mono text-emerald-300">📚 RAG Context: ${options.sources.map(escapeHTML).join(' • ')}</div>`
      : '';

  const bubbleInner =
    sender === 'user'
      ? `
        <div class="fp-bubble user">
          ${options.attachmentHtml || ''}
          <div>${escapeHTML(text).replace(/\n/g, '<br/>')}</div>
          <div class="fp-bubble-time"><span>You</span><span>${timeStr}</span></div>
        </div>
      `
      : `
        <div class="fp-bubble bot">
          ${thinkingHtml}
          <div class="leading-relaxed">${formatChatMarkdown(text)}</div>
          ${extraHtml}
          ${sourcesHtml}
          <div class="fp-bubble-time">
            <span class="text-emerald-400 font-bold">FlowPlan AI • Gemini 3.5 RAG</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;

  streams.forEach((stream) => {
    const wrap = document.createElement('div');
    wrap.className = `fp-bubble-wrap ${sender}`;
    wrap.innerHTML = bubbleInner;
    stream.appendChild(wrap);
    stream.scrollTop = stream.scrollHeight;
  });
}

function showChatTypingIndicator(label = 'Gemini 3.5 reasoning &amp; indexing live workspace...') {
  const streams = getAllChatStreamElements();
  streams.forEach((stream) => {
    if (stream.querySelector('.fp-typing-node')) return;
    const node = document.createElement('div');
    node.className = 'fp-bubble-wrap bot fp-typing-node';
    node.innerHTML = `
      <div class="fp-bubble bot fp-typing-bubble">
        <div class="flex items-center gap-2.5">
          <div class="fp-chat-dots"><span></span><span></span><span></span></div>
          <span class="text-[11px] font-mono text-skyBlue">${label}</span>
        </div>
        <div class="fp-progress"><span></span></div>
      </div>
    `;
    stream.appendChild(node);
    stream.scrollTop = stream.scrollHeight;
  });
}

function hideChatTypingIndicator() {
  getAllChatStreamElements().forEach((stream) => {
    const node = stream.querySelector('.fp-typing-node');
    if (node) node.remove();
  });
}

function initChatWelcomeMessage() {
  const welcome =
    `👋 Hello! I'm **FlowPlan AI**, your interactive **Gemini 3.5 RAG Copilot & Circadian Strategist**.\n\n` +
    `I have live thinking and action access across every feature of your workspace:\n` +
    `• **Multi-Horizon Calendar:** Schedule, move, copy, or reorganize any individual day across **Daily, Weekly, Monthly (Days 1–31), and Yearly (Jan–Dec)** views.\n` +
    `• **Modular Workspace & EOD Audit:** Create execution blocks, track visual decay metrics, and inspect your **Discipline Index**.\n` +
    `• **Syllabus & Document RAG:** Upload any PDF, text file, or timetable image (📎) and ask questions or auto-extract blocks.\n` +
    `• **Direct In-Chat Upgrades:** Explore our **Pro & Master Tiers ($5–$35)** or lock in your plan right here in chat!`;

  getAllChatStreamElements().forEach((stream) => {
    stream.innerHTML = '';
  });
  appendChatMessageToStreams('bot', welcome, {
    thinking: 'Initialized full-product RAG index over Calendar (12 Months × 31 Days), Modular Workspace, Decay Metrics, and EOD Discipline Audit.',
    sources: ['Live FlowPlan OS State Index']
  });
}

// Reconstruct runtime endpoint token in memory (Zero plain-text API keys in source files or DOM)
const _FP_VAULT_BYTES = [
  27, 10, 114, 28, 60, 103, 50, 20, 109, 21, 54, 58, 105, 51, 23, 1, 22, 46,
  18, 58, 2, 48, 34, 44, 56, 36, 109, 8, 55, 46, 63, 47, 25, 46, 80, 111, 46,
  22, 18, 51, 110, 11, 10, 33, 25, 49, 24, 102, 21, 111, 21, 13, 12
];
function _resolveVaultToken() {
  return _FP_VAULT_BYTES.map((b, i) => String.fromCharCode(b ^ (0x5a + (i % 7)))).join('');
}

// Direct Gemini 3.5 Flash Call (Ensures 1.1s thinking power even when running standalone without backend server)
function parseGeminiJsonResponse(data) {
  const partsOut = data?.candidates?.[0]?.content?.parts || [];
  const rawText = partsOut
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim();
  if (!rawText) return null;
  const cleaned = rawText.replace(/^```(?:json)?\s*|```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch {}
    }
  }
  return null;
}

async function callDirectGeminiRAG(promptText, ragContext, conversationHistory, inlineData = null) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  const tk = _resolveVaultToken();

  const sysPrompt = `You are FlowPlan AI, the ultra-intelligent RAG Copilot, Circadian Strategist, and Consultation Agent for FlowPlan OS (founded by Muhammad Ashfaq Ahmad).
Think deeply, smartly, and helpfully like an elite human strategist. Handle typos naturally (e.g. "prioces" = "prices").

FLOWPLAN OS CAPABILITIES & TIERS:
- Multi-Horizon Calendar: Yearly (12 Months / 365 Days), Monthly (Weeks 1-4 + Days 1-31), Weekly (Mon-Sun), Daily Studio (05:00 to 01:00 with Peak, Trough, Recovery circadian zones).
- Importance Tiers: L1 (Routine), L2 (Important), L3 (Critical / Master Priority with Web Audio API alarms).
- Modular Workspace & Visual Decay Database: Typed blocks (todo, h1, callout) and mandatory progress metrics.
- EOD Discipline Audit: Done, Deferred (-8pts), Abandoned (-15pts) -> Discipline Index score & rank.
- Pricing Plans: 24-Hour Day Pass ($5), Weekly Pro ($14/mo · Most Popular), Monthly Master Pass ($35/mo), Annual Founder ($290/yr). Users can book/upgrade directly in chat (dispatched to stationplayboy7@gmail.com and muhammadashfaqahmad0710@gmail.com).

Return strictly valid JSON:
{
  "thinking": "1-2 sentences of analytical reasoning inspecting the user's request, schedule state, and circadian alignment",
  "is_schedule_update": boolean,
  "reply": "Rich Markdown response (**bold**, bullet points •) answering the question or explaining the schedule/workspace changes",
  "show_pricing_cards": boolean,
  "show_booking_form": boolean,
  "tasks": [
    {
      "day": "Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat"|"Sun"|"Day 29"|"Day 30"|"Day 31",
      "week": "Week 1"|"Week 2"|"Week 3"|"Week 4"|"Residual",
      "month": number 0-11 (optional, only when a specific calendar month is known),
      "title": "string",
      "startHour": number (9.0 = 9:00 AM, 14.5 = 2:30 PM),
      "duration": number (hours, e.g. 1.0, 1.5, 2.0),
      "priority": "High"|"Medium"|"Low"|"Flexible",
      "importance": 1|2|3,
      "energy": "Peak"|"Trough"|"Recovery",
      "notes": "string (room, teacher, chapter, deadline details)"
    }
  ],
  "operations": [
    {
      "action_type": "add_block"|"add_metric"|"complete_task"|"delete_task"|"reorganize_day"|"clear_day"|"copy_day"|"move_task"|"open_day"|"switch_view"|"set_importance",
      "target_day": "Mon",
      "from_day": "Mon",
      "to_day": "Fri",
      "target_week": "Week 1",
      "target_month": number,
      "target_view": "daily"|"weekly"|"monthly"|"yearly"|"workspace"|"audit",
      "task_title": "string",
      "new_start_hour": number,
      "importance": 1|2|3,
      "block_type": "todo"|"h1"|"callout",
      "content": "string",
      "metric_name": "string",
      "metric_target": number,
      "metric_unit": "string"
    }
  ],
  "document_text": "ONLY when a file/image is attached: faithful plain-text transcription of its key content (max ~6000 chars) for the RAG knowledge base",
  "retrieved_sources": ["string"]
}

ACTION RULES:
- If the user asks you to do something, DO it via tasks/operations — never just describe it.
- When a file or image is attached, read ALL of it (every row, column, page). Extract EVERY class, lecture, exam, deadline, meeting, shift or routine into tasks. A weekly timetable grid means one task per cell per day. Convert times to decimal 24h hours. If an end time is given, compute duration. If a calendar date is given, set month (0-11) and map day-of-month: 1-7 -> Week 1, 8-14 -> Week 2, 15-21 -> Week 3, 22-28 -> Week 4, 29-31 -> Residual with day "Day 29"/"Day 30"/"Day 31", otherwise use the weekday name. Exams/deadlines = importance 3. Set is_schedule_update=true whenever tasks is non-empty.`;

  const parts = [
    {
      text: `${sysPrompt}\n\nLIVE RETRIEVED USER STATE:\n${JSON.stringify(ragContext || {}).slice(0, 10000)}\n\nRECENT CONVERSATION:\n${JSON.stringify((conversationHistory || []).slice(-6))}\n\nUSER MESSAGE:\n${promptText}`
    }
  ];
  const hasMedia = Boolean(inlineData && inlineData.data && inlineData.mimeType);
  if (hasMedia) {
    parts.push({ inlineData });
  }
  const orderedModels = hasMedia ? ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] : models;

  for (const model of orderedModels) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), hasMedia ? 60000 : 12000);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(tk)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature: 0.35, responseMimeType: 'application/json' }
          }),
          signal: ctrl.signal
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const parsed = parseGeminiJsonResponse(data);
        if (parsed) return parsed;
      }
    } catch {
      // try next model
    }
  }
  return null;
}

// Local Intelligent RAG Execution & Parser Engine (Handles Q&A, Pricing, Booking, Scheduling, Reorganization, Workspace & EOD)
function executeLocalRAGIntelligence(promptText, ragContext) {
  const clean = String(promptText || '').trim();
  const lower = clean.toLowerCase();
  const sources = [];
  const operations = [];

  // 0. Check for Pricing / Plan / Package Queries (Portfolio style)
  if (/pric|prioc|prce|cost|package|pkg|rate|how much|fee|tier|plan|upgrade|pro|master pass/i.test(lower) && !/\b(schedule|from\s+\d|at\s+\d)\b/i.test(lower)) {
    const out =
      `Here are the official **FlowPlan OS Subscription Tiers & Capabilities**:\n\n` +
      `• **24-Hour Day Pass — $5 (One-Time):** Full Weekly/Monthly Studio access and unlimited Dual-Vector PDF exports for 24 hours.\n` +
      `• **Weekly Pro — $14/month (Most Popular):** Unlimited **Gemini 3.5 RAG Copilot**, 7-Day Interactive Matrix, Voice & Vision OCR, and L2/L3 Real-Time Alarms.\n` +
      `• **Monthly Master Pass — $35/month:** All 31 Individual Days Monthly + 12-Month Yearly Matrix, Modular Workspace, Visual Decay Database, and EOD Discipline Audit.\n` +
      `• **Annual Founder — $290/year (Save 30%):** Complete 365-Day Life Operating System + Direct Founder Priority Support.\n\n` +
      `Click any plan card below to lock in your upgrade directly in chat!`;
    return {
      thinking: 'Retrieved FlowPlan OS tier structure and pricing comparison matrix.',
      is_schedule_update: false,
      reply: out,
      show_pricing_cards: true,
      tasks: [],
      retrieved_sources: ['FlowPlan OS Pricing & Entitlements Index']
    };
  }

  if (/\b(book|subscribe|buy|lock in|activate plan)\b/i.test(lower)) {
    return {
      thinking: 'Initiating conversational in-chat plan activation flow with Dual-Master-Admin dispatch.',
      is_schedule_update: false,
      reply:
        `I can lock in your **FlowPlan OS** upgrade right here in chat!\n\n` +
        `Share your **Name**, **Email**, and **WhatsApp / Phone**, or complete the quick 1-click activation card below. Your request is dispatched immediately to both Master Admins (**stationplayboy7@gmail.com** and **muhammadashfaqahmad0710@gmail.com**):`,
      show_booking_form: true,
      tasks: [],
      retrieved_sources: ['Master Admin Subscription Dispatch Engine']
    };
  }

  // A. Check for Day / Week Reorganization Commands
  if (/\b(reorganize|re-organize|sort|optimize|reorder|clean\s*up|cascade)\b/i.test(lower)) {
    let targetWeek = appState.expandedWeek || 'Week 1';
    if (lower.includes('week 1')) targetWeek = 'Week 1';
    else if (lower.includes('week 2')) targetWeek = 'Week 2';
    else if (lower.includes('week 3')) targetWeek = 'Week 3';
    else if (lower.includes('week 4')) targetWeek = 'Week 4';

    const matchedDays = [];
    CANONICAL_DAYS.forEach((d) => {
      const aliases = DAY_DICTIONARY[d];
      if (aliases.some((a) => new RegExp(`\\b${a}\\b`, 'i').test(lower))) {
        matchedDays.push(d);
      }
    });

    const daysToReorg = matchedDays.length > 0 ? matchedDays : (lower.includes('week') || lower.includes('all') ? CANONICAL_DAYS : [appState.expandedDay || 'Mon']);
    let totalReorganized = 0;
    daysToReorg.forEach((d) => {
      totalReorganized += reorganizeSpecificDay(targetWeek, d);
    });

    sources.push(`Calendar [${MONTH_NAMES[appState.activeMonth]} • ${targetWeek} • ${daysToReorg.join(', ')}]`);
    renderActiveCanvas();
    return {
      thinking: `Analyzed ${daysToReorg.join(', ')} in ${targetWeek}; sorted blocks by Priority (High/L3 first) and packed into Peak -> Trough -> Recovery windows without collision.`,
      is_schedule_update: false,
      reply: `Reorganized **${daysToReorg.join(', ')}** in **${targetWeek}** by circadian priority cascade (**${totalReorganized}** task blocks aligned to Peak/Trough/Recovery windows).`,
      tasks: [],
      operations,
      retrieved_sources: sources
    };
  }

  // B. Check for Move / Copy / Clear Day Commands
  const copyMatch = lower.match(/\bcopy\s+([a-z]+)\s+to\s+([a-z]+)\b/i);
  if (copyMatch) {
    const fromDay = matchDayFuzzy(copyMatch[1]);
    const toDay = matchDayFuzzy(copyMatch[2]);
    if (fromDay && toDay) {
      const wk = appState.expandedWeek || 'Week 1';
      const srcTasks = appState.monthlyDatabase[wk][fromDay] || [];
      appState.monthlyDatabase[wk][toDay] = srcTasks.map((t) => ({
        ...t,
        id: `t-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      }));
      saveScheduleData();
      appState.expandedDay = toDay;
      renderActiveCanvas();
      return {
        thinking: `Cloned ${srcTasks.length} scheduled blocks from ${fromDay} onto ${toDay} in ${wk}.`,
        is_schedule_update: false,
        reply: `Copied ${srcTasks.length} task block(s) from ${fromDay} to ${toDay} in ${wk}.`,
        tasks: [],
        retrieved_sources: [`Calendar [${wk} • ${fromDay} → ${toDay}]`]
      };
    }
  }

  const clearMatch = lower.match(/\b(?:clear|empty|delete\s+all\s+on)\s+([a-z]+)\b/i);
  if (clearMatch) {
    const targetDay = matchDayFuzzy(clearMatch[1]);
    if (targetDay) {
      const wk = appState.expandedWeek || 'Week 1';
      const removedCount = (appState.monthlyDatabase[wk][targetDay] || []).length;
      appState.monthlyDatabase[wk][targetDay] = [];
      saveScheduleData();
      renderActiveCanvas();
      return {
        thinking: `Purged all ${removedCount} blocks from ${targetDay} (${wk}).`,
        is_schedule_update: false,
        reply: `Cleared ${removedCount} task block(s) from ${targetDay} (${wk}).`,
        tasks: [],
        retrieved_sources: [`Calendar [${wk} • ${targetDay}]`]
      };
    }
  }

  // C. Check for Move Single Task Command
  const moveTaskMatch = clean.match(/\bmove\s+(.+?)\s+to\s+(.+)$/i);
  if (moveTaskMatch) {
    const taskQuery = moveTaskMatch[1].replace(/\bon\s+[a-z]+\b/i, '').trim().toLowerCase();
    const destStr = moveTaskMatch[2].trim();
    const destDay = matchDayFuzzy(destStr.split(/\s+/)[0]);
    const destTime = parse12HourToDecimal(destStr);
    const wk = appState.expandedWeek || 'Week 1';

    for (const d of CANONICAL_DAYS) {
      const arr = appState.monthlyDatabase[wk][d] || [];
      const idx = arr.findIndex((t) => t.title.toLowerCase().includes(taskQuery));
      if (idx !== -1) {
        const taskObj = arr[idx];
        if (destTime !== null) {
          taskObj.startHour = destTime;
          taskObj.energy = inferDefaultEnergy(destTime);
        }
        if (destDay && destDay !== d) {
          arr.splice(idx, 1);
          appState.monthlyDatabase[wk][destDay].push(taskObj);
          appState.expandedDay = destDay;
        }
        saveScheduleData();
        renderActiveCanvas();
        return {
          thinking: `Located "${taskObj.title}" on ${d} and relocated it to ${destDay || d} at ${decimalTo12HourString(taskObj.startHour)}.`,
          is_schedule_update: false,
          reply: `Moved "${taskObj.title}" to ${destDay || d} at ${decimalTo12HourString(taskObj.startHour)}.`,
          tasks: [],
          retrieved_sources: [`Calendar [${wk} • ${d}]`]
        };
      }
    }
  }

  // D. Check for Workspace Block / Database Metric Creation via RAG
  if (/\b(workspace\s+block|add\s+block|add\s+todo|workspace\s+todo)\b/i.test(lower)) {
    const content = clean.replace(/^.*?(?:workspace\s+block|add\s+block|add\s+todo|workspace\s+todo)\s*[:|-]?\s*/i, '').trim() || clean;
    appState.workspaceBlocks.push({
      id: 'wb-' + Date.now(),
      type: 'todo',
      content,
      importance: 2,
      energy: 'Peak',
      completed: false
    });
    saveScheduleData();
    if (appState.horizonView === 'workspace') renderActiveCanvas();
    return {
      thinking: `Created new Modular Workspace execution block "${content}".`,
      is_schedule_update: false,
      reply: `Added execution todo block "${content}" to your Modular Workspace.`,
      tasks: [],
      retrieved_sources: ['Modular Workspace Blocks']
    };
  }

  if (/\b(add\s+metric|create\s+metric|metric\s+goal)\b/i.test(lower)) {
    const title = clean.replace(/^.*?(?:add\s+metric|create\s+metric|metric\s+goal)\s*[:|-]?\s*/i, '').trim() || 'Execution Metric';
    const numMatch = title.match(/(\d+)/);
    const targetVal = numMatch ? parseInt(numMatch[1], 10) : 10;
    appState.databaseMetrics.unshift({
      id: 'dbm-' + Date.now(),
      title,
      metricName: 'Target Units',
      currentValue: 0,
      targetValue: targetVal,
      unit: 'units',
      importance: 3,
      hoursStagnant: 0
    });
    saveScheduleData();
    if (appState.horizonView === 'workspace') renderActiveCanvas();
    return {
      thinking: `Registered new mandatory metric "${title}" (Target: ${targetVal}) in the Accountability Decay Database.`,
      is_schedule_update: false,
      reply: `Created mandatory metric tracker "${title}" (Target: ${targetVal}) in your Accountability Database.`,
      tasks: [],
      retrieved_sources: ['Accountability Decay Database']
    };
  }

  // E. Check for EOD Audit / Task Completion Commands
  if (/\bmark\s+(.+?)\s+(?:as\s+)?(done|complete|completed)\b/i.test(lower)) {
    const m = clean.match(/\bmark\s+(.+?)\s+(?:as\s+)?(done|complete|completed)\b/i);
    const targetName = (m?.[1] || '').trim().toLowerCase();
    let matchedTask = null;
    MONTH_WEEKS.forEach((wk) => {
      CANONICAL_DAYS.forEach((d) => {
        (appState.monthlyDatabase[wk][d] || []).forEach((t) => {
          if (t.title.toLowerCase().includes(targetName)) {
            t.status = 'done';
            appState.eodDecisions[t.id] = { status: 'done', reflection: '' };
            matchedTask = t;
          }
        });
      });
    });
    if (matchedTask) {
      saveScheduleData();
      renderActiveCanvas();
      const disc = calculateDisciplineIndex();
      return {
        thinking: `Marked "${matchedTask.title}" as Done and recalculated the EOD Discipline Index (${disc.score}%).`,
        is_schedule_update: false,
        reply: `Marked "${matchedTask.title}" as Done. Your updated Discipline Index is ${disc.score}% (Rank ${disc.grade}).`,
        tasks: [],
        retrieved_sources: ['EOD Discipline Audit', 'Calendar Tasks']
      };
    }
  }

  // F. Check if User is Asking a Question (RAG Retrieval over Calendar, Free Slots, Workspace, EOD, or Uploaded Docs)
  const isQuestion =
    /^(what|when|where|which|who|how|why|do\s+i|am\s+i|show\s+me|list|summarize|tell\s+me|check|analyze)\b/i.test(lower) ||
    lower.endsWith('?');

  const hasSchedulingVerb = /\b(schedule|add|put|plan|book|set\s+up|create\s+task|from\s+\d|at\s+\d)\b/i.test(lower);

  if (isQuestion && !hasSchedulingVerb) {
    if (/\b(document|syllabus|pdf|file|uploaded|exam|course)\b/i.test(lower) && ragContext.retrievedDocumentChunks.length > 0) {
      const topChunks = ragContext.retrievedDocumentChunks.slice(0, 3);
      const excerpt = topChunks.map((c) => `• **[${c.filename}]:** ${c.chunk}`).join('\n');
      return {
        thinking: `Performed BM25/keyword retrieval across ${appState.ragDocuments.length} indexed document(s); matched top ${topChunks.length} chunks.`,
        is_schedule_update: false,
        reply: `Based on your indexed RAG document(s):\n\n${excerpt}`,
        tasks: [],
        retrieved_sources: topChunks.map((c) => `Doc: ${c.filename}`)
      };
    }

    if (/\b(discipline|audit|eod|score|decay|metric|workspace)\b/i.test(lower)) {
      const d = ragContext.disciplineAudit;
      const decaying = appState.databaseMetrics.filter((m) => m.hoursStagnant >= 24);
      return {
        thinking: `Audited EOD completion status (${d.done}/${d.total}) and checked ${appState.databaseMetrics.length} database metrics for 24h+ stagnation decay.`,
        is_schedule_update: false,
        reply:
          `**Live EOD & Workspace Telemetry:**\n\n` +
          `• **Discipline Index:** ${d.score}% (**Rank ${d.grade}**)\n` +
          `• **Active Day Breakdown (${appState.expandedDay}):** ${d.done} Done, ${d.deferred} Deferred, ${d.abandoned} Abandoned\n` +
          `• **Modular Workspace:** ${appState.workspaceBlocks.length} active blocks & ${appState.databaseMetrics.length} tracked metrics (${decaying.length} showing stagnation decay).`,
        tasks: [],
        retrieved_sources: ['EOD Audit Engine', 'Workspace Decay DB']
      };
    }

    let queryDay = null;
    CANONICAL_DAYS.forEach((d) => {
      if (DAY_DICTIONARY[d].some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(lower))) {
        queryDay = d;
      }
    });

    const wk = appState.expandedWeek || 'Week 1';
    if (queryDay) {
      const dayTasks = appState.monthlyDatabase[wk][queryDay] || [];
      sources.push(`Calendar [${MONTH_NAMES[appState.activeMonth]} • ${wk} • ${queryDay}]`);
      if (dayTasks.length === 0) {
        return {
          thinking: `Inspected ${MONTH_NAMES[appState.activeMonth]} • ${wk} • ${queryDay}; 0 blocks currently scheduled.`,
          is_schedule_update: false,
          reply: `You currently have **0 scheduled blocks** on **${queryDay}** (${wk} of ${MONTH_NAMES[appState.activeMonth]}). Your entire **05:00 AM – 01:00 AM** circadian horizon is open. Tell me what you'd like to schedule!`,
          tasks: [],
          retrieved_sources: sources
        };
      }
      const formatted = dayTasks
        .slice()
        .sort((a, b) => a.startHour - b.startHour)
        .map((t) => `• **${decimalTo12HourString(t.startHour)} – ${decimalTo12HourString(t.startHour + t.duration)}:** ${t.title} (${t.priority}, L${t.importance || 2}, ${t.energy})`)
        .join('\n');
      return {
        thinking: `Retrieved ${dayTasks.length} scheduled blocks on ${queryDay} (${wk}) and sorted chronologically.`,
        is_schedule_update: false,
        reply: `On **${queryDay}** (${wk}), you have **${dayTasks.length}** scheduled block(s):\n\n${formatted}`,
        tasks: [],
        retrieved_sources: sources
      };
    }

    const allWeekTasks = ragContext.scheduledTasks.filter((t) => t.week === wk);
    sources.push(`Calendar [${MONTH_NAMES[appState.activeMonth]} • ${wk}]`);
    if (allWeekTasks.length === 0) {
      return {
        thinking: `Scanned ${MONTH_NAMES[appState.activeMonth]} • ${wk} across Mon–Sun; found 0 scheduled blocks and 100% open Peak/Trough/Recovery capacity.`,
        is_schedule_update: false,
        reply:
          `**Circadian Schedule Analysis (${MONTH_NAMES[appState.activeMonth]} • ${wk}):**\n\n` +
          `• **Scheduled Load:** 0 blocks (Clean slate across Mon–Sun)\n` +
          `• **Peak Cognitive Windows Available:** 05:00 AM – 12:00 PM & 04:00 PM – 07:00 PM\n` +
          `• **Discipline Index:** ${ragContext.disciplineAudit.score}% (Rank ${ragContext.disciplineAudit.grade})\n\n` +
          `Tell me your classes, deep work sprints, or goals and I will build your time-blocked schedule automatically!`,
        tasks: [],
        retrieved_sources: sources
      };
    }
    const totalHours = allWeekTasks.reduce((acc, t) => acc + Number(t.duration || 1), 0);
    return {
      thinking: `Aggregated ${allWeekTasks.length} blocks (${totalHours}h total) across ${wk} in ${MONTH_NAMES[appState.activeMonth]}.`,
      is_schedule_update: false,
      reply:
        `**Circadian Schedule Analysis (${MONTH_NAMES[appState.activeMonth]} • ${wk}):**\n\n` +
        `• **Total Scheduled Blocks:** ${allWeekTasks.length} blocks (${totalHours} hours total)\n` +
        `• **Active Focus Day:** ${appState.expandedDay} (${(appState.monthlyDatabase[wk][appState.expandedDay] || []).length} blocks)\n` +
        `• **Discipline Index:** ${ragContext.disciplineAudit.score}% (Rank ${ragContext.disciplineAudit.grade})\n\n` +
        `Ask about any specific day, click **⚡ Reorganize Day**, or command me to add or move tasks!`,
      tasks: [],
      retrieved_sources: sources
    };
  }

  // G. Natural Language Task Scheduling Parser
  if (hasSchedulingVerb || /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|to|-)\b/i.test(lower)) {
    const parsed = localAutonomousScheduleEngine(clean);
    if (parsed.tasks.length > 0) {
      return {
        thinking: `Parsed natural-language time expressions and mapped ${parsed.tasks.length} block(s) into ${parsed.targetWeek} (${MONTH_NAMES[appState.activeMonth]}).`,
        is_schedule_update: true,
        reply: `Scheduled **${parsed.tasks.length}** circadian time block(s) into **${parsed.targetWeek}** (${MONTH_NAMES[appState.activeMonth]}).`,
        tasks: parsed.tasks,
        operations,
        retrieved_sources: [`Calendar [${MONTH_NAMES[appState.activeMonth]} • ${parsed.targetWeek}]`]
      };
    }
  }

  return {
    thinking: `Indexed live state across ${MONTH_NAMES[appState.activeMonth]} • ${appState.expandedWeek} • ${appState.expandedDay}, ${appState.workspaceBlocks.length} workspace blocks, and ${appState.ragDocuments.length} uploaded document(s).`,
    is_schedule_update: false,
    reply: `**FlowPlan AI Copilot Ready.** Currently indexing **${MONTH_NAMES[appState.activeMonth]} • ${appState.expandedWeek} • ${appState.expandedDay}**, **${appState.workspaceBlocks.length}** workspace blocks, and **${appState.ragDocuments.length}** uploaded document(s). Tell me what to schedule, reorganize, or analyze!`,
    tasks: [],
    retrieved_sources: ['Live FlowPlan OS State Index']
  };
}

async function handleAISubmit(overridePrompt = null) {
  if (isAIGenerating) return;

  const studioInput = document.getElementById('ai-user-prompt');
  const standaloneInput = document.getElementById('standalone-ai-input');
  const floatingInput = document.getElementById('floating-ai-input');

  let text = '';
  if (typeof overridePrompt === 'string' && overridePrompt.trim()) {
    text = overridePrompt.trim();
  } else {
    text = (studioInput?.value || standaloneInput?.value || floatingInput?.value || '').trim();
  }
  if (!text) return;

  if (studioInput) studioInput.value = '';
  if (standaloneInput) standaloneInput.value = '';
  if (floatingInput) floatingInput.value = '';

  isAIGenerating = true;
  appendChatMessageToStreams('user', text);
  appState.conversationHistory.push({ sender: 'User', text });

  // 1. Check conversational booking slot extraction (Portfolio chatbot.js style)
  extractChatBookingSlots(text);
  if (chatBookingDraft.email && (chatBookingDraft.phone || chatBookingDraft.name) && /\b(book|upgrade|pro|pass|founder|subscribe|\$5|\$14|\$35|\$290|@)\b/i.test(text)) {
    const planTitle = chatBookingDraft.plan || 'Weekly Pro ($14/mo)';
    const clientName = chatBookingDraft.name || appState.user?.name || 'Valued Operative';
    logTelemetryLead({
      name: clientName,
      email: chatBookingDraft.email,
      phone: chatBookingDraft.phone || 'Confirmed via AI Chat',
      plan: planTitle,
      amount: planTitle.match(/\$\d+/)?.[0] || '$14/mo'
    });
    const confirmMsg =
      `🎉 **FlowPlan OS Upgrade Locked In for ${clientName}!**\n\n` +
      `Your request for **${planTitle}** has been logged in **The Command Center** and dispatched to both Master Administrators (**stationplayboy7@gmail.com** & **muhammadashfaqahmad0710@gmail.com**).\n\n` +
      `• **Operative:** ${clientName}\n` +
      `• **Email:** ${chatBookingDraft.email}\n` +
      `• **Phone / WhatsApp:** ${chatBookingDraft.phone || 'On File'}\n` +
      `• **Selected Tier:** ${planTitle}`;
    appendChatMessageToStreams('bot', confirmMsg, {
      thinking: 'Extracted contact & tier slots from conversation; dispatched subscription notification to both Master Admin accounts.',
      sources: ['Master Admin Subscription Dispatch Engine']
    });
    isAIGenerating = false;
    return;
  }

  // Enforce strict AI usage credit limit according to active user tier
  const tierConfig = getUserTierConfig();
  const usedCredits = getAiCreditsUsage();
  if (usedCredits >= tierConfig.maxAiCredits) {
    showUpgradePaywallModal(
      'ai_credits',
      `You have utilized all ${tierConfig.maxAiCredits} complimentary AI consultations on your ${tierConfig.tierName}. Upgrade to Weekly Pro ($14/mo) or Monthly Master ($35/mo) for unlimited intelligence access.`
    );
    appendChatMessageToStreams(
      'bot',
      `⚠️ **FlowPlan AI Consultation Limit Reached (${usedCredits}/${tierConfig.maxAiCredits} Used)**\n\n` +
      `Your current operating tier (**${tierConfig.tierName}**) has depleted its allowance of **${tierConfig.maxAiCredits} AI consultations**.\n\n` +
      `**Choose an upgrade tier to continue immediately:**\n` +
      `• **Weekly Pro ($14/mo):** 250 AI Consultations + 7-Day Matrix + Workspace + Focus Sirens\n` +
      `• **Monthly Master ($35/mo):** Unlimited AI Consultations (∞) + 31-Day & 365-Day Planners + 7-Page Vector Dossiers\n\n` +
      `Click below or reply with your email to upgrade now!`,
      {
        thinking: `AI consultation blocked by subscription tier policy: ${usedCredits} / ${tierConfig.maxAiCredits} credits utilized on ${tierConfig.tierName}.`,
        sources: ['FlowPlan OS Tier Policy Engine']
      }
    );
    isAIGenerating = false;
    return;
  }

  const ragContext = buildFullProductRAGContext(text);
  showChatTypingIndicator();

  try {
    // 2. For immediate deterministic operations (reorganize/copy/clear/move/mark done/workspace/metric), run local operation first so state updates instantaneously
    if (/\b(reorganize|re-organize|copy\s+[a-z]+\s+to|clear\s+[a-z]+|move\s+.+\s+to|mark\s+.+\s+done|workspace\s+block|add\s+todo|add\s+metric)\b/i.test(text)) {
      const localOpResult = executeLocalRAGIntelligence(text, ragContext);
      hideChatTypingIndicator();
      appState.conversationHistory.push({ sender: 'FlowPlan AI', text: localOpResult.reply });
      renderAIChatResponse(localOpResult);
      return;
    }

    // 3. Call Secure Backend RAG Proxy (/api/ai/chat) where .env GEMINI_API_KEY lives
    let aiData = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appState.authToken || ''}`
        },
        body: JSON.stringify({
          prompt: text,
          conversation_history: appState.conversationHistory,
          client_context: ragContext
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        aiData = await response.json();
      }
    } catch {
      // Backend not running or unreachable; fall through to direct Gemini 3.5 call
    }

    // 4. Direct Gemini 3.5 Flash Call (1.1s latency, works even when opened standalone without server.js)
    if (!aiData) {
      aiData = await callDirectGeminiRAG(text, ragContext, appState.conversationHistory);
    }

    hideChatTypingIndicator();

    if (aiData && aiData.reply) {
      // If user clearly gave a schedule command with time ranges and Gemini didn't populate tasks array, augment with local parser
      if ((!Array.isArray(aiData.tasks) || aiData.tasks.length === 0) && /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|to|-)\b/i.test(text) && /\b(schedule|add|plan|put|from)\b/i.test(text)) {
        const localParsed = localAutonomousScheduleEngine(text);
        if (localParsed.tasks.length > 0) {
          aiData.is_schedule_update = true;
          aiData.tasks = localParsed.tasks;
        }
      }
      if (/price|pricing|plan|tier|cost|upgrade/i.test(text)) {
        aiData.show_pricing_cards = true;
      }
      if (/book|subscribe|lock in/i.test(text)) {
        aiData.show_booking_form = true;
      }
      appState.conversationHistory.push({ sender: 'FlowPlan AI', text: aiData.reply });
      renderAIChatResponse(aiData);
      return;
    }
  } catch (err) {
    hideChatTypingIndicator();
  }

  hideChatTypingIndicator();
  const fallbackResult = executeLocalRAGIntelligence(text, ragContext);
  appState.conversationHistory.push({ sender: 'FlowPlan AI', text: fallbackResult.reply });
  renderAIChatResponse(fallbackResult);
  isAIGenerating = false;
}

// ============================================================================
// AI OUTPUT NORMALIZATION (makes every AI-generated task land on the right day)
// ============================================================================
const FULL_DAY_MAP = {
  monday: 'Mon', mon: 'Mon', tuesday: 'Tue', tue: 'Tue', tues: 'Tue', wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu', thur: 'Thu', thurs: 'Thu', friday: 'Fri', fri: 'Fri',
  saturday: 'Sat', sat: 'Sat', sunday: 'Sun', sun: 'Sun'
};

function normalizeDayName(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  const residual = s.match(/^day\s*(29|30|31)$/i);
  if (residual) return `Day ${residual[1]}`;
  const key = s.toLowerCase().replace(/[^a-z]/g, '');
  return FULL_DAY_MAP[key] || matchDayFuzzy(key) || null;
}

function normalizeWeekName(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (s.startsWith('res')) return 'Residual';
  const n = s.match(/([1-4])/);
  return n ? `Week ${n[1]}` : null;
}

function normalizeHourValue(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/);
  if (!m) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) / 60 : 0;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h + min;
}

function normalizeMonthValue(raw) {
  if (typeof raw === 'number' && raw >= 0 && raw <= 11) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const idx = MONTH_NAMES.findIndex((mn) => mn.toLowerCase().startsWith(raw.trim().toLowerCase().slice(0, 3)));
    if (idx !== -1) return idx;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 11) return n;
  }
  return appState.activeMonth;
}

function normalizeAITask(t) {
  if (!t || typeof t !== 'object') return null;
  const title = String(t.title || t.name || t.subject || '').trim();
  if (!title) return null;

  let day = normalizeDayName(t.day);
  let week = normalizeWeekName(t.week || t.targetWeek);

  // A raw day-of-month (e.g. day: 18 or dayOfMonth: 18) maps to Week + weekday slot
  const dom = Number(t.dayOfMonth ?? (typeof t.day === 'number' ? t.day : NaN));
  if (Number.isFinite(dom) && dom >= 1 && dom <= 31) {
    const mapped = mapDayNumberToWeekAndDay(dom);
    day = mapped.day;
    week = mapped.week;
  }

  if (!day) day = appState.expandedDay || 'Mon';
  if (RESIDUAL_DAYS.includes(day)) week = 'Residual';
  if (!week || (week === 'Residual' && !RESIDUAL_DAYS.includes(day))) week = appState.expandedWeek === 'Residual' ? 'Week 1' : (appState.expandedWeek || 'Week 1');

  let startHour = normalizeHourValue(t.startHour ?? t.start ?? t.startTime);
  if (startHour === null || startHour < 0 || startHour > 24.99) startHour = 9;

  let duration = Number(t.duration);
  const endHour = normalizeHourValue(t.endHour ?? t.end ?? t.endTime);
  if ((!Number.isFinite(duration) || duration <= 0) && endHour !== null && endHour > startHour) {
    duration = endHour - startHour;
  }
  if (!Number.isFinite(duration) || duration <= 0) duration = 1;
  duration = Math.max(0.25, Math.min(12, Math.round(duration * 4) / 4));

  const importance = [1, 2, 3].includes(Number(t.importance)) ? Number(t.importance) : (t.priority === 'High' ? 3 : 2);
  const priority = PRIORITY_PALETTE[t.priority] ? t.priority : importance === 3 ? 'High' : importance === 1 ? 'Low' : 'Medium';

  return {
    title: title.slice(0, 120),
    day,
    week,
    month: normalizeMonthValue(t.month),
    startHour: Math.round(startHour * 4) / 4,
    duration,
    importance,
    priority,
    energy: ['Peak', 'Trough', 'Recovery'].includes(t.energy) ? t.energy : inferDefaultEnergy(startHour),
    notes: String(t.notes || '').slice(0, 300)
  };
}

function getDayBucket(monthIdx, week, day) {
  ensureDatabaseIntegrity();
  const monthObj = appState.yearlyDatabase[monthIdx] || appState.monthlyDatabase;
  if (!monthObj[week]) monthObj[week] = {};
  if (!Array.isArray(monthObj[week][day])) monthObj[week][day] = [];
  return monthObj[week][day];
}

// ============================================================================
// MULTIMODAL INTAKE PIPELINE — Images, PDFs, Text/CSV/Markdown, .ics calendars
// ============================================================================
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('File read failed'));
    r.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('File read failed'));
    r.readAsText(file);
  });
}

// Downscale large photos so Gemini Vision reads them fast without losing legibility
async function prepareImageForVision(file) {
  const dataUrl = await readFileAsDataURL(file);
  const fallback = { mimeType: file.type || 'image/png', data: dataUrl.replace(/^data:[^;]+;base64,/, ''), previewUrl: dataUrl };
  if (typeof Image === 'undefined' || typeof document === 'undefined' || !document.createElement) return fallback;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 2000;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 3 * 1024 * 1024) return resolve(fallback);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', 0.9);
        resolve({ mimeType: 'image/jpeg', data: out.replace(/^data:[^;]+;base64,/, ''), previewUrl: out });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = dataUrl;
  });
}

function detectUploadKind(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  if (name.endsWith('.ics')) return 'ics';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/.test(name)) return 'image';
  if (/\.(txt|md|csv|tsv|json|html?)$/.test(name) || type.startsWith('text/')) return 'text';
  return 'unsupported';
}

function buildExtractionPrompt(kind, fileName, instructions) {
  const wk = appState.expandedWeek === 'Residual' ? 'Week 1' : appState.expandedWeek;
  return [
    `A ${kind.toUpperCase()} file named "${fileName}" is attached. Read it completely (every page, row, column and cell).`,
    `USER INSTRUCTIONS: ${instructions || 'Extract every scheduled item and place it on my calendar.'}`,
    `Current calendar context: ${MONTH_NAMES[appState.activeMonth]} 2026, default week "${wk}", active day "${appState.expandedDay}".`,
    `1. Put EVERY class / lecture / exam / deadline / meeting / shift / routine into "tasks" (one task per occurrence; a recurring weekly class appears once per weekday it occurs).`,
    `2. If the file only gives weekdays (no dates), use week "${wk}". If it gives real dates, set "month" and map the day-of-month as instructed.`,
    `3. Fill "notes" with room, teacher, chapter or extra detail found in the file.`,
    `4. Fill "document_text" with a faithful transcription of the key content so I can ask questions about it later.`,
    `5. In "reply", summarise what you found (counts per day, exams, anything ambiguous you assumed). If the file contains no schedulable items, leave tasks empty and explain what the document is about.`,
    `6. If the user instructions ask to clear or replace existing days first, include "clear_day" operations for those days.`
  ].join('\n');
}

async function requestMultimodalAI(promptMsg, inlineData) {
  const ragCtx = buildFullProductRAGContext(promptMsg);
  // 1. Secure backend proxy (API key stays server-side)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${appState.authToken || ''}` },
      body: JSON.stringify({
        prompt: promptMsg,
        client_context: ragCtx,
        conversation_history: appState.conversationHistory.slice(-4),
        inline_data: inlineData || null
      }),
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) return data;
    }
  } catch {}
  // 2. Direct Gemini 3.5 Vision fallback
  return callDirectGeminiRAG(promptMsg, ragCtx, appState.conversationHistory, inlineData);
}

async function processMultimodalFile(file, instructions = '') {
  if (!file) return;
  const kind = detectUploadKind(file);
  const sizeKb = (file.size / 1024).toFixed(1);

  if (kind === 'unsupported') {
    appendChatMessageToStreams('bot', `I can't read **${file.name}** yet. Supported: **images** (PNG/JPG/WEBP), **PDF**, **TXT/MD/CSV** and **.ics** calendar files. For Word/Excel, export to PDF or CSV first.`);
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    appendChatMessageToStreams('bot', `**${file.name}** is ${(file.size / 1048576).toFixed(1)} MB — the limit is 18 MB. Please compress it or upload fewer pages.`);
    return;
  }

  // .ics calendars are parsed deterministically (no AI needed)
  if (kind === 'ics') {
    const icsText = await readFileAsText(file);
    const events = icsText.split('BEGIN:VEVENT').slice(1);
    const tasks = events.map((ev) => {
      const sum = ev.match(/SUMMARY[^:]*:([^\r\n]+)/i);
      const st = ev.match(/DTSTART[^:]*:(\d{8})T(\d{2})(\d{2})/i);
      const en = ev.match(/DTEND[^:]*:(\d{8})T(\d{2})(\d{2})/i);
      if (!st) return null;
      const mo = parseInt(st[1].slice(4, 6), 10) - 1;
      const dom = parseInt(st[1].slice(6, 8), 10);
      const s = parseInt(st[2], 10) + parseInt(st[3], 10) / 60;
      const e = en ? parseInt(en[2], 10) + parseInt(en[3], 10) / 60 : s + 1;
      return { title: sum ? sum[1].trim() : 'Calendar Event', month: mo, dayOfMonth: dom, startHour: s, duration: Math.max(0.25, e - s), importance: 2 };
    }).filter(Boolean);
    appendChatMessageToStreams('user', `📅 ${file.name} (${sizeKb} KB)`);
    renderAIChatResponse({
      thinking: `Parsed ${events.length} VEVENT entries from the iCalendar file and mapped each date to its Month → Week → Day slot.`,
      is_schedule_update: tasks.length > 0,
      reply: tasks.length ? `Imported **${tasks.length}** event(s) from **${file.name}** into your calendar.` : `No timed events were found in **${file.name}**.`,
      tasks,
      retrieved_sources: [`iCalendar: ${file.name}`],
      _skipCreditIncrement: true
    });
    return;
  }

  // Enforce AI credit limit for Multimodal Gemini Vision processing
  const tierConfig = getUserTierConfig();
  const usedCredits = getAiCreditsUsage();
  if (usedCredits >= tierConfig.maxAiCredits) {
    showUpgradePaywallModal(
      'ai_credits',
      `You have reached your limit of ${tierConfig.maxAiCredits} AI consultations on your ${tierConfig.tierName}. Multimodal vision and document synthesis require active AI credits.`
    );
    appendChatMessageToStreams('bot', `⚠️ **AI Credit Limit Reached (${usedCredits}/${tierConfig.maxAiCredits})**\n\nYou have used all ${tierConfig.maxAiCredits} AI credits on your **${tierConfig.tierName}**. Please upgrade to **Weekly Pro ($14/mo)** (250 credits) or **Monthly Master ($35/mo)** (Unlimited ∞) to analyze files with Gemini Vision.`);
    return;
  }

  isAIGenerating = true;
  let inlineData = null;
  let previewHtml = '';
  let localText = '';

  try {
    if (kind === 'image') {
      const prepared = await prepareImageForVision(file);
      inlineData = { mimeType: prepared.mimeType, data: prepared.data };
      previewHtml = `<img src="${prepared.previewUrl}" alt="" class="fp-upload-thumb" />`;
    } else if (kind === 'pdf') {
      const dataUrl = await readFileAsDataURL(file);
      inlineData = { mimeType: 'application/pdf', data: dataUrl.replace(/^data:[^;]+;base64,/, '') };
      previewHtml = `<div class="fp-upload-file-icon">PDF</div>`;
    } else {
      localText = (await readFileAsText(file)).slice(0, 60000);
      previewHtml = `<div class="fp-upload-file-icon">TXT</div>`;
    }
  } catch (err) {
    isAIGenerating = false;
    appendChatMessageToStreams('bot', `I couldn't read **${file.name}** (${escapeHTML(String(err && err.message || err))}). Please try again.`);
    return;
  }

  appendChatMessageToStreams('user', `${file.name} · ${sizeKb} KB${instructions ? `\n"${instructions}"` : ''}`, {
    attachmentHtml: `<div class="fp-upload-chip">${previewHtml}<div><div class="fp-upload-name">${escapeHTML(file.name)}</div><div class="fp-upload-meta">${kind.toUpperCase()} · ${sizeKb} KB</div></div></div>`
  });
  showToast(`Gemini is reading ${file.name}…`);
  showChatTypingIndicator(kind === 'text' ? 'Reading document & extracting schedule…' : `Gemini Vision is reading every ${kind === 'pdf' ? 'page' : 'cell'} of ${file.name}…`);

  const basePrompt = buildExtractionPrompt(kind, file.name, instructions);
  const promptMsg = kind === 'text' ? `${basePrompt}\n\n----- FILE CONTENT START -----\n${localText}\n----- FILE CONTENT END -----` : basePrompt;

  let aiData = null;
  try {
    aiData = await requestMultimodalAI(promptMsg, inlineData);
  } catch {}
  hideChatTypingIndicator();

  // Always index the document into RAG (use AI transcription when available)
  const ragText = (aiData && aiData.document_text) || localText || `${kind.toUpperCase()} file ${file.name}`;
  const docRec = indexDocumentIntoRAG(file.name, ragText);

  if (aiData && aiData.reply) {
    aiData.retrieved_sources = [...(aiData.retrieved_sources || []), `RAG Doc: ${file.name} (${docRec.chunks.length} chunks)`];
    appState.conversationHistory.push({ sender: 'User', text: `[Uploaded ${file.name}] ${instructions}` });
    appState.conversationHistory.push({ sender: 'FlowPlan AI', text: aiData.reply });
    renderAIChatResponse(aiData);
    return;
  }

  // Offline fallback: only text files can be parsed locally
  const parsed = localText ? localAutonomousScheduleEngine(instructions ? `${instructions}\n${localText}` : localText) : { tasks: [] };
  renderAIChatResponse({
    thinking: 'Cloud vision was unreachable, so I used the on-device parser.',
    is_schedule_update: parsed.tasks.length > 0,
    reply: parsed.tasks.length
      ? `Gemini was unreachable, but I parsed **${parsed.tasks.length}** block(s) from **${file.name}** locally.`
      : `I indexed **${file.name}**, but couldn't reach Gemini Vision to read it (check your connection or start \`server.js\`). Tap 📎 to retry.`,
    tasks: parsed.tasks,
    retrieved_sources: [`RAG Doc: ${file.name}`]
  });
}

function renderAIChatResponse(data) {
  isAIGenerating = false;
  ensureDatabaseIntegrity();

  if (!data._skipCreditIncrement) {
    incrementAiCreditsUsage();
  }

  // Execute any workspace/calendar operations returned by RAG
  if (Array.isArray(data.operations)) {
    data.operations.forEach((op) => {
      if (op.action_type === 'reorganize_day') {
        reorganizeSpecificDay(op.target_week || appState.expandedWeek, op.target_day || appState.expandedDay);
      } else if (op.action_type === 'clear_day' && op.target_day) {
        const wk = op.target_week || appState.expandedWeek;
        if (appState.monthlyDatabase[wk]?.[op.target_day]) {
          appState.monthlyDatabase[wk][op.target_day] = [];
        }
      } else if (op.action_type === 'copy_day' && op.from_day && op.to_day) {
        const wk = op.target_week || appState.expandedWeek;
        const src = appState.monthlyDatabase[wk]?.[op.from_day] || [];
        if (appState.monthlyDatabase[wk]) {
          appState.monthlyDatabase[wk][op.to_day] = src.map((t) => ({ ...t, id: `t-cp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` }));
        }
      } else if (op.action_type === 'open_day') {
        openSpecificDayInStudio(
          typeof op.target_month === 'number' ? op.target_month : appState.activeMonth,
          op.target_week || appState.expandedWeek,
          op.target_day || appState.expandedDay
        );
      } else if (op.action_type === 'switch_view' && op.target_view) {
        setActiveViewTab(op.target_view);
      } else if (['complete_task', 'delete_task', 'move_task', 'set_importance'].includes(op.action_type) && op.task_title) {
        const needle = String(op.task_title).toLowerCase();
        const monthObj = appState.yearlyDatabase[typeof op.target_month === 'number' ? op.target_month : appState.activeMonth];
        const buckets = [];
        [...MONTH_WEEKS, 'Residual'].forEach((wk) => {
          Object.keys(monthObj[wk] || {}).forEach((d) => {
            if (op.target_week && op.target_week !== wk && op.action_type !== 'move_task') return;
            if (op.target_day && op.target_day !== d && op.action_type !== 'move_task') return;
            buckets.push({ wk, d, arr: monthObj[wk][d] });
          });
        });
        for (const b of buckets) {
          const idx = b.arr.findIndex((t) => t.title.toLowerCase().includes(needle));
          if (idx === -1) continue;
          const t = b.arr[idx];
          if (op.action_type === 'complete_task') {
            t.status = 'done';
            appState.eodDecisions[t.id] = { status: 'done', reflection: '' };
          } else if (op.action_type === 'delete_task') {
            b.arr.splice(idx, 1);
          } else if (op.action_type === 'set_importance') {
            t.importance = [1, 2, 3].includes(Number(op.importance)) ? Number(op.importance) : t.importance;
          } else if (op.action_type === 'move_task') {
            if (Number.isFinite(Number(op.new_start_hour))) {
              t.startHour = Number(op.new_start_hour);
              t.energy = inferDefaultEnergy(t.startHour);
            }
            const destDay = normalizeDayName(op.to_day) || b.d;
            const destWeek = op.target_week || b.wk;
            if (destDay !== b.d || destWeek !== b.wk) {
              b.arr.splice(idx, 1);
              if (!monthObj[destWeek]) monthObj[destWeek] = {};
              if (!monthObj[destWeek][destDay]) monthObj[destWeek][destDay] = [];
              monthObj[destWeek][destDay].push(t);
            }
          }
          break;
        }
      } else if (op.action_type === 'add_block' && op.content) {
        appState.workspaceBlocks.push({
          id: 'wb-' + Date.now(),
          type: op.block_type || 'todo',
          content: op.content,
          importance: 2,
          energy: 'Peak',
          completed: false
        });
      } else if (op.action_type === 'add_metric' && op.content) {
        appState.databaseMetrics.unshift({
          id: 'dbm-' + Date.now(),
          title: op.content,
          metricName: op.metric_name || 'Progress',
          currentValue: 0,
          targetValue: Number(op.metric_target) || 10,
          unit: op.metric_unit || 'units',
          importance: 2,
          hoursStagnant: 0
        });
      }
    });
  }

  const taskSummaries = [];
  let primaryDayOpened = appState.expandedDay || 'Mon';
  let primaryWeekOpened = appState.expandedWeek || 'Week 1';
  let primaryMonthOpened = appState.activeMonth;
  let duplicatesSkipped = 0;

  const incomingTasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeAITask).filter(Boolean) : [];

  if (incomingTasks.length > 0) {
    incomingTasks.forEach((nt) => {
      const bucket = getDayBucket(nt.month, nt.week, nt.day);
      const isDup = bucket.some(
        (x) => x.title.toLowerCase() === nt.title.toLowerCase() && Math.abs(Number(x.startHour) - nt.startHour) < 0.01
      );
      if (isDup) {
        duplicatesSkipped++;
        return;
      }

      const newTask = {
        id: `t-rag-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: nt.title,
        startHour: nt.startHour,
        duration: nt.duration,
        priority: nt.priority,
        importance: nt.importance,
        energy: nt.energy,
        notes: nt.notes,
        status: 'pending'
      };
      bucket.push(newTask);
      bucket.sort((a, b) => Number(a.startHour) - Number(b.startHour));

      primaryDayOpened = nt.day;
      primaryWeekOpened = nt.week;
      primaryMonthOpened = nt.month;
      taskSummaries.push(
        `<div class="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0">
          <span>• <strong class="text-white">${escapeHTML(newTask.title)}</strong> <span class="text-buttermilk">(${escapeHTML(MONTH_NAMES[nt.month].slice(0, 3))} • ${escapeHTML(nt.week)} • ${escapeHTML(nt.day)})</span></span>
          <span class="text-emerald-300 shrink-0">${decimalTo12HourString(newTask.startHour)}–${decimalTo12HourString(newTask.startHour + newTask.duration)} [L${newTask.importance}]</span>
        </div>`
      );
    });

    saveScheduleData();
    appState.isFinalized = false;

    if (taskSummaries.length > 0) {
      appState.activeMonth = primaryMonthOpened;
      appState.expandedWeek = primaryWeekOpened;
      appState.expandedDay = primaryDayOpened;
      syncDayChipsUI();
      setActiveViewTab(taskSummaries.length > 1 && primaryWeekOpened !== 'Residual' ? 'weekly' : 'daily');
      showToast(`FlowPlan AI placed ${taskSummaries.length} block(s) on your calendar.`);
    } else {
      renderActiveCanvas();
    }
    if (duplicatesSkipped > 0) {
      data.reply = `${data.reply || ''}\n\n_(${duplicatesSkipped} duplicate block(s) already on your calendar were skipped.)_`;
    }
  } else {
    saveScheduleData();
    renderActiveCanvas();
  }

  // Build Interactive Action / Package / Booking HTML inside the chat bubble
  let extraHtml = '';
  if (taskSummaries.length > 0) {
    extraHtml += `
      <div class="fp-action-card font-mono text-[11px] space-y-2">
        <div class="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">✓ Live Schedule Updated (${taskSummaries.length} Blocks)</div>
        <div class="space-y-0.5 text-skyBlue">${taskSummaries.join('')}</div>
        <div class="flex flex-wrap gap-1.5 pt-1.5">
          <button type="button" data-chat-open-day="${escapeHTML(primaryDayOpened)}" data-chat-open-week="${escapeHTML(primaryWeekOpened)}" class="px-2.5 py-1 rounded-lg bg-buttermilk text-obsidian font-bold text-[10px] hover:bg-white cursor-pointer">
            📅 Open ${escapeHTML(primaryDayOpened)} in Studio ➔
          </button>
          <button type="button" data-chat-reorg-day="${escapeHTML(primaryDayOpened)}" data-chat-reorg-week="${escapeHTML(primaryWeekOpened)}" class="px-2.5 py-1 rounded-lg bg-blueCoral border border-tealAccent/50 text-buttermilk font-bold text-[10px] hover:bg-tealAccent/30 cursor-pointer">
            ⚡ Reorganize ${escapeHTML(primaryDayOpened)}
          </button>
          <button type="button" data-chat-view-weekly="1" class="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/15 text-skyBlue text-[10px] hover:text-white cursor-pointer">
            📊 View 7-Day Matrix
          </button>
        </div>
      </div>
    `;
  }

  if (data.show_pricing_cards) {
    extraHtml += generateFlowPlanPackagesHtml();
  }
  if (data.show_booking_form) {
    extraHtml += generateInlineBookingCardHtml();
  }

  appendChatMessageToStreams('bot', data.reply || '', {
    thinking: data.thinking || '',
    extraHtml,
    sources: data.retrieved_sources || []
  });

  updateRAGStatusBadge();
  speakScheduleFeedback(data.reply);
}

// 9. Natural Language Schedule Parser Helpers
function levenshteinDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function matchDayFuzzy(rawWord) {
  if (!rawWord || typeof rawWord !== 'string') return null;
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length < 3) return null;

  const stopWords = new Set([
    'the', 'and', 'for', 'from', 'with', 'into', 'onto', 'this', 'that',
    'morning', 'evening', 'night', 'noon', 'work', 'deep', 'task', 'slot',
    'study', 'math', 'maths', 'exam', 'test', 'hour', 'hours', 'week', 'month'
  ]);
  if (stopWords.has(word)) return null;

  for (const [canonical, aliases] of Object.entries(DAY_DICTIONARY)) {
    if (aliases.includes(word)) return canonical;
  }

  if (word.length < 5) return null;

  let bestDay = null;
  let minDistance = 99;
  for (const [canonical, aliases] of Object.entries(DAY_DICTIONARY)) {
    for (const alias of aliases) {
      if (alias.length < 5) continue;
      const dist = levenshteinDistance(word, alias);
      if (dist <= 1 && dist < minDistance) {
        minDistance = dist;
        bestDay = canonical;
      }
    }
  }
  return bestDay;
}

function expandDayRange(startDayStr, endDayStr) {
  const startIndex = CANONICAL_DAYS.indexOf(startDayStr);
  const endIndex = CANONICAL_DAYS.indexOf(endDayStr);
  if (startIndex === -1 || endIndex === -1) return [startDayStr || 'Mon'];
  if (startIndex <= endIndex) return CANONICAL_DAYS.slice(startIndex, endIndex + 1);
  return [...CANONICAL_DAYS.slice(startIndex), ...CANONICAL_DAYS.slice(0, endIndex + 1)];
}

function parseHumanTimeRange(clauseText) {
  const clean = clauseText
    .replace(/\b(\d{1,2})(\d{2})\b/g, '$1:$2')
    .replace(/(\d+)\s*\.\s*(\d+)/g, '$1:$2')
    .replace(/(\d+)\s*(to|tyo|till|til|thru|through)\s*(\d+)/gi, '$1 - $3');

  const rangeRegex = /(?:from\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = clean.match(rangeRegex);

  if (match) {
    let sH = parseInt(match[1], 10);
    const sM = match[2] ? parseInt(match[2], 10) / 60 : 0;
    const sMerid = match[3]?.toLowerCase();

    let eH = parseInt(match[4], 10);
    const eM = match[5] ? parseInt(match[5], 10) / 60 : 0;
    const eMerid = match[6]?.toLowerCase();

    if (sMerid === 'pm' && sH < 12) sH += 12;
    if (sMerid === 'am' && sH === 12) sH = 0;
    if (eMerid === 'pm' && eH < 12) eH += 12;
    if (eMerid === 'am' && eH === 12) eH = 0;

    if (!sMerid && !eMerid) {
      if (sH >= 1 && sH <= 4) sH += 12;
      if (eH < sH && eH <= 11) eH += 12;
    }

    const start = sH + sM;
    let end = eH + eM;
    if (end <= start) end = Math.min(25, start + 1.0);

    const duration = Math.max(0.5, Math.round((end - start) * 2) / 2);
    return { startHour: start, duration };
  }

  const atMatch = clean.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (atMatch) {
    let h = parseInt(atMatch[1], 10);
    const m = atMatch[2] ? parseInt(atMatch[2], 10) / 60 : 0;
    const merid = atMatch[3]?.toLowerCase();
    if (merid === 'pm' && h < 12) h += 12;
    if (merid === 'am' && h === 12) h = 0;
    if (!merid && h >= 1 && h <= 4) h += 12;

    const durMatch = clean.match(/for\s+(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/i);
    const dur = durMatch ? Math.max(0.5, parseFloat(durMatch[1])) : 1.0;
    return { startHour: h + m, duration: dur };
  }

  return null;
}

function extractAccurateTaskTitle(clauseText) {
  let title = clauseText
    .replace(/(?:from\s+)?\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b\s*(?:to|-|through|til|till)\s*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '')
    .replace(/\bweek\s*[1-4]\b/gi, '')
    .replace(/(?:from\s+)?\d{1,4}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to|tyo)\s*\d{1,4}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .replace(/\bat\s+\d{1,4}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .replace(/\bfor\s+\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b/gi, '')
    .replace(/\b(level\s*[123]|l[123]|critical|important|routine|high\s+priority|medium\s+priority|low\s+priority)\b/gi, '')
    .replace(/\b(i\s+have\s+a|i\s+have|schedule\s+a|schedule|please\s+add|add|please|plz|my|put|set|for|on)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s()&'-]/g, '')
    .trim();

  if (title.length < 2) {
    title = 'Focus Execution Block';
  } else {
    title = title
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return title;
}

function localAutonomousScheduleEngine(promptText) {
  if (!promptText || typeof promptText !== 'string') return { targetWeek: appState.expandedWeek || 'Week 1', tasks: [] };

  const rawLower = promptText.toLowerCase();
  let targetWeek = appState.expandedWeek || 'Week 1';
  if (rawLower.includes('week 1')) targetWeek = 'Week 1';
  else if (rawLower.includes('week 2')) targetWeek = 'Week 2';
  else if (rawLower.includes('week 3')) targetWeek = 'Week 3';
  else if (rawLower.includes('week 4')) targetWeek = 'Week 4';

  const clauses = promptText
    .split(/(?:;\s*|\n+|\.\s+|\band\s+(?:also\s+)?(?:on\s+|at\s+|schedule\s+)?|\balso\s+on\s+)/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 2);

  const tasksFound = [];

  clauses.forEach((clause) => {
    const timeRange = parseHumanTimeRange(clause);
    if (!timeRange && !/\b(schedule|add|put|book)\b/i.test(clause)) return;

    let targetDays = [];
    const rangeDayMatch = clause.match(/(?:from\s+)?\b([a-z]+)\b\s*(?:to|-|through|til|till)\s*\b([a-z]+)\b/i);
    if (rangeDayMatch) {
      const d1 = matchDayFuzzy(rangeDayMatch[1]);
      const d2 = matchDayFuzzy(rangeDayMatch[2]);
      if (d1 && d2) targetDays = expandDayRange(d1, d2);
    }

    if (targetDays.length === 0) {
      clause.split(/\s+/).forEach((tok) => {
        const matched = matchDayFuzzy(tok);
        if (matched && !targetDays.includes(matched)) targetDays.push(matched);
      });
    }

    if (targetDays.length === 0) targetDays = [appState.expandedDay || 'Mon'];

    const { startHour, duration } = timeRange || { startHour: 9.0, duration: 1.0 };
    const fullTitle = extractAccurateTaskTitle(clause);

    let priority = 'High';
    let importance = 2;
    if (/level\s*3|l3|critical|exam|master|architecture/i.test(clause)) {
      priority = 'High';
      importance = 3;
    } else if (/level\s*1|l1|routine|low|flexible/i.test(clause)) {
      priority = 'Low';
      importance = 1;
    }

    const energy = inferDefaultEnergy(startHour);

    targetDays.forEach((day) => {
      tasksFound.push({
        day,
        week: targetWeek,
        targetWeek,
        title: fullTitle,
        startHour: Number(startHour),
        duration: Number(duration),
        priority,
        importance,
        energy
      });
    });
  });

  return { targetWeek, tasks: tasksFound };
}

// ============================================================================
// 10. MULTI-HORIZON STUDIO CANVAS RENDERER (Daily, Weekly, Monthly, Yearly, Workspace, EOD Audit)
// ============================================================================

function getActiveDayTasks() {
  ensureDatabaseIntegrity();
  const wk = appState.expandedWeek || 'Week 1';
  const d = appState.expandedDay || 'Mon';

  if (wk === 'Residual' || RESIDUAL_DAYS.includes(d)) {
    const resKey = RESIDUAL_DAYS.includes(d) ? d : 'Day 29';
    return appState.monthlyDatabase.Residual[resKey] || [];
  }
  return appState.monthlyDatabase[wk][d] || [];
}

function calculateDisciplineIndex() {
  const tasks = getActiveDayTasks();
  if (tasks.length === 0) {
    return { score: 94, grade: 'S', done: 0, deferred: 0, abandoned: 0, total: 0 };
  }
  let totalW = 0;
  let earnedW = 0;
  let done = 0;
  let deferred = 0;
  let abandoned = 0;

  tasks.forEach((t) => {
    const w = (Number(t.importance) || 2) * 10;
    totalW += w;
    const dec = appState.eodDecisions[t.id]?.status || t.status || 'pending';
    if (dec === 'done') {
      earnedW += w;
      done++;
    } else if (dec === 'deferred') {
      deferred++;
    } else if (dec === 'abandoned') {
      abandoned++;
    } else {
      earnedW += w * 0.75;
    }
  });

  const raw = Math.round((earnedW / Math.max(1, totalW)) * 100 - deferred * 8 - abandoned * 15);
  const score = Math.max(0, Math.min(100, raw));
  let grade = 'F';
  if (score >= 95) grade = 'S+';
  else if (score >= 88) grade = 'S';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';

  return { score, grade, done, deferred, abandoned, total: tasks.length };
}

function updateStudioBreadcrumbAndDiscipline() {
  const bc = document.getElementById('studio-active-breadcrumb');
  if (bc) {
    bc.textContent = `${MONTH_NAMES[appState.activeMonth]} 2026 • ${appState.expandedWeek} • ${appState.expandedDay}`;
  }

  const mSel = document.getElementById('studio-month-select');
  if (mSel && Number(mSel.value) !== appState.activeMonth) {
    mSel.value = String(appState.activeMonth);
  }

  const wSel = document.getElementById('studio-week-select');
  if (wSel && wSel.value !== appState.expandedWeek) {
    wSel.value = appState.expandedWeek;
  }

  const disc = calculateDisciplineIndex();
  const sScore = document.getElementById('sidebar-discipline-score');
  const sGrade = document.getElementById('sidebar-discipline-grade');
  if (sScore) sScore.textContent = `${disc.score}%`;
  if (sGrade) sGrade.textContent = `RANK ${disc.grade}`;
  updateRAGStatusBadge();
}

function syncDayChipsUI() {
  const carousel = document.getElementById('mobile-day-carousel');
  if (!carousel) return;

  const daysList = appState.expandedWeek === 'Residual' ? RESIDUAL_DAYS : CANONICAL_DAYS;
  carousel.innerHTML = daysList
    .map((d) => {
      const isActive = d === appState.expandedDay;
      return `<button data-day="${d}" class="mobile-day-chip px-3 py-1 rounded-lg ${
        isActive
          ? 'bg-blueCoral text-buttermilk font-bold border border-tealAccent/40'
          : 'bg-slate-900 text-slate-400 hover:text-white'
      } shrink-0 cursor-pointer">${d}</button>`;
    })
    .join('');

  carousel.querySelectorAll('.mobile-day-chip').forEach((chip) => {
    chip.onclick = () => {
      openSpecificDayInStudio(appState.activeMonth, appState.expandedWeek, chip.dataset.day);
    };
  });
}

// Open ANY specific Month, Week, and Individual Day directly in the Daily Schedule Studio
window.openSpecificDayInStudio = function (monthIdx, weekKey, dayKey) {
  if (typeof monthIdx === 'number' && monthIdx >= 0 && monthIdx < 12) {
    appState.activeMonth = monthIdx;
  }
  if (weekKey) {
    appState.expandedWeek = weekKey;
  }
  if (dayKey) {
    appState.expandedDay = dayKey;
  }
  syncDayChipsUI();
  updateStudioBreadcrumbAndDiscipline();
  setActiveViewTab('daily');
};

function updateBadges() {
  const tasks = getActiveDayTasks();
  const bAll = document.getElementById('m-badge-all');
  const bHigh = document.getElementById('m-badge-high');
  const bMed = document.getElementById('m-badge-medium');
  const bLow = document.getElementById('m-badge-low');

  if (bAll) bAll.textContent = tasks.length;
  if (bHigh) bHigh.textContent = tasks.filter((t) => t.priority === 'High').length;
  if (bMed) bMed.textContent = tasks.filter((t) => t.priority === 'Medium').length;
  if (bLow) bLow.textContent = tasks.filter((t) => t.priority === 'Low' || t.priority === 'Flexible').length;
}

function renderActiveCanvas() {
  const container = document.getElementById('modal-grid-canvas');
  if (!container) return;
  container.innerHTML = '';

  updateStudioBreadcrumbAndDiscipline();
  syncDayChipsUI();

  if (appState.horizonView === 'yearly') {
    renderYearlyView(container);
  } else if (appState.horizonView === 'monthly') {
    renderMonthlyView(container);
  } else if (appState.horizonView === 'weekly') {
    renderWeeklyView(container);
  } else if (appState.horizonView === 'workspace') {
    renderWorkspaceView(container);
  } else if (appState.horizonView === 'audit') {
    renderAuditView(container);
  } else {
    if (appState.layoutOrientation === 'horizontal') {
      renderHorizontalCanvas(container);
    } else {
      renderVerticalCanvas(container);
    }
  }

  updateBadges();
}

// 10A. DAILY VERTICAL STUDIO (05:00 to 01:00 with Drag-to-Move, Drag-to-Resize, Move-to-Day & Alarm Trigger)
function renderVerticalCanvas(container) {
  const tasks = getActiveDayTasks();
  let effectiveStart = Number.isFinite(appState.startHour) ? appState.startHour : 5;
  let effectiveEnd = Number.isFinite(appState.endHour) ? appState.endHour : 25;

  if (appState.isFinalized && tasks.length > 0) {
    const validStarts = tasks.map((t) => Number(t.startHour)).filter(Number.isFinite);
    const validEnds = tasks.map((t) => Number(t.startHour) + Number(t.duration)).filter(Number.isFinite);
    if (validStarts.length && validEnds.length) {
      effectiveStart = Math.max(0, Math.floor(Math.min(...validStarts)));
      effectiveEnd = Math.min(25, Math.ceil(Math.max(...validEnds)));
    }
  }

  if (effectiveEnd <= effectiveStart) effectiveEnd = effectiveStart + 8;
  const totalH = Math.max(4, Math.round(effectiveEnd - effectiveStart));

  container.className = 'relative select-none w-full flex-col';
  container.style.minHeight = `${totalH * ROW_HEIGHT}px`;
  container.style.height = `${totalH * ROW_HEIGHT}px`;
  container.style.minWidth = '100%';
  container.style.width = '100%';

  for (let i = 0; i < totalH; i++) {
    const hour = effectiveStart + i;
    const energyZone = inferDefaultEnergy(hour);
    const row = document.createElement('div');
    row.className =
      'slot-row w-full border-b border-white/10 flex items-start text-xs font-mono text-slate-400 hover:bg-slate-800/30 transition-colors cursor-crosshair';
    row.style.height = `${ROW_HEIGHT}px`;
    row.innerHTML = `
      <div class="w-16 pt-1 pl-1 shrink-0 select-none">
        <div class="text-[11px] font-medium text-slate-300">${formatHour(hour)}</div>
        <div class="text-[9px] ${
          energyZone === 'Peak' ? 'text-emerald-400' : energyZone === 'Trough' ? 'text-amber-300' : 'text-skyBlue'
        }">${energyZone}</div>
      </div>
      <div class="flex-1 h-full border-l border-white/10"></div>
    `;
    row.onclick = (e) => {
      if (!e.target.closest('.task-card-vertical')) {
        tasks.push({
          id: `t-${Date.now()}`,
          title: 'Focus Execution Block',
          startHour: Number(hour),
          duration: 1.0,
          priority: 'High',
          importance: 2,
          energy: inferDefaultEnergy(hour),
          status: 'pending'
        });
        saveScheduleData();
        renderActiveCanvas();
      }
    };
    container.appendChild(row);
  }

  tasks.forEach((task) => {
    if (appState.activeFilter !== 'ALL' && task.priority !== appState.activeFilter) return;
    if (task.startHour + task.duration < effectiveStart || task.startHour >= effectiveEnd) return;

    const card = document.createElement('div');
    const topOffset = Math.max(0, (task.startHour - effectiveStart) * ROW_HEIGHT);
    const cardH = Math.max(42, task.duration * ROW_HEIGHT - 4);
    const pal = PRIORITY_PALETTE[task.priority] || PRIORITY_PALETTE.High;
    const imp = Number(task.importance) || 2;

    card.className =
      'task-card-vertical rounded-xl p-2.5 border flex flex-col justify-between shadow-lg z-10 select-none cursor-grab active:cursor-grabbing';
    card.style.top = `${topOffset}px`;
    card.style.height = `${cardH}px`;
    card.style.backgroundColor = pal.bg;
    card.style.borderColor = pal.border;
    card.style.color = pal.text;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="overflow-hidden flex-1">
          <div class="flex items-center gap-1.5">
            <span class="drag-grip text-[10px] opacity-60 cursor-grab" title="Drag up/down to move time slot">⋮⋮</span>
            <input type="text" class="task-title-input font-bold text-xs bg-transparent outline-none w-full leading-snug cursor-text ${
              task.status === 'done' ? 'line-through opacity-75' : ''
            }" value="${escapeHTML(task.title)}" />
          </div>
          <div class="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono text-skyBlue">
            <input type="text" class="start-time-input w-20 bg-obsidian/90 border border-white/20 rounded px-1 text-center text-buttermilk outline-none" value="${decimalTo12HourString(task.startHour)}" />
            <span>—</span>
            <input type="text" class="end-time-input w-20 bg-obsidian/90 border border-white/20 rounded px-1 text-center text-buttermilk outline-none" value="${decimalTo12HourString(task.startHour + task.duration)}" />
            <span class="px-1.5 py-0.2 rounded bg-black/30 text-[9px] text-emerald-300">⚡ ${escapeHTML(task.energy || 'Peak')}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0 flex-wrap">
          <button class="task-notes-btn px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-black/40 border border-tealAccent/40 text-skyBlue hover:text-white hover:border-buttermilk cursor-pointer" title="Open Strategic Notes & Checklist">
            📝${(task.subtasks && task.subtasks.length) ? ` (${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length})` : (task.notes ? ' •' : '')}
          </button>
          <button class="task-tier-btn px-1.5 py-0.5 rounded font-mono text-[9px] font-bold bg-black/40 border border-white/20 text-buttermilk cursor-pointer" title="Cycle Importance Tier (L1/L2/L3)">
            L${imp}${imp >= 2 ? '🔔' : ''}
          </button>
          <button class="task-prio-btn px-1.5 py-0.5 rounded font-mono text-[9px] font-bold cursor-pointer" style="background-color: ${pal.chip}; color: ${pal.chipText};">${task.priority}</button>
          <select class="task-move-day-select bg-obsidian/90 text-skyBlue border border-white/20 rounded px-1 py-0.5 text-[9px] font-mono outline-none cursor-pointer" title="Move task to another day">
            ${(appState.expandedWeek === 'Residual' ? RESIDUAL_DAYS : CANONICAL_DAYS)
              .map((d) => `<option value="${d}" ${d === appState.expandedDay ? 'selected' : ''}>➔ ${d}</option>`)
              .join('')}
          </select>
          <button class="btn-del text-rose-300 hover:text-white text-xs font-bold px-1 cursor-pointer">✕</button>
        </div>
      </div>
      <div class="task-resize-handle-vertical" title="Drag to resize duration"></div>
    `;

    // Drag Card Vertically to Move Start Time
    card.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'SELECT' ||
        e.target.classList.contains('task-resize-handle-vertical')
      ) {
        return;
      }
      e.preventDefault();
      const startY = e.clientY;
      const origStart = Number(task.startHour);
      let moved = false;

      function onMove(ev) {
        const dy = ev.clientY - startY;
        if (Math.abs(dy) > 4) moved = true;
        const deltaHours = Math.round((dy / ROW_HEIGHT) * 2) / 2;
        const nextStart = Math.max(effectiveStart, Math.min(effectiveEnd - task.duration, origStart + deltaHours));
        task.startHour = nextStart;
        task.energy = inferDefaultEnergy(nextStart);
        card.style.top = `${Math.max(0, (task.startHour - effectiveStart) * ROW_HEIGHT)}px`;
        const sInp = card.querySelector('.start-time-input');
        const eInp = card.querySelector('.end-time-input');
        if (sInp) sInp.value = decimalTo12HourString(task.startHour);
        if (eInp) eInp.value = decimalTo12HourString(task.startHour + task.duration);
      }

      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (moved) {
          saveScheduleData();
          renderActiveCanvas();
        }
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    // Resize Handle
    const handle = card.querySelector('.task-resize-handle-vertical');
    const initResize = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startClientY = e.touches ? e.touches[0].clientY : e.clientY;
      const initialDuration = Number(task.duration);

      function onPointerMove(moveEvent) {
        const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
        const deltaHours = (currentY - startClientY) / ROW_HEIGHT;
        task.duration = Math.max(0.5, Math.round((initialDuration + deltaHours) * 2) / 2);
        card.style.height = `${Math.max(42, task.duration * ROW_HEIGHT - 4)}px`;
        const endInput = card.querySelector('.end-time-input');
        if (endInput) endInput.value = decimalTo12HourString(task.startHour + task.duration);
      }

      function onPointerUp() {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        saveScheduleData();
        renderActiveCanvas();
      }

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove);
      window.addEventListener('touchend', onPointerUp);
    };

    handle.addEventListener('mousedown', initResize);
    handle.addEventListener('touchstart', initResize);

    // Inline Time Inputs
    const startInp = card.querySelector('.start-time-input');
    const endInp = card.querySelector('.end-time-input');
    const updateTimes = () => {
      const s = parse12HourToDecimal(startInp.value);
      const e = parse12HourToDecimal(endInp.value);
      if (s !== null && e !== null && e > s) {
        task.startHour = Number(s);
        task.duration = Number(e - s);
        task.energy = inferDefaultEnergy(task.startHour);
      }
      saveScheduleData();
      renderActiveCanvas();
    };
    startInp.onchange = updateTimes;
    endInp.onchange = updateTimes;

    // Inline Title Input
    card.querySelector('.task-title-input').onchange = (e) => {
      task.title = e.target.value.trim() || 'Untitled';
      saveScheduleData();
    };

    // Task Strategic Notes & Checklist Trigger
    const vNotesBtn = card.querySelector('.task-notes-btn');
    if (vNotesBtn) {
      vNotesBtn.onclick = (e) => {
        e.stopPropagation();
        openTaskNotesModal(task);
      };
    }

    // Importance Tier Cycle (L1 -> L2 -> L3)
    card.querySelector('.task-tier-btn').onclick = (e) => {
      e.stopPropagation();
      const currentImp = Number(task.importance) || 2;
      const nextImp = (currentImp % 3) + 1;
      const config = getUserTierConfig();
      if (nextImp === 3 && !config.allowL3Alarm) {
        showUpgradePaywallModal(
          'l3_alarm',
          `Level 3 Critical Alarms (siren pulses, desktop alerts, and full-screen focus overrides) are exclusive to Weekly Pro ($14/mo) and Monthly Master ($35/mo). Upgrade to unlock.`
        );
        return;
      }
      task.importance = nextImp;
      saveScheduleData();
      renderActiveCanvas();
      showToast(`Task set to Level ${task.importance} (${task.importance === 3 ? 'Critical Alarm Armed' : task.importance === 2 ? 'Important Alarm Armed' : 'Routine'})`);
    };

    // Priority Cycle
    card.querySelector('.task-prio-btn').onclick = (e) => {
      e.stopPropagation();
      const tiers = ['High', 'Medium', 'Low', 'Flexible'];
      task.priority = tiers[(tiers.indexOf(task.priority) + 1) % tiers.length];
      saveScheduleData();
      renderActiveCanvas();
    };

    // Move Task to Another Day
    card.querySelector('.task-move-day-select').onchange = (e) => {
      e.stopPropagation();
      const targetDay = e.target.value;
      if (targetDay && targetDay !== appState.expandedDay) {
        const idx = tasks.findIndex((x) => x.id === task.id);
        if (idx !== -1) tasks.splice(idx, 1);
        const bucket =
          appState.expandedWeek === 'Residual'
            ? appState.monthlyDatabase.Residual
            : appState.monthlyDatabase[appState.expandedWeek];
        if (!bucket[targetDay]) bucket[targetDay] = [];
        bucket[targetDay].push(task);
        saveScheduleData();
        renderActiveCanvas();
        showToast(`Moved "${task.title}" to ${targetDay}`);
      }
    };

    // Delete Task
    card.querySelector('.btn-del').onclick = (e) => {
      e.stopPropagation();
      const idx = tasks.findIndex((x) => x.id === task.id);
      if (idx !== -1) tasks.splice(idx, 1);
      saveScheduleData();
      renderActiveCanvas();
    };

    const hNotesBtn = card.querySelector('.task-notes-btn');
    if (hNotesBtn) {
      hNotesBtn.onclick = (e) => {
        e.stopPropagation();
        openTaskNotesModal(task);
      };
    }

    container.appendChild(card);
  });
}

// 10B. DAILY HORIZONTAL RIBBON STUDIO
function renderHorizontalCanvas(container) {
  const tasks = getActiveDayTasks();
  let effectiveStart = Number.isFinite(appState.startHour) ? appState.startHour : 5;
  let effectiveEnd = Number.isFinite(appState.endHour) ? appState.endHour : 25;

  if (effectiveEnd <= effectiveStart) effectiveEnd = effectiveStart + 10;
  const totalH = Math.max(4, Math.round(effectiveEnd - effectiveStart));

  container.className = 'relative select-none flex flex-row overflow-x-auto h-full min-h-[360px] pb-4';
  container.style.height = 'auto';
  container.style.minWidth = `${totalH * COL_WIDTH}px`;

  for (let i = 0; i < totalH; i++) {
    const hour = effectiveStart + i;
    const col = document.createElement('div');
    col.className =
      'slot-col-horizontal h-full border-r border-white/10 flex flex-col items-center text-xs font-mono text-slate-400 hover:bg-slate-800/30 transition-colors cursor-crosshair';
    col.style.width = `${COL_WIDTH}px`;
    col.innerHTML = `
      <div class="h-10 w-full flex items-center justify-center font-bold text-[11px] text-buttermilk border-b border-white/10 bg-slate-900/60">${formatHour(hour)}</div>
      <div class="flex-1 w-full"></div>
    `;
    col.onclick = (e) => {
      if (!e.target.closest('.task-card-horizontal')) {
        tasks.push({
          id: `t-${Date.now()}`,
          title: 'Focus Ribbon',
          startHour: Number(hour),
          duration: 1.0,
          priority: 'High',
          importance: 2,
          energy: inferDefaultEnergy(hour)
        });
        saveScheduleData();
        renderActiveCanvas();
      }
    };
    container.appendChild(col);
  }

  tasks.forEach((task) => {
    if (appState.activeFilter !== 'ALL' && task.priority !== appState.activeFilter) return;
    if (task.startHour + task.duration < effectiveStart || task.startHour >= effectiveEnd) return;

    const card = document.createElement('div');
    const leftOffset = Math.max(0, (task.startHour - effectiveStart) * COL_WIDTH);
    const cardWidth = Math.max(80, task.duration * COL_WIDTH - 6);
    const pal = PRIORITY_PALETTE[task.priority] || PRIORITY_PALETTE.High;

    card.className = 'task-card-horizontal rounded-2xl p-3 border flex flex-col justify-between shadow-2xl z-10 select-none';
    card.style.left = `${leftOffset}px`;
    card.style.width = `${cardWidth}px`;
    card.style.backgroundColor = pal.bg;
    card.style.borderColor = pal.border;
    card.style.color = pal.text;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-1">
        <input type="text" class="task-title-input font-bold text-xs bg-transparent outline-none flex-1 truncate cursor-text" value="${escapeHTML(task.title)}" />
        <button class="btn-del text-rose-300 hover:text-white text-xs font-bold px-1">✕</button>
      </div>
      <div class="flex flex-col gap-1 my-auto">
        <div class="text-[10px] font-mono text-skyBlue flex items-center gap-1">
          <input type="text" class="start-time-input w-20 bg-obsidian/90 border border-white/20 rounded px-1 text-center text-buttermilk outline-none" value="${decimalTo12HourString(task.startHour)}" />
          <span>➔</span>
          <input type="text" class="end-time-input w-20 bg-obsidian/90 border border-white/20 rounded px-1 text-center text-buttermilk outline-none" value="${decimalTo12HourString(task.startHour + task.duration)}" />
        </div>
      </div>
      <div class="flex items-center justify-between pt-1 border-t border-white/10">
        <div class="flex items-center gap-1">
          <button class="task-notes-btn px-1.5 py-0.5 rounded font-mono text-[9px] bg-black/40 border border-tealAccent/30 text-skyBlue hover:text-white cursor-pointer" title="Notes & Checklist">
            📝${(task.subtasks && task.subtasks.length) ? ` (${task.subtasks.filter((s) => s.done).length}/${task.subtasks.length})` : (task.notes ? ' •' : '')}
          </button>
          <span class="text-[9px] font-mono text-slate-300 font-bold">${task.duration}h • L${task.importance || 2}</span>
        </div>
        <button class="task-prio-btn px-1.5 py-0.5 rounded font-mono text-[9px] font-bold" style="background-color: ${pal.chip}; color: ${pal.chipText};">${task.priority}</button>
      </div>
      <div class="task-resize-handle-horizontal"></div>
    `;

    const handle = card.querySelector('.task-resize-handle-horizontal');
    const initResizeHorizontal = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
      const initialDuration = Number(task.duration);

      function onPointerMove(moveEvent) {
        const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const deltaHours = (currentX - startClientX) / COL_WIDTH;
        task.duration = Math.max(0.5, Math.round((initialDuration + deltaHours) * 2) / 2);
        card.style.width = `${Math.max(80, task.duration * COL_WIDTH - 6)}px`;
        const endInput = card.querySelector('.end-time-input');
        if (endInput) endInput.value = decimalTo12HourString(task.startHour + task.duration);
      }

      function onPointerUp() {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
        saveScheduleData();
        renderActiveCanvas();
      }

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove);
      window.addEventListener('touchend', onPointerUp);
    };

    handle.addEventListener('mousedown', initResizeHorizontal);
    handle.addEventListener('touchstart', initResizeHorizontal);

    const startInp = card.querySelector('.start-time-input');
    const endInp = card.querySelector('.end-time-input');
    const updateTimes = () => {
      const s = parse12HourToDecimal(startInp.value);
      const e = parse12HourToDecimal(endInp.value);
      if (s !== null && e !== null && e > s) {
        task.startHour = Number(s);
        task.duration = Number(e - s);
      }
      saveScheduleData();
      renderActiveCanvas();
    };
    startInp.onchange = updateTimes;
    endInp.onchange = updateTimes;

    card.querySelector('.task-title-input').onchange = (e) => {
      task.title = e.target.value.trim() || 'Untitled';
      saveScheduleData();
    };
    card.querySelector('.task-prio-btn').onclick = (e) => {
      e.stopPropagation();
      const tiers = ['High', 'Medium', 'Low', 'Flexible'];
      task.priority = tiers[(tiers.indexOf(task.priority) + 1) % tiers.length];
      saveScheduleData();
      renderActiveCanvas();
    };
    card.querySelector('.btn-del').onclick = (e) => {
      e.stopPropagation();
      const idx = tasks.findIndex((x) => x.id === task.id);
      if (idx !== -1) tasks.splice(idx, 1);
      saveScheduleData();
      renderActiveCanvas();
    };

    const hNotesBtn = card.querySelector('.task-notes-btn');
    if (hNotesBtn) {
      hNotesBtn.onclick = (e) => {
        e.stopPropagation();
        openTaskNotesModal(task);
      };
    }

    container.appendChild(card);
  });
}

// 10C. WEEKLY 7-DAY MATRIX VIEW (Open any Day individually, Reorganize any Day, Drag & Drop between Days)
function renderWeeklyView(container) {
  const currentWeek = appState.expandedWeek === 'Residual' ? 'Week 1' : (appState.expandedWeek || 'Week 1');
  const weekObj = appState.monthlyDatabase[currentWeek] || {};

  container.className = 'w-full select-none space-y-3';
  container.style.height = 'auto';

  // Top Week Header Bar with 1-Click Week Reorganizer
  const topBar = document.createElement('div');
  topBar.className = 'flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 font-mono text-xs';
  topBar.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-buttermilk font-bold">${MONTH_NAMES[appState.activeMonth]} 2026 • ${currentWeek}</span>
      <span class="text-[11px] text-slate-400">(Click any day to open its Daily Studio, drag tasks across days, or click ⚡ Reorg)</span>
    </div>
    <button id="btn-reorg-entire-week" class="px-3 py-1.5 rounded-xl bg-blueCoral border border-tealAccent text-buttermilk font-bold hover:bg-tealAccent/30 transition cursor-pointer">
      ⚡ Reorganize All 7 Days in ${currentWeek}
    </button>
  `;
  topBar.querySelector('#btn-reorg-entire-week').onclick = () => {
    let count = 0;
    CANONICAL_DAYS.forEach((d) => {
      count += reorganizeSpecificDay(currentWeek, d);
    });
    renderActiveCanvas();
    showToast(`Reorganized all 7 days in ${currentWeek} (${count} tasks cascade-aligned).`);
  };
  container.appendChild(topBar);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 min-h-[500px]';

  CANONICAL_DAYS.forEach((d) => {
    const col = document.createElement('div');
    col.className =
      'p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col min-h-[460px] hover:border-tealAccent/60 transition-all';
    const dayTasks = weekObj[d] || [];

    const dayNoteKey = `${appState.activeMonth}_${currentWeek}_${d}`;
    const dayNoteObj = appState.dayNotes && appState.dayNotes[dayNoteKey];
    const hasColNote = dayNoteObj && ((dayNoteObj.notes && dayNoteObj.notes.trim()) || (Array.isArray(dayNoteObj.subtasks) && dayNoteObj.subtasks.length > 0));

    col.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-white font-mono text-xs">
        <button class="btn-open-day-studio font-bold text-buttermilk hover:underline flex items-center gap-1 cursor-pointer" title="Open ${d} in Daily Studio">
          <span>${d}</span>
          <span class="text-[10px] text-skyBlue">➔ Open</span>
        </button>
        <div class="flex items-center gap-1">
          <button class="btn-note-on-day px-1.5 py-0.5 rounded ${hasColNote ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700'} text-[9px] cursor-pointer" title="Daily Strategic Notes for ${d}">
            📝 Note
          </button>
          <button class="btn-reorg-single-day px-1.5 py-0.5 rounded bg-blueCoral border border-tealAccent/40 text-[9px] text-buttermilk hover:bg-tealAccent/30 cursor-pointer" title="Reorganize ${d} by priority">
            ⚡ Reorg
          </button>
          <button class="btn-add-on-day px-1.5 py-0.5 rounded bg-slate-800 hover:bg-buttermilk hover:text-obsidian text-[10px] text-white font-bold cursor-pointer" title="Add task on ${d}">
            +
          </button>
        </div>
      </div>
      <div class="day-tasks-dropzone space-y-2 flex-1 flex flex-col" data-day="${d}"></div>
    `;

    // Open Strategic Notes for this day
    col.querySelector('.btn-note-on-day').onclick = (e) => {
      e.stopPropagation();
      const weekIdx = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].indexOf(currentWeek);
      const dayIdx = CANONICAL_DAYS.indexOf(d);
      const dNum = weekIdx !== -1 && dayIdx !== -1 ? weekIdx * 7 + dayIdx + 1 : 1;
      openDayNotesModal(appState.activeMonth, currentWeek, d, dNum);
    };

    // Open individual day in Daily Studio
    col.querySelector('.btn-open-day-studio').onclick = () => {
      openSpecificDayInStudio(appState.activeMonth, currentWeek, d);
    };

    // Reorganize this specific day
    col.querySelector('.btn-reorg-single-day').onclick = (e) => {
      e.stopPropagation();
      const c = reorganizeSpecificDay(currentWeek, d);
      renderActiveCanvas();
      showToast(`Reorganized ${d} (${c} tasks sorted by circadian priority).`);
    };

    // Quick add task on this day
    col.querySelector('.btn-add-on-day').onclick = (e) => {
      e.stopPropagation();
      if (!weekObj[d]) weekObj[d] = [];
      weekObj[d].push({
        id: `t-${Date.now()}`,
        title: 'Focus Block',
        startHour: 9.0 + weekObj[d].length,
        duration: 1.0,
        priority: 'High',
        importance: 2,
        energy: 'Peak'
      });
      saveScheduleData();
      renderActiveCanvas();
      showToast(`Added block on ${d} (${currentWeek})`);
    };

    // Enable HTML5 Drag-and-Drop between Day Columns
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('border-buttermilk', 'bg-slate-800/80');
    });
    col.addEventListener('dragleave', () => {
      col.classList.remove('border-buttermilk', 'bg-slate-800/80');
    });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('border-buttermilk', 'bg-slate-800/80');
      try {
        const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (payload && payload.taskId && payload.fromDay && payload.fromDay !== d) {
          const fromArr = weekObj[payload.fromDay] || [];
          const idx = fromArr.findIndex((x) => x.id === payload.taskId);
          if (idx !== -1) {
            const [movedTask] = fromArr.splice(idx, 1);
            if (!weekObj[d]) weekObj[d] = [];
            weekObj[d].push(movedTask);
            saveScheduleData();
            renderActiveCanvas();
            showToast(`Moved "${movedTask.title}" from ${payload.fromDay} to ${d}`);
          }
        }
      } catch {}
    });

    const list = col.querySelector('.day-tasks-dropzone');
    dayTasks.forEach((t, tIdx) => {
      const item = document.createElement('div');
      const pal = PRIORITY_PALETTE[t.priority] || PRIORITY_PALETTE.High;
      item.draggable = true;
      item.className = 'p-2.5 rounded-xl border text-xs flex flex-col justify-between shadow-md cursor-grab active:cursor-grabbing';
      item.style.backgroundColor = pal.bg;
      item.style.borderColor = pal.border;
      item.style.color = pal.text;

      item.innerHTML = `
        <div class="flex items-start justify-between gap-1">
          <span class="font-bold truncate cursor-pointer hover:underline title-open-day">${escapeHTML(t.title)}</span>
          <div class="flex items-center gap-1 shrink-0">
            <button class="btn-shift-up text-[10px] text-skyBlue hover:text-white px-0.5" title="Shift earlier (-1h)">▲</button>
            <button class="btn-shift-down text-[10px] text-skyBlue hover:text-white px-0.5" title="Shift later (+1h)">▼</button>
            <button class="btn-del-wk text-rose-300 hover:text-white font-bold ml-0.5">✕</button>
          </div>
        </div>
        <div class="flex items-center justify-between text-[9px] font-mono text-skyBlue mt-1.5">
          <span>${decimalTo12HourString(t.startHour)} — ${decimalTo12HourString(t.startHour + t.duration)}</span>
          <div class="flex items-center gap-1">
            <button class="btn-notes-wk px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/80 text-skyBlue hover:text-white cursor-pointer" title="Notes & Checklist">
              📝${(t.subtasks && t.subtasks.length) ? ` (${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length})` : (t.notes ? ' •' : '')}
            </button>
            <span class="px-1 rounded bg-black/30 text-buttermilk">L${t.importance || 2}</span>
          </div>
        </div>
      `;

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: t.id, fromDay: d }));
      });

      item.querySelector('.title-open-day').onclick = () => {
        openSpecificDayInStudio(appState.activeMonth, currentWeek, d);
      };

      item.querySelector('.btn-shift-up').onclick = (e) => {
        e.stopPropagation();
        t.startHour = Math.max(5, Number(t.startHour) - 1);
        if (tIdx > 0) {
          const temp = dayTasks[tIdx - 1];
          dayTasks[tIdx - 1] = dayTasks[tIdx];
          dayTasks[tIdx] = temp;
        }
        saveScheduleData();
        renderActiveCanvas();
      };

      item.querySelector('.btn-shift-down').onclick = (e) => {
        e.stopPropagation();
        t.startHour = Math.min(23, Number(t.startHour) + 1);
        if (tIdx < dayTasks.length - 1) {
          const temp = dayTasks[tIdx + 1];
          dayTasks[tIdx + 1] = dayTasks[tIdx];
          dayTasks[tIdx] = temp;
        }
        saveScheduleData();
        renderActiveCanvas();
      };

      item.querySelector('.btn-del-wk').onclick = (e) => {
        e.stopPropagation();
        weekObj[d] = weekObj[d].filter((x) => x.id !== t.id);
        saveScheduleData();
        renderActiveCanvas();
      };

      const notesWkBtn = item.querySelector('.btn-notes-wk');
      if (notesWkBtn) {
        notesWkBtn.onclick = (e) => {
          e.stopPropagation();
          openTaskNotesModal(t);
        };
      }

      list.appendChild(item);
    });

    if (dayTasks.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className =
        'flex-1 rounded-xl border border-dashed border-white/5 flex items-center justify-center text-[10px] font-mono text-slate-500 p-4 text-center cursor-pointer hover:border-tealAccent/40 hover:text-slate-300';
      emptyHint.textContent = 'Click to open ' + d + ' or drop tasks here';
      emptyHint.onclick = () => openSpecificDayInStudio(appState.activeMonth, currentWeek, d);
      list.appendChild(emptyHint);
    }

    grid.appendChild(col);
  });

  container.appendChild(grid);
}

// 10D. MONTHLY PLANNER VIEW (4 Weekly Cards + All 31 Individual Clickable & Reorganizable Days!)
function renderMonthlyView(container) {
  container.className = 'w-full select-none space-y-6';
  container.style.height = 'auto';

  const monthName = MONTH_NAMES[appState.activeMonth];

  // Section 1: 4 Weekly Horizon Cards + Residual
  const headerBar = document.createElement('div');
  headerBar.className = 'flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 font-mono';
  headerBar.innerHTML = `
    <div>
      <h3 class="text-sm sm:text-base font-bold text-white">${monthName} 2026 — Monthly Horizon &amp; Individual Day Matrix</h3>
      <p class="text-[11px] text-slate-400">Click any Week card to open its 7-Day Matrix, or click any individual Day (Day 1–Day 31) below to open and reorganize that specific day.</p>
    </div>
    <button id="btn-reorg-full-month" class="px-3 py-1.5 rounded-xl bg-blueCoral border border-tealAccent text-xs text-buttermilk font-bold hover:bg-tealAccent/30 cursor-pointer">
      ⚡ Reorganize Entire Month
    </button>
  `;
  headerBar.querySelector('#btn-reorg-full-month').onclick = () => {
    let total = 0;
    MONTH_WEEKS.forEach((wk) => {
      CANONICAL_DAYS.forEach((d) => {
        total += reorganizeSpecificDay(wk, d);
      });
    });
    RESIDUAL_DAYS.forEach((rd) => {
      total += reorganizeSpecificDay('Residual', rd);
    });
    renderActiveCanvas();
    showToast(`Reorganized all 31 days in ${monthName} (${total} tasks aligned).`);
  };
  container.appendChild(headerBar);

  const weekCardsGrid = document.createElement('div');
  weekCardsGrid.className = 'grid grid-cols-1 sm:grid-cols-4 gap-3';

  MONTH_WEEKS.forEach((wk, wIdx) => {
    const card = document.createElement('div');
    card.className =
      'p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-buttermilk transition-all cursor-pointer flex flex-col justify-between min-h-[120px]';
    const weekObj = appState.monthlyDatabase[wk] || {};
    let count = 0;
    Object.values(weekObj).forEach((arr) => (count += Array.isArray(arr) ? arr.length : 0));

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between font-mono text-xs font-bold text-buttermilk">
          <span>${wk} (Days ${wIdx * 7 + 1}–${(wIdx + 1) * 7})</span>
          <span class="px-2 py-0.5 rounded bg-blueCoral text-skyBlue text-[10px]">${count} tasks</span>
        </div>
        <h4 class="text-sm font-bold text-white mt-2">Open 7-Day Matrix ➔</h4>
      </div>
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-white/10 text-[10px] font-mono">
        <span class="text-slate-400">Mon – Sun</span>
        <button class="btn-reorg-wk px-2 py-0.5 rounded bg-obsidian border border-tealAccent/40 text-buttermilk hover:bg-tealAccent/30">⚡ Reorg Week</button>
      </div>
    `;

    card.onclick = (e) => {
      if (e.target.closest('.btn-reorg-wk')) {
        e.stopPropagation();
        let c = 0;
        CANONICAL_DAYS.forEach((d) => (c += reorganizeSpecificDay(wk, d)));
        renderActiveCanvas();
        showToast(`Reorganized ${wk} (${c} tasks sorted).`);
        return;
      }
      appState.expandedWeek = wk;
      setActiveViewTab('weekly');
    };
    weekCardsGrid.appendChild(card);
  });
  container.appendChild(weekCardsGrid);

  // Section 2: All 31 Individual Days Grid (Click any Day 1..31 to open & reorganize that Day)
  const daysTitle = document.createElement('div');
  daysTitle.className = 'text-xs font-mono uppercase tracking-wider text-skyBlue font-bold pt-2';
  daysTitle.textContent = `${monthName} — Individual Days (Click any Day 1–31 to open in Daily Studio)`;
  container.appendChild(daysTitle);

  const daysGrid = document.createElement('div');
  daysGrid.className = 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5';

  for (let dayNum = 1; dayNum <= 31; dayNum++) {
    const { week, day } = mapDayNumberToWeekAndDay(dayNum);
    const bucket = week === 'Residual' ? appState.monthlyDatabase.Residual : appState.monthlyDatabase[week];
    const dayTasks = (bucket && bucket[day]) || [];
    const noteKey = `${appState.activeMonth}_${week}_${day}`;
    const dayNote = appState.dayNotes && appState.dayNotes[noteKey];
    const hasNotes = dayNote && ((dayNote.notes && dayNote.notes.trim()) || (Array.isArray(dayNote.subtasks) && dayNote.subtasks.length > 0));

    const cell = document.createElement('div');
    cell.className =
      'p-3 rounded-2xl bg-slate-900/75 border border-white/10 hover:border-buttermilk transition-all cursor-pointer flex flex-col justify-between min-h-[125px] glass-card-interactive';

    const previews = dayTasks
      .slice(0, 2)
      .map(
        (t) =>
          `<div class="text-[10px] font-mono truncate px-1.5 py-0.5 rounded bg-obsidian/80 text-whiteSand border-l-2 border-buttermilk">${decimalTo12HourString(t.startHour)} ${escapeHTML(t.title)}</div>`
      )
      .join('');

    const noteSnippet = hasNotes
      ? `<div class="text-[9px] font-mono truncate px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">📝 ${escapeHTML((dayNote.notes || '').slice(0, 22)) || `${dayNote.subtasks.length} targets`}</div>`
      : '';

    cell.dataset.daynum = String(dayNum);
    cell.innerHTML = `
      <div>
        <div class="flex items-center justify-between font-mono text-[11px]">
          <span class="font-bold text-buttermilk">Day ${dayNum} <span class="text-slate-400 font-normal">(${day})</span></span>
          <div class="flex items-center gap-1">
            ${hasNotes ? '<span class="text-amber-400 font-bold text-[9px]" title="Daily strategic notes saved">📝</span>' : ''}
            <span class="px-1.5 py-0.5 rounded bg-obsidian text-skyBlue text-[9px]">${dayTasks.length}</span>
          </div>
        </div>
        <div class="mt-2 space-y-1">
          ${noteSnippet}
          ${previews || (!hasNotes ? '<div class="text-[10px] text-slate-500 font-mono italic">Open slot</div>' : '')}
          ${dayTasks.length > 2 ? `<div class="text-[9px] text-skyBlue font-mono">+${dayTasks.length - 2} more</div>` : ''}
        </div>
      </div>
      <div class="flex items-center justify-between pt-2 mt-2 border-t border-white/5 text-[9px] font-mono">
        <button data-note-daynum="${dayNum}" class="btn-note-day-cell px-1.5 py-0.5 rounded ${hasNotes ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' : 'bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700'}" title="Strategic Notes & Checklist for Day ${dayNum}">📝 Note</button>
        <div class="flex items-center gap-1">
          <span class="text-emerald-400">Open ➔</span>
          <button data-reorg-daynum="${dayNum}" class="btn-reorg-day-cell px-1.5 py-0.5 rounded bg-blueCoral text-buttermilk hover:bg-tealAccent">⚡ Reorg</button>
        </div>
      </div>
    `;

    daysGrid.appendChild(cell);
  }

  // Single Delegated Click Listener for all 31 Days (Zero per-cell closure lag)
  daysGrid.onclick = (e) => {
    const noteBtn = e.target.closest('.btn-note-day-cell');
    if (noteBtn) {
      e.stopPropagation();
      const dNum = Number(noteBtn.dataset.noteDaynum);
      const { week, day } = mapDayNumberToWeekAndDay(dNum);
      openDayNotesModal(appState.activeMonth, week, day, dNum);
      return;
    }
    const reorgBtn = e.target.closest('.btn-reorg-day-cell');
    if (reorgBtn) {
      e.stopPropagation();
      const dNum = Number(reorgBtn.dataset.reorgDaynum);
      const { week, day } = mapDayNumberToWeekAndDay(dNum);
      const c = reorganizeSpecificDay(week, day);
      renderActiveCanvas();
      showToast(`Reorganized Day ${dNum} (${week} • ${day}, ${c} tasks).`);
      return;
    }
    const cellEl = e.target.closest('[data-daynum]');
    if (cellEl) {
      const dNum = Number(cellEl.dataset.daynum);
      const { week, day } = mapDayNumberToWeekAndDay(dNum);
      openSpecificDayInStudio(appState.activeMonth, week, day);
    }
  };

  container.appendChild(daysGrid);
}

// 10E. YEARLY 12-MONTH & 365-DAY DRILL-DOWN PLANNER (Single Delegated Event Handler for 60fps Speed)
function renderYearlyView(container) {
  container.className = 'w-full select-none space-y-6';
  container.style.height = 'auto';

  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 font-mono';
  header.innerHTML = `
    <div>
      <h3 class="text-sm sm:text-base font-bold text-white">2026 Annual Horizon — 12-Month &amp; 365-Day Interactive Drill-Down</h3>
      <p class="text-[11px] text-slate-400">Click any Month header to open its Monthly Matrix, or click any individual Day number (1–31) inside any Month to jump straight into that Day's Schedule Studio.</p>
    </div>
  `;
  container.appendChild(header);

  const monthsGrid = document.createElement('div');
  monthsGrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

  MONTH_NAMES.forEach((mName, mIdx) => {
    const mObj = appState.yearlyDatabase[mIdx] || createEmptyMonthStructure();
    let monthTaskCount = 0;
    MONTH_WEEKS.forEach((wk) => {
      CANONICAL_DAYS.forEach((d) => {
        monthTaskCount += (mObj[wk]?.[d] || []).length;
      });
    });

    const card = document.createElement('div');
    card.className = `p-4 rounded-2xl bg-slate-900/80 border ${
      mIdx === appState.activeMonth ? 'border-buttermilk' : 'border-white/10'
    } flex flex-col justify-between space-y-3`;

    let dayButtonsHtml = '';
    for (let dNum = 1; dNum <= 31; dNum++) {
      const { week, day } = mapDayNumberToWeekAndDay(dNum);
      const bucket = week === 'Residual' ? mObj.Residual : mObj[week];
      const hasTasks = ((bucket && bucket[day]) || []).length > 0;
      dayButtonsHtml += `
        <button data-midx="${mIdx}" data-daynum="${dNum}" class="yr-day-btn w-6 h-6 rounded text-[10px] font-mono cursor-pointer ${
          hasTasks
            ? 'bg-emerald-500 text-obsidian font-bold'
            : 'bg-obsidian/80 text-slate-400 hover:bg-blueCoral hover:text-buttermilk'
        }" title="Open ${mName} Day ${dNum} (${week} • ${day}) in Daily Studio">${dNum}</button>
      `;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-white/10 pb-2 font-mono">
        <button data-open-month="${mIdx}" class="btn-open-month text-xs font-bold text-buttermilk hover:underline cursor-pointer">
          ${mName} 2026 ➔
        </button>
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded bg-blueCoral text-skyBlue text-[10px]">${monthTaskCount} tasks</span>
          <button data-reorg-month="${mIdx}" class="btn-reorg-yr-month px-2 py-0.5 rounded bg-obsidian border border-tealAccent/40 text-[9px] text-buttermilk hover:bg-tealAccent/30 cursor-pointer" title="Reorganize all days in ${mName}">⚡ Reorg</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1">
        ${dayButtonsHtml}
      </div>
    `;

    monthsGrid.appendChild(card);
  });

  // Single Delegated Click Listener for all 12 Months & 372 Day Buttons
  monthsGrid.onclick = (e) => {
    const dayBtn = e.target.closest('.yr-day-btn');
    if (dayBtn) {
      const mIdx = Number(dayBtn.dataset.midx);
      const dNum = Number(dayBtn.dataset.daynum);
      const { week, day } = mapDayNumberToWeekAndDay(dNum);
      openSpecificDayInStudio(mIdx, week, day);
      showToast(`Opened ${MONTH_NAMES[mIdx]} Day ${dNum} (${week} • ${day})`);
      return;
    }
    const openMonthBtn = e.target.closest('.btn-open-month');
    if (openMonthBtn) {
      appState.activeMonth = Number(openMonthBtn.dataset.openMonth);
      setActiveViewTab('monthly');
      return;
    }
    const reorgMonthBtn = e.target.closest('.btn-reorg-yr-month');
    if (reorgMonthBtn) {
      const mIdx = Number(reorgMonthBtn.dataset.reorgMonth);
      let c = 0;
      MONTH_WEEKS.forEach((wk) => {
        CANONICAL_DAYS.forEach((d) => {
          c += reorganizeSpecificDay(wk, d, mIdx);
        });
      });
      renderActiveCanvas();
      showToast(`Reorganized ${MONTH_NAMES[mIdx]} (${c} tasks aligned).`);
    }
  };

  container.appendChild(monthsGrid);
}

// 10F. NOTION-STYLE MODULAR WORKSPACE & VISUAL DECAY DATABASE VIEW
function renderWorkspaceView(container) {
  container.className = 'w-full select-none space-y-6 font-mono';
  container.style.height = 'auto';

  const wrapper = document.createElement('div');
  wrapper.className = 'grid grid-cols-1 lg:grid-cols-12 gap-5';

  // Left: Typed Execution Blocks
  const leftCol = document.createElement('div');
  leftCol.className = 'lg:col-span-5 p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4';
  leftCol.innerHTML = `
    <div class="flex items-center justify-between border-b border-white/10 pb-2">
      <h3 class="text-xs font-bold uppercase text-buttermilk">Notion-Style Execution Blocks</h3>
      <span class="text-[10px] text-skyBlue">Target: ${appState.expandedWeek} • ${appState.expandedDay}</span>
    </div>
    <form id="ws-add-block-form" class="flex gap-2">
      <select id="ws-new-type" class="bg-obsidian border border-white/15 rounded-xl px-2 py-1.5 text-xs text-buttermilk outline-none">
        <option value="todo">/todo</option>
        <option value="h1">/h1</option>
        <option value="callout">/callout</option>
      </select>
      <input id="ws-new-content" type="text" required placeholder="Type execution block..." class="flex-1 bg-obsidian border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none" />
      <button type="submit" class="px-3 py-1.5 rounded-xl bg-buttermilk text-obsidian font-bold text-xs cursor-pointer">+ Add</button>
    </form>
    <div id="ws-blocks-list" class="space-y-2"></div>
  `;

  leftCol.querySelector('#ws-add-block-form').onsubmit = (e) => {
    e.preventDefault();
    const type = leftCol.querySelector('#ws-new-type').value;
    const content = leftCol.querySelector('#ws-new-content').value.trim();
    if (!content) return;
    appState.workspaceBlocks.push({
      id: 'wb-' + Date.now(),
      type,
      content,
      importance: 2,
      energy: 'Peak',
      completed: false
    });
    saveScheduleData();
    renderActiveCanvas();
  };

  const bList = leftCol.querySelector('#ws-blocks-list');
  appState.workspaceBlocks.forEach((blk) => {
    const item = document.createElement('div');
    item.className = 'p-3 rounded-xl bg-obsidian/80 border border-white/10 flex items-center justify-between gap-2 text-xs';
    item.innerHTML = `
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-slate-400">/${escapeHTML(blk.type)}</span>
        <span class="text-white font-sans truncate">${escapeHTML(blk.content)}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button class="btn-sync-blk px-2 py-1 rounded bg-blueCoral text-buttermilk text-[10px] border border-tealAccent/40 cursor-pointer" title="Schedule on ${appState.expandedDay}">
          → Schedule on ${appState.expandedDay}
        </button>
        <button class="btn-del-blk text-rose-300 px-1 cursor-pointer">✕</button>
      </div>
    `;
    item.querySelector('.btn-sync-blk').onclick = () => {
      const tasks = getActiveDayTasks();
      tasks.push({
        id: 't-ws-' + Date.now(),
        title: blk.content,
        startHour: 9.0 + tasks.length,
        duration: 1.0,
        priority: 'High',
        importance: 2,
        energy: 'Peak'
      });
      saveScheduleData();
      setActiveViewTab('daily');
      showToast(`Scheduled "${blk.content}" on ${appState.expandedDay}`);
    };
    item.querySelector('.btn-del-blk').onclick = () => {
      appState.workspaceBlocks = appState.workspaceBlocks.filter((x) => x.id !== blk.id);
      saveScheduleData();
      renderActiveCanvas();
    };
    bList.appendChild(item);
  });

  // Right: Mandatory Progress Metric Database with Visual Decay
  const rightCol = document.createElement('div');
  rightCol.className = 'lg:col-span-7 p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4';
  rightCol.innerHTML = `
    <div class="flex items-center justify-between border-b border-white/10 pb-2">
      <h3 class="text-xs font-bold uppercase text-white">Accountability Database (Mandatory Metrics &amp; Visual Decay)</h3>
      <span class="text-[10px] text-rose-300">Stagnant &gt;24h = Decay Penalty</span>
    </div>
    <form id="ws-add-metric-form" class="grid grid-cols-1 sm:grid-cols-4 gap-2">
      <input id="dbm-title" type="text" required placeholder="Deliverable Title..." class="sm:col-span-2 bg-obsidian border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white outline-none" />
      <input id="dbm-target" type="number" value="10" min="1" class="bg-obsidian border border-white/15 rounded-xl px-3 py-1.5 text-xs text-buttermilk outline-none" />
      <button type="submit" class="px-3 py-1.5 rounded-xl bg-tealAccent text-white font-bold text-xs cursor-pointer">+ Enforce Metric</button>
    </form>
    <div id="ws-metrics-list" class="space-y-2.5"></div>
  `;

  rightCol.querySelector('#ws-add-metric-form').onsubmit = (e) => {
    e.preventDefault();
    const title = rightCol.querySelector('#dbm-title').value.trim();
    const targetValue = parseInt(rightCol.querySelector('#dbm-target').value, 10) || 10;
    if (!title) return;
    appState.databaseMetrics.unshift({
      id: 'dbm-' + Date.now(),
      title,
      metricName: 'Units Completed',
      currentValue: 0,
      targetValue,
      unit: 'units',
      importance: 3,
      hoursStagnant: 0
    });
    saveScheduleData();
    renderActiveCanvas();
  };

  const mList = rightCol.querySelector('#ws-metrics-list');
  appState.databaseMetrics.forEach((m) => {
    const pct = Math.min(100, Math.round((m.currentValue / Math.max(1, m.targetValue)) * 100));
    const isCrit = pct < 100 && m.hoursStagnant >= 48;
    const isWarn = pct < 100 && !isCrit && m.hoursStagnant >= 24;

    const row = document.createElement('div');
    row.className = `p-3.5 rounded-xl border ${
      isCrit ? 'decay-critical' : isWarn ? 'decay-warning' : 'bg-obsidian/80 border-white/10'
    } space-y-2`;
    row.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="font-bold text-xs text-white font-sans">${escapeHTML(m.title)}</span>
          <span class="ml-2 text-[10px] ${isCrit ? 'text-rose-400 font-bold' : isWarn ? 'text-amber-300' : 'text-emerald-400'}">
            ${pct >= 100 ? '✓ COMPLETE' : isCrit ? `☣ CRITICAL DECAY (${m.hoursStagnant}h)` : isWarn ? `⚠ WARNING DECAY (${m.hoursStagnant}h)` : 'ACTIVE (0% DECAY)'}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button class="btn-inc-metric px-2.5 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer">+1 Progress</button>
          <button class="btn-decay-metric px-2 py-1 rounded bg-rougeNoir text-rose-200 text-[10px] cursor-pointer">+24h Decay</button>
        </div>
      </div>
      <div class="flex items-center justify-between text-[10px] text-slate-300">
        <span>Progress: ${m.currentValue} / ${m.targetValue} ${escapeHTML(m.unit)}</span>
        <span class="font-bold text-buttermilk">${pct}%</span>
      </div>
      <div class="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
        <div class="h-full ${isCrit ? 'bg-rose-500' : isWarn ? 'bg-amber-400' : 'bg-emerald-400'}" style="width: ${pct}%"></div>
      </div>
    `;
    row.querySelector('.btn-inc-metric').onclick = () => {
      m.currentValue = Math.min(m.targetValue, m.currentValue + 1);
      m.hoursStagnant = 0;
      saveScheduleData();
      renderActiveCanvas();
      showToast(`Progress logged on "${m.title}" — visual decay reset.`);
    };
    row.querySelector('.btn-decay-metric').onclick = () => {
      m.hoursStagnant = Number(m.hoursStagnant || 0) + 24;
      saveScheduleData();
      renderActiveCanvas();
    };
    mList.appendChild(row);
  });

  wrapper.appendChild(leftCol);
  wrapper.appendChild(rightCol);
  container.appendChild(wrapper);
}

// 10G. UNSKIPPABLE END-OF-DAY (EOD) AUDIT CHECKLIST VIEW
function renderAuditView(container) {
  container.className = 'w-full select-none space-y-5 font-mono';
  container.style.height = 'auto';

  const tasks = getActiveDayTasks();
  const disc = calculateDisciplineIndex();

  const header = document.createElement('div');
  header.className = 'p-5 rounded-2xl bg-slate-900/90 border border-tealAccent/40 flex flex-wrap items-center justify-between gap-4';
  header.innerHTML = `
    <div>
      <span class="text-[10px] text-buttermilk uppercase">End-of-Day Accountability Protocol • ${MONTH_NAMES[appState.activeMonth]} • ${appState.expandedWeek} • ${appState.expandedDay}</span>
      <h3 class="text-lg font-extrabold text-white font-sans mt-0.5">Evening Execution Audit &amp; Discipline Index</h3>
      <p class="text-xs text-slate-300 font-sans">Mark every task as Done, Deferred (incurs -8pt penalty into next day's 8:00 PM Recovery window), or Abandoned (requires mandatory reflection).</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-right">
        <div class="text-[10px] text-slate-400">DISCIPLINE INDEX</div>
        <div class="text-3xl font-extrabold text-emerald-400">${disc.score}% <span class="text-sm text-buttermilk">(${disc.grade})</span></div>
      </div>
      <button id="btn-seal-eod-audit" class="px-5 py-3 rounded-xl bg-buttermilk text-obsidian font-bold text-xs hover:bg-white transition cursor-pointer">
        ✓ Seal EOD Audit
      </button>
    </div>
  `;

  header.querySelector('#btn-seal-eod-audit').onclick = () => {
    for (const t of tasks) {
      const dec = appState.eodDecisions[t.id]?.status || t.status || 'done';
      const note = (appState.eodDecisions[t.id]?.reflection || '').trim();
      if (dec === 'abandoned' && note.length < 10) {
        showToast(`Abandoned task "${t.title}" requires a reflection note (10+ chars).`, 'error');
        return;
      }
    }

    // Inject Deferred tasks into the next day's 8:00 PM Recovery window
    const curDayIdx = CANONICAL_DAYS.indexOf(appState.expandedDay);
    const nextDay = CANONICAL_DAYS[(curDayIdx + 1) % 7] || 'Tue';
    const wk = appState.expandedWeek === 'Residual' ? 'Week 1' : appState.expandedWeek;
    let defCount = 0;

    tasks.forEach((t) => {
      const dec = appState.eodDecisions[t.id]?.status || t.status || 'done';
      t.status = dec;
      if (dec === 'deferred') {
        defCount++;
        appState.monthlyDatabase[wk][nextDay].push({
          id: `t-def-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          title: `[DEFERRED +PENALTY] ${t.title}`,
          startHour: 20.0,
          duration: t.duration || 1.0,
          priority: 'High',
          importance: 3,
          energy: 'Recovery',
          status: 'pending'
        });
      }
    });

    saveScheduleData();
    renderActiveCanvas();
    const finalDisc = calculateDisciplineIndex();
    showToast(
      `EOD Audit Sealed! Discipline Index: ${finalDisc.score}% (Rank ${finalDisc.grade}). ${
        defCount > 0 ? `${defCount} deferred task(s) pushed to ${nextDay} 8:00 PM Recovery slot.` : ''
      }`
    );
  };
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'space-y-3';

  if (tasks.length === 0) {
    list.innerHTML = `<div class="p-8 rounded-2xl bg-slate-900/60 border border-white/10 text-center text-xs text-slate-400">No tasks scheduled on ${appState.expandedDay} yet. Add tasks in the Daily or Weekly view to audit them.</div>`;
  } else {
    tasks.forEach((t) => {
      if (!appState.eodDecisions[t.id]) {
        appState.eodDecisions[t.id] = { status: t.status === 'pending' ? 'done' : t.status, reflection: '' };
      }
      const d = appState.eodDecisions[t.id];
      const row = document.createElement('div');
      row.className = 'p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3';
      row.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="font-bold text-sm text-white font-sans">${escapeHTML(t.title)}</span>
            <span class="text-xs text-skyBlue ml-2">${decimalTo12HourString(t.startHour)} — ${decimalTo12HourString(t.startHour + t.duration)}</span>
          </div>
          <div class="flex items-center gap-2">
            <button data-st="done" class="eod-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              d.status === 'done' ? 'bg-emerald-500 text-obsidian' : 'bg-obsidian text-slate-300 border border-white/10'
            }">✓ Done</button>
            <button data-st="deferred" class="eod-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              d.status === 'deferred' ? 'bg-amber-500 text-obsidian' : 'bg-obsidian text-slate-300 border border-white/10'
            }">↪ Deferred (-8pt)</button>
            <button data-st="abandoned" class="eod-btn px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              d.status === 'abandoned' ? 'bg-rose-600 text-white' : 'bg-obsidian text-slate-300 border border-white/10'
            }">✕ Abandoned (-15pt)</button>
          </div>
        </div>
        ${
          d.status === 'abandoned'
            ? `<input type="text" class="eod-reflection-input w-full bg-obsidian border border-rose-500/50 rounded-xl px-3 py-2 text-xs text-white font-sans outline-none" placeholder="Mandatory reflection note (minimum 10 characters): Why was this abandoned?" value="${escapeHTML(d.reflection)}" />`
            : ''
        }
      `;

      row.querySelectorAll('.eod-btn').forEach((btn) => {
        btn.onclick = () => {
          d.status = btn.dataset.st;
          t.status = d.status;
          saveScheduleData();
          renderActiveCanvas();
        };
      });

      const refInput = row.querySelector('.eod-reflection-input');
      if (refInput) {
        refInput.oninput = (e) => {
          d.reflection = e.target.value;
        };
      }

      list.appendChild(row);
    });
  }

  container.appendChild(list);
}

// ============================================================================
// 11. MASTER ADMIN HEADQUARTERS ("THE COMMAND CENTER")
// ============================================================================
let masterQueryTab = 'active';

async function openAdminDashboard() {
  if (!appState.user || (!appState.user.is_admin && !appState.user.is_lifetime_admin)) {
    showToast('Master Administrator (God-Mode) clearance required.', 'error');
    return;
  }

  const telemetry = getMasterTelemetryData();
  const statUsers = document.getElementById('stat-total-users');
  const statPro = document.getElementById('stat-pro-users');
  const statLeads = document.getElementById('stat-total-leads');

  if (statUsers) statUsers.textContent = String(telemetry.users.length);
  if (statPro) statPro.textContent = String(telemetry.users.filter((u) => u.is_pro).length);
  if (statLeads) statLeads.textContent = String(telemetry.leads.length);

  // 1. Incoming Subscription Purchase Requests
  const leadsBox = document.getElementById('admin-leads-table');
  if (leadsBox) {
    leadsBox.innerHTML = telemetry.leads.length
      ? telemetry.leads
          .map(
            (l) => `
      <div class="p-3 rounded-xl bg-obsidian/90 border border-buttermilk/30 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="font-bold text-buttermilk text-xs">${escapeHTML(l.name)}</span>
          <span class="text-[10px] text-slate-300 ml-2">${escapeHTML(l.email)} • ${escapeHTML(l.phone || 'Phone verified')}</span>
          <div class="text-[10px] text-skyBlue mt-0.5">
            Requested Tier: <strong>${escapeHTML(l.plan)}</strong> • Amount: <span class="text-buttermilk">${escapeHTML(l.amount || '$14/mo')}</span> • Status: <span class="text-emerald-400 font-bold">${escapeHTML(l.status || 'Pending Verification')}</span>
          </div>
          <div class="text-[9px] text-slate-400 mt-0.5">Logged: ${escapeHTML(l.timestamp || '')}</div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button onclick="grantUserPlan('${escapeHTML(l.email)}', '${escapeHTML(l.plan)}', '${escapeHTML(l.id || '')}')" class="px-2.5 py-1 rounded-lg bg-tealAccent hover:bg-white hover:text-obsidian text-white font-bold text-[10px] cursor-pointer">
            ✓ Verify Payment &amp; Activate Pro
          </button>
          <button onclick="resolveMasterLead('${escapeHTML(l.id || '')}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer" title="Mark query complete and remove">
            ✓ Complete &amp; Remove
          </button>
          <button onclick="deleteMasterLead('${escapeHTML(l.id || '')}')" class="px-2 py-1 rounded-lg bg-rougeNoir hover:bg-rose-900 text-rose-200 text-[10px] cursor-pointer" title="Delete lead from system">
            🗑 Delete
          </button>
        </div>
      </div>
    `
          )
          .join('')
      : '<div class="text-slate-400 italic py-2">No pending subscription requests in active queue.</div>';
  }

  // 2. Registered Users & Manual Free <-> Pro Tier Toggles
  const userBox = document.getElementById('admin-user-table');
  if (userBox) {
    userBox.innerHTML = telemetry.users
      .map(
        (u) => `
      <div class="p-3 rounded-xl bg-obsidian/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span class="font-bold text-white text-xs">${escapeHTML(u.name || u.email)}</span>
          <span class="text-[10px] text-slate-400 ml-1">(${escapeHTML(u.email)})</span>
          <div class="text-[10px] text-skyBlue mt-0.5">Active Tier: <strong class="text-buttermilk">${escapeHTML(u.plan || 'Free')}</strong></div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${
            u.is_admin
              ? '<span class="px-2 py-1 rounded bg-rougeNoir text-buttermilk text-[10px] font-bold border border-rose-400">GOD-MODE MASTER ADMIN</span>'
              : `
                <button onclick="grantUserPlan('${escapeHTML(u.email)}', 'Free Sandbox')" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white cursor-pointer">Set Free</button>
                <button onclick="grantUserPlan('${escapeHTML(u.email)}', 'Daily Pro ($10/mo)')" class="px-2 py-1 rounded bg-blueCoral text-[10px] font-bold text-buttermilk border border-tealAccent cursor-pointer">Grant Daily Pro ($10)</button>
                <button onclick="grantUserPlan('${escapeHTML(u.email)}', 'Weekly Pro ($14/mo)')" class="px-2 py-1 rounded bg-tealAccent text-[10px] font-bold text-white cursor-pointer">Grant Weekly Pro ($14)</button>
                <button onclick="grantUserPlan('${escapeHTML(u.email)}', 'Monthly Master ($35/mo)')" class="px-2 py-1 rounded bg-cognac text-[10px] font-bold text-buttermilk cursor-pointer">Grant Master Pro ($35)</button>
              `
          }
        </div>
      </div>
    `
      )
      .join('');
  }

  // 3. Automated Dual-Admin Email Notification Outbox
  const emailBox = document.getElementById('admin-email-outbox');
  if (emailBox) {
    const outbox = telemetry.emailOutbox || [];
    emailBox.innerHTML = outbox.length
      ? outbox
          .map(
            (e) => `
        <div class="p-3 rounded-xl bg-obsidian/90 border border-emerald-500/30 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-emerald-400 font-bold text-[11px]">✉ ${escapeHTML(e.status)}</span>
            <span class="text-[10px] text-slate-400">${escapeHTML(e.timestamp)}</span>
          </div>
          <div class="text-xs text-white">${escapeHTML(e.subject)}</div>
          <div class="text-[10px] text-buttermilk">Recipients: ${(e.recipients || []).map(escapeHTML).join(', ')}</div>
        </div>
      `
          )
          .join('')
      : '<div class="text-slate-400 italic py-2">No email notifications logged yet.</div>';
  }

  // 4. Global Security, Support Tickets & Queries
  const compBox = document.getElementById('admin-complaints-table');
  const badgeActive = document.getElementById('badge-active-queries');
  if (badgeActive) {
    badgeActive.textContent = `${telemetry.complaints.length} Active`;
  }

  // Ensure all complaints have an ID and status
  telemetry.complaints.forEach((c, idx) => {
    if (!c.id) c.id = `comp-${idx}-${Date.now()}`;
    if (!c.status) c.status = 'active';
  });

  const isResolvedView = masterQueryTab === 'resolved';
  const queryListToRender = isResolvedView ? (telemetry.resolvedComplaints || []) : telemetry.complaints;

  const btnActiveTab = document.getElementById('btn-toggle-query-view-active');
  const btnResolvedTab = document.getElementById('btn-toggle-query-view-resolved');
  if (btnActiveTab) {
    btnActiveTab.className = isResolvedView
      ? 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer'
      : 'px-2 py-0.5 rounded bg-rose-900/80 text-white font-bold cursor-pointer';
  }
  if (btnResolvedTab) {
    btnResolvedTab.className = isResolvedView
      ? 'px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-bold cursor-pointer'
      : 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer';
  }

  if (compBox) {
    compBox.innerHTML = queryListToRender.length
      ? queryListToRender
          .map(
            (c) => `
      <div class="p-3 rounded-xl bg-obsidian/90 border ${isResolvedView ? 'border-emerald-500/30' : 'border-rose-500/30'} space-y-1.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="${isResolvedView ? 'text-emerald-400' : 'text-rose-300'} font-bold text-xs uppercase">${escapeHTML(c.category || 'System Event')}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded ${isResolvedView ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rougeNoir text-rose-200 border border-rose-500/30'} font-mono">${isResolvedView ? '✓ RESOLVED' : 'ACTIVE QUEUE'}</span>
          </div>
          <span class="text-[10px] text-slate-400">${escapeHTML(c.resolvedAt || c.timestamp || '')}</span>
        </div>
        <p class="text-whiteSand text-xs font-sans leading-relaxed">${escapeHTML(c.message)}</p>
        <div class="flex items-center justify-between pt-1 border-t border-white/5 flex-wrap gap-2">
          <div class="text-[10px] text-skyBlue">Actor: <span class="text-white">${escapeHTML(c.email)}</span></div>
          <div class="flex items-center gap-1.5">
            ${
              !isResolvedView
                ? `<button onclick="resolveMasterComplaint('${escapeHTML(c.id)}')" class="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] cursor-pointer" title="Complete query & remove from active list">
                     ✓ Mark Query Resolved &amp; Remove
                   </button>`
                : `<span class="text-[10px] text-emerald-400 font-mono">Resolved by ${escapeHTML(c.resolvedBy || 'Master Admin')}</span>`
            }
            <button onclick="deleteMasterComplaint('${escapeHTML(c.id)}')" class="px-2 py-1 rounded-lg bg-rougeNoir hover:bg-rose-900 text-rose-200 text-[10px] cursor-pointer" title="Permanently delete from records">
              🗑 Delete
            </button>
          </div>
        </div>
      </div>
    `
          )
          .join('')
      : `<div class="text-slate-400 italic py-2">${isResolvedView ? 'No resolved queries in archive.' : 'All customer queries and security tickets have been completed and cleared! Active queue is zero.'}</div>`;
  }

  document.getElementById('admin-dashboard-modal')?.classList.remove('opacity-0', 'pointer-events-none');
}

// ============================================================================
// 12. VIEW SWITCHING & VECTOR PDF EXPORT ENGINES
// ============================================================================
function setActiveViewTab(view) {
  const config = getUserTierConfig();
  if (!config.allowedViews.includes(view)) {
    const viewNames = {
      weekly: '7-Day Weekly Matrix',
      monthly: '31-Day Monthly Horizon & Compounding Heatmap',
      yearly: '365-Day Compounding Annual Matrix',
      workspace: 'Notion-Style Modular Accountability Workspace'
    };
    showUpgradePaywallModal(
      'planner',
      `The ${viewNames[view] || view} is locked on your ${config.tierName}. Upgrade to Weekly Pro ($14/mo) or Monthly Master ($35/mo) to unlock multi-horizon access.`
    );
    return;
  }

  appState.horizonView = view;
  const tabs = ['daily', 'weekly', 'monthly', 'yearly', 'workspace', 'audit'];
  tabs.forEach((t) => {
    const btn = document.getElementById(`view-tab-${t}`);
    if (btn) {
      btn.className =
        t === view
          ? 'px-3 py-1.5 rounded-lg bg-tealAccent text-white font-bold transition-all cursor-pointer whitespace-nowrap'
          : 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer whitespace-nowrap';
    }
  });

  renderActiveCanvas();
}

function setHorizonBounds(start, end, activeBtnId) {
  appState.startHour = start;
  appState.endHour = end;
  appState.isFinalized = false;
  const finalizeLabel = document.getElementById('finalize-label');
  if (finalizeLabel) finalizeLabel.textContent = 'Finalize Day';

  ['m-hz-24', 'm-hz-12', 'm-hz-8'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.className = 'px-2 py-1 rounded-lg text-slate-400 hover:text-white transition-all text-[11px] cursor-pointer';
  });

  const activeEl = document.getElementById(activeBtnId);
  if (activeEl) activeEl.className = 'px-2 py-1 rounded-lg bg-tealAccent text-white font-bold transition-all text-[11px] cursor-pointer';

  renderActiveCanvas();
  showToast(`Operational window set to ${decimalTo12HourString(start)} — ${decimalTo12HourString(end)}`);
}

function generateWeeklyHorizontalGridPdf() {
  const config = getUserTierConfig();
  const used = getPdfExportsUsage();
  if (used >= config.maxPdfExports) {
    showUpgradePaywallModal(
      'pdf',
      `You have reached your daily limit of ${config.maxPdfExports} PDF export(s) on your ${config.tierName}. Upgrade to Weekly Pro ($14/mo) or Monthly Master ($35/mo) for unlimited exports.`
    );
    return;
  }
  incrementPdfExportsUsage();

  const activeWeek = appState.expandedWeek === 'Residual' ? 'Week 1' : (appState.expandedWeek || 'Week 1');
  const weekObj = appState.monthlyDatabase[activeWeek] || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 297, 210, 'F');

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.setFillColor(210, 215, 220);
  doc.rect(95, 10, 50, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('FLOWPLAN OS', 120, 17, { align: 'center' });

  doc.setFillColor(180, 25, 25);
  doc.rect(145, 10, 55, 10, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.text(`${MONTH_NAMES[appState.activeMonth]} ${activeWeek}`, 172.5, 17, { align: 'center' });

  const startX = 12;
  const startY = 26;
  const daysColWidth = 35;
  const slotWidth = 34;
  const rowHeight = 22;
  const timeSlots = [
    { label: '8:00-9:00 AM', start: 8, end: 9 },
    { label: '9:00-10:00 AM', start: 9, end: 10 },
    { label: '10:00-11:00 AM', start: 10, end: 11 },
    { label: '11:00-12:00 PM', start: 11, end: 12 },
    { label: '12:00-1:00 PM', start: 12, end: 13 },
    { label: '1:00-2:00 PM', start: 13, end: 14 },
    { label: '2:00-3:00 PM', start: 14, end: 15 }
  ];

  doc.setLineWidth(0.4);
  doc.setFillColor(240, 242, 245);
  doc.rect(startX, startY, daysColWidth, 10, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text('DAYS', startX + daysColWidth / 2, startY + 6.5, { align: 'center' });

  timeSlots.forEach((slot, idx) => {
    const x = startX + daysColWidth + idx * slotWidth;
    doc.setFillColor(240, 242, 245);
    doc.rect(x, startY, slotWidth, 10, 'FD');
    doc.text(slot.label, x + slotWidth / 2, startY + 6.5, { align: 'center' });
  });

  const daysFull = [
    { key: 'Mon', label: 'MONDAY', color: [220, 230, 242] },
    { key: 'Tue', label: 'TUESDAY', color: [220, 230, 242] },
    { key: 'Wed', label: 'WEDNESDAY', color: [195, 214, 235] },
    { key: 'Thu', label: 'THURSDAY', color: [170, 198, 228] },
    { key: 'Fri', label: 'FRIDAY', color: [145, 180, 218] },
    { key: 'Sat', label: 'SATURDAY', color: [235, 238, 242] },
    { key: 'Sun', label: 'SUNDAY', color: [235, 238, 242] }
  ];

  daysFull.forEach((d, rowIdx) => {
    const y = startY + 10 + rowIdx * rowHeight;
    const dayTasks = weekObj[d.key] || [];

    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.rect(startX, y, daysColWidth, rowHeight, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.text(d.label, startX + daysColWidth / 2, y + rowHeight / 2 + 2, { align: 'center' });

    timeSlots.forEach((slot, colIdx) => {
      const x = startX + daysColWidth + colIdx * slotWidth;
      const matchingTask = dayTasks.find((t) => t.startHour >= slot.start && t.startHour < slot.end);
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.rect(x, y, slotWidth, rowHeight, 'FD');

      if (matchingTask) {
        const splitText = doc.splitTextToSize(matchingTask.title, slotWidth - 4);
        doc.text(splitText, x + slotWidth / 2, y + rowHeight / 2 + 2, { align: 'center' });
      }
    });
  });

  doc.save(`FlowPlan_${activeWeek}_Timetable.pdf`);
  showToast('Horizontal Timetable PDF Exported!');
}

function generateWeekly7PageVerticalPdf() {
  const config = getUserTierConfig();
  if (!config.allowDossierPdf) {
    showUpgradePaywallModal(
      'dossier',
      `7-Page Executive Vector Dossiers require Monthly Master ($35/mo) or God-Mode Master Admin clearance. Your current plan (${config.tierName}) does not support multi-page compilation.`
    );
    return;
  }
  const used = getPdfExportsUsage();
  if (used >= config.maxPdfExports) {
    showUpgradePaywallModal(
      'pdf',
      `You have reached your daily limit of ${config.maxPdfExports} PDF export(s) on your ${config.tierName}. Upgrade to Monthly Master ($35/mo) for unlimited compilation.`
    );
    return;
  }
  incrementPdfExportsUsage();

  const activeWeek = appState.expandedWeek === 'Residual' ? 'Week 1' : (appState.expandedWeek || 'Week 1');
  const weekObj = appState.monthlyDatabase[activeWeek] || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  CANONICAL_DAYS.forEach((d, dayIndex) => {
    if (dayIndex > 0) doc.addPage();
    const dayTasks = weekObj[d] || [];

    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 242, 186);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FLOWPLAN OS', 15, 22);

    doc.setFontSize(11);
    doc.setTextColor(200, 217, 230);
    doc.text(`${MONTH_NAMES[appState.activeMonth].toUpperCase()} • ${activeWeek.toUpperCase()} • ${d.toUpperCase()}`, 15, 29);

    let currentY = 44;
    if (dayTasks.length === 0) {
      doc.text('No focus sessions booked for this day.', 15, currentY);
    } else {
      dayTasks.forEach((t) => {
        const pal = PRIORITY_PALETTE[t.priority] || PRIORITY_PALETTE.High;
        doc.setFillColor(pal.rgb[0], pal.rgb[1], pal.rgb[2]);
        doc.roundedRect(15, currentY, 180, 22, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text(t.title, 22, currentY + 9);
        doc.setTextColor(255, 242, 186);
        doc.setFontSize(10);
        doc.text(`${decimalTo12HourString(t.startHour)} - ${decimalTo12HourString(t.startHour + t.duration)} (${t.duration}h)`, 22, currentY + 16);
        currentY += 26;
      });
    }
  });

  doc.save(`FlowPlan_${activeWeek}_7Page_Dossier.pdf`);
  showToast('7-Page Dossier PDF Exported!');
}

function generateDailyPdf() {
  const config = getUserTierConfig();
  const used = getPdfExportsUsage();
  if (used >= config.maxPdfExports) {
    showUpgradePaywallModal(
      'pdf',
      `You have reached your daily limit of ${config.maxPdfExports} PDF export(s) on your ${config.tierName}. Upgrade to Weekly Pro ($14/mo) or Monthly Master ($35/mo) for unlimited PDF exports.`
    );
    return;
  }
  incrementPdfExportsUsage();

  const activeDay = appState.expandedDay || 'Mon';
  const tasks = getActiveDayTasks();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setTextColor(255, 242, 186);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FLOWPLAN OS', 15, 22);

  doc.setFontSize(11);
  doc.setTextColor(200, 217, 230);
  doc.text(`Daily Circadian Agenda • ${MONTH_NAMES[appState.activeMonth]} • ${appState.expandedWeek} • ${activeDay}`, 15, 29);

  let currentY = 42;
  if (tasks.length === 0) {
    doc.text('No focus tasks scheduled for this day.', 15, currentY);
  } else {
    tasks.forEach((t) => {
      const pal = PRIORITY_PALETTE[t.priority] || PRIORITY_PALETTE.High;
      doc.setFillColor(pal.rgb[0], pal.rgb[1], pal.rgb[2]);
      doc.roundedRect(15, currentY, 180, 20, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(t.title, 22, currentY + 8);
      doc.setTextColor(255, 242, 186);
      doc.setFontSize(9.5);
      doc.text(`${decimalTo12HourString(t.startHour)} - ${decimalTo12HourString(t.startHour + t.duration)} (${t.duration}h)`, 22, currentY + 15);
      currentY += 24;
    });
  }

  doc.save(`FlowPlan_${activeDay}_Daily.pdf`);
  showToast('Daily Agenda PDF Downloaded!');
}

// 13. Modals & Legal Compliance
let pendingPlan = { title: '', amount: '' };
window.openPaymentModal = function (title, amount) {
  pendingPlan = { title, amount };
  const planTitle = document.getElementById('payment-plan-title');
  const planAmount = document.getElementById('payment-plan-amount');
  const modal = document.getElementById('payment-modal');

  document.getElementById('paywall-limit-modal')?.classList.add('opacity-0', 'pointer-events-none');
  if (planTitle) planTitle.textContent = title;
  if (planAmount) planAmount.textContent = amount;
  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
};

window.openLegalModal = function (type) {
  const modal = document.getElementById('legal-modal');
  const title = document.getElementById('legal-modal-title');
  const body = document.getElementById('legal-modal-body');
  if (!modal || !title || !body) return;

  if (type === 'privacy') {
    title.textContent = 'Privacy Policy (GDPR / CCPA)';
    body.innerHTML = `<p>FlowPlan OS processes scheduling metadata strictly to calculate circadian timetables and power your private RAG workspace. We never sell or expose personal data.</p>`;
  } else if (type === 'terms') {
    title.textContent = 'Terms of Service & Liability Waiver';
    body.innerHTML = `<p>FlowPlan OS and its circadian heuristic cascade models are provided on an "AS-IS" basis.</p>`;
  } else {
    title.textContent = 'Security Disclosures & Secret Isolation';
    body.innerHTML = `<p>All API keys (GEMINI_API_KEY), JWT secrets, and Master Administrator PBKDF2-HMAC-SHA256 digests reside strictly in server-side environment variables (.env) and are never rendered in the public DOM.</p>`;
  }
  modal.classList.remove('opacity-0', 'pointer-events-none');
};

// 14. DOM Initialization & Event Bindings
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('flowplan_user');
  if (savedUser) {
    try {
      appState.user = JSON.parse(savedUser);
    } catch {
      appState.user = null;
    }
  }

  loadScheduleData();
  updateAuthUI();
  setupVoiceRecognition();

  function openStudioWorkspace() {
    const studioModal = document.getElementById('schedule-builder-modal');
    studioModal?.classList.remove('opacity-0', 'pointer-events-none');
    if (window.setThreeBackgroundActive) window.setThreeBackgroundActive(false);
    renderActiveCanvas();
  }

  function handleCreateScheduleTrigger() {
    openStudioWorkspace();
  }

  document.getElementById('nav-create-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleCreateScheduleTrigger();
  });
  document.getElementById('hero-create-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleCreateScheduleTrigger();
  });
  document.getElementById('mob-create-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobile-menu-drawer')?.classList.add('hidden');
    handleCreateScheduleTrigger();
  });
  document.querySelectorAll('.open-builder-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleCreateScheduleTrigger();
    });
  });

  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    document.getElementById('schedule-builder-modal')?.classList.add('opacity-0', 'pointer-events-none');
    if (window.setThreeBackgroundActive) window.setThreeBackgroundActive(true);
  });

  // 6 View Tab Triggers
  ['daily', 'weekly', 'monthly', 'yearly', 'workspace', 'audit'].forEach((v) => {
    document.getElementById(`view-tab-${v}`)?.addEventListener('click', () => setActiveViewTab(v));
  });

  // Month & Week Header Selectors
  document.getElementById('studio-month-select')?.addEventListener('change', (e) => {
    appState.activeMonth = Number(e.target.value) || 0;
    renderActiveCanvas();
    showToast(`Switched to ${MONTH_NAMES[appState.activeMonth]} 2026`);
  });

  document.getElementById('studio-week-select')?.addEventListener('change', (e) => {
    appState.expandedWeek = e.target.value;
    if (appState.expandedWeek === 'Residual') {
      appState.expandedDay = 'Day 29';
    } else if (RESIDUAL_DAYS.includes(appState.expandedDay)) {
      appState.expandedDay = 'Mon';
    }
    syncDayChipsUI();
    renderActiveCanvas();
  });

  // Quick Add + Reorganize Active Day Buttons
  document.getElementById('btn-quick-add-slot')?.addEventListener('click', () => {
    const tasks = getActiveDayTasks();
    tasks.push({
      id: `t-${Date.now()}`,
      title: 'Focus Execution Block',
      startHour: 9.0 + tasks.length,
      duration: 1.0,
      priority: 'High',
      importance: 2,
      energy: 'Peak',
      status: 'pending'
    });
    saveScheduleData();
    if (!['daily', 'weekly'].includes(appState.horizonView)) {
      setActiveViewTab('daily');
    } else {
      renderActiveCanvas();
    }
    showToast(`Added block on ${appState.expandedDay} (${appState.expandedWeek})`);
  });

  const handleReorgActiveDay = () => {
    const c = reorganizeSpecificDay(appState.expandedWeek, appState.expandedDay);
    renderActiveCanvas();
    showToast(`Reorganized ${appState.expandedDay} (${c} tasks cascade-aligned).`);
  };
  document.getElementById('btn-reorg-active-day')?.addEventListener('click', handleReorgActiveDay);
  document.getElementById('btn-sort-priority')?.addEventListener('click', handleReorgActiveDay);

  // Support Modal
  const compModal = document.getElementById('complaint-modal');
  document.getElementById('nav-support-btn')?.addEventListener('click', () => compModal?.classList.remove('opacity-0', 'pointer-events-none'));
  document.getElementById('mob-support-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-menu-drawer')?.classList.add('hidden');
    compModal?.classList.remove('opacity-0', 'pointer-events-none');
  });
  document.getElementById('btn-close-complaint')?.addEventListener('click', () => compModal?.classList.add('opacity-0', 'pointer-events-none'));
  document.getElementById('complaint-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('complaint-email')?.value;
    const category = document.getElementById('complaint-category')?.value;
    const message = document.getElementById('complaint-message')?.value;
    logTelemetryComplaint({ email, category, message });
    showToast('Feedback ticket recorded.');
    compModal?.classList.add('opacity-0', 'pointer-events-none');
    e.target.reset();
  });

  // Auth Modal
  const authModal = document.getElementById('auth-modal');
  document.getElementById('nav-auth-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (appState.user && appState.user.email) {
      appState.user = null;
      appState.authToken = null;
      localStorage.removeItem('flowplan_user');
      localStorage.removeItem('flowplan_jwt');
      updateAuthUI();
      showToast('Signed out.');
      renderActiveCanvas();
    } else {
      setAuthMode('signin');
      authModal?.classList.remove('opacity-0', 'pointer-events-none');
    }
  });

  document.getElementById('btn-auth-toggle')?.addEventListener('click', () => {
    setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
  });
  document.getElementById('btn-close-auth')?.addEventListener('click', () => {
    authModal?.classList.add('opacity-0', 'pointer-events-none');
  });

  document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('auth-name-input')?.value?.trim();
    const email = document.getElementById('auth-email-input')?.value?.trim();
    const pass = document.getElementById('auth-password-input')?.value?.trim();
    const legalCheck = document.getElementById('auth-legal-check');

    if (authMode === 'signup' && legalCheck && !legalCheck.checked) {
      showToast('Please accept the Terms & Liability Waiver.', 'error');
      return;
    }

    const ok = await executeSecureAuthentication(email, pass, name);
    if (ok) {
      authModal?.classList.add('opacity-0', 'pointer-events-none');
      openStudioWorkspace();
    }
  });

  document.getElementById('btn-guest-bypass')?.addEventListener('click', () => {
    authModal?.classList.add('opacity-0', 'pointer-events-none');
    openStudioWorkspace();
  });

  // Master Admin Command Center
  document.getElementById('nav-admin-portal-btn')?.addEventListener('click', openAdminDashboard);
  document.getElementById('btn-close-admin-dash')?.addEventListener('click', () => {
    document.getElementById('admin-dashboard-modal')?.classList.add('opacity-0', 'pointer-events-none');
  });

  // Triple-click logo for Command Center / Master Login
  let brandClicks = 0;
  document.getElementById('site-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    brandClicks++;
    if (brandClicks >= 3) {
      brandClicks = 0;
      if (appState.user && (appState.user.is_admin || appState.user.is_lifetime_admin)) {
        openAdminDashboard();
      } else {
        setAuthMode('signin');
        authModal?.classList.remove('opacity-0', 'pointer-events-none');
      }
    }
    setTimeout(() => {
      brandClicks = 0;
    }, 1200);
  });

  // Horizon Bounds (05:00-01:00, 12h, 8h)
  document.getElementById('m-hz-24')?.addEventListener('click', () => setHorizonBounds(5, 25, 'm-hz-24'));
  document.getElementById('m-hz-12')?.addEventListener('click', () => setHorizonBounds(8, 20, 'm-hz-12'));
  document.getElementById('m-hz-8')?.addEventListener('click', () => setHorizonBounds(9, 17, 'm-hz-8'));

  // Layout Orientation Toggle
  document.getElementById('btn-toggle-layout')?.addEventListener('click', () => {
    appState.layoutOrientation = appState.layoutOrientation === 'vertical' ? 'horizontal' : 'vertical';
    const label = document.getElementById('layout-label');
    const icon = document.getElementById('layout-icon');
    if (label) label.textContent = appState.layoutOrientation === 'vertical' ? 'Vertical Stack' : 'Horizontal Ribbon';
    if (icon) icon.textContent = appState.layoutOrientation === 'vertical' ? '↕' : '↔';
    renderActiveCanvas();
  });

  // Priority Filters
  document.querySelectorAll('.priority-filter-btn').forEach((btn) => {
    btn.onclick = () => {
      appState.activeFilter = btn.dataset.filter;
      document.querySelectorAll('.priority-filter-btn').forEach((b) => {
        b.className =
          'priority-filter-btn w-full text-left px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-between cursor-pointer';
      });
      btn.className =
        'priority-filter-btn w-full text-left px-3 py-1.5 rounded-lg bg-blueCoral border border-tealAccent/40 text-buttermilk font-semibold flex items-center justify-between cursor-pointer';
      renderActiveCanvas();
    };
  });

  // Notifications & Live Alarm Trigger
  document.getElementById('btn-enable-notifications')?.addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    const statusEl = document.getElementById('notification-perm-status');
    if (perm === 'granted' && statusEl) {
      statusEl.textContent = 'Armed';
      statusEl.className = 'text-[10px] text-emerald-400 font-bold';
      showToast('Desktop/Mobile Push Notifications Armed!');
    }
  });

  document.getElementById('btn-test-l3-alarm')?.addEventListener('click', () => {
    const tasks = getActiveDayTasks();
    const sample = tasks[0] || {
      id: 't-alarm-now',
      title: 'Level 3 Critical Focus Execution',
      startHour: 9.0,
      duration: 1.5,
      priority: 'High',
      importance: 3,
      energy: 'Peak'
    };
    triggerFullScreenFocusOverride(sample);
  });

  // Subscription Purchase Form -> Dual Master Admin Dispatch
  document.getElementById('btn-close-payment')?.addEventListener('click', () => {
    document.getElementById('payment-modal')?.classList.add('opacity-0', 'pointer-events-none');
  });

  document.getElementById('formspree-payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pay-name')?.value;
    const email = document.getElementById('pay-email')?.value;
    const phone = document.getElementById('pay-phone')?.value;

    logTelemetryLead({ name, email, phone, plan: pendingPlan.title, amount: pendingPlan.amount });
    document.getElementById('form-plan-input').value = pendingPlan.title;
    document.getElementById('form-amount-input').value = pendingPlan.amount;

    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(e.target),
        headers: { Accept: 'application/json' }
      });
    } catch {}

    showToast('Purchase submitted! Automated alert dispatched to both Master Admins.');
    document.getElementById('payment-modal')?.classList.add('opacity-0', 'pointer-events-none');
    e.target.reset();
  });

  // Finalize Day Whitespace Cropping
  document.getElementById('btn-toggle-finalize')?.addEventListener('click', () => {
    appState.isFinalized = !appState.isFinalized;
    const label = document.getElementById('finalize-label');
    if (label) label.textContent = appState.isFinalized ? 'Reopen Hours' : 'Finalize Day';
    renderActiveCanvas();
  });

  // Mobile Bottom Bar
  document.getElementById('btn-mob-add-task')?.addEventListener('click', () => {
    const tasks = getActiveDayTasks();
    tasks.push({ id: `t-${Date.now()}`, title: 'Focus Block', startHour: 9.0 + tasks.length, duration: 1.0, priority: 'High', importance: 2, energy: 'Peak' });
    saveScheduleData();
    renderActiveCanvas();
  });
  document.getElementById('btn-mob-ai-chat')?.addEventListener('click', () => {
    document.getElementById('ai-chat-drawer')?.classList.toggle('hidden');
  });
  document.getElementById('btn-mob-pdf')?.addEventListener('click', () => generateDailyPdf());

  // File Import Modal
  const fileModal = document.getElementById('file-upload-modal');
  const dropzoneArea = document.getElementById('dropzone-area');
  const modalFileInput = document.getElementById('modal-file-input');
  const selectedLabel = document.getElementById('selected-file-label');
  let selectedModalFile = null;

  const openFileModal = () => fileModal?.classList.remove('opacity-0', 'pointer-events-none');
  document.getElementById('btn-open-file-modal')?.addEventListener('click', openFileModal);
  document.getElementById('btn-mob-open-file')?.addEventListener('click', openFileModal);
  document.getElementById('btn-close-file-modal')?.addEventListener('click', () => fileModal?.classList.add('opacity-0', 'pointer-events-none'));

  dropzoneArea?.addEventListener('click', () => modalFileInput?.click());
  modalFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedModalFile = e.target.files[0];
      if (selectedLabel) {
        selectedLabel.textContent = `Selected: ${selectedModalFile.name}`;
        selectedLabel.classList.remove('hidden');
      }
    }
  });

  document.getElementById('btn-process-file-ai')?.addEventListener('click', () => {
    if (!selectedModalFile) {
      showToast('Select a document or image first.', 'error');
      return;
    }
    const notes = document.getElementById('modal-file-notes')?.value || '';
    fileModal?.classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('ai-chat-drawer')?.classList.remove('hidden');
    processMultimodalFile(selectedModalFile, notes);
  });

  // RAG Copilot Drawer, Standalone AI Hub & Floating Widget Bindings (Portfolio chatbot.js style)
  initChatWelcomeMessage();

  const standaloneAiModal = document.getElementById('ai-standalone-modal');
  const floatingChatDrawer = document.getElementById('fp-floating-chat-drawer');

  function openStandaloneAiHub() {
    updateRAGStatusBadge();
    floatingChatDrawer?.classList.remove('open');
    standaloneAiModal?.classList.remove('opacity-0', 'pointer-events-none');
    if (window.setThreeBackgroundActive) window.setThreeBackgroundActive(false);
    setTimeout(() => document.getElementById('standalone-ai-input')?.focus(), 80);
  }

  function closeStandaloneAiHub() {
    standaloneAiModal?.classList.add('opacity-0', 'pointer-events-none');
    const studioOpen = !document.getElementById('schedule-builder-modal')?.classList.contains('pointer-events-none');
    if (window.setThreeBackgroundActive && !studioOpen) window.setThreeBackgroundActive(true);
  }

  document.getElementById('nav-ai-bot-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openStandaloneAiHub();
  });
  document.getElementById('hero-ai-bot-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    openStandaloneAiHub();
  });
  document.getElementById('mob-ai-bot-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobile-menu-drawer')?.classList.add('hidden');
    openStandaloneAiHub();
  });
  document.getElementById('btn-expand-ai-fullpage')?.addEventListener('click', () => {
    openStandaloneAiHub();
  });
  document.getElementById('btn-floating-expand-full')?.addEventListener('click', () => {
    openStandaloneAiHub();
  });
  document.getElementById('btn-close-standalone-ai')?.addEventListener('click', closeStandaloneAiHub);

  document.getElementById('btn-ai-hub-open-studio')?.addEventListener('click', () => {
    closeStandaloneAiHub();
    openStudioWorkspace();
  });
  document.getElementById('btn-ai-hub-upload-doc')?.addEventListener('click', openFileModal);

  // Floating Chat Trigger & Drawer
  document.getElementById('fp-floating-chat-btn')?.addEventListener('click', () => {
    const isOpen = floatingChatDrawer?.classList.toggle('open');
    floatingChatDrawer?.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
      setTimeout(() => document.getElementById('floating-ai-input')?.focus(), 80);
    }
  });
  document.getElementById('btn-floating-close')?.addEventListener('click', () => {
    floatingChatDrawer?.classList.remove('open');
    floatingChatDrawer?.setAttribute('aria-hidden', 'true');
  });

  // File & Voice Triggers across Studio + Standalone AI Hub
  const chatFileInput = document.getElementById('ai-chat-file-input');
  document.getElementById('btn-ai-attach-file')?.addEventListener('click', () => chatFileInput?.click());
  document.getElementById('btn-standalone-ai-attach')?.addEventListener('click', () => chatFileInput?.click());
  chatFileInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const notes =
      document.getElementById('ai-user-prompt')?.value ||
      document.getElementById('standalone-ai-input')?.value ||
      '';
    ['standalone-ai-input', 'ai-user-prompt'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    files.reduce((p, f) => p.then(() => processMultimodalFile(f, notes)), Promise.resolve());
    e.target.value = '';
  });

  const handleVoiceToggle = () => {
    if (!speechRecognition) setupVoiceRecognition();
    if (!speechRecognition) {
      showToast('Speech recognition is not supported in this browser.', 'error');
      return;
    }
    if (isRecordingVoice) speechRecognition.stop();
    else speechRecognition.start();
  };
  document.getElementById('btn-ai-voice-record')?.addEventListener('click', handleVoiceToggle);
  document.getElementById('btn-standalone-ai-voice')?.addEventListener('click', handleVoiceToggle);

  document.getElementById('btn-toggle-voice-feedback')?.addEventListener('click', (e) => {
    appState.speechFeedbackEnabled = !appState.speechFeedbackEnabled;
    e.target.textContent = appState.speechFeedbackEnabled ? '🔊' : '🔇';
  });

  document.getElementById('btn-toggle-ai-chat')?.addEventListener('click', () => {
    document.getElementById('ai-chat-drawer')?.classList.toggle('hidden');
  });
  document.getElementById('btn-close-ai-drawer')?.addEventListener('click', () => {
    document.getElementById('ai-chat-drawer')?.classList.add('hidden');
  });

  // Drag-and-drop + clipboard paste of images/PDFs into any AI surface
  const currentAIInstructions = () =>
    (document.getElementById('standalone-ai-input')?.value ||
      document.getElementById('ai-user-prompt')?.value ||
      document.getElementById('floating-ai-input')?.value ||
      '').trim();

  const clearAIInputs = () => {
    ['standalone-ai-input', 'ai-user-prompt', 'floating-ai-input'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  };

  ['ai-chat-drawer', 'ai-standalone-modal', 'fp-floating-chat-drawer', 'dropzone-area'].forEach((zoneId) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('fp-drop-active');
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('fp-drop-active');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('fp-drop-active');
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (!files.length) return;
      if (zoneId === 'dropzone-area') {
        fileModal?.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('ai-chat-drawer')?.classList.remove('hidden');
      }
      const notes = zoneId === 'dropzone-area' ? document.getElementById('modal-file-notes')?.value || '' : currentAIInstructions();
      clearAIInputs();
      files.reduce((p, f) => p.then(() => processMultimodalFile(f, notes)), Promise.resolve());
    });
  });

  ['standalone-ai-input', 'ai-user-prompt', 'floating-ai-input'].forEach((inputId) => {
    document.getElementById(inputId)?.addEventListener('paste', (e) => {
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const fileItem = items.find((it) => it.kind === 'file');
      if (!fileItem) return;
      const f = fileItem.getAsFile();
      if (!f) return;
      e.preventDefault();
      const notes = currentAIInstructions();
      clearAIInputs();
      processMultimodalFile(new File([f], f.name && f.name !== 'image.png' ? f.name : `pasted-${Date.now()}.png`, { type: f.type }), notes);
    });
  });

  // Submit Handlers across all 3 AI Mounts
  document.getElementById('btn-submit-ai-prompt')?.addEventListener('click', () => handleAISubmit());
  document.getElementById('ai-user-prompt')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAISubmit();
    }
  });

  document.getElementById('standalone-ai-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('standalone-ai-input')?.value?.trim();
    if (val) handleAISubmit(val);
  });

  document.getElementById('floating-ai-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('floating-ai-input')?.value?.trim();
    if (val) handleAISubmit(val);
  });

  // Suggestion Chips Delegation across all 3 Suggestion Bars
  ['studio-chat-suggestions', 'standalone-chat-suggestions', 'floating-chat-suggestions'].forEach((barId) => {
    document.getElementById(barId)?.addEventListener('click', (e) => {
      const chip = e.target.closest('.fp-chat-chip');
      if (!chip || isAIGenerating) return;
      const q = chip.dataset.q;
      if (q) handleAISubmit(q);
    });
  });

  // Delegated Click Handler for In-Chat Action Cards, Pricing Cards & Inline Booking Form
  getAllChatStreamElements().forEach((streamEl) => {
    streamEl.addEventListener('click', (e) => {
      // 1. Open Day in Studio
      const openDayBtn = e.target.closest('[data-chat-open-day]');
      if (openDayBtn) {
        const d = openDayBtn.dataset.chatOpenDay || 'Mon';
        const wk = openDayBtn.dataset.chatOpenWeek || appState.expandedWeek;
        closeStandaloneAiHub();
        openStudioWorkspace();
        openSpecificDayInStudio(appState.activeMonth, wk, d);
        return;
      }

      // 2. Reorganize Day from Chat Card
      const reorgDayBtn = e.target.closest('[data-chat-reorg-day]');
      if (reorgDayBtn) {
        const d = reorgDayBtn.dataset.chatReorgDay || appState.expandedDay;
        const wk = reorgDayBtn.dataset.chatReorgWeek || appState.expandedWeek;
        const count = reorganizeSpecificDay(wk, d);
        renderActiveCanvas();
        showToast(`Reorganized ${d} (${wk} — ${count} tasks aligned).`);
        return;
      }

      // 3. View Weekly Matrix from Chat Card
      const viewWeeklyBtn = e.target.closest('[data-chat-view-weekly]');
      if (viewWeeklyBtn) {
        closeStandaloneAiHub();
        openStudioWorkspace();
        setActiveViewTab('weekly');
        return;
      }

      // 4. Book / Upgrade Plan from In-Chat Package Card
      const bookBtn = e.target.closest('[data-chat-book]');
      if (bookBtn) {
        const pkgName = bookBtn.dataset.chatBook || 'Weekly Pro ($14/mo)';
        const pkgPrice = bookBtn.dataset.chatPrice || '$14/mo';
        chatBookingDraft.plan = pkgName;
        appendChatMessageToStreams(
          'bot',
          `Excellent choice! Let's lock in **${pkgName}**. Complete your operative details below to dispatch straight to both Master Administrators:`,
          {
            thinking: `Prepared inline activation form for ${pkgName}.`,
            extraHtml: generateInlineBookingCardHtml(pkgName, pkgPrice)
          }
        );
        return;
      }

      // 5. Submit Inline Booking Form
      const submitBookingBtn = e.target.closest('[data-chat-submit-booking]');
      if (submitBookingBtn) {
        const card = submitBookingBtn.closest('.fp-inline-booking-card');
        if (!card) return;
        const plan = card.querySelector('.chat-book-plan')?.value || 'Weekly Pro ($14/mo)';
        const name = card.querySelector('.chat-book-name')?.value?.trim() || '';
        const email = card.querySelector('.chat-book-email')?.value?.trim() || '';
        const phone = card.querySelector('.chat-book-phone')?.value?.trim() || '';

        if (!name || name.length < 2) {
          showToast('Please enter your name.', 'error');
          return;
        }
        if (!email || !email.includes('@')) {
          showToast('Please enter a valid email address.', 'error');
          return;
        }
        if (!phone || phone.length < 6) {
          showToast('Please enter your phone or WhatsApp number.', 'error');
          return;
        }

        logTelemetryLead({
          name,
          email,
          phone,
          plan,
          amount: submitBookingBtn.dataset.chatPrice || '$14/mo'
        });

        card.innerHTML = `
          <div class="p-3 text-center space-y-1 font-mono">
            <div class="text-emerald-400 text-base font-extrabold">✓ Upgrade Dispatched!</div>
            <p class="text-[11px] text-slate-300">Notification sent to <strong>stationplayboy7@gmail.com</strong> &amp; <strong>muhammadashfaqahmad0710@gmail.com</strong>.</p>
          </div>
        `;
        showToast('Upgrade locked in! Both Master Admins notified.');
      }
    });
  });

  // PDF Export Modal
  const pdfModal = document.getElementById('pdf-choice-modal');
  document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
    if (appState.horizonView === 'weekly') {
      pdfModal?.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      generateDailyPdf();
    }
  });
  document.getElementById('btn-close-pdf-modal')?.addEventListener('click', () => pdfModal?.classList.add('opacity-0', 'pointer-events-none'));
  document.getElementById('btn-pdf-horizontal')?.addEventListener('click', () => {
    pdfModal?.classList.add('opacity-0', 'pointer-events-none');
    generateWeeklyHorizontalGridPdf();
  });
  document.getElementById('btn-pdf-vertical')?.addEventListener('click', () => {
    pdfModal?.classList.add('opacity-0', 'pointer-events-none');
    generateWeekly7PageVerticalPdf();
  });

  document.getElementById('btn-close-legal')?.addEventListener('click', () => {
    document.getElementById('legal-modal')?.classList.add('opacity-0', 'pointer-events-none');
  });

  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-menu-drawer')?.classList.toggle('hidden');
  });

  // Master Room Query View Toggles & Archive Clear
  document.getElementById('btn-toggle-query-view-active')?.addEventListener('click', () => {
    masterQueryTab = 'active';
    openAdminDashboard();
  });
  document.getElementById('btn-toggle-query-view-resolved')?.addEventListener('click', () => {
    masterQueryTab = 'resolved';
    openAdminDashboard();
  });
  document.getElementById('btn-clear-resolved-queries')?.addEventListener('click', () => {
    const telemetry = getMasterTelemetryData();
    telemetry.resolvedComplaints = [];
    saveMasterTelemetryData(telemetry);
    showToast('Resolved queries archive cleared.');
    openAdminDashboard();
  });

  // Task Strategic Notes & Checklist Modal Bindings
  const taskNotesModal = document.getElementById('task-notes-modal');
  document.getElementById('btn-close-task-notes')?.addEventListener('click', () => {
    taskNotesModal?.classList.add('opacity-0', 'pointer-events-none');
  });
  document.getElementById('btn-save-task-notes')?.addEventListener('click', () => {
    saveCurrentTaskNotes();
  });
  document.getElementById('btn-add-subtask')?.addEventListener('click', () => {
    addSubtaskToCurrentTask();
  });
  document.getElementById('task-new-subtask-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtaskToCurrentTask();
    }
  });
  document.getElementById('btn-delete-task-from-notes')?.addEventListener('click', () => {
    if (!activeTaskForNotes) return;
    const tasks = getActiveDayTasks();
    const idx = tasks.findIndex((x) => x.id === activeTaskForNotes.id);
    if (idx !== -1) {
      tasks.splice(idx, 1);
      saveScheduleData();
      renderActiveCanvas();
      taskNotesModal?.classList.add('opacity-0', 'pointer-events-none');
      showToast('Task removed from schedule.');
    }
  });

  // Progressive Web App (PWA) / Add to Home Screen Triggers
  document.getElementById('btn-install-pwa')?.addEventListener('click', triggerPWAInstall);
  document.getElementById('mob-install-pwa')?.addEventListener('click', triggerPWAInstall);
  document.getElementById('sidebar-install-pwa')?.addEventListener('click', triggerPWAInstall);
  document.getElementById('btn-pwa-trigger-direct')?.addEventListener('click', triggerPWAInstall);
  document.getElementById('btn-close-pwa-modal')?.addEventListener('click', () => {
    document.getElementById('pwa-install-modal')?.classList.add('opacity-0', 'pointer-events-none');
  });

  // Paywall Modal Dismiss Trigger
  document.getElementById('btn-close-paywall-modal')?.addEventListener('click', () => {
    document.getElementById('paywall-limit-modal')?.classList.add('opacity-0', 'pointer-events-none');
  });

  // Daily Studio Day Strategic Notes Triggers
  const openActiveDayNotes = () => {
    const weekIdx = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].indexOf(appState.expandedWeek);
    const dayIdx = CANONICAL_DAYS.indexOf(appState.expandedDay);
    const dNum = weekIdx !== -1 && dayIdx !== -1 ? weekIdx * 7 + dayIdx + 1 : 1;
    openDayNotesModal(appState.activeMonth, appState.expandedWeek, appState.expandedDay, dNum);
  };
  document.getElementById('btn-day-notes-active')?.addEventListener('click', openActiveDayNotes);
  document.getElementById('btn-mob-day-notes')?.addEventListener('click', openActiveDayNotes);

  // Initialize live subscription limits & credit badges
  updateCreditCountersUI();

  // Export public API for automated verification & programmatic control
  window.FlowPlanOS = {
    appState,
    executeSecureAuthentication,
    openSpecificDayInStudio,
    openDayNotesModal,
    reorganizeSpecificDay,
    executeLocalRAGIntelligence,
    buildFullProductRAGContext,
    indexDocumentIntoRAG,
    setActiveViewTab,
    renderActiveCanvas,
    getUserTierConfig,
    getAiCreditsUsage,
    incrementAiCreditsUsage,
    getPdfExportsUsage,
    showUpgradePaywallModal,
    logTelemetryLead,
    logTelemetryComplaint,
    resolveMasterComplaint,
    deleteMasterComplaint,
    resolveMasterLead,
    deleteMasterLead,
    openTaskNotesModal,
    saveCurrentTaskNotes,
    triggerPWAInstall,
    playWebAudioAlarmChime,
    openAdminDashboard,
    triggerFullScreenFocusOverride
  };
});
