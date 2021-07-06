import { Coordinates } from './coordinates';

export interface Scout {
  nightScoutURL: string
  phoneNumber: string,
  minBG: number,
  maxBG: number,
  emergencyNumbers: string[],
  coordinates?: Coordinates
}
