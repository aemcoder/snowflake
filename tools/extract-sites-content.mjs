/**
 * Generate DA content for AEM Sites page (iter-04).
 *
 * Reads stardust source + emits content/iter-04/sites.html with:
 * - <table> blocks per module: Stardust-Module (<module-id>) header + slot rows
 * - Metadata block
 *
 * Limitations: this is iter-04-specific; not generalized. iter-05 should
 * subsume into a proper extractor (BACKLOG: generalize template extraction).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const SOURCE = resolve(REPO, 'stardust/products/experience-manager/sites.html');
const ASSET_BASE = 'https://main--snowflake--aemcoder.aem.page/stardust/products/experience-manager';
const html = readFileSync(SOURCE, 'utf8');
const $ = load(html);

const out = [];
out.push('<body>');
out.push('  <header></header>');
out.push('  <main>');

// Metadata block
out.push(`
    <div>
      <table>
        <tbody>
          <tr><th>Metadata</th></tr>
          <tr><td>title</td><td>Adobe Experience Manager Sites — agentic CMS</td></tr>
          <tr><td>template</td><td>stardust</td></tr>
        </tbody>
      </table>
    </div>`);

const escapeText = (t) => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
const fixSrc = (src) => {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src;
  return `${ASSET_BASE}/${src}`;
};
const $img = (el) => {
  const $el = $(el);
  return `<img src="${fixSrc($el.attr('src'))}" alt="${escapeText($el.attr('alt'))}" width="${$el.attr('width') || ''}" height="${$el.attr('height') || ''}">`;
};

const tableBlock = (moduleId, rows) => {
  let s = `\n    <div>\n      <table>\n        <tbody>\n          <tr><th>Stardust-Module (${moduleId})</th></tr>`;
  for (const [name, ...cells] of rows) {
    s += `\n          <tr><td>${escapeText(name)}</td>`;
    for (const c of cells) s += `<td>${c}</td>`;
    s += '</tr>';
  }
  s += '\n        </tbody>\n      </table>\n    </div>';
  return s;
};

// aem-hero
{
  const $sec = $('section.aem-hero');
  out.push(tableBlock('aem-hero', [
    ['eyebrow', escapeText($sec.find('.aem-hero__eyebrow').text())],
    ['title', escapeText($sec.find('.aem-hero__title').text())],
    ['body', escapeText($sec.find('.aem-hero__body').text())],
    ['cta-primary', `<a href="${$sec.find('.aem-hero__ctas a').eq(0).attr('href') || '#'}">${escapeText($sec.find('.aem-hero__ctas a').eq(0).text())}</a>`],
    ['cta-secondary', `<a href="${$sec.find('.aem-hero__ctas a').eq(1).attr('href') || '#'}">${escapeText($sec.find('.aem-hero__ctas a').eq(1).text())}</a>`],
    ['image', $img($sec.find('.aem-hero__bg')[0])],
  ]));
}

// rainbow-strip
{
  const $sec = $('section.rainbow-strip');
  out.push(tableBlock('rainbow-strip', [
    ['msg', escapeText($sec.find('.rainbow-strip__msg').text())],
    ['cta', `<a href="${$sec.find('.rainbow-strip__cta').attr('href') || '#'}">${escapeText($sec.find('.rainbow-strip__cta').text())}</a>`],
  ]));
}

// aem-features (default-tab snapshot only)
{
  const $sec = $('section.aem-features');
  const rows = [
    ['title', escapeText($sec.find('.aem-features__title').text())],
    ['sub', escapeText($sec.find('.aem-features__sub').text())],
  ];
  $sec.find('.aem-features__tab').each((i, el) => rows.push(['item', escapeText($(el).text())]));
  rows.push(['pane-image', $img($sec.find('.aem-features__bg')[0])]);
  rows.push(['pane-title', escapeText($sec.find('.aem-features__pane-title').text())]);
  rows.push(['pane-body', escapeText($sec.find('.aem-features__pane-body').text())]);
  $sec.find('.aem-features__bullet').each((i, el) => rows.push(['item', escapeText($(el).text())]));
  rows.push(['pane-cta', `<a href="${$sec.find('.aem-features__cta').attr('href') || '#'}">${escapeText($sec.find('.aem-features__cta').text())}</a>`]);
  out.push(tableBlock('aem-features', rows));
}

// aem-use-cases
{
  const $sec = $('section.aem-use-cases');
  const rows = [
    ['title', escapeText($sec.find('.aem-use-cases__title').text())],
  ];
  $sec.find('.aem-use-case').each((i, el) => {
    const $u = $(el);
    rows.push([
      'item',
      $img($u.find('img')[0]),
      escapeText($u.find('.aem-use-case__title').text()),
      escapeText($u.find('.aem-use-case__body').text()),
    ]);
  });
  out.push(tableBlock('aem-use-cases', rows));
}

// aem-forrester (family canon via catalog)
{
  const $sec = $('section.aem-forrester');
  out.push(tableBlock('aem-forrester', [
    ['title', escapeText($sec.find('.aem-forrester__title').text())],
    ['cta', `<a href="${$sec.find('a').attr('href') || '#'}">${escapeText($sec.find('a').text())}</a>`],
    ['image', $img($sec.find('.aem-forrester__bg')[0])],
  ]));
}

// brands-strip-aem (NEW canon, distinct from afbs)
{
  const $sec = $('section.brands-strip');
  const rows = [
    ['title', escapeText($sec.find('.brands-strip__title').text())],
  ];
  $sec.find('.brands-strip__item').each((i, el) => {
    const $u = $(el);
    rows.push([
      'item',
      $u.find('.brands-strip__logo').html() || '',
      escapeText($u.find('.brands-strip__metric').text()),
    ]);
  });
  rows.push(['foot-cta', `<a href="${$sec.find('.brands-strip__foot a').attr('href') || '#'}">${escapeText($sec.find('.brands-strip__foot a').text())}</a>`]);
  out.push(tableBlock('brands-strip-aem', rows));
}

// aem-resources
{
  const $sec = $('section.aem-resources');
  const rows = [
    ['title', escapeText($sec.find('.aem-resources__title').text())],
  ];
  $sec.find('.aem-resource-card').each((i, el) => {
    const $u = $(el);
    const cat = $u.find('.aem-resource-card__category');
    const title = $u.find('.aem-resource-card__title');
    rows.push([
      'item',
      `<a href="${$u.attr('href') || '#'}">link</a>`,
      cat.length ? escapeText(cat.text()) : '',
      escapeText(title.text()),
    ]);
  });
  rows.push(['foot-cta', `<a href="${$sec.find('.aem-resources__foot a').attr('href') || '#'}">${escapeText($sec.find('.aem-resources__foot a').text())}</a>`]);
  out.push(tableBlock('aem-resources', rows));
}

// acrobat-feature (--teal variant; 3 cards)
{
  const $sec = $('section.acrobat-feature');
  const rows = [
    ['title', escapeText($sec.find('.acrobat-feature__title').text())],
    ['body', escapeText($sec.find('.acrobat-feature__body').text())],
  ];
  $sec.find('.acrobat-card').each((i, el) => {
    const $u = $(el);
    rows.push([
      'item',
      $img($u.find('img')[0]),
      escapeText($u.find('.acrobat-card__title').text()),
      escapeText($u.find('.acrobat-card__body').text()),
      `<a href="${$u.find('.acrobat-cta').attr('href') || '#'}">${escapeText($u.find('.acrobat-cta').text())}</a>`,
    ]);
  });
  out.push(tableBlock('acrobat-feature', rows));
}

// faq-accordion
{
  const $sec = $('section.faq-accordion');
  const rows = [
    ['title', escapeText($sec.find('.faq-accordion__title').text())],
  ];
  $sec.find('.faq-accordion__item').each((i, el) => {
    const $u = $(el);
    rows.push([
      'item',
      escapeText($u.find('.faq-accordion__trigger span').first().text()),
      escapeText($u.find('.faq-accordion__answer').text()),
    ]);
  });
  out.push(tableBlock('faq-accordion', rows));
}

// inline-form
{
  const $sec = $('section.inline-form');
  const rows = [
    ['title', escapeText($sec.find('.inline-form__title').text())],
    ['email-label', 'Business email'],
    ['country-label', 'Country'],
    ['submit-text', escapeText($sec.find('.inline-form__submit').text())],
    ['step', escapeText($sec.find('.inline-form__step').text())],
  ];
  out.push(tableBlock('inline-form', rows));
}

// aem-final-cta (family canon)
{
  const $sec = $('section.aem-final-cta');
  out.push(tableBlock('aem-final-cta', [
    ['title', escapeText($sec.find('.aem-final-cta__title').text())],
    ['cta', `<a href="${$sec.find('a').attr('href') || '#'}">${escapeText($sec.find('a').text())}</a>`],
    ['image', $img($sec.find('.aem-final-cta__bg')[0])],
  ]));
}

out.push('  </main>');
out.push('  <footer></footer>');
out.push('</body>');

mkdirSync(resolve(REPO, 'content/iter-04'), { recursive: true });
const outPath = resolve(REPO, 'content/iter-04/sites.html');
writeFileSync(outPath, out.join('\n'));
console.log(`Wrote ${outPath} (${out.join('\n').length} bytes)`);
