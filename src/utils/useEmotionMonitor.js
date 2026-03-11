import { useEffect, useRef } from 'react';
import { captureMultipleFrames, analyzeEmotionBatch } from '../services/emotion';

/**
 * Periodically captures frames from a user's camera and analyzes emotion.
 * Pass a callback to receive results for display/logging.
 */
export function useEmotionMonitor({ enabled, intervalMs = 15000, onResult }) {
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const framesPerTick = 3; // New variable for frames per tick
  const onResultRef = useRef(onResult);

  // Keep latest callback without re-running main effect
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return () => {};
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) return;

        if (!videoRef.current) {
          const v = document.createElement('video');
          v.setAttribute('playsinline', '');
          v.muted = true;
          v.autoplay = true;
          v.style.display = 'none';
          document.body.appendChild(v);
          videoRef.current = v;
        }
        if (!videoRef.current.srcObject) {
          videoRef.current.srcObject = stream;
        }
        try {
          await videoRef.current.play();
        } catch (e) {
          // Ignore play interruption warnings
          // console.warn('Video play() warning:', e);
        }

        timerRef.current = setInterval(async () => {
          try {
            if (!videoRef.current) return;
            const blobs = await captureMultipleFrames(videoRef.current, framesPerTick, 200);
            const results = await analyzeEmotionBatch(blobs);
            onResultRef.current?.(results);
          } catch (err) {
            console.error('Emotion monitor batch error:', err);
          }
        }, intervalMs);
      } catch (err) {
        console.error('Camera access error:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const v = videoRef.current;
      if (v && v.srcObject) {
        v.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (v) {
        v.remove();
        videoRef.current = null;
      }
    };
  }, [enabled, intervalMs]);
}