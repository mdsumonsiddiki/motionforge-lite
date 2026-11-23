import { contextBridge } from 'electron'

/**
 * Safe IPC bridge exposed to the renderer as `window.api`.
 * Phase 0: only static info. IPC methods (storage, backup, obs, cloud, pose)
 * are added in later phases.
 */
const api = {
  platform: process.platform
} as const

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
