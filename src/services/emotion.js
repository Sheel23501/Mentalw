// Sends a canvas/frame to the backend CV endpoint and returns emotions
export async function analyzeEmotionFromBlob(blob) {
  const form = new FormData();
  form.append('image', blob, 'frame.jpg');

  const res = await fetch('http://localhost:3001/api/cv/emotion', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Emotion API failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function analyzeEmotionFrame(blob) {
  const form = new FormData();
  form.append('image', blob, 'frame.jpg');
  const resp = await fetch('http://localhost:3001/api/cv/emotion', {
    method: 'POST',
    body: form,
  });
  return resp.json();
}

export async function analyzeEmotionBatch(blobs) {
  const form = new FormData();
  blobs.forEach((b, i) => form.append('images', b, `frame_${i}.jpg`));
  const resp = await fetch('http://localhost:3001/api/cv/emotion/batch', {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Batch Emotion API failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

// Utility: capture a frame from a video element to Blob (JPEG)
export function captureVideoFrame(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
  });
}

export async function captureMultipleFrames(videoEl, count = 3, spacingMs = 200) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const b = await captureVideoFrame(videoEl);
    blobs.push(b);
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, spacingMs));
    }
  }
  return blobs;
}