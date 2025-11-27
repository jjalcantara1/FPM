window.sbClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase not loaded");
        return;
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase keys missing");
        return;
    }
    window.sbClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    await checkSession();
    
    setupLogout();
    setupSidebarToggle();

    if (document.getElementById('pendingCount')) loadDashboardStats();
});

document.addEventListener('DOMContentLoaded', () => {
  const requestsBtn = document.getElementById('requestsBtn');
  const requestsMenu = document.getElementById('requestsMenu');
  
  // Check if elements exist to avoid errors on pages without the sidebar
  if (requestsBtn && requestsMenu) {
    requestsBtn.addEventListener('click', (e) => {
      // Prevent default button behavior just in case
      e.preventDefault();
      requestsMenu.classList.toggle('show');
    });
  }
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
    const welcomeEl = document.getElementById('welcomeMessage');
    
    // Ideally we check for nameEl to update the sidebar, but even if sidebar is missing
    // we might still want to update the header welcome message on other pages.
    // However, the original logic returns if nameEl is missing. We can keep it or make it robust.
    // For now, we proceed to fetch data if we need to update either element.
    
    const { data } = await window.sbClient
        .from('asset_manager_records')
        .select('firstName')
        .eq('user_id', userId)
        .single();
        
    if (data && data.firstName) {
        // Update Sidebar Name
        if (nameEl) nameEl.textContent = data.firstName;
        
        // Update Header Welcome Message
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${data.firstName}!`; 
    }
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
        btn.onclick = null; 
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
    }
}