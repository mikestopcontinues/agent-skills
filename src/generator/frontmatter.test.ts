import { describe, expect, it } from 'vitest';
import { composeArtifact, formatFrontmatter, parseFrontmatter } from './frontmatter.ts';

describe('parseFrontmatter', () => {
  it('parses a Phase 1-style skill header', () => {
    const text = '---\nname: create-spike\ndescription: "Do the thing — now."\ntools: Read, Bash\n---\n\nBody here.\n';
    const { fields, body } = parseFrontmatter(text, 'test');
    expect(fields).toEqual({ name: 'create-spike', description: 'Do the thing — now.', tools: 'Read, Bash' });
    expect(body).toBe('\nBody here.\n');
  });

  it('throws on a missing leading delimiter', () => {
    expect(() => parseFrontmatter('name: x\n---\nbody', 'test')).toThrow();
  });

  it('throws on an unterminated block', () => {
    expect(() => parseFrontmatter('---\nname: x\n', 'test')).toThrow();
  });

  it('throws on a duplicate key', () => {
    expect(() => parseFrontmatter('---\nname: a\nname: b\n---\nx', 'test')).toThrow();
  });
});

describe('formatFrontmatter', () => {
  it('double-quotes description, leaves name/tools/model bare', () => {
    expect(formatFrontmatter({ name: 'x', description: 'hello', tools: 'Read, Bash', model: 'opus' })).toBe(
      '---\nname: x\ndescription: "hello"\ntools: Read, Bash\nmodel: opus\n---\n',
    );
  });

  it('escapes quotes inside a description', () => {
    expect(formatFrontmatter({ description: 'say "hi"' })).toBe('---\ndescription: "say \\"hi\\""\n---\n');
  });

  it('quotes a value that needs it', () => {
    expect(formatFrontmatter({ x: 'a: b' })).toBe('---\nx: "a: b"\n---\n');
  });
});

describe('round-trip', () => {
  it('parse ∘ compose is the identity for Phase 1-style headers', () => {
    const original =
      '---\nname: review-doc\ndescription: "Single-focus document review subagent."\ntools: Read, Glob, Grep\n---\n\n# Review Doc\n\nStuff.\n';
    const { fields, body } = parseFrontmatter(original, 'test');
    expect(composeArtifact(fields, body)).toBe(original);
  });
});
