import { FastifyInstance } from 'fastify';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  micrositeId: string;
  sessionId: string;
  messages: ChatMessage[];
  context?: {
    title?: string;
    description?: string;
    faq?: Array<{ question: string; answer: string }>;
    links?: Array<{ title: string; url: string }>;
  };
  createdAt: Date;
  lastMessageAt: Date;
}

// In-memory session storage (in production, use Redis or database)
const sessions = new Map<string, ChatSession>();

export async function aiChatRoutes(fastify: FastifyInstance) {
  // Initialize chat session
  fastify.post('/init', async (request, reply) => {
    const { micrositeId, context } = request.body as {
      micrositeId: string;
      context?: ChatSession['context'];
    };

    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Build system message based on context
    let systemMessage = 'You are a helpful AI assistant for this website. Answer questions concisely and helpfully.';

    if (context) {
      systemMessage += `\n\nWebsite Information:\n`;
      if (context.title) systemMessage += `Title: ${context.title}\n`;
      if (context.description) systemMessage += `Description: ${context.description}\n`;

      if (context.faq && context.faq.length > 0) {
        systemMessage += `\nFrequently Asked Questions:\n`;
        context.faq.forEach((item) => {
          systemMessage += `Q: ${item.question}\nA: ${item.answer}\n`;
        });
      }

      if (context.links && context.links.length > 0) {
        systemMessage += `\nAvailable Links:\n`;
        context.links.forEach((link) => {
          systemMessage += `- ${link.title}: ${link.url}\n`;
        });
      }
    }

    const session: ChatSession = {
      micrositeId,
      sessionId,
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
      ],
      context,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    sessions.set(sessionId, session);

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, sess] of sessions.entries()) {
      if (sess.lastMessageAt.getTime() < oneHourAgo) {
        sessions.delete(id);
      }
    }

    return {
      sessionId,
      greeting: 'Hi! How can I help you today?',
    };
  });

  // Send message and get response
  fastify.post('/message', async (request, reply) => {
    const { sessionId, message } = request.body as {
      sessionId: string;
      message: string;
    };

    const session = sessions.get(sessionId);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found. Please start a new chat.' });
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: message,
    });

    try {
      // Get AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: session.messages as any,
        temperature: 0.7,
        max_tokens: 200,
      });

      const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: assistantMessage,
      });

      session.lastMessageAt = new Date();

      // Keep only last 20 messages to manage token limits
      if (session.messages.length > 21) {
        // Keep system message + last 20
        session.messages = [session.messages[0], ...session.messages.slice(-20)];
      }

      return {
        response: assistantMessage,
        sessionId,
        messageCount: session.messages.length - 1, // Exclude system message
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to get response', message: error.message });
    }
  });

  // Get suggested questions based on context
  fastify.post('/suggest-questions', async (request, reply) => {
    const { micrositeId, context } = request.body as {
      micrositeId: string;
      context?: ChatSession['context'];
    };

    let contextText = '';
    if (context) {
      if (context.title) contextText += `Title: ${context.title}\n`;
      if (context.description) contextText += `Description: ${context.description}\n`;
    }

    const prompt = `Based on this website, suggest 4 helpful questions a visitor might ask:\n\n${contextText}\n\nReturn only the questions, one per line. Keep them short and natural.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are helping generate natural, helpful questions visitors might ask about a website.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const questionsText = completion.choices[0]?.message?.content || '';
      const questions = questionsText
        .split('\n')
        .map((q) => q.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim())
        .filter((q) => q.length > 0 && q.endsWith('?'));

      return {
        questions,
        count: questions.length,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate questions', message: error.message });
    }
  });

  // Get chat history
  fastify.get('/history/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const session = sessions.get(sessionId);

    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    // Return all messages except the system message
    const history = session.messages.slice(1).map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: session.lastMessageAt,
    }));

    return {
      sessionId,
      micrositeId: session.micrositeId,
      messages: history,
      messageCount: history.length,
    };
  });

  // End chat session
  fastify.delete('/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };

    const existed = sessions.has(sessionId);
    sessions.delete(sessionId);

    return {
      success: existed,
      message: existed ? 'Session ended successfully' : 'Session not found',
    };
  });

  // Generate chat widget configuration
  fastify.post('/configure-widget', async (request, reply) => {
    const { micrositeId, settings } = request.body as {
      micrositeId: string;
      settings?: {
        position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
        theme?: 'light' | 'dark' | 'auto';
        primaryColor?: string;
        greeting?: string;
        placeholder?: string;
        avatar?: string;
      };
    };

    const defaultSettings = {
      position: 'bottom-right' as const,
      theme: 'light' as const,
      primaryColor: '#3b82f6',
      greeting: 'Hi! How can I help you today?',
      placeholder: 'Type your message...',
      avatar: null,
    };

    const config = {
      micrositeId,
      ...defaultSettings,
      ...settings,
    };

    return {
      config,
      embedCode: generateEmbedCode(config),
    };
  });

  // Analytics: Get chat metrics
  fastify.get('/analytics/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };

    // Get all sessions for this microsite
    const micrositeSessions = Array.from(sessions.values()).filter((s) => s.micrositeId === micrositeId);

    const totalSessions = micrositeSessions.length;
    const totalMessages = micrositeSessions.reduce((sum, s) => sum + (s.messages.length - 1), 0); // Exclude system message
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

    // Get active sessions (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeSessions = micrositeSessions.filter((s) => s.lastMessageAt.getTime() > fiveMinutesAgo).length;

    return {
      micrositeId,
      metrics: {
        totalSessions,
        activeSessions,
        totalMessages,
        avgMessagesPerSession: parseFloat(avgMessagesPerSession.toFixed(1)),
      },
      period: 'current_session', // In production, this would be configurable
    };
  });
}

// Helper function to generate embed code
function generateEmbedCode(config: any): string {
  return `<!-- AI Chat Widget -->
<div id="ai-chat-widget" data-microsite="${config.micrositeId}"></div>
<script>
  window.aiChatConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="https://cdn.example.com/ai-chat-widget.js"></script>`;
}
