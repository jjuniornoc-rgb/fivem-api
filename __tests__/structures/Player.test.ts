import { Player } from '../../src/structures/Player';
import type { RawPlayerIdentifiers } from '../../src/types';

describe('Player', () => {
  it('exposes name and id from data', () => {
    const data: RawPlayerIdentifiers = { name: 'TestPlayer', id: 1 };
    const player = new Player(data);
    expect((player as unknown as { name: string }).name).toBe('TestPlayer');
    expect((player as unknown as { id: number }).id).toBe(1);
  });

  it('parses identifiers array to object', () => {
    const data: RawPlayerIdentifiers = {
      name: 'P',
      id: 1,
      identifiers: ['steam:110000100000001', 'license:abc123'],
    };
    const player = new Player(data);
    const ids = (player as unknown as { identifiers: Record<string, string> }).identifiers;
    expect(ids).toEqual({ steam: '110000100000001', license: 'abc123' });
  });

  it('skips invalid identifiers without colon', () => {
    const data: RawPlayerIdentifiers = {
      identifiers: ['valid:123', 'invalid'],
    };
    const player = new Player(data);
    const ids = (player as unknown as { identifiers: Record<string, string> }).identifiers;
    expect(ids.valid).toBe('123');
    expect(ids.invalid).toBeUndefined();
  });

  it('toString returns name or Unknown', () => {
    expect(new Player({ name: 'Alice' }).toString()).toBe('Alice');
    expect(new Player({}).toString()).toBe('Unknown');
  });

  it('toJSON returns flattened object', () => {
    const data: RawPlayerIdentifiers = { name: 'Bob', id: 2 };
    const player = new Player(data);
    const json = player.toJSON() as Record<string, unknown>;
    expect(json.name).toBe('Bob');
    expect(json.id).toBe(2);
  });
});
