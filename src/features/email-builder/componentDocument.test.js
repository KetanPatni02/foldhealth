import { describe, it, expect } from 'vitest';
import { componentToDocument, documentToComponent } from './componentDocument';
import { reportHeaderTree, withReportHeader, defaultReportHeader, withReportFooter, defaultReportFooter, REPORT_HEADER_SLUG, REPORT_FOOTER_SLUG } from './reportHeaderComponent';
import { applyMergeTags } from './mergeTags';

describe('components in the builder', () => {
  it('round-trips a saved component through a builder document', () => {
    const tree = reportHeaderTree();
    const doc = componentToDocument(tree);
    expect(doc.root.data.childrenIds).toEqual([tree.rootId]);
    const back = documentToComponent(doc, 'header');
    expect(back.rootId).toBe(tree.rootId);
    expect(Object.keys(back.blocks).sort()).toEqual(Object.keys(tree.blocks).sort());
  });

  it('wraps loose top-level blocks in one container carrying the role', () => {
    const doc = componentToDocument(null);
    doc.a = { type: 'Text', data: { props: { text: 'A' } } };
    doc.b = { type: 'Image', data: { props: { url: 'x.png' } } };
    doc.root.data.childrenIds = ['a', 'b'];
    const tree = documentToComponent(doc, 'footer');
    const root = tree.blocks[tree.rootId];
    expect(root.type).toBe('Container');
    expect(root.data.role).toBe('footer');
    expect(root.data.props.childrenIds).toEqual(['a', 'b']);
    expect(documentToComponent(componentToDocument(null), 'header')).toBeNull();
  });

  it('fills the report tokens', () => {
    const out = applyMergeTags('{{report_title}} · Generated On : {{generated_on}} · {{employer_logo}}', {
      reportTitle: 'Q3 Report', generatedOn: '09/25/2026 at 5:47 PM', employerLogo: 'data:image/png;base64,AA',
    });
    expect(out).toBe('Q3 Report · Generated On : 09/25/2026 at 5:47 PM · data:image/png;base64,AA');
  });

  it('offers the report header beside saved email headers and starts on it', () => {
    const releaseNote = { id: 7, label: 'Release Note', isDefault: false };
    const headers = withReportHeader([releaseNote]);
    expect(headers.map(h => h.label)).toEqual(['Print Report Header Option 1', 'Print Report Header Option 2', 'Print Report Header Option 3', 'Print Report Header Option 4', 'Release Note']);
    expect(defaultReportHeader(headers).slug).toBe(REPORT_HEADER_SLUG);
    // Once seeded, the saved copy replaces the local one.
    const seeded = { id: 9, slug: REPORT_HEADER_SLUG, label: 'Print Report Header Option 1', isDefault: true };
    // Once seeded, the saved list is used as is: no stand-ins, so a deleted
    // option stays deleted.
    expect(withReportHeader([releaseNote, seeded]).map(h => h.label)).toEqual(['Release Note', 'Print Report Header Option 1']);
    // A saved default wins.
    expect(defaultReportHeader(withReportHeader([{ ...releaseNote, isDefault: true }])).id).toBe(7);
  });

  it('offers the report footer, which shows the page number', () => {
    const footer = defaultReportFooter(withReportFooter([]));
    expect(footer.slug).toBe(REPORT_FOOTER_SLUG);
    expect(JSON.stringify(footer.tree)).toContain('{{page_number}}');
    expect(applyMergeTags('{{page_number}}', { pageNumber: 3 })).toBe('3');
  });

  it('has Option 2 (from the report frame), in Trailhead blue, with the report name', async () => {
    const { PATIENT_SUMMARY_HEADER_COMPONENT, PATIENT_SUMMARY_FOOTER_COMPONENT } = await import('./reportHeaderComponent');
    const header = JSON.stringify(PATIENT_SUMMARY_HEADER_COMPONENT.tree);
    expect(header).toContain('{{report_title}}');
    expect(header).toContain('Page {{page_number}} of {{page_count}}');
    expect(header).toContain('trailhead-clinics-logo');
    const footer = JSON.stringify(PATIENT_SUMMARY_FOOTER_COMPONENT.tree);
    expect(footer).toContain('#1376BC');
    expect(footer).toContain('1607 Grand Ave Unit 22, Glenwood Springs, CO 81601');
    expect(withReportFooter([]).map(f => f.label)).toEqual(['Print Report Footer Option 1', 'Print Report Footer Option 2', 'Print Report Footer Option 3', 'Print Report Footer Option 4']);
  });
});
