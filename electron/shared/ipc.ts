/** IPC channel names, shared by main and preload so they never drift apart. */
export const IPC = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  obsDetect: 'obs:detect',
  obsBrowse: 'obs:browse',
  storageList: 'storage:list',
  storageDelete: 'storage:delete',
  backupCreate: 'backup:create',
  backupRestore: 'backup:restore',
  docPickImage: 'document:pick-image',
  docLoad: 'document:load',
  docSave: 'document:save',
  docExport: 'document:export',
  /** main → renderer: the user tried to close the main window */
  appCloseRequested: 'app:close-requested',
  /** renderer → main: the user confirmed closing */
  appConfirmClose: 'app:confirm-close'
} as const
