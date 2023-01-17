(function() {
    const wnpm = window.wnpm;
    if (typeof wnpm === 'object' && wnpm !== null) {
        return;
    }
    const script = document.createElement('SCRIPT');
    script.type = 'text/javascript';
    script.src = 'https://cdn.jsdelivr.net/gh/andrewbridge/wnpm@latest/wnpm.min.js';
    script.addEventListener('error', () => alert('An error occurred loading the bookmarklet'), false);
    document.head.appendChild(script);
})();