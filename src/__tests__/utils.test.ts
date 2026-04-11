import { describe, it, expect } from 'vitest';
import { cleanCR, normalizeUrl, extractBrand, formatBytes } from '@/lib/utils';

describe('cleanCR', () => {
  it('removes _x000d_ artifacts', () => {
    expect(cleanCR('hello_x000d_world')).toBe('helloworld');
    expect(cleanCR('line_x000D_break')).toBe('linebreak');
  });

  it('removes carriage returns', () => {
    expect(cleanCR('line\r\nbreak')).toBe('line\nbreak');
  });

  it('handles clean strings', () => {
    expect(cleanCR('no artifacts here')).toBe('no artifacts here');
  });
});

describe('normalizeUrl', () => {
  it('prepends https:// to bare domains', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('leaves existing schemes alone', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns empty for empty input', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('does not prepend to non-domain strings', () => {
    expect(normalizeUrl('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });
});

describe('extractBrand', () => {
  it('extracts brand from PUB_ pattern', () => {
    expect(extractBrand('PUB_HYPR_BR_LeroyMerlin', '')).toBe('LeroyMerlin');
    expect(extractBrand('PUB_ABC_US_Nike', '')).toBe('Nike');
  });

  it('falls back to campaign pipe pattern', () => {
    expect(extractBrand('', 'Campaign | BrandName')).toBe('BrandName');
  });

  it('returns advertiser as last resort', () => {
    expect(extractBrand('AdvertiserCo', 'NoPipe')).toBe('AdvertiserCo');
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1KB');
    expect(formatBytes(400 * 1024)).toBe('400KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5MB');
  });
});
