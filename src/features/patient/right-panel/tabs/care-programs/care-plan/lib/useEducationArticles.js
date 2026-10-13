import { useEffect, useState } from 'react';
import { listEducationContent } from '../../../../../../messages/comms/commsRepo';
import { EDUCATION_LIBRARY } from '../../../../../../messages/comms/educationLibrary';

/** The article icon used wherever patient education articles are listed. */
export const ARTICLE_ICON = 'solar:notebook-minimalistic-linear';

/**
 * Patient education articles (patient_education_content, else the built-in
 * MedlinePlus list), the same set Send Education offers. Starts on the
 * built-in list so saved picks have a title before the table answers.
 */
export function useEducationArticles(enabled = true) {
  const [articles, setArticles] = useState(EDUCATION_LIBRARY);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    listEducationContent().then((rows) => { if (live && rows?.length) setArticles(rows); });
    return () => { live = false; };
  }, [enabled]);
  return articles;
}

/** Patient Education picks as `article:<id>` values; legacy single values drop. */
export function articleValues(content) {
  const list = Array.isArray(content) ? content : (content ? [content] : []);
  return list.filter(v => typeof v === 'string' && v.startsWith('article:'));
}
