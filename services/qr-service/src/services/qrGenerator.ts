import QRCode from "qrcode";

export async function generateQrPng(text: string): Promise<Buffer> {
  try {
    // Generate a PNG buffer directly (fastest)
    const qrPngBuffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: "H",
      width: 400,
      margin: 2,
    });

    return qrPngBuffer;

  } catch (error) {
    throw new Error("Failed to generate QR code: " + (error as any).message);
  }
}
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    // Generate a Data URL (base64-encoded PNG)
    const qrDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      width: 400,
      margin: 2,
    });

    return qrDataUrl;

  } catch (error) {
    throw new Error("Failed to generate QR code: " + (error as any).message);
  }
}   