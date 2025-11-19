// Initialize Supabase
const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.querySelector('.login-button');
    const inputs = document.querySelectorAll('.input-field');
    const emailInput = inputs[0]; // Username/Email field
    const passInput = inputs[1]; // Password field

    async function handleLogin() {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        loginBtn.textContent = "Logging in...";
        loginBtn.disabled = true;

        try {
            // 1. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw new Error("Invalid login credentials.");

            // 2. Verify Engineer Role
            const { data: profile, error: profileError } = await supabase
                .from('engineer_records')
                .select('*')
                .eq('user_id', data.user.id)
                .single();

            if (profileError || !profile) {
                await supabase.auth.signOut();
                throw new Error("Access denied. This account is not an Engineer.");
            }

            if (profile.status === 'archived') {
                await supabase.auth.signOut();
                throw new Error("This account has been archived.");
            }

            // 3. Success Redirect
            window.location.href = '../dashboard/dashboard.html';

        } catch (err) {
            alert(err.message);
            loginBtn.textContent = "Login";
            loginBtn.disabled = false;
        }
    }

    if(loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Allow 'Enter' key to submit
    document.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') handleLogin();
    });
});