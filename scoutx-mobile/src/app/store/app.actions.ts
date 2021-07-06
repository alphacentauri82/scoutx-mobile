import { Scout, User } from '../models';

export namespace AppAction {
  export class SetUser {
    static readonly type = '[App] SetUser';
    constructor(public user: User) {}
  }

  export class SetScout {
    static readonly type = '[App] Set Scout';
    constructor(public scout: Scout) {}
  }

  export class UpdateScout {
    static readonly type = '[App] Update Scout';
    constructor(public scout: Scout) {}
  }

  export class GetScout {
    static readonly type = '[App] Get Scout';
    constructor(public uid: string) {}
  }

  export class UpdateCoordinates {
    static readonly type = '[App] Update Coordinates';
    constructor(public timestamp: string, public latitude: number, public longitude: number) {
    }
  }
}
