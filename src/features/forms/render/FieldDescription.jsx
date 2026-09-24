import { sanitizeRichText } from '../../../lib/sanitizeHtml';

const HAS_MARKUP = /<\/?[a-z][^>]*>/i;

/**
 * A question's description. Descriptions were plain text until the Rating
 * question's settings gave them a rich-text editor, so this renders either:
 * plain text as before, or formatted text sanitized to the rich-text profile.
 *
 * A formatted description renders in a <div>: the editor's markup can itself
 * contain block elements, which a <p> may not hold.
 *
 * @param {object} props
 * @param {string} props.text        – Plain text or HTML
 * @param {string} [props.as='p']    – Element for a plain-text description
 * @param {string} [props.className]
 */
export function FieldDescription({ text, as: Tag = 'p', className }) {
  if (!text) return null;
  if (!HAS_MARKUP.test(text)) return <Tag className={className}>{text}</Tag>;

  const html = sanitizeRichText(text);
  // An editor emptied back out leaves markup with no words in it ("<br>").
  if (!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
