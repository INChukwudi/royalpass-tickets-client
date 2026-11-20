import { parseQrRegistrationCode } from './qr-payload';

describe('parseQrRegistrationCode', () => {
  it('parses a plain registration code', () => {
    expect(parseQrRegistrationCode('  REG-123  ')).toBe('REG-123');
  });

  for (const key of ['registrationCode', 'code', 'token']) {
    it(`parses the ${key} JSON property`, () => {
      expect(parseQrRegistrationCode(JSON.stringify({ [key]: ' REG-123 ' }))).toBe('REG-123');
    });

    it(`parses the ${key} URL query parameter`, () => {
      expect(parseQrRegistrationCode(`https://example.com/check-in?${key}=REG-123`)).toBe('REG-123');
    });
  }

  it('parses the final nonempty URL path segment', () => {
    expect(parseQrRegistrationCode('https://example.com/check-in/REG-123/')).toBe('REG-123');
  });

  it('decodes an encoded URL path segment', () => {
    expect(parseQrRegistrationCode('https://example.com/check-in/REG%20123')).toBe('REG 123');
  });

  it('rejects empty and unusable structured payloads', () => {
    expect(parseQrRegistrationCode('  ')).toBeNull();
    expect(parseQrRegistrationCode('{"name":"Guest"}')).toBeNull();
    expect(parseQrRegistrationCode('{invalid')).toBeNull();
    expect(parseQrRegistrationCode('https://example.com/')).toBeNull();
  });
});
