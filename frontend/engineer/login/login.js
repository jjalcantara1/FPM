const SUPABASE_URL = 'https://bicvcqolkaokimtwimhn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpY3ZjcW9sa2Fva2ltdHdpbWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUzMDIwMCwiZXhwIjoyMDc4MTA2MjAwfQ.eAYHk5c53gz5y2r85Rkz_-48taKCZWii-5cR2glCMP0';

document.addEventListener('DOMContentLoaded', () => {
    let supabase;

    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        alert("Critical Error: Supabase library not loaded. Please check your internet connection.");
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                alert("Please enter both username and password.");
                return;
            }

            const originalText = loginBtn.textContent;
            loginBtn.textContent = "Logging in...";
            loginBtn.disabled = true;

            try {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (authError) throw authError;

                const { data: engineerData, error: roleError } = await supabase
                    .from('engineer_records')
                    .select('user_id')
                    .eq('user_id', authData.user.id)
                    .single();

                if (roleError || !engineerData) {
                    await supabase.auth.signOut();
                    throw new Error("Access Denied: Account is not an Engineer.");
                }

                window.location.href = '../dashboard/dashboard.html';

            } catch (err) {
                console.error("Login Failed:", err);
                alert(err.message || "Login failed. Please check your credentials.");
                loginBtn.textContent = originalText;
                loginBtn.disabled = false;
            }
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    } else {
        console.error("Login button not found in DOM.");
    }
});