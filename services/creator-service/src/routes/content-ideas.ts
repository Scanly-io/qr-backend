import { FastifyInstance } from "fastify";
import { verifyJWT } from "@qr/common";
import { db } from "../db.js";
import { contentIdeas } from "../schema.js";
import { eq, and, desc } from "drizzle-orm";

// Interest areas for content generation (like Linktree)
const INTEREST_AREAS = [
  "3D Designer", "Artist", "Beauty & Makeup", "Business & Entrepreneur", "Content Creator",
  "Dancer", "Fashion", "Fitness & Wellness", "Food & Beverage", "Gaming",
  "Health & Medical", "Home & Garden", "Influencer", "Music & Audio", "Nonprofit",
  "Parenting", "Pet Care", "Photography", "Podcaster", "Real Estate",
  "Sports", "Technology", "Travel", "Writer & Author", "Yoga & Meditation"
];

// Content categories
const CONTENT_CATEGORIES = [
  { id: "trending", name: "Trending", emoji: "🔥", description: "Capitalize on what's hot right now" },
  { id: "evergreen", name: "Evergreen", emoji: "📰", description: "Timeless content that always works" },
  { id: "video_hooks", name: "Video hooks", emoji: "🎥", description: "Attention-grabbing video intros" },
  { id: "surprise_me", name: "Surprise me", emoji: "✨", description: "Random creative ideas" },
  { id: "got_something", name: "Got something in mind?", emoji: "💡", description: "Custom topic ideas" }
];

export default async function contentIdeasRoutes(app: FastifyInstance) {

  // Get all interest areas
  app.get("/interest-areas", async (req, res) => {
    return {
      success: true,
      interestAreas: INTEREST_AREAS.sort(),
      categories: CONTENT_CATEGORIES
    };
  });

  // Generate content ideas (AI-powered)
  app.post("/generate", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { 
      interestArea, 
      category = "trending", 
      customTopic,
      platform = "instagram",
      count = 4 
    } = req.body;

    if (!interestArea && !customTopic) {
      return res.code(400).send({ error: "Either interestArea or customTopic required" });
    }

    try {
      // In production, this would call OpenAI API
      // For now, generating structured ideas based on patterns
      const ideas = await generateIdeas({
        interestArea: interestArea || customTopic,
        category,
        customTopic,
        platform,
        count
      });

      // Save ideas to database
      const savedIdeas = await db.insert(contentIdeas)
        .values(ideas.map(idea => ({
          userId: user.id,
          title: idea.title,
          caption: idea.caption,
          hashtags: idea.hashtags,
          platform,
          category,
          niche: interestArea || customTopic,
          tone: idea.tone,
          predictedEngagement: idea.predictedEngagement,
          expiresAt: category === "trending" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
        })))
        .returning();

      return {
        success: true,
        ideas: savedIdeas.map((idea, idx) => ({
          ...idea,
          variations: ideas[idx].variations
        }))
      };

    } catch (error: any) {
      return res.code(500).send({ error: error.message });
    }
  });

  // Get user's saved content ideas
  app.get("/my-ideas", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { status, category } = req.query as any;

    let query = db.select()
      .from(contentIdeas)
      .where(eq(contentIdeas.userId, user.id));

    if (status) {
      query = query.where(eq(contentIdeas.status, status)) as any;
    }
    if (category) {
      query = query.where(eq(contentIdeas.category, category)) as any;
    }

    const ideas = await query
      .orderBy(desc(contentIdeas.createdAt))
      .limit(50);

    return {
      success: true,
      ideas
    };
  });

  // Update idea status
  app.patch("/:ideaId/status", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ideaId } = req.params;
    const { status } = req.body; // 'saved', 'used', 'dismissed'

    const [updated] = await db.update(contentIdeas)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(contentIdeas.id, ideaId),
        eq(contentIdeas.userId, user.id)
      ))
      .returning();

    if (!updated) {
      return res.code(404).send({ error: "Idea not found" });
    }

    return { success: true, idea: updated };
  });

  // Generate variations for existing idea
  app.post("/:ideaId/variations", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ideaId } = req.params;
    const { count = 3 } = req.body;

    const [idea] = await db.select()
      .from(contentIdeas)
      .where(and(
        eq(contentIdeas.id, ideaId),
        eq(contentIdeas.userId, user.id)
      ))
      .limit(1);

    if (!idea) {
      return res.code(404).send({ error: "Idea not found" });
    }

    // Generate variations of the caption
    const variations = await generateCaptionVariations(idea.caption, idea.tone || 'casual', count);

    return {
      success: true,
      original: idea.caption,
      variations
    };
  });

  // Delete idea
  app.delete("/:ideaId", { preHandler: [verifyJWT] }, async (req: any, res) => {
    const user = req.user;
    const { ideaId } = req.params;

    await db.delete(contentIdeas)
      .where(and(
        eq(contentIdeas.id, ideaId),
        eq(contentIdeas.userId, user.id)
      ));

    return { success: true };
  });
}

// Helper: Generate content ideas
async function generateIdeas(params: {
  interestArea: string;
  category: string;
  customTopic?: string;
  platform: string;
  count: number;
}) {
  const { interestArea, category, customTopic, platform, count } = params;

  // Templates based on category
  const templates = getTemplatesByCategory(category, interestArea);
  
  // Generate ideas
  const ideas = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const idea = await generateSingleIdea(template, interestArea, platform);
    ideas.push(idea);
  }

  return ideas;
}

// Get templates by category
function getTemplatesByCategory(category: string, niche: string) {
  const templates: Record<string, any[]> = {
    trending: [
      {
        title: "Trending Topic Deep Dive",
        hook: "Everyone's talking about {trend}, here's my take...",
        tone: "informative"
      },
      {
        title: "Challenge Participation",
        hook: "Trying the latest {niche} challenge and here's what happened...",
        tone: "casual"
      },
      {
        title: "Hot Take",
        hook: "Unpopular opinion: {controversial_statement}",
        tone: "bold"
      },
      {
        title: "Behind the Trend",
        hook: "The story behind the viral {niche} trend you need to know...",
        tone: "storytelling"
      }
    ],
    
    evergreen: [
      {
        title: "Educational How-To",
        hook: "How to master {skill} in {niche}: A step-by-step guide",
        tone: "professional"
      },
      {
        title: "Tips & Tricks",
        hook: "5 {niche} hacks that will change your life",
        tone: "helpful"
      },
      {
        title: "Myth Busting",
        hook: "Common {niche} myths you need to stop believing",
        tone: "educational"
      },
      {
        title: "Beginner's Guide",
        hook: "Starting your {niche} journey? Here's everything you need to know",
        tone: "friendly"
      }
    ],
    
    video_hooks: [
      {
        title: "Pattern Interrupt",
        hook: "STOP scrolling! You need to see this {niche} secret...",
        tone: "urgent"
      },
      {
        title: "Question Hook",
        hook: "What if I told you {surprising_fact} about {niche}?",
        tone: "curious"
      },
      {
        title: "Transformation",
        hook: "Watch me transform this {before} into {after} in {time}",
        tone: "exciting"
      },
      {
        title: "Relatable Opening",
        hook: "POV: You're trying {niche} for the first time and...",
        tone: "humorous"
      }
    ],
    
    surprise_me: [
      {
        title: "Personal Story",
        hook: "The day {niche} changed my life forever...",
        tone: "inspirational"
      },
      {
        title: "Comparison",
        hook: "{niche} then vs now: You won't believe the difference",
        tone: "nostalgic"
      },
      {
        title: "Controversial Take",
        hook: "Why I quit doing {common_practice} in {niche}",
        tone: "bold"
      },
      {
        title: "Day in the Life",
        hook: "A day in my life as a {niche} professional",
        tone: "authentic"
      }
    ]
  };

  return templates[category] || templates.evergreen;
}

// Generate single idea with variations
async function generateSingleIdea(template: any, niche: string, platform: string) {
  const title = template.title;
  const hook = template.hook.replace('{niche}', niche.toLowerCase());
  
  // Generate main caption
  const caption = generateCaption(hook, niche, template.tone, platform);
  
  // Generate hashtags
  const hashtags = generateHashtags(niche, platform);
  
  // Generate variations
  const variations = await generateCaptionVariations(caption, template.tone, 3);
  
  // Predict engagement (mock - would use ML model in production)
  const predictedEngagement = (Math.random() * 5 + 3).toFixed(2);

  return {
    title,
    caption,
    hashtags,
    tone: template.tone,
    predictedEngagement,
    variations
  };
}

// Generate caption based on hook and niche
function generateCaption(hook: string, niche: string, tone: string, platform: string): string {
  const hooks = [
    hook,
    `${hook}\n\nLet me explain why this matters...`,
    `${hook}\n\nHere's what you need to know 👇`,
    `${hook}\n\nStory time! 🧵`
  ];

  const bodies = [
    `As a ${niche.toLowerCase()} enthusiast, I've learned that the key to success is consistency and creativity. Here are my top insights that have helped me grow.`,
    `I've been doing ${niche.toLowerCase()} for years, and these are the lessons nobody tells you about when you're starting out.`,
    `The ${niche.toLowerCase()} industry is evolving fast. Here's what's working right now and what you should focus on.`,
    `Let's talk about ${niche.toLowerCase()} - the real version, not the highlight reel everyone shows.`
  ];

  const ctas = [
    "Drop a 💭 if this resonates!",
    "Save this for later and share with a friend who needs to see it!",
    "What's your experience? Let me know in the comments!",
    "Follow for more tips like this! ✨",
    "Tag someone who needs to hear this! 👇"
  ];

  const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];
  const selectedBody = bodies[Math.floor(Math.random() * bodies.length)];
  const selectedCta = ctas[Math.floor(Math.random() * ctas.length)];

  // Platform-specific formatting
  if (platform === 'twitter') {
    return `${selectedHook}\n\n${selectedBody.substring(0, 200)}...\n\n${selectedCta}`;
  } else if (platform === 'linkedin') {
    return `${selectedHook}\n\n${selectedBody}\n\nKey takeaways:\n• Point 1\n• Point 2\n• Point 3\n\n${selectedCta}`;
  }

  return `${selectedHook}\n\n${selectedBody}\n\n${selectedCta}`;
}

// Generate caption variations
async function generateCaptionVariations(baseCaption: string, tone: string, count: number): Promise<string[]> {
  const variations = [];
  
  const toneModifiers: Record<string, string[]> = {
    casual: ["Let's talk about this...", "Real talk:", "Okay so here's the thing -"],
    professional: ["Industry insight:", "Professional perspective:", "Expert analysis:"],
    humorous: ["Plot twist:", "Not gonna lie,", "Here's a fun fact:"],
    inspirational: ["Here's your reminder that", "Remember this:", "You've got this -"],
    educational: ["Quick lesson:", "Did you know?", "Let me break this down:"],
    bold: ["Hot take:", "Controversial opinion:", "Nobody's saying this but"]
  };

  const modifiers = toneModifiers[tone] || toneModifiers.casual;

  for (let i = 0; i < count; i++) {
    const modifier = modifiers[i % modifiers.length];
    const variation = `${modifier} ${baseCaption.split('\n\n')[1] || baseCaption}`;
    variations.push(variation);
  }

  return variations;
}

// Generate relevant hashtags
function generateHashtags(niche: string, platform: string): string[] {
  const baseHashtags = [
    niche.toLowerCase().replace(/\s+/g, ''),
    `${niche.toLowerCase().replace(/\s+/g, '')}tips`,
    `${niche.toLowerCase().replace(/\s+/g, '')}community`
  ];

  const platformHashtags: Record<string, string[]> = {
    instagram: ['instagood', 'photooftheday', 'instalike', 'insta', 'reels', 'explore'],
    tiktok: ['fyp', 'foryou', 'foryoupage', 'viral', 'trending'],
    linkedin: ['professionaldevelopment', 'careeradvice', 'business', 'networking'],
    twitter: ['threadreader', 'twittercommunity'],
    facebook: ['community', 'inspiration']
  };

  const platformSpecific = platformHashtags[platform] || [];
  
  return [...baseHashtags, ...platformSpecific.slice(0, 7)];
}
