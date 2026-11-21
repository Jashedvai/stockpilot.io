import React, { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, Flashlight, RefreshCw, X } from 'lucide-react';

interface BarcodeScannerProps {
  active: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
}

interface NativeBarcodeDetector {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): NativeBarcodeDetector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ active, onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const onDetectedRef = useRef(onDetected);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Ignore scanner stop errors
      }
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  };

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const emitCode = (rawValue: string) => {
      const code = rawValue.trim();
      if (!code) return;
      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.at < 1400) {
        return;
      }
      lastScanRef.current = { code, at: now };
      onDetectedRef.current(code);
    };

    const startCamera = async () => {
      setCameraError(null);
      setInitializing(true);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setInitializing(false);
        setCameraError('Camera access is not supported in this browser. Enter SKU manually above.');
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setTorchSupported(BrowserCodeReader.mediaStreamIsTorchCompatible(stream));

        const videoInputs = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
        if (!cancelled) {
          setDevices(videoInputs);
          if (!selectedDeviceId && videoInputs.length > 0) {
            const activeTrack = stream.getVideoTracks()[0];
            const activeDeviceId = activeTrack?.getSettings()?.deviceId;
            if (activeDeviceId) {
              setSelectedDeviceId(activeDeviceId);
            }
          }
        }

        const videoEl = videoRef.current;
        if (!videoEl) {
          setInitializing(false);
          return;
        }

        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
        if (cancelled) return;

        setInitializing(false);

        // Prefer hardware-accelerated native BarcodeDetector when available, else ZXing fallback
        if (window.BarcodeDetector) {
          let formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'qr_code'];
          if (window.BarcodeDetector.getSupportedFormats) {
            const supported = await window.BarcodeDetector.getSupportedFormats().catch(() => formats);
            const filtered = formats.filter((f) => supported.includes(f));
            if (filtered.length > 0) formats = filtered;
          }
          const detector = new window.BarcodeDetector({ formats });
          let lastCheck = 0;

          const tick = async (timestamp: number) => {
            if (cancelled) return;
            if (timestamp - lastCheck >= 130 && videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              lastCheck = timestamp;
              try {
                const barcodes = await detector.detect(videoEl);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  emitCode(barcodes[0].rawValue);
                }
              } catch {
                // Ignore transient frame detection errors
              }
            }
            rafRef.current = requestAnimationFrame(tick);
          };

          rafRef.current = requestAnimationFrame(tick);
        } else {
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromStream(stream, videoEl, (result) => {
            if (cancelled) return;
            if (result) {
              emitCode(result.getText());
            }
          });
          if (cancelled) {
            controls.stop();
          } else {
            controlsRef.current = controls;
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setInitializing(false);
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access or type a SKU manually.'
            : err instanceof Error && err.name === 'NotFoundError'
              ? 'No camera device detected. Connect a camera or enter SKU manually.'
              : 'Unable to start camera scanner. Enter SKU manually above.';
        setCameraError(msg);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, selectedDeviceId]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await BrowserCodeReader.mediaStreamSetTorch(track, next);
      setTorchOn(next);
    } catch {
      // Torch control unsupported on this track
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextDevice = devices[(currentIdx + 1) % devices.length];
    if (nextDevice) {
      setSelectedDeviceId(nextDevice.deviceId);
    }
  };

  if (!active) return null;

  return (
    <div className="rounded-2xl glass-inset p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#1d1d1f] dark:text-white">
          <Camera className="w-3.5 h-3.5 text-[#0071e3] dark:text-[#0a84ff]" />
          <span>Camera barcode scanner</span>
        </div>

        <div className="flex items-center gap-1.5">
          {torchSupported && (
            <button
              type="button"
              onClick={handleToggleTorch}
              aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                torchOn
                  ? 'bg-[#0071e3] text-white'
                  : 'glass-input text-[#5a5a60] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <Flashlight className="w-3.5 h-3.5" />
            </button>
          )}
          {devices.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              aria-label="Switch camera"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg glass-input text-[11px] font-medium text-[#1d1d1f] dark:text-white"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera scanner"
            className="p-1.5 rounded-lg glass-input text-[#5a5a60] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {cameraError ? (
        <div className="p-4 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-xs text-[#5a5a60] dark:text-[#a1a1a6] text-center">
          {cameraError}
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[16/9] max-h-48 w-full">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Crisp corner framing reticle */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-52 h-24">
              <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#0a84ff] rounded-tl-md" />
              <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#0a84ff] rounded-tr-md" />
              <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#0a84ff] rounded-bl-md" />
              <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#0a84ff] rounded-br-md" />
              <div className="absolute inset-x-3 top-1/2 h-[1px] bg-[#0a84ff]/70" />
            </div>
          </div>

          {initializing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs text-white">
              Starting camera...
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#6e6e73] dark:text-[#8e8e93]">
        Point the camera at a product barcode or QR label to add or increment its quantity in the invoice.
      </p>
    </div>
  );
};
