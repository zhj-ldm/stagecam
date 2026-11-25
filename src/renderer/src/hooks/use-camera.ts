import { useCallback, useEffect, useRef, type RefObject } from 'react'

import { useAppStore } from '@renderer/store/use-app-store'
import { useCameraStore, type CameraDevice } from '@renderer/store/use-camera-store'

const IDEAL_WIDTH = 3840
const IDEAL_HEIGHT = 2160
const IDEAL_FPS = 30

const PREFERRED = [/UVC/i, /USB/i, /展台/i, /高拍/i, /Doc.?Cam/i, /Camera/i]
const DISLIKED = [/FaceTime/i, /内建/i, /Built-?in/i, /iSight/i, /Integrated/i]

/** 展台优先：标签命中 USB/UVC/展台加分，命中内置摄像头减分 */
export function scoreCamera(label: string): number {
  let score = 0
  for (const pattern of PREFERRED) if (pattern.test(label)) score += 2
  for (const pattern of DISLIKED) if (pattern.test(label)) score -= 5
  return score
}

export function pickDevice(devices: CameraDevice[]): CameraDevice | null {
  if (devices.length === 0) return null
  const sorted = [...devices].sort((a, b) => scoreCamera(b.label) - scoreCamera(a.label))
  return sorted[0]
}

function describeError(error: unknown): string {
  if (!(error instanceof DOMException)) return '摄像头启动失败'
  if (error.name === 'NotAllowedError') return '未获得摄像头权限，请在系统设置中允许'
  if (error.name === 'NotFoundError') return '未检测到摄像头设备'
  if (error.name === 'NotReadableError') return '摄像头被其它程序占用'
  if (error.name === 'OverconstrainedError') return '该摄像头不支持所需分辨率'
  return error.message || '摄像头启动失败'
}

export function useCamera(videoRef: RefObject<HTMLVideoElement>): {
  start: (deviceId?: string | null) => Promise<void>
} {
  const streamRef = useRef<MediaStream | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(
    async (deviceId?: string | null) => {
      const camera = useCameraStore.getState()
      const app = useAppStore.getState()
      camera.setStatus('starting')
      stop()

      const video = videoRef.current
      if (!video) {
        camera.setStatus('error', '渲染层尚未就绪')
        return
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          width: { ideal: IDEAL_WIDTH },
          height: { ideal: IDEAL_HEIGHT },
          frameRate: { ideal: IDEAL_FPS }
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        const track = stream.getVideoTracks()[0]
        const settings = track.getSettings()
        camera.setFrame(settings.width ?? 0, settings.height ?? 0, settings.frameRate ?? 0)
        camera.setStatus('ready')

        const all = await navigator.mediaDevices.enumerateDevices()
        const list = all
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `摄像头 ${index + 1}`
          }))
        camera.setDevices(list)

        const active = list.find((item) => item.deviceId === track.getSettings().deviceId)
        camera.setActive(active?.deviceId ?? settings.deviceId ?? null, active?.label ?? track.label)

        track.onended = () => {
          camera.setStatus('error', '设备连接已断开')
        }
      } catch (error) {
        camera.setStatus('error', describeError(error))
        app.setVideoEl(null)
      }
    },
    [stop, videoRef]
  )

  // 设备增减时重新枚举；是否重新出图由上层（设置/重试）决定，避免误抢设备
  useEffect(() => {
    const onDeviceChange = async (): Promise<void> => {
      const all = await navigator.mediaDevices.enumerateDevices()
      const list = all
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `摄像头 ${index + 1}`
        }))
      if (list.length > 0) useCameraStore.getState().setDevices(list)
    }
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
      stop()
    }
  }, [stop])

  return { start }
}
