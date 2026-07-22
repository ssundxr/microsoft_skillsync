(function () {
    const key = 'skillsync-theme';
    const root = document.documentElement;
    const button = document.getElementById('themeToggle');

    if (!button) {
        return;
    }

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem(key, theme);
        button.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        button.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    }

    const current = root.getAttribute('data-theme') || 'light';
    setTheme(current);

    button.addEventListener('click', function () {
        const next = (root.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark';
        setTheme(next);
    });
})();
