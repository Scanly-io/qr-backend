import { db } from '../db.js';
import { microInteractions } from '../schema.js';
import pino from 'pino';

const logger = pino({ name: 'ml-service:micro-interactions' });

/**
 * Seed the micro-interaction library with pre-built components
 * 
 * Categories:
 * - scroll: Parallax, scroll-triggered animations
 * - hover: Interactive hover effects
 * - 3d: Three.js 3D animations
 * - storytelling: Immersive narrative blocks
 */
export async function seedMicroInteractions() {
  const interactions = [
    // Parallax Scroll Effects
    {
      name: 'Parallax Hero Background',
      category: 'scroll',
      description: 'Smooth parallax effect for hero section background images',
      thumbnailUrl: '/assets/interactions/parallax-hero.jpg',
      demoUrl: '/demos/parallax-hero',
      htmlTemplate: `<div class="parallax-hero" data-speed="0.5">
  <div class="parallax-bg"></div>
  <div class="parallax-content">
    <h1>{{title}}</h1>
    <p>{{subtitle}}</p>
  </div>
</div>`,
      cssCode: `.parallax-hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.parallax-bg {
  position: absolute;
  top: -20%;
  left: 0;
  width: 100%;
  height: 120%;
  background-image: var(--bg-image);
  background-size: cover;
  background-position: center;
  will-change: transform;
}

.parallax-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: white;
  text-align: center;
}`,
      jsCode: `const parallaxElements = document.querySelectorAll('[data-speed]');

window.addEventListener('scroll', () => {
  parallaxElements.forEach(el => {
    const speed = parseFloat(el.dataset.speed);
    const yPos = -(window.pageYOffset * speed);
    el.querySelector('.parallax-bg').style.transform = \`translateY(\${yPos}px)\`;
  });
});`,
      dependencies: [],
      configurableProps: [
        { name: 'speed', type: 'number', default: 0.5, description: 'Parallax speed (0-1)' },
        { name: 'bgImage', type: 'text', default: '', description: 'Background image URL' },
        { name: 'title', type: 'text', default: 'Welcome', description: 'Hero title' },
        { name: 'subtitle', type: 'text', default: 'Scroll to explore', description: 'Hero subtitle' },
      ],
      tags: ['parallax', 'hero', 'scroll', 'modern'],
      difficulty: 'beginner',
      mobileOptimized: true,
      accessibilityCompliant: true,
    },
    
    // GSAP Scroll Animation
    {
      name: 'Fade In on Scroll',
      category: 'scroll',
      description: 'Elements fade in and slide up as they enter viewport',
      htmlTemplate: `<div class="fade-in-scroll" data-delay="0">
  {{content}}
</div>`,
      cssCode: `.fade-in-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.fade-in-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}`,
      jsCode: `const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in-scroll').forEach(el => {
  observer.observe(el);
});`,
      dependencies: [],
      configurableProps: [
        { name: 'delay', type: 'number', default: 0, description: 'Animation delay (ms)' },
      ],
      tags: ['fade', 'scroll', 'intersection-observer', 'simple'],
      difficulty: 'beginner',
      mobileOptimized: true,
      accessibilityCompliant: true,
    },
    
    // 3D Hover Effect
    {
      name: '3D Card Tilt',
      category: 'hover',
      description: '3D perspective tilt effect on mouse move',
      htmlTemplate: `<div class="card-3d" data-tilt-max="15">
  <div class="card-inner">
    {{content}}
  </div>
</div>`,
      cssCode: `.card-3d {
  perspective: 1000px;
  transition: transform 0.1s ease;
}

.card-inner {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
  border-radius: 12px;
  padding: 2rem;
  background: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.card-3d:hover .card-inner {
  transform: scale(1.02);
}`,
      jsCode: `document.querySelectorAll('.card-3d').forEach(card => {
  const maxTilt = parseFloat(card.dataset.tiltMax) || 15;
  const inner = card.querySelector('.card-inner');
  
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * maxTilt;
    const rotateY = ((centerX - x) / centerX) * maxTilt;
    
    inner.style.transform = \`rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
  });
  
  card.addEventListener('mouseleave', () => {
    inner.style.transform = 'rotateX(0) rotateY(0)';
  });
});`,
      dependencies: [],
      configurableProps: [
        { name: 'tiltMax', type: 'number', default: 15, description: 'Maximum tilt angle (degrees)' },
      ],
      tags: ['3d', 'hover', 'card', 'interactive'],
      difficulty: 'intermediate',
      mobileOptimized: false,
      accessibilityCompliant: true,
    },
    
    // Magnetic Button
    {
      name: 'Magnetic Button',
      category: 'hover',
      description: 'Button follows mouse cursor with magnetic effect',
      htmlTemplate: `<button class="magnetic-btn" data-strength="0.5">
  <span class="btn-text">{{buttonText}}</span>
</button>`,
      cssCode: `.magnetic-btn {
  position: relative;
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  overflow: hidden;
}

.magnetic-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,0.1);
  transform: scale(0);
  border-radius: 50px;
  transition: transform 0.5s ease;
}

.magnetic-btn:hover::before {
  transform: scale(1);
}`,
      jsCode: `document.querySelectorAll('.magnetic-btn').forEach(btn => {
  const strength = parseFloat(btn.dataset.strength) || 0.5;
  
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    btn.style.transform = \`translate(\${x * strength}px, \${y * strength}px)\`;
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0, 0)';
  });
});`,
      dependencies: [],
      configurableProps: [
        { name: 'strength', type: 'number', default: 0.5, description: 'Magnetic strength (0-1)' },
        { name: 'buttonText', type: 'text', default: 'Click Me', description: 'Button text' },
      ],
      tags: ['button', 'hover', 'magnetic', 'cta'],
      difficulty: 'intermediate',
      mobileOptimized: false,
      accessibilityCompliant: true,
    },
    
    // Scroll Progress Indicator
    {
      name: 'Scroll Progress Bar',
      category: 'scroll',
      description: 'Animated progress bar showing scroll position',
      htmlTemplate: `<div class="scroll-progress">
  <div class="scroll-progress-bar"></div>
</div>`,
      cssCode: `.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(0,0,0,0.1);
  z-index: 9999;
}

.scroll-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  width: 0%;
  transition: width 0.1s ease;
}`,
      jsCode: `const progressBar = document.querySelector('.scroll-progress-bar');

window.addEventListener('scroll', () => {
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  
  progressBar.style.width = scrolled + '%';
});`,
      dependencies: [],
      configurableProps: [],
      tags: ['scroll', 'progress', 'indicator', 'ux'],
      difficulty: 'beginner',
      mobileOptimized: true,
      accessibilityCompliant: true,
    },
    
    // Typing Animation
    {
      name: 'Typewriter Effect',
      category: 'storytelling',
      description: 'Text appears character by character like typing',
      htmlTemplate: `<h1 class="typewriter" data-text="{{text}}" data-speed="100">
  <span class="typed-text"></span>
  <span class="cursor">|</span>
</h1>`,
      cssCode: `.typewriter {
  font-family: 'Courier New', monospace;
}

.cursor {
  display: inline-block;
  animation: blink 0.7s infinite;
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}`,
      jsCode: `document.querySelectorAll('.typewriter').forEach(element => {
  const text = element.dataset.text || '';
  const speed = parseInt(element.dataset.speed) || 100;
  const typedText = element.querySelector('.typed-text');
  
  let i = 0;
  function type() {
    if (i < text.length) {
      typedText.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  
  setTimeout(type, 500);
});`,
      dependencies: [],
      configurableProps: [
        { name: 'text', type: 'text', default: 'Hello World!', description: 'Text to type' },
        { name: 'speed', type: 'number', default: 100, description: 'Typing speed (ms per character)' },
      ],
      tags: ['typing', 'animation', 'text', 'storytelling'],
      difficulty: 'beginner',
      mobileOptimized: true,
      accessibilityCompliant: true,
    },
    
    // Smooth Reveal
    {
      name: 'Image Reveal on Scroll',
      category: 'storytelling',
      description: 'Images reveal with elegant mask animation',
      htmlTemplate: `<div class="image-reveal">
  <div class="image-reveal-mask"></div>
  <img src="{{imageUrl}}" alt="{{alt}}" />
</div>`,
      cssCode: `.image-reveal {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.image-reveal-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  transform: scaleX(1);
  transform-origin: left;
  transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1);
  z-index: 1;
}

.image-reveal.revealed .image-reveal-mask {
  transform: scaleX(0);
  transform-origin: right;
}

.image-reveal img {
  display: block;
  width: 100%;
  height: auto;
  transform: scale(1.2);
  transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1);
}

.image-reveal.revealed img {
  transform: scale(1);
}`,
      jsCode: `const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.image-reveal').forEach(el => {
  observer.observe(el);
});`,
      dependencies: [],
      configurableProps: [
        { name: 'imageUrl', type: 'text', default: '/placeholder.jpg', description: 'Image URL' },
        { name: 'alt', type: 'text', default: 'Image', description: 'Alt text for accessibility' },
      ],
      tags: ['image', 'reveal', 'scroll', 'mask', 'storytelling'],
      difficulty: 'intermediate',
      mobileOptimized: true,
      accessibilityCompliant: true,
    },
  ];

  try {
    for (const interaction of interactions) {
      await db.insert(microInteractions).values(interaction);
    }
    logger.info(`Seeded ${interactions.length} micro-interactions`);
  } catch (error) {
    logger.error(error, 'Failed to seed micro-interactions');
  }
}

/**
 * Get all micro-interactions by category
 */
export async function getMicroInteractionsByCategory(category: string) {
  return await db.query.microInteractions.findMany({
    where: (table, { eq }) => eq(table.category, category),
  });
}

/**
 * Get micro-interaction by ID
 */
export async function getMicroInteractionById(id: string) {
  return await db.query.microInteractions.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

/**
 * Search micro-interactions by tags
 */
export async function searchMicroInteractions(tags: string[]) {
  // This is a simplified version - in production you'd use proper JSONB querying
  const all = await db.query.microInteractions.findMany();
  
  return all.filter(interaction => {
    const interactionTags = interaction.tags as string[] || [];
    return tags.some(tag => interactionTags.includes(tag));
  });
}

/**
 * Increment usage count
 */
export async function incrementUsageCount(id: string) {
  await (db as any).execute({
    sql: 'UPDATE micro_interactions SET usage_count = usage_count + 1 WHERE id = $1',
    args: [id],
  });
}
