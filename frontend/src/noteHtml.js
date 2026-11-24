// Xử lý ghi chú HTML phía trình duyệt: nhận diện, đổi chữ thuần sang HTML, lọc đoạn dán, thu nhỏ ảnh.

// Thẻ cho phép (cùng danh sách với backend)
const ALLOWED_TAGS = new Set(['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img',
  'h1', 'h2', 'h3', 'blockquote', 'pre', 'code', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td']);
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'textarea', 'title', 'svg', 'math']);
const IMAGE_PATTERN = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/;

// Ghi chú có thẻ HTML thì là rich
export function isRichNote(value) {
  return typeof value === 'string' && /<\/?[a-zA-Z][^>]*>/.test(value);
}

// Thoát ký tự HTML
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Chữ thuần → HTML (xuống dòng thành <br>); ghi chú đã là HTML giữ nguyên
export function noteToHtml(value) {
  if (!value) return '';
  return isRichNote(value) ? value : escapeHtml(value).replace(/\n/g, '<br>');
}

// Lọc đoạn HTML dán vào bằng DOMParser theo danh sách cho phép
export function sanitizeFragment(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = (node) => {
    let output = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) { output += escapeHtml(child.textContent); return; }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName.toLowerCase();
      if (DROP_TAGS.has(tag)) return;
      if (!ALLOWED_TAGS.has(tag)) { output += clean(child); return; }
      let attrs = '';
      if (tag === 'a') {
        const href = child.getAttribute('href') ?? '';
        if (/^(https?:\/\/|mailto:)\S*$/i.test(href)) attrs += ` href="${escapeHtml(href).replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"`;
      } else if (tag === 'img') {
        const src = child.getAttribute('src') ?? '';
        if (!IMAGE_PATTERN.test(src)) return;
        attrs += ` src="${src}"`;
      } else if (tag === 'td' || tag === 'th') {
        ['colspan', 'rowspan'].forEach((name) => { if (/^\d{1,2}$/.test(child.getAttribute(name) ?? '')) attrs += ` ${name}="${child.getAttribute(name)}"`; });
      }
      output += ['br', 'img', 'hr'].includes(tag) ? `<${tag}${attrs}>` : `<${tag}${attrs}>${clean(child)}</${tag}>`;
    });
    return output;
  };
  return clean(doc.body);
}

// Đọc file ảnh thành data URL đã thu nhỏ (cạnh dài ≤ 1600px, JPEG 0.85 → 0.6, tối đa 1.500.000 ký tự)
export async function imageFileToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ chấp nhận file ảnh');
  const MAX_CHARS = 1500000;
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Chỉ chấp nhận file ảnh'));
    reader.readAsDataURL(file);
  });
  // GIF nhỏ giữ nguyên để không mất hoạt ảnh
  if (file.type === 'image/gif' && source.length <= MAX_CHARS) return source;
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Chỉ chấp nhận file ảnh'));
    img.src = source;
  });
  let scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.6]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= MAX_CHARS) return url;
    }
    scale *= 0.7;
  }
  throw new Error('Ảnh quá lớn, hãy dùng ảnh nhỏ hơn');
}
