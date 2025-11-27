// Supabase Configuration
const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';

let supabase;
let currentUser = null;
let assignmentsData = [];
let notificationsData = { materials: [], vehicles: [] };
let currentAssignmentId = null;

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!supabase) { console.error("Supabase not loaded"); return; }

    // Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (!window.location.href.includes('login')) {
             window.location.href = '../login/login.html';
        }
        return;
    }
    currentUser = session.user;

    // Initialization
    initNavigation();
    initTabs();
    initFilters(); 
    
    // Data Loading
    loadUserProfile();
    fetchDashboardData(); 
});

// --- NAVIGATION ---
function initNavigation() {
    const navLinks = document.querySelectorAll(".main-navigation a.nav-item"); 
    const mainSections = document.querySelectorAll(".main-section"); 
    
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute("data-main-page"); 
            
            navLinks.forEach(l => l.classList.remove("nav-item-active"));
            link.classList.add("nav-item-active");
            
            mainSections.forEach(s => {
                s.classList.remove("main-section-active");
                if (s.getAttribute("data-main-section") === targetPage) { 
                    s.classList.add("main-section-active");
                }
            });
        });
    });

    const mobileNavButtons = document.querySelectorAll(".bottom-nav .nav-item");
    const mobileSections = document.querySelectorAll(".mobile-content-section");
    
    mobileNavButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetPage = btn.getAttribute("data-mobile-page");
            mobileNavButtons.forEach(b => b.classList.remove("nav-item-active"));
            btn.classList.add("nav-item-active");
            mobileSections.forEach(s => {
                s.classList.remove("mobile-content-section-active");
                if (s.getAttribute("data-mobile-content") === targetPage) {
                    s.classList.add("mobile-content-section-active");
                }
            });
        });
    });
}

function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const filters = document.querySelectorAll(".filter-btn"); 
    const containers = document.querySelectorAll(".task-container");
    const feeds = document.querySelectorAll(".feed-section");

    tabs.forEach(t => {
        t.addEventListener("click", () => {
            tabs.forEach(x => x.classList.remove("tab-active"));
            t.classList.add("tab-active");
            const target = t.getAttribute("data-tab");
            containers.forEach(c => {
                c.classList.remove("task-container-active");
                if (c.getAttribute("data-container") === target) {
                    c.classList.add("task-container-active");
                }
            });
        });
    });

    filters.forEach(btn => {
        btn.addEventListener("click", () => {
            filters.forEach(b => b.classList.remove("filter-btn-active"));
            btn.classList.add("filter-btn-active");
            const target = btn.getAttribute("data-filter");
            feeds.forEach(f => {
                f.classList.remove("feed-section-active");
                if (f.getAttribute("data-feed") === target) {
                    f.classList.add("feed-section-active");
                }
            });
        });
    });
}

function initFilters() {
    const mHistFilter = document.getElementById('mobileHistoryDate');
    const dHistFilter = document.getElementById('desktopHistoryDate');
    if(mHistFilter) mHistFilter.addEventListener('change', (e) => renderHistory(assignmentsData, e.target.value));
    if(dHistFilter) dHistFilter.addEventListener('change', (e) => renderHistory(assignmentsData, e.target.value));

    const mNotifFilter = document.getElementById('mobileNotificationDate');
    const dNotifFilter = document.getElementById('desktopNotificationDate');
    if(mNotifFilter) mNotifFilter.addEventListener('change', (e) => renderNotifications(assignmentsData, notificationsData, e.target.value));
    if(dNotifFilter) dNotifFilter.addEventListener('change', (e) => renderNotifications(assignmentsData, notificationsData, e.target.value));
}

// --- DATA LOADING ---
async function loadUserProfile() {
    const { data } = await supabase
        .from('engineer_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    
    if (data) {
        const fullName = `${data.firstName} ${data.lastName}`;
        document.querySelectorAll('.profile-name, .profile-name-large, .mobile-profile-name, .hero-subtitle').forEach(el => el.textContent = fullName);
        document.querySelectorAll('.profile-email, .profile-email-large, .mobile-profile-email').forEach(el => el.textContent = data.email);
        document.querySelectorAll('.profile-initials, .profile-initials-large, .mobile-profile-initials').forEach(el => el.textContent = (data.firstName[0] + data.lastName[0]).toUpperCase());
    }
}

async function fetchDashboardData() {
    const { data: { session } } = await supabase.auth.getSession();
    try {
        const response = await fetch('http://localhost:3000/api/engineer/dashboard-data', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const result = await response.json();
        assignmentsData = result.assignments || [];
        notificationsData = result.notifications || { materials: [], vehicles: [] };
        
        renderAssignments(assignmentsData);
        renderHistory(assignmentsData, 'all');
        renderNotifications(assignmentsData, notificationsData, 'all'); 
        updateStats(assignmentsData); 
        
    } catch (error) { 
        console.error("Error:", error);
    }
}

// --- HELPER TO CATEGORIZE STATUS ---
function getStatusCategory(item) {
    const s = (item.status || '').toLowerCase().trim();
    // 1. Completed
    if (['completed', 'done'].includes(s)) return 'completed';
    // 2. Ongoing (includes approved/on hold)
    if (['ongoing', 'accepted', 'acknowledged', 'approved', 'on hold'].includes(s)) return 'ongoing';
    // 3. Pending
    if (['in progress', 'pending', 'assigned'].includes(s)) return 'pending';
    
    return 'unknown';
}

// --- RENDERING ---
function renderAssignments(data) {
    const cats = ['pending', 'ongoing', 'completed'];
    cats.forEach(c => {
        const mCont = document.querySelector(`.task-container[data-container="${c}"]`);
        const dCont = document.querySelector(`.feed-section[data-feed="${c}"]`);
        if(mCont) mCont.innerHTML = '';
        if(dCont) dCont.innerHTML = '';
    });

    data.forEach(item => {
        const cat = getStatusCategory(item);
        if (cat === 'unknown') return;
        
        const dateStr = new Date(item.date).toLocaleDateString();
        const priority = item.priority_level || 'Medium';
        const priorityClass = priority.toLowerCase() === 'high' ? 'priority-high' : 'priority-medium';

        const mCard = `
          <article class="assignment-card" onclick="openAssignmentDetails(${item.id})">
            <div class="assignment-card-header">
              <div class="assignment-title">${item.type_of_appointment}</div>
              <div class="assignment-priority ${priorityClass}">${priority}</div>
            </div>
            <div class="assignment-location">Site: ${item.site}</div>
            <div class="assignment-due-label">${cat === 'completed' ? 'Completed' : 'Due'}: ${dateStr}</div>
            <div class="assignment-progress assignment-progress-${priority.toLowerCase() === 'high' ? 'high' : 'medium'}"></div>
          </article>`;
        
        let icon = '📋';
        if(item.type_of_appointment.includes('Inspection')) icon = '📍';
        if(item.type_of_appointment.includes('Installation')) icon = '🔧';
        if(item.type_of_appointment.includes('Maintenance')) icon = '🌐';

        const dCard = `
          <div class="assignment-item" onclick="selectAssignment(${item.id})">
            <div class="assignment-avatar"><span class="assignment-icon">${icon}</span></div>
            <div class="assignment-info">
              <div class="assignment-name">${item.type_of_appointment}</div>
              <div class="assignment-location">${item.site}</div>
              <div class="assignment-time">${cat === 'completed' ? 'Completed' : 'Due'}: ${dateStr}</div>
            </div>
          </div>`;

        const mCont = document.querySelector(`.task-container[data-container="${cat}"]`);
        const dCont = document.querySelector(`.feed-section[data-feed="${cat}"]`);
        if(mCont) mCont.innerHTML += mCard;
        if(dCont) dCont.innerHTML += dCard;
    });

    cats.forEach(c => {
        const mCont = document.querySelector(`.task-container[data-container="${c}"]`);
        if(mCont && mCont.innerHTML === '') mCont.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">No assignments.</p>';
        const dCont = document.querySelector(`.feed-section[data-feed="${c}"]`);
        if(dCont && dCont.innerHTML === '') dCont.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">No assignments.</p>';
    });
}

function renderHistory(data, filter = 'all') {
    let completed = data.filter(a => ['completed','done'].includes((a.status||'').toLowerCase()));
    
    if(filter !== 'all') {
        const now = new Date();
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        
        completed = completed.filter(item => {
            const d = new Date(item.completed_at || item.date);
            if(filter === 'today') return d.toDateString() === now.toDateString();
            if(filter === 'yesterday') return d.toDateString() === yesterday.toDateString();
            if(filter === 'older') return d < yesterday;
            return true;
        });
    }

    const generateHtml = (items, isMobile) => {
        if(items.length === 0) return '<p style="padding:20px; text-align:center;">No history found.</p>';
        let html = '';
        const grouped = items.reduce((acc, i) => {
            const d = new Date(i.completed_at || i.date).toLocaleDateString();
            const now = new Date().toLocaleDateString();
            const yester = new Date(new Date().setDate(new Date().getDate()-1)).toLocaleDateString();
            let k = 'Others';
            if(d === now) k = 'Today';
            else if(d === yester) k = 'Yesterday';
            if(!acc[k]) acc[k] = [];
            acc[k].push(i);
            return acc;
        }, {});

        ['Today', 'Yesterday', 'Others'].forEach(key => {
            if(grouped[key]) {
                if(isMobile) {
                    html += `<div class="mobile-history-group"><div class="mobile-history-group-title">${key}</div>`;
                    grouped[key].forEach(i => {
                        let icon = '🔧';
                        if(i.type_of_appointment.includes('Inspection')) icon = '📍';
                        else if(i.type_of_appointment.includes('Maintenance')) icon = '🌐';
                        html += `
                        <div class="mobile-history-card">
                          <div class="mobile-history-icon">${icon}</div>
                          <div class="mobile-history-info">
                            <h3>${i.type_of_appointment} - ${i.site}</h3>
                            <p class="history-sub">Ticket #${i.ticket_code || 'N/A'}</p>
                            <p class="history-meta">Completed · ${new Date(i.date).toLocaleDateString()}</p>
                          </div>
                        </div>`;
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="history-group"><div class="history-group-title">${key}</div><div class="history-list">`;
                    grouped[key].forEach(i => {
                        let icon = '🔧';
                        if(i.type_of_appointment.includes('Inspection')) icon = '📍';
                        else if(i.type_of_appointment.includes('Maintenance')) icon = '🌐';
                        html += `
                        <div class="history-list-item">
                          <div class="history-item-icon">${icon}</div>
                          <div class="history-item-body">
                            <h3 class="history-title">${i.type_of_appointment} - ${i.site}</h3>
                            <p class="history-sub">Ticket #${i.ticket_code}</p>
                            <p class="history-meta">Completed on ${new Date(i.date).toLocaleDateString()}</p>
                          </div>
                          <span class="chip chip-completed">Completed</span>
                        </div>`;
                    });
                    html += `</div></div>`;
                }
            }
        });
        return html;
    };

    const mHist = document.querySelector('.mobile-history-list-container');
    const dHist = document.querySelector('.main-section[data-main-section="history"] .history-groups');
    if(mHist) mHist.innerHTML = generateHtml(completed, true);
    if(dHist) dHist.innerHTML = generateHtml(completed, false);
}

function renderNotifications(assignments, notifications, filter = 'all') {
    let allItems = [];
    
    assignments.filter(a => (a.status||'').toLowerCase() === 'assigned').forEach(a => {
        allItems.push({ type:'new', title:'New Assignment', msg:`${a.type_of_appointment} at ${a.site}`, time:a.created_at || new Date().toISOString(), id:a.id });
    });
    notifications.materials.forEach(m => {
        const t = m.updated_at || m.created_at || new Date().toISOString();
        allItems.push({ type:'mat', title:`Material ${m.status}`, msg:`Ticket ${m.ticket_id}`, time: t, id:m.ticket_id, status:m.status });
    });
    notifications.vehicles.forEach(v => {
        const t = v.updated_at || v.created_at || new Date().toISOString();
        allItems.push({ type:'veh', title:`Vehicle ${v.status}`, msg:`Ticket ${v.ticket_id}`, time: t, id:v.ticket_id, status:v.status });
    });

    allItems.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (filter !== 'all') {
        const now = new Date();
        const todayStr = now.toDateString();
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        const startOfYesterday = new Date(yesterday); startOfYesterday.setHours(0,0,0,0);

        allItems = allItems.filter(item => {
            const d = new Date(item.time);
            if (isNaN(d.getTime())) return false;
            const itemDateStr = d.toDateString();
            if (filter === 'today') return itemDateStr === todayStr;
            if (filter === 'yesterday') return itemDateStr === yesterdayStr;
            if (filter === 'older') return d < startOfYesterday;
            return true;
        });
    }

    const generateHtml = (items, isMobile) => {
        if(items.length === 0) return '<p style="padding:20px; text-align:center;">No notifications.</p>';
        let html = '';
        
        const grouped = items.reduce((acc, i) => {
            const dObj = new Date(i.time);
            if (isNaN(dObj.getTime())) return acc;
            const d = dObj.toDateString();
            const nowStr = new Date().toDateString();
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
            const yesterStr = yesterday.toDateString();
            let k = 'Earlier';
            if(d === nowStr) k = 'Today';
            else if(d === yesterStr) k = 'Yesterday';
            if(!acc[k]) acc[k] = [];
            acc[k].push(i);
            return acc;
        }, {});

        const order = ['Today', 'Yesterday', 'Earlier'];
        order.forEach(key => {
            if(grouped[key] && grouped[key].length > 0) {
                if(isMobile) html += `<div class="notif-section"><div class="notif-section-title">${key}</div>`;
                else html += `<div class="notification-group"><div class="notif-desktop-title">${key}</div><div class="notification-grid">`;

                grouped[key].forEach(item => {
                    let icon = '🔔';
                    let clickFn = '';
                    if(item.type === 'mat') { icon = '📦'; clickFn = `openMaterialTicketModal('${item.id}', '${item.status}')`; }
                    else if(item.type === 'veh') { icon = '🚗'; clickFn = `openVehicleTicketModal('${item.id}', '${item.status}')`; }
                    else { clickFn = `openAssignmentDetails(${item.id})`; }

                    const dateObj = new Date(item.time);
                    const timeStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

                    if(isMobile) {
                        html += `
                        <button class="notif-card" type="button" onclick="${clickFn}">
                        <span class="notif-icon">${icon}</span>
                        <div class="notif-body">
                            <div class="notif-card-title">${item.title}</div>
                            <div class="notif-sub">${item.msg}</div>
                            <div class="notif-time">${timeStr}</div>
                        </div>
                        </button>`;
                    } else {
                        html += `
                        <div class="notification-card" onclick="${clickFn}">
                        <div class="notification-card-header">
                            <div class="notification-icon"><span class="notification-icon-symbol">${icon}</span></div>
                            <div class="notification-info">
                            <h3 class="notification-title">${item.title}</h3>
                            <p class="notification-message">${item.msg}</p>
                            <p class="notification-time">${timeStr}</p>
                            </div>
                        </div>
                        </div>`;
                    }
                });
                
                if(isMobile) html += `</div>`;
                else html += `</div></div>`;
            }
        });
        return html;
    };

    const mCont = document.querySelector('.mobile-notification-list-container');
    const dCont = document.querySelector('.notification-list-container');
    if(mCont) mCont.innerHTML = generateHtml(allItems, true);
    if(dCont) dCont.innerHTML = generateHtml(allItems, false);
}

function updateStats(data) {
    const total = data.length;
    
    // Use shared category logic for consistent counting
    const completed = data.filter(i => getStatusCategory(i) === 'completed').length;
    const pending = data.filter(i => getStatusCategory(i) === 'pending').length;
    const ongoing = data.filter(i => getStatusCategory(i) === 'ongoing').length;
    
    const rate = total > 0 ? Math.round((completed/total)*100) + '%' : '0%';

    const pCount = document.querySelector('.filter-btn[data-filter="pending"] .filter-count');
    if(pCount) pCount.textContent = pending;
    const oCount = document.querySelector('.filter-btn[data-filter="ongoing"] .filter-count');
    if(oCount) oCount.textContent = ongoing;
    const cCount = document.querySelector('.filter-btn[data-filter="completed"] .filter-count');
    if(cCount) cCount.textContent = completed;

    document.querySelectorAll('.stat-total').forEach(el => el.textContent = total);
    document.querySelectorAll('.stat-completed').forEach(el => el.textContent = completed);
    document.querySelectorAll('.stat-rate').forEach(el => el.textContent = rate);
}

function getAssignment(id) { return assignmentsData.find(a => a.id == id); }

function hasMaterialRequest(ticketCode) {
   return notificationsData.materials.some(m => m.ticket_code === ticketCode || m.ticket_id === ticketCode);
}

// --- DETAILS VIEW ---
window.selectAssignment = function(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if(!item) return;

    document.querySelectorAll('.assignment-item').forEach(el => el.classList.remove('selected'));
    const selectedItem = document.querySelector(`.assignment-feed .feed-section-active`).querySelector(`[onclick="selectAssignment(${id})"]`);
    if(selectedItem) selectedItem.classList.add('selected');
    
    const container = document.getElementById('desktopDetailView');
    const status = (item.status||'').toLowerCase();
    const category = getStatusCategory(item);
    
    container.innerHTML = `
      <div class="assignment-detail-header">
          <h1 class="assignment-detail-title">${item.type_of_appointment}</h1>
          <span class="assignment-detail-priority priority-medium">${item.priority_level || 'MEDIUM'}</span>
      </div>
      <div class="assignment-detail-meta">
          <p class="assignment-detail-site">Site: ${item.site}</p>
          <p class="assignment-detail-due">Due: ${new Date(item.date).toLocaleDateString()}</p>
      </div>
      <div class="assignment-sections">
          <div class="section-content">
              <div class="details-grid">
                  <div class="detail-card"><div class="detail-label">TICKET NUMBER</div><div class="detail-value">${item.ticket_code || 'N/A'}</div></div>
                  <div class="detail-card"><div class="detail-label">DATE & TIME</div><div class="detail-value">${new Date(item.date).toLocaleString()}</div></div>
                  <div class="detail-card"><div class="detail-label">PRIORITY</div><div class="detail-value">${item.priority_level || 'N/A'}</div></div>
                  <div class="detail-card"><div class="detail-label">TYPE</div><div class="detail-value">${item.type_of_appointment}</div></div>
                  <div class="detail-card detail-card-full"><div class="detail-label">DESCRIPTION</div><div class="detail-value">${item.task_description || 'N/A'}</div></div>
                  <div class="detail-card detail-card-full"><div class="detail-label">REMARKS</div><div class="detail-value">${item.pm_remarks || 'None'}</div></div>
              </div>
          </div>
      </div>`;

    const pendingActions = document.getElementById('desktopPendingActions');
    const ongoingActions = document.getElementById('desktopAssignmentActions');
    
    pendingActions.style.display = 'none';
    ongoingActions.style.display = 'none';

    if(category === 'pending') {
        pendingActions.style.display = 'flex';
    } else if(category === 'ongoing') {
        ongoingActions.style.display = 'flex';
        const matBtn = document.getElementById('desktopRequestMaterialBtn');
        if(hasMaterialRequest(item.ticket_code)) {
            matBtn.textContent = 'Material Requested';
            matBtn.classList.add('btn-requested');
        } else {
            matBtn.textContent = 'Request Material';
            matBtn.classList.remove('btn-requested');
        }
    }
};

window.openAssignmentDetails = function(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if(!item) return;

    document.getElementById('mTitle').textContent = item.type_of_appointment;
    document.getElementById('mSite').textContent = `Site: ${item.site}`;
    document.getElementById('mDue').textContent = `Due: ${new Date(item.date).toLocaleDateString()}`;
    document.getElementById('mTicket').textContent = item.ticket_code || 'N/A';
    document.getElementById('mDateTime').textContent = new Date(item.date).toLocaleString();
    document.getElementById('mPriority').textContent = item.priority_level || 'Medium';
    document.getElementById('mType').textContent = item.type_of_appointment;
    document.getElementById('mDescription').textContent = item.task_description || 'N/A';
    document.getElementById('mRemarks').textContent = item.pm_remarks || 'None';

    const category = getStatusCategory(item);

    document.getElementById('mobileActionBtn').style.display = (category === 'pending') ? 'block' : 'none';
    
    const matBtn = document.getElementById('mobileRequestMaterialBtn');
    matBtn.style.display = (category === 'ongoing') ? 'block' : 'none';
    
    if(category === 'ongoing' && hasMaterialRequest(item.ticket_code)) {
        matBtn.textContent = 'Material Requested';
        matBtn.classList.add('btn-requested');
    } else {
        matBtn.textContent = 'REQUEST MATERIAL';
        matBtn.classList.remove('btn-requested');
    }

    document.getElementById('mobileRequestVehicleBtn').style.display = (category === 'ongoing') ? 'block' : 'none';
    document.getElementById('mobileMarkCompletedBtn').style.display = (category === 'ongoing') ? 'block' : 'none';

    document.getElementById('mobileAssignmentDetails').classList.add('show');
};

window.closeMobileAssignmentDetails = function() {
    document.getElementById('mobileAssignmentDetails').classList.remove('show');
};

// --- ACTION LOGIC ---
window.acknowledgeAssignment = function() { document.getElementById('acknowledgeModal').classList.add('show'); };
window.closeAcknowledgeModal = function() { document.getElementById('acknowledgeModal').classList.remove('show'); };

window.confirmAcknowledge = async function() {
    if(!currentAssignmentId) return;
    const remarks = document.getElementById('acknowledgeRemarks').value;
    try {
        await fetch('http://localhost:3000/api/engineer/acknowledge', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ appointment_id: currentAssignmentId, remarks })
        });
        closeAcknowledgeModal();
        closeMobileAssignmentDetails();
        fetchDashboardData();
        showToast('Acknowledged');

        setTimeout(() => {
            requestVehicle();
        }, 300);

    } catch(e) { alert(e.message); }
};

window.requestMaterial = function() {
    const btn = document.getElementById('desktopRequestMaterialBtn');
    if(btn.classList.contains('btn-requested')) return;

    document.getElementById('materialRequestModal').classList.add('show');
    document.getElementById('mrList').innerHTML = '';
    addMaterialRow();
};
window.closeMaterialRequestModal = function() { document.getElementById('materialRequestModal').classList.remove('show'); };

window.addMaterialRow = function() {
    const div = document.createElement('div');
    div.className = 'mr-row';
    div.innerHTML = `
        <input class="modal-input mr-type" placeholder="Item">
        <input class="modal-input mr-qty" type="number" placeholder="Qty" style="width:80px;">
        <button class="remove-material-btn" onclick="this.parentElement.remove()">×</button>`;
    document.getElementById('mrList').appendChild(div);
};

window.confirmMaterialRequest = async function() {
    const item = getAssignment(currentAssignmentId);
    const rows = document.querySelectorAll('#mrList .mr-row');
    const materials = Array.from(rows).map(r => ({
        type: r.querySelector('.mr-type').value,
        qty: r.querySelector('.mr-qty').value
    })).filter(m => m.type);
    
    try {
        await fetch('http://localhost:3000/api/engineer/request-material', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ticket_code: item.ticket_code, site: item.site, materials, remarks: document.getElementById('mrRemarks').value })
        });
        
        closeMaterialRequestModal();
        showToast('Material Request Sent');

        notificationsData.materials.push({ ticket_code: item.ticket_code, status: 'Pending' });

        const dBtn = document.getElementById('desktopRequestMaterialBtn');
        if(dBtn) {
            dBtn.textContent = 'Material Requested';
            dBtn.classList.add('btn-requested');
        }

        const mBtn = document.getElementById('mobileRequestMaterialBtn');
        if(mBtn) {
            mBtn.textContent = 'Material Requested';
            mBtn.classList.add('btn-requested');
        }

    } catch(e) { alert(e.message); }
};

window.requestVehicle = function() {
    const item = getAssignment(currentAssignmentId);
    if(!item) return alert("Select assignment");
    document.getElementById('vehReqSite').textContent = item.site;
    document.getElementById('requestVehicleModal').classList.add('show');
};
window.closeRequestVehicleModal = function() { document.getElementById('requestVehicleModal').classList.remove('show'); };

window.confirmRequestVehicle = async function() {
    const item = getAssignment(currentAssignmentId);
    const remarks = document.getElementById('vehicleRemarks').value;
    try {
        await fetch('http://localhost:3000/api/engineer/request-vehicle', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ticket_code: item.ticket_code, location: item.site, remarks, requested_by: currentUser.email })
        });
        closeRequestVehicleModal();
        showToast('Vehicle Requested');
    } catch(e) { alert(e.message); }
};

window.markAsCompleted = function() {
    if(!currentAssignmentId) return alert("Select assignment");
    document.getElementById('markCompletedModal').classList.add('show');
};
window.closeMarkCompletedModal = function() { document.getElementById('markCompletedModal').classList.remove('show'); };

window.confirmMarkCompleted = async function() {
    if (!currentAssignmentId) { alert("Error: No assignment ID selected."); return; }
    
    const remarks = document.getElementById('markCompletedRemarks').value || '';
    const item = getAssignment(currentAssignmentId); 
    const numericId = parseInt(currentAssignmentId, 10);
    const btn = document.querySelector('#markCompletedModal .modal-btn-confirm');
    
    btn.textContent = "Updating...";
    btn.disabled = true;

    try {
        console.log(`Completing Task: ${item?.ticket_code}`);

        // 1. UPDATE ENGINEER RECORD (Already working)
        const { error: appError } = await supabase
            .from('appointment_records') 
            .update({ 
                status: 'Completed',          
                engineerStatus: 'Completed',  
                engineer_remarks: remarks,    
                completed_at: new Date().toISOString()
            })
            .eq('id', numericId);

        if (appError) throw new Error(`Engineer Update Failed: ${appError.message}`);

        // 2. UPDATE ASSET MANAGER (Material Requests) - The Fix
        if (item && item.ticket_code) {
            // Try to find the row first to debug
            const { data: matRows, error: findError } = await supabase
                .from('material_requests')
                .select('id, status')
                .eq('ticket_id', item.ticket_code); // Ensure column name is ticket_id

            console.log("Found Material Requests:", matRows);

            if (matRows && matRows.length > 0) {
                // Perform the update
                const { error: matError } = await supabase
                    .from('material_requests')
                    .update({ status: 'Completed' })
                    .eq('ticket_id', item.ticket_code); // Using ticket_id to target the row directly
                
                if (matError) {
                    console.error("Material Update Error:", matError);
                    alert("Warning: Could not update Asset Manager status. Check Database Permissions.");
                } else {
                    console.log("Material Request marked Completed.");
                }
            }
        }

        // 3. UPDATE FLEET MANAGER (Vehicle Requests)
        if (item && item.ticket_code) {
            const { data: vehReq } = await supabase
                .from('vehicle_requests')
                .select('id, driver_id, vehicle_id')
                .eq('ticket_id', item.ticket_code)
                .maybeSingle();

            if (vehReq) {
                await supabase.from('vehicle_requests').update({ status: 'Completed' }).eq('id', vehReq.id);
                if (vehReq.vehicle_id) await supabase.from('fleet_vehicles').update({ status: 'Idle' }).eq('id', vehReq.vehicle_id);
                if (vehReq.driver_id) await supabase.from('fleet_drivers').update({ status: 'Active' }).eq('id', vehReq.driver_id);
            }
        }

        // 4. Success
        closeMarkCompletedModal();
        closeMobileAssignmentDetails();
        showToast('Task Marked Completed Everywhere');
        
        setTimeout(() => fetchDashboardData(), 500);

    } catch (e) { 
        console.error("Completion Error:", e); 
        alert('Error: ' + e.message); 
    } finally {
        btn.textContent = "Confirm";
        btn.disabled = false;
    }
};

window.openVehicleTicketModal = function(id, status) {
    const ticket = notificationsData.vehicles.find(v => v.ticket_id === id);
    if(!ticket) return;
    document.getElementById('vtTicket').value = ticket.ticket_id;
    document.getElementById('vtLocation').value = ticket.location;
    document.getElementById('vtStatus').value = ticket.status;
    document.getElementById('vtDriver').value = ticket.driver_name || 'N/A';
    document.getElementById('vtRemarks').value = ticket.remarks || '';
    document.getElementById('vehicleTicketModal').classList.add('show');
};
window.closeVehicleTicketModal = function() { document.getElementById('vehicleTicketModal').classList.remove('show'); };

window.openMaterialTicketModal = function(id, status) {
    const ticket = notificationsData.materials.find(m => m.ticket_id === id);
    if(!ticket) return;
    document.getElementById('mtTicket').value = ticket.ticket_id;
    document.getElementById('mtSite').value = ticket.site;
    document.getElementById('mtStatus').value = ticket.status;
    document.getElementById('mtItems').value = JSON.stringify(ticket.items || []);
    document.getElementById('mtRemarks').value = ticket.remarks || '';
    document.getElementById('materialTicketModal').classList.add('show');
};
window.closeMaterialTicketModal = function() { document.getElementById('materialTicketModal').classList.remove('show'); };

window.showToast = function(msg) {
    const t = document.getElementById('successToast');
    t.querySelector('.toast-text').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
};

window.logout = function() {
    supabase.auth.signOut();
    window.location.href = '../login/login.html';
};