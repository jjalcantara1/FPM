function toggleMenu() {
    var menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('open');
}

async function handleLogin(e) {
    e.preventDefault();
    
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var statusEl = document.getElementById('loginStatus');
    var submitBtn = document.querySelector('.btn-primary');
    
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'status'; }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw new Error('Invalid login credentials.');
        }

        if (!data.user) {
            throw new Error('No user data found after login.');
        }
        
        const { data: profile, error: profileError } = await supabase
            .from('facility_owner_records')
            .select('user_id')
            .eq('user_id', data.user.id)
            .single();

        if (profileError || !profile) {
            await supabase.auth.signOut();
            throw new Error('This login is for Facility Owners only.');
        }

        statusEl.textContent = 'Login successful. Redirecting...';
        statusEl.className = 'status success';
        
        setTimeout(() => {
            window.location.href = '../homepage/homepage.html';
        }, 500);

    } catch (err) {
        console.error(err);
        if (statusEl) { statusEl.textContent = err.message; statusEl.className = 'status error'; }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
    }
}

window.handleLogin = handleLogin;
