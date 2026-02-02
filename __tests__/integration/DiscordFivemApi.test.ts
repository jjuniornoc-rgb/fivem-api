import axios from 'axios';
import { DiscordFivemApi } from '../../src/DiscordFivemApi';
import { Server } from '../../src/structures/Server';
import { Player } from '../../src/structures/Player';
import infoFixture from '../__fixtures__/info.json';
import playersFixture from '../__fixtures__/players.json';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DiscordFivemApi', () => {
  const baseUrl = 'http://127.0.0.1:30120';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/info.json')) {
        return Promise.resolve({ data: infoFixture });
      }
      if (url.includes('/players.json')) {
        return Promise.resolve({ data: playersFixture });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('constructor', () => {
    it('throws when address is missing', () => {
      try {
        new DiscordFivemApi({ address: '' } as never);
        expect(true).toBe(false);
      } catch (e) {
        expect((e as { code: string }).code).toBe('NO_ADDRESS');
      }
    });

    it('throws when address is not string', () => {
      try {
        new DiscordFivemApi({ address: 123 as never, port: 30120 });
        expect(true).toBe(false);
      } catch (e) {
        expect((e as { code: string }).code).toBe('INVALID_ADDRESS');
      }
    });

    it('accepts valid options and applies defaults', () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1' });
      expect(api.address).toBe('127.0.0.1');
      expect(api.port).toBe(30120);
      expect(api.options.interval).toBe(2500);
    });
  });

  describe('getStatus', () => {
    it('returns online when info.json succeeds', async () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const status = await api.getStatus();
      expect(status).toBe('online');
    });

    it('returns offline when request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const status = await api.getStatus();
      expect(status).toBe('offline');
    });
  });

  describe('getServerData', () => {
    it('returns raw data when useStructure is false', async () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const data = await api.getServerData();
      expect(data).toEqual(infoFixture);
      expect((data as { vars?: { sv_maxClients?: number } }).vars?.sv_maxClients).toBe(32);
    });

    it('returns Server instance when useStructure is true', async () => {
      const api = new DiscordFivemApi({
        address: '127.0.0.1',
        port: 30120,
        useStructure: true,
      });
      const data = await api.getServerData();
      expect(data).toBeInstanceOf(Server);
      expect((data as { vars?: { sv_maxClients?: number } }).vars?.sv_maxClients).toBe(32);
    });
  });

  describe('getServerPlayers', () => {
    it('returns raw array when useStructure is false', async () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const players = await api.getServerPlayers();
      expect(Array.isArray(players)).toBe(true);
      expect((players as unknown[]).length).toBe(2);
      expect((players as unknown[])[0]).toMatchObject({ name: 'PlayerOne', id: 1 });
    });

    it('returns Player instances when useStructure is true', async () => {
      const api = new DiscordFivemApi({
        address: '127.0.0.1',
        port: 30120,
        useStructure: true,
      });
      const players = await api.getServerPlayers();
      expect(Array.isArray(players)).toBe(true);
      const list = players as unknown[];
      expect(list[0]).toBeInstanceOf(Player);
      expect((list[0] as Player).toString()).toBe('PlayerOne');
    });
  });

  describe('getPlayersOnline', () => {
    it('returns player count', async () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const count = await api.getPlayersOnline();
      expect(count).toBe(2);
    });
  });

  describe('getMaxPlayers', () => {
    it('returns sv_maxClients from info', async () => {
      const api = new DiscordFivemApi({ address: '127.0.0.1', port: 30120 });
      const max = await api.getMaxPlayers();
      expect(max).toBe(32);
    });
  });

  describe('filterPlayers', () => {
    it('filters by predicate', async () => {
      const api = new DiscordFivemApi({
        address: '127.0.0.1',
        port: 30120,
        useStructure: true,
      });
      const players = await api.getServerPlayers();
      const list = Array.isArray(players) ? players : [];
      const filtered = api.filterPlayers(
        list,
        (p) => ((p as { name?: string }).name ?? '').startsWith('PlayerOne')
      );
      expect(filtered.length).toBe(1);
      expect((filtered[0] as { name?: string }).name).toBe('PlayerOne');
    });
  });

  describe('sortPlayers', () => {
    it('sorts by key ascending', async () => {
      const api = new DiscordFivemApi({
        address: '127.0.0.1',
        port: 30120,
        useStructure: true,
      });
      const players = await api.getServerPlayers();
      const list = Array.isArray(players) ? players : [];
      const sorted = api.sortPlayers(list, 'name', 'asc');
      expect((sorted[0] as { name?: string }).name).toBe('PlayerOne');
      expect((sorted[1] as { name?: string }).name).toBe('PlayerTwo');
    });

    it('sorts by key descending', async () => {
      const api = new DiscordFivemApi({
        address: '127.0.0.1',
        port: 30120,
        useStructure: true,
      });
      const players = await api.getServerPlayers();
      const list = Array.isArray(players) ? players : [];
      const sorted = api.sortPlayers(list, 'name', 'desc');
      expect((sorted[0] as { name?: string }).name).toBe('PlayerTwo');
      expect((sorted[1] as { name?: string }).name).toBe('PlayerOne');
    });
  });
});
