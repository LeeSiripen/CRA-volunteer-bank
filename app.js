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
  if (id === 'admin' && currentAdmin && currentAdmin.isSuperAdmin) { loadAdminList(); }
}

function switchTab(btn, targetId) {
  var tabs = btn.closest('.tabs');
  tabs.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var el = tabs.nextElementSibling;
  while (el) { if (el.id) el.style.display = 'none'; el = el.nextElementSibling; }
  document.getElementById(targetId).style.display = 'block';
  if (targetId === 'admin-manage') loadAdminList();
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
  err.style.display = 'none';

  // First check local hardcoded (super admin only)
  var acc = ADMIN_ACCOUNTS[user];
  if (acc && acc.pass === pass) {
    currentAdmin = { username: user, name: acc.name, project: acc.project, isSuperAdmin: true };
    closeModal('adminLoginModal');
    _afterAdminLogin();
    return;
  }

  // Then check Google Sheets Admins
  callAPI('loginAdmin', { username: user, password: pass }).then(function(res) {
    if (res.success) {
      currentAdmin = { username: user, name: res.data.name, project: res.data.project, isSuperAdmin: false };
      closeModal('adminLoginModal');
      _afterAdminLogin();
    } else {
      err.style.display = 'block';
    }
  });
}

function _afterAdminLogin() {
  var suffix = currentAdmin.project !== 'ALL' ? ' | โครงการ: ' + currentAdmin.project : ' | ดูแลทุกโครงการ';
  document.getElementById('adminWelcome').textContent = 'ยินดีต้อนรับ ' + currentAdmin.name + suffix;

  // Show "จัดการ Admin" tab only for Super Admin
  var manageTab = document.getElementById('tab-manage-admins');
  if (manageTab) manageTab.style.display = currentAdmin.isSuperAdmin ? 'inline-flex' : 'none';

  showPage('admin');
}
function adminLogout() { currentAdmin = null; showPage('home'); }

// ── Activities ─────────────────────────────────────────────
// Store all activities for client-side filtering
var allActivities = [];

function loadActivities() {
  callAPI('getActivities').then(function(res) {
    if (!res.success) return;
    allActivities = res.data;

    // Populate organizer dropdown
    var orgSel = document.getElementById('actFilterOrg');
    if (orgSel) {
      var orgs = {};
      res.data.forEach(function(a) { orgs[a.organizer] = true; });
      orgSel.innerHTML = '<option value="">ทุกหน่วยงาน</option>';
      Object.keys(orgs).forEach(function(o) {
        orgSel.innerHTML += '<option value="'+o+'">'+o+'</option>';
      });
    }

    // Fill activities table with filter support
    if (!res.data.length) {
      var tbody2 = document.querySelector('#activitiesTable tbody');
      if (tbody2) tbody2.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีกิจกรรม Admin สามารถเพิ่มกิจกรรมได้ที่หน้า Admin Panel</td></tr>';
    } else {
      renderActivitiesTable(res.data);
      var counter = document.getElementById('actFilterCount');
      if (counter) counter.textContent = res.data.length + '/' + res.data.length;
    }

    // Fill home activity cards (หน้าแรก)
    var homeGrid = document.getElementById('homeActivityCards');
    if (homeGrid) {
      homeGrid.innerHTML = '';
      var recent = res.data.filter(function(a) { return a.status !== 'ยกเลิก'; }).slice(0, 3);
      if (!recent.length) {
        homeGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);font-size:15px;">ยังไม่มีกิจกรรม<br><span style="font-size:13px;">Admin สามารถเพิ่มกิจกรรมได้ที่ Admin Panel</span></div>';
        return;
      }
      var colors = [
        'linear-gradient(135deg,#d4f4e1,#a8e6cf)',
        'linear-gradient(135deg,#ffecd2,#fcb69f)',
        'linear-gradient(135deg,#e8d8f0,#c3aae0)',
        'linear-gradient(135deg,#d6eaff,#a3c8f0)',
      ];
      var icons = { 'สิ่งแวดล้อม':'🌳','บริการสุขภาพ':'❤️','สอนหนังสือ':'📚','เล่านิทาน':'📖','งานช่าง':'🔧','อื่นๆ':'⭐' };
      recent.forEach(function(a, i) {
        var icon = icons[a.type] || '⭐';
        var badge = a.status === 'เปิดรับ'
          ? '<span class="card-badge">เปิดรับ</span>'
          : '<span class="card-badge" style="background:var(--text-muted);">'+a.status+'</span>';
        var card = document.createElement('div');
        card.className = 'activity-card';
        card.style.cursor = 'pointer';
        card.onclick = function() { showPage('activities'); };
        card.innerHTML = '<div class="card-img" style="background:'+colors[i%colors.length]+'">'
          + icon + badge + '</div>'
          + '<div class="card-body">'
          + '<h3>' + a.name + '</h3>'
          + '<p>' + (a.detail || a.organizer) + '</p>'
          + '<div class="card-meta">'
          + '<span>📅 ' + a.date + '</span>'
          + '<span>⏱️ ' + a.hours + ' ชม.</span>'
          + '<span>👥 ' + a.registered + '/' + a.capacity + ' คน</span>'
          + '</div></div>';
        homeGrid.appendChild(card);
      });
    }
  });
}

function goRegister() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  showPage('register-time');
}

function loadSummary() {
  callAPI('getSummary').then(function(res) {
    if (!res.success) return;
    var d = res.data;
    var s = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = (val !== undefined && val !== '') ? val : '0'; };
    s('statTotal',    d['จิตอาสาทั้งหมด']);
    s('statHours',    d['ชั่วโมงที่อนุมัติแล้ว']);
    s('statActs',     d['กิจกรรมทั้งหมด']);
    s('statStaff',    d['บุคลากร']);
    s('statStudent',  d['นักศึกษา']);
    s('statHoursAll', d['ชั่วโมงที่อนุมัติแล้ว']);
    s('statCerts',    d['รออนุมัติ'] !== undefined ? '0' : '0');
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

// ── Activity Filter ────────────────────────────────────────
function filterActivities() {
  var search = (document.getElementById('actSearch') || {value:''}).value.toLowerCase();
  var type   = (document.getElementById('actFilterType') || {value:''}).value;
  var status = (document.getElementById('actFilterStatus') || {value:''}).value;
  var org    = (document.getElementById('actFilterOrg') || {value:''}).value;

  var filtered = allActivities.filter(function(a) {
    var matchSearch = !search || a.name.toLowerCase().indexOf(search) !== -1 || a.organizer.toLowerCase().indexOf(search) !== -1;
    var matchType   = !type   || a.type === type;
    var matchStatus = !status || a.status === status;
    var matchOrg    = !org    || a.organizer === org;
    return matchSearch && matchType && matchStatus && matchOrg;
  });

  renderActivitiesTable(filtered);

  var counter = document.getElementById('actFilterCount');
  if (counter) counter.textContent = filtered.length + '/' + allActivities.length;
}

function resetActivityFilter() {
  var ids = ['actSearch','actFilterType','actFilterStatus','actFilterOrg'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset pills
  document.querySelectorAll('.filter-pill').forEach(function(p) { p.classList.remove('active'); });
  renderActivitiesTable(allActivities);
  var counter = document.getElementById('actFilterCount');
  if (counter) counter.textContent = allActivities.length + '/' + allActivities.length;
}

function quickFilter(key, val) {
  // Toggle pill
  var pill = document.querySelector('.filter-pill[data-key="'+key+'"][data-val="'+val+'"]');
  var isActive = pill && pill.classList.contains('active');

  // Clear same-key pills
  document.querySelectorAll('.filter-pill[data-key="'+key+'"]').forEach(function(p) { p.classList.remove('active'); });

  if (!isActive) {
    if (pill) pill.classList.add('active');
    if (key === 'status') {
      var el = document.getElementById('actFilterStatus');
      if (el) el.value = val;
    } else if (key === 'type') {
      var el2 = document.getElementById('actFilterType');
      if (el2) el2.value = val;
    }
  } else {
    if (key === 'status') { var e = document.getElementById('actFilterStatus'); if(e) e.value=''; }
    if (key === 'type')   { var e2 = document.getElementById('actFilterType');  if(e2) e2.value=''; }
  }
  filterActivities();
}

function renderActivitiesTable(data) {
  var tbody = document.querySelector('#activitiesTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!data.length) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">ไม่พบกิจกรรมที่ตรงกับเงื่อนไข</td>';
    tbody.appendChild(tr);
    return;
  }

  data.forEach(function(a) {
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
}

// ── Admin Management (Super Admin only) ───────────────────
function showAddAdminForm() {
  var f = document.getElementById('addAdminForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') {
    document.getElementById('new_admin_user').value = '';
    document.getElementById('new_admin_pass').value = '';
    document.getElementById('new_admin_name').value = '';
    document.getElementById('new_admin_project').value = '';
    document.getElementById('addAdminError').style.display = 'none';
  }
}

function loadAdminList() {
  var tbody = document.getElementById('adminListTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7c93;">กำลังโหลด...</td></tr>';

  callAPI('getAdminList').then(function(res) {
    tbody.innerHTML = '';

    // Show hardcoded super admins first
    var superRow = document.createElement('tr');
    superRow.innerHTML = '<td><strong>admin</strong></td>'
      + '<td>Super Admin</td>'
      + '<td><span style="background:#e8f4f8;color:#1a5f7a;padding:3px 10px;border-radius:20px;font-size:12px;">ALL</span></td>'
      + '<td><span class="status-pill pill-green">เปิดใช้</span></td>'
      + '<td><span style="font-size:12px;color:#6b7c93;">ระบบ (แก้ใน app.js)</span></td>';
    tbody.appendChild(superRow);

    if (!res.success || !res.data.length) {
      var empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="5" style="text-align:center;padding:16px;color:#6b7c93;">ยังไม่มี Admin จาก Sheets</td>';
      tbody.appendChild(empty);
      return;
    }

    res.data.forEach(function(a) {
      var tr = document.createElement('tr');
      var statusPill = a.active === 'TRUE' || a.active === true
        ? '<span class="status-pill pill-green">เปิดใช้</span>'
        : '<span class="status-pill pill-red">ปิดใช้</span>';

      var toggleLabel = (a.active === 'TRUE' || a.active === true) ? 'ปิดใช้' : 'เปิดใช้';
      var toggleBg    = (a.active === 'TRUE' || a.active === true) ? '#e74c3c' : '#27ae60';

      var tdAction = document.createElement('td');
      tdAction.style.display = 'flex';
      tdAction.style.gap = '6px';

      var btnToggle = document.createElement('button');
      btnToggle.textContent = toggleLabel;
      btnToggle.style.cssText = 'background:'+toggleBg+';color:white;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnToggle.onclick = (function(username, active) {
        return function() { toggleAdminStatus(username, active); };
      })(a.username, a.active);

      var btnDel = document.createElement('button');
      btnDel.textContent = 'ลบ';
      btnDel.style.cssText = 'background:#ecf0f1;color:#e74c3c;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnDel.onclick = (function(username) {
        return function() { deleteAdmin(username); };
      })(a.username);

      tdAction.appendChild(btnToggle);
      tdAction.appendChild(btnDel);

      tr.innerHTML = '<td><strong>' + a.username + '</strong></td>'
        + '<td>' + a.name + '</td>'
        + '<td><span style="background:#e8f4f8;color:#1a5f7a;padding:3px 10px;border-radius:20px;font-size:12px;">' + a.project + '</span></td>'
        + '<td>' + statusPill + '</td>';
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  });
}

function submitAddAdmin() {
  var err  = document.getElementById('addAdminError');
  var user = document.getElementById('new_admin_user').value.trim().toLowerCase();
  var pass = document.getElementById('new_admin_pass').value.trim();
  var name = document.getElementById('new_admin_name').value.trim();
  var proj = document.getElementById('new_admin_project').value.trim();

  if (!user || !pass || !name || !proj) {
    err.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
    err.style.display = 'block'; return;
  }
  if (user.length < 3) {
    err.textContent = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
    err.style.display = 'block'; return;
  }
  err.style.display = 'none';

  callAPI('addAdmin', { username: user, password: pass, name: name, project: proj })
    .then(function(res) {
      if (res.success) {
        document.getElementById('addAdminForm').style.display = 'none';
        showToast('เพิ่ม Admin "' + user + '" สำเร็จ');
        loadAdminList();
      } else {
        err.textContent = res.message;
        err.style.display = 'block';
      }
    });
}

function toggleAdminStatus(username, currentActive) {
  var newActive = (currentActive === 'TRUE' || currentActive === true) ? 'FALSE' : 'TRUE';
  var label = newActive === 'TRUE' ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
  if (!confirm(label + ' Admin "' + username + '" ?')) return;
  callAPI('updateAdminStatus', { username: username, active: newActive })
    .then(function(res) {
      if (res.success) { showToast(label + ' สำเร็จ'); loadAdminList(); }
      else alert(res.message);
    });
}

function deleteAdmin(username) {
  if (!confirm('ลบ Admin "' + username + '" ออกจากระบบ?')) return;
  callAPI('deleteAdmin', { username: username })
    .then(function(res) {
      if (res.success) { showToast('ลบ Admin สำเร็จ'); loadAdminList(); }
      else alert(res.message);
    });
}

// ── Reset Password ────────────────────────────────────────
var resetVerifiedCode = null;

function showResetPassword() {
  resetVerifiedCode = null;
  document.getElementById('resetStep1').style.display = 'block';
  document.getElementById('resetStep2').style.display = 'none';
  document.getElementById('reset_code').value   = '';
  document.getElementById('reset_fname').value  = '';
  document.getElementById('reset_lname').value  = '';
  document.getElementById('reset_newpass').value  = '';
  document.getElementById('reset_newpass2').value = '';
  document.getElementById('resetStep1Error').style.display = 'none';
  document.getElementById('resetStep2Error').style.display = 'none';
  openModal('resetPassModal');
}

function verifyResetIdentity() {
  var code  = document.getElementById('reset_code').value.trim();
  var fname = document.getElementById('reset_fname').value.trim();
  var lname = document.getElementById('reset_lname').value.trim();
  var err   = document.getElementById('resetStep1Error');

  if (!code || !fname || !lname) {
    err.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
    err.style.display = 'block'; return;
  }
  err.style.display = 'none';

  callAPI('verifyResetIdentity', { code: code, firstName: fname, lastName: lname })
    .then(function(res) {
      if (res.success) {
        resetVerifiedCode = code;
        document.getElementById('resetStep1').style.display = 'none';
        document.getElementById('resetStep2').style.display = 'block';
      } else {
        err.textContent = res.message;
        err.style.display = 'block';
      }
    });
}

function submitResetPassword() {
  var pass  = document.getElementById('reset_newpass').value;
  var pass2 = document.getElementById('reset_newpass2').value;
  var err   = document.getElementById('resetStep2Error');

  if (!pass || pass.length < 6) {
    err.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    err.style.display = 'block'; return;
  }
  if (pass !== pass2) {
    err.textContent = 'รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่';
    err.style.display = 'block'; return;
  }
  if (!resetVerifiedCode) {
    err.textContent = 'เกิดข้อผิดพลาด กรุณาเริ่มใหม่';
    err.style.display = 'block'; return;
  }
  err.style.display = 'none';

  callAPI('resetPassword', { code: resetVerifiedCode, newPassword: pass })
    .then(function(res) {
      if (res.success) {
        closeModal('resetPassModal');
        resetVerifiedCode = null;
        showToast('✅ เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่');
        setTimeout(function() { openModal('userLoginModal'); }, 1500);
      } else {
        err.textContent = res.message;
        err.style.display = 'block';
      }
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
