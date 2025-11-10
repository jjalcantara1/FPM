function toggleMenu() {
    var menu = document.getElementById('menu');
    menu.classList.toggle('open');
}
// Removed demo login; Appointment stays disabled until real auth is implemented
// Simple image carousel with placeholder slides
// Use data-images attribute on the carousel to control images (comma-separated)
var carouselEl = document.querySelector('.hero-carousel');
var imagesAttr = (carouselEl && carouselEl.getAttribute('data-images')) || '';
var slides = imagesAttr ? imagesAttr.split(',').map(function(s){ return s.trim(); }) : ['1.jpg', '2.jpg', '3.jpg'];
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
    // start crossfade
    outgoing.classList.remove('show');
    // force reflow to ensure transition
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
// Autoplay: advance every 4s until user clicks an arrow
var autoplayId = null;
function startAutoplay() {
    if (autoplayId !== null) return;
    autoplayId = setInterval(function() { nextSlide(); }, 4000);
}
function stopAutoplay() {
    if (autoplayId !== null) {
        clearInterval(autoplayId);
        autoplayId = null;
    }
}
function handleNextClick() {
    stopAutoplay();
    nextSlide();
}
function handlePrevClick() {
    stopAutoplay();
    prevSlide();
}
// Appointment link is disabled via CSS pointer-events; no JS needed
renderSlide(true);
startAutoplay();
function submitForm(e) {
    e.preventDefault();
    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    var message = document.getElementById('message').value.trim();
    if (!name || !email || !message) {
        alert('Please complete all required fields.');
        return false;
    }
    alert('Thanks ' + name + '! We\'ll be in touch shortly.');
    e.target.reset();
    return false;
}
// Static footer year (2021) — no dynamic change
// Smooth scroll disabled to keep single-screen experience
