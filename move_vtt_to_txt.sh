#!/bin/bash

# Script to move all files ending with 'transcript.vtt' to a new folder and change suffix to .txt

# Set the Downloads directory and target directory name
DOWNLOADS_DIR="$HOME/Downloads"
TARGET_DIR="$DOWNLOADS_DIR/vtt_to_txt_converted"

# Create the target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo "Creating directory: $TARGET_DIR"
    mkdir -p "$TARGET_DIR"
fi

# Counter for moved files
moved_count=0

# Find all files ending with 'transcript.vtt' and process them
find "$DOWNLOADS_DIR" -name "*transcript.vtt" -type f | while read -r file; do
    # Get the directory and filename
    dir=$(dirname "$file")
    filename=$(basename "$file")
    
    # Create new filename by replacing .vtt with .txt
    new_filename="${filename%.vtt}.txt"
    
    # Create the full path for the new file
    new_file_path="$TARGET_DIR/$new_filename"
    
    # Move the file and rename it
    if mv "$file" "$new_file_path"; then
        echo "Moved: $file -> $new_file_path"
        ((moved_count++))
    else
        echo "Error: Failed to move $file"
    fi
done

echo "Script completed. Moved $moved_count files to $TARGET_DIR/"
