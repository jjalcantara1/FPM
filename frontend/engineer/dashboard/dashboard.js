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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '../login/login.html';
        }
        return;
    }
    currentUser = session.user;

    initSidebarNavigation();
    initMobileNavigation();
    initTabs();
    
    loadUserProfile();
    fetchDashboardData(); 
});

// --- NAVIGATION ---
function initSidebarNavigation() {
    const navLinks = document.querySelectorAll(".main-navigation .nav-item");
    const contentSections = document.querySelectorAll(".main-section");
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute("data-page");
            
            navLinks.forEach(l => l.classList.remove("nav-item-active"));
            link.classList.add("nav-item-active");
            
            contentSections.forEach(s => {
                s.classList.remove("content-section-active", "main-section-active");
                if (s.getAttribute("data-content") === targetPage) {
                    s.classList.add("content-section-active", "main-section-active");
                }
            });
        });
    });
}

function initMobileNavigation() {
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
    tabs.forEach(t => {
        t.addEventListener("click", () => {
            tabs.forEach(x => x.classList.remove("tab-active"));
            t.classList.add("tab-active");
            const target = t.getAttribute("data-tab");
            document.querySelectorAll(".task-container").forEach(c => {
                c.classList.remove("task-container-active");
                if (c.getAttribute("data-container") === target) {
                    c.classList.add("task-container-active");
                }
            });
        });
    });
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("filter-btn-active"));
            btn.classList.add("filter-btn-active");
            const target = btn.getAttribute("data-filter");
            document.querySelectorAll(".feed-section").forEach(s => {
                s.classList.remove("feed-section-active");
                if (s.getAttribute("data-feed") === target) {
                    s.classList.add("feed-section-active");
                }
            });
        });
    });
}

// --- DATA FETCHING ---
async function loadUserProfile() {
    const { data } = await supabase
        .from('engineer_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    if (data) {
        const fullName = `${data.firstName} ${data.lastName}`;
        document.querySelectorAll('.user-name, .profile-name, .hero-subtitle, .profile-name-large, .mobile-profile-name').forEach(el => el.textContent = fullName);
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
        renderHistory(assignmentsData);
        renderNotifications(assignmentsData, notificationsData); 
        updateStats(assignmentsData); 
        
    } catch (error) { 
        console.error("Error:", error);
        document.querySelectorAll('.task-container').forEach(el => el.innerHTML = '<p style="text-align:center;padding:20px;color:red;">Error loading tasks.</p>');
        alert("Error loading dashboard data. Is the backend server running?");
    }
}

// --- RENDER FUNCTIONS ---
function renderAssignments(data) {
    const sections = ['pending', 'ongoing', 'completed'];
    const containers = {};
    sections.forEach(key => {
        containers[key] = {
            mobile: document.querySelector(`.task-container[data-container="${key}"]`),
            desktop: document.querySelector(`.feed-section[data-feed="${key}"]`)
        };
        if(containers[key].mobile) containers[key].mobile.innerHTML = '';
        if(containers[key].desktop) containers[key].desktop.innerHTML = '';
    });

    data.forEach(item => {
        const status = (item.status || '').toLowerCase();
        let category = 'pending';
        if (['in progress', 'ongoing', 'accepted'].includes(status)) category = 'ongoing';
        else if (['completed', 'done'].includes(status)) category = 'completed';
        else if (['pending', 'assigned'].includes(status)) category = 'pending';
        else return; 

        const dateStr = new Date(item.date).toLocaleDateString();
        const priority = (item.priority_level || 'Low').toLowerCase();
        const priorityClass = priority === 'high' ? 'priority-high' : 'priority-medium';

        const mobileCard = `
            <article class="assignment-card" onclick="openAssignmentDetails(${item.id})">
                <div class="assignment-card-header">
                  <div class="assignment-title">${item.type_of_appointment}</div>
                  <div class="assignment-priority ${priorityClass}">${item.priority_level || 'Normal'}</div>
                </div>
                <div class="assignment-location">Site: ${item.site}</div>
                <div class="assignment-due-label">${category === 'completed' ? 'Completed' : 'Due'}: ${dateStr}</div>
                <div class="assignment-progress assignment-progress-${priority === 'high' ? 'high' : 'medium'}"></div>
            </article>`;
        
        const desktopCard = `
            <div class="assignment-item" onclick="selectDesktopAssignment(${item.id})">
                <div class="assignment-avatar"><span class="assignment-icon">📋</span></div>
                <div class="assignment-info">
                    <div class="assignment-name">${item.type_of_appointment}</div>
                    <div class="assignment-location">${item.site}</div>
                    <div class="assignment-time">Due: ${dateStr}</div>
                </div>
            </div>`;

        if (containers[category].mobile) containers[category].mobile.innerHTML += mobileCard;
        if (containers[category].desktop) containers[category].desktop.innerHTML += desktopCard;
    });

    // Empty States
    sections.forEach(key => {
        if(containers[key].mobile && containers[key].mobile.innerHTML === '') containers[key].mobile.innerHTML = `<p style="text-align:center;padding:20px;color:#999;">No ${key} assignments.</p>`;
        if(containers[key].desktop && containers[key].desktop.innerHTML === '') containers[key].desktop.innerHTML = `<p style="text-align:center;padding:20px;color:#999;">No ${key} assignments.</p>`;
    });
}

function renderHistory(data) {
    const completedItems = data.filter(a => (a.status || '').toLowerCase() === 'completed');
    const html = completedItems.map(item => `
        <div class="history-card" style="padding:16px; margin-bottom:10px; border-radius:8px; border:1px solid #eee;">
            <div style="font-weight:600;">${item.type_of_appointment} - ${item.site}</div>
            <div style="font-size:12px; color:#666;">Completed on ${new Date(item.completed_at || Date.now()).toLocaleDateString()}</div>
        </div>`).join('');

    const mobHist = document.querySelector('.mobile-history-list');
    const deskHist = document.querySelector('.section-content-area.history-list');
    if(mobHist) mobHist.innerHTML = html || '<p style="text-align:center;padding:20px;">No history</p>';
    if(deskHist) deskHist.innerHTML = html || '<p style="text-align:center;padding:20px;">No history</p>';
}

function renderNotifications(assignments, notifications) {
    let allNotifs = [];

    // 1. New/Pending Assignments (Only for non-Acknowledged assigned tasks)
    assignments.filter(i => (i.status||'').toLowerCase() === 'assigned').forEach(i => {
        allNotifs.push({ type: 'assignment', title: 'New Task Assigned', msg: `New task assigned: ${i.type_of_appointment} at ${i.site}`, time: i.created_at, ticket: i.ticket_code, data: i });
    });

    // 2. Material Updates (Approved/On Hold)
    notifications.materials.forEach(m => {
        allNotifs.push({ type: 'material', title: `Material Request ${m.status}`, msg: `Request for ticket ${m.ticket_id} is now ${m.status}`, time: m.updated_at || m.created_at, ticket: m.ticket_id, data: m });
    });

    // 3. Vehicle Updates (Approved/On Hold)
    notifications.vehicles.forEach(v => {
        allNotifs.push({ type: 'vehicle', title: `Vehicle Request ${v.status}`, msg: `Vehicle for ticket ${v.ticket_id} is ${v.status}`, time: v.updated_at || v.created_at, ticket: v.ticket_id, data: v });
    });

    // Sort by time (newest first)
    allNotifs.sort((a, b) => new Date(b.time) - new Date(a.time));

    let html = '';
    const today = new Date().toLocaleDateString();
    let isTodaySection = true;

    allNotifs.forEach(n => {
        const date = new Date(n.time).toLocaleDateString();
        const time = new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isTodaySection && date !== today) {
            html += `<div class="notif-section-title" style="margin-top:10px;">Yesterday & Older</div>`;
            isTodaySection = false;
        }

        const icon = n.type === 'assignment' ? '📋' : n.type === 'vehicle' ? '🚗' : '📦';
        let clickHandler;
        let statusText = n.data.status || 'N/A';
        const modalStatus = statusText.replace(/ /g, '_'); 

        if (n.type === 'material') {
             clickHandler = `openMaterialTicketModal('${n.ticket}', '${modalStatus}')`;
        } else if (n.type === 'vehicle') {
             clickHandler = `openVehicleTicketModal('${n.ticket}', '${modalStatus}')`;
        } else {
             clickHandler = `alert('Please navigate to Assignments tab to acknowledge ticket ${n.ticket}')`;
        }
        
        html += `
            <button class="notif-card" type="button" onclick="${clickHandler}" style="padding:16px; background:white; margin-bottom:10px; border-radius:8px; border-left:4px solid ${n.type === 'assignment' ? '#f47621' : '#2563eb'}; box-shadow:0 2px 5px rgba(0,0,0,0.05); width:100%;">
                <div style="display:flex; align-items:center;">
                    <span class="nav-icon" style="font-size:20px; margin-right:12px;">${icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:14px; margin-bottom:2px;">${n.title}</div>
                        <div style="font-size:13px; color:#666;">${n.msg}</div>
                        <div style="font-size:11px; color:#888; margin-top:4px;">${date === today ? 'Today at ' + time : date}</div>
                    </div>
                </div>
            </button>`;
    });

    const container = document.querySelector('.notification-list');
    if (container) {
        container.innerHTML = html || '<p style="text-align:center;padding:20px;color:#666;">No notifications.</p>';
    }
}

function updateStats(data) {
    const total = data.length;
    const completed = data.filter(i => (i.status||'').toLowerCase() === 'completed').length;
    const pending = data.filter(i => ['pending','assigned'].includes((i.status||'').toLowerCase())).length;
    const ongoing = data.filter(i => ['in progress','ongoing','accepted'].includes((i.status||'').toLowerCase())).length;
    const rate = total > 0 ? Math.round((completed/total)*100) + '%' : '0%';

    // FIX 3: Update filter counts in the sidebar
    document.querySelector('.filter-btn[data-filter="pending"] .filter-count').textContent = pending;
    document.querySelector('.filter-btn[data-filter="ongoing"] .filter-count').textContent = ongoing;
    document.querySelector('.filter-btn[data-filter="completed"] .filter-count').textContent = completed;


    // Update profile stats
    const totalEls = document.querySelectorAll('.stat-total');
    const completedEls = document.querySelectorAll('.stat-completed');
    const rateEls = document.querySelectorAll('.stat-rate');

    if (totalEls.length) totalEls.forEach(el => el.textContent = total);
    if (completedEls.length) completedEls.forEach(el => el.textContent = completed);
    if (rateEls.length) rateEls.forEach(el => el.textContent = rate);
}

// --- MODAL HELPERS ---

function closeVehicleTicketModal() { document.getElementById('vehicleTicketModal').classList.remove('show'); }
function closeMaterialTicketModal() { document.getElementById('materialTicketModal').classList.remove('show'); }

window.openMaterialTicketModal = function(ticketId, status) {
    const ticket = notificationsData.materials.find(m => m.ticket_id === ticketId);
    if (!ticket) return alert(`Material ticket ${ticketId} not found.`);
    
    document.querySelector('#materialTicketModal .modal-title').textContent = `Material Request: ${status.replace(/_/g, ' ')}`;
    
    document.getElementById('mtTicket').value = ticket.ticket_id;
    document.getElementById('mtStatus').value = ticket.status; 
    document.getElementById('mtSite').value = ticket.site;
    document.getElementById('mtDatetime').value = new Date(ticket.request_date).toLocaleString();
    
    const remarksContent = ticket.remarks.replace('Requested: ', '').trim();
    let itemDisplay = ticket.remarks;
    try {
        const materialList = JSON.parse(remarksContent);
        if (Array.isArray(materialList)) {
            itemDisplay = materialList.map(m => `${m.type} (Qty: ${m.qty})`).join(', ');
        }
    } catch (e) {
        itemDisplay = remarksContent;
    }

    document.getElementById('mtItems').value = itemDisplay;
    document.getElementById('mtRemarks').value = ticket.remarks;
    
    document.getElementById('materialTicketModal').classList.add('show');
};

window.openVehicleTicketModal = function(ticketId, status) {
    const ticket = notificationsData.vehicles.find(v => v.ticket_id === ticketId);
    if (!ticket) return alert(`Vehicle ticket ${ticketId} not found.`);
    
    document.querySelector('#vehicleTicketModal .modal-title').textContent = `Vehicle Ticket: ${status.replace(/_/g, ' ')}`;

    document.getElementById('vtTicket').value = ticket.ticket_id;
    document.getElementById('vtStatus').value = ticket.status;
    document.getElementById('vtPickup').value = ticket.request_date ? new Date(ticket.request_date).toLocaleString() : 'N/A';
    document.getElementById('vtLocation').value = ticket.location;
    document.getElementById('vtPriority').value = ticket.priority || 'N/A';
    document.getElementById('vtRemarks').value = ticket.remarks || 'None';
    
    document.getElementById('vtDriver').value = ticket.driver_name || 'Not Assigned'; 
    document.getElementById('vtContact').value = ticket.driver_contact || 'N/A';
    document.getElementById('vtVehicle').value = ticket.vehicle_type || 'Not Assigned'; 

    document.getElementById('vehicleTicketModal').classList.add('show');
};

// --- ASSIGNMENT DETAILS / ACTIONS ---
function getAssignment(id) { return assignmentsData.find(a => a.id == id); }

function openAssignmentDetails(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if(!item) return;

    document.getElementById('mTitle').textContent = item.type_of_appointment;
    document.getElementById('mSite').textContent = `Site: ${item.site}`;
    document.getElementById('mDue').textContent = `Due: ${new Date(item.date).toLocaleDateString()}`;
    document.getElementById('mTicket').textContent = item.ticket_code;
    document.getElementById('mDescription').textContent = item.task_description;
    document.getElementById('mRemarks').textContent = item.pm_remarks || 'None';

    const status = (item.status||'').toLowerCase();
    const isOngoing = ['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status);
    
    document.getElementById('mobileActionBtn').style.display = ['pending','assigned'].includes(status) ? 'block' : 'none';
    document.getElementById('mobileRequestMaterialBtn').style.display = isOngoing ? 'block' : 'none';
    document.getElementById('mobileRequestVehicleBtn').style.display = isOngoing ? 'block' : 'none';
    document.getElementById('mobileMarkCompletedBtn').style.display = isOngoing ? 'block' : 'none';

    document.getElementById('mobileAssignmentDetails').classList.add('show');
}
function closeMobileAssignmentDetails() {
    document.getElementById('mobileAssignmentDetails').classList.remove('show');
}

function selectDesktopAssignment(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if(!item) return;

    const container = document.getElementById('desktopDetailView');
    container.innerHTML = `
        <div class="assignment-detail-header">
            <h1 class="assignment-detail-title">${item.type_of_appointment}</h1>
            <span class="assignment-detail-priority priority-medium">${item.priority_level || 'Medium'}</span>
        </div>
        <div class="assignment-detail-meta">
            <p class="assignment-detail-site">Site: ${item.site}</p>
            <p class="assignment-detail-due">Due: ${new Date(item.date).toLocaleDateString()}</p>
        </div>
        <div class="details-grid">
            <div class="detail-card"><div class="detail-label">TICKET</div><div class="detail-value">${item.ticket_code}</div></div>
            <div class="detail-card"><div class="detail-label">STATUS</div><div class="detail-value">${item.status}</div></div>
            <div class="detail-card detail-card-full"><div class="detail-label">DESCRIPTION</div><div class="detail-value">${item.task_description}</div></div>
            <div class="detail-card detail-card-full"><div class="detail-label">PM REMARKS</div><div class="detail-value">${item.pm_remarks || 'None'}</div></div>
        </div>
    `;

    const status = (item.status||'').toLowerCase();
    const pendingActions = document.getElementById('desktopPendingActions');
    const ongoingActions = document.getElementById('desktopAssignmentActions');

    if(pendingActions) pendingActions.style.display = 'none';
    if(ongoingActions) ongoingActions.style.display = 'none';

    if(['pending', 'assigned'].includes(status)) {
        if(pendingActions) pendingActions.style.display = 'block';
    } else if(['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status)) {
        if(ongoingActions) ongoingActions.style.display = 'flex';
    }
}


function acknowledgeAssignment() { document.getElementById('acknowledgeModal').classList.add('show'); }
function closeAcknowledgeModal() { document.getElementById('acknowledgeModal').classList.remove('show'); }
async function confirmAcknowledge() {
    try {
        const response = await fetch('http://localhost:3000/api/engineer/acknowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_id: currentAssignmentId, remarks: document.getElementById('acknowledgeRemarks').value })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to acknowledge');
        }
        closeAcknowledgeModal();
        closeMobileAssignmentDetails();
        fetchDashboardData();
        alert('Assignment Acknowledged');
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
}

function requestMaterial() { 
    document.getElementById('materialRequestModal').classList.add('show'); 
    document.getElementById('mrList').innerHTML = '';
    addMaterialRow();
}
function closeMaterialRequestModal() { document.getElementById('materialRequestModal').classList.remove('show'); }
function addMaterialRow() {
    document.getElementById('mrList').insertAdjacentHTML('beforeend', `<div class="mr-row"><input class="modal-input mr-type" placeholder="Item"><input class="modal-input mr-qty" type="number" placeholder="Qty"></div>`);
}

async function confirmMaterialRequest() {
    const item = getAssignment(currentAssignmentId);
    const materials = Array.from(document.querySelectorAll('.mr-row')).map(r => ({
        type: r.querySelector('.mr-type').value,
        qty: r.querySelector('.mr-qty').value
    })).filter(m => m.type);

    if(!materials.length) return alert('Please add at least one item.');
    if(!currentAssignmentId) return alert('No assignment selected');
    
    try {
        const res = await fetch('http://localhost:3000/api/engineer/request-material', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ 
                ticket_code: item.ticket_code, 
                site: item.site, 
                materials, 
                remarks: document.getElementById('mrRemarks').value 
            })
        });
        if(!res.ok) throw new Error('Failed');
        closeMaterialRequestModal();
        alert('Request Sent');
    } catch(e) { alert('Error: '+e.message); }
}

function requestVehicle() {
    const item = getAssignment(currentAssignmentId);
    if (!item) return alert("Please select an assignment first.");

    document.getElementById('vehReqSite').textContent = item.site || 'N/A';
    document.getElementById('vehicleRemarks').value = '';
    document.getElementById('requestVehicleModal').classList.add('show');
}
function closeRequestVehicleModal() { 
    document.getElementById('requestVehicleModal').classList.remove('show'); 
}

async function confirmRequestVehicle() {
    const item = getAssignment(currentAssignmentId);
    const remarks = document.getElementById('vehicleRemarks').value;

    if (!item || !item.ticket_code) return alert('No valid ticket selected.');

    try {
        const response = await fetch('http://localhost:3000/api/engineer/request-vehicle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_code: item.ticket_code,
                location: item.site,
                remarks: remarks,
                requested_by: currentUser.email
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to submit vehicle request.');
        }
        closeRequestVehicleModal();
        alert('Vehicle Request Submitted!');
    } catch (e) {
        alert('Error submitting vehicle request: ' + e.message);
    }
}


function markAsCompleted() { 
    if (!currentAssignmentId) {
        alert("Please select an assignment first.");
        return;
    }
    document.getElementById('markCompletedModal').classList.add('show'); 
}
function closeMarkCompletedModal() { document.getElementById('markCompletedModal').classList.remove('show'); }

async function confirmMarkCompleted() {
    if (!currentAssignmentId) {
        alert("Error: No assignment ID selected.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/engineer/complete', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                appointment_id: currentAssignmentId,
                remarks: document.getElementById('markCompletedRemarks').value || ''
            })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to complete assignment');
        }

        closeMarkCompletedModal();
        closeMobileAssignmentDetails();
        fetchDashboardData();
        alert('Marked as Completed');
    } catch (e) { 
        console.error(e); 
        alert('Error: ' + e.message); 
    }
}

function logout() { supabase.auth.signOut(); window.location.href = '../login/login.html'; }
function goBack() { location.reload(); }