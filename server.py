"""
Flask Backend Server for ClothFit
Handles API requests for body analysis and user management
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sqlite3
import uuid
from datetime import datetime
from analysis import analyzer
import json

app = Flask(__name__)
CORS(app, 
     resources={r"/analyze": {"origins": "*", "methods": ["POST", "OPTIONS"]},
               r"/check-user": {"origins": "*", "methods": ["POST", "OPTIONS"]},
               r"/get-profile/*": {"origins": "*", "methods": ["GET", "OPTIONS"]},
               r"/update-profile": {"origins": "*", "methods": ["POST", "OPTIONS"]},
               r"/update-measurements": {"origins": "*", "methods": ["POST", "OPTIONS"]},
               r"/get-user/*": {"origins": "*", "methods": ["GET", "OPTIONS"]}},
     allow_headers=["Content-Type"],
     methods=["GET", "POST", "OPTIONS"])

# Configuration
UPLOAD_FOLDER = 'uploads'
DATABASE = 'users.db'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create upload folder if not exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def init_database():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  email TEXT,
                  phone TEXT,
                  gender TEXT,
                  age INTEGER,
                  preferred_category TEXT,
                  photo_path TEXT,
                  measurements TEXT,
                  sizes TEXT,
                  created_at TEXT)''')
    conn.commit()
    conn.close()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_user_data(user_data):
    """Save user data to database"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO users 
                 (id, name, email, phone, gender, age, preferred_category, 
                  photo_path, measurements, sizes, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (user_data['id'], user_data['name'], user_data['email'],
               user_data['phone'], user_data['gender'], user_data['age'],
               user_data['preferred_category'], user_data['photo_path'],
               json.dumps(user_data['measurements']), 
               json.dumps(user_data['sizes']),
               user_data['created_at']))
    conn.commit()
    conn.close()


@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, images)"""
    return send_from_directory('.', filename)


@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    """
    Main analysis endpoint
    1. Validate image quality (blur detection)
    2. Check for full body
    3. Extract body measurements
    4. Calculate recommended sizes
    """
    # Handle preflight OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # Check if image is present
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo provided'}), 400
        
        file = request.files['photo']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload JPG or PNG'}), 400
        
        # Read image bytes
        image_bytes = file.read()
        
        # Step 1: Check for blur
        is_blurry, blur_score = analyzer.detect_blur(image_bytes)
        if is_blurry:
            return jsonify({
                'error': 'Photo is blurry',
                'message': 'Please upload a clearer photo with better lighting',
                'blur_score': blur_score
            }), 400
        
        # Step 2: Validate full body
        is_valid, validation_message = analyzer.validate_full_body(image_bytes)
        if not is_valid:
            return jsonify({
                'error': validation_message,
                'message': 'Please ensure your full body is visible in the photo'
            }), 400
        
        # Step 3: Analyze body measurements
        result = analyzer.analyze_body(image_bytes)
        
        if 'error' in result:
            return jsonify({
                'error': result['error'],
                'message': result.get('message', 'Please try again with a better photo')
            }), 400
        
        # Save user data
        user_id = str(uuid.uuid4())
        
        # Get form data
        age_value = request.form.get('age', '0')
        user_data = {
            'id': user_id,
            'name': request.form.get('name', ''),
            'email': request.form.get('email', ''),
            'phone': request.form.get('phone', ''),
            'gender': request.form.get('gender', ''),
            'age': int(age_value) if age_value.isdigit() else 0,
            'preferred_category': request.form.get('preferred_category', 'casual'),
            'photo_path': '',
            'measurements': result['measurements'],
            'sizes': result['sizes'],
            'created_at': datetime.now().isoformat()
        }
        
        # Save image
        filename = f"{user_id}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        user_data['photo_path'] = filepath
        
        # Save to database
        save_user_data(user_data)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'measurements': result['measurements'],
            'sizes': result['sizes']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get-user/<user_id>', methods=['GET'])
def get_user(user_id):
    """Retrieve user data by ID"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            columns = ['id', 'name', 'email', 'phone', 'gender', 'age', 
                      'preferred_category', 'photo_path', 'measurements', 
                      'sizes', 'created_at']
            user_data = dict(zip(columns, row))
            user_data['measurements'] = json.loads(user_data['measurements'])
            user_data['sizes'] = json.loads(user_data['sizes'])
            return jsonify(user_data)
        else:
            return jsonify({'error': 'User not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded images"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/update-measurements', methods=['POST', 'OPTIONS'])
def update_measurements():
    """Update user measurements and sizes"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        measurements = data.get('measurements')
        sizes = data.get('sizes')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('''UPDATE users 
                     SET measurements = ?, sizes = ?
                     WHERE id = ?''',
                  (json.dumps(measurements), json.dumps(sizes), user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Measurements updated successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/check-user', methods=['POST', 'OPTIONS'])
def check_user():
    """Check if user exists by email"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'exists': False}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT id, name, email FROM users WHERE email = ?", (email,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return jsonify({
                'exists': True,
                'user_id': row[0],
                'name': row[1],
                'email': row[2]
            })
        else:
            return jsonify({'exists': False})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/get-profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    """Get user profile data"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            columns = ['id', 'name', 'email', 'phone', 'gender', 'age', 
                      'preferred_category', 'photo_path', 'measurements', 
                      'sizes', 'created_at']
            user_data = dict(zip(columns, row))
            user_data['measurements'] = json.loads(user_data['measurements'])
            user_data['sizes'] = json.loads(user_data['sizes'])
            return jsonify(user_data)
        else:
            return jsonify({'error': 'User not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/update-profile', methods=['POST', 'OPTIONS'])
def update_profile():
    """Update user profile data"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        
        # Build dynamic update query
        update_fields = []
        values = []
        
        if 'name' in data:
            update_fields.append('name = ?')
            values.append(data['name'])
        if 'email' in data:
            update_fields.append('email = ?')
            values.append(data['email'])
        if 'phone' in data:
            update_fields.append('phone = ?')
            values.append(data['phone'])
        if 'gender' in data:
            update_fields.append('gender = ?')
            values.append(data['gender'])
        if 'age' in data:
            update_fields.append('age = ?')
            values.append(data['age'])
        if 'preferred_category' in data:
            update_fields.append('preferred_category = ?')
            values.append(data['preferred_category'])
        
        if update_fields:
            values.append(user_id)
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
            c.execute(query, values)
            conn.commit()
        
        conn.close()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    init_database()
    print("ClothFit Server running on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
