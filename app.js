/**
 * ClothFit - Frontend JavaScript
 * Handles form navigation, photo upload, camera capture, and API communication
 */

// Global variables
let currentStep = 1;
let uploadedPhoto = null;
let cameraStream = null;
let userData = null;
let currentUserId = null;
let isProfileEditMode = false;
let isMeasurementsEditMode = false;

// DOM Elements
const formSteps = document.querySelectorAll('.form-step');
const progressSteps = document.querySelectorAll('.progress-step');
const uploadZone = document.getElementById('upload-zone');
const photoInput = document.getElementById('photo-input');
const previewContainer = document.getElementById('preview-container');
const previewImg = document.getElementById('photo-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const analyzeBtn = document.getElementById('analyze-btn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const cameraModal = document.getElementById('camera-modal');
const cameraFeed = document.getElementById('camera-feed');
const cameraCanvas = document.getElementById('camera-canvas');
const captureBtn = document.getElementById('capture-btn');

// Global flag to track analysis state
let isAnalyzing = false;

// Initialize - run immediately to catch all events
(function() {
    document.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submission prevented');
        return false;
    }, true);
    
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            console.log('Button clicked:', e.target.id || e.target.className);
        }
    }, true);
    
    // Prevent any default form behavior
    window.addEventListener('beforeunload', function(e) {
        if (isAnalyzing) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
})();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadZone();
    initializeFormValidation();
    initializeIntroAnimation();
});

// ============================================
// Intro Animation
// ============================================

function initializeIntroAnimation() {
    const introScreen = document.getElementById('intro-screen');
    setTimeout(function() {
        introScreen.classList.add('hidden');
    }, 2500);
}

// ============================================
// Navigation Functions
// ============================================

function goToStep(step) {
    if (step === 2 && !validateStep1()) {
        return;
    }
    
    formSteps.forEach(function(formStep, index) {
        formStep.classList.toggle('active', index + 1 === step);
    });
    
    progressSteps.forEach(function(progressStep, index) {
        const stepNum = index + 1;
        progressStep.classList.remove('active', 'completed');
        if (stepNum < step) {
            progressStep.classList.add('completed');
            progressStep.querySelector('.step-circle').textContent = '✓';
        } else if (stepNum === step) {
            progressStep.classList.add('active');
            progressStep.querySelector('.step-circle').textContent = stepNum;
        } else {
            progressStep.querySelector('.step-circle').textContent = stepNum;
        }
    });
    
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep1() {
    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value;
    
    if (!name) {
        showError('Please enter your full name');
        document.getElementById('name').focus();
        return false;
    }
    
    if (!gender) {
        showError('Please select your gender');
        document.getElementById('gender').focus();
        return false;
    }
    
    hideError();
    return true;
}

// ============================================
// Upload Zone Functions
// ============================================

function initializeUploadZone() {
    uploadZone.addEventListener('click', function() {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', handleFileSelect);
    
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function() {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload a valid image (JPG, PNG, or GIF)');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showError('Image size should be less than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedPhoto = e.target.result;
        previewImg.src = uploadedPhoto;
        uploadPlaceholder.style.display = 'none';
        previewContainer.style.display = 'block';
        analyzeBtn.disabled = false;
        hideError();
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    uploadedPhoto = null;
    photoInput.value = '';
    previewContainer.style.display = 'none';
    uploadPlaceholder.style.display = 'block';
    analyzeBtn.disabled = true;
}

// ============================================
// Camera Functions
// ============================================

function openCamera() {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(function(stream) {
        cameraStream = stream;
        cameraFeed.srcObject = stream;
        cameraModal.classList.add('active');
    })
    .catch(function(err) {
        showError('Could not access camera. Please use file upload instead.');
        console.error('Camera error:', err);
    });
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(function(track) { track.stop(); });
        cameraStream = null;
    }
    cameraModal.classList.remove('active');
}

captureBtn.addEventListener('click', function() {
    const context = cameraCanvas.getContext('2d');
    cameraCanvas.width = cameraFeed.videoWidth;
    cameraCanvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0);
    
    const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);
    uploadedPhoto = dataUrl;
    previewImg.src = uploadedPhoto;
    uploadPlaceholder.style.display = 'none';
    previewContainer.style.display = 'block';
    analyzeBtn.disabled = false;
    
    closeCamera();
    hideError();
});

// ============================================
// Analysis Functions
// ============================================

function analyzePhoto(event) {
    // Prevent default behavior to avoid page reload
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (isAnalyzing) {
        console.log('Already analyzing, ignoring click');
        return false;
    }
    
    if (!uploadedPhoto) {
        showError('Please upload a photo first');
        return false;
    }
    
    isAnalyzing = true;
    
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    analyzeBtn.disabled = true;
    
    updateLoadingStep('Uploading photo...');
    
    const formData = new FormData();
    formData.append('photo', dataURLtoBlob(uploadedPhoto), 'photo.jpg');
    formData.append('name', document.getElementById('name').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('gender', document.getElementById('gender').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('preferred_category', document.getElementById('preferred_category').value);
    
    fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        body: formData
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }
        return response.json();
    })
    .then(function(result) {
        updateLoadingStep('Extracting body measurements...');
        
        // Store user ID and email in localStorage
        if (result.user_id) {
            currentUserId = result.user_id;
            localStorage.setItem('clothfit_user_id', result.user_id);
            localStorage.setItem('clothfit_email', document.getElementById('email').value);
        }
        
        userData = result;
        
        // Display results first, then navigate to step 3
        displayResults(result);
        goToStep(3);
        
        // Hide loading and reset state
        loadingDiv.style.display = 'none';
        analyzeBtn.disabled = false;
        isAnalyzing = false;
    })
    .catch(function(error) {
        loadingDiv.style.display = 'none';
        analyzeBtn.disabled = false;
        isAnalyzing = false;
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError('Cannot connect to server. Please make sure the backend is running.');
        } else {
            showError(error.message);
        }
    });
    
    return false;
}

function updateLoadingStep(text) {
    document.getElementById('loading-step').textContent = text;
}

function displayResults(data) {
    const measurements = data.measurements;
    const sizes = data.sizes;
    
    document.getElementById('body-shape').textContent = measurements.body_shape;
    document.getElementById('shoulder-width').textContent = measurements.shoulder_width;
    document.getElementById('chest').textContent = measurements.chest;
    document.getElementById('waist').textContent = measurements.waist;
    document.getElementById('hip').textContent = measurements.hip;
    
    document.getElementById('shirt-size').textContent = sizes.shirt;
    document.getElementById('pants-size').textContent = sizes.pants;
    document.getElementById('jacket-size').textContent = sizes.jacket;
}

function startShopping() {
    showPage('shopping');
}

// ============================================
// Edit Results Functions
// ============================================

let isEditMode = false;

function getShirtSize(chest, shoulder) {
    if (chest < 85) return "XS";
    else if (chest < 95) return "S";
    else if (chest < 105) return "M";
    else if (chest < 115) return "L";
    else if (chest < 125) return "XL";
    else return "XXL";
}

function getPantsSize(waist, hip) {
    const waist_avg = (waist + hip) / 2;
    if (waist_avg < 70) return "28";
    else if (waist_avg < 80) return "30";
    else if (waist_avg < 90) return "32";
    else if (waist_avg < 100) return "34";
    else if (waist_avg < 110) return "36";
    else return "38";
}

function getJacketSize(chest) {
    if (chest < 85) return "XS";
    else if (chest < 95) return "S";
    else if (chest < 105) return "M";
    else if (chest < 115) return "L";
    else if (chest < 125) return "XL";
    else return "XXL";
}

function recalculateBodyShape(shoulderWidth, chest, waist, hip) {
    const shoulderToHipRatio = shoulderWidth / hip;
    
    if (shoulderToHipRatio > 1.2) return "Inverted Triangle";
    else if (shoulderToHipRatio < 0.9) return "Pear";
    else if (chest > waist * 1.05) return "Hourglass";
    else return "Rectangle";
}

function recalculateSizes() {
    const shoulder = parseFloat(document.getElementById('shoulder-width-edit').value) || 0;
    const chest = parseFloat(document.getElementById('chest-edit').value) || 0;
    const waist = parseFloat(document.getElementById('waist-edit').value) || 0;
    const hip = parseFloat(document.getElementById('hip-edit').value) || 0;
    
    const newBodyShape = recalculateBodyShape(shoulder, chest, waist, hip);
    document.getElementById('body-shape-edit').value = newBodyShape;
    
    const newShirtSize = getShirtSize(chest, shoulder);
    const newPantsSize = getPantsSize(waist, hip);
    const newJacketSize = getJacketSize(chest);
    
    document.getElementById('shirt-size-edit').value = newShirtSize;
    document.getElementById('pants-size-edit').value = newPantsSize;
    document.getElementById('jacket-size-edit').value = newJacketSize;
    
    return {
        body_shape: newBodyShape,
        shirt: newShirtSize,
        pants: newPantsSize,
        jacket: newJacketSize
    };
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('edit-btn');
    const editActions = document.getElementById('edit-actions');
    const editInputs = document.querySelectorAll('.edit-input');
    
    if (isEditMode) {
        editBtn.textContent = '✏️ Editing...';
        editActions.style.display = 'flex';
        editInputs.forEach(function(input) { input.style.display = 'inline-block'; });
        
        document.getElementById('body-shape-edit').value = document.getElementById('body-shape').textContent;
        document.getElementById('shoulder-width-edit').value = document.getElementById('shoulder-width').textContent;
        document.getElementById('chest-edit').value = document.getElementById('chest').textContent;
        document.getElementById('waist-edit').value = document.getElementById('waist').textContent;
        document.getElementById('hip-edit').value = document.getElementById('hip').textContent;
        document.getElementById('shirt-size-edit').value = document.getElementById('shirt-size').textContent;
        document.getElementById('pants-size-edit').value = document.getElementById('pants-size').textContent;
        document.getElementById('jacket-size-edit').value = document.getElementById('jacket-size').textContent;
        
        document.getElementById('shoulder-width-edit').addEventListener('input', recalculateSizes);
        document.getElementById('chest-edit').addEventListener('input', recalculateSizes);
        document.getElementById('waist-edit').addEventListener('input', recalculateSizes);
        document.getElementById('hip-edit').addEventListener('input', recalculateSizes);
    } else {
        editBtn.textContent = '✏️ Edit';
        editActions.style.display = 'none';
        editInputs.forEach(function(input) { input.style.display = 'none'; });
        
        document.getElementById('shoulder-width-edit').removeEventListener('input', recalculateSizes);
        document.getElementById('chest-edit').removeEventListener('input', recalculateSizes);
        document.getElementById('waist-edit').removeEventListener('input', recalculateSizes);
        document.getElementById('hip-edit').removeEventListener('input', recalculateSizes);
    }
}

function cancelEdit() {
    isEditMode = false;
    document.getElementById('edit-btn').textContent = '✏️ Edit';
    document.getElementById('edit-actions').style.display = 'none';
    document.querySelectorAll('.edit-input').forEach(function(input) { input.style.display = 'none'; });
    
    document.getElementById('shoulder-width-edit').removeEventListener('input', recalculateSizes);
    document.getElementById('chest-edit').removeEventListener('input', recalculateSizes);
    document.getElementById('waist-edit').removeEventListener('input', recalculateSizes);
    const calculatedSizes = recalculateSizes();
    
    document.getElementById('body-shape').textContent = calculatedSizes.body_shape;
    document.getElementById('shoulder-width').textContent = document.getElementById('shoulder-width-edit').value;
    document.getElementById('chest').textContent = document.getElementById('chest-edit').value;
    document.getElementById('waist').textContent = document.getElementById('waist-edit').value;
    document.getElementById('hip').textContent = document.getElementById('hip-edit').value;
    
    document.getElementById('shirt-size').textContent = calculatedSizes.shirt;
    document.getElementById('pants-size').textContent = calculatedSizes.pants;
    document.getElementById('jacket-size').textContent = calculatedSizes.jacket;
    
    if (userData && userData.user_id) {
        fetch('http://127.0.0.1:5000/update-measurements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userData.user_id,
                measurements: {
                    body_shape: document.getElementById('body-shape').textContent,
                    shoulder_width: parseFloat(document.getElementById('shoulder-width').textContent),
                    chest: parseFloat(document.getElementById('chest').textContent),
                    waist: parseFloat(document.getElementById('waist').textContent),
                    hip: parseFloat(document.getElementById('hip').textContent)
                },
                sizes: {
                    shirt: document.getElementById('shirt-size').textContent,
                    pants: document.getElementById('pants-size').textContent,
                    jacket: document.getElementById('jacket-size').textContent
                }
            })
        })
        .then(function(response) {
            if (response.ok) alert('Changes saved successfully!');
        })
        .catch(function() {
            alert('Changes saved locally.');
        });
    }
    
    isEditMode = false;
    document.getElementById('edit-btn').textContent = '✏️ Edit';
    document.getElementById('edit-actions').style.display = 'none';
    document.querySelectorAll('.edit-input').forEach(function(input) { input.style.display = 'none'; });
    
    document.getElementById('shoulder-width-edit').removeEventListener('input', recalculateSizes);
    document.getElementById('chest-edit').removeEventListener('input', recalculateSizes);
    document.getElementById('waist-edit').removeEventListener('input', recalculateSizes);
    document.getElementById('hip-edit').removeEventListener('input', recalculateSizes);
}

// ============================================
// Utility Functions
// ============================================

function showError(message) {
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
}

function hideError() {
    errorDiv.style.display = 'none';
}

function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; i++) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
}

function initializeFormValidation() {
    const form = document.getElementById('details-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
    });
    
    document.getElementById('name').addEventListener('input', hideError);
    document.getElementById('gender').addEventListener('change', hideError);
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && cameraModal.classList.contains('active')) {
        closeCamera();
    }
});

// ============================================
// Page Navigation Functions
// ============================================

function showPage(pageName) {
    var mainContainer = document.getElementById('main-container');
    var profilePage = document.getElementById('profile-page');
    var shoppingPage = document.getElementById('shopping-page');
    
    mainContainer.style.display = 'none';
    profilePage.style.display = 'none';
    shoppingPage.style.display = 'none';
    
    if (pageName === 'home') {
        mainContainer.style.display = 'block';
    } else if (pageName === 'profile') {
        profilePage.style.display = 'block';
        loadProfile();
    } else if (pageName === 'shopping') {
        shoppingPage.style.display = 'block';
        loadShoppingPage();
    }
}

// ============================================
// Profile Functions
// ============================================

function loadProfile() {
    if (!currentUserId) {
        var savedUserId = localStorage.getItem('clothfit_user_id');
        if (savedUserId) {
            currentUserId = savedUserId;
        } else {
            alert('No user found. Please start from the home page.');
            showPage('home');
            return;
        }
    }
    
    fetch('http://127.0.0.1:5000/get-profile/' + currentUserId)
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.error) {
            alert('Error loading profile: ' + data.error);
            return;
        }
        
        document.getElementById('profile-name').textContent = 'Welcome, ' + (data.name || 'User');
        document.getElementById('profile-email').textContent = data.email || 'No email';
        
        // Set profile photo
        if (data.photo_path) {
            var photoUrl = 'http://127.0.0.1:5000/uploads/' + data.id + '.jpg';
            var avatarImg = document.getElementById('profile-avatar-img');
            var avatarIcon = document.getElementById('profile-avatar-icon');
            avatarImg.src = photoUrl;
            avatarImg.onload = function() {
                avatarImg.style.display = 'block';
                avatarIcon.style.display = 'none';
            };
            
            // Set top-bar avatars (profile page and shop page)
            var topbarIds = [
                ['topbar-profile-img', 'topbar-profile-icon'],
                ['topbar-shop-profile-img', 'topbar-shop-profile-icon']
            ];
            topbarIds.forEach(function(pair) {
                var img = document.getElementById(pair[0]);
                var icon = document.getElementById(pair[1]);
                if (img && icon) {
                    img.src = photoUrl;
                    img.onload = function() {
                        img.style.display = 'block';
                        icon.style.display = 'none';
                    };
                }
            });
        }
        document.getElementById('profile-name-value').textContent = data.name || '-';
        document.getElementById('profile-email-value').textContent = data.email || '-';
        document.getElementById('profile-phone-value').textContent = data.phone || '-';
        document.getElementById('profile-gender-value').textContent = data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : '-';
        document.getElementById('profile-age-value').textContent = data.age || '-';
        document.getElementById('profile-style-value').textContent = data.preferred_category ? data.preferred_category.charAt(0).toUpperCase() + data.preferred_category.slice(1) : '-';
        
        if (data.measurements) {
            document.getElementById('profile-body-shape').textContent = data.measurements.body_shape || '-';
            document.getElementById('profile-shoulder').textContent = (data.measurements.shoulder_width || '-') + ' cm';
            document.getElementById('profile-chest').textContent = (data.measurements.chest || '-') + ' cm';
            document.getElementById('profile-waist').textContent = (data.measurements.waist || '-') + ' cm';
            document.getElementById('profile-hip').textContent = (data.measurements.hip || '-') + ' cm';
        }
        
        if (data.sizes) {
            document.getElementById('profile-shirt-size').textContent = data.sizes.shirt || '-';
            document.getElementById('profile-pants-size').textContent = data.sizes.pants || '-';
            document.getElementById('profile-jacket-size').textContent = data.sizes.jacket || '-';
        }
    })
    .catch(function(error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile data.');
    });
}

function toggleProfileEdit() {
    isProfileEditMode = !isProfileEditMode;
    var editBtn = document.getElementById('btn-edit-profile');
    var profileInfo = document.getElementById('profile-info');
    var profileForm = document.getElementById('profile-edit-form');
    
    if (isProfileEditMode) {
        editBtn.textContent = '✏️ Editing...';
        profileInfo.style.display = 'none';
        profileForm.style.display = 'block';
        
        document.getElementById('edit-name').value = document.getElementById('profile-name-value').textContent;
        document.getElementById('edit-email').value = document.getElementById('profile-email-value').textContent;
        document.getElementById('edit-phone').value = document.getElementById('profile-phone-value').textContent;
        document.getElementById('edit-gender').value = document.getElementById('profile-gender-value').textContent.toLowerCase();
        document.getElementById('edit-age').value = document.getElementById('profile-age-value').textContent;
        document.getElementById('edit-style').value = document.getElementById('profile-style-value').textContent.toLowerCase() || 'casual';
    } else {
        editBtn.textContent = '✏️ Edit';
        profileInfo.style.display = 'block';
        profileForm.style.display = 'none';
    }
}

function cancelProfileEdit() {
    isProfileEditMode = false;
    document.getElementById('btn-edit-profile').textContent = '✏️ Edit';
    document.getElementById('profile-info').style.display = 'block';
    document.getElementById('profile-edit-form').style.display = 'none';
}

function saveProfile() {
    if (!currentUserId) {
        alert('No user logged in.');
        return;
    }
    
    var profileData = {
        user_id: currentUserId,
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        phone: document.getElementById('edit-phone').value,
        gender: document.getElementById('edit-gender').value,
        age: parseInt(document.getElementById('edit-age').value) || 0,
        preferred_category: document.getElementById('edit-style').value
    };
    
    fetch('http://127.0.0.1:5000/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success) {
            alert('Profile updated successfully!');
            cancelProfileEdit();
            loadProfile();
        } else {
            alert('Error updating profile: ' + data.error);
        }
    })
    .catch(function(error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile data.');
    });
}

function remeasureUser() {
    showPage('home');
    currentStep = 1;
    goToStep(1);
    
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('age').value = '';
    document.getElementById('gender').value = '';
    document.getElementById('preferred_category').value = 'casual';
    removePhoto();
}

// ============================================
// Shopping Functions
// ============================================

var products = [
    { id: 1, name: 'Classic Cotton Shirt', category: 'shirts', price: 49.99, image: '👕', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 2, name: 'Slim Fit Denim Jeans', category: 'pants', price: 79.99, image: '👖', sizes: ['28', '30', '32', '34', '36', '38'] },
    { id: 3, name: 'Wool Blend Jacket', category: 'jackets', price: 149.99, image: '🧥', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 4, name: 'Casual T-Shirt', category: 'shirts', price: 29.99, image: '👕', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 5, name: 'Chino Pants', category: 'pants', price: 59.99, image: '👖', sizes: ['28', '30', '32', '34', '36', '38'] },
    { id: 6, name: 'Leather Jacket', category: 'jackets', price: 299.99, image: '🧥', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 7, name: 'Formal Dress Shirt', category: 'shirts', price: 69.99, image: '👔', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 8, name: 'Cargo Pants', category: 'pants', price: 54.99, image: '👖', sizes: ['28', '30', '32', '34', '36', '38'] },
    { id: 9, name: 'Bomber Jacket', category: 'jackets', price: 119.99, image: '🧥', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 10, name: 'Polo Shirt', category: 'shirts', price: 39.99, image: '👕', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 11, name: 'Joggers', category: 'pants', price: 44.99, image: '👖', sizes: ['28', '30', '32', '34', '36', '38'] },
    { id: 12, name: 'Rain Jacket', category: 'jackets', price: 89.99, image: '🧥', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }
];

var currentFilter = 'all';
var userSizes = {};

function loadShoppingPage() {
    if (!currentUserId) {
        var savedUserId = localStorage.getItem('clothfit_user_id');
        if (savedUserId) {
            currentUserId = savedUserId;
        }
    }
    
    if (!currentUserId) {
        alert('No user found. Please start from the home page.');
        showPage('home');
        return;
    }
    
    fetch('http://127.0.0.1:5000/get-profile/' + currentUserId)
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.sizes) {
            userSizes = data.sizes;
            document.getElementById('shop-shirt-size').textContent = data.sizes.shirt || '-';
            document.getElementById('shop-pants-size').textContent = data.sizes.pants || '-';
            document.getElementById('shop-jacket-size').textContent = data.sizes.jacket || '-';
        }
        displayProducts(allProducts);
    })
    .catch(function(error) {
        console.error('Error loading shopping page:', error);
        // Still display products even if profile fetch fails
        displayProducts(allProducts);
    });
}

function displayProducts(productsToShow) {
    var grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    productsToShow.forEach(function(product) {
        var card = document.createElement('div');
        card.className = 'product-card';
        
        var recommendedSize = '';
        if (product.category === 'shirts' && userSizes.shirt) recommendedSize = userSizes.shirt;
        else if (product.category === 'pants' && userSizes.pants) recommendedSize = userSizes.pants;
        else if (product.category === 'jackets' && userSizes.jacket) recommendedSize = userSizes.jacket;
        
        var hasRecommendedSize = recommendedSize && product.sizes.includes(recommendedSize);
        
        var sizesHtml = product.sizes.map(function(size) {
            return '<span class="size-badge ' + (size === recommendedSize ? 'recommended' : '') + '">' + size + '</span>';
        }).join('');
        
        var recommendedBadge = hasRecommendedSize ? '<span class="recommended-badge">✓ Your Size</span>' : '';
        
        card.innerHTML = '<div class="product-image">' + product.image + '</div>' +
            '<div class="product-info">' +
            '<h4 class="product-name">' + product.name + '</h4>' +
            '<p class="product-price">$' + product.price.toFixed(2) + '</p>' +
            '<div class="product-sizes">' + sizesHtml + '</div>' +
            recommendedBadge +
            '<button class="btn-add-cart" onclick="addToCart(\'' + product.name + '\')">Add to Cart</button>' +
            '</div>';
        
        grid.appendChild(card);
    });
}

function filterProducts(category) {
    currentFilter = category;
    document.querySelectorAll('.category-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelector('[data-category="' + category + '"]').classList.add('active');
    
    if (category === 'all') {
        displayProducts(products);
    } else {
        displayProducts(products.filter(function(p) { return p.category === category; }));
    }
}

function addToCart(productName) {
    alert(productName + ' added to cart!');
}

// ============================================
// User Detection on Load
// ============================================

function checkExistingUser() {
    var savedEmail = localStorage.getItem('clothfit_email');
    var savedUserId = localStorage.getItem('clothfit_user_id');
    
    if (savedEmail && savedUserId) {
        fetch('http://127.0.0.1:5000/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.exists) {
                currentUserId = data.user_id;
                document.getElementById('name').value = data.name || '';
                document.getElementById('email').value = data.email || '';
                
                fetch('http://127.0.0.1:5000/get-profile/' + currentUserId)
                .then(function(resp) { return resp.json(); })
                .then(function(userData) {
                    if (userData.measurements && userData.sizes) {
                        displayResults({ measurements: userData.measurements, sizes: userData.sizes });
                        userData.user_id = currentUserId;
                        window.userData = userData;
                        showPage('shopping');
                    }
                });
            }
        })
        .catch(function(error) {
            console.error('Error checking user:', error);
        });
    }
}

setTimeout(function() {
    checkExistingUser();
}, 2600);

// ============================================
// Enhanced Shopping with Gender Selection
// ============================================

// Gender-specific products with detailed information
var maleProducts = [
    // TOPS
    { id: 101, name: 'Classic Oxford Button-Down', category: 'tops', gender: 'male', price: 59.99, originalPrice: 79.99, image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], brand: 'Ralph Lauren', description: 'Timeless oxford cloth button-down shirt with a modern fit. Perfect for both casual and formal occasions.', material: '100% Cotton', fit: 'Regular' },
    { id: 102, name: 'Slim Fit Crew Neck T-Shirt', category: 'tops', gender: 'male', price: 29.99, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], brand: 'Calvin Klein', description: 'Essential slim fit t-shirt made from premium cotton. A wardrobe staple for everyday wear.', material: '100% Cotton', fit: 'Slim' },
    { id: 103, name: 'Merino Wool V-Neck Sweater', category: 'tops', gender: 'male', price: 89.99, image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Banff', description: 'Luxuriously soft merino wool v-neck sweater. Temperature regulating and odor resistant.', material: '100% Merino Wool', fit: 'Regular' },
    { id: 104, name: 'Linen Blend Short Sleeve Shirt', category: 'tops', gender: 'male', price: 69.99, image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Tommy Hilfiger', description: 'Lightweight linen blend shirt perfect for summer. Breathable and stylish.', material: '55% Linen, 45% Cotton', fit: 'Relaxed' },
    { id: 105, name: 'Pima Cotton Polo Shirt', category: 'tops', gender: 'male', price: 49.99, image: 'https://images.unsplash.com/photo-1625910513413-5fc30d4c1c05?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], brand: 'Lacoste', description: 'Classic polo shirt crafted from premium Pima cotton. Iconic crocodile embroidery.', material: '100% Pima Cotton', fit: 'Regular' },
    { id: 106, name: 'Graphic Print T-Shirt', category: 'tops', gender: 'male', price: 34.99, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Champion', description: 'Bold graphic print t-shirt with relaxed fit. Made from heavyweight cotton.', material: '100% Cotton', fit: 'Relaxed' },
    
    // Local Shirt Products from photos/shirt/
    { id: 107, name: 'Classic Formal Shirt', category: 'tops', gender: 'male', price: 54.99, image: 'photos/shirt/00055_00.jpg', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], brand: 'ClothFit', description: 'Elegant formal shirt perfect for office wear and special occasions. Premium fabric with crisp finish.', material: '100% Cotton', fit: 'Regular' },
    { id: 108, name: 'Casual Denim Shirt', category: 'tops', gender: 'male', price: 44.99, image: 'photos/shirt/Screenshot 2025-11-14 142245.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'ClothFit', description: 'Versatile denim shirt for casual outings. Soft fabric with modern styling.', material: 'Denim Cotton', fit: 'Relaxed' },
    { id: 109, name: 'Modern Print Shirt', category: 'tops', gender: 'male', price: 49.99, image: 'photos/shirt/Screenshot 2025-11-14 142513.png', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], brand: 'ClothFit', description: 'Stylish printed shirt with contemporary design. Perfect for parties and events.', material: 'Polyester Blend', fit: 'Slim' },
    { id: 110, name: 'Premium Wool Shirt', category: 'tops', gender: 'male', price: 79.99, image: 'photos/shirt/shirt3.webp', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'ClothFit', description: 'Luxurious wool shirt for cold weather. Warm, comfortable, and sophisticated.', material: 'Wool Blend', fit: 'Regular' },
    
    // BOTTOMS
    { id: 201, name: 'Slim Tapered Selvedge Denim', category: 'bottoms', gender: 'male', price: 119.99, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&h=500&fit=crop', sizes: ['28', '30', '32', '34', '36', '38'], brand: 'Levis', description: 'Premium selvedge denim with a slim tapered fit. Raw indigo wash with natural fading.', material: '100% Cotton Selvedge', fit: 'Slim Tapered' },
    { id: 202, name: 'Slim Fit Chinos', category: 'bottoms', gender: 'male', price: 69.99, image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop', sizes: ['28', '30', '32', '34', '36', '38'], brand: 'J.Crew', description: 'Versatile slim fit chinos in stretch cotton twill. Perfect for work or weekend.', material: '98% Cotton, 2% Elastane', fit: 'Slim' },
    { id: 203, name: 'Athletic Joggers', category: 'bottoms', gender: 'male', price: 54.99, image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Nike', description: 'Comfortable athletic joggers with tapered leg. Soft fleece interior.', material: '80% Cotton, 20% Polyester', fit: 'Athletic' },
    { id: 204, name: 'Pleated Dress Pants', category: 'bottoms', gender: 'male', price: 89.99, image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop', sizes: ['28', '30', '32', '34', '36', '38'], brand: 'Brooks Brothers', description: 'Classic pleated dress pants in wool blend. Timeless styling for formal occasions.', material: '55% Wool, 45% Polyester', fit: 'Classic' },
    { id: 205, name: 'Cargo Utility Pants', category: 'bottoms', gender: 'male', price: 64.99, image: 'https://images.unsplash.com/photo-1517445312882-16a2b7245842?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Carhartt', description: 'Durable cargo pants with multiple pockets. Rugged workwear inspired design.', material: '100% Cotton Duck', fit: 'Relaxed' },
    { id: 206, name: 'Swim Shorts', category: 'bottoms', gender: 'male', price: 44.99, image: 'https://images.unsplash.com/photo-1523354827774-c5c7d8e5c4e4?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Vilebrequin', description: 'Quick-dry swim shorts with signature prints. Mid-length for classic style.', material: '100% Polyester', fit: 'Regular' },
    
    // OUTERWEAR
    { id: 301, name: 'Wool Blend Peacoat', category: 'outerwear', gender: 'male', price: 249.99, originalPrice: 349.99, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Burberry', description: 'Classic double-breasted wool peacoat. Timeless military-inspired design.', material: '80% Wool, 20% Polyamide', fit: 'Classic' },
    { id: 302, name: 'Quilted Nylon Vest', category: 'outerwear', gender: 'male', price: 99.99, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Patagonia', description: 'Lightweight quilted vest for layering. Recycled polyester insulation.', material: '100% Recycled Nylon', fit: 'Regular' },
    { id: 303, name: 'Leather Biker Jacket', category: 'outerwear', gender: 'male', price: 399.99, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL'], brand: 'Schott', description: 'Iconic leather biker jacket with asymmetric zipper. Premium lambskin leather.', material: '100% Lambskin Leather', fit: 'Slim' },
    { id: 304, name: 'Canvas Work Jacket', category: 'outerwear', gender: 'male', price: 129.99, image: 'https://images.unsplash.com/photo-1559551409-dadc959f76b8?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Dickies', description: 'Durable canvas work jacket with blanket lining. Industrial heritage design.', material: '100% Cotton Canvas', fit: 'Relaxed' },
    { id: 305, name: 'Puffer Jacket', category: 'outerwear', gender: 'male', price: 179.99, image: 'https://images.unsplash.com/photo-1544923246-77307dd628b4?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Canada Goose', description: 'High-fill power down puffer for extreme warmth. Water-resistant shell.', material: '80% Down, 20% Feathers', fit: 'Regular' },
    { id: 306, name: 'Denim Trucker Jacket', category: 'outerwear', gender: 'male', price: 89.99, image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&h=500&fit=crop', sizes: ['S', 'M', 'L', 'XL', 'XXL'], brand: 'Wrangler', description: 'Classic denim trucker jacket with signature details. Vintage-inspired styling.', material: '100% Cotton Denim', fit: 'Regular' },
    
    // ACCESSORIES
    { id: 401, name: 'Leather Dress Belt', category: 'accessories', gender: 'male', price: 49.99, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', sizes: ['S', 'M', 'L', 'XL'], brand: 'Fossil', description: 'Genuine leather dress belt with brushed nickel buckle.', material: 'Full Grain Leather', fit: 'Standard' },
    { id: 402, name: 'Silk Tie Set', category: 'accessories', gender: 'male', price: 79.99, image: 'https://images.unsplash.com/photo-1598522325074-042db73aa4e6?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Hugo Boss', description: 'Set of three silk ties in classic patterns. Perfect for the professional wardrobe.', material: '100% Silk', fit: 'Standard' },
    { id: 403, name: 'Cashmere Scarf', category: 'accessories', gender: 'male', price: 129.99, image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Burberry', description: 'Luxuriously soft cashmere scarf with classic check pattern.', material: '100% Cashmere', fit: 'Standard' },
    { id: 404, name: 'Leather Messenger Bag', category: 'accessories', gender: 'male', price: 199.99, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Samsonite', description: 'Full grain leather messenger bag for laptops up to 15 inches.', material: 'Full Grain Leather', fit: 'Standard' }
];

var femaleProducts = [
    // TOPS
    { id: 501, name: 'Silk Blouse', category: 'tops', gender: 'female', price: 129.99, image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Equipment', description: 'Luxurious silk blouse with relaxed fit. French cuff details.', material: '100% Silk', fit: 'Relaxed' },
    { id: 502, name: 'Cropped Cardigan', category: 'tops', gender: 'female', price: 79.99, image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Everlane', description: 'Soft cashmere-blend cropped cardigan. Perfect for layering.', material: 'Cashmere Blend', fit: 'Cropped' },
    { id: 503, name: 'Oversized T-Shirt', category: 'tops', gender: 'female', price: 35.99, image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Acne Studios', description: 'Oversized boxy tee in soft cotton. Minimalist Scandinavian design.', material: '100% Cotton', fit: 'Oversized' },
    { id: 504, name: 'Wrap Top', category: 'tops', gender: 'female', price: 59.99, image: 'https://images.unsplash.com/photo-1564257631407-4deb1f7245842?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Reformation', description: 'Feminine wrap top with adjustable fit. Flowy silhouette.', material: '100% Viscose', fit: 'Relaxed' },
    { id: 505, name: 'Henley Long Sleeve', category: 'tops', gender: 'female', price: 44.99, image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Threads', description: 'Cozy henley in modal blend. Perfect for layering.', material: 'Modal Blend', fit: 'Regular' },
    { id: 506, name: 'Tank Top', category: 'tops', gender: 'female', price: 24.99, image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'J.Crew', description: 'Classic tank top in breathable cotton. Versatile basics.', material: '100% Cotton', fit: 'Regular' },
    
    // BOTTOMS
    { id: 601, name: 'High-Waisted Skinny Jeans', category: 'bottoms', gender: 'female', price: 89.99, image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop', sizes: ['24', '25', '26', '27', '28', '29', '30', '32'], brand: 'Levis', description: 'Classic high-waisted skinny jeans. Vintage-inspired fit.', material: '98% Cotton, 2% Elastane', fit: 'Skinny' },
    { id: 602, name: 'Wide Leg Trousers', category: 'bottoms', gender: 'female', price: 99.99, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'COS', description: 'Elegant wide leg trousers in crepe. Polished minimalist style.', material: '100% Polyester', fit: 'Wide Leg' },
    { id: 603, name: 'Midi Pencil Skirt', category: 'bottoms', gender: 'female', price: 69.99, image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0edd7?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Theory', description: 'Classic pencil skirt in stretch wool. Professional elegance.', material: 'Wool Blend', fit: 'Slim' },
    { id: 604, name: 'High-Rise Leggings', category: 'bottoms', gender: 'female', price: 49.99, image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Lululemon', description: 'High-performance leggings with hidden pocket. Smooth and supportive.', material: 'Nylon Blend', fit: 'High-Rise' },
    { id: 605, name: 'Cargo Pants', category: 'bottoms', gender: 'female', price: 79.99, image: 'https://images.unsplash.com/photo-1517445312882-16a2b7245842?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Madewell', description: 'Relaxed cargo pants with functional pockets. Utility chic.', material: '100% Cotton', fit: 'Relaxed' },
    { id: 606, name: 'Pleated Mini Skirt', category: 'bottoms', gender: 'female', price: 64.99, image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0edd7?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Zara', description: 'Trendy pleated mini skirt in metallic fabric. Party-ready style.', material: 'Polyester Blend', fit: 'A-Line' },
    
    // OUTERWEAR
    { id: 701, name: 'Trench Coat', category: 'outerwear', gender: 'female', price: 299.99, image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Burberry', description: 'Iconic trench coat with signature check. Belted double-breasted design.', material: 'Gabardine Cotton', fit: 'Regular' },
    { id: 702, name: 'Cropped Denim Jacket', category: 'outerwear', gender: 'female', price: 89.99, image: 'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Gap', description: 'Classic cropped denim jacket. Timeless wardrobe essential.', material: '100% Cotton Denim', fit: 'Cropped' },
    { id: 703, name: 'Faux Fur Coat', category: 'outerwear', gender: 'female', price: 249.99, image: 'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Sway', description: 'Luxurious faux fur coat. Glamorous statement piece.', material: 'Faux Fur', fit: 'Oversized' },
    { id: 704, name: 'Lightweight Windbreaker', category: 'outerwear', gender: 'female', price: 99.99, image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'The North Face', description: 'Packable windbreaker with hood. Lightweight weather protection.', material: '100% Recycled Polyester', fit: 'Regular' },
    { id: 705, name: 'Blazer', category: 'outerwear', gender: 'female', price: 179.99, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Theory', description: 'Tailored single-breasted blazer. Power dressing essential.', material: 'Wool Blend', fit: 'Slim' },
    { id: 706, name: 'Puffer Jacket', category: 'outerwear', gender: 'female', price: 199.99, image: 'https://images.unsplash.com/photo-1544923246-77307dd628b4?w=400&h=500&fit=crop', sizes: ['XS', 'S', 'M', 'L', 'XL'], brand: 'Moncler', description: 'Short puffer with premium down fill. Chic cold-weather styling.', material: '90% Down, 10% Feathers', fit: 'Regular' },
    
    // ACCESSORIES
    { id: 801, name: 'Leather Tote Bag', category: 'accessories', gender: 'female', price: 249.99, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Cuyana', description: 'Structured leather tote in classic tan. Perfect for everyday.', material: 'Full Grain Leather', fit: 'Standard' },
    { id: 802, name: 'Silk Scarf', category: 'accessories', gender: 'female', price: 89.99, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Hermes', description: 'Iconic silk scarf with vibrant prints. Versatile accessory.', material: '100% Silk', fit: 'Standard' },
    { id: 803, name: 'Statement Earrings', category: 'accessories', gender: 'female', price: 59.99, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop', sizes: ['One Size'], brand: 'Mejuri', description: 'Gold vermeil statement earrings. Everyday luxury.', material: '14k Gold Vermeil', fit: 'Standard' },
    { id: 804, name: 'Leather Belt', category: 'accessories', gender: 'female', price: 69.99, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', sizes: ['S', 'M', 'L'], brand: 'Gucci', description: 'Signature leather belt with gold buckle. Italian craftsmanship.', material: 'Genuine Leather', fit: 'Standard' }
];

// Combine all products
var allProducts = [...maleProducts, ...femaleProducts];

var currentGenderFilter = 'all';
var currentCategoryFilter = 'all';
var selectedProduct = null;

// Gender filter function
function filterByGender(gender) {
    currentGenderFilter = gender;
    
    // Update active button
    document.querySelectorAll('.gender-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelector('[data-gender="' + gender + '"]').classList.add('active');
    
    // Apply filters
    applyFilters();
}

// Override existing filterProducts function
function filterProducts(category) {
    currentCategoryFilter = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    document.querySelector('[data-category="' + category + '"]').classList.add('active');
    
    // Apply filters
    applyFilters();
}

function applyFilters() {
    var filteredProducts = allProducts;
    
    // Filter by gender
    if (currentGenderFilter !== 'all') {
        filteredProducts = filteredProducts.filter(function(p) {
            return p.gender === currentGenderFilter;
        });
    }
    
    // Filter by category
    if (currentCategoryFilter !== 'all') {
        filteredProducts = filteredProducts.filter(function(p) {
            return p.category === currentCategoryFilter;
        });
    }
    
    // Display products
    displayProducts(filteredProducts);
    
    // Show/hide empty state
    var emptyState = document.getElementById('empty-state');
    var productsGrid = document.getElementById('products-grid');
    if (filteredProducts.length === 0) {
        emptyState.style.display = 'block';
        productsGrid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        productsGrid.style.display = 'grid';
    }
}

// Enhanced display products function
function displayProducts(productsToShow) {
    var grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    productsToShow.forEach(function(product) {
        var card = document.createElement('div');
        card.className = 'product-card ' + product.gender;
        
        var recommendedSize = '';
        if (product.category === 'tops' && userSizes.shirt) {
            recommendedSize = userSizes.shirt;
        } else if (product.category === 'bottoms' && userSizes.pants) {
            recommendedSize = userSizes.pants;
        } else if (product.category === 'outerwear' && userSizes.jacket) {
            recommendedSize = userSizes.jacket;
        }
        
        var hasRecommendedSize = recommendedSize && product.sizes.includes(recommendedSize);
        
        // Build sizes HTML
        var sizesHtml = product.sizes.map(function(size) {
            var isRecommended = size === recommendedSize;
            return '<span class="size-badge ' + (isRecommended ? 'recommended' : '') + '">' + size + '</span>';
        }).join('');
        
        // Gender badge
        var genderBadge = '<span class="product-gender-badge ' + product.gender + '">' + product.gender + '</span>';
        
        // Discount badge
        var discountBadge = product.originalPrice ? 
            '<span class="discount-badge">-' + Math.round((1 - product.price / product.originalPrice) * 100) + '%</span>' : '';
        
        var recommendedBadge = hasRecommendedSize ? '<span class="recommended-badge">✓ Your Size</span>' : '';
        
        var priceHtml = product.originalPrice ? 
            '<span class="product-price">$' + product.price.toFixed(2) + '</span><span class="product-price-original">$' + product.originalPrice.toFixed(2) + '</span>' :
            '<span class="product-price">$' + product.price.toFixed(2) + '</span>';
        
        var imageHtml = '';
        if (product.image.startsWith('http') || product.image.startsWith('photos/')) {
            imageHtml = '<img src="' + product.image + '" alt="' + product.name + '" class="product-img" />';
        } else {
            imageHtml = '<span class="product-emoji">' + product.image + '</span>';
        }

        card.innerHTML = '<div class="product-image">' + 
            genderBadge + 
            discountBadge +
            imageHtml + 
            '</div>' +
            '<div class="product-info">' +
            '<p class="product-brand">' + product.brand + '</p>' +
            '<h4 class="product-name">' + product.name + '</h4>' +
            priceHtml +
            '<p class="product-description">' + product.description + '</p>' +
            '<div class="product-sizes">' + sizesHtml + '</div>' +
            recommendedBadge +
            '<button class="btn-add-cart" onclick="addToCart(\'' + product.name.replace(/'/g, "\\'") + '\')">Add to Cart</button>' +
            '</div>';
        
        // Add click event to open full-screen detail
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('btn-add-cart')) {
                openProductDetail(product);
            }
        });
        
        grid.appendChild(card);
        

    });
}

// ============================================
// Full-Screen Product Detail Functions
// ============================================

var selectedDetailSize = null;

function openTryOn(productName) {
    var product = products.find(function(p) { return p.name === productName; });
    if (product) {
        showTryOnModal(product);
    }
}

function startTryOn() {
    if (!selectedProduct) return;
    showTryOnModal(selectedProduct);
}

function showTryOnModal(product) {
    var modal = document.getElementById('tryon-modal');
    document.getElementById('tryon-product-name').textContent = product.brand + ' — ' + product.name;

    var userImg = document.getElementById('tryon-user-img');
    var productImg = document.getElementById('tryon-product-img');
    var noPhotoDiv = document.getElementById('tryon-no-photo');
    var userPhotoDiv = document.getElementById('tryon-user-photo');
    var controlsDiv = document.getElementById('tryon-controls');

    // Set product overlay image
    if (product.image.startsWith('http') || product.image.startsWith('photos/')) {
        productImg.src = product.image;
    } else {
        productImg.src = '';
    }

    // Get user photo
    var savedUserId = currentUserId || localStorage.getItem('clothfit_user_id');
    if (savedUserId) {
        var photoUrl = 'http://127.0.0.1:5000/uploads/' + savedUserId + '.jpg';
        userImg.src = photoUrl;
        userImg.onload = function() {
            userPhotoDiv.style.display = 'block';
            noPhotoDiv.style.display = 'none';
            controlsDiv.style.display = 'flex';
            updateTryOnOverlay();
        };
        userImg.onerror = function() {
            userPhotoDiv.style.display = 'none';
            noPhotoDiv.style.display = 'flex';
            controlsDiv.style.display = 'none';
        };
    } else {
        userPhotoDiv.style.display = 'none';
        noPhotoDiv.style.display = 'flex';
        controlsDiv.style.display = 'none';
    }

    // Reset sliders
    document.getElementById('tryon-size').value = 60;
    document.getElementById('tryon-pos-y').value = 15;
    document.getElementById('tryon-opacity').value = 85;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function updateTryOnOverlay() {
    var overlay = document.getElementById('tryon-product-img');
    var size = document.getElementById('tryon-size').value;
    var posY = document.getElementById('tryon-pos-y').value;
    var opacity = document.getElementById('tryon-opacity').value;

    overlay.style.width = size + '%';
    overlay.style.top = posY + '%';
    overlay.style.opacity = opacity / 100;
}

function closeTryOn() {
    var modal = document.getElementById('tryon-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function openProductDetail(product) {
    selectedProduct = product;
    selectedDetailSize = null;
    var page = document.getElementById('product-detail-page');

    // Image
    var imgWrapper = document.getElementById('detail-image');
    var tryOnBtnHtml = '<button class="img-try-on-btn" onclick="event.stopPropagation(); startTryOn()">👕 Try On</button>';
    if (product.image.startsWith('http') || product.image.startsWith('photos/')) {
        imgWrapper.innerHTML = '<img src="' + product.image + '" alt="' + product.name + '" />' + tryOnBtnHtml;
    } else {
        imgWrapper.innerHTML = '<span class="detail-emoji">' + product.image + '</span>' + tryOnBtnHtml;
    }

    // Badges
    var badgesHtml = '';
    badgesHtml += '<span class="detail-badge gender ' + product.gender + '">' + (product.gender === 'male' ? '♂ Men' : '♀ Women') + '</span>';
    if (product.originalPrice) {
        var pct = Math.round((1 - product.price / product.originalPrice) * 100);
        badgesHtml += '<span class="detail-badge discount">-' + pct + '%</span>';
    }
    // Your-size badge
    var recSize = getRecommendedSize(product);
    if (recSize && product.sizes.includes(recSize)) {
        badgesHtml += '<span class="detail-badge your-size">✓ Your Size: ' + recSize + '</span>';
    }
    document.getElementById('detail-badges').innerHTML = badgesHtml;

    // Text fields
    document.getElementById('detail-brand').textContent = product.brand;
    document.getElementById('detail-name').textContent = product.name;
    document.getElementById('detail-description').textContent = product.description;

    // Price
    var priceHtml = '<span class="detail-current-price">$' + product.price.toFixed(2) + '</span>';
    if (product.originalPrice) {
        priceHtml += '<span class="detail-original-price">$' + product.originalPrice.toFixed(2) + '</span>';
    }
    document.getElementById('detail-price').innerHTML = priceHtml;

    // Specs
    document.getElementById('detail-material').textContent = product.material || '—';
    document.getElementById('detail-fit').textContent = product.fit || '—';
    document.getElementById('detail-category').textContent = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : '—';
    document.getElementById('detail-gender').textContent = product.gender ? product.gender.charAt(0).toUpperCase() + product.gender.slice(1) : '—';

    // Interactive Sizes
    var sizesList = document.getElementById('detail-sizes');
    sizesList.innerHTML = '';
    product.sizes.forEach(function(size) {
        var btn = document.createElement('button');
        btn.className = 'detail-size-btn';
        btn.textContent = size;

        var isRec = size === recSize;
        if (isRec) btn.classList.add('recommended');

        // Auto-select recommended
        if (isRec && !selectedDetailSize) {
            selectedDetailSize = size;
            btn.classList.add('selected');
        }

        btn.addEventListener('click', function() {
            selectedDetailSize = size;
            sizesList.querySelectorAll('.detail-size-btn').forEach(function(b) { b.classList.remove('selected'); });
            btn.classList.add('selected');
        });
        sizesList.appendChild(btn);
    });

    // Recommended note
    var note = document.getElementById('detail-recommended-note');
    note.textContent = recSize ? '★ Recommended size based on your measurements: ' + recSize : '';

    // Reset cart button
    var cartBtn = document.getElementById('detail-add-cart-btn');
    cartBtn.classList.remove('added');
    cartBtn.innerHTML = '<span>🛒</span> Add to Cart';

    // Show page with animation
    page.classList.remove('closing');
    page.classList.add('active');
    page.scrollTop = 0;
    document.body.style.overflow = 'hidden';
}

function closeProductDetail() {
    var page = document.getElementById('product-detail-page');
    page.classList.add('closing');
    page.addEventListener('animationend', function handler() {
        page.classList.remove('active', 'closing');
        page.removeEventListener('animationend', handler);
        document.body.style.overflow = '';
    });
    selectedProduct = null;
    selectedDetailSize = null;
}

function addToCartFromDetail() {
    if (!selectedProduct) return;
    if (!selectedDetailSize) {
        // Flash the sizes section
        var sizesSec = document.querySelector('.detail-sizes-section');
        sizesSec.style.outline = '2px solid var(--accent)';
        sizesSec.style.outlineOffset = '4px';
        setTimeout(function() { sizesSec.style.outline = 'none'; }, 1200);
        return;
    }
    var cartBtn = document.getElementById('detail-add-cart-btn');
    cartBtn.classList.add('added');
    cartBtn.innerHTML = '<span>✓</span> Added — ' + selectedProduct.name + ' (' + selectedDetailSize + ')';
    addToCart(selectedProduct.name);
}

function getRecommendedSize(product) {
    if (product.category === 'tops' && userSizes.shirt) return userSizes.shirt;
    if (product.category === 'bottoms' && userSizes.pants) return userSizes.pants;
    if (product.category === 'outerwear' && userSizes.jacket) return userSizes.jacket;
    return null;
}

// Close detail/try-on on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var tryonModal = document.getElementById('tryon-modal');
        if (tryonModal && tryonModal.classList.contains('active')) {
            closeTryOn();
            return;
        }
        var page = document.getElementById('product-detail-page');
        if (page && page.classList.contains('active')) {
            closeProductDetail();
        }
    }
});
