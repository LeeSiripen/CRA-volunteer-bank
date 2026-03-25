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
var WRITE_ACTIONS = [
  'registerTime','signupUser','loginUser','loginAdmin','resetPassword',
  'verifyResetIdentity','addVolunteer','updateLogStatus','addActivity',
  'updateActivityStatus','addAnnouncement','updateAnnouncement','deleteAnnouncement',
  'addAdmin','updateAdminStatus','deleteAdmin','addReward','updateReward','deleteReward',
  'addFeedback','issueCertificates'
];

function callAPI(action, params) {
  var isWrite = WRITE_ACTIONS.indexOf(action) !== -1;
  if (isWrite && params) {
    // POST — handles Thai text and long strings properly
    var body = Object.assign({ action: action }, params);
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .catch(function() { return { success: false, message: 'เชื่อมต่อไม่ได้' }; });
  }
  // GET — for read operations
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
  if (id === 'profile') loadProfile();
}

function switchTab(btn, targetId) {
  var tabs = btn.closest('.tabs');
  // Get all tab target IDs from buttons
  var tabIds = [];
  tabs.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('active');
    var match = b.getAttribute('onclick').match(/'([^']+)'\)/);
    if (match) tabIds.push(match[1]);
  });
  btn.classList.add('active');
  // Hide all tab panels, show target
  tabIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById(targetId);
  if (target) target.style.display = 'block';
  if (targetId === 'admin-manage') loadAdminList();
  if (targetId === 'admin-announce') loadAdminAnnouncements();
  if (targetId === 'admin-rewards')  loadRewards();
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

  // Autofill register forms
  var fullName = user.firstName + ' ' + user.lastName;
  var fillMap = {
    'reg_code': user.code,  'reg_name': fullName,
    'free_code': user.code, 'free_name': fullName,
    'reg_pos':  user.position, 'reg_dept': user.department,
    'reg_phone': user.phone,   'reg_email': user.email,
    'log_code': user.code,  'log_name': fullName
  };
  Object.keys(fillMap).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = fillMap[id] || '';
  });

  // Populate activity dropdowns
  populateActivitySelects();
}

function populateActivitySelects() {
  var opts = '<option value="">-- เลือกกิจกรรม --</option>';
  allActivities.filter(function(a){ return a.status === 'เปิดรับ'; }).forEach(function(a) {
    opts += '<option value="' + a.id + '" data-type="' + a.type + '" data-org="' + a.organizer + '" data-hours="' + a.hours + '">'
          + a.name + ' (' + a.date + ')</option>';
  });
  var s1 = document.getElementById('activitySelect');
  var s2 = document.getElementById('activitySelect2');
  if (s1) s1.innerHTML = opts;
  if (s2) s2.innerHTML = opts;
}

function onActivitySelect(sel, prefix) {
  var opt = sel.options[sel.selectedIndex];
  if (prefix === 'reg') {
    var typeEl = document.getElementById('reg_type');
    var hoursEl = document.getElementById('reg_hours');
    if (typeEl)  typeEl.value  = opt.dataset.type  || '';
    if (hoursEl && opt.dataset.hours) hoursEl.value = opt.dataset.hours;
  } else if (prefix === 'log') {
    var orgEl = document.getElementById('log_org');
    var hoursEl2 = document.getElementById('log_hours');
    if (orgEl)    orgEl.value   = opt.dataset.org   || '';
    if (hoursEl2 && opt.dataset.hours) hoursEl2.value = opt.dataset.hours;
  }
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

    // Populate activity dropdowns in register form
    if (currentUser) populateActivitySelects();

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
      var icons = { 'ต้อนรับ':'🤝','ดูแลเด็ก/คนแก่':'👶','งานฝีมือ':'🎨','สอนหนังสือ':'📚','เล่านิทาน':'📖','บริการสุขภาพ':'❤️','สิ่งแวดล้อม':'🌳','งานช่าง':'🔧','อื่นๆ':'⭐' };
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
    s('statTotal',      d['จิตอาสาทั้งหมด']);
    s('statHoursDone',  d['ชั่วโมงทำแล้ว']);
    s('statHoursPledge',d['ชั่วโมงตั้งใจ']);
    s('statActs',       d['กิจกรรมทั้งหมด']);
    s('statStaff',      d['บุคลากร']);
    s('statStudent',    d['นักศึกษา']);
    s('statHoursAll',   d['ชั่วโมงทำแล้ว']);
    s('statHours',      d['ชั่วโมงทำแล้ว']);
    s('statCerts',      '0');
  });
}

// helper: format date string
function fmtDate(d) {
  if (!d) return '-';
  var s = String(d);
  // Handle ISO format: 2026-06-17T17:00:00.000Z -> 2026-06-17
  if (s.indexOf('T') !== -1) s = s.split('T')[0];
  return s;
}

function loadHistory(code) {
  if (!code || !currentUser) return;
  var u = currentUser;

  var s = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val || '-'; };
  s('histAvatar', u.type === 'บุคลากร' ? '👔' : '🎓');
  s('histName',   u.firstName + ' ' + u.lastName);
  s('histCode',   u.code);
  s('histDept',   u.department);

  callAPI('getHistory', { code: code }).then(function(res) {
    var tbody  = document.querySelector('#historyTable tbody');
    var tl     = document.getElementById('historyTimeline');
    var total  = 0;
    var joined = 0;
    var pending = 0;

    if (!res.success || !res.data.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">ยังไม่มีประวัติ</td></tr>';
      if (tl)    tl.innerHTML    = '<div style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีประวัติการทำกิจกรรม</div>';
      updateHistStats(0, 0, 0);
      return;
    }

    // แยกประเภท: กิจกรรมในระบบ (activityId != 0) vs ฝากเวลาอิสระ (activityId == 0)
    var actLogs  = res.data.filter(function(l) { return String(l.activityId) !== '0'; });
    var freeLogs = res.data.filter(function(l) { return String(l.activityId) === '0'; });

    // คำนวณสถิติจากทุกรายการ
    res.data.forEach(function(log) {
      if (log.status === 'อนุมัติ') {
        total += Number(log.hours);
        if (String(log.activityId) !== '0') joined++;
      } else if (log.status === 'รออนุมัติ') {
        pending++;
      }
    });

    // ── Tab ข. เวลาฝาก (ทั้งหมด) ──────────────────────────
    if (tbody) {
      tbody.innerHTML = '';
      var runningTotal = 0;
      res.data.forEach(function(log) {
        if (log.status === 'อนุมัติ') runningTotal += Number(log.hours);
        var sc = log.status === 'อนุมัติ' ? 'pill-green' : 'pill-orange';
        var isFree = log.activityId == 0;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + fmtDate(log.date) + '</td>'
          + '<td>' + log.organizer + (isFree ? ' <span style="font-size:11px;background:#e8f4f8;color:#1a5f7a;padding:1px 6px;border-radius:10px;">อิสระ</span>' : '') + '</td>'
          + '<td>' + log.hours + ' ชม.</td>'
          + '<td>' + runningTotal + ' ชม.</td>'
          + '<td><span class="status-pill ' + sc + '">' + log.status + '</span></td>';
        tbody.appendChild(tr);
      });
    }

    // ── Tab ก. ข้อมูลกิจกรรม (เฉพาะกิจกรรมในระบบ) ─────────
    if (tl) {
      tl.innerHTML = '';
      if (!actLogs.length) {
        tl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีประวัติการเข้าร่วมกิจกรรมในระบบ</div>';
      } else {
        actLogs.slice().reverse().forEach(function(log) {
          var dotColor = log.status === 'อนุมัติ' ? '#27ae60' : '#e8a838';
          var icon     = log.status === 'อนุมัติ' ? '✅' : '⏳';
          var pill     = log.status === 'อนุมัติ' ? 'pill-green' : 'pill-orange';
          var item     = document.createElement('div');
          item.className = 'timeline-item';

          var dot = document.createElement('div');
          dot.className = 'timeline-dot';
          dot.style.background = dotColor;
          item.appendChild(dot);

          var body = document.createElement('div');
          body.className = 'timeline-content';

          var header = document.createElement('div');
          header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';

          var h4 = document.createElement('h4');
          h4.textContent = icon + ' ' + (log.pledgeTitle || log.organizer);

          var badge = document.createElement('span');
          badge.className = 'status-pill ' + pill;
          badge.textContent = log.status;

          header.appendChild(h4);
          header.appendChild(badge);
          body.appendChild(header);

          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:13px;color:var(--text-muted);margin-top:4px;';
          meta.textContent = '📅 ' + fmtDate(log.date) + '   ⏱️ ' + log.hours + ' ชม.';
          body.appendChild(meta);
          item.appendChild(body);
          tl.appendChild(item);
        });
      }

      // แสดงฝากเวลาอิสระแยกส่วน (ถ้ามี)
      if (freeLogs.length) {
        var freeTitle = document.createElement('div');
        freeTitle.style.cssText = 'font-weight:600;color:#1a5f7a;margin:20px 0 10px;padding-left:8px;border-left:3px solid #1a5f7a;';
        freeTitle.textContent = '⏱️ ฝากเวลาอิสระ';
        tl.appendChild(freeTitle);

        freeLogs.slice().reverse().forEach(function(log) {
          var dotColor = log.status === 'อนุมัติ' ? '#27ae60' : '#e8a838';
          var icon     = log.status === 'อนุมัติ' ? '✅' : '⏳';
          var pill     = log.status === 'อนุมัติ' ? 'pill-green' : 'pill-orange';
          var item     = document.createElement('div');
          item.className = 'timeline-item';

          var dot = document.createElement('div');
          dot.className = 'timeline-dot';
          dot.style.background = dotColor;
          item.appendChild(dot);

          var body = document.createElement('div');
          body.className = 'timeline-content';

          var header = document.createElement('div');
          header.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';

          var h4 = document.createElement('h4');
          h4.textContent = icon + ' ' + (log.pledgeTitle || log.organizer);

          var badge = document.createElement('span');
          badge.className = 'status-pill ' + pill;
          badge.textContent = log.status;

          header.appendChild(h4);
          header.appendChild(badge);
          body.appendChild(header);

          var meta = document.createElement('div');
          meta.style.cssText = 'font-size:13px;color:var(--text-muted);margin-top:4px;';
          meta.textContent = '⏱️ ' + log.hours + ' ชม.  |  ประเภท: ' + (log.pledgeType||log.organizer);
          body.appendChild(meta);
          if (log.pledgeDetail) {
            var det = document.createElement('div');
            det.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:2px;font-style:italic;';
            det.textContent = log.pledgeDetail.substring(0,80) + (log.pledgeDetail.length>80?'...':'');
            body.appendChild(det);
          }
          item.appendChild(body);
          tl.appendChild(item);
        });
      }
    }

    updateHistStats(total, joined, pending);
  });
}

function updateHistStats(total, joined, pending) {
  var s = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  s('histHours',  total + ' ชม.');
  s('histJoined', joined + ' ครั้ง');
  var certs = total >= 40 ? 3 : total >= 24 ? 2 : total >= 8 ? 1 : 0;
  s('histCerts',  certs + ' ใบ');
  var bar = document.getElementById('histProgressBar');
  if (bar) bar.style.width = Math.min(Math.round((total / 40) * 100), 100) + '%';
  var el = document.getElementById('totalHours');
  if (el) el.textContent = total;
}

function submitRegister() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  var err = document.getElementById('regError');
  var actId = document.getElementById('activitySelect').value;
  var hours = document.getElementById('reg_hours').value;
  if (!actId) { err.textContent='กรุณาเลือกกิจกรรม'; err.style.display='block'; return; }
  if (!hours || hours < 1 || hours > 40) { err.textContent='กรุณาระบุชั่วโมง 1-40'; err.style.display='block'; return; }
  err.style.display = 'none';

  var sel = document.getElementById('activitySelect');
  var opt = sel.options[sel.selectedIndex];
  callAPI('registerTime', {
    activityId: actId,
    volunteerCode: currentUser.code,
    fullName: currentUser.firstName + ' ' + currentUser.lastName,
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    hours: hours,
    organizer: opt.dataset.org || '',
    note: document.getElementById('reg_reason').value
  }).then(function(res) {
    if (res.success) {
      showToast('✅ สมัครกิจกรรมสำเร็จ รอการอนุมัติ');
      clearRegisterForm();
      showPage('history');
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function submitTimeLog() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  var err = document.getElementById('logError');
  var actId = document.getElementById('activitySelect2').value;
  var date  = document.getElementById('log_date').value;
  var hours = document.getElementById('log_hours').value;
  var start = document.getElementById('log_start').value;
  var org   = document.getElementById('log_org').value;
  var note  = document.getElementById('log_note').value;

  if (!actId) { err.textContent='กรุณาเลือกกิจกรรม'; err.style.display='block'; return; }
  if (!date)  { err.textContent='กรุณาระบุวันที่'; err.style.display='block'; return; }
  if (!hours || hours < 1 || hours > 40) { err.textContent='กรุณาระบุชั่วโมง 1-40'; err.style.display='block'; return; }
  err.style.display = 'none';

  callAPI('registerTime', {
    activityId: actId,
    volunteerCode: currentUser.code,
    fullName: currentUser.firstName + ' ' + currentUser.lastName,
    date: date, startTime: start, hours: hours,
    organizer: org, note: note
  }).then(function(res) {
    if (res.success) {
      showToast('✅ บันทึกเวลาสำเร็จ รอการอนุมัติ');
      clearLogForm();
      showPage('history');
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function clearRegisterForm() {
  ['activitySelect','reg_type','reg_hours','reg_reason'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('regError').style.display = 'none';
}

function clearLogForm() {
  ['activitySelect2','log_date','log_hours','log_start','log_org','log_note'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('logError').style.display = 'none';
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

      var orgLabel = log.isPledge
        ? '<span style="font-size:11px;background:#e8f4f8;color:#1a5f7a;padding:2px 6px;border-radius:10px;margin-left:4px;">เจตนา</span> ' + (log.pledgeType||log.organizer)
        : log.organizer;
      tr.innerHTML = '<td><strong>' + log.fullName + '</strong></td>'
        + '<td>' + log.volunteerCode + '</td>'
        + '<td>' + orgLabel + (log.pledgeTitle ? '<br><span style="font-size:11px;color:#6b7c93;">' + log.pledgeTitle + '</span>' : '') + '</td>'
        + '<td>' + fmtDate(log.date) + '</td><td><strong>' + log.hours + ' ชม.</strong></td>'
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

// ── Profile ────────────────────────────────────────────────
function loadProfile() {
  if (!currentUser) return;
  var u = currentUser;

  // Basic info
  var s = function(id, val) { var e = document.getElementById(id); if (e && val !== undefined) e.textContent = val; };
  s('profileName', u.firstName + ' ' + u.lastName);
  document.getElementById('profileDetail').innerHTML =
    'รหัส: ' + u.code + ' | ' + u.department + ' | ' + u.position +
    '<br>อีเมล: ' + (u.email || '-') + ' | โทร: ' + (u.phone || '-');

  // Avatar emoji by type
  var avatarEl = document.getElementById('profileAvatar');
  if (avatarEl) avatarEl.textContent = u.type === 'บุคลากร' ? '👨‍💼' : '🎓';

  // Type badge
  var typeIcon = u.type === 'บุคลากร' ? '👔' : '🎓';
  s('profileType', typeIcon + ' ' + u.type);

  // Load history for stats
  callAPI('getHistory', { code: u.code }).then(function(res) {
    var total    = 0;
    var joined   = 0;
    var pending  = 0;
    var certs    = 0;

    if (res.success) {
      res.data.forEach(function(log) {
        if (log.status === 'อนุมัติ') {
          total += Number(log.hours);
          joined++;
        } else if (log.status === 'รออนุมัติ') {
          pending++;
        }
      });
    }

    // Hours & progress bar
    var targetHours = 40;
    var pct = Math.min(Math.round((total / targetHours) * 100), 100);
    s('profileHours', '⏱️ ' + total + ' ชม.');
    s('profileStatHours', total + ' / ' + targetHours + ' ชม.');
    s('profileStatJoined', joined + ' ครั้ง');
    s('profileStatPending', pending + ' ครั้ง');

    var bar = document.getElementById('profileProgressBar');
    if (bar) bar.style.width = pct + '%';

    // Level badge
    var level = '';
    if      (total >= 40) { level = '🥇 ระดับทอง';    certs = 3; }
    else if (total >= 24) { level = '🥈 ระดับเงิน';   certs = 2; }
    else if (total >= 8)  { level = '🥉 ระดับทองแดง'; certs = 1; }
    else                  { level = '⭐ เริ่มต้น'; }
    s('profileLevel', level);
    s('profileStatCerts', certs + ' ใบ');
  });
}

// ── Free Time Deposit ─────────────────────────────────────
function submitFreeTime() {
  if (!currentUser) { openModal('userLoginModal'); return; }
  var err    = document.getElementById('freeError');
  var type   = document.getElementById('free_type').value;
  var title  = document.getElementById('free_title').value.trim();
  var hours  = document.getElementById('free_hours').value;
  var detail = document.getElementById('free_detail').value.trim();

  if (!type)   { err.textContent='กรุณาเลือกประเภทงาน';              err.style.display='block'; return; }
  if (!title)  { err.textContent='กรุณาระบุชื่อกิจกรรมที่จะทำ';     err.style.display='block'; return; }
  if (!hours || hours < 1 || hours > 40) { err.textContent='กรุณาระบุชั่วโมง 1-40'; err.style.display='block'; return; }
  if (!detail) { err.textContent='กรุณาระบุรายละเอียดสิ่งที่จะทำ';  err.style.display='block'; return; }
  err.style.display = 'none';

  // note เก็บข้อมูลเจตนา
  var note = '[เจตนา] จะ' + title + ' | ประเภท: ' + type + ' | รายละเอียด: ' + detail;

  callAPI('registerTime', {
    activityId: 0,
    volunteerCode: currentUser.code,
    fullName: currentUser.firstName + ' ' + currentUser.lastName,
    date: new Date().toISOString().split('T')[0],
    startTime: '', hours: hours,
    organizer: type,
    note: note,
    pledgeTitle:  title,
    pledgeDetail: detail
  }).then(function(res) {
    if (res.success) {
      showToast('💡 แสดงเจตนาสำเร็จ รอการอนุมัติ');
      clearFreeForm();
      showPage('history');
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function clearFreeForm() {
  ['free_type','free_title','free_hours','free_detail'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('freeError').style.display = 'none';
}

// ── Password Validation ───────────────────────────────────
function validatePassword(pass) {
  if (!pass || pass.length < 6) {
    return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  }
  var letters = (pass.match(/[a-zA-Zก-ฮ]/g) || []).length;
  if (letters < 3) {
    return 'รหัสผ่านต้องมีตัวอักษรอย่างน้อย 3 ตัว (ภาษาไทยหรืออังกฤษ)';
  }
  return null; // valid
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

  var passErr2 = validatePassword(pass);
  if (passErr2) { err.textContent = passErr2; err.style.display = 'block'; return; }
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


// ── Announcements ─────────────────────────────────────────
function loadAnnouncements() {
  callAPI('getAnnouncements').then(function(res) {
    var container = document.getElementById('homeAnnouncements');
    if (!container) return;
    if (!res.success || !res.data.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-muted);">ยังไม่มีประกาศ</div>';
      return;
    }

    // Separate urgent vs normal, limit to 5 latest total
    var urgent  = res.data.filter(function(a) { return a.type === 'ด่วน'; });
    var normal  = res.data.filter(function(a) { return a.type !== 'ด่วน'; }).slice(0, 5);

    container.innerHTML = '';

    // ── Banner Zone: ด่วน ──────────────────────────────────
    if (urgent.length) {
      var bannerZone = document.createElement('div');
      bannerZone.style.cssText = 'grid-column:1/-1;display:flex;flex-direction:column;gap:12px;margin-bottom:8px;';

      urgent.forEach(function(ann) {
        var banner = document.createElement('div');
        banner.style.cssText = 'background:linear-gradient(135deg,#e74c3c,#c0392b);border-radius:14px;padding:20px 24px;color:white;display:flex;align-items:center;gap:16px;box-shadow:0 4px 20px rgba(231,76,60,.35);';

        // Icon
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:32px;flex-shrink:0;';
        icon.textContent = '🚨';
        banner.appendChild(icon);

        // Image (if any) - using DOM to avoid quote issues
        if (ann.image) {
          var img = document.createElement('img');
          img.src = ann.image;
          img.alt = '';
          img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:10px;flex-shrink:0;';
          img.onerror = function(){ this.remove(); };
          banner.appendChild(img);
        }

        // Text body
        var body = document.createElement('div');
        body.style.cssText = 'flex:1;min-width:0;';

        var dateLine = document.createElement('div');
        dateLine.style.cssText = 'font-size:11px;font-weight:600;opacity:.8;letter-spacing:.5px;margin-bottom:4px;';
        dateLine.textContent = 'ประกาศด่วน · ' + ann.date;
        body.appendChild(dateLine);

        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-family:Prompt,sans-serif;font-weight:700;font-size:18px;line-height:1.3;margin-bottom:6px;';
        titleEl.textContent = ann.title;
        body.appendChild(titleEl);

        var detailEl = document.createElement('div');
        detailEl.style.cssText = 'font-size:14px;opacity:.9;line-height:1.6;';
        detailEl.textContent = (ann.detail||'').substring(0, 200) + (ann.detail && ann.detail.length > 200 ? '...' : '');
        body.appendChild(detailEl);

        if (ann.link) {
          var linkEl = document.createElement('a');
          linkEl.href = ann.link;
          linkEl.target = '_blank';
          linkEl.rel = 'noopener';
          linkEl.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:white;font-size:13px;font-weight:600;text-decoration:none;background:rgba(255,255,255,.2);padding:6px 14px;border-radius:20px;margin-top:8px;';
          linkEl.textContent = '🔗 อ่านต่อ →';
          body.appendChild(linkEl);
        }
        banner.appendChild(body);
        bannerZone.appendChild(banner);

        // YouTube below banner
        if (ann.youtube) {
          var ytWrap = document.createElement('div');
          ytWrap.style.cssText = 'position:relative;padding-bottom:40%;height:0;overflow:hidden;border-radius:12px;';
          var iframe = document.createElement('iframe');
          iframe.src = 'https://www.youtube.com/embed/' + ann.youtube;
          iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
          iframe.frameBorder = '0';
          iframe.allowFullscreen = true;
          iframe.loading = 'lazy';
          ytWrap.appendChild(iframe);
          bannerZone.appendChild(ytWrap);
        }
      });
      container.appendChild(bannerZone);
    }

    // ── Card Grid: ทั่วไป + ข่าวสาร ──────────────────────
    if (normal.length) {
      normal.forEach(function(ann) {
        var typeColor = ann.type === 'ข่าวสาร' ? '#1a5f7a' : '#6b7c93';
        var typeIcon  = ann.type === 'ข่าวสาร' ? '📰' : '📌';

        var card = document.createElement('div');
        card.style.cssText = 'background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(26,95,122,.08);display:flex;flex-direction:column;border:1px solid #e8f0f8;transition:box-shadow .2s;';
        card.onmouseover = function(){ this.style.boxShadow='0 8px 32px rgba(26,95,122,.18)'; };
        card.onmouseout  = function(){ this.style.boxShadow='0 4px 20px rgba(26,95,122,.08)'; };

        var html = '';
        if (ann.image) {
          html += '<div style="height:160px;overflow:hidden;">'
            + '<img src="' + ann.image + '" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.remove()">'
            + '</div>';
        }
        if (ann.youtube && !ann.image) {
          html += '<div style="position:relative;padding-bottom:52%;height:0;overflow:hidden;">'
            + '<iframe src="https://www.youtube.com/embed/' + ann.youtube + '" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen loading="lazy"></iframe>'
            + '</div>';
        }
        html += '<div style="padding:18px 20px;flex:1;display:flex;flex-direction:column;gap:8px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:11px;font-weight:600;color:' + typeColor + ';background:' + typeColor + '15;padding:3px 10px;border-radius:20px;">' + typeIcon + ' ' + ann.type + '</span>'
          + '<span style="font-size:12px;color:var(--text-muted);">📅 ' + ann.date + '</span>'
          + '</div>';
        html += '<div style="font-family:Prompt,sans-serif;font-weight:600;font-size:15px;color:#0d3d52;line-height:1.4;">' + ann.title + '</div>';
        html += '<div style="font-size:13px;color:var(--text-muted);line-height:1.7;flex:1;">' + (ann.detail||'').substring(0,120) + (ann.detail && ann.detail.length>120?'...':'') + '</div>';
        if (ann.link) {
          html += '<a href="' + ann.link + '" target="_blank" rel="noopener" style="color:#1a5f7a;font-size:13px;font-weight:600;text-decoration:none;margin-top:4px;">🔗 อ่านต่อ →</a>';
        }
        html += '</div>';
        card.innerHTML = html;
        container.appendChild(card);
      });
    }
  });
}

function loadAdminAnnouncements() {
  var tbody = document.getElementById('announceListTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7c93;">กำลังโหลด...</td></tr>';
  callAPI('getAnnouncements').then(function(res) {
    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#6b7c93;">ยังไม่มีประกาศ</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    res.data.forEach(function(ann) {
      var tr = document.createElement('tr');
      var tdAction = document.createElement('td');
      tdAction.style.cssText = 'display:flex;gap:6px;';

      var btnEdit = document.createElement('button');
      btnEdit.textContent = 'แก้ไข';
      btnEdit.style.cssText = 'background:#1a5f7a;color:white;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnEdit.onclick = (function(a) { return function() { editAnnounce(a); }; })(ann);

      var btnDel = document.createElement('button');
      btnDel.textContent = 'ลบ';
      btnDel.style.cssText = 'background:#e74c3c;color:white;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnDel.onclick = (function(id) { return function() { deleteAnnounce(id); }; })(ann.id);

      tdAction.appendChild(btnEdit);
      tdAction.appendChild(btnDel);

      tr.innerHTML = '<td><strong>' + ann.title + '</strong></td>'
        + '<td>' + ann.type + '</td>'
        + '<td>' + ann.date + '</td>'
        + '<td style="text-align:center;">' + (ann.image ? '✅' : '-') + '</td>'
        + '<td style="text-align:center;">' + (ann.youtube ? '✅' : '-') + '</td>';
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  });
}

function showAddAnnounce() {
  document.getElementById('announceFormTitle').textContent = '➕ เพิ่มประกาศใหม่';
  document.getElementById('ann_edit_id').value = '';
  ['ann_title','ann_detail','ann_image','ann_link','ann_youtube'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('ann_type').value = 'ทั่วไป';
  document.getElementById('ann_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('addAnnounceError').style.display = 'none';
  document.getElementById('addAnnounceForm').style.display = 'block';
  document.getElementById('addAnnounceForm').scrollIntoView({ behavior: 'smooth' });
}

function editAnnounce(ann) {
  document.getElementById('announceFormTitle').textContent = '✏️ แก้ไขประกาศ';
  document.getElementById('ann_edit_id').value  = ann.id;
  document.getElementById('ann_title').value    = ann.title   || '';
  document.getElementById('ann_type').value     = ann.type    || 'ทั่วไป';
  document.getElementById('ann_date').value     = ann.date    || '';
  document.getElementById('ann_detail').value   = ann.detail  || '';
  document.getElementById('ann_image').value    = ann.image   || '';
  document.getElementById('ann_link').value     = ann.link    || '';
  document.getElementById('ann_youtube').value  = ann.youtube || '';
  document.getElementById('addAnnounceError').style.display = 'none';
  document.getElementById('addAnnounceForm').style.display = 'block';
  document.getElementById('addAnnounceForm').scrollIntoView({ behavior: 'smooth' });
}

function submitAnnounce() {
  var err     = document.getElementById('addAnnounceError');
  var title   = document.getElementById('ann_title').value.trim();
  var type    = document.getElementById('ann_type').value;
  var date    = document.getElementById('ann_date').value;
  var detail  = document.getElementById('ann_detail').value.trim();
  var image   = document.getElementById('ann_image').value.trim();
  var link    = document.getElementById('ann_link').value.trim();
  var youtube = document.getElementById('ann_youtube').value.trim();
  var editId  = document.getElementById('ann_edit_id').value;

  // Extract YouTube ID if user pasted full URL
  var ytMatch = youtube.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) youtube = ytMatch[1];

  if (!title)  { err.textContent = 'กรุณาใส่ชื่อเรื่อง';   err.style.display = 'block'; return; }
  if (!date)   { err.textContent = 'กรุณาระบุวันที่';        err.style.display = 'block'; return; }
  if (!detail) { err.textContent = 'กรุณาใส่รายละเอียด';    err.style.display = 'block'; return; }
  err.style.display = 'none';

  var action = editId ? 'updateAnnouncement' : 'addAnnouncement';
  callAPI(action, {
    id: editId, title: title, type: type, date: date,
    detail: detail, image: image, link: link, youtube: youtube,
    author: currentAdmin ? currentAdmin.name : 'Admin'
  }).then(function(res) {
    if (res.success) {
      document.getElementById('addAnnounceForm').style.display = 'none';
      showToast(editId ? '✅ แก้ไขประกาศสำเร็จ' : '✅ เพิ่มประกาศสำเร็จ');
      loadAdminAnnouncements();
      loadAnnouncements();
    } else {
      err.textContent = res.message;
      err.style.display = 'block';
    }
  });
}

function deleteAnnounce(id) {
  if (!confirm('ลบประกาศนี้?')) return;
  callAPI('deleteAnnouncement', { id: id }).then(function(res) {
    if (res.success) { showToast('ลบประกาศสำเร็จ'); loadAdminAnnouncements(); loadAnnouncements(); }
    else alert(res.message);
  });
}

// ── Rewards ────────────────────────────────────────────────
function loadRewards() {
  callAPI('getRewards').then(function(res) {
    var tbody   = document.getElementById('rewardsTable');
    var preview = document.getElementById('rewardsPreview');
    if (!tbody) return;

    if (!res.success || !res.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7c93;">ยังไม่มีรางวัล กด "เพิ่มรางวัล" เพื่อเริ่มต้น</td></tr>';
      if (preview) preview.innerHTML = '';
      return;
    }

    // Preview cards
    if (preview) {
      preview.innerHTML = '';
      res.data.filter(function(r){ return r.active === 'TRUE'; }).forEach(function(r) {
        var card = document.createElement('div');
        card.style.cssText = 'background:white;border-radius:16px;padding:20px;box-shadow:0 4px 20px rgba(26,95,122,.08);border:2px solid #e8f4f8;display:flex;align-items:center;gap:16px;';
        var hourtypeLabel = r.hourtype === 'รวม' ? 'ชม. รวม' : 'ชม. ทำกิจกรรม';
        card.innerHTML = '<div style="font-size:40px;flex-shrink:0;">' + (r.icon||'🏅') + '</div>'
          + '<div style="flex:1;">'
          + '<div style="font-family:Prompt,sans-serif;font-weight:700;font-size:16px;color:#0d3d52;">' + r.name + '</div>'
          + '<div style="font-size:13px;color:#1a5f7a;font-weight:600;margin:3px 0;">เมื่อสะสม ≥ ' + r.hours + ' ชม. (' + hourtypeLabel + ')</div>'
          + '<div style="font-size:13px;color:var(--text-muted);">' + r.detail + '</div>'
          + '</div>'
          + '<div style="text-align:center;flex-shrink:0;">'
          + '<div style="font-size:11px;background:#e8f4f8;color:#1a5f7a;padding:3px 10px;border-radius:20px;">' + r.type + '</div>'
          + '</div>';
        preview.appendChild(card);
      });
    }

    // Table
    tbody.innerHTML = '';
    res.data.forEach(function(r) {
      var tr = document.createElement('tr');
      var statusPill = r.active === 'TRUE'
        ? '<span class="status-pill pill-green">เปิดใช้</span>'
        : '<span class="status-pill pill-red">ปิดใช้</span>';

      var tdAction = document.createElement('td');
      tdAction.style.cssText = 'display:flex;gap:6px;';

      var btnEdit = document.createElement('button');
      btnEdit.textContent = 'แก้ไข';
      btnEdit.style.cssText = 'background:#1a5f7a;color:white;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnEdit.onclick = (function(rwd){ return function(){ editReward(rwd); }; })(r);

      var btnDel = document.createElement('button');
      btnDel.textContent = 'ลบ';
      btnDel.style.cssText = 'background:#e74c3c;color:white;border:none;padding:5px 12px;border-radius:8px;font-family:Sarabun,sans-serif;font-size:12px;cursor:pointer;';
      btnDel.onclick = (function(id){ return function(){ deleteReward(id); }; })(r.id);

      tdAction.appendChild(btnEdit);
      tdAction.appendChild(btnDel);

      var hourtypeLabel = r.hourtype === 'รวม' ? '📊 รวม' : '✅ ทำกิจกรรม';
      tr.innerHTML = '<td style="font-size:24px;text-align:center;">' + (r.icon||'🏅') + '</td>'
        + '<td><strong>' + r.name + '</strong><br><span style="font-size:12px;color:var(--text-muted);">' + r.detail.substring(0,50) + '...</span></td>'
        + '<td style="text-align:center;font-weight:700;color:#1a5f7a;">≥ ' + r.hours + ' ชม.</td>'
        + '<td>' + r.type + '</td>'
        + '<td>' + hourtypeLabel + '</td>'
        + '<td>' + statusPill + '</td>';
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  });
}

function showAddReward() {
  document.getElementById('rewardFormTitle').textContent = '➕ เพิ่มรางวัลใหม่';
  document.getElementById('rwd_edit_id').value = '';
  ['rwd_name','rwd_hours','rwd_icon','rwd_detail'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('rwd_type').value = 'เกียรติบัตร';
  document.getElementById('rwd_hourtype').value = 'ทำกิจกรรม';
  document.getElementById('rwd_active').value = 'TRUE';
  document.getElementById('addRewardError').style.display = 'none';
  document.getElementById('addRewardForm').style.display = 'block';
  document.getElementById('addRewardForm').scrollIntoView({ behavior: 'smooth' });
}

function editReward(r) {
  document.getElementById('rewardFormTitle').textContent = '✏️ แก้ไขรางวัล';
  document.getElementById('rwd_edit_id').value  = r.id;
  document.getElementById('rwd_name').value     = r.name    || '';
  document.getElementById('rwd_hours').value    = r.hours   || '';
  document.getElementById('rwd_icon').value     = r.icon    || '';
  document.getElementById('rwd_detail').value   = r.detail  || '';
  document.getElementById('rwd_type').value     = r.type    || 'เกียรติบัตร';
  document.getElementById('rwd_hourtype').value = r.hourtype|| 'ทำกิจกรรม';
  document.getElementById('rwd_active').value   = r.active  || 'TRUE';
  document.getElementById('addRewardError').style.display = 'none';
  document.getElementById('addRewardForm').style.display = 'block';
  document.getElementById('addRewardForm').scrollIntoView({ behavior: 'smooth' });
}

function submitReward() {
  var err    = document.getElementById('addRewardError');
  var name   = document.getElementById('rwd_name').value.trim();
  var hours  = document.getElementById('rwd_hours').value;
  var icon   = document.getElementById('rwd_icon').value.trim();
  var detail = document.getElementById('rwd_detail').value.trim();
  var type   = document.getElementById('rwd_type').value;
  var htype  = document.getElementById('rwd_hourtype').value;
  var active = document.getElementById('rwd_active').value;
  var editId = document.getElementById('rwd_edit_id').value;

  if (!name)   { err.textContent='กรุณาใส่ชื่อรางวัล';         err.style.display='block'; return; }
  if (!hours || hours < 1) { err.textContent='กรุณาระบุชั่วโมงขั้นต่ำ'; err.style.display='block'; return; }
  if (!detail) { err.textContent='กรุณาใส่รายละเอียดรางวัล';   err.style.display='block'; return; }
  err.style.display = 'none';

  var action = editId ? 'updateReward' : 'addReward';
  callAPI(action, { id:editId, name:name, hours:hours, icon:icon||'🏅', detail:detail, type:type, hourtype:htype, active:active })
    .then(function(res) {
      if (res.success) {
        document.getElementById('addRewardForm').style.display = 'none';
        showToast(editId ? '✅ แก้ไขรางวัลสำเร็จ' : '✅ เพิ่มรางวัลสำเร็จ');
        loadRewards();
      } else {
        err.textContent = res.message;
        err.style.display = 'block';
      }
    });
}

function deleteReward(id) {
  if (!confirm('ลบรางวัลนี้?')) return;
  callAPI('deleteReward', { id: id }).then(function(res) {
    if (res.success) { showToast('ลบรางวัลสำเร็จ'); loadRewards(); }
    else alert(res.message);
  });
}


// ── Search ─────────────────────────────────────────────────
function toggleSearch() {
  var overlay = document.getElementById('searchOverlay');
  var isOpen  = overlay.style.display === 'flex';
  overlay.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    var inp = document.getElementById('searchInput');
    inp.value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchEmpty').style.display = 'none';
    document.getElementById('searchHint').style.display = 'block';
    setTimeout(function(){ inp.focus(); }, 100);
  }
}

function doSearch(query) {
  var q = query.trim().toLowerCase();
  var results = document.getElementById('searchResults');
  var empty   = document.getElementById('searchEmpty');
  var hint    = document.getElementById('searchHint');

  if (q.length < 2) {
    results.innerHTML = '';
    empty.style.display = 'none';
    hint.style.display = 'block';
    return;
  }
  hint.style.display = 'none';

  var items = [];

  // Search activities
  allActivities.forEach(function(a) {
    if (a.name.toLowerCase().indexOf(q) !== -1 ||
        a.type.toLowerCase().indexOf(q) !== -1 ||
        (a.organizer||'').toLowerCase().indexOf(q) !== -1 ||
        (a.detail||'').toLowerCase().indexOf(q) !== -1) {
      items.push({
        icon: '📋', title: a.name,
        sub:  a.type + ' · ' + a.organizer + ' · ' + a.date,
        action: function(){ toggleSearch(); showPage('activities'); }
      });
    }
  });

  // Search nav pages
  var pages = [
    { kw: ['หน้าแรก','home'],           icon:'🏠', title:'หน้าแรก',            page:'home' },
    { kw: ['กิจกรรม','activity'],        icon:'📋', title:'กิจกรรมทั้งหมด',     page:'activities' },
    { kw: ['ฝากเวลา','เวลา','volunteer'],icon:'⏰', title:'ฝากเวลาจิตอาสา',    page:'register-time' },
    { kw: ['ประวัติ','history'],         icon:'📂', title:'แฟ้มประวัติ',         page:'history' },
    { kw: ['รายงาน','report','สถิติ'],   icon:'📊', title:'รายงาน',             page:'report' },
    { kw: ['โปรไฟล์','profile','ข้อมูลฉัน'],icon:'👤',title:'โปรไฟล์',          page:'profile' },
    { kw: ['สมัคร','ลงทะเบียน','signup'],icon:'✨', title:'สมัครสมาชิก',        action:'signup' },
    { kw: ['login','เข้าสู่ระบบ'],       icon:'🔐', title:'เข้าสู่ระบบ',         action:'login' },
    { kw: ['ติดต่อ','contact','footer','8200','8201','8202','ฝ่ายพัฒนา'],icon:'📞',title:'ติดต่อสอบถาม',action:'footer' },
  ];

  pages.forEach(function(p) {
    var matched = p.kw.some(function(k){ return k.indexOf(q) !== -1 || q.indexOf(k) !== -1; });
    if (matched) {
      items.push({
        icon: p.icon, title: p.title, sub: 'หน้า ' + (p.page||p.action||''),
        action: (function(pp){
          return function() {
            toggleSearch();
            if (pp.page)   showPage(pp.page);
            else if (pp.action === 'signup') openModal('userSignupModal');
            else if (pp.action === 'login')  openModal('userLoginModal');
            else if (pp.action === 'footer') window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
          };
        })(p)
      });
    }
  });

  results.innerHTML = '';
  if (!items.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  items.slice(0, 8).forEach(function(item) {
    var el = document.createElement('div');
    el.style.cssText = 'background:white;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background .15s;';
    el.onmouseover = function(){ this.style.background='#f0f4f8'; };
    el.onmouseout  = function(){ this.style.background='white'; };
    el.onclick     = item.action;

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:24px;flex-shrink:0;';
    icon.textContent = item.icon;

    var body = document.createElement('div');
    var title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:14px;color:#0d3d52;';
    title.textContent = item.title;
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#6b7c93;margin-top:2px;';
    sub.textContent = item.sub || '';

    body.appendChild(title);
    body.appendChild(sub);
    el.appendChild(icon);
    el.appendChild(body);
    results.appendChild(el);
  });
}

// Close search on outside click
document.addEventListener('click', function(e) {
  var overlay = document.getElementById('searchOverlay');
  if (overlay && overlay.style.display === 'flex' && e.target === overlay) {
    toggleSearch();
  }
});

// ── Feedback ───────────────────────────────────────────────
function showFeedbackForm() {
  document.getElementById('fb_detail').value  = '';
  document.getElementById('fb_contact').value = '';
  document.getElementById('feedbackError').style.display = 'none';
  openModal('feedbackModal');
}

function submitFeedback() {
  var err    = document.getElementById('feedbackError');
  var type   = document.getElementById('fb_type').value;
  var detail = document.getElementById('fb_detail').value.trim();
  var contact= document.getElementById('fb_contact').value.trim();

  if (!detail) {
    err.textContent = 'กรุณาใส่รายละเอียด';
    err.style.display = 'block';
    return;
  }
  err.style.display = 'none';

  callAPI('addFeedback', { type:type, detail:detail, contact:contact })
    .then(function(res) {
      closeModal('feedbackModal');
      showToast('✅ ขอบคุณสำหรับข้อเสนอแนะครับ');
    });
}

// ── Init ───────────────────────────────────────────────────
(function() {
  ['tab-record','tab-self','hist-b','rep-person','rep-cert',
   'admin-activities','admin-members','admin-cert','admin-report'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  loadActivities();
  loadSummary();
  loadAnnouncements();
})();
