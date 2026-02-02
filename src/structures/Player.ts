import { flatten } from '../util/Util';
import type { RawPlayerIdentifiers, PlayerIdentifiers as IPlayerIdentifiers } from '../types';

/** Data shape stored inside Player after parsing identifiers */
interface PlayerData extends Omit<RawPlayerIdentifiers, 'identifiers'> {
  identifiers?: IPlayerIdentifiers;
  name?: string;
  id?: number;
  [key: string]: unknown;
}

/**
 * Represents a player with structured data and utility methods.
 */
export class Player {
  #data: PlayerData;

  constructor(data: RawPlayerIdentifiers) {
    this.#data = { ...data } as PlayerData;

    if (Array.isArray(this.#data.identifiers)) {
      const playerIdentifiers: IPlayerIdentifiers = {};
      for (const identifier of this.#data.identifiers as string[]) {
        if (!identifier.includes(':')) continue;
        const [idType, idValue] = identifier.split(':');
        playerIdentifiers[idType] = idValue;
      }
      this.#data.identifiers = playerIdentifiers;
    }

    for (const key of Object.keys(this.#data)) {
      Object.defineProperty(this, key, {
        writable: false,
        enumerable: true,
        value: this.#data[key],
      });
    }
  }

  toString(): string {
    return this.#data?.name ?? 'Unknown';
  }

  toJSON(...props: Record<string, string | boolean>[]): unknown {
    return flatten(this, ...props);
  }
}
