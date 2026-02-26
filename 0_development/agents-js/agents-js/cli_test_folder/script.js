document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('globalnav');

    /**
     * Debounce function to limit the rate at which a function can fire.
     */
    const debounce = (func, wait = 10) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const handleScroll = () => {
        const isScrolled = window.scrollY > 50;
        nav.classList.toggle('scrolled', isScrolled);
    };

    // Listen for scroll events with debouncing
    window.addEventListener('scroll', debounce(handleScroll));
    
    // Run once on load to set initial state
    handleScroll();

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    console.log('Apple Clone initialized');
});
