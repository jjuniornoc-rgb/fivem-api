import { DfaError, DfaTypeError, createErrorMessage } from '../../src/util/Error';

describe('Error', () => {
  describe('DfaError', () => {
    it('has code and message', () => {
      const err = new DfaError('NO_ADDRESS', 'No address was provided.');
      expect(err.code).toBe('NO_ADDRESS');
      expect(err.message).toBe('No address was provided.');
    });

    it('name includes code', () => {
      const err = new DfaError('NO_PORT', 'No port.');
      expect(err.name).toContain('NO_PORT');
      expect(err.name).toContain('DiscordFivemApi');
    });

    it('toString includes code', () => {
      const err = new DfaError('INVALID', 'Invalid.');
      expect(err.toString()).toContain('INVALID');
    });
  });

  describe('DfaTypeError', () => {
    it('is instance of TypeError', () => {
      const err = new DfaTypeError('INVALID_ADDRESS', 'Must be string.');
      expect(err).toBeInstanceOf(TypeError);
      expect(err.code).toBe('INVALID_ADDRESS');
    });
  });

  describe('createErrorMessage', () => {
    it('returns error class with code', () => {
      const CustomError = createErrorMessage(Error);
      const err = new CustomError('CUSTOM', 'Custom message');
      expect(err.code).toBe('CUSTOM');
      expect(err.message).toBe('Custom message');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
