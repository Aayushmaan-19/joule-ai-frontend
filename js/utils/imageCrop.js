/**
 * Loads an image file and resolves with a center-cropped, square
 * JPEG blob at `size`x`size`. No manual reposition/zoom step — this
 * is deliberately automatic, using the largest centered square that
 * fits the source image.
 */
export function cropToSquare(file, size = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error("Couldn't process that image"))),
        "image/jpeg",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image"));
    };

    img.src = objectUrl;
  });
}
