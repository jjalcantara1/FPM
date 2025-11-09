<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>FINSI — Project Manager</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="pm.css">
    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
        import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

        const firebaseConfig = {
            apiKey: 'AIzaSyCWbzFRzGSgM1NvvAKxTz5atNcNVBUDmZc',
            authDomain: 'fleetsync-34b0e.firebaseapp.com',
            projectId: 'fleetsync-34b0e',
            storageBucket: 'fleetsync-34b0e.firebasestorage.app',
            messagingSenderId: '7049146317',
            appId: '1:7049146317:web:b0ae838919058d9d9cde84',
            measurementId: 'G-SYDNCC212C'
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const state = { 
            accounts: [], 
            requests: [], 
            approved: [],
            requestsFiltered: [],
            approvedFiltered: [],
            appointments: [],
            requestAppointments: [],
            onHoldAppointments: [],
            approvedAppointments: [],
            rejectedAppointments: [],
            requestAppointmentsFiltered: [],
            onHoldAppointmentsFiltered: [],
            approvedAppointmentsFiltered: [],
            rejectedAppointmentsFiltered: []
        };

        function renderRequests(items) {
            const tbody = document.getElementById('requestsBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((acc, index) => {
                // Use actual firstName and lastName from database
                const givenName = acc.firstName || acc.givenName || 'N/A';
                const lastName = acc.lastName || 'N/A';
                const middleName = acc.middleName || 'N/A';
                
                return `
<tr data-id="${acc.__id}">
  <td>${index + 1}</td>
  <td>${givenName}</td>
  <td>${middleName}</td>
  <td>${lastName}</td>
  <td>${acc.phoneNumber || acc.phone || 'N/A'}</td>
  <td>${acc.companyEmail || acc.email || 'N/A'}</td>
  <td>${acc.companyName || 'N/A'}</td>
  <td><button class="action-btn" data-approve data-id="${acc.__id}">Approve</button></td>
</tr>`;
            }).join('');
        }

        function renderApproved(items) {
            const tbody = document.getElementById('approvedBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((acc, index) => {
                // Use actual firstName and lastName from database
                const givenName = acc.firstName || acc.givenName || 'N/A';
                const lastName = acc.lastName || 'N/A';
                const middleName = acc.middleName || 'N/A';
                
                return `
<tr data-id="${acc.__id}">
  <td>${index + 1}</td>
  <td>${givenName}</td>
  <td>${middleName}</td>
  <td>${lastName}</td>
  <td>${acc.phoneNumber || acc.phone || 'N/A'}</td>
  <td>${acc.companyEmail || acc.email || 'N/A'}</td>
  <td>${acc.companyName || 'N/A'}</td>
  <td><button class="action-btn delete" data-delete data-id="${acc.__id}">Delete</button></td>
</tr>`;
            }).join('');
        }

        function renderRequestAppointments(items) {
            const tbody = document.getElementById('requestAppointmentsBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((apt, index) => {
                const priorityClass = getPriorityClass(apt.priority);
                const statusClass = getStatusClass(apt.status);
                
                return `
<tr data-id="${apt.__id}">
  <td>${index + 1}</td>
  <td>${apt.ticketNumber || apt.appointmentId || 'TKT-' + apt.__id}</td>
  <td>${apt.date || 'N/A'}</td>
  <td>${apt.site || 'N/A'}</td>
  <td>${apt.type || 'N/A'}</td>
  <td>${apt.description || apt.taskDescription || 'N/A'}</td>
  <td><span class="${statusClass}">${apt.status || 'Pending'}</span></td>
  <td><span class="${priorityClass}">${apt.priority || 'Low'}</span></td>
  <td><div class="row-actions"><button class="action-btn" data-process-appointment data-id="${apt.__id}">Process</button><button class="action-btn delete" data-reject-appointment data-id="${apt.__id}">Reject</button></div></td>
</tr>`;
            }).join('');
        }

        function renderOnHoldAppointments(items) {
            const tbody = document.getElementById('onHoldAppointmentsBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((apt, index) => {
                const priorityClass = getPriorityClass(apt.priority);
                const statusClass = getStatusClass(apt.status);
                const engineerLabel = getEngineerDisplay(apt);
                
                return `
<tr data-id="${apt.__id}">
  <td>${index + 1}</td>
  <td>${apt.ticketNumber || apt.appointmentId || 'TKT-' + apt.__id}</td>
  <td>${apt.date || 'N/A'}</td>
  <td>${apt.site || 'N/A'}</td>
  <td>${apt.type || 'N/A'}</td>
  <td>${apt.description || apt.taskDescription || 'N/A'}</td>
  <td><span class="${statusClass}">${apt.status || 'On Hold'}</span></td>
  <td><span class="${priorityClass}">${apt.priority || 'Low'}</span></td>
  <td>${engineerLabel}</td>
  <td>
    <div class="row-actions">
      ${apt.assignedOnce ? '' : `<button class="action-btn" data-assign-appointment data-id="${apt.__id}">Assign</button>`}
      <button class="action-btn approve" data-approve-appointment data-id="${apt.__id}">Approve</button>
    </div>
  </td>
</tr>`;
            }).join('');
        }

        function renderRejectedAppointments(items) {
            const tbody = document.getElementById('rejectedAppointmentsBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((apt, index) => {
                const priorityClass = getPriorityClass(apt.priority);
                const statusClass = getStatusClass(apt.status);
                
                return `
<tr data-id="${apt.__id}">
  <td>${index + 1}</td>
  <td>${apt.ticketNumber || apt.appointmentId || 'TKT-' + apt.__id}</td>
  <td>${apt.date || 'N/A'}</td>
  <td>${apt.site || 'N/A'}</td>
  <td>${apt.type || 'N/A'}</td>
  <td>${apt.description || apt.taskDescription || 'N/A'}</td>
  <td><span class="${statusClass}">${apt.status || 'Rejected'}</span></td>
  <td><span class="${priorityClass}">${apt.priority || 'Low'}</span></td>
  <td>
    <div class="row-actions">
      <button class="action-btn delete" data-delete-appointment data-id="${apt.__id}">Delete</button>
    </div>
  </td>
</tr>`;
            }).join('');
        }

        function renderApprovedAppointments(items) {
            const tbody = document.getElementById('approvedAppointmentsBody');
            if (!tbody) return;
            tbody.innerHTML = items.map((apt, index) => {
                const priorityClass = getPriorityClass(apt.priority);
                const statusClass = getStatusClass(apt.status);
                const engineerLabel = getEngineerDisplay(apt);
                
                return `
<tr data-id="${apt.__id}">
  <td>${index + 1}</td>
  <td>${apt.ticketNumber || apt.appointmentId || 'TKT-' + apt.__id}</td>
  <td>${apt.date || 'N/A'}</td>
  <td>${apt.site || 'N/A'}</td>
  <td>${apt.type || 'N/A'}</td>
  <td>${apt.description || apt.taskDescription || 'N/A'}</td>
  <td><span class="${statusClass}">${apt.status || 'Approved'}</span></td>
  <td><span class="${priorityClass}">${apt.priority || 'Low'}</span></td>
  <td>${engineerLabel}</td>
  <td>
    <div class="row-actions">
      <button class="action-btn" data-view-appointment data-id="${apt.__id}">View Details</button>
      <button class="action-btn delete" data-delete-appointment data-id="${apt.__id}">Delete</button>
    </div>
  </td>
</tr>`;
            }).join('');
        }

        async function loadAccounts() {
            const q = query(collection(db, 'companies'), orderBy('companyName'));
            const snap = await getDocs(q);
            const all = [];
            snap.forEach(d => all.push({ __id: d.id, ...d.data() }));
            
            // Separate into requests and approved
            state.accounts = all;
            state.requests = all.filter(a => (a.status || 'pending').toLowerCase() !== 'approved');
            state.approved = all.filter(a => (a.status || 'pending').toLowerCase() === 'approved');
            state.requestsFiltered = state.requests.slice();
            state.approvedFiltered = state.approved.slice();
            
            renderRequests(state.requestsFiltered);
            renderApproved(state.approvedFiltered);
            updateDashboardStats();
            renderNotifications();
        }

        async function setStatus(id, status) {
            const ref = doc(db, 'companies', id);
            await updateDoc(ref, { status });
            
            // Update main accounts array
            const idx = state.accounts.findIndex(a => a.__id === id);
            if (idx !== -1) state.accounts[idx].status = status;
            
            // Move between requests and approved arrays
            if (status === 'approved') {
                // Move from requests to approved
                const moved = state.requests.find(a => a.__id === id);
                if (moved) {
                    state.requests = state.requests.filter(a => a.__id !== id);
                    state.requestsFiltered = state.requestsFiltered.filter(a => a.__id !== id);
                    state.approved.push(moved);
                    state.approvedFiltered.push(moved);
                }
            } else {
                // Move from approved to requests
                const moved = state.approved.find(a => a.__id === id);
                if (moved) {
                    state.approved = state.approved.filter(a => a.__id !== id);
                    state.approvedFiltered = state.approvedFiltered.filter(a => a.__id !== id);
                    state.requests.push(moved);
                    state.requestsFiltered.push(moved);
                }
            }
            
            renderRequests(state.requestsFiltered);
            renderApproved(state.approvedFiltered);
            updateDashboardStats();
            renderNotifications();
        }

        async function deleteEmployee(id) {
            try {
                // Permanently delete the document from Firebase
                const ref = doc(db, 'companies', id);
                await deleteDoc(ref);
                
                // Remove from all arrays
                state.accounts = state.accounts.filter(a => a.__id !== id);
                state.requests = state.requests.filter(a => a.__id !== id);
                state.approved = state.approved.filter(a => a.__id !== id);
                state.requestsFiltered = state.requestsFiltered.filter(a => a.__id !== id);
                state.approvedFiltered = state.approvedFiltered.filter(a => a.__id !== id);
                
                renderRequests(state.requestsFiltered);
                renderApproved(state.approvedFiltered);
                updateDashboardStats();
                renderNotifications();
                
                console.log('Account permanently deleted from Firebase:', id);
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Failed to delete account. Please try again.');
            }
        }

        async function setAppointmentStatus(id, status) {
            const ref = doc(db, 'appointments', id);
            // If approving, also flag engineerStatus as accepted so UI shows check icon
            if ((status || '').toLowerCase() === 'approved') {
                await updateDoc(ref, { status, engineerStatus: 'accepted' });
            } else {
                await updateDoc(ref, { status });
            }
            
            // Update main appointments array
            const idx = state.appointments.findIndex(a => a.__id === id);
            if (idx !== -1) state.appointments[idx].status = status;
            
            // Move between request, on hold, and approved arrays
            if ((status || '').toLowerCase() === 'on hold') {
                // Move from request to on hold
                const moved = state.requestAppointments.find(a => a.__id === id) || state.requestAppointmentsFiltered.find(a => a.__id === id);
                if (moved) {
                    state.requestAppointments = state.requestAppointments.filter(a => a.__id !== id);
                    state.requestAppointmentsFiltered = state.requestAppointmentsFiltered.filter(a => a.__id !== id);
                    state.onHoldAppointments.push(moved);
                    state.onHoldAppointmentsFiltered.push(moved);
                }
            } else if ((status || '').toLowerCase() === 'approved') {
                // Move from on hold or request to approved
                let moved = state.onHoldAppointments.find(a => a.__id === id) || state.requestAppointments.find(a => a.__id === id);
                if (!moved) {
                    moved = state.onHoldAppointmentsFiltered.find(a => a.__id === id) || state.requestAppointmentsFiltered.find(a => a.__id === id);
                }
                if (moved) {
                    state.requestAppointments = state.requestAppointments.filter(a => a.__id !== id);
                    state.requestAppointmentsFiltered = state.requestAppointmentsFiltered.filter(a => a.__id !== id);
                    state.onHoldAppointments = state.onHoldAppointments.filter(a => a.__id !== id);
                    state.onHoldAppointmentsFiltered = state.onHoldAppointmentsFiltered.filter(a => a.__id !== id);
                    state.approvedAppointments.push(moved);
                    state.approvedAppointmentsFiltered.push(moved);
                    moved.engineerStatus = 'accepted';
                }
            } else if ((status || '').toLowerCase() === 'rejected') {
                // Move any instance into rejected lists
                let moved = state.requestAppointments.find(a => a.__id === id) || state.onHoldAppointments.find(a => a.__id === id) || state.approvedAppointments.find(a => a.__id === id);
                if (!moved) {
                    moved = state.requestAppointmentsFiltered.find(a => a.__id === id) || state.onHoldAppointmentsFiltered.find(a => a.__id === id) || state.approvedAppointmentsFiltered.find(a => a.__id === id);
                }
                if (moved) {
                    state.requestAppointments = state.requestAppointments.filter(a => a.__id !== id);
                    state.requestAppointmentsFiltered = state.requestAppointmentsFiltered.filter(a => a.__id !== id);
                    state.onHoldAppointments = state.onHoldAppointments.filter(a => a.__id !== id);
                    state.onHoldAppointmentsFiltered = state.onHoldAppointmentsFiltered.filter(a => a.__id !== id);
                    state.approvedAppointments = state.approvedAppointments.filter(a => a.__id !== id);
                    state.approvedAppointmentsFiltered = state.approvedAppointmentsFiltered.filter(a => a.__id !== id);
                    state.rejectedAppointments.push(moved);
                    state.rejectedAppointmentsFiltered.push(moved);
                }
            } else {
                // Any other status goes back to request
                let moved = state.onHoldAppointments.find(a => a.__id === id) || state.approvedAppointments.find(a => a.__id === id);
                if (!moved) {
                    moved = state.onHoldAppointmentsFiltered.find(a => a.__id === id) || state.approvedAppointmentsFiltered.find(a => a.__id === id);
                }
                if (moved) {
                    state.onHoldAppointments = state.onHoldAppointments.filter(a => a.__id !== id);
                    state.onHoldAppointmentsFiltered = state.onHoldAppointmentsFiltered.filter(a => a.__id !== id);
                    state.approvedAppointments = state.approvedAppointments.filter(a => a.__id !== id);
                    state.approvedAppointmentsFiltered = state.approvedAppointmentsFiltered.filter(a => a.__id !== id);
                    state.requestAppointments.push(moved);
                    state.requestAppointmentsFiltered.push(moved);
                }
            }
            
            renderRequestAppointments(state.requestAppointmentsFiltered);
            renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
            renderApprovedAppointments(state.approvedAppointmentsFiltered);
            renderRejectedAppointments(state.rejectedAppointmentsFiltered);
            updateDashboardStats();
        }

        async function deleteAppointment(id) {
            try {
                // Permanently delete the appointment from Firebase
                const ref = doc(db, 'appointments', id);
                await deleteDoc(ref);
                
                // Remove from all arrays
                state.appointments = state.appointments.filter(a => a.__id !== id);
                state.requestAppointments = state.requestAppointments.filter(a => a.__id !== id);
                state.onHoldAppointments = state.onHoldAppointments.filter(a => a.__id !== id);
                state.approvedAppointments = state.approvedAppointments.filter(a => a.__id !== id);
                state.requestAppointmentsFiltered = state.requestAppointmentsFiltered.filter(a => a.__id !== id);
                state.onHoldAppointmentsFiltered = state.onHoldAppointmentsFiltered.filter(a => a.__id !== id);
                state.approvedAppointmentsFiltered = state.approvedAppointmentsFiltered.filter(a => a.__id !== id);
                
                renderRequestAppointments(state.requestAppointmentsFiltered);
                renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
                renderApprovedAppointments(state.approvedAppointmentsFiltered);
                renderRejectedAppointments(state.rejectedAppointmentsFiltered);
                updateDashboardStats();
                
                console.log('Appointment permanently deleted from Firebase:', id);
            } catch (error) {
                console.error('Error deleting appointment:', error);
                alert('Failed to delete appointment. Please try again.');
            }
        }

        function wireEvents() {
            const requestsTable = document.getElementById('requestsTable');
            const approvedTable = document.getElementById('approvedTable');
            const searchRequests = document.getElementById('searchRequests');
            const searchApproved = document.getElementById('searchApproved');
            const requestAppointmentsTable = document.getElementById('requestAppointmentsTable');
            const onHoldAppointmentsTable = document.getElementById('onHoldAppointmentsTable');
            const approvedAppointmentsTable = document.getElementById('approvedAppointmentsTable');
            const rejectedAppointmentsTable = document.getElementById('rejectedAppointmentsTable');
            const searchRequestAppointments = document.getElementById('searchRequestAppointments');
            const searchOnHoldAppointments = document.getElementById('searchOnHoldAppointments');
            const searchApprovedAppointments = document.getElementById('searchApprovedAppointments');
            const searchRejectedAppointments = document.getElementById('searchRejectedAppointments');
            
            // Search for requests
            if (searchRequests) {
                searchRequests.addEventListener('input', () => {
                    const q = searchRequests.value.toLowerCase();
                    state.requestsFiltered = state.requests.filter(a =>
                        (a.companyName||'').toLowerCase().includes(q) ||
                        (a.companyEmail||'').toLowerCase().includes(q) ||
                        (a.firstName||a.givenName||'').toLowerCase().includes(q) ||
                        (a.lastName||'').toLowerCase().includes(q) ||
                        (a.phoneNumber||a.phone||'').toLowerCase().includes(q) ||
                        (a.middleName||'').toLowerCase().includes(q)
                    );
                    renderRequests(state.requestsFiltered);
                });
            }
            
            // Search for approved accounts
            if (searchApproved) {
                searchApproved.addEventListener('input', () => {
                    const q = searchApproved.value.toLowerCase();
                    state.approvedFiltered = state.approved.filter(a =>
                        (a.companyName||'').toLowerCase().includes(q) ||
                        (a.companyEmail||'').toLowerCase().includes(q) ||
                        (a.firstName||a.givenName||'').toLowerCase().includes(q) ||
                        (a.lastName||'').toLowerCase().includes(q) ||
                        (a.phoneNumber||a.phone||'').toLowerCase().includes(q) ||
                        (a.middleName||'').toLowerCase().includes(q)
                    );
                    renderApproved(state.approvedFiltered);
                });
            }
            
            // Search for request appointments
            if (searchRequestAppointments) {
                searchRequestAppointments.addEventListener('input', () => {
                    const q = searchRequestAppointments.value.toLowerCase();
                    state.requestAppointmentsFiltered = state.requestAppointments.filter(a =>
                        (a.ticketNumber||'').toLowerCase().includes(q) ||
                        (a.date||'').toLowerCase().includes(q) ||
                        (a.site||'').toLowerCase().includes(q) ||
                        (a.type||'').toLowerCase().includes(q) ||
                        (a.description||a.taskDescription||'').toLowerCase().includes(q) ||
                        (a.status||'').toLowerCase().includes(q) ||
                        (a.priority||'').toLowerCase().includes(q)
                    );
                    renderRequestAppointments(state.requestAppointmentsFiltered);
                });
            }
            
            // Search for on hold appointments
            if (searchOnHoldAppointments) {
                searchOnHoldAppointments.addEventListener('input', () => {
                    const q = searchOnHoldAppointments.value.toLowerCase();
                    state.onHoldAppointmentsFiltered = state.onHoldAppointments.filter(a =>
                        (a.ticketNumber||'').toLowerCase().includes(q) ||
                        (a.date||'').toLowerCase().includes(q) ||
                        (a.site||'').toLowerCase().includes(q) ||
                        (a.type||'').toLowerCase().includes(q) ||
                        (a.description||a.taskDescription||'').toLowerCase().includes(q) ||
                        (a.status||'').toLowerCase().includes(q) ||
                        (a.priority||'').toLowerCase().includes(q)
                    );
                    renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
                });
            }

            // Search for approved appointments
            if (searchApprovedAppointments) {
                searchApprovedAppointments.addEventListener('input', () => {
                    const q = searchApprovedAppointments.value.toLowerCase();
                    state.approvedAppointmentsFiltered = state.approvedAppointments.filter(a =>
                        (a.ticketNumber||'').toLowerCase().includes(q) ||
                        (a.date||'').toLowerCase().includes(q) ||
                        (a.site||'').toLowerCase().includes(q) ||
                        (a.type||'').toLowerCase().includes(q) ||
                        (a.description||a.taskDescription||'').toLowerCase().includes(q) ||
                        (a.status||'').toLowerCase().includes(q) ||
                        (a.priority||'').toLowerCase().includes(q)
                    );
                    renderApprovedAppointments(state.approvedAppointmentsFiltered);
                });
            }

            // Search for rejected appointments
            if (searchRejectedAppointments) {
                searchRejectedAppointments.addEventListener('input', () => {
                    const q = searchRejectedAppointments.value.toLowerCase();
                    state.rejectedAppointmentsFiltered = state.rejectedAppointments.filter(a =>
                        (a.ticketNumber||'').toLowerCase().includes(q) ||
                        (a.date||'').toLowerCase().includes(q) ||
                        (a.site||'').toLowerCase().includes(q) ||
                        (a.type||'').toLowerCase().includes(q) ||
                        (a.description||a.taskDescription||'').toLowerCase().includes(q) ||
                        (a.status||'').toLowerCase().includes(q) ||
                        (a.priority||'').toLowerCase().includes(q)
                    );
                    renderRejectedAppointments(state.rejectedAppointmentsFiltered);
                });
            }
            
            // Handle requests table clicks
            if (requestsTable) {
                requestsTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');
                    
                    if (target.hasAttribute('data-approve')) {
                        // Approve button clicked
                        await setStatus(id, 'approved');
                    }
                });
            }
            
            // Handle approved table clicks
            if (approvedTable) {
                approvedTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');
                    
                    if (target.hasAttribute('data-delete')) {
                        // Delete button clicked
                        if (confirm('Are you sure you want to delete this account?')) {
                            await deleteEmployee(id);
                        }
                    }
                });
            }
            
            // Handle request appointments table clicks
            if (requestAppointmentsTable) {
                requestAppointmentsTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');
                    
                    if (target.hasAttribute('data-process-appointment')) {
                        // Process appointment button clicked -> move to On Hold
                        await setAppointmentStatus(id, 'on hold');
                    } else if (target.hasAttribute('data-reject-appointment')) {
                        // Reject appointment button clicked -> set status to rejected
                        if (confirm('Reject this appointment request?')) {
                            await setAppointmentStatus(id, 'rejected');
                        }
                    }
                });
            }
            
            // Handle on hold appointments table clicks
            if (onHoldAppointmentsTable) {
                onHoldAppointmentsTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');
                    
                    if (target.hasAttribute('data-assign-appointment')) {
                        // Assign appointment button clicked
                        openAssignmentForm(id);
                    } else if (target.hasAttribute('data-approve-appointment')) {
                        // Approve appointment button clicked
                        await setAppointmentStatus(id, 'approved');
                    }
                });
            }

            // Handle approved appointments table clicks
            if (approvedAppointmentsTable) {
                approvedAppointmentsTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');
                    
                    if (target.hasAttribute('data-view-appointment')) {
                        // View details button clicked
                        viewTicketDetails(id);
                    } else if (target.hasAttribute('data-delete-appointment')) {
                        // Delete appointment button clicked
                        if (confirm('Are you sure you want to delete this appointment?')) {
                            await deleteAppointment(id);
                        }
                    }
                });
            }

            // Handle rejected appointments table clicks
            if (rejectedAppointmentsTable) {
                rejectedAppointmentsTable.addEventListener('click', async (e) => {
                    const target = e.target;
                    const row = target.closest('tr[data-id]');
                    if (!row) return;
                    const id = row.getAttribute('data-id');

                    if (target.hasAttribute('data-delete-appointment')) {
                        if (confirm('Are you sure you want to delete this appointment?')) {
                            await deleteAppointment(id);
                        }
                    }
                });
            }
        }

        // Dashboard functionality
        function updateDashboardStats() {
            const totalTickets = state.tickets ? state.tickets.length : 0;
            const pendingApprovals = state.requests.length;
            const rejectedTasks = state.rejectedAppointments ? state.rejectedAppointments.length : 0;
            
            const totalEl = document.getElementById('totalTickets');
            if (totalEl) totalEl.textContent = totalTickets;
            const pendingEl = document.getElementById('pendingApprovals');
            if (pendingEl) pendingEl.textContent = pendingApprovals;
            const rejectedEl = document.getElementById('rejectedTasks');
            if (rejectedEl) rejectedEl.textContent = rejectedTasks;
        }

        // Notifications functionality
        function renderNotifications() {
            const container = document.getElementById('notificationsContainer');
            if (!container) return;

            // Create notifications for pending account requests
            const notifications = state.requests.map((acc, index) => {
                const givenName = acc.firstName || acc.givenName || 'Unknown';
                const lastName = acc.lastName || '';
                const companyName = acc.companyName || 'Unknown Company';
                
                // Handle Firestore timestamp properly
                let createdAt;
                if (acc.createdAt) {
                    // If it's a Firestore timestamp, convert to Date
                    if (acc.createdAt.toDate) {
                        createdAt = acc.createdAt.toDate();
                    } else if (acc.createdAt.seconds) {
                        createdAt = new Date(acc.createdAt.seconds * 1000);
                    } else {
                        createdAt = new Date(acc.createdAt);
                    }
                } else {
                    // Fallback to recent date
                    createdAt = new Date(Date.now() - Math.random() * 86400000);
                }
                
                const timeAgo = getTimeAgo(createdAt);
                
                return `
                    <div class="notification-card">
                        <div class="notification-header">
                            <div class="notification-title">New Account Request</div>
                            <div class="notification-time">${timeAgo}</div>
                        </div>
                        <div class="notification-content">
                            <strong>${givenName} ${lastName}</strong> from <strong>${companyName}</strong> has requested an account.
                        </div>
                        <div class="notification-actions">
                            <button class="notification-btn" onclick="viewAccount('${acc.__id}')">View Details</button>
                        </div>
                    </div>
                `;
            });

            if (notifications.length === 0) {
                container.innerHTML = '<div class="no-notifications">No new notifications</div>';
            } else {
                container.innerHTML = notifications.join('');
            }
        }

        function getEngineerDisplay(appointment) {
            // Show check if ticket itself is approved
            const ticketStatus = (appointment.status || '').toString().toLowerCase();
            if (ticketStatus === 'approved') {
                return '✅';
            }
            // Otherwise use engineerStatus mapping
            const statusRaw = (appointment.engineerStatus || 'processing').toString().toLowerCase();
            if (statusRaw === 'declined' || statusRaw === 'rejected' || statusRaw === 'not accepted') {
                return '❌';
            }
            if (statusRaw === 'accepted' || statusRaw === 'ok' || statusRaw === 'confirmed') {
                return '✅';
            }
            return '⏳';
        }

        function getTimeAgo(date) {
            const now = new Date();
            
            // If no date provided or invalid date, return "Recently"
            if (!date || isNaN(new Date(date).getTime())) {
                return 'Recently';
            }
            
            const targetDate = new Date(date);
            const diffInSeconds = Math.floor((now - targetDate) / 1000);
            
            // Handle negative differences (future dates)
            if (diffInSeconds < 0) return 'Just now';
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
            return 'Recently';
        }

        function viewAccount(accountId) {
            // Switch to accounts view and highlight the account
            const accountsLink = document.querySelector('[data-view="accounts"]');
            if (accountsLink) {
                accountsLink.click();
            }
        }

        // Assignment form functions
        async function openAssignmentForm(appointmentId) {
            const modal = document.getElementById('assignmentModal');
            if (modal) {
                // Find the appointment data
                const appointment = state.appointments.find(apt => apt.__id === appointmentId);
                if (appointment) {
                    // Populate form with actual appointment data
                    document.getElementById('assignmentTicket').value = appointment.ticketNumber || appointment.appointmentId || 'TKT-' + appointment.__id;
                    document.getElementById('assignmentUrgency').value = appointment.priority || appointment.urgency || 'High';
                    document.getElementById('assignmentTitle').value = 'Task Assignment';
                    // Set date and time for assignment (editable fields)
                    // Convert appointment date to proper format for date input
                    let assignmentDate = '';
                    let assignmentTime = '';
                    
                    if (appointment.date) {
                        // Try to parse the date and format it for date input (YYYY-MM-DD)
                        const dateObj = new Date(appointment.date);
                        if (!isNaN(dateObj.getTime())) {
                            assignmentDate = dateObj.toISOString().split('T')[0];
                        } else {
                            // If date is in string format, try to extract date part
                            const dateMatch = appointment.date.match(/(\d{4}-\d{2}-\d{2})/);
                            if (dateMatch) {
                                assignmentDate = dateMatch[1];
                            }
                        }
                    }
                    
                    if (appointment.time) {
                        // Try to parse the time and format it for time input (HH:MM)
                        const timeMatch = appointment.time.match(/(\d{1,2}):(\d{2})/);
                        if (timeMatch) {
                            assignmentTime = appointment.time;
                        }
                    }
                    
                    // Set default values if not found
                    if (!assignmentDate) {
                        // Set to today's date as default
                        assignmentDate = new Date().toISOString().split('T')[0];
                    }
                    if (!assignmentTime) {
                        // Set to 9:00 AM as default
                        assignmentTime = '09:00';
                    }
                    
                    document.getElementById('assignmentDate').value = assignmentDate;
                    document.getElementById('assignmentTime').value = assignmentTime;
                    document.getElementById('assignmentSiteName').value = appointment.site || 'N/A';
                    
                    // Get contact details from the appointment sender (user who created the appointment)
                    // Debug: Log the appointment data to see what fields are available
                    console.log('Appointment data:', appointment);
                    
                    // Try to get user details from the companies collection based on userEmail
                    let fullName = 'N/A';
                    let contactNumber = 'N/A';
                    
                    if (appointment.userEmail) {
                        try {
                            // Look up user details from companies collection
                            const userQuery = query(collection(db, 'companies'), where('companyEmail', '==', appointment.userEmail));
                            const userSnap = await getDocs(userQuery);
                            
                            if (!userSnap.empty) {
                                const userData = userSnap.docs[0].data();
                                console.log('User data from companies:', userData);
                                
                                // Get name from user data
                                const firstName = userData.firstName || userData.givenName || '';
                                const lastName = userData.lastName || '';
                                const middleName = userData.middleName || '';
                                
                                if (firstName && lastName) {
                                    fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
                                } else if (userData.companyName) {
                                    fullName = userData.companyName;
                                } else {
                                    // Extract name from email if it's in format "name@domain.com"
                                    const emailName = appointment.userEmail.split('@')[0];
                                    fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                                }
                                
                                // Get phone from user data
                                contactNumber = userData.phoneNumber || userData.phone || userData.userPhone || 'N/A';
                            } else {
                                // Fallback to appointment data or email extraction
                                const firstName = appointment.firstName || appointment.givenName || appointment.userFirstName || '';
                                const lastName = appointment.lastName || appointment.userLastName || '';
                                const middleName = appointment.middleName || appointment.userMiddleName || '';
                                
                                if (firstName && lastName) {
                                    fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
                                } else if (appointment.userName) {
                                    fullName = appointment.userName;
                                } else if (appointment.companyName) {
                                    fullName = appointment.companyName;
                                } else {
                                    // Extract name from email if it's in format "name@domain.com"
                                    const emailName = appointment.userEmail.split('@')[0];
                                    fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                                }
                                
                                contactNumber = appointment.userPhone || appointment.phoneNumber || appointment.phone || appointment.userPhoneNumber || 'N/A';
                            }
                        } catch (error) {
                            console.error('Error fetching user data:', error);
                            // Fallback to appointment data
                            const firstName = appointment.firstName || appointment.givenName || appointment.userFirstName || '';
                            const lastName = appointment.lastName || appointment.userLastName || '';
                            const middleName = appointment.middleName || appointment.userMiddleName || '';
                            
                            if (firstName && lastName) {
                                fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
                            } else if (appointment.userName) {
                                fullName = appointment.userName;
                            } else if (appointment.companyName) {
                                fullName = appointment.companyName;
                            } else {
                                // Extract name from email if it's in format "name@domain.com"
                                const emailName = appointment.userEmail.split('@')[0];
                                fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                            }
                            
                            contactNumber = appointment.userPhone || appointment.phoneNumber || appointment.phone || appointment.userPhoneNumber || 'N/A';
                        }
                    }
                    
                    document.getElementById('assignmentContactPerson').value = fullName;
                    document.getElementById('assignmentContactNumber').value = contactNumber;
                    document.getElementById('assignmentDetails').value = appointment.description || appointment.taskDescription || 'N/A';
                    
                    // Clear engineer field for new selection
                    document.getElementById('assignmentEngineer').value = '';
                }
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }

        function closeAssignmentForm() {
            const modal = document.getElementById('assignmentModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto'; // Restore scrolling
            }
        }

        // Make closeAssignmentForm globally accessible
        window.closeAssignmentForm = closeAssignmentForm;

        // Handle assignment form submission
        function handleAssignmentFormSubmit(e) {
            e.preventDefault();
            
            const formData = {
                ticketNumber: document.getElementById('assignmentTicket').value,
                urgency: document.getElementById('assignmentUrgency').value,
                title: document.getElementById('assignmentTitle').value,
                date: document.getElementById('assignmentDate').value,
                time: document.getElementById('assignmentTime').value,
                engineer: document.getElementById('assignmentEngineer').value,
                siteName: document.getElementById('assignmentSiteName').value,
                contactPerson: document.getElementById('assignmentContactPerson').value,
                contactNumber: document.getElementById('assignmentContactNumber').value,
                details: document.getElementById('assignmentDetails').value,
                engineerStatus: 'processing'
            };
            
            // Validate required fields
            if (!formData.engineer) {
                alert('Please select an engineer');
                return;
            }
            
            // Save assignment to selected appointment in Firebase and local state
            try {
                // Find appointment by ticket number
                const appointment = (state.appointments || []).find(a => (a.ticketNumber || a.appointmentId) === formData.ticketNumber);
                if (appointment) {
                    const appointmentId = appointment.__id;
                    const ref = doc(db, 'appointments', appointmentId);
                    // Persist engineer assignment and status, and mark assignedOnce to hide re-assign button
                    updateDoc(ref, { engineer: formData.engineer, engineerStatus: formData.engineerStatus, assignedOnce: true });
                    // Update local state mirrors
                    appointment.engineer = formData.engineer;
                    appointment.engineerStatus = formData.engineerStatus;
                    appointment.assignedOnce = true;
                    // Re-render tables to reflect changes
                    renderRequestAppointments(state.requestAppointmentsFiltered);
                    renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
                    renderApprovedAppointments(state.approvedAppointmentsFiltered);
                }
                alert('Assignment saved successfully!');
            } catch (err) {
                console.error('Error saving assignment:', err);
                alert('Failed to save assignment. Please try again.');
            }
            
            // Close the form
            closeAssignmentForm();
        }

        // Ticket functionality
        async function loadAppointments() {
            try {
                const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                const appointments = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    // Generate ticket number if not present
                    if (!data.ticketNumber) {
                        data.ticketNumber = generateTicketNumber(appointments.length + 1);
                    }
                    appointments.push({ __id: doc.id, ...data });
                });
                state.tickets = appointments;
                state.appointments = appointments;
                
                // Separate into request, on hold, and approved appointments
                state.requestAppointments = appointments.filter(a => !['approved','on hold','rejected'].includes((a.status || 'pending').toLowerCase()));
                state.onHoldAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'on hold');
                state.approvedAppointments = appointments.filter(a => (a.status || 'pending').toLowerCase() === 'approved');
                state.rejectedAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'rejected');
                state.requestAppointmentsFiltered = state.requestAppointments.slice();
                state.onHoldAppointmentsFiltered = state.onHoldAppointments.slice();
                state.approvedAppointmentsFiltered = state.approvedAppointments.slice();
                state.rejectedAppointmentsFiltered = state.rejectedAppointments.slice();
                
                renderAppointments(appointments);
                renderRequestAppointments(state.requestAppointmentsFiltered);
                renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
                renderApprovedAppointments(state.approvedAppointmentsFiltered);
                renderRejectedAppointments(state.rejectedAppointmentsFiltered);
                updateDashboardStats();
            } catch (error) {
                console.error('Error loading appointments:', error);
                // Show sample data if Firebase fails
                const sampleTickets = getSampleAppointments();
                state.tickets = sampleTickets;
                state.appointments = sampleTickets;
                state.requestAppointments = sampleTickets.filter(a => !['approved','on hold','rejected'].includes((a.status || 'pending').toLowerCase()));
                state.onHoldAppointments = sampleTickets.filter(a => (a.status || '').toLowerCase() === 'on hold');
                state.approvedAppointments = sampleTickets.filter(a => (a.status || 'pending').toLowerCase() === 'approved');
                state.rejectedAppointments = sampleTickets.filter(a => (a.status || '').toLowerCase() === 'rejected');
                state.requestAppointmentsFiltered = state.requestAppointments.slice();
                state.onHoldAppointmentsFiltered = state.onHoldAppointments.slice();
                state.approvedAppointmentsFiltered = state.approvedAppointments.slice();
                state.rejectedAppointmentsFiltered = state.rejectedAppointments.slice();
                
                renderAppointments(sampleTickets);
                renderRequestAppointments(state.requestAppointmentsFiltered);
                renderOnHoldAppointments(state.onHoldAppointmentsFiltered);
                renderApprovedAppointments(state.approvedAppointmentsFiltered);
                renderRejectedAppointments(state.rejectedAppointmentsFiltered);
                updateDashboardStats();
            }
        }

        function getSampleAppointments() {
            return [
                {
                    __id: '1',
                    ticketNumber: generateTicketNumber(1),
                    date: 'June 20, 2025 - 9:54 AM',
                    site: 'NU-TWR-08',
                    description: 'There is a problem at the site, so we need fiber-optic installation to fix the issue...',
                    status: 'Pending',
                    priority: 'Critical',
                    assignedTo: 'View'
                },
                {
                    __id: '2',
                    ticketNumber: generateTicketNumber(2),
                    date: 'June 20, 2025 - 8:04 AM',
                    site: 'Wireworks Supply CO.',
                    description: 'Transport tools to field engineer',
                    status: 'Assigned',
                    priority: 'Low',
                    assignedTo: 'R.Apalla'
                },
                {
                    __id: '3',
                    ticketNumber: generateTicketNumber(3),
                    date: 'June 20, 2025 - 8:30 AM',
                    site: 'CAV-TWR-03',
                    description: 'Pick up faulty power supply unit',
                    status: 'In Progress',
                    priority: 'Medium',
                    assignedTo: 'D.Raldo'
                }
            ];
        }

        function generateTicketNumber(sequence) {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const sequenceStr = sequence.toString().padStart(3, '0');
            return `TKT-${year}${month}${day}-${sequenceStr}`;
        }

        function renderAppointments(appointments) {
            const tbody = document.getElementById('appointmentBody');
            if (!tbody) return;

            tbody.innerHTML = appointments.map(apt => {
                const priorityClass = getPriorityClass(apt.priority);
                const statusClass = getStatusClass(apt.status);
                
                return `
<tr data-id="${apt.__id}">
  <td>${apt.ticketNumber || apt.appointmentId || 'TKT-' + apt.__id}</td>
  <td>${apt.date || 'N/A'}</td>
  <td>${apt.site || 'N/A'}</td>
  <td>${apt.description || apt.taskDescription || 'N/A'}</td>
  <td><span class="${statusClass}">${apt.status || 'Pending'}</span></td>
  <td><span class="${priorityClass}">${apt.priority || 'Low'}</span></td>
  <td>
    ${apt.assignedTo === 'View' ? 
      '<button class="view-details-btn" onclick="viewTicketDetails(\'' + apt.__id + '\')">View</button>' : 
      apt.assignedTo || 'N/A'
    }
  </td>
</tr>`;
            }).join('');
        }

        function getPriorityClass(priority) {
            switch(priority?.toLowerCase()) {
                case 'critical': return 'priority-critical';
                case 'high': return 'priority-critical';
                case 'medium': return 'priority-medium';
                case 'low': return 'priority-low';
                default: return 'priority-low';
            }
        }

        function getStatusClass(status) {
            switch(status?.toLowerCase()) {
                case 'pending': return 'status-pending';
                case 'assigned': return 'status-assigned';
                case 'in progress': return 'status-progress';
                case 'completed': return 'status-assigned';
                case 'approved': return 'status-assigned';
                case 'on hold': return 'status-pending';
                case 'rejected': return 'status-pending';
                default: return 'status-pending';
            }
        }

        function viewTicketDetails(ticketId) {
            const modal = document.getElementById('detailsModal');
            if (!modal) { alert('Details modal not found.'); return; }
            const ticket = (state.appointments || []).find(t => t.__id === ticketId);
            if (!ticket) { alert('Ticket not found.'); return; }

            // Populate fields
            const get = (id) => document.getElementById(id);
            const safe = (v, fb='N/A') => (v === undefined || v === null || v === '') ? fb : v;

            get('detailTicket').textContent = safe(ticket.ticketNumber || ticket.appointmentId || ('TKT-' + ticket.__id));
            get('detailDate').textContent = safe(ticket.date);
            get('detailSite').textContent = safe(ticket.site);
            get('detailType').textContent = safe(ticket.type);
            get('detailDescription').textContent = safe(ticket.description || ticket.taskDescription);
            get('detailStatus').textContent = safe(ticket.status || 'Approved');
            get('detailPriority').textContent = safe(ticket.priority || 'Low');
            get('detailEngineer').textContent = safe(ticket.engineer || getEngineerDisplay(ticket));
            get('detailEmail').textContent = safe(ticket.userEmail);

            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeDetailsModal() {
            const modal = document.getElementById('detailsModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }

        // Expose for inline handlers
        window.closeDetailsModal = closeDetailsModal;

        // Calendar functionality
        let currentDate = new Date();
        
        function updateCalendar() {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            
            // Update calendar title
            document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;
            
            // Generate calendar grid
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();
            
            let calendarHTML = `
                <div class="calendar-day">S</div>
                <div class="calendar-day">M</div>
                <div class="calendar-day">T</div>
                <div class="calendar-day">W</div>
                <div class="calendar-day">TH</div>
                <div class="calendar-day">F</div>
                <div class="calendar-day">S</div>
            `;
            
            // Add empty cells for days before the first day of the month
            for (let i = 0; i < startingDayOfWeek; i++) {
                calendarHTML += '<div class="calendar-date"></div>';
            }
            
            // Add days of the month
            const today = new Date();
            for (let day = 1; day <= daysInMonth; day++) {
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const selectedClass = isToday ? 'selected' : '';
                calendarHTML += `<div class="calendar-date ${selectedClass}">${day}</div>`;
            }
            
            document.getElementById('calendarGrid').innerHTML = calendarHTML;
        }

        function initCalendar() {
            updateCalendar();
            
            document.getElementById('prevMonth').addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() - 1);
                updateCalendar();
            });
            
            document.getElementById('nextMonth').addEventListener('click', () => {
                currentDate.setMonth(currentDate.getMonth() + 1);
                updateCalendar();
            });
        }

        // Navigation functionality
        function initNavigation() {
            const navLinks = document.querySelectorAll('.nav-link');
            const viewSections = document.querySelectorAll('.view-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    // Remove active class from all nav links
                    navLinks.forEach(nav => nav.classList.remove('active'));
                    
                    // Add active class to clicked link
                    link.classList.add('active');
                    
                    // Hide all view sections
                    viewSections.forEach(section => section.classList.remove('active'));
                    
                    // Show selected view
                    const viewName = link.getAttribute('data-view');
                    const targetView = document.getElementById(viewName + '-view');
                    if (targetView) {
                        targetView.classList.add('active');
                    }
                });
            });
        }

        // Standalone: load dashboard without client login
        (async function(){
            await loadAccounts();
            await loadAppointments();
            wireEvents();
            initNavigation();
            initCalendar();
            
            // Add assignment form event listener
            const assignmentForm = document.getElementById('assignmentForm');
            if (assignmentForm) {
                assignmentForm.addEventListener('submit', handleAssignmentFormSubmit);
            }
        })();
    </script>
</head>
<body>
	<div class="layout">
		<aside class="sidebar">
			<div class="userbox">
				<img class="avatar" src="profile.jpg" alt="Profile">
				<div class="username">Michael Broncano</div>
			</div>
			<nav>
				<ul class="navlist">
					<li><a class="nav-link active" data-view="dashboard" href="#"><span class="nav-icon">📊</span>Dashboard</a></li>
					<li><a class="nav-link" data-view="accounts" href="#"><span class="nav-icon">👥</span>Accounts</a></li>
					<li><a class="nav-link" data-view="notifications" href="#"><span class="nav-icon">🔔</span>Notifications</a></li>
					<li><a class="nav-link" data-view="appointments" href="#"><span class="nav-icon">📅</span>Appointments</a></li>
				</ul>
			</nav>
			<div class="sidebar-footer">
				<a class="logout" href="pm_login.html"><span class="nav-icon">↗</span>Logout</a>
			</div>
		</aside>
		<div>
			<div class="topbar">
				<div class="welcome-text">Welcome, Michael!</div>
				<div class="finsi-logo">
					<img src="finsi.png" alt="FINSI Logo" class="logo-image">
				</div>
			</div>
			<div class="content">
				<!-- Dashboard View -->
				<div id="dashboard-view" class="view-section active">
					<div class="dashboard-grid">
						<div class="dashboard-overview">
							<h2 class="overview-title">Dashboard Overview</h2>
						<div class="stats-grid">
							<div class="stat-card">
								<div class="stat-icon">🎫</div>
								<div class="stat-number" id="totalTickets">0</div>
								<div class="stat-label">Total Tickets</div>
							</div>
							<div class="stat-card">
								<div class="stat-icon">⏰</div>
								<div class="stat-number" id="pendingApprovals">0</div>
								<div class="stat-label">Pending Approvals</div>
							</div>
							<div class="stat-card">
								<div class="stat-icon">🚫</div>
								<div class="stat-number" id="rejectedTasks">0</div>
								<div class="stat-label">Rejected Tasks</div>
							</div>
                        
						</div>
						</div>
						
						<!-- Calendar Widget -->
						<div class="calendar-widget">
							<div class="calendar-header">
								<h3 class="calendar-title" id="calendarTitle">December 2024</h3>
								<div class="calendar-nav">
									<button class="calendar-nav-btn" id="prevMonth">‹</button>
									<button class="calendar-nav-btn" id="nextMonth">›</button>
								</div>
							</div>
							<div class="calendar-grid" id="calendarGrid">
								<!-- Calendar will be generated by JavaScript -->
							</div>
						</div>
					</div>

						<!-- Bottom Grid removed per request -->
				</div>

				<!-- Accounts View -->
				<div id="accounts-view" class="view-section">
					<!-- Account Requests Section -->
					<div class="card">
						<div class="card-header">
							<h2 class="card-title">Account Requests</h2>
						</div>
						<div class="searchbar">
							<input id="searchRequests" type="text" placeholder="Search pending requests by name, email, phone, or company">
						</div>
						<table class="table" id="requestsTable">
							<thead>
								<tr>
									<th>ID</th>
									<th>Given Name</th>
									<th>Middle Name</th>
									<th>Last Name</th>
									<th>Phone Number</th>
									<th>Email Address</th>
									<th>Company</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody id="requestsBody"></tbody>
						</table>
					</div>
					
					<div style="height:20px"></div>
					
					<!-- Approved Accounts Section -->
					<div class="card">
						<div class="card-header">
							<h2 class="card-title">Approved Accounts</h2>
						</div>
						<div class="searchbar">
							<input id="searchApproved" type="text" placeholder="Search approved accounts by name, email, phone, or company">
						</div>
						<table class="table" id="approvedTable">
							<thead>
								<tr>
									<th>ID</th>
									<th>Given Name</th>
									<th>Middle Name</th>
									<th>Last Name</th>
									<th>Phone Number</th>
									<th>Email Address</th>
									<th>Company</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody id="approvedBody"></tbody>
						</table>
					</div>
				</div>

				<!-- Notifications View -->
				<div id="notifications-view" class="view-section">
					<div class="card">
						<div class="card-header">
							<h2 class="card-title">Notifications</h2>
						</div>
						<div style="padding:20px;">
							<div id="notificationsContainer">
								<!-- Notifications will be loaded here -->
							</div>
						</div>
					</div>
				</div>

				<!-- Appointments View -->
				<div id="appointments-view" class="view-section">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Request Appointments</h2>
                    </div>
                    <div class="searchbar">
                        <input id="searchRequestAppointments" type="text" placeholder="Search request appointments by ticket, date, site, or description">
                    </div>
                    <table class="table" id="requestAppointmentsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ticket</th>
                                <th>Date/Time</th>
                                <th>Site</th>
                                <th>Type of Appointment</th>
                                <th>Task Description/Issue</th>
                                <th>Status</th>
                                <th>Priority Level</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="requestAppointmentsBody"></tbody>
                    </table>
                </div>

                <div style="height:20px"></div>
                
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">On Hold Appointments</h2>
                    </div>
                    <div class="searchbar">
                        <input id="searchOnHoldAppointments" type="text" placeholder="Search on hold appointments by ticket, date, site, or description">
                    </div>
                    <table class="table" id="onHoldAppointmentsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ticket</th>
                                <th>Date/Time</th>
                                <th>Site</th>
                                <th>Type of Appointment</th>
                                <th>Task Description/Issue</th>
                                <th>Status</th>
                                <th>Priority Level</th>
                                <th>Engineer</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="onHoldAppointmentsBody"></tbody>
                    </table>
                </div>
                
                <div style="height:20px"></div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Approved Appointments</h2>
                    </div>
                    <div class="searchbar">
                        <input id="searchApprovedAppointments" type="text" placeholder="Search approved appointments by ticket, date, site, or description">
                    </div>
                    <table class="table" id="approvedAppointmentsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ticket</th>
                                <th>Date/Time</th>
                                <th>Site</th>
                                <th>Type of Appointment</th>
                                <th>Task Description/Issue</th>
                                <th>Status</th>
                                <th>Priority Level</th>
                                <th>Engineer</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="approvedAppointmentsBody"></tbody>
                    </table>
                </div>
                
                <div style="height:20px"></div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Rejected Appointments</h2>
                    </div>
                    <div class="searchbar">
                        <input id="searchRejectedAppointments" type="text" placeholder="Search rejected appointments by ticket, date, site, or description">
                    </div>
                    <table class="table" id="rejectedAppointmentsTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Ticket</th>
                                <th>Date/Time</th>
                                <th>Site</th>
                                <th>Type of Appointment</th>
                                <th>Task Description/Issue</th>
                                <th>Status</th>
                                <th>Priority Level</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="rejectedAppointmentsBody"></tbody>
                    </table>
                </div>
            </div>

				
			</div>
		</div>
	</div>

	<!-- Assignment Form Modal -->
	<div id="assignmentModal" class="modal-overlay" onclick="closeAssignmentForm()">
		<div class="assignment-modal-card" onclick="event.stopPropagation()">
			<div class="assignment-modal-header">
				<div class="assignment-modal-title">
					<span class="assignment-icon">✏️</span>
					<h3>Assign Task</h3>
				</div>
				<button type="button" class="assignment-close-btn" onclick="closeAssignmentForm()">×</button>
			</div>
			<div class="assignment-modal-body">
				<form id="assignmentForm">
					<div class="assignment-form-field">
						<label class="assignment-label">Ticket Number</label>
						<input type="text" class="assignment-input assignment-readonly" id="assignmentTicket" readonly>
					</div>
					
					<div class="assignment-form-row">
						<div class="assignment-form-field">
							<label class="assignment-label">Urgency</label>
							<input type="text" class="assignment-input assignment-readonly" id="assignmentUrgency" readonly>
						</div>
						<div class="assignment-form-field">
							<label class="assignment-label">Title</label>
							<input type="text" class="assignment-input" id="assignmentTitle">
						</div>
					</div>
					
					<div class="assignment-form-row">
						<div class="assignment-form-field">
							<label class="assignment-label">Date</label>
							<input type="date" class="assignment-input" id="assignmentDate">
						</div>
						<div class="assignment-form-field">
							<label class="assignment-label">Time</label>
							<input type="time" class="assignment-input" id="assignmentTime">
						</div>
					</div>
					
					<div class="assignment-form-field">
						<label class="assignment-label">Engineer</label>
						<div class="assignment-input-with-icon">
							<input type="text" class="assignment-input" id="assignmentEngineer" placeholder="Select Engineer">
							<span class="assignment-input-icon">▼</span>
						</div>
					</div>
					
					<div class="assignment-form-field">
						<label class="assignment-label">Site Name</label>
						<input type="text" class="assignment-input assignment-readonly" id="assignmentSiteName" readonly>
					</div>
					
					<div class="assignment-form-row">
						<div class="assignment-form-field">
							<label class="assignment-label">Contact Person</label>
							<input type="text" class="assignment-input assignment-readonly" id="assignmentContactPerson" readonly>
						</div>
						<div class="assignment-form-field">
							<label class="assignment-label">Contact Number</label>
							<input type="text" class="assignment-input assignment-readonly" id="assignmentContactNumber" readonly>
						</div>
					</div>
					
					<div class="assignment-form-field">
						<label class="assignment-label">Details</label>
						<textarea class="assignment-textarea assignment-readonly" id="assignmentDetails" rows="8" readonly></textarea>
					</div>
					
					<div class="assignment-form-actions">
						<button type="button" class="assignment-btn assignment-btn-cancel" onclick="closeAssignmentForm()">Cancel</button>
						<button type="submit" class="assignment-btn assignment-btn-assign">Assign</button>
					</div>
				</form>
			</div>
		</div>
	</div>

	<!-- Ticket Details Modal -->
	<div id="detailsModal" onclick="closeDetailsModal()">
		<div class="details-modal-card" onclick="event.stopPropagation()">
			<div class="details-modal-header">
				<h3 class="details-modal-title">Ticket Details</h3>
				<button type="button" class="details-close-btn" onclick="closeDetailsModal()">×</button>
			</div>
			<div class="details-modal-body">
				<div class="details-grid">
					<div>
						<div class="details-label">Ticket</div>
						<div class="details-value" id="detailTicket">—</div>
					</div>
					<div>
						<div class="details-label">Status</div>
						<div class="details-value" id="detailStatus">—</div>
					</div>
					<div>
						<div class="details-label">Date</div>
						<div class="details-value" id="detailDate">—</div>
					</div>
					<div>
						<div class="details-label">Site</div>
						<div class="details-value" id="detailSite">—</div>
					</div>
					<div>
						<div class="details-label">Type</div>
						<div class="details-value" id="detailType">—</div>
					</div>
					<div>
						<div class="details-label">Priority</div>
						<div class="details-value" id="detailPriority">—</div>
					</div>
					<div>
						<div class="details-label">Engineer</div>
						<div class="details-value" id="detailEngineer">—</div>
					</div>
					<div style="grid-column:1 / -1;">
						<div class="details-label">Task Description / Issue</div>
						<div class="details-value" id="detailDescription">—</div>
					</div>
					<div>
						<div class="details-label">Email</div>
						<div class="details-value" id="detailEmail">—</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>


