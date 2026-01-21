import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-media-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './media-manager.component.html',
  styleUrls: ['./media-manager.component.css']
})
export class MediaManagerComponent implements OnInit {
  objects: any[] = [];
  loading = false;
  prefix = '';

  constructor(private readonly mediaService: MediaService) {
    console.log('MediaManagerComponent: constructor');
  }

  ngOnInit() {
    console.log('MediaManagerComponent: ngOnInit');
    this.load();
  }

  load() {
    console.log('MediaManagerComponent: load() - fetching list, prefix=', this.prefix);
    this.loading = true;
    this.mediaService.list(this.prefix, 100).subscribe({
      next: (res: any) => {
        console.log('MediaManagerComponent: list success', res);
        this.objects = res.objects || [];
        this.loading = false;
      },
      error: (err: any) => { console.error('MediaManagerComponent: list error', err); this.loading = false; }
    });
  }

  confirmAndDelete(obj: any) {
    if (!confirm(`Delete ${obj.key}? This is irreversible.`)) return;
    this.mediaService.delete(obj.key).subscribe({
      next: () => { this.load(); },
      error: (e: any) => { console.error('MediaManagerComponent: delete error', e); alert('Failed to delete: ' + (e?.error?.message || e?.message || e)); }
    });
  }

  isOrphan(obj: any) {
    return !obj.usedBy || obj.usedBy.length === 0;
  }
}
