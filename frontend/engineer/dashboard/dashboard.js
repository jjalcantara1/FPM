const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';

let supabase;
let currentUser = null;
let assignmentsData = [];
let currentAssignmentId = null;

if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!supabase) { console.error("Supabase not loaded"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../login/login.html';
        return;
    }
    currentUser = session.user;

    initSidebarNavigation();
    initMobileNavigation();
    initTabs();
    
    loadUserProfile();
    fetchAssignments();
});

// --- NAVIGATION ---
function initSidebarNavigation() {
    const navLinks = document.querySelectorAll(".main-navigation .nav-item");
    const contentSections = document.querySelectorAll(".content-section");

    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute("data-page");
            navLinks.forEach(l => l.classList.remove("nav-item-active"));
            link.classList.add("nav-item-active");

            contentSections.forEach(s => {
                s.classList.remove("content-section-active");
                s.classList.remove("main-section-active");
                if (s.getAttribute("data-content") === targetPage) {
                    s.classList.add("content-section-active");
                    s.classList.add("main-section-active");
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

// --- DATA ---
async function loadUserProfile() {
    const { data } = await supabase
        .from('engineer_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();
    
    if (data) {
        const fullName = `${data.firstName} ${data.lastName}`;
        const initials = (data.firstName[0] + data.lastName[0]).toUpperCase();
        
        document.querySelectorAll('.user-name, .profile-name, .hero-subtitle, .profile-name-large, .mobile-profile-name').forEach(el => {
            el.textContent = fullName;
        });
        document.querySelectorAll('.profile-email, .profile-email-large, .mobile-profile-email').forEach(el => {
            el.textContent = data.email;
        });
        document.querySelectorAll('.profile-initials, .profile-initials-large, .mobile-profile-initials').forEach(el => {
            el.textContent = initials;
        });
    }
}

async function fetchAssignments() {
    const { data: { session } } = await supabase.auth.getSession();
    try {
        const response = await fetch('http://localhost:3000/api/engineer/assignments', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch assignments');
        
        assignmentsData = await response.json();
        renderAssignments(assignmentsData);
        renderHistory(assignmentsData);
        renderNotifications(assignmentsData);
        updateStats(assignmentsData);
    } catch (error) { console.error("Error:", error); }
}

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
        if (['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status)) category = 'ongoing';
        else if (['completed', 'done'].includes(status)) category = 'completed';
        else if (['pending', 'assigned'].includes(status)) category = 'pending';
        else return; 

        const dateStr = new Date(item.date).toLocaleDateString();
        const priority = (item.priority_level || 'Low').toLowerCase();
        const priorityClass = priority === 'high' ? 'priority-high' : 'priority-medium';

        if (containers[category].mobile) {
            const card = document.createElement('article');
            card.className = 'assignment-card';
            card.onclick = () => openAssignmentDetails(item.id);
            card.innerHTML = `
                <div class="assignment-card-header">
                  <div class="assignment-title">${item.type_of_appointment}</div>
                  <div class="assignment-priority ${priorityClass}">${item.priority_level || 'Normal'}</div>
                </div>
                <div class="assignment-location">Site: ${item.site}</div>
                <div class="assignment-due-label">${category === 'completed' ? 'Completed' : 'Due'}: ${dateStr}</div>
                <div class="assignment-progress assignment-progress-${priority === 'high' ? 'high' : 'medium'}"></div>
            `;
            containers[category].mobile.appendChild(card);
        }

        if (containers[category].desktop) {
            const div = document.createElement('div');
            div.className = 'assignment-item';
            div.onclick = () => selectDesktopAssignment(item.id);
            div.innerHTML = `
                <div class="assignment-avatar"><span class="assignment-icon">📋</span></div>
                <div class="assignment-info">
                    <div class="assignment-name">${item.type_of_appointment}</div>
                    <div class="assignment-location">${item.site}</div>
                    <div class="assignment-time">Due: ${dateStr}</div>
                </div>
            `;
            containers[category].desktop.appendChild(div);
        }
    });

    // Update Counts
    sections.forEach(key => {
        const count = document.querySelector(`.filter-btn[data-filter="${key}"] .filter-count`);
        if(count) {
            let num = 0;
            if(key === 'pending') num = data.filter(i => ['pending','assigned'].includes((i.status||'').toLowerCase())).length;
            if(key === 'ongoing') num = data.filter(i => ['in progress','ongoing'].includes((i.status||'').toLowerCase())).length;
            if(key === 'completed') num = data.filter(i => ['completed'].includes((i.status||'').toLowerCase())).length;
            count.textContent = num;
        }
    });
}

function renderHistory(data) {
    const completedItems = data.filter(a => (a.status || '').toLowerCase() === 'completed');
    
    const mobHistList = document.querySelector('.mobile-history-list');
    if(mobHistList) {
        mobHistList.innerHTML = '';
        completedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'mobile-history-card';
            div.innerHTML = `
                <div class="mobile-history-icon">✅</div>
                <div class="mobile-history-info">
                    <h3>${item.type_of_appointment}</h3>
                    <p class="history-sub">${item.site}</p>
                    <p class="history-meta">Completed: ${new Date(item.completed_at || Date.now()).toLocaleDateString()}</p>
                </div>`;
            mobHistList.appendChild(div);
        });
    }

    const deskHistList = document.querySelector('.section-content-area.history-list');
    if(deskHistList) {
        deskHistList.innerHTML = '';
        completedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-card';
            div.innerHTML = `
                <div class="history-card-header">
                    <div class="history-icon">✅</div>
                    <div class="history-info">
                        <div class="history-title">${item.type_of_appointment}</div>
                        <p class="history-meta">${item.site} - Completed on ${new Date(item.completed_at || Date.now()).toDateString()}</p>
                    </div>
                </div>
                <span class="history-status completed">Completed</span>`;
            deskHistList.appendChild(div);
        });
    }
}

function renderNotifications(data) {
    const notifs = data.filter(item => (item.status||'').toLowerCase() === 'pending').map(item => ({ 
        title: 'New Assignment', 
        msg: `You have a new task at ${item.site}`, 
        time: item.created_at 
    }));

    const notifList = document.querySelector('.section-content-area.notification-list');
    if(notifList) {
        notifList.innerHTML = '';
        if(notifs.length === 0) notifList.innerHTML = '<div style="padding:20px;color:#666">No new notifications</div>';
        else {
            const grid = document.createElement('div');
            grid.className = 'notification-grid';
            notifs.forEach(n => {
                const card = document.createElement('div');
                card.className = 'notification-card';
                card.innerHTML = `
                    <div class="notification-card-header">
                        <div class="notification-icon">🔔</div>
                        <div class="notification-info">
                            <div class="notification-title">${n.title}</div>
                            <div class="notification-message">${n.msg}</div>
                            <div class="notification-time">${new Date(n.time).toLocaleTimeString()}</div>
                        </div>
                    </div>`;
                grid.appendChild(card);
            });
            notifList.appendChild(grid);
        }
    }
}

function updateStats(data) {
    const total = data.length;
    const completed = data.filter(i => (i.status||'').toLowerCase() === 'completed').length;
    const rate = total > 0 ? Math.round((completed/total)*100) + '%' : '0%';

    const statCards = document.querySelectorAll('.profile-stat-card .stat-number');
    if(statCards.length >= 3) {
        statCards[0].textContent = total;
        statCards[1].textContent = completed;
        statCards[2].textContent = rate;
    }
    const mobStats = document.querySelectorAll('.mobile-stat-number');
    if(mobStats.length >= 3) {
        mobStats[0].textContent = total;
        mobStats[1].textContent = completed;
        mobStats[2].textContent = rate;
    }
}

// --- DETAILS & ACTIONS ---
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
    const btnAck = document.getElementById('mobileActionBtn');
    const btnReq = document.getElementById('mobileRequestMaterialBtn');
    const btnComp = document.getElementById('mobileMarkCompletedBtn');

    btnAck.style.display = 'none';
    btnReq.style.display = 'none';
    btnComp.style.display = 'none';

    if(['pending', 'assigned'].includes(status)) {
        btnAck.style.display = 'block';
    } else if(['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status)) {
        btnReq.style.display = 'block';
        btnComp.style.display = 'block';
    }

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

// --- ACTIONS ---
function acknowledgeAssignment() {
    document.getElementById('acknowledgeModal').classList.add('show');
}
function closeAcknowledgeModal() {
    document.getElementById('acknowledgeModal').classList.remove('show');
}
async function confirmAcknowledge() {
    const remarks = document.getElementById('acknowledgeRemarks').value;
    try {
        const response = await fetch('http://localhost:3000/api/engineer/acknowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_id: currentAssignmentId, remarks })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to acknowledge');
        }
        closeAcknowledgeModal();
        closeMobileAssignmentDetails();
        fetchAssignments();
        alert('Assignment Acknowledged');
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
}

function requestMaterial() {
    document.getElementById('materialRequestModal').classList.add('show');
    const list = document.getElementById('mrList');
    list.innerHTML = '';
    addMaterialRow(); 
}
function closeMaterialRequestModal() {
    document.getElementById('materialRequestModal').classList.remove('show');
}
function addMaterialRow() {
    const div = document.createElement('div');
    div.className = 'mr-row';
    div.innerHTML = `
        <input class="modal-input mr-type" placeholder="Item Name">
        <div class="qty-container">
            <input class="modal-input mr-qty" placeholder="Qty" type="number">
            <button class="remove-material-btn" onclick="this.closest('.mr-row').remove()">x</button>
        </div>`;
    document.getElementById('mrList').appendChild(div);
}
async function confirmMaterialRequest() {
    const items = [];
    document.querySelectorAll('.mr-row').forEach(r => {
        const type = r.querySelector('.mr-type').value;
        const qty = r.querySelector('.mr-qty').value;
        if(type) items.push({type, qty});
    });

    if(items.length===0) return alert('Please add at least one item.');
    if(!currentAssignmentId) return alert('No assignment selected');

    const item = getAssignment(currentAssignmentId);

    try {
        const response = await fetch('http://localhost:3000/api/engineer/request-material', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                appointment_id: currentAssignmentId,
                ticket_code: item.ticket_code,
                site: item.site,
                materials: items,
                remarks: document.getElementById('mrRemarks').value
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to request');
        }
        closeMaterialRequestModal();
        alert('Request Submitted');
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
}

function markAsCompleted() {
    if (!currentAssignmentId) {
        alert("Please select an assignment first.");
        return;
    }
    document.getElementById('markCompletedModal').classList.add('show');
}

function closeMarkCompletedModal() {
    document.getElementById('markCompletedModal').classList.remove('show');
}

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
        fetchAssignments();
        alert('Marked as Completed');
    } catch (e) { 
        console.error(e); 
        alert('Error: ' + e.message); 
    }
}

function logout() {
    supabase.auth.signOut();
    window.location.href = '../login/login.html';
}
function goBack() { location.reload(); }