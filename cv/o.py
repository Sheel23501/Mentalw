import cv2
import numpy as np
from keras.models import load_model
from keras.preprocessing import image
import sys
import json
import argparse

# Load the trained model
model_best = load_model("cv/face_model.h5") # set your machine model file path here

# Classes 7 emotional states
class_names = ['Angry', 'Disgusted', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']

# Load the pre-trained face cascade
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def predict_emotions_in_image(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5, minSize=(30, 30))

    results = []
    for (x, y, w, h) in faces:
        face_roi = img_bgr[y:y + h, x:x + w]
        face_image = cv2.resize(face_roi, (48, 48))z
        face_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        face_image = image.img_to_array(face_image)
        face_image = np.expand_dims(face_image, axis=0)
        face_image = np.vstack([face_image])

        predictions = model_best.predict(face_image)
        emotion_label = class_names[np.argmax(predictions)]

        results.append({
            'bbox': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)},
            'emotion': emotion_label
        })
    return results

def run_cli():
    parser = argparse.ArgumentParser(description='Emotion detection from image or webcam')
    parser.add_argument('--image', type=str, help='Path to an image file')
    args = parser.parse_args()

    if args.image:
        img = cv2.imread(args.image)
        if img is None:
            print(json.dumps({'success': False, 'error': 'Could not read image'}))
            sys.exit(1)
        results = predict_emotions_in_image(img)
        print(json.dumps({'success': True, 'faces': results}))
        return

    # Fallback to webcam interactive mode if no image provided
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Attempting to open camera with AVFoundation backend...")
        cap = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        print("\nTroubleshooting steps:")
        print("1. Ensure a webcam is connected to your Mac")
        print("2. Check System Preferences > Security & Privacy > Camera to allow Python access")
        print("3. If using VS Code/Terminal, grant camera permissions in macOS settings")
        print("4. Try restarting the terminal or application")
        sys.exit(1)

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to capture frame from webcam. Make sure your camera is connected.")
            break

        results = predict_emotions_in_image(frame)

        for r in results:
            x, y, w, h = r['bbox']['x'], r['bbox']['y'], r['bbox']['w'], r['bbox']['h']
            cv2.putText(frame, f"Emotion: {r['emotion']}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

        cv2.imshow('Emotion Detection', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    run_cli()