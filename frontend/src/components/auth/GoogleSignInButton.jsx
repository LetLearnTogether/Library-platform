import { useEffect, useRef, useState } from 'react';
import './GoogleSignInButton.css';

let googleIdentityScriptPromise;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
      } else {
        googleIdentityScriptPromise = null;
        reject(new Error('Google Identity Services did not initialize.'));
      }
    };
    script.onerror = () => {
      googleIdentityScriptPromise = null;
      script.remove();
      reject(new Error('Google Identity Services could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

function createLoginNonce() {
  return Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function GoogleSignInButton({
  onCredential,
  disabled = false,
  dividerLabel = 'or continue with email',
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return undefined;

    let active = true;
    const button = buttonRef.current;
    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !button) return;
        const nonce = createLoginNonce();
        google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          callback: (response) => {
            if (!active) return;
            if (!response?.credential) {
              setLoadError('Google did not return a sign-in credential. Please try again.');
              return;
            }
            onCredentialRef.current(response.credential, nonce);
          },
        });
        google.accounts.id.renderButton(button, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(360, Math.floor(button.getBoundingClientRect().width)),
        });
      })
      .catch(() => {
        if (active) setLoadError('Google sign-in could not be loaded. Please try again later.');
      });

    return () => {
      active = false;
      button?.replaceChildren();
    };
  }, [clientId]);

  return (
    <div className="google-signin-panel">
      {clientId ? (
        <>
          <div
            ref={buttonRef}
            className={`google-signin-button${disabled ? ' is-disabled' : ''}`}
            aria-disabled={disabled}
          />
          {loadError && <p className="google-signin-error" role="alert">{loadError}</p>}
        </>
      ) : (
        <p className="google-signin-error" role="status">Google sign-in is not configured.</p>
      )}
      <div className="google-signin-divider"><span>{dividerLabel}</span></div>
    </div>
  );
}
