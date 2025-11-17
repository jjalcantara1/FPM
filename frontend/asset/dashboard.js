// Make client available globally
window.sbClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Supabase
    if (typeof supabase === 'undefined') {
        console.error("Supabase library not found.");
        return;
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase keys missing. Check ../static/supabaseClient.js");
        return;
    }
    window.sbClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // 2. Run Session Check
    await checkSession();
    setupLogout();
    setupSidebarToggle(); // Initialize sidebar toggle

    // 3. Helper: Check Session & Load Profile
    async function checkSession() {
        try {
            const { data: { session }, error } = await window.sbClient.auth.getSession();
            
            if (error || !session) {
                window.location.href = 'finsilogin.html';
                return;
            }

            await loadUserProfile(session.user.id);
            
            const dateEl = document.getElementById('currentDate');
            if (dateEl) {
                dateEl.textContent = new Date().toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
            }

            if (document.getElementById('pendingCount')) {
                await loadDashboardStats();
            }

        } catch (err) {
            console.error("Session verification failed:", err);
            window.location.href = 'finsilogin.html';
        }
    }

    // 4. Fetch Asset Manager Name
    async function loadUserProfile(userId) {
        const profileNameEl = document.getElementById('profileName');
        if (!profileNameEl) return;

        try {
            const { data, error } = await window.sbClient
                .from('asset_manager_records')
                .select('firstName')
                .eq('user_id', userId)
                .single();

            if (data && data.firstName) {
                profileNameEl.textContent = data.firstName;
            } else {
                profileNameEl.textContent = 'Manager';
            }
        } catch (err) {
            console.error("Error loading profile:", err);
            profileNameEl.textContent = 'Manager';
        }
    }

    // 5. Load Counters for Dashboard
    async function loadDashboardStats() {
        try {
            const { count: pending } = await window.sbClient
                .from('material_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Pending');

            const { count: completed } = await window.sbClient
                .from('material_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Completed');

            const pendingEl = document.getElementById('pendingCount');
            const completedEl = document.getElementById('completedCount');

            if (pendingEl) pendingEl.textContent = pending || 0;
            if (completedEl) completedEl.textContent = completed || 0;

        } catch (err) {
            console.error("Error loading stats:", err);
        }
    }

    // 6. Setup Logout
    function setupLogout() {
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await window.sbClient.auth.signOut();
                window.location.href = 'finsilogin.html';
            });
        }
    }

    // 7. Sidebar Toggle Logic
    function setupSidebarToggle() {
        const requestsBtn = document.getElementById('requestsBtn');
        const requestsMenu = document.getElementById('requestsMenu');
        
        if (requestsBtn && requestsMenu) {
            // Remove any existing listeners (optional safety) and add new one
            requestsBtn.replaceWith(requestsBtn.cloneNode(true));
            const newBtn = document.getElementById('requestsBtn');
            
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                requestsMenu.classList.toggle('show');
            });
        }
    }
});