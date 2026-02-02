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

  it('removeServer removes by id', () => {
    const manager = new MultiServerManager();
    manager.addServer('s1', { address: '127.0.0.1', port: 30120 });
    expect(manager.removeServer('s1')).toBe(true);
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
});
