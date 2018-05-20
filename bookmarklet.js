(function() {
    const wnpm = window.wnpm;
    if (typeof wnpm === 'object' && wnpm !== null) {
        return;
    }
    const script = document.createElement('SCRIPT');
    script.type = 'text/javascript';
    script.src = 'https://gitcdn.link/repo/andrewbridge/wnpm/master/wnpm.min.js';
    script.addEventListener('error', () => alert('An error occurred loading the bookmarklet'), false);
    document.head.appendChild(script);
})();