#!/bin/bash

# Script to create placeholder icon files for the Chrome extension
# This creates simple colored PNG files as placeholders

echo "Creating placeholder icons..."

# Create a simple 16x16 colored square (you can replace this with actual icons later)
# Using ImageMagick (install with: brew install imagemagick on macOS)
if command -v convert &> /dev/null; then
    echo "Creating icons with ImageMagick..."
    
    # Create 16x16 icon
    convert -size 16x16 canvas:"#667eea" icons/icon16.png
    
    # Create 48x48 icon
    convert -size 48x48 canvas:"#667eea" -font Arial -pointsize 24 -fill white -gravity center -annotate +0+0 "S" icons/icon48.png
    
    # Create 128x128 icon
    convert -size 128x128 canvas:"#667eea" -font Arial -pointsize 64 -fill white -gravity center -annotate +0+0 "SCRUM" icons/icon128.png
    
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Please install it with: brew install imagemagick"
    echo "Or manually create the following files in the icons/ directory:"
    echo "  - icon16.png (16x16 pixels)"
    echo "  - icon48.png (48x48 pixels)"
    echo "  - icon128.png (128x128 pixels)"
    echo ""
    echo "You can use any image editor or online tools like:"
    echo "  - https://favicon.io/favicon-generator/"
    echo "  - https://www.canva.com/"
    echo "  - https://iconifier.net/"
fi
