// This script dynamically scans the images directory and creates an index

class ImageScanner {
    constructor() {
        this.images = [];
        this.descriptions = {};
        this.comments = {};
    }

    async scanDirectory() {
        try {
            // Make sure this path matches your directory structure
            const response = await fetch('./images/manifest.json');
            const data = await response.json();
            
            // Convert manifest format to our needed format
            this.images = data.images.map((filename, index) => ({
                id: (index + 1).toString(),
                filename: filename,
                description: "",
                comments: []
            }));
            
            // Load saved data from localStorage
            this.loadSavedData();
            
            return this.images;
        } catch (error) {
            console.error('Error loading manifest:', error);
            return [];
        }
    }

    loadSavedData() {
        // Load saved descriptions
        const savedDescriptions = localStorage.getItem('imageDescriptions');
        if (savedDescriptions) {
            this.descriptions = JSON.parse(savedDescriptions);
            // Apply saved descriptions to images
            this.images.forEach(image => {
                if (this.descriptions[image.id]) {
                    image.description = this.descriptions[image.id];
                }
            });
        }

        // Load saved comments
        const savedComments = localStorage.getItem('imageComments');
        if (savedComments) {
            this.comments = JSON.parse(savedComments);
        }
    }
    
    // Get comments for an image from localStorage
    getComments(imageId) {
        const commentsKey = `image_comments_${imageId}`;
        const storedComments = localStorage.getItem(commentsKey);
        return storedComments ? JSON.parse(storedComments) : [];
    }
    
    // Save a comment for an image to localStorage
    saveComment(imageId, comment) {
        const commentsKey = `image_comments_${imageId}`;
        const comments = this.getComments(imageId);
        comments.push({
            text: comment,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(commentsKey, JSON.stringify(comments));
        return comments;
    }
    
    // Update the description of an image
    updateDescription(imageId, description) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            image.description = description;
            // Save updated descriptions to localStorage
            localStorage.setItem('image_descriptions', JSON.stringify(
                this.images.reduce((acc, img) => {
                    acc[img.id] = img.description;
                    return acc;
                }, {})
            ));
        }
    }
    
    // Load saved descriptions from localStorage
    loadSavedDescriptions() {
        const savedDescriptions = localStorage.getItem('image_descriptions');
        if (savedDescriptions) {
            const descriptions = JSON.parse(savedDescriptions);
            this.images.forEach(image => {
                if (descriptions[image.id]) {
                    image.description = descriptions[image.id];
                }
            });
        }
    }
} 