const state = {
    currentUser: null,
    pmProfile: null,
    allAppointments: [],
    allAccounts: [],
    engineers: []
};

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = '../pm_login/pm_login.html';
}

async function checkPMSession() {
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not initialized');
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) {
        console.log('No session, redirecting to PM login.');
        window.location.href = '../pm_login/pm_login.html';
        return;
    }
    state.currentUser = data.session.user;

    const { data: profile, error: profileError } = await supabaseClient
        .from('project_manager_records')
        .select('*')
        .eq('user_id', state.currentUser.id)
        .single();

    if (profileError || !profile) {
        console.error('Not a PM or profile not found.', profileError);
        await logout();
        return;
    }

    state.pmProfile = profile;
    
    updatePMHeader();
    loadDashboardData();
}

function updatePMHeader() {
    const pmName = document.getElementById('pmName');
    const welcomeText = document.getElementById('welcomeText');
    const name = state.pmProfile.firstName || state.pmProfile.email;
    if (pmName) pmName.textContent = name;
    if (welcomeText) welcomeText.textContent = `Welcome, ${name}!`;
}

async function loadDashboardData() {
    try {
        const response = await fetch('http://localhost:3000/api/pm/dashboard-data');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch dashboard data.');
        }
        const data = await response.json();

        state.allAppointments = data.allAppointments || [];
        state.allAccounts = data.allAccounts || [];
        state.engineers = data.engineers || [];

        renderAllTables();
        populateEngineerDropdown();

    } catch (error) {
        console.error(error.message);
        // Only alert once to avoid spamming
        console.warn('Could not load dashboard data. Is the backend server running?');
    }
}


function renderAllTables() {
    renderDashboardStats();
    renderRequestAppointments();
    renderOnHoldAppointments();
    renderApprovedAppointments();
    renderAccounts(); 
    renderEngineers();
    renderFacilityOwners(); 
    renderNotifications(); 
}

function getStatusClass(status) {
    const k = String(status || 'pending').toLowerCase();
    if (k === 'approved') return 'status-approved'; // Green
    if (k === 'in progress') return 'status-assigned'; // Blue
    if (k === 'ongoing') return 'status-inprogress'; // Purple
    if (k === 'on hold') return 'status-pending'; // Orange
    if (k === 'completed') return 'status-done'; // Green
    if (k === 'rejected') return 'status-rejected';
    return 'status-pending'; 
}

function getTimeAgo(dateString) {
    if (!dateString) return 'just now';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'a while ago';
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return `${seconds} seconds ago`;
        let interval = seconds / 60;
        if (interval < 60) return Math.floor(interval) + " minutes ago";
        interval = seconds / 3600;
        if (interval < 24) return Math.floor(interval) + " hours ago";
        interval = seconds / 86400;
        if (interval < 30) return Math.floor(interval) + " days ago";
        interval = seconds / 2592000;
        if (interval < 12) return Math.floor(interval) + " months ago";
        interval = seconds / 31536000;
        return Math.floor(interval) + " years ago";
    } catch (e) {
        return 'a while ago';
    }
}

function renderDashboardStats() {
    const pendingAppointments = state.allAppointments.filter(a => a.status === 'Pending').length;
    
    // Active Tasks: Assigned, In Progress, Ongoing, Approved, On Hold
    const activeAppointments = state.allAppointments.filter(a => 
        ['Assigned', 'In Progress', 'Ongoing', 'Approved', 'On Hold', 'Inspected'].includes(a.status)
    ).length;
    
    const rejectedAppointments = state.allAppointments.filter(a => a.status === 'Rejected').length;
    const pendingAccounts = state.allAccounts.filter(a => a.status === 'pending').length;

    document.getElementById('totalTickets').textContent = pendingAppointments;
    document.getElementById('pendingApprovals').textContent = activeAppointments;
    document.getElementById('rejectedTasks').textContent = rejectedAppointments;
    document.getElementById('pendingFOAccounts').textContent = pendingAccounts;
}

function renderRequestAppointments() {
    const tbody = document.getElementById('requestAppointmentsBody');
    if (!tbody) return;
    
    const searchBar = document.getElementById('searchRequestAppointments');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';
    
    const pending = state.allAppointments.filter(appt => {
        const isPending = appt.status === 'Pending';
        const searchMatch = !searchQuery ||
            (appt.ticket_code && appt.ticket_code.toLowerCase().includes(searchQuery)) ||
            (appt.site && appt.site.toLowerCase().includes(searchQuery)) ||
            (appt.type_of_appointment && appt.type_of_appointment.toLowerCase().includes(searchQuery)) ||
            (appt.task_description && appt.task_description.toLowerCase().includes(searchQuery));
        return isPending && searchMatch;
    });

    tbody.innerHTML = ''; 
    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No pending appointments found.</td></tr>';
        return;
    }

    pending.forEach((appt, index) => {
        const row = document.createElement('tr');
        const date = new Date(appt.date).toLocaleDateString();
        
        const priority = appt.priority_level || 'Low';
        const priorityClass = priority.toLowerCase();

        row.innerHTML = `
            <td>${appt.id}</td>
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td><span class="status-pill ${getStatusClass(appt.status)}">${appt.status}</span></td>
            <td><span class="priority-${priorityClass}">${priority}</span></td>
            <td>—</td>
            <td><div class="row-actions"><button class="action-btn" onclick="openTicketModal(${appt.id})">View/Assign</button></div></td>
        `;
        tbody.appendChild(row);
    });
}

function renderOnHoldAppointments() {
    const tbody = document.getElementById('onHoldAppointmentsBody');
    if (!tbody) return;
    
    const statusFilterEl = document.getElementById('statusFilterOnHold');
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';
    
    const searchBar = document.getElementById('searchOnHoldAppointments');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';
    
    // Filter for ALL active/in-progress states
    const onHold = state.allAppointments.filter(appt => {
        const status = appt.status;
        const isActive = ['Assigned', 'In Progress', 'Ongoing', 'Approved', 'On Hold', 'Inspected', 'Acknowledged'].includes(status);
        
        if (!isActive) return false;
        
        // Helper for mapping specific statuses to filter dropdown values
        let filterCategory = 'all';
        if (status === 'Assigned') filterCategory = 'assigned';
        if (['In Progress', 'Ongoing', 'Acknowledged'].includes(status)) filterCategory = 'in_progress';
        if (['Approved'].includes(status)) filterCategory = 'approved';
        if (status === 'On Hold') filterCategory = 'on_hold';
        if (status === 'Inspected') filterCategory = 'inspected';
        
        let statusMatch = statusFilter === 'all' || filterCategory === statusFilter;

        const searchMatch = !searchQuery ||
            (appt.ticket_code && appt.ticket_code.toLowerCase().includes(searchQuery)) ||
            (appt.site && appt.site.toLowerCase().includes(searchQuery)) ||
            (appt.type_of_appointment && appt.type_of_appointment.toLowerCase().includes(searchQuery));
            
        return statusMatch && searchMatch;
    });

    tbody.innerHTML = ''; 
    if (onHold.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No matching appointments found.</td></tr>';
        return;
    }

    onHold.forEach((appt, index) => {
        const row = document.createElement('tr');
        const date = new Date(appt.date).toLocaleDateString();
        let engineerName = '...';
        if (appt.engineer_records) {
            engineerName = `${appt.engineer_records.firstName || ''} ${appt.engineer_records.lastName || ''}`.trim();
        }

        // --- STATUS BADGE LOGIC ---
        let taskStatusClass = '';
        let taskStatusText = '';
        let taskIcon = '';
        let bgColor = '';
        let textColor = '';
        
        const status = appt.status;

        if (status === 'Assigned') {
            taskStatusClass = 'status-pending';
            taskStatusText = 'Assigned';
            taskIcon = '👤';
            bgColor = '#e0f2fe';
            textColor = '#0284c7';
        } else if (status === 'In Progress') {
            // PM Assigned, waiting for Ack
            taskStatusClass = 'status-pending';
            taskStatusText = 'In Progress';
            taskIcon = '⏳';
            bgColor = '#fef3c7';
            textColor = '#92400e';
        } else if (status === 'Ongoing') {
            // Engineer Acknowledged
            taskStatusClass = 'status-in-progress';
            taskStatusText = 'Ongoing';
            taskIcon = '🏃';
            bgColor = '#dbeafe';
            textColor = '#1e40af';
        } else if (status === 'Approved') {
            // Material Approved / Ready
            taskStatusClass = 'status-approved';
            taskStatusText = 'Approved';
            taskIcon = '📦';
            bgColor = '#dcfce7';
            textColor = '#166534';
        } else if (status === 'On Hold') {
            taskStatusClass = 'status-on-hold';
            taskStatusText = 'On Hold';
            taskIcon = '⏸️';
            bgColor = '#fee2e2';
            textColor = '#991b1b';
        } else {
            taskStatusClass = 'status-pending';
            taskStatusText = status;
            taskIcon = '•';
            bgColor = '#f3f4f6';
            textColor = '#374151';
        }
        
        const statusHTML = `<span class="${taskStatusClass}" style="padding: 4px 8px; border-radius: 6px; font-size: 12px; display: inline-block; background: ${bgColor}; color: ${textColor}; font-weight: 600;">${taskIcon} ${taskStatusText}</span>`;

        const priority = appt.priority_level || 'Low';
        const priorityClass = priority.toLowerCase();
        const priorityHTML = `<span class="priority-${priorityClass}">${priority}</span>`;

        row.innerHTML = `
            <td>${appt.id}</td>
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td>${statusHTML}</td>
            <td>${priorityHTML}</td>
            <td>${engineerName}</td>
            <td><div class="row-actions"><button class="action-btn" onclick="openTicketModal(${appt.id})">View</button></div></td>
        `;
        tbody.appendChild(row);
    });
}

function renderApprovedAppointments() {
    const tbody = document.getElementById('approvedAppointmentsBody');
    if (!tbody) return;
    
    const searchBar = document.getElementById('searchApprovedAppointments');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';

    const approved = state.allAppointments.filter(appt => {
        const isApproved = ['Completed', 'Done'].includes(appt.status);
        const searchMatch = !searchQuery ||
            (appt.ticket_code && appt.ticket_code.toLowerCase().includes(searchQuery)) ||
            (appt.site && appt.site.toLowerCase().includes(searchQuery)) ||
            (appt.type_of_appointment && appt.type_of_appointment.toLowerCase().includes(searchQuery));
        return isApproved && searchMatch;
    });

    tbody.innerHTML = ''; 
    if (approved.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No completed appointments found.</td></tr>';
        return;
    }

    approved.forEach((appt, index) => {
        const row = document.createElement('tr');
        const date = new Date(appt.date).toLocaleDateString();
        let engineerName = '...';
        if (appt.engineer_records) {
            engineerName = `${appt.engineer_records.firstName || ''} ${appt.engineer_records.lastName || ''}`.trim();
        }

        const statusHTML = `<span class="status-badge status-completed" style="background: #d1fae5; color: #065f46; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center;">✅ Completed</span>`;
        
        const priority = appt.priority_level || 'Low';
        const priorityClass = priority.toLowerCase();
        const priorityColors = {
            'low': '#10b981',
            'medium': '#f59e0b',
            'high': '#ef4444'
        };
        const priorityColor = priorityColors[priorityClass] || '#10b981';
        const priorityHTML = `<span class="priority-badge" style="color: ${priorityColor}; font-weight: 700;">${priority}</span>`;
        // END: Logic from prototype
        
        row.innerHTML = `
            <td>${appt.id}</td>
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td>${statusHTML}</td>
            <td>${priorityHTML}</td>
            <td>${engineerName}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderRejectedAppointments() {
    const tbody = document.getElementById('rejectedAppointmentsBody');
    if (!tbody) return;
    
    const searchBar = document.getElementById('searchRejectedAppointments');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';

    const rejected = state.allAppointments.filter(appt => {
        const isRejected = appt.status === 'Rejected';
        const searchMatch = !searchQuery ||
            (appt.ticket_code && appt.ticket_code.toLowerCase().includes(searchQuery)) ||
            (appt.site && appt.site.toLowerCase().includes(searchQuery));
        return isRejected && searchMatch;
    });

    tbody.innerHTML = ''; 
    if (rejected.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No rejected appointments found.</td></tr>';
        return;
    }

    rejected.forEach((appt, index) => {
        const row = document.createElement('tr');
        const date = new Date(appt.date).toLocaleDateString();
        row.innerHTML = `
            <td>${appt.id}</td>
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td><span class="status-pill ${getStatusClass(appt.status)}">${appt.status}</span></td>
            <td>${appt.priority_level || 'N/A'}</td>
            <td><div class="row-actions"><button class="action-btn delete" onclick="deleteAppointment('${appt.id}')">Delete</button></div></td>
        `;
        tbody.appendChild(row);
    });
}


function renderAccounts() {
    const tbody = document.getElementById('accountsBody');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (state.allAccounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No facility owner accounts found.</td></tr>';
        return;
    }
    
    const statusFilterEl = document.getElementById('accountStatusFilter');
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';

    const searchBar = document.getElementById('searchAccounts');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';
    
    const filteredAccounts = state.allAccounts.filter(acc => {
        if (acc.status === 'archived') return false;
        const statusMatch = statusFilter === 'all' || (acc.status || 'pending') === statusFilter;
        const searchMatch = !searchQuery || 
            (acc.firstName && acc.firstName.toLowerCase().includes(searchQuery)) ||
            (acc.surname && acc.surname.toLowerCase().includes(searchQuery)) ||
            (acc.company_name && acc.company_name.toLowerCase().includes(searchQuery)) ||
            (acc.email && acc.email.toLowerCase().includes(searchQuery));
        return statusMatch && searchMatch;
    });

    if (filteredAccounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No matching accounts found.</td></tr>';
        return;
    }

    filteredAccounts.forEach((acc, index) => {
        const row = document.createElement('tr');
        const status = acc.status || 'pending';
        
        let statusBadge = '';
        if (status === 'pending') {
            statusBadge = '<span class="status-badge" style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap;">⏳ Pending</span>';
        } else if (status === 'approved') {
            statusBadge = '<span class="status-badge" style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap;">✅ Approved</span>';
        } else if (status === 'rejected') {
            statusBadge = '<span class="status-badge" style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; white-space: nowrap;">❌ Rejected</span>';
        }
        const displayPassword = acc.password ? '••••••••' : '—';

        row.innerHTML = `
            <td style="text-align: center;">${index + 1}</td>
            <td>${acc.firstName || ''} ${acc.surname || ''}</td>
            <td>${acc.company_name || 'N/A'}</td>
            <td>${acc.email || 'N/A'}</td>
            <td>${acc.phone_number || 'N/A'}</td>
            <td style="font-family: monospace; font-size: 12px; color: #374151;">${displayPassword}</td>
            <td style="text-align: center;">${statusBadge}</td>
            <td><button class="action-btn" onclick="openApproveModal('${acc.user_id}')">View</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderEngineers() {
    const tbody = document.getElementById('engineersBody');
    if (!tbody) return;

    const searchBar = document.getElementById('searchEngineers');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';

    const filteredEngineers = state.engineers.filter(eng => {
        const searchMatch = !searchQuery ||
            (eng.firstName && eng.firstName.toLowerCase().includes(searchQuery)) ||
            (eng.lastName && eng.lastName.toLowerCase().includes(searchQuery)) ||
            (eng.email && eng.email.toLowerCase().includes(searchQuery));
        return searchMatch;
    });

    tbody.innerHTML = ''; 
    if (filteredEngineers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No matching engineers found.</td></tr>';
        return;
    }

    filteredEngineers.forEach((eng, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${eng.firstName || ''}</td>
            <td>${eng.middleName || ''}</td>
            <td>${eng.lastName || ''}</td>
            <td>${eng.phone_number || 'N/A'}</td>
            <td>${eng.email || 'N/A'}</td>
            <td>${eng.location || 'N/A'}</td>
            <td>******</td>
            <td><button class="action-btn" onclick="editEngineer('${eng.user_id}')">Edit</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderFacilityOwners() {
    const tbody = document.getElementById('facilityOwnersBody');
    if (!tbody) return;

    const searchBar = document.getElementById('searchFacilityOwners');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';

    const approvedOwners = state.allAccounts.filter(acc => {
        const isApproved = acc.status === 'approved';
        const searchMatch = !searchQuery || 
            (acc.firstName && acc.firstName.toLowerCase().includes(searchQuery)) ||
            (acc.surname && acc.surname.toLowerCase().includes(searchQuery)) ||
            (acc.company_name && acc.company_name.toLowerCase().includes(searchQuery));
        return isApproved && searchMatch;
    });

    tbody.innerHTML = ''; 
    if (approvedOwners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No approved facility owners found.</td></tr>';
        return;
    }

    approvedOwners.forEach((acc, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${acc.firstName || ''}</td>
            <td>${acc.middleName || ''}</td>
            <td>${acc.surname || ''}</td>
            <td>${acc.company_name || 'N/A'}</td>
            <td>${acc.phone_number || 'N/A'}</td>
            <td>${acc.email || 'N/A'}</td>
            <td>${acc.address || 'N/A'}</td>
            <td>******</td>
            <td><button class="action-btn" onclick="editFacilityOwner('${acc.user_id}')">Edit</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderNotifications() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    let notificationsHTML = '';

    const pendingAccounts = state.allAccounts.filter(acc => acc.status === 'pending');
    pendingAccounts.forEach(acc => {
        const name = `${acc.firstName || ''} ${acc.surname || ''}`.trim();
        const company = acc.company_name || 'Unknown Company';
        const timeAgo = getTimeAgo(acc.created_at);

        notificationsHTML += `
            <div class="notification-card">
                <div class="notification-header">
                    <div class="notification-title">👥 New Account Request</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-content">
                    <strong>${name}</strong> from <strong>${company}</strong> has requested an account.
                </div>
                <div class="notification-actions">
                    <button class="notification-btn" onclick="switchView('account-management')">View Request</button>
                    <button class="notification-btn secondary" onclick="this.closest('.notification-card').remove()">Dismiss</button>
                </div>
            </div>
        `;
    });

    const pendingAppointments = state.allAppointments.filter(appt => appt.status === 'Pending');
    pendingAppointments.forEach(appt => {
        const timeAgo = getTimeAgo(appt.created_at);
        const priorityClass = (appt.priority_level || 'low').toLowerCase() === 'high' ? 'priority-critical' : (appt.priority_level || 'low').toLowerCase() === 'medium' ? 'priority-medium' : 'priority-low';
        
        notificationsHTML += `
            <div class="notification-card">
                <div class="notification-header">
                    <div class="notification-title">⚠️ Engineer Assignment Needed</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-content">
                    <strong>${appt.ticket_code || 'N/A'}</strong> - ${appt.task_description || 'No description'}<br>
                    Priority: <span class="${priorityClass}" style="font-weight: 700;">${appt.priority_level || 'Low'}</span> | Awaiting engineer assignment
                </div>
                <div class="notification-actions">
                    <button class="notification-btn" onclick="switchView('request-appointments')">Assign Engineer</button>
                    <button class="notification-btn secondary" onclick="this.closest('.notification-card').remove()">Dismiss</button>
                </div>
            </div>
        `;
    });

    const onHoldAppointments = state.allAppointments.filter(appt => appt.status === 'On Hold');
    onHoldAppointments.forEach(appt => {
        const timeAgo = getTimeAgo(appt.updated_at || appt.created_at); 
        notificationsHTML += `
            <div class="notification-card" style="border-left: 4px solid #f59e0b;">
                <div class="notification-header">
                    <div class="notification-title">⏸️ Task On Hold</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-content">
                    <strong>${appt.ticket_code || 'N/A'}</strong> at ${appt.site || 'N/A'} is currently on hold.<br>
                    Reason: <em>${appt.pm_remarks || 'No reason provided.'}</em>
                </div>
                <div class="notification-actions">
                    <button class="notification-btn" onclick="switchView('onhold-appointments')">View Details</button>
                    <button class="notification-btn secondary" onclick="this.closest('.notification-card').remove()">Dismiss</button>
                </div>
            </div>
        `;
    });

    // START: ADDED SECTION FOR COMPLETED TASKS
    const completedAppointments = state.allAppointments.filter(appt => appt.status === 'Completed' || appt.status === 'Done');
    completedAppointments.forEach(appt => {
        const timeAgo = getTimeAgo(appt.completed_at || appt.updated_at || appt.created_at);
        let engineerName = 'N/A';
        if (appt.engineer_records) {
            engineerName = `${appt.engineer_records.firstName || ''} ${appt.engineer_records.lastName || ''}`.trim();
        }

        notificationsHTML += `
            <div class="notification-card" style="border-left: 4px solid #10b981;">
                <div class="notification-header">
                    <div class="notification-title">✅ Task Completed</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-content">
                    <strong>${appt.ticket_code || 'N/A'}</strong> at ${appt.site || 'N/A'} has been completed by <strong>${engineerName}</strong>.
                </div>
                <div class="notification-actions">
                    <button class="notification-btn" onclick="switchView('approved-appointments')">View Details</button>
                    <button class="notification-btn secondary" onclick="this.closest('.notification-card').remove()">Dismiss</button>
                </div>
            </div>
        `;
    });
    // END: ADDED SECTION FOR COMPLETED TASKS

    if (notificationsHTML === '') {
        notificationsHTML = '<p style="text-align: center; color: #66748a;">No new notifications.</p>';
    }
    
    container.innerHTML = notificationsHTML;
}


function populateEngineerDropdown() {
    const select = document.getElementById('engineerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select an engineer...</option>'; 
    
    // Get list of engineers currently busy (In Progress or Ongoing or Approved)
    const busyEngineers = new Set();
    state.allAppointments.forEach(appt => {
        if (['In Progress', 'Ongoing', 'Approved'].includes(appt.status) && appt.engineer_user_id) {
            busyEngineers.add(appt.engineer_user_id);
        }
    });

    state.engineers.forEach(eng => {
        const option = document.createElement('option');
        option.value = eng.user_id; 
        
        // Check if engineer is busy
        let label = `${eng.firstName || ''} ${eng.lastName || ''}`;
        if (busyEngineers.has(eng.user_id)) {
            label += " - (Currently Assigned)";
        } else {
            label += ` (${eng.location || 'Available'})`;
        }
        
        option.textContent = label;
        select.appendChild(option);
    });
}


function openApproveModal(userId) {
    const acc = state.allAccounts.find(a => a.user_id === userId);
    if (!acc) return;

    const approveBtn = document.getElementById('accountApproveBtn');
    approveBtn.onclick = () => approveAccount(acc.user_id);
    
    if (acc.status === 'approved') {
        approveBtn.style.display = 'none';
    } else {
        approveBtn.style.display = 'inline-flex';
    }
    
    document.getElementById('accountDetailName').textContent = `${acc.firstName || ''} ${acc.surname || ''}`;
    document.getElementById('accountDetailCompany').textContent = acc.company_name || 'N/A';
    document.getElementById('accountDetailEmail').textContent = acc.email || 'N/A';
    document.getElementById('accountDetailPhone').textContent = acc.phone_number || 'N/A';
    document.getElementById('accountDetailLocation').textContent = acc.address || 'N/A';
    document.getElementById('accountDetailCreated').textContent = new Date(acc.created_at).toLocaleDateString();
    
    const statusEl = document.getElementById('accountDetailStatus');
    statusEl.textContent = acc.status;
    
    let statusBadge = '';
    const status = (acc.status || 'pending').toLowerCase();
    if (status === 'pending') {
        statusBadge = '<span class="status-badge" style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⏳ Pending</span>';
    } else if (status === 'approved') {
        statusBadge = '<span class="status-badge" style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ Approved</span>';
    } else if (status === 'rejected') {
        statusBadge = '<span class="status-badge" style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ Rejected</span>';
    }
    statusEl.innerHTML = statusBadge;
    statusEl.className = ''; 


    document.getElementById('accountDetailModal').style.display = 'flex';
}

function closeAccountDetailModal() {
    document.getElementById('accountDetailModal').style.display = 'none';
}

async function approveAccount(userId) {
    try {
        const response = await fetch('http://localhost:3000/api/pm/approve-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        alert('Account approved!');
        closeAccountDetailModal();
        loadDashboardData(); 

    } catch (error) {
        alert('Error approving account: ' + error.message);
    }
}

function openTicketModal(appointmentId) {
    const appt = state.allAppointments.find(a => a.id === appointmentId);
    if (!appt) return;

    const pmRemarks = document.getElementById('pmRemarksText');
    if (pmRemarks) pmRemarks.value = '';

    const foRemarks = document.getElementById('foRemarkText');
    if (foRemarks) foRemarks.value = '';

    const onHoldRemarks = document.getElementById('onHoldReasonText');
    if (onHoldRemarks) onHoldRemarks.value = '';
    
    const onHoldSection = document.getElementById('onHoldRemarksSection');
    if (onHoldSection) onHoldSection.style.display = 'none';

    document.getElementById('pmRemarksText').value = '';

    const status = (appt.status || 'pending').toLowerCase();
    
    const isPending = status === 'pending';
    document.getElementById('engineerAssignmentSection').style.display = 'block';
    
    document.getElementById('processBtn').style.display = isPending ? 'inline-flex' : 'none';
    
    document.getElementById('pmRemarksField').style.display = 'none';
    
    document.getElementById('markDoneBtn2').style.display = 'none';
    document.getElementById('onHoldBtn').style.display = 'none';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('notifyFOApproveBtn').style.display = 'none';
    document.getElementById('notifyFORejectBtn').style.display = 'none';
    document.getElementById('markDoneBtn').style.display = 'none';
    
    document.getElementById('currentAppointmentId').value = appt.id;
    document.getElementById('overviewTicket').textContent = appt.ticket_code || 'N/A';
    document.getElementById('overviewDate').textContent = new Date(appt.date).toLocaleDateString();
    document.getElementById('overviewPriority').textContent = appt.priority_level || 'N/A';
    document.getElementById('overviewSite').textContent = appt.site || 'N/A';
    document.getElementById('overviewDescription').textContent = appt.task_description || 'N/A';
    
    let ownerEmail = 'N/A';
    if(appt.facility_owner_records) {
        ownerEmail = appt.facility_owner_records.email;
    }
    document.getElementById('overviewEmail').textContent = ownerEmail;

    const engineerSelect = document.getElementById('engineerSelect');
    const currentAssignment = document.getElementById('currentAssignment');
    const assignedEngineer = document.getElementById('assignedEngineer');
    const currentPMRemarks = document.getElementById('currentPMRemarks');
    const pmRemarksDisplay = document.getElementById('pmRemarksDisplay');
    
    if (isPending) {
        currentAssignment.style.display = 'none';
        currentPMRemarks.style.display = 'none';
        engineerSelect.style.display = 'block';
        engineerSelect.value = ''; 
        populateEngineerDropdown();
    } else {
        engineerSelect.style.display = 'none';
        currentAssignment.style.display = 'block';
        let engineerName = '...';
        if (appt.engineer_records) {
            engineerName = `${appt.engineer_records.firstName || ''} ${appt.engineer_records.lastName || ''}`.trim();
        }
        assignedEngineer.textContent = engineerName || 'N/A';
        
        if (appt.pm_remarks) {
            currentPMRemarks.style.display = 'block';
            pmRemarksDisplay.textContent = appt.pm_remarks;
        } else {
            currentPMRemarks.style.display = 'none';
        }
    }
    
    const remarksSection = document.getElementById('remarksSection');
    const currentStatusSection = document.getElementById('currentStatusSection');
    const foRemarksForm = document.getElementById('foRemarksForm');

    if (['assigned', 'in progress', 'on hold', 'inspected', 'ongoing', 'approved'].includes(status)) {
        if(remarksSection) remarksSection.style.display = 'block';
        if(currentStatusSection) currentStatusSection.style.display = 'block';
        if(foRemarksForm) foRemarksForm.style.display = 'block';
        
        document.getElementById('markDoneBtn2').style.display = 'inline-flex';
        document.getElementById('onHoldBtn').style.display = 'inline-flex';
    } else {
        if(remarksSection) remarksSection.style.display = 'none';
        if(currentStatusSection) currentStatusSection.style.display = 'none';
        if(foRemarksForm) foRemarksForm.style.display = 'none';
    }
    
    if (status === 'completed' || status === 'done' || status === 'rejected') {
        document.getElementById('deleteBtn').style.display = 'inline-flex';
    }
    
    document.getElementById('ticketOverviewModal').style.display = 'flex';
}

function closeTicketOverviewModal() {
    document.getElementById('ticketOverviewModal').style.display = 'none';
}


function generateCompletedReport() {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert('jsPDF library is not loaded. Please try again in a moment.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    if (typeof doc.autoTable === 'undefined') {
        alert('jsPDF-AutoTable plugin is not loaded. Please try again in a moment.');
        return;
    }

    const searchBar = document.getElementById('searchApprovedAppointments');
    const searchQuery = searchBar ? searchBar.value.toLowerCase() : '';
    const approved = state.allAppointments.filter(appt => {
        const isApproved = ['Completed', 'Done'].includes(appt.status);
        const searchMatch = !searchQuery ||
            (appt.ticket_code && appt.ticket_code.toLowerCase().includes(searchQuery)) ||
            (appt.site && appt.site.toLowerCase().includes(searchQuery)) ||
            (appt.type_of_appointment && appt.type_of_appointment.toLowerCase().includes(searchQuery));
        return isApproved && searchMatch;
    });

    if (approved.length === 0) {
        alert('No completed appointments to report.');
        return;
    }

    const head = [['ID', 'Ticket', 'Date', 'Site', 'Type', 'Status', 'Priority', 'Engineer']];
    
    const body = approved.map(appt => {
        const date = new Date(appt.date).toLocaleDateString();
        let engineerName = '...';
        if (appt.engineer_records) {
            engineerName = `${appt.engineer_records.firstName || ''} ${appt.engineer_records.lastName || ''}`.trim();
        }
        return [
            appt.id,
            appt.ticket_code || 'N/A',
            date,
            appt.site || 'N/A',
            appt.type_of_appointment || 'N/A',
            appt.status,
            appt.priority_level || 'N/A',
            engineerName
        ];
    });

    doc.setFontSize(18);
    doc.text('Completed Appointments Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

    doc.autoTable({
        startY: 35,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [42, 51, 71] } 
    });

    doc.save('Completed_Appointments_Report.pdf');
}


function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = link.getAttribute('data-view');
            if (!viewName) return; 

            viewSections.forEach(section => section.classList.remove('active'));
            navLinks.forEach(nav => nav.classList.remove('active'));

            link.classList.add('active');
            const targetView = document.getElementById(viewName + '-view');
            if (targetView) targetView.classList.add('active');

            const parentUl = link.closest('ul.nav-sublist');
            if (parentUl) {
                const parentLink = parentUl.previousElementSibling;
                if(parentLink) parentLink.classList.add('active');
            }
        });
    });

    document.querySelectorAll('[data-toggle]').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const subnavId = toggle.getAttribute('data-toggle') + '-subnav';
            const subnav = document.getElementById(subnavId);
            if (subnav) {
                subnav.style.display = subnav.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
}

function navigateToAccounts(filterStatus) {
     const link = document.querySelector('[data-view="account-management"]');
     if(link) link.click();
     
     const statusFilter = document.getElementById('accountStatusFilter');
     if (statusFilter && filterStatus) {
         statusFilter.value = filterStatus;
         renderAccounts(); 
     }
}

function switchView(viewName) {
    const link = document.querySelector(`[data-view="${viewName}"]`);
    if (link) {
        link.click();
    } else {
        console.error(`No view found for: ${viewName}`);
    }
}
window.switchView = switchView; 

function openFacilityOwnerModal() {
    document.getElementById('foModalTitle').textContent = 'Add Facility Owner';
    document.getElementById('foHiddenId').value = '';
    document.getElementById('foGivenName').value = '';
    document.getElementById('foMiddleName').value = '';
    document.getElementById('foLastName').value = '';
    document.getElementById('foOrganization').value = '';
    document.getElementById('foContact').value = '';
    document.getElementById('foEmail').value = '';
    document.getElementById('foLocation').value = '';
    document.getElementById('foPassword').value = '';
    document.getElementById('foPassword').placeholder = 'Required for new account';
    document.getElementById('foPassword').required = true;

    const delBtn = document.getElementById('foDeleteBtn');
    if (delBtn) {
        delBtn.style.display = 'none';
        delBtn.onclick = null;
    }
    
    document.getElementById('facilityOwnerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFacilityOwnerModal() {
    document.getElementById('facilityOwnerModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.editFacilityOwner = function(userId) {
    const fo = (state.allAccounts || []).find(f => f.user_id === userId);
    if (!fo) {
        alert('Error: Facility Owner not found in state.');
        return;
    }
    
    document.getElementById('foModalTitle').textContent = 'Edit Facility Owner';
    document.getElementById('foHiddenId').value = fo.user_id || '';
    document.getElementById('foGivenName').value = fo.firstName || '';
    document.getElementById('foMiddleName').value = fo.middleName || '';
    document.getElementById('foLastName').value = fo.surname || '';
    document.getElementById('foOrganization').value = fo.company_name || '';
    document.getElementById('foContact').value = fo.phone_number || '';
    document.getElementById('foEmail').value = fo.email || '';
    document.getElementById('foLocation').value = fo.address || '';
    document.getElementById('foPassword').value = '';
    document.getElementById('foPassword').placeholder = 'Leave blank to keep unchanged';
    document.getElementById('foPassword').required = false;

    const archiveBtn = document.getElementById('foDeleteBtn'); 
    if (archiveBtn) {
        archiveBtn.textContent = 'Archive Account'; 
        archiveBtn.style.display = 'inline-flex';
        archiveBtn.style.background = '#f59e0b';
        archiveBtn.style.borderColor = '#f59e0b';
        
        archiveBtn.onclick = function() { archiveFacilityOwner(fo.user_id); };
    }
    
    document.getElementById('facilityOwnerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

async function saveFacilityOwner(ev) {
    ev.preventDefault();
    
    const id = document.getElementById('foHiddenId').value.trim();
    const password = document.getElementById('foPassword').value;

    const facilityOwnerData = {
        id: id || null,
        givenName: document.getElementById('foGivenName').value.trim(),
        middleName: document.getElementById('foMiddleName').value.trim(),
        lastName: document.getElementById('foLastName').value.trim(),
        organization: document.getElementById('foOrganization').value.trim(),
        phone: document.getElementById('foContact').value.trim(),
        email: document.getElementById('foEmail').value.trim(),
        location: document.getElementById('foLocation').value.trim(),
        password: password ? password : null
    };

    if (!id && !password) {
        alert('Password is required for a new Facility Owner.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/pm/facility-owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(facilityOwnerData)
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        alert(`Facility Owner ${id ? 'updated' : 'created'} successfully!`);
        closeFacilityOwnerModal();
        loadDashboardData();
        
    } catch (error) {
        alert('Error saving Facility Owner: ' + error.message);
    }
}

async function archiveFacilityOwner(userId) {
    if (!confirm('Are you sure you want to archive this Facility Owner? This will disable their account and hide them from lists, but all their data will be kept.')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/pm/archive-facility-owner/${userId}`, {
            method: 'POST'
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        alert('Facility Owner archived successfully.');
        closeFacilityOwnerModal();
        loadDashboardData(); 
        
    } catch (error) {
        alert('Error archiving Facility Owner: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
   
    window.openEngineerModal = function() {
        document.getElementById('engineerModalTitle').textContent = 'Add Engineer';
        document.getElementById('engHiddenId').value = '';
        document.getElementById('engGivenName').value = '';
        document.getElementById('engMiddleName').value = '';
        document.getElementById('engLastName').value = '';
        document.getElementById('engPhone').value = '';
        document.getElementById('engEmail').value = '';
        document.getElementById('engLocation').value = '';
        document.getElementById('engPassword').value = '';
        document.getElementById('engPassword').placeholder = 'Required for new engineer';
        document.getElementById('engPassword').required = true; 

        const delBtnAdd = document.getElementById('engDeleteBtn');
        if (delBtnAdd) { 
            delBtnAdd.style.display = 'none'; 
            delBtnAdd.onclick = null; 
        }
        
        document.getElementById('engineerModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    window.closeEngineerModal = function() {
        document.getElementById('engineerModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    window.editEngineer = function(userId) {
        const eng = (state.engineers || []).find(e => e.user_id === userId);
        if (!eng) return;
        
        document.getElementById('engineerModalTitle').textContent = 'Edit Engineer';
        document.getElementById('engHiddenId').value = eng.user_id || '';
        document.getElementById('engGivenName').value = eng.firstName || '';
        document.getElementById('engMiddleName').value = eng.middleName || '';
        document.getElementById('engLastName').value = eng.lastName || '';
        document.getElementById('engPhone').value = eng.phone_number || '';
        document.getElementById('engEmail').value = eng.email || '';
        document.getElementById('engLocation').value = eng.location || '';
        document.getElementById('engPassword').value = '';
        document.getElementById('engPassword').placeholder = 'Leave blank to keep unchanged';
        document.getElementById('engPassword').required = false;

        const delBtn = document.getElementById('engDeleteBtn');
        if (delBtn) {
            // *** CHANGED: Update button to "Archive" ***
            delBtn.textContent = 'Archive';
            delBtn.style.display = 'inline-flex';
            delBtn.style.background = '#f59e0b'; // Orange
            delBtn.style.borderColor = '#f59e0b';
            delBtn.onclick = function(){ window.archiveEngineer(eng.user_id); }; // Calls archiveEngineer
        }
        
        document.getElementById('engineerModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    window.saveEngineer = async function(ev) {
        ev.preventDefault();
        const id = document.getElementById('engHiddenId').value.trim();
        const password = document.getElementById('engPassword').value;
        
        const engineer = {
            id: id || null, 
            givenName: document.getElementById('engGivenName').value.trim(),
            middleName: document.getElementById('engMiddleName').value.trim(),
            lastName: document.getElementById('engLastName').value.trim(),
            phone: document.getElementById('engPhone').value.trim(),
            email: document.getElementById('engEmail').value.trim(),
            location: document.getElementById('engLocation').value.trim(),
            password: password ? password : null 
        };

        if (!id && !password) {
            alert('Password is required for a new engineer.');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/pm/engineer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(engineer)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert(`Engineer ${id ? 'updated' : 'created'} successfully!`);
            closeEngineerModal();
            loadDashboardData(); 
            
        } catch (error) {
            alert('Error saving engineer: ' + error.message);
        }
    }

    window.archiveEngineer = async function(userId) {
        if (!confirm('Are you sure you want to archive this engineer? This will disable their account and un-assign them from open tickets.')) return;
        
        try {
            const response = await fetch(`http://localhost:3000/api/pm/archive-engineer/${userId}`, {
                method: 'POST' 
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            
            alert('Engineer archived successfully.');
            closeEngineerModal();
            loadDashboardData(); 
            
        } catch (error) {
            alert('Error archiving engineer: ' + error.message);
        }
    }
    
    window.approveAccountStatus = function(id) { alert('Please use the "View" button to approve.'); }
    window.rejectAccountStatus = function(id) { alert('Reject not connected yet.'); }
    window.viewAccountDetails = function(id) { openApproveModal(id); }
    window.approveAccountFromModal = function() { }
    window.rejectAccountFromModal = function() { alert('Reject not connected yet.'); }
    window.deleteAccountFromModal = function() { alert('Delete not connected yet.'); }
    
    window.processTicket = async function() {
        const btn = document.getElementById('processBtn');
        btn.disabled = true;
    
        const appointment_id = parseInt(document.getElementById('currentAppointmentId').value);
        const engineer_user_id = document.getElementById('engineerSelect').value;
        const pm_remarks = document.getElementById('pmRemarksText').value;
    
        if (!engineer_user_id) {
            alert('Please select an engineer.');
            btn.disabled = false;
            return;
        }
    
        try {
            const response = await fetch('http://localhost:3000/api/pm/assign-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_id, engineer_user_id, pm_remarks })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
    
            alert('Appointment assigned successfully!');
            closeTicketOverviewModal();
            loadDashboardData();
    
        } catch (error) {
            alert('Error assigning appointment: ' + error.message);
        } finally {
            btn.disabled = false;
        }
    }

    window.approveAppointment = function() { alert('Approve not connected yet.'); }
    window.rejectAppointment = function(id) { alert('Reject not connected yet. This will be a new API endpoint.'); }
    window.deleteAppointment = function(id) { alert('Delete not connected yet. This will be a new API endpoint.'); }
    
    window.markAsDone = async function() {
        const btn = document.getElementById('markDoneBtn2');
        const appointment_id = parseInt(document.getElementById('currentAppointmentId').value);
        const remarks = document.getElementById('foRemarkText').value.trim();

        if (!remarks) {
            alert('Please provide completion remarks to the Facility Owner.');
            return;
        }
        if (!appointment_id) {
            alert('Error: No appointment ID found.');
            return;
        }
        if (!confirm(`Mark this appointment as "Completed"?\n\nRemarks: ${remarks}`)) {
            return;
        }
        btn.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/pm/complete-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_id, remarks })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Appointment marked as Completed!');
            closeTicketOverviewModal();
            loadDashboardData(); 
        } catch (error) {
            alert('Error marking as done: ' + error.message);
        } finally {
            btn.disabled = false;
        }
    }
    
    window.showOnHoldInput = function() { 
        document.getElementById('onHoldRemarksSection').style.display = 'block'; 
    }
    window.cancelOnHold = function() { 
        document.getElementById('onHoldRemarksSection').style.display = 'none';
        document.getElementById('onHoldReasonText').value = '';
    }
    window.confirmOnHold = async function() {
        const appointment_id = parseInt(document.getElementById('currentAppointmentId').value);
        const remarks = document.getElementById('onHoldReasonText').value.trim();

        if (!remarks) {
            alert('Please provide a reason for putting this appointment on hold.');
            return;
        }
        if (!appointment_id) {
            alert('Error: No appointment ID found.');
            return;
        }
        if (!confirm(`Put appointment on hold?\n\nReason: ${remarks}`)) {
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/pm/hold-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_id, remarks })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert('Appointment status set to "On Hold".');
            closeTicketOverviewModal();
            loadDashboardData(); 
        } catch (error) {
            alert('Error setting status to On Hold: ' + error.message);
        }
    }
    
    window.notifyFOApprove = function() { alert('Notify FO not connected yet.'); }
    window.notifyFOReject = function() { alert('Notify FO not connected yet.'); }
    
    window.viewTicketDetails = function(ticketId) {
        const appt = state.allAppointments.find(a => a.id == ticketId || a.ticketNumber == ticketId);
        if(appt) openTicketModal(appt.id);
    };
    window.closeAssignmentForm = function() {
        closeTicketOverviewModal();
    };

    checkPMSession(); 
    initNavigation(); 
    
    const accountStatusFilter = document.getElementById('accountStatusFilter');
    if (accountStatusFilter) {
        accountStatusFilter.addEventListener('change', renderAccounts);
    }
    
    const searchAccounts = document.getElementById('searchAccounts');
    if (searchAccounts) {
        searchAccounts.addEventListener('input', renderAccounts);
    }
    
    const searchEngineers = document.getElementById('searchEngineers');
    if (searchEngineers) {
        searchEngineers.addEventListener('input', renderEngineers);
    }

    const searchFacilityOwners = document.getElementById('searchFacilityOwners');
    if(searchFacilityOwners) {
        searchFacilityOwners.addEventListener('input', renderFacilityOwners);
    }
    
    const searchRequestAppointments = document.getElementById('searchRequestAppointments');
    if(searchRequestAppointments) {
        searchRequestAppointments.addEventListener('input', renderRequestAppointments);
    }

    const statusFilterOnHold = document.getElementById('statusFilterOnHold');
    if(statusFilterOnHold) {
        statusFilterOnHold.addEventListener('change', renderOnHoldAppointments);
    }

    const searchOnHoldAppointments = document.getElementById('searchOnHoldAppointments');
    if(searchOnHoldAppointments) {
        searchOnHoldAppointments.addEventListener('input', renderOnHoldAppointments);
    }

    const searchApprovedAppointments = document.getElementById('searchApprovedAppointments');
    if(searchApprovedAppointments) {
        searchApprovedAppointments.addEventListener('input', renderApprovedAppointments);
    }

    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateCompletedReport);
    }
    
    const engineerForm = document.getElementById('engineerForm');
    if (engineerForm) {
        engineerForm.addEventListener('submit', saveEngineer); 
    }

    const facilityOwnerForm = document.getElementById('facilityOwnerForm');
    if (facilityOwnerForm) {
        facilityOwnerForm.addEventListener('submit', saveFacilityOwner);
    }

    const engineerSelectModal = document.getElementById('engineerSelect');
    if (engineerSelectModal) {
        engineerSelectModal.addEventListener('change', function() {
            const pmRemarksField = document.getElementById('pmRemarksField');
            if (pmRemarksField) {
                if (this.value) {
                    pmRemarksField.style.display = 'block'; 
                } else {
                    pmRemarksField.style.display = 'none'; 
                }
            }
        });
    }

    let currentDate = new Date();
    const calendarTitle = document.getElementById('calendarTitle');
    const calendarGrid = document.getElementById('calendarGrid');

    function updateCalendar() {
        if (!calendarTitle || !calendarGrid) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        calendarTitle.textContent = `${monthNames[month]} ${year}`;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        let calendarHTML = `<div class="calendar-day">S</div><div class="calendar-day">M</div><div class="calendar-day">T</div><div class="calendar-day">W</div><div class="calendar-day">TH</div><div class="calendar-day">F</div><div class="calendar-day">S</div>`;
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-date"></div>';
        }
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const selectedClass = isToday ? 'selected' : '';
            calendarHTML += `<div class="calendar-date ${selectedClass}">${day}</div>`;
        }
        calendarGrid.innerHTML = calendarHTML;
    }

    const prevMonth = document.getElementById('prevMonth');
    if(prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar();
        });
    }
    
    const nextMonth = document.getElementById('nextMonth');
    if(nextMonth) {
        nextMonth.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar();
        });
    }
    updateCalendar();
});