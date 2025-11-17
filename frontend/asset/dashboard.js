// Wait for the page to load completely
document.addEventListener('DOMContentLoaded', () => {

    // 1. Check if Supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error("Error: Supabase library not loaded. Check your internet connection or the <script> tag in dashboard.html");
        return;
    }

    // 2. Check if keys are loaded
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Error: Supabase keys not found. Check frontend/static/supabaseClient.js");
        return;
    }

    // 3. Initialize Client
    const { createClient } = supabase;
    const supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    // 4. Main Logic
    checkSession();

    async function checkSession() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (!session) {
                window.location.href = 'finsilogin.html';
                return;
            }

            // Load your data here...
            loadDashboardData();
            updateUI(session.user);

        } catch (err) {
            console.error("Session check failed:", err);
            window.location.href = 'finsilogin.html';
        }
    }

    function updateUI(user) {
        // Update profile name if element exists
        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) profileNameEl.textContent = user.email;
        
        // Update date
        const currentDate = document.getElementById('currentDate');
        if (currentDate) {
            currentDate.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }

    async function loadDashboardData() {
        // Example: Get Pending Count
        const { count: pending } = await supabaseClient
            .from('material_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');
            
        const { count: completed } = await supabaseClient
            .from('material_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Completed');

        if (document.getElementById('pendingCount')) {
            document.getElementById('pendingCount').textContent = pending || 0;
        }
        if (document.getElementById('completedCount')) {
            document.getElementById('completedCount').textContent = completed || 0;
        }
    }

    // Logout handler
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'finsilogin.html';
        });
    }
});