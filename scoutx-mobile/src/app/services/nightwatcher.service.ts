import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NightScoutEntry } from '../models';

@Injectable({
  providedIn: 'root'
})
export class NightWatcherService {
  constructor(private http: HttpClient) {}

  getEntriesResponse(url: string): Observable<NightScoutEntry[]> {
    return this.http.get<NightScoutEntry[]>(url);
  }
}
