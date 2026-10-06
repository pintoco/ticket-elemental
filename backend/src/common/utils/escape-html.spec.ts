import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>&')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;',
    );
  });
  it('handles null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
