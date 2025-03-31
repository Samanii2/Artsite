// Main application script

let imageScanner;
let currentIndex = 0;
let filteredImages = [];
let currentRotation = 0;
const rotationStorage = {};
let sortOption = 'name';
let filterOption = 'all';
let isFullscreen = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the image scanner
    imageScanner = new ImageScanner();
    
    // Load images
    const images = await imageScanner.scanDirectory();
    filteredImages = [...images];
    
    // Load any saved descriptions
    imageScanner.loadSavedDescriptions();
    
    // Display the first image
    if (filteredImages.length > 0) {
        displayCurrentImage();
    } else {
        document.getElementById('imageName').textContent = 'No images found';
    }
    
    // Set up event listeners
    setupEventListeners();

    // Load saved rotations from localStorage
    const savedRotations = JSON.parse(localStorage.getItem('imageRotations') || '{}');
    Object.assign(rotationStorage, savedRotations);
});

function displayCurrentImage() {
    if (filteredImages.length === 0) {
        document.getElementById('currentImage').src = '';
        document.getElementById('imageName').textContent = 'No images found';
        document.getElementById('imageDescription').textContent = '';
        document.getElementById('commentsList').innerHTML = '';
        return;
    }

    const image = filteredImages[currentIndex];
    const imgPath = `./images/${image.filename}`;
    
    const img = document.getElementById('currentImage');
    img.onerror = () => {
        console.error('Failed to load image:', imgPath);
        img.alt = 'Failed to load image';
    };

    // Remove the rotating class to disable transition animation
    img.classList.remove('rotating');
    
    // Load the image
    img.src = imgPath;
    
    // Get saved rotation for this image
    currentRotation = rotationStorage[image.id] || 0;
    img.style.transform = `rotate(${currentRotation}deg)`;
    
    document.getElementById('imageName').textContent = image.name;
    document.getElementById('imageDescription').textContent = image.description;
    
    // Load comments for this image
    loadComments(image.id);
}

function loadComments(imageId) {
    const comments = imageScanner.getComments(imageId);
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    } else {
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment">
                <p class="comment-text">${comment.text}</p>
                <p class="comment-date">${new Date(comment.timestamp).toLocaleString()}</p>
            </div>
        `).join('');
    }
}

function setupEventListeners() {
    // Navigation handlers
    document.getElementById('prevButton').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            displayCurrentImage();
        }
    });

    document.getElementById('nextButton').addEventListener('click', () => {
        if (currentIndex < filteredImages.length - 1) {
            currentIndex++;
            displayCurrentImage();
        }
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm.trim()) {
            filteredImages = [...imageScanner.images];
            updateSearchResults(filteredImages.length, imageScanner.images.length);
            currentIndex = 0;
            displayCurrentImage();
            return;
        }

        filteredImages = imageScanner.images.filter(image => {
            const searchableText = [
                image.id,
                image.name.toLowerCase(),
                image.description.toLowerCase(),
                image.filename.toLowerCase()
            ].join(' ');

            return searchTerm.split(' ').every(term => searchableText.includes(term));
        });

        updateSearchResults(filteredImages.length, imageScanner.images.length);
        currentIndex = 0;
        displayCurrentImage();
    });
    
    // Comment submission
    document.getElementById('commentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const commentInput = document.getElementById('commentInput');
        const comment = commentInput.value.trim();
        
        if (comment) {
            const imageId = filteredImages[currentIndex].id;
            imageScanner.saveComment(imageId, comment);
            commentInput.value = '';
            loadComments(imageId);
        }
    });
    
    // Description editing
    document.getElementById('editDescriptionBtn').addEventListener('click', () => {
        const imageId = filteredImages[currentIndex].id;
        const currentDescription = document.getElementById('imageDescription').textContent;
        const newDescription = prompt('Edit description:', currentDescription);
        
        if (newDescription !== null && newDescription.trim() !== '') {
            imageScanner.updateDescription(imageId, newDescription);
            document.getElementById('imageDescription').textContent = newDescription;
        }
    });
    
    // Update keyboard navigation to include rotation
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowLeft':
                document.getElementById('prevButton').click();
                break;
            case 'ArrowRight':
                document.getElementById('nextButton').click();
                break;
            case 'ArrowUp':
                rotateImage('right');
                break;
            case 'ArrowDown':
                rotateImage('left');
                break;
        }
    });

    // Rotation handlers
    document.getElementById('rotateLeftButton').addEventListener('click', () => rotateImage('left'));
    document.getElementById('rotateRightButton').addEventListener('click', () => rotateImage('right'));

    // Sort handler
    document.getElementById('sortBy').addEventListener('change', (e) => {
        sortOption = e.target.value;
        applyFiltersAndSort();
    });

    // Filter handler
    document.getElementById('filterBy').addEventListener('change', (e) => {
        filterOption = e.target.value;
        applyFiltersAndSort();
    });

    // Fullscreen handler
    document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);
}

function updateSearchResults(filteredCount, totalCount) {
    const resultsDiv = document.getElementById('searchResults');
    if (!document.getElementById('searchInput').value.trim()) {
        resultsDiv.textContent = `Showing all ${totalCount} images`;
    } else if (filteredCount === 0) {
        resultsDiv.textContent = 'No matching images found';
    } else {
        resultsDiv.textContent = `Showing ${filteredCount} of ${totalCount} images`;
    }
}

function rotateImage(direction) {
    const img = document.getElementById('currentImage');
    // Add the rotating class before changing transform
    img.classList.add('rotating');
    
    currentRotation += direction === 'left' ? -90 : 90;
    currentRotation = currentRotation % 360;
    
    img.style.transform = `rotate(${currentRotation}deg)`;
    
    // Save the rotation for the current image using image ID instead of URL
    const currentImage = filteredImages[currentIndex];
    rotationStorage[currentImage.id] = currentRotation;
    
    // Save to localStorage
    localStorage.setItem('imageRotations', JSON.stringify(rotationStorage));
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const searchResultsDropdown = document.getElementById('searchResultsDropdown');

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            searchResults.textContent = 'Showing all images';
            searchResultsDropdown.style.display = 'none';
            return;
        }

        const matchedImages = images.filter(image => {
            // Search in description
            const descriptionMatch = image.description && 
                                   image.description.toLowerCase().includes(searchTerm);
            
            // Search in comments
            const commentsMatch = image.comments && 
                                image.comments.some(comment => 
                                    comment.text.toLowerCase().includes(searchTerm));
            
            return descriptionMatch || commentsMatch;
        });

        displaySearchResults(matchedImages, searchTerm);
    });
}

function displaySearchResults(matchedImages, searchTerm) {
    const searchResults = document.getElementById('searchResults');
    const searchResultsDropdown = document.getElementById('searchResultsDropdown');

    if (matchedImages.length === 0) {
        searchResults.textContent = 'No matches found';
        searchResultsDropdown.style.display = 'none';
        return;
    }

    searchResults.textContent = `Found ${matchedImages.length} match${matchedImages.length === 1 ? '' : 'es'}`;
    searchResultsDropdown.innerHTML = '';
    
    matchedImages.forEach(image => {
        const div = document.createElement('div');
        
        // Create preview of where the match was found
        let matchPreview = '';
        if (image.description && image.description.toLowerCase().includes(searchTerm)) {
            matchPreview = `Description: "${getMatchContext(image.description, searchTerm)}"`;
        } else if (image.comments && image.comments.some(c => c.text.toLowerCase().includes(searchTerm))) {
            const matchingComment = image.comments.find(c => c.text.toLowerCase().includes(searchTerm));
            matchPreview = `Comment: "${getMatchContext(matchingComment.text, searchTerm)}"`;
        }

        div.textContent = matchPreview;
        div.addEventListener('click', () => {
            loadImage(image);
            searchResultsDropdown.style.display = 'none';
        });
        
        searchResultsDropdown.appendChild(div);
    });

    searchResultsDropdown.style.display = 'block';
}

// Helper function to get context around the matched term
function getMatchContext(text, searchTerm) {
    const maxLength = 50;
    const lowerText = text.toLowerCase();
    const matchIndex = lowerText.indexOf(searchTerm);
    
    let start = Math.max(0, matchIndex - 20);
    let end = Math.min(text.length, matchIndex + searchTerm.length + 20);
    
    let preview = text.slice(start, end);
    
    if (start > 0) preview = '...' + preview;
    if (end < text.length) preview = preview + '...';
    
    return preview;
}

// Update your loadImage function to handle comments
function loadImage(image) {
    // ... existing image loading code ...
    
    // Update description
    document.getElementById('imageDescription').textContent = image.description || 'No description available';
    
    // Update comments
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    if (image.comments && image.comments.length > 0) {
        image.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.textContent = comment.text;
            commentsList.appendChild(commentDiv);
        });
    } else {
        const noComments = document.createElement('p');
        noComments.textContent = 'No comments yet';
        commentsList.appendChild(noComments);
    }
}

function applyFiltersAndSort() {
    // First apply filters
    filteredImages = imageScanner.images.filter(image => {
        switch (filterOption) {
            case 'withComments':
                return imageScanner.getComments(image.id).length > 0;
            case 'withoutComments':
                return imageScanner.getComments(image.id).length === 0;
            case 'withDescription':
                return image.description && image.description.trim().length > 0;
            case 'withoutDescription':
                return !image.description || image.description.trim().length === 0;
            default:
                return true;
        }
    });

    // Then sort
    filteredImages.sort((a, b) => {
        switch (sortOption) {
            case 'name':
                return a.filename.localeCompare(b.filename);
            case 'date':
                return a.id - b.id;
            case 'comments':
                return imageScanner.getComments(b.id).length - imageScanner.getComments(a.id).length;
            default:
                return 0;
        }
    });

    currentIndex = 0;
    displayCurrentImage();
    updateSearchResults(filteredImages.length, imageScanner.images.length);
}

function toggleFullscreen() {
    const imageContainer = document.querySelector('.image-container');
    const currentImage = document.getElementById('currentImage');

    if (!isFullscreen) {
        // Enter fullscreen
        imageContainer.classList.add('fullscreen');
        document.body.style.overflow = 'hidden';
        
        // Create fullscreen exit button if it doesn't exist
        if (!document.querySelector('.fullscreen-controls')) {
            const controls = document.createElement('div');
            controls.className = 'fullscreen-controls';
            controls.innerHTML = `
                <button class="fullscreen-btn" onclick="toggleFullscreen()">✕ Exit Fullscreen</button>
            `;
            imageContainer.appendChild(controls);
        }
    } else {
        // Exit fullscreen
        imageContainer.classList.remove('fullscreen');
        document.body.style.overflow = '';
        
        // Remove fullscreen controls
        const controls = document.querySelector('.fullscreen-controls');
        if (controls) {
            controls.remove();
        }
    }
    
    isFullscreen = !isFullscreen;
}

// Add keyboard support for fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
    }
}); 