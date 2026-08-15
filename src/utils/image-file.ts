const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|jfif)$/i;

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "" || file.type === "application/octet-stream") {
    return IMAGE_EXT.test(file.name);
  }
  return IMAGE_EXT.test(file.name);
}

function isHeicLike(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/** Create a blob URL the preview can display (HEIC is converted locally). */
export async function fileToObjectUrl(file: File): Promise<string> {
  if (isHeicLike(file)) {
    const { heicTo } = await import("./heic-convert");
    const jpeg = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.9,
    });
    return URL.createObjectURL(jpeg as Blob);
  }
  return URL.createObjectURL(file);
}
