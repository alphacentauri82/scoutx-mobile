import { Coordinates, Scout, User } from '../models';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { AppAction } from './app.actions';
import { ScoutService } from '../services/scout.service';
import { tap } from 'rxjs/operators';
import firebase from 'firebase';
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import { UserService } from '../services/user.service';

export interface AppStateModel {
  user: User,
  scout: Scout,
  code: string,
  coordinates : Coordinates
}

@State<AppStateModel>({
  name: 'application',
  defaults: {
    user: null,
    scout: null,
    code: '',
    coordinates : null
  }
})
@Injectable()
export class AppState {

  @Selector()
  static user(state: AppStateModel) {
    return state.user;
  }

  @Selector()
  static scout(state: AppStateModel) {
    return state.scout;
  }

  @Selector()
  static coordinates(state: AppStateModel) {
    return state.coordinates;
  }

  @Action(AppAction.SetUser)
  setUser(ctx: StateContext<AppStateModel>, action: AppAction.SetUser) {
    ctx.patchState({ user: action.user });
    return this.userService
      .updateUser(action.user)
      .then(() => ctx.dispatch(new AppAction.GetScout(action.user.uid)))
  }

  @Action(AppAction.SetScout)
  setScout(ctx: StateContext<AppStateModel>, action: AppAction.SetScout) {
    ctx.patchState({ scout: action.scout , coordinates: action.scout.coordinates});
  }

  @Action(AppAction.UpdateScout)
  updateScout(ctx: StateContext<AppStateModel>, action: AppAction.UpdateScout) {
    return this.scoutService
      .updateScout(ctx.getState().user.uid, action.scout)
      .then(() => {
        ctx.patchState({ scout: action.scout });
      })
  }

  @Action(AppAction.GetScout)
  getScout(ctx: StateContext<AppStateModel>, action: AppAction.GetScout) {
    return this.scoutService
      .getUserScout(action.uid)
      .pipe(
        tap((document: DocumentSnapshot<Scout>) => {
            if (document.exists) {
              return ctx.dispatch(new AppAction.SetScout(document.data()));
            }
          }
        )
      ).subscribe();
  }

  @Action(AppAction.UpdateCoordinates)
  updateCoordinates(ctx: StateContext<AppStateModel>, action: AppAction.UpdateCoordinates) {
    const coordinates: Coordinates = {
      latitude: `${action.latitude}`,
      longitude: `${action.longitude}`,
      gpstimestamp: action.timestamp
    }
    return this.scoutService.updateCoordinates(ctx.getState().user.uid, coordinates)
      .then( () => {
        ctx.patchState({coordinates})
      })
  }

  constructor(private scoutService: ScoutService,
              private userService: UserService) {
  }
}
