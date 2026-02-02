import axios from 'axios';
import { fetchWithRetry } from '../../src/util/fetchWithRetry';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data on first success', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { foo: 'bar' } });
    const result = await fetchWithRetry<{ foo: string }>('http://test.com', {}, false);
    expect(result).toEqual({ foo: 'bar' });
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('retries on failure when retry enabled', async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ data: { ok: true } });
    const result = await fetchWithRetry<{ ok: boolean }>(
      'http://test.com',
      { timeout: 5000 },
      { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 50 }
    );
    expect(result).toEqual({ ok: true });
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts exhausted', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));
    await expect(
      fetchWithRetry('http://test.com', {}, { maxAttempts: 2, initialDelayMs: 5, maxDelayMs: 20 })
    ).rejects.toThrow('network error');
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});
