/**
 * MICROSITE CLIENT-SIDE JAVASCRIPT
 * 
 * This file contains ALL interactive behavior for published microsites.
 * It's included in the <head> of every published microsite HTML.
 * 
 * Features:
 * - FAQ Accordion (expand/collapse)
 * - Gallery Lightbox (full-screen image viewer with navigation)
 * - Social Links (click tracking)
 * - Form Submissions
 * - Countdown Timer
 * - Stats Count-up Animation
 * - Map Interactions
 * 
 * Size: ~10KB minified
 * Dependencies: None (vanilla JavaScript)
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // FAQ ACCORDION
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize all FAQ accordions on the page
   * Looks for elements with data-faq-item attribute
   */
  function initFAQAccordions() {
    const faqItems = document.querySelectorAll('[data-faq-item]');
    
    faqItems.forEach((item, index) => {
      const question = item.querySelector('[data-faq-question]');
      const answer = item.querySelector('[data-faq-answer]');
      const icon = item.querySelector('[data-faq-icon]');
      
      if (!question || !answer) return;
      
      // Check if this item should be open by default
      const openByDefault = item.dataset.faqOpen === 'true';
      const allowMultiple = item.closest('[data-faq-container]')?.dataset.faqAllowMultiple === 'true';
      
      // Set initial state
      if (openByDefault) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.style.opacity = '1';
        if (icon) icon.style.transform = 'rotate(180deg)';
      } else {
        answer.style.maxHeight = '0';
        answer.style.opacity = '0';
      }
      
      // Add click handler
      question.addEventListener('click', function() {
        const isOpen = answer.style.maxHeight !== '0px';
        
        // If not allowing multiple, close all other items
        if (!allowMultiple && !isOpen) {
          const container = item.closest('[data-faq-container]');
          const allItems = container.querySelectorAll('[data-faq-item]');
          allItems.forEach(otherItem => {
            if (otherItem !== item) {
              const otherAnswer = otherItem.querySelector('[data-faq-answer]');
              const otherIcon = otherItem.querySelector('[data-faq-icon]');
              if (otherAnswer) {
                otherAnswer.style.maxHeight = '0';
                otherAnswer.style.opacity = '0';
              }
              if (otherIcon) {
                otherIcon.style.transform = 'rotate(0deg)';
              }
            }
          });
        }
        
        // Toggle current item
        if (isOpen) {
          answer.style.maxHeight = '0';
          answer.style.opacity = '0';
          if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
          answer.style.maxHeight = answer.scrollHeight + 'px';
          answer.style.opacity = '1';
          if (icon) icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // GALLERY LIGHTBOX
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize all gallery lightboxes
   * Looks for elements with data-gallery attribute
   */
  function initGalleryLightboxes() {
    const galleries = document.querySelectorAll('[data-gallery]');
    
    galleries.forEach(gallery => {
      const images = Array.from(gallery.querySelectorAll('[data-gallery-image]'));
      
      if (images.length === 0) return;
      
      // Create lightbox modal (shared for all galleries)
      let lightbox = document.getElementById('gallery-lightbox');
      
      if (!lightbox) {
        lightbox = createLightboxModal();
        document.body.appendChild(lightbox);
      }
      
      // Add click handlers to each image
      images.forEach((img, index) => {
        img.style.cursor = 'pointer';
        
        img.addEventListener('click', function() {
          openLightbox(images, index);
        });
      });
    });
  }
  
  /**
   * Create the lightbox modal HTML structure
   */
  function createLightboxModal() {
    const lightbox = document.createElement('div');
    lightbox.id = 'gallery-lightbox';
    lightbox.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      backdrop-filter: blur(10px);
    `;
    
    lightbox.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
        
        <!-- Close Button -->
        <button id="lightbox-close" style="
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          z-index: 10001;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          ✕
        </button>
        
        <!-- Previous Button -->
        <button id="lightbox-prev" style="
          position: absolute;
          left: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          z-index: 10001;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          ‹
        </button>
        
        <!-- Next Button -->
        <button id="lightbox-next" style="
          position: absolute;
          right: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          z-index: 10001;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          ›
        </button>
        
        <!-- Main Image -->
        <img id="lightbox-image" style="
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        " />
        
        <!-- Counter -->
        <div id="lightbox-counter" style="
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(10px);
          z-index: 10001;
        "></div>
        
        <!-- Thumbnail Strip -->
        <div id="lightbox-thumbnails" style="
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          max-width: 90%;
          overflow-x: auto;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          z-index: 10001;
        "></div>
      </div>
    `;
    
    return lightbox;
  }
  
  /**
   * Open lightbox with specific image
   */
  function openLightbox(images, startIndex) {
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const counter = document.getElementById('lightbox-counter');
    const thumbnails = document.getElementById('lightbox-thumbnails');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    let currentIndex = startIndex;
    
    function showImage(index) {
      currentIndex = index;
      const img = images[index];
      lightboxImage.src = img.src;
      counter.textContent = `${index + 1} / ${images.length}`;
      
      // Update thumbnail highlights
      const thumbs = thumbnails.querySelectorAll('img');
      thumbs.forEach((thumb, i) => {
        if (i === index) {
          thumb.style.border = '3px solid white';
          thumb.style.opacity = '1';
        } else {
          thumb.style.border = '1px solid rgba(255,255,255,0.2)';
          thumb.style.opacity = '0.6';
        }
      });
    }
    
    function goToPrev() {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      showImage(currentIndex);
    }
    
    function goToNext() {
      currentIndex = (currentIndex + 1) % images.length;
      showImage(currentIndex);
    }
    
    // Create thumbnails
    thumbnails.innerHTML = '';
    images.forEach((img, i) => {
      const thumb = document.createElement('img');
      thumb.src = img.src;
      thumb.style.cssText = `
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid rgba(255,255,255,0.2);
        opacity: 0.6;
      `;
      thumb.addEventListener('click', () => showImage(i));
      thumb.addEventListener('mouseover', () => {
        if (i !== currentIndex) thumb.style.opacity = '0.8';
      });
      thumb.addEventListener('mouseout', () => {
        if (i !== currentIndex) thumb.style.opacity = '0.6';
      });
      thumbnails.appendChild(thumb);
    });
    
    // Show lightbox
    lightbox.style.display = 'block';
    showImage(startIndex);
    
    // Event listeners
    closeBtn.onclick = () => {
      lightbox.style.display = 'none';
    };
    
    prevBtn.onclick = goToPrev;
    nextBtn.onclick = goToNext;
    
    // Click backdrop to close
    lightbox.onclick = (e) => {
      if (e.target === lightbox) {
        lightbox.style.display = 'none';
      }
    };
    
    // Keyboard navigation
    const keyHandler = (e) => {
      if (lightbox.style.display !== 'block') return;
      
      if (e.key === 'Escape') {
        lightbox.style.display = 'none';
        document.removeEventListener('keydown', keyHandler);
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    
    document.addEventListener('keydown', keyHandler);
  }

  // ═══════════════════════════════════════════════════════════
  // COUNTDOWN TIMER
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize all countdown timers
   * Looks for elements with data-countdown attribute
   */
  function initCountdowns() {
    const countdowns = document.querySelectorAll('[data-countdown]');
    
    countdowns.forEach(countdown => {
      const targetDate = new Date(countdown.dataset.countdown).getTime();
      const daysEl = countdown.querySelector('[data-countdown-days]');
      const hoursEl = countdown.querySelector('[data-countdown-hours]');
      const minutesEl = countdown.querySelector('[data-countdown-minutes]');
      const secondsEl = countdown.querySelector('[data-countdown-seconds]');
      
      function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
          if (daysEl) daysEl.textContent = '0';
          if (hoursEl) hoursEl.textContent = '0';
          if (minutesEl) minutesEl.textContent = '0';
          if (secondsEl) secondsEl.textContent = '0';
          return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = hours;
        if (minutesEl) minutesEl.textContent = minutes;
        if (secondsEl) secondsEl.textContent = seconds;
      }
      
      updateCountdown();
      setInterval(updateCountdown, 1000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // STATS COUNT-UP ANIMATION
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Animate numbers counting up
   * Looks for elements with data-countup attribute
   */
  function initCountUpAnimations() {
    const stats = document.querySelectorAll('[data-countup]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          animateCountUp(entry.target);
          entry.target.dataset.animated = 'true';
        }
      });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
  }
  
  function animateCountUp(element) {
    const target = parseInt(element.dataset.countup);
    const duration = parseInt(element.dataset.countupDuration) || 2000;
    const start = 0;
    const startTime = Date.now();
    
    function update() {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.floor(start + (target - start) * easeProgress);
      element.textContent = current.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target.toLocaleString();
      }
    }
    
    update();
  }

  // ═══════════════════════════════════════════════════════════
  // FORM SUBMISSIONS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Handle form submissions via AJAX
   * Looks for forms with data-microsite-form attribute
   */
  function initForms() {
    const forms = document.querySelectorAll('[data-microsite-form]');
    
    forms.forEach(form => {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const micrositeId = form.dataset.micrositeId;
        
        try {
          const response = await fetch(`/api/microsite/${micrositeId}/leads`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          
          if (response.ok) {
            // Show success message
            const successMsg = form.querySelector('[data-form-success]');
            if (successMsg) {
              successMsg.style.display = 'block';
              setTimeout(() => {
                successMsg.style.display = 'none';
              }, 3000);
            }
            
            // Reset form
            form.reset();
          } else {
            throw new Error('Form submission failed');
          }
        } catch (error) {
          // Show error message
          const errorMsg = form.querySelector('[data-form-error]');
          if (errorMsg) {
            errorMsg.style.display = 'block';
            setTimeout(() => {
              errorMsg.style.display = 'none';
            }, 3000);
          }
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PRICING TOGGLE
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize pricing block monthly/yearly toggle
   * Switches between monthly and yearly pricing display
   */
  function initPricingToggles() {
    const pricingBlocks = document.querySelectorAll('[data-pricing-block]');
    
    pricingBlocks.forEach(block => {
      const toggleButtons = block.querySelectorAll('.billing-toggle');
      const priceDisplays = block.querySelectorAll('.price-display');
      const periodTexts = block.querySelectorAll('.billing-period-text');
      
      if (toggleButtons.length === 0) return;
      
      let currentPeriod = 'monthly';
      
      toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
          const period = this.dataset.billingPeriod;
          if (period === currentPeriod) return;
          
          currentPeriod = period;
          
          // Update button styles
          toggleButtons.forEach(btn => {
            if (btn.dataset.billingPeriod === period) {
              btn.classList.add('bg-white', 'shadow-md', 'text-gray-900');
              btn.classList.remove('text-gray-500', 'hover:text-gray-900');
            } else {
              btn.classList.remove('bg-white', 'shadow-md', 'text-gray-900');
              btn.classList.add('text-gray-500', 'hover:text-gray-900');
            }
          });
          
          // Update prices with smooth transition
          priceDisplays.forEach(display => {
            const monthlyPrice = display.dataset.priceMonthly || '$0';
            const yearlyPrice = display.dataset.priceYearly || '$0';
            const newPrice = period === 'yearly' ? yearlyPrice : monthlyPrice;
            
            // Fade out
            display.style.opacity = '0';
            display.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
              display.textContent = newPrice;
              // Fade in
              display.style.opacity = '1';
              display.style.transform = 'translateY(0)';
            }, 150);
          });
          
          // Update period text
          periodTexts.forEach(text => {
            text.textContent = period === 'yearly' ? 'year' : 'month';
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // GALLERY CAROUSEL
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize all gallery carousels on the page
   * Looks for elements with data-carousel attribute
   */
  function initGalleryCarousels() {
    const carousels = document.querySelectorAll('[data-carousel]');
    
    carousels.forEach(carousel => {
      const items = Array.from(carousel.querySelectorAll('[data-carousel-item]'));
      const prevBtn = carousel.querySelector('[data-carousel-prev]');
      const nextBtn = carousel.querySelector('[data-carousel-next]');
      const dots = Array.from(carousel.querySelectorAll('[data-carousel-dot]'));
      
      if (items.length === 0) return;
      
      let currentIndex = 0;
      
      /**
       * Show specific carousel item
       */
      function showItem(index) {
        // Hide all items
        items.forEach(item => {
          item.classList.remove('active');
          item.style.display = 'none';
        });
        
        // Show current item
        if (items[index]) {
          items[index].classList.add('active');
          items[index].style.display = 'block';
        }
        
        // Update dots
        dots.forEach((dot, idx) => {
          if (idx === index) {
            dot.classList.remove('w-2', 'bg-gray-300');
            dot.classList.add('w-8', 'bg-violet-600');
          } else {
            dot.classList.remove('w-8', 'bg-violet-600');
            dot.classList.add('w-2', 'bg-gray-300');
          }
        });
        
        currentIndex = index;
      }
      
      /**
       * Go to next item
       */
      function next() {
        const nextIndex = (currentIndex + 1) % items.length;
        showItem(nextIndex);
      }
      
      /**
       * Go to previous item
       */
      function previous() {
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        showItem(prevIndex);
      }
      
      // Initialize - show first item
      showItem(0);
      
      // Bind navigation buttons
      if (prevBtn) {
        prevBtn.addEventListener('click', previous);
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', next);
      }
      
      // Bind dot indicators
      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showItem(index));
      });
      
      // Optional: Auto-advance carousel (disabled by default)
      // Uncomment to enable 5-second auto-advance
      // setInterval(next, 5000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Initialize all interactive features when DOM is ready
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initFAQAccordions();
        initGalleryLightboxes();
        initGalleryCarousels();
        initCountdowns();
        initCountUpAnimations();
        initPricingToggles();
        initForms();
      });
    } else {
      // DOM already loaded
      initFAQAccordions();
      initGalleryLightboxes();
      initGalleryCarousels();
      initCountdowns();
      initCountUpAnimations();
      initPricingToggles();
      initForms();
    }
  }
  
  // Start initialization
  init();
  
})();
