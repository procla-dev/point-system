import { useEffect, useRef } from 'react'
import { ENTRANCE_DISPLAY_CHANNEL, type EntranceDisplayMessage, type IssueState } from '../lib/shared'

function messageForState(state: IssueState): EntranceDisplayMessage {
  if (state.kind === 'ready') {
    return {
      type: 'qr-issued',
      qrCode: state.qrCode,
      loginUrl: state.loginUrl,
      expiresAt: state.expiresAt,
    }
  }

  if (state.kind === 'loading' && state.previous) {
    return {
      type: 'qr-issued',
      qrCode: state.previous.qrCode,
      loginUrl: state.previous.loginUrl,
      expiresAt: state.previous.expiresAt,
    }
  }

  return { type: 'display-clear' }
}

export function useEntranceDisplayPublisher(state: IssueState) {
  const currentState = useRef(state)
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    currentState.current = state
  }, [state])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const displayChannel = new BroadcastChannel(ENTRANCE_DISPLAY_CHANNEL)
    channel.current = displayChannel
    displayChannel.onmessage = (event: MessageEvent<EntranceDisplayMessage>) => {
      if (event.data?.type === 'display-ready') {
        displayChannel.postMessage(messageForState(currentState.current))
      }
    }

    return () => {
      displayChannel.close()
      channel.current = null
    }
  }, [])

  useEffect(() => {
    channel.current?.postMessage(messageForState(state))
  }, [state])
}
