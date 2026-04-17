/**
 * Audio Emotion Analysis Service (Phase 3)
 * Records audio from a MediaStream in periodic chunks, sends each chunk
 * to the backend /api/audio/emotion endpoint, and returns the detected
 * vocal emotion (e.g. "sad", "angry", "happy", "neutral").
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

/**
 * Send an audio Blob to the backend for SER (Speech Emotion Recognition).
 * @param {Blob} audioBlob - audio/webm (or wav) blob
 * @returns {Promise<Object>} - { success, top: { label, score }, candidates }
 */
export async function analyzeAudioEmotion(audioBlob) {
  const form = new FormData();
  form.append('audio', audioBlob, 'chunk.webm');

  const resp = await fetch(buildApiUrl('/api/audio/emotion'), {
    method: 'POST',
    body: form,
  });
  return resp.json();
}

/**
 * AudioEmotionRecorder
 *
 * Wraps the MediaRecorder API to periodically capture audio chunks from a
 * MediaStream (e.g. the local microphone during a WebRTC call) and send
 * them to the backend for vocal emotion analysis.
 *
 * Usage:
 *   const recorder = new AudioEmotionRecorder(localStream, {
 *     intervalMs: 15000,    // record 15-second chunks
 *     onResult: (result) => console.log(result.top),
 *   });
 *   recorder.start();
 *   // ... later
 *   recorder.stop();
 */
export class AudioEmotionRecorder {
  constructor(stream, options = {}) {
    this.stream = stream;
    this.intervalMs = options.intervalMs || 15000; // default 15s chunks
    this.onResult = options.onResult || (() => {});
    this.onError = options.onError || console.error;
    this.recorder = null;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._record();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop(); } catch (_) { /* ignore */ }
    }
    this.recorder = null;
  }

  _record() {
    if (!this.running) return;

    // Only capture audio tracks
    const audioTracks = this.stream.getAudioTracks();
    if (!audioTracks.length) {
      this.onError(new Error('No audio tracks available on the stream'));
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    const chunks = [];

    try {
      this.recorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });
    } catch (e) {
      // Fallback for browsers that don't support webm
      try {
        this.recorder = new MediaRecorder(audioStream);
      } catch (e2) {
        this.onError(new Error('MediaRecorder not supported'));
        return;
      }
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    this.recorder.onstop = async () => {
      if (chunks.length === 0) {
        this._scheduleNext();
        return;
      }
      const blob = new Blob(chunks, { type: this.recorder?.mimeType || 'audio/webm' });

      // Only send if the blob is large enough to be meaningful (> 1KB)
      if (blob.size < 1024) {
        this._scheduleNext();
        return;
      }

      try {
        const result = await analyzeAudioEmotion(blob);
        if (result && result.success && result.top) {
          this.onResult(result);
        }
      } catch (err) {
        this.onError(err);
      }

      this._scheduleNext();
    };

    this.recorder.start();

    // Stop recording after intervalMs to create the chunk
    this.timer = setTimeout(() => {
      if (this.recorder && this.recorder.state === 'recording') {
        this.recorder.stop();
      }
    }, this.intervalMs);
  }

  _scheduleNext() {
    if (!this.running) return;
    // Small gap between recordings (500ms) to avoid overlap
    this.timer = setTimeout(() => this._record(), 500);
  }
}
