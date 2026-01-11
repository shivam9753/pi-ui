import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ExploreState {
  submissions: any[];
  page: number;
  hasMore: boolean;
  selectedType?: string;
  searchQuery?: string;
  scrollY?: number;
}

@Injectable({ providedIn: 'root' })
export class ExploreStateService {
  private state$ = new BehaviorSubject<ExploreState>({
    submissions: [],
    page: 1,
    hasMore: true,
    selectedType: '',
    searchQuery: '',
    scrollY: 0
  });

  public stateObs = this.state$.asObservable();

  getState(): ExploreState {
    return this.state$.getValue();
  }

  setState(partial: Partial<ExploreState>) {
    const next = { ...this.getState(), ...partial };
    this.state$.next(next);
    // persistence disabled: do not write to sessionStorage so state is not retained across full page reloads
  }

  appendSubmissions(items: any[], page: number, hasMore: boolean) {
    const cur = this.getState();
    const subs = page === 1 ? items : [...(cur.submissions || []), ...items];
    const next = { ...cur, submissions: subs, page, hasMore };
    this.state$.next(next);
    // persistence disabled
  }

  restoreFromStorage() {
    // persistence disabled: do not restore from sessionStorage on reload
    return;
  }

  clear() {
    this.state$.next({ submissions: [], page: 1, hasMore: true, selectedType: '', searchQuery: '', scrollY: 0 });
    // persistence disabled: no sessionStorage cleanup required
  }
}
