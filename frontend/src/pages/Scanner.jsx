import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SCANNER_ELEMENT_ID = 'qr-scanner-view';

export default function Scanner() {
  const { token } = useAuth();
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | scanning | checking
  const [result, setResult] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decodedText) => handleScan(decodedText)
      )
      .then(() => setStatus('scanning'))
      .catch(() => setStatus('error'));

    return () => {
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan(qrToken) {
    if (busyRef.current) return; // ignore rapid repeat callbacks for the same frame
    busyRef.current = true;
    setStatus('checking');
    try {
      const res = await api.verifyTicket(qrToken, token);
      setResult(res);
    } catch (err) {
      setResult({ ok: false, reason: 'ERROR', message: err.message });
    } finally {
      setStatus('scanning');
      setTimeout(() => (busyRef.current = false), 1500); // brief cooldown before next scan
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Gate scanner</h1>
      <p className="text-sm text-muted mt-1">Point the camera at a student's QR ticket.</p>

      <div id={SCANNER_ELEMENT_ID} className="mt-6 rounded-2xl overflow-hidden border border-line" />

      {status === 'error' && (
        <p className="text-danger text-sm mt-4">
          Could not access the camera. Check browser permissions and use HTTPS or localhost.
        </p>
      )}

      {result && <ResultBanner result={result} />}
    </div>
  );
}

function ResultBanner({ result }) {
  if (result.ok) {
    return (
      <div className="mt-6 bg-success/10 border border-success/30 rounded-2xl p-4">
        <p className="font-display font-semibold text-success text-lg">✓ Entry allowed</p>
        <p className="text-sm text-ink mt-1">{result.student?.name} · {result.student?.roll_no}</p>
        <p className="text-sm text-muted">Seat: {result.seatLabel || '—'} · {result.eventName}</p>
      </div>
    );
  }

  const label =
    result.reason === 'ALREADY_USED' ? 'Already used' :
    result.reason === 'CANCELLED' ? 'Cancelled' :
    result.reason === 'INVALID' ? 'Invalid ticket' : 'Error';

  return (
    <div className="mt-6 bg-danger/10 border border-danger/30 rounded-2xl p-4">
      <p className="font-display font-semibold text-danger text-lg">✗ Entry denied</p>
      <p className="text-sm text-ink mt-1">{label}: {result.message}</p>
      {result.usedAt && <p className="text-xs text-muted mt-1">Previously scanned at {new Date(result.usedAt).toLocaleTimeString()}</p>}
    </div>
  );
}
