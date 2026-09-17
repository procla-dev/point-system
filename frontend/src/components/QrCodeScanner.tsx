import { useEffect, useId } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrCodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const elementId = useId().replace(/:/g, '')

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    void scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onScan(decodedText)
        void scanner.stop().catch(() => undefined)
      },
      () => undefined,
    ).catch(() => undefined)

    return () => {
      if (scanner.isScanning) void scanner.stop().catch(() => undefined)
    }
  }, [elementId, onScan])

  return <div id={elementId} aria-label="QRコード読み取りカメラ" />
}
