import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { AppState } from '../store/app.state';
import { Observable } from 'rxjs';
import { Coordinates, Scout } from '../models';
import { NightWatcherService } from '../services/nightwatcher.service';
import { NightScoutEntry } from '../models/nightscoutentry';
import { Platform } from '@ionic/angular';
import { GpsTrackingService } from '../services/gpstracking';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements OnInit {
  @Select(AppState.scout) scout$: Observable<Scout>;
  @Select(AppState.coordinates) coordinates$: Observable<Coordinates>;

  entries$: Observable<NightScoutEntry[]>;
  zoom = 16;

  constructor(private store: Store,
              private platform: Platform,
              private nightwatcher: NightWatcherService,
              private gpsTrackingService: GpsTrackingService) {

    this.platform.ready().then(() => {
      if (this.platform.is('cordova')) {
        this.gpsTrackingService.startMobileTracking();
      }
    })
  }

  ngOnInit() {
    this.scout$.pipe(
      tap((scout) => {
        if (scout) {
          this.entries$ = this.nightwatcher.getEntriesResponse(scout.nightScoutURL);
        }
      })
    ).subscribe()
  }

}
