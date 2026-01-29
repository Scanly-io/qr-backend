import QRCodeStyling from "qr-code-styling";
import { createCanvas } from "canvas";
import { JSDOM } from "jsdom";

// Setup DOM environment for qr-code-styling (which expects browser APIs)
try {
  const { window } = new JSDOM("<!DOCTYPE html>");
  (global as any).window = window;
  (global as any).document = window.document;
  if (!(global as any).navigator) {
    (global as any).navigator = window.navigator;
  }
  (global as any).HTMLCanvasElement = window.HTMLCanvasElement as any;
  (global as any).Image = window.Image;
} catch (error) {
  // In test environments, navigator might already be set by jsdom
  console.warn("JSDOM setup skipped (likely already initialized):", error);
}

export interface QRStyle {
  primaryColor?: string;
  backgroundColor?: string;
  dotStyle?: "rounded" | "dots" | "classy" | "square";
  cornerSquareStyle?: "dot" | "square" | "extra-rounded";
  cornerDotStyle?: "dot" | "square";
  logo?: string; // URL or data URL
  logoSize?: number; // 0.0 to 1.0
  gradient?: {
    type: "linear" | "radial";
    colorStops: Array<{ offset: number; color: string }>;
  };
}

export async function generateQrPng(
  text: string,
  style?: QRStyle
): Promise<Buffer> {
  try {
    // Create a canvas instance for server-side rendering
    const canvas = createCanvas(400, 400);
    
    const qrCode = new QRCodeStyling({
      width: 400,
      height: 400,
      data: text,
      margin: 10,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: "H",
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: style?.logoSize || 0.3,
        margin: 10,
        crossOrigin: "anonymous",
      },
      dotsOptions: {
        color: style?.primaryColor || "#000000",
        type: style?.dotStyle || "rounded",
        ...(style?.gradient && {
          gradient: {
            type: style.gradient.type,
            rotation: 0,
            colorStops: style.gradient.colorStops,
          },
        }),
      },
      backgroundOptions: {
        color: style?.backgroundColor || "#ffffff",
      },
      cornersSquareOptions: {
        color: style?.primaryColor || "#000000",
        type: style?.cornerSquareStyle || "extra-rounded",
      },
      cornersDotOptions: {
        color: style?.primaryColor || "#000000",
        type: style?.cornerDotStyle || "dot",
      },
      ...(style?.logo && { image: style.logo }),
      // IMPORTANT: Pass canvas instance for Node.js environment
      canvas,
    } as any); // Type assertion needed as canvas option isn't in official types

    // Generate buffer using canvas
    const buffer = await qrCode.getRawData("png");
    if (!buffer) {
      throw new Error("Failed to generate QR code buffer");
    }

    // Handle both Buffer and Blob types
    if (buffer instanceof Buffer) {
      return buffer;
    } else {
      // Convert Blob to Buffer
      const arrayBuffer = await (buffer as Blob).arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (error) {
    throw new Error("Failed to generate QR code: " + (error as any).message);
  }
}

export async function generateQrDataUrl(
  text: string,
  style?: QRStyle
): Promise<string> {
  try {
    const buffer = await generateQrPng(text, style);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    throw new Error("Failed to generate QR code: " + (error as any).message);
  }
}   