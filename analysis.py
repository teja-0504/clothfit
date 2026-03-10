"""
Body Measurement Analysis Module
Uses MediaPipe for pose detection and OpenCV for image quality analysis
"""

import cv2
import numpy as np
import mediapipe as mp
from PIL import Image
import io


class BodyAnalyzer:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5
        )
        
    def detect_blur(self, image_bytes):
        """
        Detect if image is blurry using Laplacian variance method
        Returns: (is_blurry, blur_score)
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return True, 0
            
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (measure of blur)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()
        
        # Threshold: below 100 is considered blurry
        is_blurry = variance < 100
        return is_blurry, variance
    
    def analyze_body(self, image_bytes):
        """
        Analyze body measurements from image
        Returns: dict with measurements or error info
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Could not decode image"}
        
        # Convert to RGB for MediaPipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img_rgb.shape[:2]
        
        # Process with MediaPipe Pose
        results = self.pose.process(img_rgb)
        
        if not results.pose_landmarks:
            return {"error": "No body detected in image. Please upload a full-body photo."}
        
        landmarks = results.pose_landmarks.landmark
        
        # Get key body landmarks
        # MediaPipe pose landmarks:
        # 11: Left shoulder, 12: Right shoulder
        # 23: Left hip, 24: Right hip
        # 11-12: shoulders width, 23-24: hips width
        
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]
        left_hip = landmarks[23]
        right_hip = landmarks[24]
        
        # Check if key points are visible (confidence > 0.5)
        if (left_shoulder.visibility < 0.5 or right_shoulder.visibility < 0.5 or
            left_hip.visibility < 0.5 or right_hip.visibility < 0.5):
            return {"error": "Could not detect full body. Please ensure your full body is visible in the photo."}
        
        # Calculate pixel distances
        shoulder_width_px = abs(right_shoulder.x - left_shoulder.x) * w
        hip_width_px = abs(right_hip.x - left_hip.x) * w
        
        # Estimate body height (from top of head to feet)
        nose = landmarks[0]
        left_ankle = landmarks[27]
        body_height_px = abs(left_ankle.y - nose.y) * h
        
        # Conversion factor: pixels to cm (estimated based on average proportions)
        # Assuming average adult height of 170cm
        px_to_cm = 170 / body_height_px if body_height_px > 0 else 1
        
        # Calculate measurements in cm
        shoulder_width = round(shoulder_width_px * px_to_cm, 1)
        hip_width = round(hip_width_px * px_to_cm, 1)
        chest = round(shoulder_width * 1.1, 1)  # Estimate chest from shoulders
        waist = round(hip_width * 0.9, 1)  # Estimate waist from hips
        
        # Calculate body shape
        shoulder_to_hip_ratio = shoulder_width / hip_width if hip_width > 0 else 1
        
        if shoulder_to_hip_ratio > 1.2:
            body_shape = "Inverted Triangle"
        elif shoulder_to_hip_ratio < 0.9:
            body_shape = "Pear"
        elif chest > waist * 1.05:
            body_shape = "Hourglass"
        else:
            body_shape = "Rectangle"
        
        # Calculate recommended sizes
        sizes = self.calculate_sizes(shoulder_width, chest, waist, hip_width)
        
        return {
            "success": True,
            "measurements": {
                "shoulder_width": shoulder_width,
                "chest": chest,
                "waist": waist,
                "hip": hip_width,
                "body_shape": body_shape
            },
            "sizes": sizes
        }
    
    def calculate_sizes(self, shoulder, chest, waist, hip):
        """
        Calculate recommended clothing sizes based on measurements
        """
        sizes = {
            "shirt": self.get_shirt_size(chest, shoulder),
            "pants": self.get_pants_size(waist, hip),
            "jacket": self.get_jacket_size(chest)
        }
        return sizes
    
    def get_shirt_size(self, chest, shoulder):
        """Determine shirt size based on chest and shoulder"""
        if chest < 85:
            return "XS"
        elif chest < 95:
            return "S"
        elif chest < 105:
            return "M"
        elif chest < 115:
            return "L"
        elif chest < 125:
            return "XL"
        else:
            return "XXL"
    
    def get_pants_size(self, waist, hip):
        """Determine pants size based on waist and hip"""
        waist_avg = (waist + hip) / 2
        if waist_avg < 70:
            return "28"
        elif waist_avg < 80:
            return "30"
        elif waist_avg < 90:
            return "32"
        elif waist_avg < 100:
            return "34"
        elif waist_avg < 110:
            return "36"
        else:
            return "38"
    
    def get_jacket_size(self, chest):
        """Determine jacket size based on chest"""
        if chest < 85:
            return "XS"
        elif chest < 95:
            return "S"
        elif chest < 105:
            return "M"
        elif chest < 115:
            return "L"
        elif chest < 125:
            return "XL"
        else:
            return "XXL"
    
    def validate_full_body(self, image_bytes):
        """
        Check if the image shows a full body
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return False, "Could not process image"
        
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img_rgb.shape[:2]
        
        results = self.pose.process(img_rgb)
        
        if not results.pose_landmarks:
            return False, "No body detected"
        
        landmarks = results.pose_landmarks.landmark
        
        # Check for key points: nose (top), ankles (bottom)
        nose = landmarks[0]
        left_ankle = landmarks[27]
        right_ankle = landmarks[28]
        
        # Body should span most of the image height
        body_height = abs(left_ankle.y - nose.y)
        
        if body_height < 0.5:
            return False, "Please capture your full body in the photo"
        
        return True, "Full body detected"


# Initialize analyzer
analyzer = BodyAnalyzer()
