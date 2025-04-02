import cv2
import face_recognition
import numpy as np

known_faces = []
known_names = []

# Load sample known faces (replace with actual images)
known_images = ["tranmanhson.jpg","elonemusk.jpg","justinbieber.jpg"] 

for image_path in known_images:
    try:
        img = face_recognition.load_image_file(image_path)
        img_encoding = face_recognition.face_encodings(img)[0]  # Extract face encoding
        known_faces.append(img_encoding)
        known_names.append(image_path.split(".")[0]) 
    except IndexError:
        print(f"Warning: No face found in {image_path}. Skipping.")

# Start webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert frame to RGB (face_recognition works with RGB)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Detect faces and encode them
    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    for face_encoding, face_location in zip(face_encodings, face_locations):
        matches = face_recognition.compare_faces(known_faces, face_encoding)
        name = "Unknown"

        # Find the best match
        face_distances = face_recognition.face_distance(known_faces, face_encoding)
        best_match_index = np.argmin(face_distances) if len(face_distances) > 0 else None
        
        if best_match_index is not None and matches[best_match_index]:
            name = known_names[best_match_index]

        # Draw a rectangle around the face
        top, right, bottom, left = face_location
        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
        cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    # Show the video feed
    cv2.imshow("Face Recognition", frame)

    # Press 'q' to exit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
