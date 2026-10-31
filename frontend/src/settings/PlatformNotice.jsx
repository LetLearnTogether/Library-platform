import { usePlatformSettings } from './PlatformSettingsContext.js';

export default function PlatformNotice() {
  const { settings } = usePlatformSettings();
  if (!settings) return null;

  const showAnnouncement = settings.announcement_enabled && settings.announcement_message;
  if (!showAnnouncement && !settings.support_contact) return null;
  const isWebUrl = /^https?:\/\//i.test(settings.support_contact || '');
  const supportHref = isWebUrl ? settings.support_contact : `mailto:${settings.support_contact}`;

  return (
    <aside className="platform-notice" aria-label="Platform information">
      {showAnnouncement && <p>{settings.announcement_message}</p>}
      {settings.support_contact && (
        <a href={supportHref} target={isWebUrl ? '_blank' : undefined} rel="noreferrer">
          Contact support
        </a>
      )}
    </aside>
  );
}
