import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist/royal-pass/browser');
const index = readFileSync(resolve(outputDirectory, 'index.html'), 'utf8');
const stylesheetLink = index.match(/<link\b[^>]*href=["'](styles-[^"']+\.css)["'][^>]*>/i);

if (!stylesheetLink) {
  throw new Error('Production build is missing its global stylesheet link.');
}

const linkMarkup = stylesheetLink[0];
if (/\bmedia=["']print["']/i.test(linkMarkup) || /\bonload\s*=/i.test(linkMarkup)) {
  throw new Error(
    'Global styles depend on an inline load handler, which is blocked by the production CSP.'
  );
}

const stylesheet = readFileSync(resolve(outputDirectory, stylesheetLink[1]), 'utf8');
if (!stylesheet.includes('.btn-gold')) {
  throw new Error('Production stylesheet is missing the shared .btn-gold control styles.');
}

console.log('Production stylesheet is CSP-safe and contains the shared control styles.');
