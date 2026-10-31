import { createContext, useContext } from 'react';

export const PlatformSettingsContext = createContext(null);

export function usePlatformSettings() {
  const context = useContext(PlatformSettingsContext);
  if (!context) throw new Error('usePlatformSettings must be used within PlatformSettingsProvider.');
  return context;
}
