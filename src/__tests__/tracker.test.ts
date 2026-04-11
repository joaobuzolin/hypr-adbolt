import { describe, it, expect } from 'vitest';
import { analyzeTracker, mergeTrackers } from '@/parsers/tracker';

describe('analyzeTracker', () => {
  it('detects plain image pixel URL', () => {
    const r = analyzeTracker('https://pixel.example.com/track.gif');
    expect(r.format).toBe('url-image');
    expect(r.url).toBe('https://pixel.example.com/track.gif');
  });

  it('detects .js URL as url-js', () => {
    const r = analyzeTracker('https://cdn.example.com/tracker.js?v=1');
    expect(r.format).toBe('url-js');
  });

  it('detects /js/ path as url-js', () => {
    const r = analyzeTracker('https://cdn.example.com/js/pixel');
    expect(r.format).toBe('url-js');
  });

  it('detects .html URL as url-html', () => {
    const r = analyzeTracker('https://example.com/track.html');
    expect(r.format).toBe('url-html');
  });

  it('extracts src from <script> tag', () => {
    const r = analyzeTracker('<script src="https://cdn.example.com/t.js"></script>');
    expect(r.format).toBe('url-js');
    expect(r.url).toBe('https://cdn.example.com/t.js');
  });

  it('detects inline <script> block as raw-js', () => {
    const r = analyzeTracker('<script>var x = 1;</script>');
    expect(r.format).toBe('raw-js');
    expect(r.url).toContain('<script>');
  });

  it('extracts src from <img> tag', () => {
    const r = analyzeTracker('<img src="https://pixel.com/1x1.gif" width="1" height="1">');
    expect(r.format).toBe('url-image');
    expect(r.url).toBe('https://pixel.com/1x1.gif');
  });

  it('extracts data-3rd-tracker attribute', () => {
    const r = analyzeTracker('<div data-3rd-tracker="https://t.co/pixel.gif"></div>');
    expect(r.format).toBe('url-image');
    expect(r.url).toBe('https://t.co/pixel.gif');
  });

  it('extracts iframe src as url-html', () => {
    const r = analyzeTracker('<iframe src="https://example.com/frame.html"></iframe>');
    expect(r.format).toBe('url-html');
    expect(r.url).toBe('https://example.com/frame.html');
  });

  it('falls back to any URL extraction', () => {
    const r = analyzeTracker('<div>Some text https://example.com/pixel.png more text</div>');
    expect(r.format).toBe('url-image');
    expect(r.url).toBe('https://example.com/pixel.png');
  });
});

describe('mergeTrackers', () => {
  it('passes through all-scope trackers', () => {
    const result = mergeTrackers(
      [{ url: 'https://a.com/p.gif', format: 'url-image' as const, dsps: 'all' as const }],
      'xandr',
    );
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://a.com/p.gif');
  });

  it('filters by DSP scope', () => {
    const trackers = [
      { url: 'https://a.com', format: 'url-image' as const, dsps: ['xandr'] as ('xandr' | 'dv360')[] },
      { url: 'https://b.com', format: 'url-image' as const, dsps: ['dv360'] as ('xandr' | 'dv360')[] },
    ];
    const xandr = mergeTrackers(trackers, 'xandr');
    expect(xandr).toHaveLength(1);
    expect(xandr[0].url).toBe('https://a.com');

    const dv = mergeTrackers(trackers, 'dv360');
    expect(dv).toHaveLength(1);
    expect(dv[0].url).toBe('https://b.com');
  });

  it('deduplicates by URL', () => {
    const result = mergeTrackers(
      [
        { url: 'https://same.com', format: 'url-image' as const, dsps: 'all' as const },
        { url: 'https://same.com', format: 'url-js' as const, dsps: 'all' as const },
      ],
      'xandr',
    );
    expect(result).toHaveLength(1);
  });

  it('handles legacy string format', () => {
    const result = mergeTrackers(['https://legacy.com/pixel.gif'], 'dv360');
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://legacy.com/pixel.gif');
    expect(result[0].format).toBe('url-image');
  });
});
