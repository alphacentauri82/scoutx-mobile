import { Injectable } from '@angular/core';
import BackgroundGeolocation, {
  Location,
  MotionChangeEvent,
  DeviceInfo,
  LocationError
} from 'cordova-background-geolocation-lt';
import { Store } from '@ngxs/store';
import { AppAction } from '../store/app.actions';

@Injectable({
  providedIn: 'root'
})
export class GpsTrackingService {
  constructor(private store: Store) {
  }

  startMobileTracking() {
    BackgroundGeolocation.getDeviceInfo().then((deviceInfo: DeviceInfo) => {
      console.log('THE DEVICE INFO 📱');
      console.log(JSON.stringify(deviceInfo));
    });

    BackgroundGeolocation.onLocation((location: Location) => {
      console.log('THE LOCATION 📍');
      this.store.dispatch(
        new AppAction.UpdateCoordinates(
          location.timestamp,
          location.coords.latitude,
          location.coords.longitude
        ));
    }, (error: LocationError) => {
      console.log(JSON.stringify(error))
    });

    BackgroundGeolocation.onMotionChange(function (motion: MotionChangeEvent) {
      console.log('NEW LOCATION 🔥️');
      this.store.dispatch(
        new AppAction.UpdateCoordinates(
          motion.location.timestamp,
          motion.location.coords.latitude,
          motion.location.coords.longitude
        ));
    });

    BackgroundGeolocation.ready({
      reset: true,
      // Logging / Debug config
      debug: true,
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      // Geolocation config
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10,
      // ActivityRecognition config
      stopTimeout: 1,
      foregroundService: true,
      // Application config
      stopOnTerminate: false,
      startOnBoot: true,
      heartbeatInterval: 60,
      // [Android] backgroundPermissionRationale for Always permission.
      backgroundPermissionRationale: {
        title: 'Allow {applicationName} to access this ',
        message: 'This app collects location data',
        positiveAction: 'Change to "{backgroundPermissionOptionLabel}"',
        negativeAction: 'Cancel'
      },
      autoSync: true,
      autoSyncThreshold: 0
    }, (state) => {
      BackgroundGeolocation.start();
    });
  }
}
