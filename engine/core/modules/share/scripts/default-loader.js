const runBootstrap = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runBootstrap, { once: true });
        return;
    }

    // Placeholder for upcoming default module initialisation.
};

runBootstrap();
