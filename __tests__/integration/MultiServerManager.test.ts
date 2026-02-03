import axios from 'axios';
import { MultiServerManager } from '../../src/MultiServerManager';
import infoFixture from '../__fixtures__/info.json';
import playersFixture from '../__fixtures__/players.json';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MultiServerManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/info.json')) return Promise.resolve({ data: infoFixture });
      if (url.includes('/players.json')) return Promise.resolve({ data: playersFixture });
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('addServer creates and returns DiscordFivemApi', () => {
    const manager = new MultiServerManager();
    const api = manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
    expect(api).toBeDefined();
    expect(api.address).toBe('127.0.0.1');
    expect(manager.getServer('s1')).toBe(api);
    expect(manager.getServerIds()).toEqual(['s1']);
  });

  it('removeServer removes by id and destroys the instance', () => {
    const manager = new MultiServerManager();
    const api = manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
    api.start();
    expect(api.isRunning).toBe(true);
    expect(manager.removeServer('s1')).toBe(true);
    expect(api.isRunning).toBe(false); // destroy was called
    expect(manager.getServer('s1')).toBeUndefined();
    expect(manager.removeServer('s1')).toBe(false);
  });

  it('getAllStatus returns status per server', async () => {
    const manager = new MultiServerManager();
    manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
    manager.addServer('s2', { address: '127.0.0.2', port: 30120 });
    const statuses = await manager.getAllStatus();
    expect(statuses.s1).toBe('online');
    expect(statuses.s2).toBe('online');
  });

  it('fromEntries creates manager with multiple servers', () => {
    const manager = MultiServerManager.fromEntries([
      { id: 'a', options: { address: '127.0.0.1', port: 30120 } },
      { id: 'b', options: { address: '127.0.0.2', port: 30121 } },
    ]);
    expect(manager.getServerIds()).toEqual(['a', 'b']);
    expect(manager.getServer('a')?.port).toBe(30120);
    expect(manager.getServer('b')?.port).toBe(30121);
  });

  describe('lifecycle methods', () => {
    it('size returns the number of managed servers', () => {
      const manager = new MultiServerManager();
      expect(manager.size).toBe(0);
      manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
      expect(manager.size).toBe(1);
      manager.addServer('s2', { address: '127.0.0.2', port: 30120 });
      expect(manager.size).toBe(2);
    });

    it('stopServer stops polling for a specific server', () => {
      const manager = new MultiServerManager();
      const api = manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
      api.start();
      expect(api.isRunning).toBe(true);
      expect(manager.stopServer('s1')).toBe(true);
      expect(api.isRunning).toBe(false);
    });

    it('stopServer returns false for unknown server', () => {
      const manager = new MultiServerManager();
      expect(manager.stopServer('unknown')).toBe(false);
    });

    it('startServer starts polling for a specific server', () => {
      const manager = new MultiServerManager();
      const api = manager.addServer('s1', { address: '127.0.0.1', port: 30120 }, false);
      expect(api.isRunning).toBe(false);
      expect(manager.startServer('s1')).toBe(true);
      expect(api.isRunning).toBe(true);
      api.stop(); // cleanup
    });

    it('startServer returns false for unknown server', () => {
      const manager = new MultiServerManager();
      expect(manager.startServer('unknown')).toBe(false);
    });

    it('stopAll stops all servers', () => {
      const manager = new MultiServerManager();
      const api1 = manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
      const api2 = manager.addServer('s2', { address: '127.0.0.2', port: 30120 });
      api1.start();
      api2.start();
      expect(api1.isRunning).toBe(true);
      expect(api2.isRunning).toBe(true);

      manager.stopAll();

      expect(api1.isRunning).toBe(false);
      expect(api2.isRunning).toBe(false);
    });

    it('startAll starts all servers', () => {
      const manager = new MultiServerManager();
      const api1 = manager.addServer('s1', { address: '127.0.0.1', port: 30120 }, false);
      const api2 = manager.addServer('s2', { address: '127.0.0.2', port: 30120 }, false);
      expect(api1.isRunning).toBe(false);
      expect(api2.isRunning).toBe(false);

      manager.startAll();

      expect(api1.isRunning).toBe(true);
      expect(api2.isRunning).toBe(true);

      manager.stopAll(); // cleanup
    });

    it('destroyAll destroys all servers and clears the manager', () => {
      const manager = new MultiServerManager();
      const api1 = manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
      const api2 = manager.addServer('s2', { address: '127.0.0.2', port: 30120 });
      api1.start();
      api2.start();
      const listener = jest.fn();
      manager.on('ready', listener);
      expect(manager.listenerCount('ready')).toBe(1);

      manager.destroyAll();

      expect(manager.size).toBe(0);
      expect(api1.isRunning).toBe(false);
      expect(api2.isRunning).toBe(false);
      expect(manager.getServerIds()).toEqual([]);
      expect(manager.listenerCount('ready')).toBe(0);
    });

    it('destroyAll can be called on empty manager', () => {
      const manager = new MultiServerManager();
      manager.destroyAll(); // should not throw
      expect(manager.size).toBe(0);
    });
  });
});

