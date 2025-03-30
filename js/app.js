// Main application script

let imageScanner;
let currentIndex = 0;
let filteredImages = [];
let currentRotation = 0;
const rotationStorage = {};

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
    const imgPath = `images/${image.filename}`;
    
    const img = document.getElementById('currentImage');
    img.onerror = () => {
        console.error('Failed to load image:', imgPath);
        img.alt = 'Failed to load image';
    };
    img.src = imgPath;
    
    // Load saved rotation using image ID
    const savedRotations = JSON.parse(localStorage.getItem('imageRotations') || '{}');
    currentRotation = savedRotations[image.id] || 0;
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
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            document.getElementById('prevButton').click();
        } else if (e.key === 'ArrowRight') {
            document.getElementById('nextButton').click();
        }
    });

    // Rotation handlers
    document.getElementById('rotateLeftButton').addEventListener('click', () => rotateImage('left'));
    document.getElementById('rotateRightButton').addEventListener('click', () => rotateImage('right'));
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
    currentRotation += direction === 'left' ? -90 : 90;
    currentRotation = currentRotation % 360;
    
    const img = document.getElementById('currentImage');
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