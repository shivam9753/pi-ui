import { CommonModule, JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-json-converter',
  imports: [FormsModule, JsonPipe, ReactiveFormsModule, CommonModule] ,
  templateUrl: './json-converter.component.html',
  styleUrls: ['./json-converter.component.css']
})
export class JsonConverterComponent {
  originalData: any[] = [];
  convertedHTMLData: any[] = [];
  convertedModelData: any[] = [];
  previewHTML: string = '';
  selectedCategory: string = '';
  fileType: 'json' | 'csv' = 'json';
  debugInfo = '';

  // Always 3 options hardcoded
  categories = [
    { id: '', label: 'All Categories' },
    { id: '62395b790be154c672de7b2d', label: 'Articles' },
    { id: '62395b7a65a28761d8f8f29f', label: 'Cinema Essay' },
    { id: '62395b7abca8b2ad944dcd07', label: 'Poetry' },
    {id: '62395b7dafada4c891b8db51', label: 'Interview'},
    {id: '6249d4f53b0f3780a67181cc', label: 'NaPoWriMo'},
    {id: '62395b79e193232376c72f3e', label: 'Book Review'},
    {id: '67e7ba096c47518498d79395', label: 'Prose'}

  ];

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    this.fileType = fileName.endsWith('.csv') ? 'csv' : 'json';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (this.fileType === 'csv') {
          this.originalData = this.parseCSV(reader.result as string);
          // Debug: show first item's body field
          if (this.originalData.length > 0) {
            const firstItem = this.originalData[0];
            const bodyField = firstItem['body'] || firstItem['Plain Content'] || firstItem['Rich Content'] || 'NO BODY FIELD FOUND';
            this.debugInfo = `First item body preview: ${bodyField.substring(0, 200)}...`;
          }
        } else {
          this.originalData = JSON.parse(reader.result as string);
          // Debug: show first item's body field  
          if (this.originalData.length > 0) {
            const firstItem = this.originalData[0];
            const bodyField = firstItem['body'] || firstItem['Plain Content'] || firstItem['Rich Content'] || 'NO BODY FIELD FOUND';
            this.debugInfo = `First item body preview: ${bodyField.substring(0, 200)}...`;
          }
        }
        this.applyFilter();
      } catch (error) {
        alert(`Invalid ${this.fileType.toUpperCase()} file: ${error}`);
      }
    };
    reader.readAsText(file);
  }

  parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header row
    const headers = this.parseCSVLine(lines[0]);
    const data: any[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return data;
  }

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        // Handle escaped quotes (double quotes within quoted fields)
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  applyFilter() {
    let filtered = this.originalData;

    if (this.selectedCategory) {
      filtered = filtered.filter(post =>
        post['Main Category'] === this.selectedCategory
      );
    }

    this.convertedHTMLData = this.convertPostsToHTML(filtered);
    this.convertedModelData = this.convertPostsToModel(filtered);

    this.previewHTML = this.convertedHTMLData.map(item => item['body'] || '').join('<hr>');
  }

  convertPostsToHTML(posts: any[]) {
    // For HTML format, convert Wix Rich Content to HTML but preserve everything else
    return posts.map(post => {
      const cleanedPost = { ...post };
      
      // Convert Wix Rich Content to HTML if present
      if (post['Rich Content'] && typeof post['Rich Content'] === 'object') {
        cleanedPost['body'] = this.convertWixRichContentToHTML(post['Rich Content']);
      } else if (post['body']) {
        cleanedPost['body'] = post['body'];
      } else if (post['Plain Content']) {
        cleanedPost['body'] = post['Plain Content'];
      }
      
      return cleanedPost;
    });
  }

  convertWixRichContentToHTML(richContent: any): string {
    if (!richContent || !richContent.nodes) {
      return '';
    }

    let html = '<div>';
    
    for (const node of richContent.nodes) {
      if (node.type === 'PARAGRAPH') {
        html += '<p>';
        if (node.nodes) {
          for (const textNode of node.nodes) {
            if (textNode.type === 'TEXT' && textNode.textData) {
              let text = textNode.textData.text;
              
              // Handle decorations (bold, italic, etc.)
              if (textNode.textData.decorations) {
                for (const decoration of textNode.textData.decorations) {
                  if (decoration.type === 'BOLD') {
                    text = `<strong>${text}</strong>`;
                  } else if (decoration.type === 'ITALIC') {
                    text = `<em>${text}</em>`;
                  } else if (decoration.type === 'UNDERLINE') {
                    text = `<u>${text}</u>`;
                  }
                }
              }
              
              // Convert newlines to <br> tags
              text = text.replace(/\n/g, '<br>');
              html += text;
            }
          }
        }
        html += '</p>';
      } else if (node.type === 'HEADING' && node.headingData) {
        // Handle headings (h1, h2, h3, etc.) - Add poem title markers for migration script
        const level = node.headingData.level || 1;
        html += `<!--POEM_TITLE_START--><h${level}>`;
        if (node.nodes) {
          for (const textNode of node.nodes) {
            if (textNode.type === 'TEXT' && textNode.textData) {
              let text = textNode.textData.text;
              
              // Handle decorations (bold, italic, etc.)
              if (textNode.textData.decorations) {
                for (const decoration of textNode.textData.decorations) {
                  if (decoration.type === 'BOLD') {
                    text = `<strong>${text}</strong>`;
                  } else if (decoration.type === 'ITALIC') {
                    text = `<em>${text}</em>`;
                  } else if (decoration.type === 'UNDERLINE') {
                    text = `<u>${text}</u>`;
                  }
                }
              }
              
              html += text;
            }
          }
        }
        html += `</h${level}><!--POEM_TITLE_END-->`;
      } else if (node.type === 'IMAGE' && node.imageData) {
        // Handle images (optional - you can skip if you don't want images)
        const imageId = node.imageData.image?.src?.id || '';
        if (imageId) {
          html += `<img src="wix:image://v1/${imageId}" alt="${node.imageData.altText || ''}" />`;
        }
      }
      // Add more node types as needed (LIST, etc.)
    }
    
    html += '</div>';
    return html;
  }

  convertPostsToModel(posts: any[]) {
    // For Model format, preserve the exact legacy format - absolutely no HTML modifications
    return posts.map(post => {
      // Get the original body content - check if it's Wix Rich Content format
      let originalBody = '';
      
      if (post['body']) {
        originalBody = post['body'];
      } else if (post['Rich Content']) {
        // Convert Wix Rich Content to HTML
        if (typeof post['Rich Content'] === 'object') {
          originalBody = this.convertWixRichContentToHTML(post['Rich Content']);
        } else {
          originalBody = post['Rich Content'];
        }
      } else if (post['Plain Content']) {
        originalBody = post['Plain Content'];
      }
      
      // If it's not a string, convert to string but preserve all content
      if (typeof originalBody !== 'string') {
        originalBody = JSON.stringify(originalBody);
      }

      // Return the exact same structure with converted HTML body content
      return {
        "Author": post['Author'] || '',
        "Main Category": post['Main Category'] || '',
        "View Count": parseInt(post['View Count']) || 0,
        "Excerpt": post['Excerpt'] || '',
        "Time To Read": parseInt(post['Time To Read']) || 0,
        "ID": post['ID'] || post['Internal ID'] || '',
        "Tags": post['Tags'] || [],
        "UUID": post['UUID'] || '',
        "Featured": post['Featured'] === true || post['Featured'] === 'true' || false,
        "Translation ID": post['Translation ID'] || '',
        "Slug": post['Slug'] || '',
        "Cover Image": post['Cover Image'] || '',
        "Comment Count": parseInt(post['Comment Count']) || 0,
        "Language": post['Language'] || 'en',
        "Published Date": post['Published Date'] || '',
        "Pinned": post['Pinned'] === true || post['Pinned'] === 'true' || false,
        "Categories": post['Categories'] || (post['Main Category'] ? [post['Main Category']] : []),
        "Post Page URL": post['Post Page URL'] || (post['Slug'] ? `/${post['Slug']}` : ''),
        "Cover Image Displayed": post['Cover Image Displayed'] === true || post['Cover Image Displayed'] === 'true' || false,
        "Title": post['Title'] || '',
        "Last Published Date": post['Last Published Date'] || post['Published Date'] || '',
        "Internal ID": post['Internal ID'] || post['ID'] || '',
        "Related Posts": post['Related Posts'] || [],
        "Hashtags": post['Hashtags'] || [],
        "Like Count": parseInt(post['Like Count']) || 0,
        "body": originalBody // Completely untouched original HTML content
      };
    });
  }

  capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  get articlesWithAuthors(): number {
    return this.convertedModelData.filter(item => item['Author'] && item['Author'].trim()).length;
  }

  get featuredArticles(): number {
    return this.convertedModelData.filter(item => item['Featured'] === true).length;
  }

  downloadHTMLFormat() {
    const blob = new Blob(
      [JSON.stringify(this.convertedHTMLData, null, 2)],
      { type: 'application/json' }
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'converted-html.json';
    link.click();
  }

  downloadModelFormat() {
    const blob = new Blob(
      [JSON.stringify(this.convertedModelData, null, 2)],
      { type: 'application/json' }
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'converted-model.json';
    link.click();
  }
}