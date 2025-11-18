/**
 * Handles the Supabase login logic for the Asset Management login page.
 */
async function handleAssetLogin(e) {
    e.preventDefault();
    
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var statusEl = document.getElementById('loginStatus');
    var submitBtn = document.querySelector('.btn');
    
    // Use global supabaseClient
    if (typeof supabaseClient === 'undefined') {
        console.error('Supabase client not loaded.');
        statusEl.textContent = 'Login client failed to load.';
        statusEl.style.color = 'red';
        return;
    }
    
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }
    
    try {
        // 3. Sign in with Supabase Auth
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw new Error('Invalid login credentials.');
        if (!data.user) throw new Error('No user data found after login.');

        // 4. Verify the user is an Asset Manager
        const { data: profile, error: profileError } = await supabaseClient
            .from('asset_manager_records')
            .select('user_id')
            .eq('user_id', data.user.id)
            .single();

        if (profileError || !profile) {
            await supabaseClient.auth.signOut(); 
            throw new Error('This login is for Asset Managers only.');
        }

        // 5. Success
        statusEl.textContent = 'Login successful. Redirecting...';
        statusEl.style.color = 'green';
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);

    } catch (err) {
        console.error(err);
        if (statusEl) { 
            statusEl.textContent = err.message; 
            statusEl.style.color = 'red';
        }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('assetLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAssetLogin);
    }
});