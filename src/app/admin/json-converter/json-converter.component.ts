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

  // Always 3 options hardcoded
  categories = [
    { id: '', label: 'All Categories' },
    { id: '62395b790be154c672de7b2d', label: 'Articles' },
    { id: '62395b7a65a28761d8f8f29f', label: 'Cinema Essay' },
    { id: '62395b7abca8b2ad944dcd07', label: 'Poetry' }
  ];

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.originalData = JSON.parse(reader.result as string);
        this.applyFilter();
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
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

    this.previewHTML = this.convertedHTMLData.map(item => item.body).join('<hr>');
  }

  convertPostsToHTML(posts: any[]) {
    return posts.map(post => {
      let body = post['Plain Content'] || post['Rich Content'] || '';
      if (typeof body !== 'string') body = JSON.stringify(body);

      body = body.replace(/<img[^>]*>/g, ''); // remove images
      body = body.replace(/\n/g, '<br>');     // newline to <br>

      return { body: `<div>${body}</div>` };
    });
  }

  convertPostsToModel(posts: any[]) {
    return posts.map(post => {
      // Title fallback: Title -> Excerpt -> Slug
      const title =
        post['Title'] ||
        post['Excerpt'] ||
        (post['Slug'] ? post['Slug'].replace(/-/g, ' ') : '');

      // Author from "Author" if string, else from Plain Content last part
      let author = '';
      if (typeof post['Author'] === 'string' && !post['Author'].includes('-')) {
        author = post['Author'];
      } else if (post['Plain Content']) {
        const plain = post['Plain Content'];
        const authorMatch = plain.match(/- ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/);
        if (authorMatch) author = authorMatch[1];
      }

      // Text content clean
      const textOnly = (post['Plain Content'] || '')
        .replace(/<[^>]+>/g, '')
        .trim();

      // Themes keyword detection
      const themes: string[] = [];
      const lc = textOnly.toLowerCase();
      if (lc.includes('poetry')) themes.push('Poetry');
      if (lc.includes('love')) themes.push('Love');
      if (lc.includes('hope')) themes.push('Hope');
      if (lc.includes('history')) themes.push('History');

      return {
        title: title.trim(),
        author: author.trim(),
        text: textOnly,
        themes,
        quality: 70,
        plagiarism: 5
      };
    });
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