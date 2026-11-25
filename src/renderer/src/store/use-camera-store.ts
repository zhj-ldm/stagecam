import { create } from 'zustand'

export interface CameraDevice {
  deviceId: string
  label: string
}

export type CameraStatus = 'idle' | 'starting' | 'ready' | 'error'

interface CameraState {
  status: CameraStatus
  error: string | null
  devices: CameraDevice[]
  activeId: string | null
  activeLabel: string
  frameWidth: number
  frameHeight: number
  frameRate: number

  setStatus: (status: CameraStatus, error?: string | null) => void
  setDevices: (devices: CameraDevice[]) => void
  setActive: (id: string | null, label: string) => void
  setFrame: (width: number, height: number, fps?: number) => void
}

export const useCameraStore = create<CameraState>((set) => ({
  status: 'idle',
  error: null,
  devices: [],
  activeId: null,
  activeLabel: '未连接',
  frameWidth: 0,
  frameHeight: 0,
  frameRate: 0,

  setStatus: (status, error = null) => set({ status, error }),
  setDevices: (devices) => set({ devices }),
  setActive: (activeId, activeLabel) => set({ activeId, activeLabel }),
  setFrame: (frameWidth, frameHeight, frameRate = 0) => set({ frameWidth, frameHeight, frameRate })
}))
