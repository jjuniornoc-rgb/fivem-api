import axios from 'axios';
import {
  isCfxJoinLink,
  extractCfxCode,
  resolveCfxJoinCode,
  resolveCfxJoinCodeCached,
} from '../../src/util/cfxResolver';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('cfxResolver', () => {
  describe('isCfxJoinLink', () => {
    it('returns true for https://cfx.re/join/CODE', () => {
      expect(isCfxJoinLink('https://cfx.re/join/p7zxb5')).toBe(true);
      expect(isCfxJoinLink('https://cfx.re/join/abc123')).toBe(true);
    });
    it('returns true for cfx.re/join/CODE without protocol', () => {
      expect(isCfxJoinLink('cfx.re/join/p7zxb5')).toBe(true);
    });
    it('returns false for IP or hostname', () => {
      expect(isCfxJoinLink('127.0.0.1')).toBe(false);
      expect(isCfxJoinLink('93.123.22.56:30120')).toBe(false);
    });
  });

  describe('extractCfxCode', () => {
    it('extracts code from full URL', () => {
      expect(extractCfxCode('https://cfx.re/join/p7zxb5')).toBe('p7zxb5');
      expect(extractCfxCode('cfx.re/join/abc123')).toBe('abc123');
    });
    it('returns null for non-cfx link', () => {
      expect(extractCfxCode('127.0.0.1')).toBe(null);
    });
  });

  describe('resolveCfxJoinCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns address and port from API response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          Data: {
            connectEndPoints: ['93.123.22.56:30120'],
          },
        },
      });
      const result = await resolveCfxJoinCode('p7zxb5');
      expect(result).toEqual({ address: '93.123.22.56', port: 30120 });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://servers-frontend.fivem.net/api/servers/single/p7zxb5',
        expect.any(Object)
      );
    });

    it('accepts ConnectEndPoints (PascalCase)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ConnectEndPoints: ['192.168.1.1:30120'],
        },
      });
      const result = await resolveCfxJoinCode('xyz');
      expect(result).toEqual({ address: '192.168.1.1', port: 30120 });
    });

    it('throws when no connect endpoints', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });
      await expect(resolveCfxJoinCode('bad')).rejects.toThrow('did not return connect endpoints');
    });
  });

  describe('resolveCfxJoinCodeCached', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns cached result on second call for same code', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { Data: { connectEndPoints: ['1.2.3.4:30120'] } },
      });
      const a = await resolveCfxJoinCodeCached('c1');
      const b = await resolveCfxJoinCodeCached('c1');
      expect(a).toEqual(b);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});
