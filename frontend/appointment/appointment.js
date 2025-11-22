let currentUser = null;
let userProfile = null;

function toggleMenu() {
    var menu = document.getElementById('menu');
    menu.classList.toggle('open');
}

async function logout() {
    if (typeof supabaseClient !== 'undefined') {
        await supabaseClient.auth.signOut();
    }
    window.location.href = '../landingpage/landingpage.html#home';
}

async function checkUserSession() {
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not ready');
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) {
        console.log('No session found, redirecting to login.');
        window.location.href = '../login/login.html';
        return;
    }

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await supabaseClient
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

    const label = document.getElementById('welcomeLabel');
    if (label && userProfile) {
        // Consistent "Welcome, Name" format
        const name = `${userProfile.firstName || ''} ${userProfile.surname || ''}`.trim() || userProfile.email;
        label.textContent = 'Welcome, ' + name;
    }

    var badge = document.querySelector('.profile-btn .badge');
    if (badge) {
        badge.textContent = 'Approved';
        badge.classList.remove('pending');
        badge.classList.add('approved');
    }

    var statusLink = document.getElementById('statusLink');
    if (statusLink) {
        statusLink.classList.remove('disabled-link');
    }

    initCalendar();
}

document.addEventListener('DOMContentLoaded', function(){
    window.showModal = function(title, message, actions){
        var overlay = document.querySelector('.modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        if (!overlay.querySelector('.modal-card')) {
            overlay.innerHTML = '\n<div class="modal-card">\n  <div class="modal-header">\n    <h3 class="modal-title"></h3>\n    <button type="button" class="modal-close" data-modal-close>Close</button>\n  </div>\n  <div class="modal-body"></div>\n  <div class="modal-actions"></div>\n</div>\n';
        }
        // Ensure click handler is added only once
        if (!overlay.dataset.hasHandler) {
            overlay.addEventListener('click', function(e){
                if (e.target === overlay || e.target.hasAttribute('data-modal-close')) {
                    hideModal();
                }
            });
            overlay.dataset.hasHandler = "true";
        }
        var titleEl = overlay.querySelector('.modal-title');
        var bodyEl = overlay.querySelector('.modal-body');
        var actionsEl = overlay.querySelector('.modal-actions');
        if (titleEl) {
            titleEl.textContent = title || 'Notice';
        }
        if (bodyEl) {
            if (typeof message === 'string') {
                bodyEl.textContent = message || '';
            } else if (message instanceof Node) {
                bodyEl.innerHTML = '';
                bodyEl.appendChild(message);
            } else {
                bodyEl.textContent = '';
            }
        }
        if (actionsEl) {
            actionsEl.innerHTML = '';
            if (Array.isArray(actions) && actions.length) {
                actions.forEach(function(act){
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'modal-close';
                    btn.textContent = act && act.label ? act.label : 'OK';
                    if (act && act.primary) {
                        btn.style.background = 'var(--brand-600)';
                        btn.style.color = '#fff';
                        btn.style.borderColor = 'var(--brand-600)';
                    }
                    btn.addEventListener('click', function(){
                        try { if (act && typeof act.onClick === 'function') act.onClick(); } finally { hideModal(); }
                    });
                    actionsEl.appendChild(btn);
                });
            }
        }
        overlay.classList.add('show');
    };
    window.hideModal = function(){
        var overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.classList.remove('show');
    };

    var btn = document.getElementById('profileBtn');
    var menu = document.getElementById('profileMenu');
    if (btn && menu) {
        btn.addEventListener('click', function(){ menu.classList.toggle('open'); });
        document.addEventListener('click', function(e){ if (!menu.contains(e.target) && !btn.contains(e.target)) { menu.classList.remove('open'); } });
    }
    
    // Initialize session check
    checkUserSession();
});

const state = {
    current: new Date(),
    selected: null,
    unavailableSet: new Set(),
    dateSlots: new Map(), 
};

function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function monthLabel(d) {
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

async function loadAvailability() {
    if (!currentUser) return; 

    state.unavailableSet.clear();
    state.dateSlots.clear();
    
    const month = state.current.getMonth();
    const year = state.current.getFullYear();
    
    var grid = document.getElementById('calGrid');
    if (grid) grid.innerHTML = '<div class="cal-cell-loading">Loading slots...</div>';

    try {
        const response = await fetch(`http://localhost:3000/api/appointments/availability?month=${month}&year=${year}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch slot availability (${response.status})`);
        }
        
        const dailyCounts = await response.json(); 
        const totalSlotsPerDay = 5; 

        for (const date in dailyCounts) {
            const takenSlots = dailyCounts[date];
            const availableSlots = totalSlotsPerDay - takenSlots;
            
            state.dateSlots.set(date, {
                total: totalSlotsPerDay,
                taken: takenSlots,
                available: availableSlots
            });

            if (availableSlots <= 0) {
                state.unavailableSet.add(date);
            }
        }
        
        renderCalendar(); 

    } catch (error) {
        console.warn('Failed to load appointments:', error.message);
        if (grid) grid.innerHTML = `<div class="cal-cell-loading" style="color: red;">Error: ${error.message}</div>`;
    }
}

function renderCalendar() {
    var grid = document.getElementById('calGrid');
    var title = document.getElementById('calTitle');
    if (!grid || !title) return;
    grid.innerHTML = '';
    title.textContent = monthLabel(state.current);

    var year = state.current.getFullYear();
    var month = state.current.getMonth();
    var firstOfMonth = new Date(year, month, 1);
    var startDay = firstOfMonth.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();

    for (var i = 0; i < startDay; i++) {
        var dayNum = prevMonthDays - startDay + 1 + i;
        var cell = document.createElement('div');
        cell.className = 'cal-cell muted';
        cell.innerHTML = '<div class="cal-date">' + dayNum + '</div>';
        grid.appendChild(cell);
    }

    var today = new Date();
    today.setHours(0,0,0,0);
    var todayKey = formatDate(today);
    for (var d = 1; d <= daysInMonth; d++) {
        var cellDate = new Date(year, month, d);
        var key = formatDate(cellDate);
        var cell = document.createElement('div');
        var isPast = cellDate < today;
        var isUnavailable = isPast || state.unavailableSet.has(key);
        var classes = 'cal-cell' + (key === todayKey ? ' today' : '') + (state.selected === key ? ' selected' : '');
        cell.className = classes;
        
        var slots = state.dateSlots.get(key);
        var availableSlots = slots ? slots.available : 5;
        var totalSlots = slots ? slots.total : 5;
        
        var pill;
        if (isUnavailable) {
            if (isPast) {
                pill = '<span class="pill past">Not Available</span>';
            } else {
                pill = '<span class="pill full">Fully Booked</span>';
            }
        } else {
            if (availableSlots === totalSlots) {
                pill = '<span class="pill available">Available</span>';
            } else {
                pill = '<span class="pill available">' + availableSlots + '/' + totalSlots + ' slots</span>';
            }
        }
        
        cell.innerHTML = '<div class="cal-date">' + d + '</div>' + pill;
        if (!isUnavailable) {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', (function(k, el){ return function(){
                el.classList.add('pressed');
                setTimeout(function(){ el.classList.remove('pressed'); }, 160);
                state.selected = k;
                renderCalendar();
                try { var apptDate = document.getElementById('apptDate'); if (apptDate) apptDate.value = k; } catch (_) {}
            }})(key, cell));
        }
        grid.appendChild(cell);
    }
}

async function initCalendar() { 
    await loadAvailability(); 
}

document.getElementById('prevBtn').addEventListener('click', function(){
    state.current = new Date(state.current.getFullYear(), state.current.getMonth() - 1, 1);
    initCalendar(); 
});
document.getElementById('nextBtn').addEventListener('click', function(){
    state.current = new Date(state.current.getFullYear(), state.current.getMonth() + 1, 1);
    initCalendar(); 
});
document.getElementById('todayBtn').addEventListener('click', function(){
    state.current = new Date();
    state.current.setDate(1);
    initCalendar(); 
});


document.addEventListener('DOMContentLoaded', function() {
    const apptTypeSelect = document.getElementById('apptType');
    const customTypeField = document.getElementById('customTypeField');
    const customApptTypeInput = document.getElementById('customApptType');
    
    if (apptTypeSelect && customTypeField && customApptTypeInput) {
        apptTypeSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                customTypeField.style.display = 'block';
                customApptTypeInput.required = true;
            } else {
                customTypeField.style.display = 'none';
                customApptTypeInput.required = false;
                customApptTypeInput.value = '';
            }
        });
    }
});


var form = document.getElementById('appointmentForm');
if (form) {
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        
        var date = state.selected;
        var type = document.getElementById('apptType').value;
        var customType = document.getElementById('customApptType')?.value?.trim() || '';
        var urgency = (document.querySelector('input[name="urgency"]:checked')||{}).value || 'Low';
        var desc = document.getElementById('apptDesc').value.trim();
        var site = document.getElementById('apptSite')?.value || '';
        
        if (type === 'Other' && customType) {
            type = customType;
        }
        
        if (!currentUser || !currentUser.id) {
            showModal('Error', 'You are not logged in. Please log in again.');
            return;
        }
        
        var btn = this.querySelector('button[type="submit"]');
        var statusEl = document.getElementById('submitStatus');
        
        if (!date) {
            showModal('Select a date', 'Please choose a date from the calendar first.');
            if (statusEl) statusEl.textContent = 'Please select a date to continue.';
            return;
        }
        
        if (type === 'Other' && !customType) {
            showModal('Custom Type Required', 'Please specify the appointment type in the custom field.');
            if (statusEl) statusEl.textContent = 'Please specify the custom appointment type.';
            return;
        }

        const slotsCheck = state.dateSlots.get(date);
        if (slotsCheck && slotsCheck.available <= 0) {
            showModal('Fully Booked', 'All appointment slots for this date have been reserved. Please select a different date.');
            if (statusEl) statusEl.textContent = 'Selected date is fully booked. Please choose another date.';
            return;
        }

        var confirmEl = document.createElement('div');
        confirmEl.innerHTML = '<div style="line-height:1.7">' +
            '<div><strong>Date:</strong> ' + date + '</div>' +
            '<div><strong>Type:</strong> ' + type + '</div>' +
            '<div><strong>Urgency:</strong> ' + urgency + '</div>' +
            (desc ? '<div><strong>Description:</strong> ' + (desc.replace(/</g,'&lt;')) + '</div>' : '') +
            (site ? '<div><strong>Site:</strong> ' + (site.replace(/</g,'&lt;')) + '</div>' : '') +
        '</div>';

        function generateTicketNumber() {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const time = now.getTime().toString().slice(-4);
            return `TKT-${year}${month}${day}-${time}`;
        }

        async function performSubmission(){
            const ticketNumber = generateTicketNumber();
            
            if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }
            if (statusEl) { statusEl.style.color = '#0b1020'; statusEl.textContent = 'Submitting…'; }
            
            const newAppointment = {
                user_id: currentUser.id, 
                date: date,
                type_of_appointment: type,
                priority_level: urgency,
                task_description: desc,
                ticket_code: ticketNumber,
                site: site,
                status: 'Pending'
            };

            try {
                // Use supabaseClient
                const { data, error } = await supabaseClient
                    .from('appointment_records')
                    .insert(newAppointment)
                    .select();

                if (error) {
                    throw new Error(error.message);
                }

                await initCalendar(); 
                
                if (statusEl) { statusEl.style.color = '#059669'; statusEl.textContent = 'Saved! Ticket ' + ticketNumber + ' created for ' + date + '.'; }
                form.reset();
                state.selected = null;
                
                var successMsg = 'Your ticket ' + ticketNumber + ' has been created for ' + date + '. Your request is now waiting for approval.';
                showModal('Ticket Created Successfully', successMsg, [
                    { label: 'OK', primary: true, onClick: function(){ window.location.href = '../status/status.html'; } }
                ]);

            } catch (err) {
                console.error('Error:', err);
                showModal('Submission Failed', 'Could not save your appointment. Please try again. ' + err.message);
                if (statusEl) { statusEl.style.color = '#b91c1c'; statusEl.textContent = 'Failed to save appointment.'; }
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
            }
        }

        showModal('Confirm Submission', confirmEl, [
            { label: 'No', onClick: function(){ } },
            { label: 'Yes', primary: true, onClick: function(){ performSubmission(); } }
        ]);
    });
}