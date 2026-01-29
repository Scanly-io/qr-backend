import { FastifyInstance } from 'fastify';

// Language configuration
const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  zh: { name: 'Chinese', nativeName: '中文', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false },
  nl: { name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  pl: { name: 'Polish', nativeName: 'Polski', rtl: false },
  tr: { name: 'Turkish', nativeName: 'Türkçe', rtl: false },
};

// In-memory storage for translations
interface Translation {
  id: string;
  resourceType: 'microsite' | 'page' | 'block';
  resourceId: string;
  language: string;
  content: Record<string, any>;
  isAutoTranslated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MicrositeLanguageSettings {
  micrositeId: string;
  defaultLanguage: string;
  enabledLanguages: string[];
  autoDetect: boolean;
  showLanguageSwitcher: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const translations = new Map<string, Translation>();
const languageSettings = new Map<string, MicrositeLanguageSettings>();

// Helper to generate translation ID
function generateTranslationId(resourceType: string, resourceId: string, language: string): string {
  return `${resourceType}_${resourceId}_${language}`;
}

export default async function i18nRoutes(fastify: FastifyInstance) {
  
  // 1. Get supported languages
  fastify.get('/languages', async (request, reply) => {
    return {
      languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
        code,
        ...info,
      })),
      total: Object.keys(SUPPORTED_LANGUAGES).length,
    };
  });

  // 2. Configure language settings for microsite
  fastify.post<{
    Body: {
      micrositeId: string;
      defaultLanguage: string;
      enabledLanguages: string[];
      autoDetect?: boolean;
      showLanguageSwitcher?: boolean;
    };
  }>('/i18n/configure', async (request, reply) => {
    const { micrositeId, defaultLanguage, enabledLanguages, autoDetect = true, showLanguageSwitcher = true } = request.body;

    // Validate languages
    if (!SUPPORTED_LANGUAGES[defaultLanguage as keyof typeof SUPPORTED_LANGUAGES]) {
      return reply.status(400).send({
        error: 'Invalid default language',
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
      });
    }

    const invalidLanguages = enabledLanguages.filter(
      (lang) => !SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]
    );
    if (invalidLanguages.length > 0) {
      return reply.status(400).send({
        error: 'Invalid languages in enabledLanguages',
        invalidLanguages,
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
      });
    }

    const settings: MicrositeLanguageSettings = {
      micrositeId,
      defaultLanguage,
      enabledLanguages,
      autoDetect,
      showLanguageSwitcher,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    languageSettings.set(micrositeId, settings);

    return {
      ...settings,
      message: 'Language settings configured successfully',
    };
  });

  // 3. Get language settings
  fastify.get<{
    Params: { micrositeId: string };
  }>('/i18n/settings/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const settings = languageSettings.get(micrositeId);

    if (!settings) {
      return reply.status(404).send({
        error: 'Language settings not found',
        micrositeId,
      });
    }

    return settings;
  });

  // 4. Translate content using AI
  fastify.post<{
    Body: {
      content: Record<string, any>;
      sourceLanguage: string;
      targetLanguage: string;
      contentType?: 'text' | 'html' | 'markdown';
    };
  }>('/i18n/translate', async (request, reply) => {
    const { content, sourceLanguage, targetLanguage, contentType = 'text' } = request.body;

    if (!process.env.OPENAI_API_KEY) {
      return reply.status(503).send({
        error: 'OpenAI API key not configured',
        message: 'Translation service requires OpenAI API key',
      });
    }

    try {
      const openai = await import('openai');
      const client = new openai.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create translation prompt
      const prompt = `Translate the following content from ${SUPPORTED_LANGUAGES[sourceLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name} to ${SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]?.name}.
      
Content type: ${contentType}
Maintain the original structure and formatting.
If the content contains HTML or markdown, preserve all tags and syntax.

Content to translate:
${JSON.stringify(content, null, 2)}

Return ONLY the translated content as valid JSON with the same structure.`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate content accurately while preserving formatting, structure, and cultural nuances. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const translatedText = completion.choices[0]?.message?.content || '{}';
      const translatedContent = JSON.parse(translatedText);

      return {
        sourceLanguage,
        targetLanguage,
        original: content,
        translated: translatedContent,
        contentType,
        isAutoTranslated: true,
      };
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Translation failed',
        message: error.message,
      });
    }
  });

  // 5. Save translation
  fastify.post<{
    Body: {
      resourceType: 'microsite' | 'page' | 'block';
      resourceId: string;
      language: string;
      content: Record<string, any>;
      isAutoTranslated?: boolean;
    };
  }>('/i18n/save-translation', async (request, reply) => {
    const { resourceType, resourceId, language, content, isAutoTranslated = false } = request.body;

    if (!SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      return reply.status(400).send({
        error: 'Unsupported language',
        language,
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
      });
    }

    const id = generateTranslationId(resourceType, resourceId, language);
    const existingTranslation = translations.get(id);

    const translation: Translation = {
      id,
      resourceType,
      resourceId,
      language,
      content,
      isAutoTranslated,
      createdAt: existingTranslation?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    translations.set(id, translation);

    return {
      ...translation,
      message: existingTranslation ? 'Translation updated' : 'Translation saved',
    };
  });

  // 6. Get translation
  fastify.get<{
    Params: { resourceType: string; resourceId: string; language: string };
  }>('/i18n/translation/:resourceType/:resourceId/:language', async (request, reply) => {
    const { resourceType, resourceId, language } = request.params;
    const id = generateTranslationId(resourceType, resourceId, language);
    const translation = translations.get(id);

    if (!translation) {
      return reply.status(404).send({
        error: 'Translation not found',
        resourceType,
        resourceId,
        language,
      });
    }

    return translation;
  });

  // 7. Get all translations for a resource
  fastify.get<{
    Params: { resourceType: string; resourceId: string };
  }>('/i18n/translations/:resourceType/:resourceId', async (request, reply) => {
    const { resourceType, resourceId } = request.params;

    const resourceTranslations = Array.from(translations.values()).filter(
      (t) => t.resourceType === resourceType && t.resourceId === resourceId
    );

    return {
      resourceType,
      resourceId,
      translations: resourceTranslations,
      count: resourceTranslations.length,
      languages: resourceTranslations.map((t) => t.language),
    };
  });

  // 8. Detect language from text
  fastify.post<{
    Body: { text: string };
  }>('/i18n/detect-language', async (request, reply) => {
    const { text } = request.body;

    if (!text || text.trim().length === 0) {
      return reply.status(400).send({
        error: 'Text is required',
      });
    }

    // Simple language detection using character patterns
    // In production, you'd use a library like franc or langdetect
    const detectedLanguage = detectLanguage(text);

    return {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      detectedLanguage,
      confidence: 0.85,
      supportedLanguage: !!SUPPORTED_LANGUAGES[detectedLanguage as keyof typeof SUPPORTED_LANGUAGES],
    };
  });

  // 9. Bulk translate microsite
  fastify.post<{
    Body: {
      micrositeId: string;
      sourceLanguage: string;
      targetLanguages: string[];
      includePages?: boolean;
      includeBlocks?: boolean;
    };
  }>('/i18n/bulk-translate', async (request, reply) => {
    const { micrositeId, sourceLanguage, targetLanguages, includePages = true, includeBlocks = true } = request.body;

    if (!process.env.OPENAI_API_KEY) {
      return reply.status(503).send({
        error: 'OpenAI API key not configured',
      });
    }

    // Validate languages
    const invalidLanguages = targetLanguages.filter(
      (lang) => !SUPPORTED_LANGUAGES[lang as keyof typeof SUPPORTED_LANGUAGES]
    );
    if (invalidLanguages.length > 0) {
      return reply.status(400).send({
        error: 'Invalid target languages',
        invalidLanguages,
      });
    }

    // In production, this would queue background jobs for each translation
    const translationJobs = targetLanguages.map((lang) => ({
      id: `job_${Math.random().toString(36).substring(7)}`,
      micrositeId,
      sourceLanguage,
      targetLanguage: lang,
      status: 'queued',
      progress: 0,
      includePages,
      includeBlocks,
      createdAt: new Date(),
    }));

    return {
      micrositeId,
      jobs: translationJobs,
      message: `${translationJobs.length} translation jobs queued`,
    };
  });

  // 10. Delete translation
  fastify.delete<{
    Params: { resourceType: string; resourceId: string; language: string };
  }>('/i18n/translation/:resourceType/:resourceId/:language', async (request, reply) => {
    const { resourceType, resourceId, language } = request.params;
    const id = generateTranslationId(resourceType, resourceId, language);

    const existed = translations.delete(id);

    if (!existed) {
      return reply.status(404).send({
        error: 'Translation not found',
      });
    }

    return {
      message: 'Translation deleted successfully',
      resourceType,
      resourceId,
      language,
    };
  });

  // 11. Get translation statistics
  fastify.get<{
    Params: { micrositeId: string };
  }>('/i18n/stats/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params;
    const settings = languageSettings.get(micrositeId);

    if (!settings) {
      return reply.status(404).send({
        error: 'Microsite language settings not found',
      });
    }

    const micrositeTranslations = Array.from(translations.values()).filter(
      (t) => t.resourceId === micrositeId || t.resourceId.startsWith(micrositeId)
    );

    const stats = {
      micrositeId,
      defaultLanguage: settings.defaultLanguage,
      enabledLanguages: settings.enabledLanguages,
      totalTranslations: micrositeTranslations.length,
      byLanguage: settings.enabledLanguages.reduce((acc, lang) => {
        acc[lang] = micrositeTranslations.filter((t) => t.language === lang).length;
        return acc;
      }, {} as Record<string, number>),
      autoTranslated: micrositeTranslations.filter((t) => t.isAutoTranslated).length,
      manualTranslations: micrositeTranslations.filter((t) => !t.isAutoTranslated).length,
      completeness: settings.enabledLanguages.reduce((acc, lang) => {
        const translationCount = micrositeTranslations.filter((t) => t.language === lang).length;
        acc[lang] = Math.round((translationCount / Math.max(micrositeTranslations.length, 1)) * 100);
        return acc;
      }, {} as Record<string, number>),
    };

    return stats;
  });
}

// Simple language detection helper
function detectLanguage(text: string): string {
  // Check for Arabic characters
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  
  // Check for Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  
  // Check for Japanese characters
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  
  // Check for Korean characters
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  
  // Check for Cyrillic (Russian)
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  
  // Check for Hindi/Devanagari
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  
  // Check for common Spanish words
  if (/\b(el|la|de|que|y|es|en|por|para)\b/i.test(text)) return 'es';
  
  // Check for common French words
  if (/\b(le|la|de|et|est|dans|pour|avec)\b/i.test(text)) return 'fr';
  
  // Check for common German words
  if (/\b(der|die|das|und|ist|in|für|mit)\b/i.test(text)) return 'de';
  
  // Default to English
  return 'en';
}
