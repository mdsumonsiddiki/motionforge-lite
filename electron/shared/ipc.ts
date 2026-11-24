/** IPC channel names, shared by main and preload so they never drift apart. */
export const IPC = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  obsDetect: 'obs:detect',
  obsBrowse: 'obs:browse',
  /** main → renderer: the user tried to close the main window */
  appCloseRequested: 'app:close-requested',
  /** renderer → main: the user confirmed closing */
  appConfirmClose: 'app:confirm-close'
} as const
