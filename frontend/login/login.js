async function handleLogin(e) {
    e.preventDefault();

    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var statusEl = document.getElementById('loginStatus');
    var submitBtn = document.querySelector('.btn-primary');

    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error('System not initialized. Please refresh the page.');
        }

        // Use supabaseClient, not supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw new Error('Invalid login credentials.');
        if (!data.user) throw new Error('No user data found after login.');

        // Check facility owner status
        const { data: profile, error: profileError } = await supabaseClient
            .from('facility_owner_records')
            .select('status')
            .eq('user_id', data.user.id)
            .single();

        if (profileError) {
            // If not in facility_owner_records, log out
            await supabaseClient.auth.signOut();
            throw new Error('This login is for Facility Owners only.');
        }

        if (profile.status === 'pending') {
            await supabaseClient.auth.signOut();
            statusEl.textContent = 'Your account is still pending approval.';
            statusEl.className = 'status error';
        } else if (profile.status === 'approved') {
            statusEl.textContent = 'Login successful. Redirecting...';
            statusEl.className = 'status success';
            setTimeout(() => {
                window.location.href = '../homepage/homepage.html';
            }, 500);
        } else {
            await supabaseClient.auth.signOut();
            statusEl.textContent = `Your account status is: ${profile.status}. Please contact support.`;
            statusEl.className = 'status error';
        }

    } catch (err) {
        console.error(err);
        if (statusEl) { statusEl.textContent = err.message; statusEl.className = 'status error'; }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}

// Ensure the form listener is attached safely
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    if (loginForm && !loginForm.getAttribute('onsubmit')) {
        loginForm.addEventListener('submit', handleLogin);
    }
});