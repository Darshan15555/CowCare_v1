import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorMessage';
import { ScanLine, Keyboard } from 'lucide-react';
import { cattleApi } from '../../api/cattleApi';

const SCANNER_ELEMENT_ID = 'cowcare-qr-scanner';

export default function ScanQr() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);

  const resolveCattleId = async (cattleId) => {
    try {
      const { data } = await cattleApi.scanQr(cattleId);
      toast.success(`Found ${data.cattle.name} (${data.cattle.cattleId})`);
      navigate(`/vet/cattle/${data.cattle._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No cattle found for this ID.'));
    }
  };

  const handleDecoded = async (decodedText) => {
    let cattleId = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed?.cattleId) cattleId = parsed.cattleId;
    } catch {
      // Not JSON — treat the raw scanned text as the cattle ID.
    }
    await stopScanner();
    resolveCattleId(cattleId);
  };

  const startScanner = async () => {
    setIsScanning(true);
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        handleDecoded,
        () => {}
      );
    } catch (err) {
      toast.error('Could not access camera. You can enter the cattle ID manually instead.');
      setIsScanning(false);
      setShowManual(true);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // scanner already stopped
      }
    }
    setIsScanning(false);
  };

  useEffect(() => () => { stopScanner(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-sm space-y-5 text-center">
      <div>
        <h1 className="font-display text-xl font-medium text-ink-900">Scan Cattle QR</h1>
        <p className="text-sm text-ink-500">Resolve a cow&apos;s identity to view its authorized history.</p>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-ink-900">
        <div id={SCANNER_ELEMENT_ID} className="h-full w-full" />
        {isScanning && (
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-pasture-400/70">
            <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-xl border-l-4 border-t-4 border-pasture-300" />
            <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-xl border-r-4 border-t-4 border-pasture-300" />
            <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-xl border-b-4 border-l-4 border-pasture-300" />
            <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-xl border-b-4 border-r-4 border-pasture-300" />
          </div>
        )}
      </div>

      {!isScanning && (
        <button
          onClick={startScanner}
          className="flex w-full items-center justify-center gap-2 btn-pop py-3 text-sm"
        >
          <ScanLine size={18} /> Start Camera Scan
        </button>
      )}
      {isScanning && (
        <button
          onClick={stopScanner}
          className="w-full rounded-lg border border-mist-300 py-2.5 text-sm font-medium text-ink-600"
        >
          Stop Scanning
        </button>
      )}

      <button
        onClick={() => setShowManual(!showManual)}
        className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-pasture-700"
      >
        <Keyboard size={15} /> Enter Cattle ID manually
      </button>

      {showManual && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualId.trim()) resolveCattleId(manualId.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="CW-IND-KA-000124"
            className="input"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-pasture-600 px-4 text-sm font-semibold text-white">
            Go
          </button>
        </form>
      )}
    </div>
  );
}
