import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UpdateStatusPayload {
  status: 'accepted' | 'rejected';
  reviewerId?: string;
  reviewNotes?: string;
}

@Injectable({
  providedIn: 'root'
})



export class BackendService {
  private API_URL = 'http://localhost:3000/api';
  constructor(private http: HttpClient) { }

  getSubmissions(type?: string): Observable<any[]> {
    const url = type ? `${this.API_URL}/submissions?type=${type}` : `${this.API_URL}/submissions`;
    return this.http.get<any[]>(url);
  }

  submitNewSubmission(submission: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/submissions`, submission);
  }

  updateSubmissionStatus(id: string, payload: UpdateStatusPayload): Observable<any> {
    return this.http.patch(`${this.API_URL}/submissions/${id}/status`, payload);
  }

}
