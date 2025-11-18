async function handlePMLogin(e) {
    e.preventDefault();
    
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var statusEl = document.getElementById('loginStatus');
    var submitBtn = document.querySelector('.btn-primary');
    
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }
    
    try {
        // Ensure client is available
        if (typeof supabaseClient === 'undefined') {
            throw new Error('Database connection not initialized.');
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw new Error('Invalid login credentials.');
        if (!data.user) throw new Error('No user data found after login.');

        const { data: profile, error: profileError } = await supabaseClient
            .from('project_manager_records')
            .select('user_id')
            .eq('user_id', data.user.id)
            .single();

        if (profileError || !profile) {
            await supabaseClient.auth.signOut();
            throw new Error('This login is for Project Managers only.');
        }

        statusEl.textContent = 'Login successful. Redirecting...';
        statusEl.className = 'status success';
        
        setTimeout(() => {
            window.location.href = '../projectmanager/projectmanager.html';
        }, 500);

    } catch (err) {
        console.error(err);
        if (statusEl) { statusEl.textContent = err.message; statusEl.className = 'status error'; }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}