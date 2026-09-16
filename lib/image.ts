/**
 * Reduz uma foto no próprio navegador antes de enviar: limita o lado maior a
 * `maxSide` px e salva como JPEG. Foto de celular (3–5 MB) vira ~200–400 KB —
 * sobe rápido e fica abaixo do limite de 4,5 MB por requisição da Vercel.
 *
 * A imagem é decodificada via <img>, e não createImageBitmap, porque o <img>
 * aplica a rotação gravada pela câmera (EXIF) em todos os navegadores — sem
 * isso, fotos de iPhone em pé chegavam deitadas.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  // GIF/SVG não passam por canvas; manda como está.
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Se o navegador não conseguir decodificar (ex.: HEIC), envia o original.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
