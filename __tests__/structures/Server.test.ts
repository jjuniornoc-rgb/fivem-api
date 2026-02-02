import { Server } from '../../src/structures/Server';
import type { RawServerInfo } from '../../src/types';

describe('Server', () => {
  it('exposes vars and resources from data', () => {
    const data: RawServerInfo = {
      vars: { sv_maxClients: 32 },
      resources: ['spawnmanager', 'mapmanager'],
    };
    const server = new Server(data);
    expect((server as unknown as { vars: { sv_maxClients: number } }).vars.sv_maxClients).toBe(32);
    expect((server as unknown as { resources: string[] }).resources).toEqual([
      'spawnmanager',
      'mapmanager',
    ]);
  });

  it('properties are read-only', () => {
    const data: RawServerInfo = { vars: { x: 1 } };
    const server = new Server(data);
    const desc = Object.getOwnPropertyDescriptor(server, 'vars');
    expect(desc?.writable).toBe(false);
  });
});
