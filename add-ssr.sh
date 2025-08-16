#!/bin/bash
# Script to add Angular Universal SSR to the project

echo "Adding Angular Universal SSR..."
cd /Users/shivamsinghtomar/Documents/projects/pi-ui

# Add Angular Universal
ng add @nguniversal/express-engine --skip-confirmation

echo "SSR setup complete!"