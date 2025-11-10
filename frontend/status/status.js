let currentUser = null;
let userProfile = null;
let allAppointments = [];

function statusClass(s){
    const k = String(s||'pending').toLowerCase();
    if (k === 'approved') return 'status-approved';
    if (k === 'rejected') return 'status-rejected';
    if (k === 'assigned') return 'status-assigned';
    if (k === 'ongoing' || k === 'in progress' || k === 'in_progress') return 'status-inprogress';
    if (k === 'completed' || k === 'done') return 'status-done';
    return 'status-pending';
}
        
async function logout(){ 
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
    window.location.href = '../landingpage/landingpage.html#home'; 
}

async function checkUserSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
        console.log('No session found, redirecting to login.');
        window.location.href = '../login/login.html';
        return;
    }

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await supabase
        .from('facility_owner_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError.message);
        logout();
        return;
    }

    userProfile = profile;
    updateHeaderUI();
    
    loadAndRenderAppointments();
}
        
function updateHeaderUI() {
    const label = document.getElementById('welcomeLabel');
    if (label && userProfile) {
        label.textContent = userProfile.company_name || userProfile.email;
    }
    
    var badge = document.querySelector('.profile-btn .badge');
    if (badge) {
        badge.textContent = 'Approved';
        badge.classList.remove('pending');
        badge.classList.add('approved');
    }
}

async function loadAndRenderAppointments() {
    const tableBody = document.getElementById('statusBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Loading your appointments...</td></tr>`;

    const { data, error } = await supabase
        .from('appointment_records')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching appointments:', error.message);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Error loading appointments.</td></tr>`;
        return;
    }

    allAppointments = data;
    renderTable(allAppointments);
}

function renderTable(appointments) {
    const tableBody = document.getElementById('statusBody');
    tableBody.innerHTML = '';

    if (!appointments || appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">You have not created any appointments yet.</td></tr>`;
        return;
    }

    let count = 1;
    appointments.forEach(appt => {
        const row = document.createElement('tr');
        
        const date = new Date(appt.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        row.innerHTML = `
            <td>${count++}</td>
            <td>${appt.ticket_code || 'N/A'}</td>
            <td>${date || 'N/A'}</td>
            <td>${appt.site || 'N/A'}</td>
            <td>${appt.type_of_appointment || 'N/A'}</td>
            <td>${appt.task_description || 'N/A'}</td>
            <td><span class="status-pill ${statusClass(appt.status)}">${appt.status || 'Pending'}</span></td>
            <td>${appt.priority_level || 'N/A'}</td>
            <td><button class="btn-view" onclick="viewDetails(${appt.id})">View</button></td>
        `;
        tableBody.appendChild(row);
    });
}
        
window.viewDetails = function(appointmentId) {
    const task = allAppointments.find(appt => appt.id === appointmentId);
    if (!task) return;
    
    const date = new Date(task.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('modalTicketNumber').textContent = task.ticket_code || 'N/A';
    document.getElementById('modalDate').textContent = date;
    document.getElementById('modalSite').textContent = task.site || 'N/A';
    document.getElementById('modalType').textContent = task.type_of_appointment || 'N/A';
    document.getElementById('modalDescription').textContent = task.task_description || 'N/A';
    document.getElementById('modalStatus').textContent = task.status || 'Pending';
    document.getElementById('modalPriority').textContent = task.priority_level || 'N/A';
    
    document.getElementById('modalRemarks').textContent = 'Waiting for Project Manager review.';
    document.getElementById('modalEngineer').textContent = 'Not yet assigned';
    document.getElementById('modalCompletion').textContent = 'TBD';

    document.getElementById('modalContact').textContent = `${userProfile.firstName} ${userProfile.surname}`;
    document.getElementById('modalPhone').textContent = userProfile.phone_number;
    
    document.getElementById('taskModal').classList.add('show');
};
        
window.closeModal = function() {
    document.getElementById('taskModal').classList.remove('show');
};
        
document.addEventListener('DOMContentLoaded', function(){
    checkUserSession();
    
    var btn = document.getElementById('profileBtn');
    var menu = document.getElementById('profileMenu');
    if (btn && menu) {
        btn.addEventListener('click', function(){ menu.classList.toggle('open'); });
        document.addEventListener('click', function(e){ if (!menu.contains(e.target) && !btn.contains(e.target)) { menu.classList.remove('open'); } });
    }
    
    var filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            var selectedStatus = this.value.toLowerCase();
            var rows = document.querySelectorAll('#statusBody tr');
            
            rows.forEach(function(row) {
                var statusPill = row.querySelector('.status-pill');
                if (statusPill) {
                    var rowStatus = statusPill.textContent.toLowerCase();
                    
                    if (selectedStatus === 'all' || rowStatus === selectedStatus) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    }
});
