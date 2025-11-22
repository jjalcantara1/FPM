emailjs.init('09jja8DopIKMKbCtE');

function toggleMenu() {
    var menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('open');
}
window.toggleMenu = toggleMenu;

let registrationData = {};

// ---------------- Constants ----------------
const RESEND_COOLDOWN_MS = 60 * 1000;      // 1 minute
const OTP_EXPIRATION_MS = 3 * 60 * 1000;   // 3 minutes (Changed from 3 hours)
// -----------------------------------------

// Initialize timer on load
document.addEventListener('DOMContentLoaded', () => {
    startResendTimer();
});

// ---------------- Timer Logic ----------------
function startResendTimer() {
    const resendLink = document.getElementById('resendLink');
    if (!resendLink) return;

    function updateLink() {
        const cooldownEnd = localStorage.getItem('otpResendCooldown');
        
        if (!cooldownEnd) {
            resendLink.style.pointerEvents = 'auto';
            resendLink.style.opacity = '1';
            resendLink.style.color = 'var(--orange-600)';
            resendLink.textContent = 'Resend OTP';
            return;
        }

        const now = Date.now();
        const remaining = Math.ceil((parseInt(cooldownEnd) - now) / 1000);

        if (remaining <= 0) {
            localStorage.removeItem('otpResendCooldown');
            resendLink.style.pointerEvents = 'auto';
            resendLink.style.opacity = '1';
            resendLink.style.color = 'var(--orange-600)';
            resendLink.textContent = 'Resend OTP';
        } else {
            resendLink.style.pointerEvents = 'none';
            resendLink.style.opacity = '0.5';
            resendLink.style.color = 'var(--text-500)';
            resendLink.textContent = `Resend available in ${remaining}s`;
        }
    }

    updateLink();
    if (window.resendInterval) clearInterval(window.resendInterval);
    window.resendInterval = setInterval(updateLink, 1000);
}
// ---------------------------------------------

document.getElementById('registrationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    registrationData = {
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        surname: document.getElementById('surname').value,
        companyEmail: document.getElementById('companyEmail').value,
        contactNumber: document.getElementById('contactNumber').value,
        location: document.getElementById('location').value,
        companyName: document.getElementById('companyName').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };

    if (registrationData.password !== registrationData.confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    if (registrationData.password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }

    showConfirmationModal();
});

function showConfirmationModal() {
    const detailsHTML = `
        <div class="info-row">
            <div class="info-label">Full Name:</div>
            <div class="info-value">${registrationData.firstName} ${registrationData.middleName || ''} ${registrationData.surname}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Company Email:</div>
            <div class="info-value">${registrationData.companyEmail}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Contact Number:</div>
            <div class="info-value">${registrationData.contactNumber}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Location:</div>
            <div class="info-value">${registrationData.location}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Company Name:</div>
            <div class="info-value">${registrationData.companyName}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Password:</div>
            <div class="info-value">••••••••</div>
        </div>
    `;
    document.getElementById('confirmationDetails').innerHTML = detailsHTML;
    document.getElementById('confirmationModal').classList.add('show');
}

function closeConfirmationModal() {
    document.getElementById('confirmationModal').classList.remove('show');
}

function closeOTPModal() {
    document.getElementById('otpModal').classList.remove('show');
    for (let i = 1; i <= 6; i++) {
        document.getElementById('otp' + i).value = '';
    }
}

function moveToNext(current, nextId) {
    if (current.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    }
}

function handleBackspace(event, current, prevId) {
    if (event.key === 'Backspace' && current.value === '' && prevId) {
        document.getElementById(prevId).focus();
    }
}
        
function showValidationModal() {
    document.getElementById('validationEmail').textContent = registrationData.companyEmail;
    document.getElementById('validationModal').classList.add('show');
}

function closeValidationModal() {
    document.getElementById('validationModal').classList.remove('show');
    document.getElementById('registrationForm').reset();
    
    // Cleanup storage
    localStorage.removeItem('registrationOTP');
    localStorage.removeItem('registrationEmail');
    localStorage.removeItem('otpResendCooldown');
    localStorage.removeItem('otpExpiresAt');
    
    window.location.href = '../login/login.html';
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + type;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function sendOTP() {
    const btn = document.getElementById('confirm-send-btn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    closeConfirmationModal();

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set storage items
        localStorage.setItem('registrationOTP', otp);
        localStorage.setItem('registrationEmail', registrationData.companyEmail);
        
        // Set timers based on new constants
        localStorage.setItem('otpResendCooldown', Date.now() + RESEND_COOLDOWN_MS);
        localStorage.setItem('otpExpiresAt', Date.now() + OTP_EXPIRATION_MS);

        const templateParams = {
            to_email: registrationData.companyEmail,
            otp_code: otp,
            user_name: registrationData.firstName + ' ' + registrationData.surname
        };

        await emailjs.send('service_qj1yc6w', 'template_fbiv2i9', templateParams);
        
        showToast('OTP sent to ' + registrationData.companyEmail, 'success');

        document.getElementById('otpEmailDisplay').textContent = registrationData.companyEmail;
        document.getElementById('otpModal').classList.add('show');
        
        startResendTimer();
        
        setTimeout(() => {
            document.getElementById('otp1').focus();
        }, 300);

    } catch (err) {
        console.error('EmailJS Error:', err);
        showToast('Failed to send OTP. Check EmailJS keys.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm & Send OTP';
    }
}

async function verifyOTP() {
    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    // Check for expiration
    const expiresAt = localStorage.getItem('otpExpiresAt');
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
        showToast('OTP has expired (valid for 3 minutes). Please resend.', 'error');
        btn.disabled = false;
        btn.textContent = 'Verify & Register';
        return;
    }

    let otp = '';
    for (let i = 1; i <= 6; i++) {
        otp += document.getElementById('otp' + i).value;
    }

    const storedOTP = localStorage.getItem('registrationOTP');
    const storedEmail = localStorage.getItem('registrationEmail');

    if (otp !== storedOTP || storedEmail !== registrationData.companyEmail) {
        showToast('Invalid OTP code', 'error');
        btn.disabled = false;
        btn.textContent = 'Verify & Register';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: registrationData.companyEmail,
                password: registrationData.password,
                firstName: registrationData.firstName,
                middleName: registrationData.middleName,
                surname: registrationData.surname,
                contactNumber: registrationData.contactNumber,
                location: registrationData.location,
                companyName: registrationData.companyName
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Registration failed.');
        }
        
        showToast('Account created successfully!', 'success');
        
        document.getElementById('validationModal').querySelector('.modal-title').textContent = 'Registration Successful!';
        document.getElementById('validationModal').querySelector('h3').textContent = 'Your account has been created.';
        document.getElementById('validationModal').querySelector('p').textContent = 'You can now log in with your new credentials.';
        
        setTimeout(() => {
            closeOTPModal();
            showValidationModal();
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verify & Register';
    }
}

async function resendOTP() {
    const cooldownEnd = localStorage.getItem('otpResendCooldown');
    if (cooldownEnd && Date.now() < parseInt(cooldownEnd)) {
        return; 
    }

    showToast('Resending code...', 'success');
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        localStorage.setItem('registrationOTP', otp);
        localStorage.setItem('otpResendCooldown', Date.now() + RESEND_COOLDOWN_MS);
        localStorage.setItem('otpExpiresAt', Date.now() + OTP_EXPIRATION_MS);

        const templateParams = {
            to_email: registrationData.companyEmail,
            otp_code: otp,
            user_name: registrationData.firstName + ' ' + registrationData.surname
        };
        
        await emailjs.send('service_qj1yc6w', 'template_fbiv2i9', templateParams);

        showToast('OTP resent to ' + registrationData.companyEmail, 'success');
        
        startResendTimer();
        
        for (let i = 1; i <= 6; i++) {
            document.getElementById('otp' + i).value = '';
        }
        document.getElementById('otp1').focus();

    } catch (err) {
        console.error(err);
        showToast('Failed to resend OTP. Please try again.', 'error');
    }
}