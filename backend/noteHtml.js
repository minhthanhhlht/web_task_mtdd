// Xử lý ghi chú HTML phía server: lọc an toàn (allowlist) và chuyển sang chữ thuần.

// Các thẻ được phép giữ lại
const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img',
  'h1', 'h2', 'h3', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);
// Thẻ không có thẻ đóng
const VOID_TAGS = new Set(['br', 'img', 'hr']);
// Thẻ bị bỏ luôn cả nội dung
const DROP_BLOCKS = /<(script|style|iframe|object|embed|noscript|template|textarea|title|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const KNOWN_ENTITIES = new Set(['&amp;', '&quot;', '&lt;', '&gt;', '&#39;']);

// Ghi chú có ít nhất một thẻ HTML thì coi là ghi chú rich
export function isRichNote(value) {
  return typeof value === 'string' && /<\/?[a-zA-Z][^>]*>/.test(value);
}

// Thoát ký tự đặc biệt trong chữ ngoài thẻ (giữ nguyên thực thể đã có)
function escapeText(text) {
  return text.replace(/&(?!(amp|lt|gt|quot|#39|nbsp);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Thoát giá trị thuộc tính
function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Giải mã đúng 5 thực thể cơ bản trong giá trị thuộc tính; gặp thực thể lạ thì trả null (bỏ thuộc tính)
function decodeAttr(value) {
  const entities = value.match(/&[#a-zA-Z0-9]+;/g) || [];
  if (entities.some((entity) => !KNOWN_ENTITIES.has(entity))) return null;
  return value.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// Đọc các thuộc tính của một thẻ mở thành object { tên: giá trị }
function parseAttrs(source) {
  const attrs = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

// Dựng chuỗi thuộc tính an toàn cho từng loại thẻ
function buildAttrs(tag, attrs) {
  const parts = [];
  if (tag === 'a') {
    const href = decodeAttr(attrs.href ?? '');
    if (href !== null && /^(https?:\/\/|mailto:)[^\s]*$/i.test(href)) parts.push(`href="${escapeAttr(href)}"`);
    parts.push('target="_blank"', 'rel="noopener noreferrer"');
  } else if (tag === 'img') {
    const src = decodeAttr(attrs.src ?? '');
    if (src === null || !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) return null;
    parts.push(`src="${escapeAttr(src)}"`);
    const alt = decodeAttr(attrs.alt ?? '');
    if (alt !== null && alt) parts.push(`alt="${escapeAttr(alt)}"`);
  } else if (tag === 'td' || tag === 'th') {
    for (const name of ['colspan', 'rowspan']) {
      if (/^\d{1,2}$/.test(attrs[name] ?? '')) parts.push(`${name}="${attrs[name]}"`);
    }
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
}

// Lọc ghi chú: nếu là chữ thuần thì giữ nguyên, nếu là HTML thì dựng lại từ danh sách cho phép
export function sanitizeNote(value) {
  if (!isRichNote(value)) return value;
  const source = value.replace(/<!--[\s\S]*?-->/g, '').replace(DROP_BLOCKS, '');
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const stack = [];
  let output = '';
  let last = 0;
  let match;
  while ((match = tagPattern.exec(source)) !== null) {
    output += escapeText(source.slice(last, match.index));
    last = tagPattern.lastIndex;
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue; // thẻ lạ: bỏ thẻ, giữ chữ
    if (closing) {
      // Chỉ đóng nếu thẻ đang mở, đóng luôn các thẻ con chưa đóng
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      while (stack.length > index) output += `</${stack.pop()}>`;
      continue;
    }
    const attrs = buildAttrs(tag, parseAttrs(match[3]));
    if (attrs === null) continue; // img không có src hợp lệ thì bỏ hẳn
    output += `<${tag}${attrs}>`;
    if (!VOID_TAGS.has(tag)) stack.push(tag);
  }
  output += escapeText(source.slice(last));
  while (stack.length) output += `</${stack.pop()}>`; // đóng đủ thẻ còn mở
  return output;
}

// Chuyển ghi chú sang chữ thuần (dùng cho nhật ký, progress_log, CSV, danh sách)
export function noteToPlainText(value) {
  if (!isRichNote(value)) return value ?? '';
  return value
    .replace(/<img\b[^>]*>/gi, ' [ảnh] ')
    .replace(/<\/(p|div|li|tr|h1|h2|h3|blockquote|pre)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)\s*>/gi, ' | ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
