import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private readonly http: HttpClient) {}

  list(prefix = '', maxKeys = 100, continuationToken: string | null = null): Observable<any> {
    const params: any = { prefix, maxKeys };
    if (continuationToken) params.continuationToken = continuationToken;
    const url = `${environment.apiBaseUrl}/admin/media/list`;
    console.log('MediaService.list calling url:', url, 'params:', params);
    return this.http.get(url, { params, withCredentials: true }).pipe(
      tap({ next: (res) => console.log('MediaService.list response', res), error: (err) => console.error('MediaService.list error', err) })
    );
  }

  delete(key: string) {
    const url = `${environment.apiBaseUrl}/admin/media`;
    console.log('MediaService.delete calling url:', url, 'key:', key);
    return this.http.request('delete', url, { body: { key }, withCredentials: true });
  }
}
