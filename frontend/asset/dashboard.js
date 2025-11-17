// Global Client
window.sbClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize
    if (typeof supabase === 'undefined') {
        console.error("Supabase not loaded");
        return;
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase keys missing");
        return;
    }
    window.sbClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // 2. Session & Profile
    await checkSession();
    
    // 3. Global Event Listeners
    setupLogout();
    setupSidebarToggle();

    // 4. Page Specific Loaders
    if (document.getElementById('pendingCount')) loadDashboardStats();
});

async function checkSession() {
    const { data: { session }, error } = await window.sbClient.auth.getSession();
    if (error || !session) {
        window.location.href = 'finsilogin.html';
        return;
    }
    loadUserProfile(session.user.id);
    updateDateDisplay();
}

async function loadUserProfile(userId) {
    const nameEl = document.getElementById('profileName');
    if (!nameEl) return;
    
    const { data } = await window.sbClient
        .from('asset_manager_records')
        .select('firstName')
        .eq('user_id', userId)
        .single();
        
    if (data && data.firstName) nameEl.textContent = data.firstName;
}

function updateDateDisplay() {
    const el = document.getElementById('currentDate');
    if (el) {
        el.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

async function loadDashboardStats() {
    const { count: pending } = await window.sbClient
        .from('material_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
        
    const { count: completed } = await window.sbClient
        .from('material_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Completed');

    const pEl = document.getElementById('pendingCount');
    const cEl = document.getElementById('completedCount');
    if (pEl) pEl.textContent = pending || 0;
    if (cEl) cEl.textContent = completed || 0;
}

function setupLogout() {
    const btn = document.getElementById('logoutLink');
    if (btn) {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.sbClient.auth.signOut();
            window.location.href = 'finsilogin.html';
        });
    }
}

function setupSidebarToggle() {
    const btn = document.getElementById('requestsBtn');
    const menu = document.getElementById('requestsMenu');
    if (btn && menu) {
        // Remove old inline onclicks first
        btn.onclick = null; 
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
    }
}