export function renderMicrosite(site: any) {
  const { title, description, theme, links, layout } = site;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Tailwind CDN (Simple for MVP) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <title>${title}</title>

  <style>
    body {
      background: ${theme?.background || "#ffffff"};
      color: ${theme?.textColor || "#000000"};
    }
  </style>
</head>

<body class="min-h-screen flex flex-col items-center px-4 py-8">

  <div class="w-full max-w-md">

    <h1 class="text-2xl font-bold mb-2">${title}</h1>
    <p class="text-gray-600 mb-4">${description || ""}</p>

    <!-- Links -->
    <div class="space-y-3">
      ${
        links?.map(
          (l: any) => `
        <a 
          href="${l.url}" 
          target="_blank"
          class="block bg-blue-600 text-white rounded-lg py-3 text-center"
        >
          ${l.label}
        </a>`
        ).join("") || ""
      }
    </div>

    <!-- Layout Blocks -->
    <div class="mt-6 space-y-4">
      ${
        layout?.map((block: any) => renderBlock(block)).join("") || ""
      }
    </div>

  </div>
</body>
</html>
`;
}

// Helper function to render layout blocks
function renderBlock(block: any) {
  switch (block.type) {
    case "text":
      return `<p class="text-lg">${block.value}</p>`;
    case "image":
      return `<img src="${block.url}" class="w-full rounded-lg" />`;
    case "button":
      return `
        <a href="${block.url}" class="block bg-indigo-600 text-white py-3 rounded-lg text-center">
          ${block.label}
        </a>
      `;
    default:
      return "";
  }
}
