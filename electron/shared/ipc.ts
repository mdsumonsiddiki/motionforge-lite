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
  obsLaunch: 'obs:launch',
  obsClose: 'obs:close',
  outputOpen: 'output:open',
  outputClose: 'output:close',
  outputIsOpen: 'output:is-open',
  outputOrientation: 'output:orientation',
  /** main renderer → main → output window */
  outputState: 'output:state',
  /** output window → main: give me the latest state (on start-up) */
  outputGetState: 'output:get-state',
  /** main → main renderer: output window opened (true) / closed (false) */
  outputStatus: 'output:status',
  /** main → renderer: the user tried to close the main window */
  appCloseRequested: 'app:close-requested',
  /** renderer → main: the user confirmed closing */
  appConfirmClose: 'app:confirm-close'
} as const
