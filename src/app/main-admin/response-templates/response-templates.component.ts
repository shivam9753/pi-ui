import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../ui-components/button/button.component';
import { AdminPageHeaderComponent } from '../../shared/components/admin-page-header/admin-page-header.component';

interface TemplateItem {
  id: string;
  title: string;
  type: string;
  template: string;
  dateAdded: string;
}

@Component({
  selector: 'app-response-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, AdminPageHeaderComponent],
  templateUrl: './response-templates.component.html',
  styleUrls: ['./response-templates.component.css']
})
export class ResponseTemplatesComponent implements OnInit {
  templates: TemplateItem[] = [];
  loading = true;

  // form
  newTitle = '';
  newType = 'generic';
  newTemplate = '';

  readonly STORAGE_KEY = 'responseTemplates';

  constructor() {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  async loadTemplates() {
    this.loading = true;
    try {
      // Load built-in templates from assets
      const res = await fetch('/assets/response-templates.json');
      if (res.ok) {
        const assetTemplates = await res.json();
        this.templates = assetTemplates || [];
      }
    } catch (e) {
      // ignore
      this.templates = [];
    }

    // Merge saved templates from localStorage (admins can add)
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TemplateItem[];
        this.templates = [...parsed, ...this.templates];
      }
    } catch (e) {
      // ignore
    }

    this.loading = false;
  }

  saveTemplate() {
    if (!this.newTitle.trim() || !this.newTemplate.trim()) {
      alert('Please provide a title and template text');
      return;
    }

    const item: TemplateItem = {
      id: Date.now().toString(),
      title: this.newTitle.trim(),
      type: this.newType,
      template: this.newTemplate.trim(),
      dateAdded: new Date().toISOString()
    };

    // Save to localStorage (prepend so new ones appear first)
    try {
      const existing = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]') as TemplateItem[];
      existing.unshift(item);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      // update local list
      this.templates.unshift(item);
      // reset form
      this.newTitle = '';
      this.newType = 'generic';
      this.newTemplate = '';
      alert('Template saved');
    } catch (e) {
      alert('Failed to save template');
    }
  }

  copyTemplate(template: string) {
    if (!navigator.clipboard) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = template;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); alert('Copied'); } catch { alert('Copy failed'); }
      document.body.removeChild(ta);
      return;
    }

    navigator.clipboard.writeText(template).then(() => {
      alert('Template copied to clipboard');
    }).catch(() => {
      alert('Failed to copy');
    });
  }
}
