import { useEffect, useId, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrCodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const elementId = useId().replace(/:/g, '')
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    let hasScanned = false
    void scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (hasScanned) return
        hasScanned = true
        onScanRef.current(decodedText)
        void scanner.stop().catch(() => undefined)
      },
      () => undefined,
    ).catch(() => undefined)

    return () => {
      if (scanner.isScanning) void scanner.stop().catch(() => undefined)
    }
  }, [elementId])

  return <div className="qr-code-scanner" id={elementId} aria-label="QRコード読み取りカメラ" />
}
