var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwplSLZ3_I5hLQtr-Unhk_QC3zlGCs4i1_Oqpvvxn5oF3RwY-3xWCCLqWyO2Znl25mF/exec';
var currentUser  = null;
var currentAdmin = null;

var ADMIN_ACCOUNTS = {
  'admin':   { pass:'cra2568',    name:'Super Admin',           project:'ALL' },
  'gkicka':  { pass:'kicka2568',  name:'กองกิจการนักศึกษา',   project:'กองกิจการนักศึกษา' },
  'nursing': { pass:'nurse2568',  name:'คณะพยาบาลศาสตร์',     project:'คณะพยาบาลศาสตร์' },
  'edu':     { pass:'edu2568',    name:'คณะครุศาสตร์',          project:'คณะครุศาสตร์' }
};

// ── Modal ──────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}
function showUserLogin()  { openModal('userLoginModal'); }
function showUserSignup() { openModal('userSignupModal'); }
function showAdminLogin() { openModal('adminLoginModal'); }

// ── API ────────────────────────────────────────────────────
function callAPI(action, params) {
  var url = APPS_SCRIPT_URL + '?action=' + action;
  if (params) {
    Object.keys(params).forEach(function(k) {
      url += '&' + k + '=' + encodeURIComponent(params[k]);
    });
  }
  return fetch(url)
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, message: 'เชื่อมต่อไม่ได้' }; });
}

// ── Navigation ─────────────────────────────────────────────
function showPage(id) {
  var requireLogin = ['register-time', 'history', 'profile'];
  if (requireLogin.indexOf(id) !== -1 && !currentUser) {
    openModal('userLoginModal');
    return;
  }
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('nav button').forEach(function(b) { b.classList.remove('active'); });
  var nb = document.getElementById('nav-' + id);
  if (nb) nb.classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'history' && currentUser) loadHistory(currentUser.code);
  if (id === 'report') loadSummary();
  if (id === 'admin') { loadPendingLogs(); loadAdminActivities(); loadAdminReport(); }
}

function switchTab(btn, targetId) {
  var tabs = btn.closest('.tabs');
  tabs.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var el = tabs.nextElementSibling;
  while (el) { if (el.id) el.style.display = 'none'; el = el.nextElementSibling; }
  document.getElementById(targetId).style.display = 'block';
}

function showToast(msg) {
  var t = document.getElementById('toastMsg');
  t.innerHTML = msg || 'บันทึกสำเร็จ';
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 2500);
}
function showSuccess() { showToast('✅ บันทึกข้อมูลสำเร็จ!'); showPage('history'); }

// ── User Auth ──────────────────────────────────────────────
function doUserLogin() {
  var code  = document.getElementById('loginCode').value.trim();
  var pass  = document.getElementById('loginPass').value;
  var err   = document.getElementById('loginError');
  if (!code || !pass) {
    err.textContent = 'กรุณากรอกรหัสและรหัสผ่าน';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';
  callAPI('loginUser', { code: code, password: pass }).then(function(res) {
    if (res.success) {
      currentUser = res.data;
      closeModal('userLoginModal');
      setLoggedIn(res.data);
      showPage('home');
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function doUserSignup() {
  var err   = document.getElementById('signupError');
  var pdpa  = document.getElementById('signupPdpa1').checked;
  var code  = document.getElementById('su_code').value.trim();
  var fname = document.getElementById('su_fname').value.trim();
  var lname = document.getElementById('su_lname').value.trim();
  var type  = document.getElementById('su_type').value;
  var pos   = document.getElementById('su_pos').value.trim();
  var dept  = document.getElementById('su_dept').value.trim();
  var phone = document.getElementById('su_phone').value.trim();
  var email = document.getElementById('su_email').value.trim();
  var pass  = document.getElementById('su_pass').value;
  var pass2 = document.getElementById('su_pass2').value;

  if (!pdpa) { err.textContent = 'กรุณายืนยัน PDPA'; err.style.display = 'block'; return; }
  if (!code || !fname || !lname || !pos || !dept) { err.textContent = 'กรุณากรอกข้อมูลให้ครบ'; err.style.display = 'block'; return; }
  if (pass.length < 6) { err.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว'; err.style.display = 'block'; return; }
  if (pass !== pass2) { err.textContent = 'รหัสผ่านไม่ตรงกัน'; err.style.display = 'block'; return; }
  err.style.display = 'none';

  callAPI('signupUser', {
    code: code, firstName: fname, lastName: lname, type: type,
    position: pos, department: dept, phone: phone, email: email, password: pass
  }).then(function(res) {
    if (res.success) {
      closeModal('userSignupModal');
      currentUser = { code: code, firstName: fname, lastName: lname, type: type,
        position: pos, department: dept, phone: phone, email: email, totalHours: 0 };
      setLoggedIn(currentUser);
      showPage('home');
      showToast('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ' + fname);
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function setLoggedIn(user) {
  document.getElementById('btn-nav-login').style.display  = 'none';
  document.getElementById('btn-nav-signup').style.display = 'none';
  document.getElementById('btn-nav-user').style.display   = 'inline-flex';
  document.getElementById('btn-nav-logout').style.display = 'inline-flex';
  document.getElementById('nav-username').textContent = user.firstName || user.code;
}

function userLogout() {
  currentUser = null;
  document.getElementById('btn-nav-login').style.display  = 'inline-flex';
  document.getElementById('btn-nav-signup').style.display = 'inline-flex';
  document.getElementById('btn-nav-user').style.display   = 'none';
  document.getElementById('btn-nav-logout').style.display = 'none';
  showPage('home');
}

// ── Admin Auth ─────────────────────────────────────────────
function doAdminLogin() {
  var user = document.getElementById('adminUser').value.trim().toLowerCase();
  var pass = document.getElementById('adminPass').value;
  var err  = document.getElementById('adminLoginError');
  var acc  = ADMIN_ACCOUNTS[user];
  if (acc && acc.pass === pass) {
    currentAdmin = { username: user, name: acc.name, project: acc.project };
    closeModal('adminLoginModal');
    var suffix = acc.project !== 'ALL' ? ' | โครงการ: ' + acc.project : ' | ดูแลทุกโครงการ';
    document.getElementById('adminWelcome').textContent = 'ยินดีต้อนรับ ' + acc.name + suffix;
    showPage('admin');
  } else {
    err.style.display = 'block';
  }
}
function adminLogout() { currentAdmin = null; showPage('home'); }

// ── Activities ─────────────────────────────────────────────
function loadActivities() {
  callAPI('getActivities').then(function(res) {
    if (!res.success) return;
    var tbody = document.querySelector('#activitiesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    res.data.forEach(function(a) {
      var sc  = a.status === 'เปิดรับ' ? 'pill-green' : a.status === 'เสร็จสิ้น' ? 'pill-blue' : 'pill-red';
      var btn = a.status === 'เปิดรับ'
        ? '<button class="btn btn-primary" style="padding:6px 16px;font-size:13px;" onclick="goRegister()">สมัคร</button>'
        : '<button class="btn btn-gray" style="padding:6px 16px;font-size:13px;" disabled>ปิดแล้ว</button>';
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><strong>' + a.name + '</strong></td>'
        + '<td>' + a.type + '</td><td>' + a.date + '</td>'
        + '<td>' + a.hours + ' ชม.</td><td>' + a.organizer + '</td>'
        + '<td>' + a.registered + '/' + a.capacity + '</td>'
        + '<td><span class="status-pill ' + sc + '">' + a.status + '</span></td>'
        + '<td>' + btn + '</td>';
      tbody.appendChild(tr);
    });
  });
}

function goRegister() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  showPage('register-time');
}

function loadSummary() {
  callAPI('getSummary').then(function(res) {
    if (!res.success) return;
    var map = {
      'statTotal': 'จิตอาสาทั้งหมด', 'statStaff': 'บุคลากร',
      'statStudent': 'นักศึกษา', 'statHours': 'ชั่วโมงที่อนุมัติแล้ว'
    };
    Object.keys(map).forEach(function(id) {
      var e = document.getElementById(id);
      if (e && res.data[map[id]] !== undefined) e.textContent = res.data[map[id]];
    });
  });
}

function loadHistory(code) {
  if (!code) return;
  callAPI('getHistory', { code: code }).then(function(res) {
    if (!res.success) return;
    var tbody = document.querySelector('#historyTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    var total = 0;
    res.data.forEach(function(log) {
      total += Number(log.hours);
      var sc = log.status === 'อนุมัติ' ? 'pill-green' : 'pill-orange';
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + log.date + '</td><td>' + log.organizer + '</td>'
        + '<td>' + log.hours + ' ชม.</td><td>' + total + ' ชม.</td>'
        + '<td><span class="status-pill ' + sc + '">' + log.status + '</span></td>';
      tbody.appendChild(tr);
    });
    var el = document.getElementById('totalHours');
    if (el) el.textContent = total;
  });
}

function submitTimeLog() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  showSuccess();
}

// ── Admin ──────────────────────────────────────────────────
function loadPendingLogs() {
  var tbody = document.getElementById('pendingLogsTable');
  if (!tbody || !currentAdmin) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#6b7c93;">กำลังโหลด...</td></tr>';
  var params = currentAdmin.project !== 'ALL' ? { project: currentAdmin.project } : {};
  callAPI('getPendingLogs', params).then(function(res) {
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7c93;">ไม่มีรายการรออนุมัติ</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    res.data.forEach(function(log) {
      var tr = document.createElement('tr');
      var btnA = document.createElement('button');
      btnA.textContent = 'อนุมัติ';
      btnA.style.cssText = 'background:#27ae60;color:white;border:none;padding:6px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;margin-right:4px;';
      btnA.onclick = function() { approveLog(log.logId, 'อนุมัติ'); };

      var btnR = document.createElement('button');
      btnR.textContent = 'ปฏิเสธ';
      btnR.style.cssText = 'background:#e74c3c;color:white;border:none;padding:6px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnR.onclick = function() { approveLog(log.logId, 'ปฏิเสธ'); };

      var tdBtn = document.createElement('td');
      tdBtn.appendChild(btnA); tdBtn.appendChild(btnR);

      tr.innerHTML = '<td><strong>' + log.fullName + '</strong></td>'
        + '<td>' + log.volunteerCode + '</td><td>' + log.organizer + '</td>'
        + '<td>' + log.date + '</td><td><strong>' + log.hours + ' ชม.</strong></td>'
        + '<td><span class="status-pill pill-orange">รออนุมัติ</span></td>';
      tr.appendChild(tdBtn);
      tbody.appendChild(tr);
    });
  });
}

function approveLog(logId, status) {
  if (!confirm('ยืนยันการ' + status + '?')) return;
  callAPI('updateLogStatus', { logId: logId, status: status, approver: currentAdmin.name })
    .then(function(res) {
      showToast(res.success ? 'สำเร็จ' : res.message);
      if (res.success) loadPendingLogs();
    });
}

function loadAdminActivities() {
  var tbody = document.getElementById('adminActivitiesTable');
  if (!tbody || !currentAdmin) return;
  callAPI('getActivities').then(function(res) {
    if (!res.success) return;
    var acts = res.data.filter(function(a) {
      return currentAdmin.project === 'ALL' || a.organizer === currentAdmin.project;
    });
    tbody.innerHTML = '';
    var sel = document.getElementById('filterActivity');
    sel.innerHTML = '<option value="">-- เลือกกิจกรรม --</option>';
    acts.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.id; opt.textContent = a.name;
      sel.appendChild(opt);

      var sc = a.status === 'เปิดรับ' ? 'pill-green' : a.status === 'เสร็จสิ้น' ? 'pill-blue' : 'pill-red';
      var tr = document.createElement('tr');

      var btn = document.createElement('button');
      btn.textContent = 'แก้สถานะ';
      btn.style.cssText = 'background:#1a5f7a;color:white;border:none;padding:6px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btn.onclick = (function(actId, actStatus) {
        return function() { toggleActivityStatus(actId, actStatus); };
      })(a.id, a.status);

      var tdBtn = document.createElement('td');
      tdBtn.appendChild(btn);

      tr.innerHTML = '<td><strong>' + a.name + '</strong></td>'
        + '<td>' + a.type + '</td><td>' + a.date + '</td>'
        + '<td>' + a.hours + ' ชม.</td>'
        + '<td>' + a.registered + '/' + a.capacity + '</td>'
        + '<td><span class="status-pill ' + sc + '">' + a.status + '</span></td>';
      tr.appendChild(tdBtn);
      tbody.appendChild(tr);
    });
    if (!acts.length) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7c93;">ไม่มีกิจกรรม</td></tr>';
  });
}

function showAddActivity() {
  var f = document.getElementById('addActivityForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function submitAddActivity() {
  var name  = document.getElementById('act_name').value.trim();
  var date  = document.getElementById('act_date').value;
  var hours = document.getElementById('act_hours').value;
  var cap   = document.getElementById('act_cap').value;
  if (!name || !date || !hours || !cap) { alert('กรุณากรอกข้อมูลให้ครบ'); return; }
  var org = currentAdmin.project !== 'ALL' ? currentAdmin.project : 'Admin';
  callAPI('addActivity', {
    name: name, type: document.getElementById('act_type').value,
    date: date, hours: hours, capacity: cap, organizer: org,
    location: document.getElementById('act_loc').value,
    detail: document.getElementById('act_detail').value
  }).then(function(res) {
    showToast(res.success ? 'เพิ่มกิจกรรมสำเร็จ' : res.message);
    if (res.success) { document.getElementById('addActivityForm').style.display = 'none'; loadAdminActivities(); }
  });
}

function toggleActivityStatus(id, current) {
  var ns = current === 'เปิดรับ' ? 'ปิดรับ' : 'เปิดรับ';
  if (!confirm('เปลี่ยนสถานะเป็น "' + ns + '"?')) return;
  callAPI('updateActivityStatus', { activityId: id, status: ns })
    .then(function(res) { if (res.success) loadAdminActivities(); });
}

function loadMembers() {
  var actId = document.getElementById('filterActivity').value;
  if (!actId) { alert('กรุณาเลือกกิจกรรมก่อน'); return; }
  callAPI('getMembersByActivity', { activityId: actId }).then(function(res) {
    var tbody = document.getElementById('membersTable');
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7c93;">ไม่มีผู้สมัคร</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    res.data.forEach(function(m) {
      var sc = m.status === 'อนุมัติ' ? 'pill-green' : 'pill-orange';
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + m.volunteerCode + '</td><td><strong>' + m.fullName + '</strong></td>'
        + '<td>' + (m.type||'-') + '</td><td>' + (m.department||'-') + '</td>'
        + '<td>' + m.date + '</td><td>' + m.hours + ' ชม.</td>'
        + '<td><span class="status-pill ' + sc + '">' + m.status + '</span></td>';
      tbody.appendChild(tr);
    });
  });
}

function issueCerts(level, minHours) {
  var ln = level === 'gold' ? 'ทอง' : level === 'silver' ? 'เงิน' : 'ทองแดง';
  if (!confirm('ออกเกียรติบัตรระดับ' + ln + '?')) return;
  callAPI('issueCertificates', { minHours: minHours, level: ln, approver: currentAdmin.name })
    .then(function(res) {
      var el = document.getElementById('certResult');
      el.style.display = 'block';
      el.textContent = res.success ? 'ออกเกียรติบัตรระดับ' + ln + ' จำนวน ' + (res.count||0) + ' ใบ' : res.message;
    });
}

function loadAdminReport() {
  if (!currentAdmin) return;
  callAPI('getAdminReport', { project: currentAdmin.project }).then(function(res) {
    if (!res.success) return;
    var d = res.data;
    var s = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v || '-'; };
    s('adminStatAct', d['กิจกรรม']); s('adminStatVol', d['จิตอาสา']);
    s('adminStatHours', d['ชั่วโมง']); s('adminStatPending', d['รออนุมัติ']);
  });
}

// ── Init ───────────────────────────────────────────────────
(function() {
  ['tab-record','hist-b','rep-person','rep-cert',
   'admin-activities','admin-members','admin-cert','admin-report'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  loadActivities();
  loadSummary();
})();
