function toggleMenu() {
    var menu = document.getElementById('menu');
    menu.classList.toggle('open');
}

let currentUser = null;
let userProfile = null;

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error.message);
    }
    window.location.href = '../landingpage/landingpage.html#home';
}
window.logout = logout;

function updateUI(profile) {
    const label = document.getElementById('welcomeLabel');
    if (label && profile) {
        label.textContent = profile.company_name ?
            ('Welcome, ' + profile.company_name) :
            ('Welcome, ' + profile.email);
    }

    var badge = document.querySelector('.profile-btn .badge');
    if (badge) {
        badge.textContent = 'Approved';
        badge.classList.remove('pending');
        badge.classList.add('approved');
    }

    var apptLink = document.getElementById('appointmentLink');
    if (apptLink) {
        apptLink.classList.remove('disabled-link');
        apptLink.removeAttribute('aria-disabled');
        apptLink.removeAttribute('title');
    }
    var statusLink = document.getElementById('statusLink');
    if (statusLink) {
        statusLink.classList.remove('disabled-link');
        statusLink.removeAttribute('aria-disabled');
        statusLink.removeAttribute('title');
    }
}

async function checkUserSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        window.location.href = '../login/login.html';
        return;
    }

    if (!data.session) {
        console.log('No session found, redirecting to login.');
        window.location.href = '../login/login.html';
        return;
    }

    currentUser = data.session.user;

    const { data: profile, error: profileError } = await supabase
        .from('facility_owner_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError.message);
        logout();
        return;
    }

    userProfile = profile;
    updateUI(userProfile);
}

document.addEventListener('DOMContentLoaded', function() {
    checkUserSession();

    var btn = document.getElementById('profileBtn');
    var menu = document.getElementById('profileMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function(){
        menu.classList.toggle('open');
    });
    document.addEventListener('click', function(e){
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('open');
        }
    });
});

function handleNextClick() {
    stopAutoplay();
    nextSlide();
}
function handlePrevClick() {
    stopAutoplay();
    prevSlide();
}
var heroEl = document.querySelector('.hero-carousel');
var imagesAttr = (heroEl && heroEl.getAttribute('data-images')) || '';
var slides = imagesAttr ? imagesAttr.split(',').map(function(s){ return s.trim(); }) : ['1.jpg','2.jpg','3.jpg'];
var currentSlide = 0;
var usingA = true;
function renderSlide(initial) {
    var a = document.getElementById('carousel-image-a');
    var b = document.getElementById('carousel-image-b');
    if (!a || !b) return;
    if (initial) {
        a.src = slides[currentSlide];
        a.alt = 'Slide ' + (currentSlide + 1);
        a.classList.add('show');
        b.classList.remove('show');
        return;
    }
    var incoming = usingA ? b : a;
    var outgoing = usingA ? a : b;
    incoming.src = slides[currentSlide];
    incoming.alt = 'Slide ' + (currentSlide + 1);
    outgoing.classList.remove('show');
    void incoming.offsetWidth;
    incoming.classList.add('show');
    usingA = !usingA;
}
function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    renderSlide(false);
}
function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    renderSlide(false);
}
var autoplayId = null;
function startAutoplay() {
    if (autoplayId !== null) return;
    autoplayId = setInterval(function() { nextSlide(); }, 4000);
}
function stopAutoplay() {
    if (autoplayId !== null) { clearInterval(autoplayId); autoplayId = null; }
}
renderSlide(true);
startAutoplay();
