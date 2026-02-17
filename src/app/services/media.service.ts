import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { API_ENDPOINTS } from '../shared/constants/api.constants';

@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private readonly http: HttpClient) {}

  list(prefix = '', maxKeys = 100, continuationToken: string | null = null): Observable<any> {
    const params: any = { prefix, maxKeys };
    if (continuationToken) params.continuationToken = continuationToken;
    const url = `${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.MEDIA_LIST}`;
    console.log('MediaService.list calling url:', url, 'params:', params);
    return this.http.get(url, { params, withCredentials: true }).pipe(
      tap({ next: (res) => console.log('MediaService.list response', res), error: (err) => console.error('MediaService.list error', err) })
    );
  }

  delete(key: string) {
    const url = `${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.MEDIA_DELETE}`;
    console.log('MediaService.delete calling url:', url, 'key:', key);
    return this.http.request('delete', url, { body: { key }, withCredentials: true });
  }

  // List with filter and pagination
  listWithFilter(prefix = '', maxKeys = 100, continuationToken: string | null = null, filter: 'all' | 'orphan' | 'inuse' = 'all'): Observable<any> {
    const params: any = { prefix, maxKeys, filter };
    if (continuationToken) params.continuationToken = continuationToken;
    const url = `${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.MEDIA_LIST}`;
    console.log('MediaService.listWithFilter calling url:', url, 'params:', params);
    return this.http.get(url, { params, withCredentials: true }).pipe(
      tap({ next: (res) => console.log('MediaService.listWithFilter response', res), error: (err) => console.error('MediaService.listWithFilter error', err) })
    );
  }

  bulkDelete(keys: string[]) {
    const url = `${environment.apiBaseUrl}${API_ENDPOINTS.ADMIN.MEDIA_BULK_DELETE}`;
    console.log('MediaService.bulkDelete calling url:', url, 'keys:', keys);
    return this.http.post(url, { keys }, { withCredentials: true });
  }
}
