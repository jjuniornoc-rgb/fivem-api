import type { RawServerInfo } from '../types';

/**
 * Class representing server data with encapsulated properties.
 */
export class Server {
  #data: RawServerInfo;

  constructor(data: RawServerInfo) {
    this.#data = data;

    for (const key of Object.keys(this.#data)) {
      Object.defineProperty(this, key, {
        writable: false,
        enumerable: true,
        value: this.#data[key],
      });
    }
  }
}
