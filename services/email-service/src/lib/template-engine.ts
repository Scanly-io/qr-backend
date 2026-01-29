import Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { convert } from 'html-to-text';

/**
 * TEMPLATE ENGINE
 * 
 * Features:
 * - Handlebars templating
 * - MJML support (responsive email design)
 * - Automatic text version generation
 * - Variable substitution
 */

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: string) {
  return new Date(date).toLocaleDateString();
});

Handlebars.registerHelper('uppercase', function(text: string) {
  return text.toUpperCase();
});

Handlebars.registerHelper('lowercase', function(text: string) {
  return text.toLowerCase();
});

export interface RenderOptions {
  template: string;
  variables: Record<string, any>;
  isMJML?: boolean;
}

export function renderTemplate(options: RenderOptions): { html: string; text: string } {
  const { template, variables, isMJML = false } = options;

  let html = template;

  // If MJML, convert to HTML first
  if (isMJML) {
    const mjmlResult = mjml2html(template, {
      validationLevel: 'soft',
    });
    html = mjmlResult.html;
  }

  // Render Handlebars
  const compiledTemplate = Handlebars.compile(html);
  const renderedHtml = compiledTemplate(variables);

  // Generate text version
  const text = convert(renderedHtml, {
    wordwrap: 80,
    selectors: [
      { selector: 'a', options: { ignoreHref: false } },
      { selector: 'img', format: 'skip' },
    ],
  });

  return { html: renderedHtml, text };
}

// Pre-validate template
export function validateTemplate(template: string, isMJML = false): { valid: boolean; errors?: string[] } {
  try {
    if (isMJML) {
      const result = mjml2html(template, { validationLevel: 'strict' });
      if (result.errors.length > 0) {
        return {
          valid: false,
          errors: result.errors.map((e: any) => e.message),
        };
      }
    }
    
    // Try to compile Handlebars
    Handlebars.compile(template);
    
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      errors: [error.message],
    };
  }
}

// Extract variables from template
export function extractVariables(template: string): string[] {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const matches = template.matchAll(variablePattern);
  const variables = new Set<string>();

  for (const match of matches) {
    const varName = match[1].trim().split(' ')[0]; // Get variable name without helpers
    if (!['formatDate', 'uppercase', 'lowercase'].includes(varName)) {
      variables.add(varName);
    }
  }

  return Array.from(variables);
}
