import cv2
import torch
from ultralytics import YOLO
import matplotlib.pyplot as plt

# Load the YOLOv8 model (Pre-trained 'yolov8s' model)
model = YOLO("yolov8s.pt")

# Path to the input image
image_path = "dogandcat.jpg" 

# Load the image
image = cv2.imread(image_path)
image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# Perform object detection
results = model(image_path)

# Process and draw detections
for result in results:
    boxes = result.boxes.xyxy.cpu().numpy()  # Bounding box coordinates
    confidences = result.boxes.conf.cpu().numpy()  # Confidence scores
    class_ids = result.boxes.cls.cpu().numpy()  # Class IDs
    
    for box, conf, class_id in zip(boxes, confidences, class_ids):
        x1, y1, x2, y2 = map(int, box)
        label = f"{model.names[int(class_id)]}: {conf:.2f}"
        
        # Draw bounding box
        cv2.rectangle(image_rgb, (x1, y1), (x2, y2), (0, 255, 0), 1)
        cv2.putText(image_rgb, label, (x1, y1 + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

# Save the output image
output_path = "detected_objects.jpg"
cv2.imwrite(output_path, cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))

# Display the image
plt.figure(figsize=(10, 10))
plt.imshow(image_rgb)
plt.axis("off")
plt.show()

print(f"Object detection completed. Output saved at {output_path}")
