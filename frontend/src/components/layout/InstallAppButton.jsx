import { useEffect, useState } from 'react';
import './InstallAppButton.css';

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
}

function isAppleMobileDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isAppInstalled);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState('');
  const appleMobileDevice = isAppleMobileDevice();

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function markInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showInstructions) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setShowInstructions(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showInstructions]);

  async function installApp() {
    setError('');
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch (installError) {
      setError(installError.message || 'The install prompt could not be opened.');
      setShowInstructions(true);
    }
  }

  if (installed) return null;

  return (
    <div className="install-app-control">
      <button type="button" className="install-app-button" onClick={installApp}>
        <span aria-hidden="true">↓</span>
        Install app
      </button>
      {showInstructions && (
        <div className="install-app-popover" role="dialog" aria-label="Install LetLearnTogether">
          <button
            type="button"
            className="install-app-close"
            aria-label="Close install instructions"
            onClick={() => setShowInstructions(false)}
          >
            ×
          </button>
          <strong>Install LetLearnTogether</strong>
          <p>
            {appleMobileDevice
              ? 'In Safari, tap Share, then choose Add to Home Screen.'
              : 'Open your browser menu and choose Install app or Add to Home Screen.'}
          </p>
          {error && <p className="install-app-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
