/**
 * A picked image as what jsPDF needs: a PNG data URL and its pixel size.
 * PNGs and JPGs pass through; SVGs are drawn to a canvas (jsPDF can't place
 * SVG), at 3x or at least 1200px wide so they stay sharp in print.
 */
export function readReportImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name)) {
          const format = /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name) ? 'JPEG' : 'PNG';
          resolve({ dataUrl: reader.result, format, width: img.naturalWidth, height: img.naturalHeight });
          return;
        }
        // SVGs without width/height report 0 (or 300 × 150); fall back to a sensible size.
        const w = img.naturalWidth || 300;
        const h = img.naturalHeight || 150;
        const scale = Math.max(3, 1200 / w);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: canvas.width, height: canvas.height });
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
