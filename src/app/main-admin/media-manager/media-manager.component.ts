import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import { ToastService } from '../../services/toast.service';

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
  filter: 'all' | 'orphan' | 'inuse' = 'all';
  // Pagination state
  nextContinuationToken: string | null = null;
  isTruncated = false;
  // Stack of previous continuation tokens to allow back navigation
  private readonly tokenStack: Array<string | null> = [];
  // Selection for bulk operations
  selectedKeys = new Set<string>();
  isBulkDeleting = false;

  constructor(private readonly mediaService: MediaService, private readonly toast: ToastService) {
    console.log('MediaManagerComponent: constructor');
  }

  ngOnInit() {
    console.log('MediaManagerComponent: ngOnInit');
    this.load(null);
  }

  load(continuationToken: string | null = null) {
    console.log('MediaManagerComponent: load() - fetching list, prefix=', this.prefix, 'token=', continuationToken);
    this.loading = true;
    this.mediaService.listWithFilter(this.prefix, 100, continuationToken, this.filter).subscribe({
      next: (res: any) => {
        console.log('MediaManagerComponent: list success', res);
        this.objects = res.objects || [];
        this.isTruncated = !!res.isTruncated;
        this.nextContinuationToken = res.nextContinuationToken || null;
        this.loading = false;
      },
      error: (err: any) => { console.error('MediaManagerComponent: list error', err); this.loading = false; }
    });
  }

  // Navigate to next page
  nextPage() {
    if (!this.isTruncated || !this.nextContinuationToken) return;
    // push current page's token (so prev can return) and request next
    this.tokenStack.push(this.nextContinuationToken);
    this.load(this.nextContinuationToken);
  }

  // Navigate to previous page
  prevPage() {
    if (this.tokenStack.length === 0) {
      // go to first page
      this.load(null);
      return;
    }
    // pop last token (which corresponds to current page start) and load previous
    this.tokenStack.pop();
    const prevToken = this.tokenStack.length > 0 ? this.tokenStack.at(-1) as string | null : null;
    this.load(prevToken);
  }

  confirmAndDelete(obj: any) {
    if (!confirm(`Delete ${obj.key}? This is irreversible.`)) return;
    this.mediaService.delete(obj.key).subscribe({
      next: () => { 
        this.toast.showSuccess(`Deleted ${obj.key}`);
        this.selectedKeys.delete(obj.key);
        this.load(null); 
      },
      error: (e: any) => { 
        console.error('MediaManagerComponent: delete error', e); 
        this.toast.showError('Delete failed', e?.error?.message || e?.message || String(e));
      }
    });
  }

  isOrphan(obj: any) {
    return !obj.usedBy || obj.usedBy.length === 0;
  }

  filteredObjects() {
    if (!this.objects) return [];
    if (this.filter === 'all') return this.objects;
    if (this.filter === 'orphan') return this.objects.filter(o => this.isOrphan(o));
    return this.objects.filter(o => !this.isOrphan(o));
  }

  toggleSelection(key: string) {
    if (this.selectedKeys.has(key)) this.selectedKeys.delete(key);
    else this.selectedKeys.add(key);
  }

  bulkDelete() {
    const keys = Array.from(this.selectedKeys);
    console.log('MediaManagerComponent.bulkDelete selected keys:', keys);
    if (keys.length === 0) {
      this.toast.showInfo('No images selected');
      return;
    }
    if (!confirm(`Delete ${keys.length} images? This is irreversible.`)) return;
    this.isBulkDeleting = true;
    this.mediaService.bulkDelete(keys).subscribe({
      next: (res: any) => {
        const results = res.results || [];
        const failed = results.filter((r: any) => !r.success);
        if (failed.length === 0) {
          this.toast.showSuccess(`Deleted ${results.length} images`);
        } else {
          this.toast.showWarning(`Deleted ${results.length - failed.length}, ${failed.length} failed`);
        }
        // remove deleted keys from selection
        results.forEach((r: any) => {
          if (r.success) this.selectedKeys.delete(r.key);
        });
        this.isBulkDeleting = false;
        // if some deletions succeeded, reload current page
        this.load(null);
      },
      error: (err: any) => {
        console.error('Bulk delete error', err);
        this.toast.showError('Bulk delete failed', err?.message || String(err));
        this.isBulkDeleting = false;
      }
    });
  }

  // Expose whether there is a previous page available for template binding
  public get hasPrev(): boolean {
    return this.tokenStack.length > 0;
  }
}
