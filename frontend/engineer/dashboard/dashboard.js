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
    const navLinks = document.querySelectorAll(".main-navigation a.nav-item"); 
    const contentSections = document.querySelectorAll(".main-section"); 
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute("data-page"); 
            
            navLinks.forEach(l => l.classList.remove("nav-item-active"));
            link.classList.add("nav-item-active");
            
            contentSections.forEach(s => {
                s.classList.remove("main-section-active");
                if (s.getAttribute("data-content") === targetPage) { 
                    s.classList.add("main-section-active");
                }
            });
            // Reset assignment detail view when switching away from it
            const detailViewContainer = document.getElementById('desktopDetailView');
            if (detailViewContainer) {
                detailViewContainer.innerHTML = '<div style="text-align:center;color:#666;padding-top:40px;">Select an assignment to view details</div>';
                document.getElementById('desktopPendingActions').style.display = 'none';
                document.getElementById('desktopAssignmentActions').style.display = 'none';
            }
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
            // Clear desktop detail on tab switch
            const detailView = document.getElementById('desktopDetailView');
            if (detailView) {
                detailView.innerHTML = '<div style="text-align:center;color:#666;padding-top:40px;">Select an assignment to view details</div>';
                document.getElementById('desktopPendingActions').style.display = 'none';
                document.getElementById('desktopAssignmentActions').style.display = 'none';
            }
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
        
        // Update Mobile Hero Greeting based on time
        const hour = new Date().getHours();
        let greeting = "Good Evening";
        if (hour < 12) greeting = "Good Morning";
        else if (hour < 18) greeting = "Good Afternoon";
        document.querySelectorAll('.hero-greeting').forEach(el => el.textContent = greeting);
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
        console.warn("Error loading dashboard data. Is the backend server running?");
    }
}

// --- ASSIGNMENTS RENDERING ---
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

        // --- MOBILE CARD ---
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
        
        // --- DESKTOP CARD ---
        const desktopCard = `
            <div class="assignment-item" onclick="selectAssignment(${item.id})">
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

// --- HISTORY RENDERING (MATCHING PROTOTYPE) ---
function renderHistory(data) {
    const completedItems = data.filter(a => (a.status || '').toLowerCase() === 'completed');
    
    const grouped = completedItems.reduce((acc, item) => {
        const date = new Date(item.completed_at || item.date).toLocaleDateString();
        const now = new Date().toLocaleDateString();
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

        let groupKey = 'Others';
        if (date === now) groupKey = 'Today';
        else if (date === yesterday) groupKey = 'Yesterday';

        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {});

    let mobileHtml = '';
    let desktopHtml = '';
    const groupOrder = ['Today', 'Yesterday', 'Others'];
    
    const deskHistContentArea = document.querySelector('.main-section[data-content="history"] .section-content-area');
    const mobHist = document.querySelector('.mobile-history-list');

    if (completedItems.length === 0) {
        const message = '<p style="text-align:center;padding:20px;">No completed assignments found.</p>';
        if (deskHistContentArea) deskHistContentArea.innerHTML = message;
        if(mobHist) mobHist.innerHTML = message;
        return;
    }

    groupOrder.forEach(groupKey => {
        if (grouped[groupKey] && grouped[groupKey].length > 0) {
            
            // --- Mobile rendering (MATCHES prototype structure) ---
            mobileHtml += `<div class="mobile-history-group"><div class="mobile-history-group-title">${groupKey}</div>`;
            
            // --- Desktop rendering setup for current group (MATCHES prototype structure) ---
            let groupHtml = `<div class="history-group"><div class="history-group-title">${groupKey}</div><div class="history-list">`;
            
            grouped[groupKey].forEach(item => {
                const date = new Date(item.completed_at || item.date).toLocaleDateString();
                const ticket = item.ticket_code || 'N/A';
                
                // Icon Logic (Matching prototype emojis by intent)
                const jobType = item.type_of_appointment || '';
                let mobileIcon = '🌐'; 
                if (jobType.includes('Inspection') || jobType.includes('Check')) mobileIcon = '🔍';
                else if (jobType.includes('Installation') || jobType.includes('Upgrade')) mobileIcon = '🔧';
                else if (jobType.includes('Repair')) mobileIcon = '🏗️';

                mobileHtml += `
                    <div class="mobile-history-card" onclick="alert('Completion details for ${item.type_of_appointment}')">
                        <div class="mobile-history-icon">${mobileIcon}</div>
                        <div class="mobile-history-info">
                            <h3>${item.type_of_appointment} - ${item.site}</h3>
                            <p class="history-sub">Tap to view completion details</p>
                            <p class="history-meta">Completed · ${date} · Ticket #${ticket}</p>
                        </div>
                    </div>`;
                
                groupHtml += `
                    <div class="history-list-item">
                        <div class="history-item-icon">📋</div>
                        <div class="history-item-body">
                            <h3 class="history-title">${item.type_of_appointment} - ${item.site}</h3>
                            <p class="history-sub">Ticket #${ticket}</p>
                            <p class="history-meta">Completed on ${date}</p>
                        </div>
                        <span class="chip chip-completed">Completed</span>
                    </div>`;
            });
            
            mobileHtml += `</div>`;
            groupHtml += `</div></div>`;
            
            desktopHtml += groupHtml;
        }
    });

    if(mobHist) mobHist.innerHTML = mobileHtml;
    if (deskHistContentArea) deskHistContentArea.innerHTML = desktopHtml;
}

// --- NOTIFICATIONS RENDERING (MATCHING PROTOTYPE) ---
function renderNotifications(assignments, notifications) {
    let allNotifs = [];

    // 1. New/Pending Assignments 
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

    const groupedNotifs = allNotifs.reduce((acc, notif) => {
        const date = new Date(notif.time).toLocaleDateString();
        const now = new Date().toLocaleDateString();
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

        let groupKey = 'Others';
        if (date === now) groupKey = 'Today';
        else if (date === yesterday) groupKey = 'Yesterday';

        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(notif);
        return acc;
    }, {});
    
    let mobileHtml = '';
    let desktopHtml = '';
    const today = new Date().toLocaleDateString();
    const groupOrder = ['Today', 'Yesterday', 'Others'];

    const mobileContainer = document.querySelector('.mobile-content-section[data-mobile-content="notification"] .notification-list');
    const desktopContainer = document.querySelector('.main-section[data-content="notification"] .section-content-area');

    if (allNotifs.length === 0) {
        const message = '<p style="text-align:center;padding:20px;color:#666;">No notifications.</p>';
        if (mobileContainer) mobileContainer.innerHTML = message;
        if (desktopContainer) desktopContainer.innerHTML = message;
        return;
    }

    groupOrder.forEach(groupKey => {
        if (groupedNotifs[groupKey] && groupedNotifs[groupKey].length > 0) {
            
            // --- Mobile rendering (MATCHES prototype structure) ---
            mobileHtml += `<div class="notif-section"><div class="notif-section-title">${groupKey}</div>`;
            
            // --- Desktop rendering setup for current group (MATCHES prototype structure) ---
            desktopHtml += `<div class="notification-group"><div class="notif-desktop-title">${groupKey}</div><div class="notification-grid">`;

            groupedNotifs[groupKey].forEach(n => {
                const dateObj = new Date(n.time);
                const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Icons matching the prototype intent: 🔔 (general/assignment), 🚚 (vehicle), 📦 (material)
                let icon = '🔔'; 
                if (n.type === 'vehicle') icon = '🚚';
                else if (n.type === 'material') icon = '📦';
                
                const statusText = (n.data.status || 'N/A').replace(/_/g, ' ');
                const isHold = statusText.includes('Hold');
                
                // Using general class names for styling hooks
                let cardClass = ''; 
                if (n.type === 'vehicle') cardClass = 'notification-card-vehicle';
                else if (n.type === 'material') cardClass = 'notification-card-material';
                
                if (isHold) cardClass = 'notification-card-onhold';
                
                let clickHandler;
                let modalStatus = statusText.replace(/ /g, '_'); 

                if (n.type === 'material') {
                    clickHandler = `openMaterialTicketModal('${n.ticket}', '${modalStatus}')`;
                } else if (n.type === 'vehicle') {
                    clickHandler = `openVehicleTicketModal('${n.ticket}', '${modalStatus}')`;
                } else {
                    clickHandler = `openAssignmentDetails(${n.data.id})`;
                }
                
                // Mobile Card
                mobileHtml += `
                    <button class="notif-card" type="button" onclick="${clickHandler}">
                        <span class="notif-icon">${icon}</span>
                        <div class="notif-body">
                            <div class="notif-card-title">${n.title}</div>
                            <div class="notif-sub">${n.msg}</div>
                            <div class="notif-time">${groupKey === 'Today' ? time : dateObj.toLocaleDateString()}</div>
                        </div>
                    </button>`;
                
                // Desktop Card
                desktopHtml += `
                    <div class="notification-card ${cardClass}" onclick="${clickHandler}">
                        <div class="notification-card-header">
                            <div class="notification-icon">
                                <span class="notification-icon-symbol">${icon}</span>
                            </div>
                            <div class="notification-info">
                                <h3 class="notification-title">${n.title}</h3>
                                <p class="notification-message">${n.msg}</p>
                                <p class="notification-time">${groupKey === 'Today' ? time : dateObj.toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>`;
            });
            
            mobileHtml += `</div>`;
            desktopHtml += `</div></div>`;
        }
    });

    if (mobileContainer) mobileContainer.innerHTML = mobileHtml;
    if (desktopContainer) desktopContainer.innerHTML = desktopHtml;
}


function updateStats(data) {
    const total = data.length;
    const completed = data.filter(i => (i.status||'').toLowerCase() === 'completed').length;
    const pending = data.filter(i => ['pending','assigned'].includes((i.status||'').toLowerCase())).length;
    const ongoing = data.filter(i => ['in progress','ongoing','accepted'].includes((i.status||'').toLowerCase())).length;
    const rate = total > 0 ? Math.round((completed/total)*100) + '%' : '0%';

    const pendingCountEl = document.querySelector('.filter-btn[data-filter="pending"] .filter-count');
    if (pendingCountEl) pendingCountEl.textContent = pending;
    
    const ongoingCountEl = document.querySelector('.filter-btn[data-filter="ongoing"] .filter-count');
    if (ongoingCountEl) ongoingCountEl.textContent = ongoing;
    
    const completedCountEl = document.querySelector('.filter-btn[data-filter="completed"] .filter-count');
    if (completedCountEl) completedCountEl.textContent = completed;

    // Update Profile Stats based on prototype HTML structure
    document.querySelectorAll('.mobile-profile-stat-number.stat-total, .stat-number.stat-total').forEach(el => el.textContent = total);
    document.querySelectorAll('.mobile-profile-stat-number.stat-completed, .stat-number.stat-completed').forEach(el => el.textContent = completed);
    document.querySelectorAll('.mobile-profile-stat-number.stat-rate, .stat-number.stat-rate').forEach(el => el.textContent = rate);
}

// --- MODAL HELPERS ---
function closeVehicleTicketModal() { document.getElementById('vehicleTicketModal').classList.remove('show'); }
function closeMaterialTicketModal() { document.getElementById('materialTicketModal').classList.remove('show'); }
window.closeRequestVehicleModal = function() { document.getElementById('requestVehicleModal').classList.remove('show'); }

window.openMaterialTicketModal = function(ticketId, status) {
    const ticket = notificationsData.materials.find(m => m.ticket_id === ticketId);
    if (!ticket) return alert(`Material ticket ${ticketId} not found.`);
    
    document.querySelector('#materialTicketModal .modal-title').textContent = `Material Request: ${status.replace(/_/g, ' ')}`;
    
    document.getElementById('mtTicket').value = ticket.ticket_id;
    document.getElementById('mtSite').value = ticket.site;
    document.getElementById('mtDatetime').value = new Date(ticket.request_date).toLocaleString();
    
    const remarksContent = ticket.remarks ? ticket.remarks.replace('Requested: ', '').trim() : '';
    let itemDisplay = ticket.remarks || 'No materials requested.';
    try {
        const materialList = JSON.parse(remarksContent);
        if (Array.isArray(materialList)) {
            itemDisplay = materialList.map(m => `${m.type} (Qty: ${m.qty})`).join(', ');
        }
    } catch (e) {
        itemDisplay = remarksContent;
    }
    
    document.getElementById('mtItems').value = itemDisplay;
    document.getElementById('mtRemarks').value = ticket.remarks || 'None';
    document.getElementById('mtStatus').value = ticket.status || 'N/A';
    
    document.getElementById('materialTicketModal').classList.add('show');
};

window.openVehicleTicketModal = function(ticketId, status) {
    const ticket = notificationsData.vehicles.find(v => v.ticket_id === ticketId);
    if (!ticket) return alert(`Vehicle ticket ${ticketId} not found.`);
    
    document.querySelector('#vehicleTicketModal .modal-title').textContent = `Vehicle Ticket: ${status.replace(/_/g, ' ')}`;

    document.getElementById('vtTicket').value = ticket.ticket_id;
    document.getElementById('vtLocation').value = ticket.location;
    document.getElementById('vtPickup').value = ticket.request_date ? new Date(ticket.request_date).toLocaleString() : 'N/A';
    
    document.getElementById('vtStatus').value = ticket.status;
    document.getElementById('vtPriority').value = ticket.priority || 'N/A';
    document.getElementById('vtRemarks').value = ticket.remarks || 'None';
    
    document.getElementById('vtDriver').value = ticket.driver_name || 'Not Assigned'; 
    document.getElementById('vtContact').value = ticket.driver_contact || 'N/A';
    document.getElementById('vtVehicle').value = ticket.vehicle_type || 'Not Assigned'; 

    document.getElementById('vehicleTicketModal').classList.add('show');
};

// --- ASSIGNMENT DETAILS / ACTIONS ---
function getAssignment(id) { return assignmentsData.find(a => a.id == id); }

// --- DESKTOP DETAILS ---
window.selectAssignment = function(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if (!item) return;

    // Highlight selected item
    document.querySelectorAll('.assignment-item').forEach(el => el.classList.remove('selected'));
    const selectedItem = document.querySelector(`.assignment-feed .feed-section-active`).querySelector(`[onclick="selectAssignment(${id})"]`);
    if(selectedItem) selectedItem.classList.add('selected');
    
    const status = (item.status||'').toLowerCase();
    
    // Get the container where the details should be injected
    const detailViewContainer = document.getElementById('desktopDetailView');
    
    // Template for injection
    const detailHTML = `
        <div class="assignment-detail-header">
            <h1 class="assignment-detail-title">${item.type_of_appointment}</h1>
            <span class="assignment-detail-priority priority-${(item.priority_level || 'medium').toLowerCase()}">${item.priority_level || 'MEDIUM'}</span>
        </div>
        <div class="assignment-detail-meta">
            <p class="assignment-detail-site">Site: ${item.site}</p>
            <p class="assignment-detail-due">Due: ${new Date(item.date).toLocaleDateString()}</p>
        </div>
        <div class="assignment-sections">
            <div class="section-content">
                <div class="details-grid">
                    <div class="detail-card">
                        <div class="detail-label">TICKET NUMBER</div>
                        <div class="detail-value">${item.ticket_code || 'N/A'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">DATE & TIME</div>
                        <div class="detail-value">${new Date(item.date).toLocaleString()}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">PRIORITY</div>
                        <div class="detail-value">${item.priority_level || 'N/A'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">TYPE OF APPOINTMENT</div>
                        <div class="detail-value">${item.type_of_appointment || 'N/A'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">SITE LOCATION</div>
                        <div class="detail-value">${item.site || 'N/A'}</div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-label">STATUS</div>
                        <div class="detail-value">${item.status || 'N/A'}</div>
                    </div>
                    <div class="detail-card detail-card-full">
                        <div class="detail-label">TASK DESCRIPTION / ISSUE</div>
                        <div class="detail-value">${item.task_description || 'N/A'}</div>
                    </div>
                    <div class="detail-card detail-card-full">
                        <div class="detail-label">PM REMARKS</div>
                        <div class="detail-value">${item.pm_remarks || 'None'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (detailViewContainer) {
        detailViewContainer.innerHTML = detailHTML;
        
        const pendingActions = document.getElementById('desktopPendingActions');
        const ongoingActions = document.getElementById('desktopAssignmentActions');
        
        if(pendingActions) pendingActions.style.display = 'none';
        if(ongoingActions) ongoingActions.style.display = 'none';

        if(['pending', 'assigned'].includes(status)) {
            if(pendingActions) pendingActions.style.display = 'flex'; 
        } else if(['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status)) {
            if(ongoingActions) ongoingActions.style.display = 'flex'; 
        }
    }
}

// --- MOBILE DETAILS ---
window.openAssignmentDetails = function(id) {
    currentAssignmentId = id;
    const item = getAssignment(id);
    if (!item) return;
    
    document.getElementById('mTitle').textContent = item.type_of_appointment;
    document.getElementById('mSite').textContent = `Site: ${item.site}`;
    document.getElementById('mDue').textContent = `Due: ${new Date(item.date).toLocaleDateString()}`;
    
    document.getElementById('mTicket').textContent = item.ticket_code || 'N/A';
    document.getElementById('mDateTime').textContent = new Date(item.date).toLocaleString();
    document.getElementById('mPriority').textContent = item.priority_level || 'N/A';
    document.getElementById('mType').textContent = item.type_of_appointment || 'N/A';
    document.getElementById('mLocation').textContent = item.site || 'N/A';
    
    document.getElementById('mDescription').textContent = item.task_description || 'N/A';
    document.getElementById('mRemarks').textContent = item.pm_remarks || 'None';

    const status = (item.status||'').toLowerCase();
    const isOngoing = ['in progress', 'ongoing', 'in_progress', 'accepted'].includes(status);
    
    // Control Mobile Buttons
    document.getElementById('mobileActionBtn').style.display = ['pending','assigned'].includes(status) ? 'block' : 'none';
    document.getElementById('mobileRequestMaterialBtn').style.display = isOngoing ? 'block' : 'none';
    document.getElementById('mobileRequestVehicleBtn').style.display = isOngoing ? 'block' : 'none';
    document.getElementById('mobileMarkCompletedBtn').style.display = isOngoing ? 'block' : 'none';
    
    if(isOngoing) {
        document.getElementById('mobileActionBtn').style.display = 'none';
    } else if (['pending', 'assigned'].includes(status)) {
        document.getElementById('mobileActionBtn').style.display = 'block';
    }

    document.getElementById('mobileAssignmentDetails').classList.add('show');
}

window.closeMobileAssignmentDetails = function() {
    document.getElementById('mobileAssignmentDetails').classList.remove('show');
    
}


// --- ACKNOWLEDGE LOGIC ---
window.acknowledgeAssignment = function() { document.getElementById('acknowledgeModal').classList.add('show'); }
window.closeAcknowledgeModal = function() { document.getElementById('acknowledgeModal').classList.remove('show'); }
window.confirmAcknowledge = async function() {
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
        showToast('Assignment Acknowledged');
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
}

// --- COMPLETION LOGIC ---
window.markAsCompleted = function() { 
    if (!currentAssignmentId) { alert("Please select an assignment first."); return; }
    document.getElementById('markCompletedModal').classList.add('show'); 
}
window.closeMarkCompletedModal = function() { document.getElementById('markCompletedModal').classList.remove('show'); }

window.confirmMarkCompleted = async function() {
    if (!currentAssignmentId) { alert("Error: No assignment ID selected."); return; }
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
        showToast('Assignment Completed');
    } catch (e) { 
        console.error(e); 
        alert('Error: ' + e.message); 
    }
}

// --- MATERIAL REQUEST LOGIC ---
window.requestMaterial = function() { 
    // This logic opens the modal defined in your provided HTML
    document.getElementById('materialRequestModal').classList.add('show'); 
    document.getElementById('mrList').innerHTML = ''; // Assuming mrList is inside the modal and needs clearing
    // Add a new row to the modal list
    addMaterialRow(); 
}

// Helper to add a row inside the modal (using the HTML's existing structure)
function addMaterialRow() {
    const container = document.getElementById('mrList');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'mr-row';
    div.innerHTML = `
        <input class="modal-input mr-type" placeholder="Item">
        <input class="modal-input mr-qty" type="number" placeholder="Qty">
        <button class="remove-material-btn" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

window.closeMaterialRequestModal = function() { document.getElementById('materialRequestModal').classList.remove('show'); }

window.confirmMaterialRequest = async function() {
    // Collect items from the modal's mrList
    const activePanel = document.getElementById('mrList');
    
    const item = getAssignment(currentAssignmentId);
    const materials = Array.from(activePanel.querySelectorAll('.mr-row')).map(r => ({
        type: r.querySelector('.modal-input.mr-type').value, // Use specific class
        qty: r.querySelector('.modal-input.mr-qty').value
    })).filter(m => m.type);
    
    if(!materials.length) return alert('Please add at least one item.');
    if(!currentAssignmentId) return alert('No assignment selected');
    
    try {
        const response = await fetch('http://localhost:3000/api/engineer/request-material', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ 
                ticket_code: item.ticket_code, 
                site: item.site, 
                materials, 
                remarks: document.getElementById('mrRemarks').value 
            })
        });
        if(!response.ok) throw new Error('Failed to send request');
        closeMaterialRequestModal();
        showToast('Material Request Sent');
    } catch(e) { alert('Error: '+e.message); }
}


// --- VEHICLE REQUEST LOGIC ---
window.requestVehicle = function() {
    const item = getAssignment(currentAssignmentId);
    if (!item) return alert("Please select an assignment first.");

    // Assuming the provided HTML has the necessary IDs like #vehReqSite for location in modal
    const locationEl = document.querySelector('#requestVehicleModal .modal-location');
    if (locationEl) locationEl.textContent = item.site || 'N/A';
    
    document.getElementById('vehicleRemarks').value = '';
    document.getElementById('requestVehicleModal').classList.add('show');
}

window.confirmRequestVehicle = async function() {
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
        showToast('Vehicle Request Submitted!');
    } catch (e) {
        alert('Error submitting vehicle request: ' + e.message);
    }
}


// UTILS
window.showToast = function(message) {
    const t = document.getElementById('successToast');
    if (!t) return;
    t.querySelector('.toast-text').textContent = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

window.logout = function() { supabase.auth.signOut(); window.location.href = '../login/login.html'; }
window.goBack = function() { window.location.reload(); }