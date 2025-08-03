import { Action } from './Action.js';
import { Possession } from './Possession.js';

const actions: string[] = Object.keys(Action).map((k) => Action[k as keyof typeof Action]);
const possessions: string[] = Object.keys(Possession).map((k) => Possession[k as keyof typeof Possession]);

export {
  Action,
  actions,
  Possession,
  possessions
};
