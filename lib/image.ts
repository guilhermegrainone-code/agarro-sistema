/**
 * Reduz uma foto no próprio navegador antes de enviar: limita o lado maior a
 * `maxSide` px e salva como JPEG. Foto de celular (3–5 MB) vira ~200–400 KB —
 * sobe rápido e fica abaixo do limite de 4,5 MB por requisição da Vercel.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  // GIF/SVG não passam por canvas; manda como está.
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
