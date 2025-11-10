//
// REPLACE your entire login.js file with this
//
async function handleLogin(e) {
    e.preventDefault();
    
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var statusEl = document.getElementById('loginStatus');
    var submitBtn = document.querySelector('.btn-primary');
    
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }
    
    try {
        // 1. Sign in the user with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw new Error('Invalid login credentials.');
        if (!data.user) throw new Error('No user data found after login.');

        // 2. Login successful, NOW check their approval status
        const { data: profile, error: profileError } = await supabase
            .from('facility_owner_records')
            .select('status') // We only need the 'status' column
            .eq('user_id', data.user.id)
            .single(); // Get just one record

        if (profileError) {
            // This happens if they are not a facility owner (e.g., they are a PM)
            await supabase.auth.signOut(); // Log them back out
            throw new Error('This login is for Facility Owners only.');
        }

        // 3. Check the status and act accordingly
        if (profile.status === 'pending') {
            await supabase.auth.signOut(); // Log them back out
            statusEl.textContent = 'Your account is still pending approval.';
            statusEl.className = 'status error';

        } else if (profile.status === 'approved') {
            statusEl.textContent = 'Login successful. Redirecting...';
            statusEl.className = 'status success';
            // We are logged in! Go to the homepage.
            setTimeout(() => {
                window.location.href = '../homepage/homepage.html';
            }, 500);

        } else {
            // This could be 'rejected' or 'disabled'
            await supabase.auth.signOut(); // Log them back out
            statusEl.textContent = `Your account status is: ${profile.status}. Please contact support.`;
            statusEl.className = 'status error';
        }

    } catch (err) {
        console.error(err);
        if (statusEl) { statusEl.textContent = err.message; statusEl.className = 'status error'; }
    } finally {
        // Re-enable the button
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});