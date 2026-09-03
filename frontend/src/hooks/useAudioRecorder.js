import { useRef, useState } from 'react';

/**
 * Records a short voice note from the device microphone using the
 * MediaRecorder API. Produces a Blob (webm/opus, widely supported) that
 * the caller can preview with an <audio> element and upload as a file.
 *
 * Usage:
 *   const { isSupported, isRecording, durationSec, audioUrl, audioBlob,
 *           start, stop, reset } = useAudioRecorder();
 */
export function useAudioRecorder({ maxDurationSec = 60 } = {}) {
  const [isSupported] = useState(
    typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!window.MediaRecorder
  );
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const maxTimeoutRef = useRef(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
    clearTimeout(maxTimeoutRef.current);
  };

  const start = async () => {
    if (!isSupported) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        cleanupStream();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDurationSec(0);

      timerRef.current = setInterval(() => setDurationSec((d) => d + 1), 1000);
      maxTimeoutRef.current = setTimeout(() => stop(), maxDurationSec * 1000);
    } catch (err) {
      setError('Microphone access was denied or is unavailable.');
      cleanupStream();
      setIsRecording(false);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSec(0);
  };

  return { isSupported, isRecording, durationSec, audioBlob, audioUrl, error, start, stop, reset };
}
