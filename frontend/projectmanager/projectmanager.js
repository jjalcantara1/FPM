//
// REPLACE your entire projectmanager.js file with this
//

// Global state to hold all our data
const state = {
    currentUser: null,
    pmProfile: null,
    pendingAppointments: [],
    allAccounts: [],
    engineers: []
};

// --- 1. AUTHENTICATION & CORE ---

async function logout() {
    await supabase.auth.signOut();
    window.location.href = '../pm_login/pm_login.html';
}

async function checkPMSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
        console.log('No session, redirecting to PM login.');
        window.location.href = '../pm_login/pm_login.html';
        return;
    }
    state.currentUser = data.session.user;

    // Verify this user is a Project Manager
    const { data: profile, error: profileError } = await supabase
        .from('project_manager_records')
        .select('*')
        .eq('user_id', state.currentUser.id)
        .single();

    if (profileError || !profile) {
        console.error('Not a PM or profile not found.', profileError);
        await logout(); // Not a PM, log them out
        return;
    }

    state.pmProfile = profile;
    
    // User is a real PM, update UI and load data
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

// --- 2. DATA LOADING ---

async function loadDashboardData() {
    try {
        const response = await fetch('http://localhost:3000/api/pm/dashboard-data');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch dashboard data.');
        }
        const data = await response.json();

        state.pendingAppointments = data.pendingAppointments || [];
        state.allAccounts = data.allAccounts || [];
        state.engineers = data.engineers || [];

        // Render all components
        renderDashboardStats();
        renderRequestAppointments();
        renderAccounts(); // This will now show ALL accounts
        renderEngineers();
        populateEngineerDropdown();

    } catch (error) {
        console.error(error.message);
        alert('Could not load dashboard data. Is the backend server running?');
    }
}

// --- 3. DATA RENDERING ---

function renderDashboardStats() {
    const totalEl = document.getElementById('totalTickets');
    const pendingFOEl = document.getElementById('pendingFOAccounts');
    
    const pendingAccountsCount = state.allAccounts.filter(a => a.status === 'pending').length;
    
    if (totalEl) totalEl.textContent = state.pendingAppointments.length;
    if (pendingFOEl) pendingFOEl.textContent = pendingAccountsCount;
}

function renderRequestAppointments() {
    const tbody = document.getElementById('requestAppointmentsBody');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    const pending = state.pendingAppointments;

    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No pending appointments.</td></tr>';
        return;
    }

    pending.forEach((appt) => {
        const row = document.createElement('tr');
        const date = new Date(appt.date).toLocaleDateString();
        row.innerHTML = `
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td><span class="status-pill status-pending">${appt.status}</span></td>
            <td>${appt.priority_level || 'N/A'}</td>
            <td><div class="row-actions"><button class="action-btn" onclick="openAssignModal(${appt.id})">Assign</button></div></td>
        `;
        tbody.appendChild(row);
    });
}

function renderAccounts() {
    const tbody = document.getElementById('accountsBody');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (state.allAccounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No facility owner accounts found.</td></tr>';
        return;
    }
    
    // Filter based on the dropdown
    const statusFilter = document.getElementById('accountStatusFilter').value;
    const searchQuery = document.getElementById('searchAccounts').value.toLowerCase();
    
    const filteredAccounts = state.allAccounts.filter(acc => {
        const statusMatch = statusFilter === 'all' || acc.status === statusFilter;
        
        const searchMatch = !searchQuery || 
            (acc.firstName && acc.firstName.toLowerCase().includes(searchQuery)) ||
            (acc.surname && acc.surname.toLowerCase().includes(searchQuery)) ||
            (acc.company_name && acc.company_name.toLowerCase().includes(searchQuery)) ||
            (acc.email && acc.email.toLowerCase().includes(searchQuery));
            
        return statusMatch && searchMatch;
    });


    filteredAccounts.forEach(acc => {
        const row = document.createElement('tr');
        const status = acc.status || 'pending';
        const statusClass = status === 'approved' ? 'status-approved' : 'status-pending';

        row.innerHTML = `
            <td>${acc.firstName || ''} ${acc.surname || ''}</td>
            <td>${acc.company_name || 'N/A'}</td>
            <td>${acc.email || 'N/A'}</td>
            <td>${acc.phone_number || 'N/A'}</td>
            <td><span class="status-pill ${statusClass}">${status}</span></td>
            <td><button class="action-btn" onclick="openApproveModal('${acc.user_id}')">View</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderEngineers() {
    const tbody = document.getElementById('engineersBody');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    state.engineers.forEach(eng => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${eng.firstName || ''} ${eng.lastName || ''}</td>
            <td>${eng.email || 'N/A'}</td>
            <td>${eng.phone_number || 'N/A'}</td>
            <td>${eng.location || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

function populateEngineerDropdown() {
    const select = document.getElementById('engineerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select an engineer...</option>'; // Reset
    
    state.engineers.forEach(eng => {
        const option = document.createElement('option');
        option.value = eng.user_id; // Assign the engineer's UUID
        option.textContent = `${eng.firstName || ''} ${eng.lastName || ''} (${eng.location || 'N/A'})`;
        select.appendChild(option);
    });
}

// --- 4. MODAL & ACTIONS ---

// View/Approve Account Modal
function openApproveModal(userId) {
    const acc = state.allAccounts.find(a => a.user_id === userId);
    if (!acc) return;

    // Set the onclick for the approve button
    const approveBtn = document.getElementById('accountApproveBtn');
    approveBtn.onclick = () => approveAccount(acc.user_id);
    
    // Show or hide the approve button based on status
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
    
    const statusEl = document.getElementById('accountDetailStatus');
    statusEl.textContent = acc.status;
    statusEl.className = `status-pill ${acc.status === 'approved' ? 'status-approved' : 'status-pending'}`;

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
        loadDashboardData(); // Refresh all data

    } catch (error) {
        alert('Error approving account: ' + error.message);
    }
}

// Assign Appointment Modal
function openAssignModal(appointmentId) {
    const appt = state.pendingAppointments.find(a => a.id === appointmentId);
    if (!appt) return;

    document.getElementById('currentAppointmentId').value = appt.id;
    document.getElementById('overviewTicket').textContent = appt.ticket_code || 'N/A';
    document.getElementById('overviewDate').textContent = new Date(appt.date).toLocaleDateString();
    document.getElementById('overviewPriority').textContent = appt.priority_level || 'N/A';
    document.getElementById('overviewSite').textContent = appt.site || 'N/A';
    document.getElementById('overviewDescription').textContent = appt.task_description || 'N/A';
    
    document.getElementById('pmRemarksText').value = ''; // Clear remarks
    document.getElementById('engineerSelect').value = ''; // Reset dropdown

    document.getElementById('ticketOverviewModal').style.display = 'flex';
}

function closeTicketOverviewModal() {
    document.getElementById('ticketOverviewModal').style.display = 'none';
}

// Handle the "Assign" form submission
document.getElementById('assignmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
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
        loadDashboardData(); // Refresh all data

    } catch (error) {
        alert('Error assigning appointment: ' + error.message);
    } finally {
        btn.disabled = false;
    }
});

// --- 5. INITIALIZATION & HELPERS ---

// Simple navigation
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
         renderAccounts(); // Re-render the accounts table with the filter
     }
}

// Run all initialization on page load
document.addEventListener('DOMContentLoaded', function() {
    checkPMSession(); // Start authentication
    initNavigation(); // Set up the sidebar links
    
    // Add event listeners for account filters
    document.getElementById('accountStatusFilter').addEventListener('change', renderAccounts);
    document.getElementById('searchAccounts').addEventListener('input', renderAccounts);
});