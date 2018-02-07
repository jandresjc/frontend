import { Action } from '@ngrx/store';

export const SET_USER = 'SET_USER';
export const UNSET_USER = 'UNSET_USER';

import { User } from '../models/user';

export interface ActionWithPayload<T> extends Action {
  payload: T;
}

export interface Payload {
  value?: User;
}

export function userReducer(state: User = new User(), action: ActionWithPayload<Payload>) {
  switch (action.type) {
    case SET_USER:
      return action.payload;
    case UNSET_USER:
      return new User();
    default:
      return state;
  }
}
