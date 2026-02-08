import { flatten } from '../util/Util';
import type { RawPlayerIdentifiers, PlayerIdentifiers as IPlayerIdentifiers } from '../types';

interface PlayerData extends Omit<RawPlayerIdentifiers, 'identifiers'> {
  identifiers?: IPlayerIdentifiers;
  name?: string;
  id?: number;
  [key: string]: unknown;
}

export type IdentifierType = 'steam' | 'license' | 'license2' | 'xbl' | 'live' | 'discord' | 'fivem' | 'ip';

export class Player {
  #data: PlayerData;

  constructor(data: RawPlayerIdentifiers) {
    this.#data = { ...data } as PlayerData;

    if (Array.isArray(this.#data.identifiers)) {
      const playerIdentifiers: IPlayerIdentifiers = {};
      for (const identifier of this.#data.identifiers as string[]) {
        if (!identifier.includes(':')) continue;
        const [idType, idValue] = identifier.split(':');
        if (idType && idValue) {
          playerIdentifiers[idType] = idValue;
        }
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

  get name(): string | undefined {
    return this.#data.name;
  }

  get id(): number | undefined {
    return this.#data.id;
  }

  get identifiers(): IPlayerIdentifiers | undefined {
    return this.#data.identifiers;
  }

  getIdentifier(type: IdentifierType | string): string | undefined {
    return this.#data.identifiers?.[type];
  }

  hasIdentifier(type: IdentifierType | string): boolean {
    return this.#data.identifiers?.[type] !== undefined;
  }

  toString(): string {
    return this.#data?.name ?? 'Unknown';
  }

  toJSON(...props: Record<string, string | boolean>[]): unknown {
    return flatten(this, ...props);
  }
}
