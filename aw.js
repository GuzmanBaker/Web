(function () {
  "use strict";

  const WIDGET_CONFIG = {
    storageKey: "aw-widget-settings",
    defaultLang: "en",
    translations: {
      en: {
        title: "Accessibility Settings",
        readingMask: "Reading Mask",
        highContrast: "High Contrast",
        fontSize: "Font Size",
        lineHeight: "Line Height",
        letterSpacing: "Letter Spacing",
        contentScale: "Content Scale",
        dyslexiaFont: "Readable Font",
        textAlign: "Align Right",
        textAlignCenter: "Center",
        textAlignLeft: "Align Left",
        highlightLinks: "Underline Links",
        hideImages: "Hide Images",
        highlightHeadings: "Highlight Titles",
        textMagnifier: "Cursor Reading Aid",
        reset: "Reset",
        poweredBy: "Powered by",
        darkMode: "Dark Mode",
        focusOutline: "Show Focus Outline",
        reduceMotion: "Reduce Motion",
        cursorSize: "Large Cursor",
        stopAutoplay: "Stop Autoplay",
        invertColors: "Invert Colors",
        columnWidth: "Column Width",
        textToSpeech: "Read Page Aloud",
        monochrome: "Desaturate (Grey)",
        blueLight: "Blue Light Filter",
        highSaturation: "High Saturation",
        protanopia: "Red Weakness",
        deuteranopia: "Green Weakness",
        tritanopia: "Blue Weakness",
      },
    },
  };

  function hasFontAwesome() {
    if (document.querySelector('link[rel="stylesheet"][href*="fontawesome"]')) {
      return true;
    }
    const probe = document.createElement("i");
    probe.className = "fas";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const fontFamily = getComputedStyle(probe).fontFamily || "";
    probe.remove();
    return /Font Awesome/i.test(fontFamily);
  }

  class AccessibilityWidget {
    constructor() {
      this.settings = this.loadSettings();
      this.currentLang = this.settings.language || WIDGET_CONFIG.defaultLang;
      this.translations = WIDGET_CONFIG.translations[this.currentLang];
      this.isOpen = false;
      this.observers = [];
      this.speechSynthesis = window.speechSynthesis;
      this.currentUtterance = null;
      this.init();
    }

    init() {
      this.loadExternalResources();
      this.injectStyles();
      this.injectColorFilters();
      this.createWidget();
      this.attachEventListeners();
      this.setupSPAListeners();
      this.applySettings();
    }

    injectColorFilters() {
      if (document.getElementById("a11y-svg-filters")) return;

      const svgContainer = document.createElement("div");
      svgContainer.id = "a11y-svg-filters";
      svgContainer.style.height = "0";
      svgContainer.style.width = "0";
      svgContainer.style.position = "absolute";
      svgContainer.style.visibility = "hidden";
      svgContainer.style.overflow = "hidden";

      svgContainer.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="a11y-filter-protanopia">
              <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0
                                                   0.558, 0.442, 0, 0, 0
                                                   0, 0.242, 0.758, 0, 0
                                                   0, 0, 0, 1, 0" />
            </filter>
            <filter id="a11y-filter-deuteranopia">
              <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0
                                                   0.7, 0.3, 0, 0, 0
                                                   0, 0.3, 0.7, 0, 0
                                                   0, 0, 0, 1, 0" />
            </filter>
            <filter id="a11y-filter-tritanopia">
              <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0
                                                   0, 0.433, 0.567, 0, 0
                                                   0, 0.475, 0.525, 0, 0
                                                   0, 0, 0, 1, 0" />
            </filter>
          </defs>
        </svg>
      `;
      document.body.appendChild(svgContainer);
    }

    setupSPAListeners() {
      const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (let node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (
                  node.matches &&
                  (node.matches(".Post-body, .DiscussionListItem, .UserCard, .CommentPost") ||
                    node.querySelector(".Post-body, .DiscussionListItem, .UserCard, .CommentPost"))
                ) {
                  shouldReapply = true;
                  break;
                }
              }
            }
          }
        });

        if (shouldReapply) {
          setTimeout(() => {
            this.applySettings();
          }, 100);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      this.observers.push(observer);

      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
          if (window.accessibilityWidget) window.accessibilityWidget.applySettings();
        }, 200);
      };

      history.replaceState = function (...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
          if (window.accessibilityWidget) window.accessibilityWidget.applySettings();
        }, 200);
      };

      window.addEventListener("popstate", () => setTimeout(() => this.applySettings(), 200));
      window.addEventListener("hashchange", () => setTimeout(() => this.applySettings(), 200));
      this.reapplyInterval = setInterval(() => this.applySettings(), 2000);
    }

    loadExternalResources() {
      if (!hasFontAwesome()) {
        const link = document.createElement("link");
        link.id = "fontawesome-local";
        link.rel = "stylesheet";
        link.href = "https://guzmanbaker.github.io/Web/css/all.min.css";
        document.head.appendChild(link);
      }

      if (!document.getElementById("lexend-embed")) {
        const css = `
        @font-face{ font-family:'Lexend'; font-style:normal; font-weight:400; font-display:swap; src:url('https://guzmanbaker.github.io/Web/webfonts/lexend-400.woff2') format('woff2'); }
        @font-face{ font-family:'Lexend'; font-style:normal; font-weight:700; font-display:swap; src:url('https://guzmanbaker.github.io/Web/webfonts/lexend-700.woff2') format('woff2'); }`;
        const style = document.createElement("style");
        style.id = "lexend-embed";
        style.textContent = css;
        document.head.appendChild(style);
      }
    }

    injectStyles() {
      if (document.getElementById("a11y-widget-styles")) return;

      const style = document.createElement("style");
      style.id = "a11y-widget-styles";
      
      /* NOTE: For color filters, we target body > * :not(...) 
         This prevents the 'filter' property from creating a containing block on the body,
         which would otherwise break position:fixed for the widget.
      */
      
      style.textContent = `
                /* Widget Container */
                #a11y-widget-container {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                }
                
                #a11y-toggle-btn {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: #2563eb;
                    color: white;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    font-size: 24px;
                }
                
                #a11y-toggle-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
                }
                
                #a11y-panel {
                    position: absolute;
                    bottom: 76px;
                    left: 0;
                    width: 380px;
                    max-width: calc(100vw - 40px);
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    display: none;
                    overflow: hidden;
                }
                
                @media (max-height: 700px) {
                    #a11y-panel {
                        bottom: 10px;
                        max-height: calc(100vh - 80px);
                    }
                }
                
                @media (max-width: 768px) {
                    #a11y-panel {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        width: 100%;
                        height: 100%;
                        max-width: none;
                        max-height: none;
                        border-radius: 0;
                        transform: none;
                        display: none;
                        flex-direction: column;
                    }
                    #a11y-panel.active { display: flex; }
                }
                
                #a11y-panel.active {
                    display: flex;
                    flex-direction: column;
                    animation: slideIn 0.3s ease;
                }
                
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .a11y-header {
                    background: #f8fafc;
                    padding: 20px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .a11y-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                }
                
                .a11y-header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .a11y-lang-toggle {
                    display: flex;
                    background: #e5e7eb;
                    border-radius: 8px;
                    padding: 2px;
                }
                
                .a11y-lang-btn {
                    padding: 6px 12px;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #6b7280;
                    transition: all 0.2s;
                }
                
                .a11y-lang-btn.active {
                    background: white;
                    color: #1f2937;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .a11y-close-btn {
                    background: none;
                    border: none;
                    color: #6b7280;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                
                .a11y-close-btn:hover {
                    background: #e5e7eb;
                    color: #1f2937;
                }
                
                .a11y-content {
                    padding: 20px;
                    overflow-y: auto;
                    max-height: calc(100vh - 380px);
                }

                @media (max-width: 768px) {
                    .a11y-content { max-height: none; flex: 1; }
                }
                
                .a11y-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }
                
                .a11y-card {
                    background: #f8fafc;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 80px;
                }
                
                .a11y-card:hover {
                    border-color: #2563eb;
                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
                }
                
                .a11y-card.active {
                    background: #dbeafe;
                    border-color: #2563eb;
                }
                
                .a11y-card-icon {
                    font-size: 24px;
                    margin-bottom: 8px;
                    color: #1f2937;
                }
                
                .a11y-card.active .a11y-card-icon {
                    color: #2563eb;
                }
                
                .a11y-card-label {
                    font-size: 13px;
                    color: #1f2937;
                    font-weight: 500;
                    line-height: 1.2;
                }
                
                .a11y-slider-group {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                }
                
                .a11y-slider-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .a11y-slider-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #1f2937;
                }
                
                .a11y-slider-value {
                    font-size: 14px;
                    color: #6b7280;
                    font-weight: 500;
                }
                
                .a11y-slider-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .a11y-slider-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: #1f2937;
                }
                
                .a11y-slider-btn:hover {
                    background: #f3f4f6;
                    border-color: #d1d5db;
                }
                
                .a11y-slider {
                    flex: 1;
                    height: 4px;
                    -webkit-appearance: none;
                    appearance: none;
                    background: #e5e7eb;
                    border-radius: 2px;
                    outline: none;
                    cursor: pointer;
                }
                
                .a11y-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #2563eb;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                    transition: all 0.2s;
                }
                
                .a11y-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                
                .a11y-footer {
                    padding: 16px 20px;
                    border-top: 1px solid #e5e7eb;
                    background: #f8fafc;
                }
                
                .a11y-btn {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 20px;
                }
                
                .a11y-btn-reset {
                    background: #ef4444;
                    color: white;
                }
                
                .a11y-btn-reset:hover {
                    background: #dc2626;
                }
                
                .a11y-powered-by {
                    padding: 15px 20px;
                    background: #f1f5f9;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #64748b;
                    border-radius: 0 0 16px 16px;
                }
                @media (max-width: 768px) { .a11y-powered-by { border-radius: 0; } }

                /* --- ACCESSIBILITY FEATURES --- */
                .a11y-flarum-text { font-size: inherit !important; }
                body.a11y-dyslexia *:not([class*="fa"]) { font-family: 'Lexend', Arial, sans-serif !important; }
                body.a11y-highlight-links a { text-decoration: underline !important; text-decoration-thickness: 2px !important; text-underline-offset: 2px !important; }
                body.a11y-hide-images img { opacity: 0 !important; visibility: hidden !important; }
                
                body.a11y-highlight-headings h1::before, body.a11y-highlight-headings h2::before, body.a11y-highlight-headings h3::before,
                body.a11y-highlight-headings h4::before, body.a11y-highlight-headings h5::before, body.a11y-highlight-headings h6::before {
                    content: '' !important; position: absolute !important; left: 0 !important; top: 0 !important; bottom: 0 !important; width: 4px !important; background: #2563eb !important;
                }
                body.a11y-highlight-headings h1, body.a11y-highlight-headings h2, body.a11y-highlight-headings h3,
                body.a11y-highlight-headings h4, body.a11y-highlight-headings h5, body.a11y-highlight-headings h6 {
                    position: relative !important; padding-left: 20px !important;
                }
                
                /* Color Modes */
                body.a11y-high-contrast { background: #000 !important; color: #fff !important; }
                body.a11y-high-contrast * { background-color: #000 !important; color: #fff !important; border-color: #fff !important; }
                body.a11y-high-contrast a { color: #ffff00 !important; }
                body.a11y-high-contrast button { background: #fff !important; color: #000 !important; }
                
                body.a11y-dark-mode { background: #1a1a1a !important; color: #e0e0e0 !important; }
                body.a11y-dark-mode * { background-color: #1a1a1a !important; color: #e0e0e0 !important; border-color: #444 !important; }
                body.a11y-dark-mode a { color: #66b3ff !important; }
                
                /* FIX: Apply filters to body CHILDREN to avoid breaking position:fixed of the widget */
                
                body.a11y-monochrome > *:not(#a11y-widget-container):not(.a11y-magnifier):not(#a11y-reading-mask):not(#a11y-bluelight-overlay):not(#a11y-svg-filters) { 
                    filter: grayscale(100%) !important; 
                }
                
                body.a11y-high-saturation > *:not(#a11y-widget-container):not(.a11y-magnifier):not(#a11y-reading-mask):not(#a11y-bluelight-overlay):not(#a11y-svg-filters) { 
                    filter: saturate(200%) !important; 
                }
                
                body.a11y-protanopia > *:not(#a11y-widget-container):not(.a11y-magnifier):not(#a11y-reading-mask):not(#a11y-bluelight-overlay):not(#a11y-svg-filters) { 
                    filter: url('#a11y-filter-protanopia') !important; 
                }
                
                body.a11y-deuteranopia > *:not(#a11y-widget-container):not(.a11y-magnifier):not(#a11y-reading-mask):not(#a11y-bluelight-overlay):not(#a11y-svg-filters) { 
                    filter: url('#a11y-filter-deuteranopia') !important; 
                }
                
                body.a11y-tritanopia > *:not(#a11y-widget-container):not(.a11y-magnifier):not(#a11y-reading-mask):not(#a11y-bluelight-overlay):not(#a11y-svg-filters) { 
                    filter: url('#a11y-filter-tritanopia') !important; 
                }
                
                body.a11y-focus-outline *:focus { outline: 6px solid #ff0000 !important; outline-offset: 6px !important; }
                body.a11y-reduce-motion * { animation: none !important; transition: none !important; }
                body.a11y-cursor-size * { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path fill="black" stroke="white" stroke-width="2" d="M8 8 L28 20 L20 24 L24 36 L20 38 L16 26 L8 30 Z"/></svg>') 0 0, auto !important; }
                
                body.a11y-stop-autoplay video, body.a11y-stop-autoplay audio { autoplay: false !important; pause: true !important; }
                
                html.a11y-invert::before { content:""; position:fixed; inset:0; background:#fff; mix-blend-mode:difference; pointer-events:none; z-index:2147483647; }
                html.a11y-invert img, html.a11y-invert video { mix-blend-mode:normal; }
                
                #a11y-reading-mask { position: fixed; left: 0; right: 0; height: 120px; pointer-events: none; z-index: 999998; display: none; }
                #a11y-reading-mask::before, #a11y-reading-mask::after { content: ''; position: absolute; left: 0; right: 0; background: rgba(0,0,0,0.3); }
                #a11y-reading-mask::before { top: -100vh; height: 100vh; }
                #a11y-reading-mask::after { bottom: -100vh; height: 100vh; }
                body.a11y-reading-mask #a11y-reading-mask { display: block; }
                
                .a11y-magnifier { position: fixed; width: 400px; max-width: 90vw; padding: 20px; background: rgba(255, 255, 255, 0.98); border: 2px solid #2563eb; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); pointer-events: none; z-index: 999997; display: none; font-size: 150%; line-height: 1.6; word-wrap: break-word; color: #000; }
                body.a11y-text-magnifier .a11y-magnifier { display: block; }
                .a11y-magnifier::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 2px; height: 20px; background: rgba(37, 99, 235, 0.3); pointer-events: none; }
                
                #a11y-bluelight-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(255, 165, 0, 0.2);
                    mix-blend-mode: multiply;
                    pointer-events: none;
                    z-index: 2147483646;
                    display: none;
                }
                body.a11y-blue-light #a11y-bluelight-overlay { display: block; }

                @media (max-width: 420px) {
                    .a11y-grid { grid-template-columns: 1fr; gap: 8px; }
                    .a11y-slider-group { padding: 12px; }
                    .a11y-content { padding: 15px; }
                }
            `;
      document.head.appendChild(style);
    }

    createWidget() {
      if (document.getElementById("a11y-widget-container")) return;

      const container = document.createElement("div");
      container.id = "a11y-widget-container";

      const toggleBtn = document.createElement("button");
      toggleBtn.id = "a11y-toggle-btn";
      toggleBtn.setAttribute("aria-label", this.translations.title);
      toggleBtn.innerHTML = '<i class="fas fa-universal-access"></i>';

      const panel = document.createElement("div");
      panel.id = "a11y-panel";
      panel.innerHTML = this.getPanelHTML();

      container.appendChild(toggleBtn);
      container.appendChild(panel);
      document.body.appendChild(container);

      this.createReadingMask();
      this.createMagnifier();
      this.createBlueLightOverlay();
    }

    createBlueLightOverlay() {
      if (!document.getElementById("a11y-bluelight-overlay")) {
        const overlay = document.createElement("div");
        overlay.id = "a11y-bluelight-overlay";
        document.body.appendChild(overlay);
      }
    }

    getPanelHTML() {
      return `
                <div class="a11y-header">
                    <h3>${this.translations.title}</h3>
                    <div class="a11y-header-actions">
                        <div class="a11y-lang-toggle">
                            <button class="a11y-lang-btn ${this.currentLang === "en" ? "active" : ""}" data-lang="en">EN</button>
                        </div>
                        <button class="a11y-close-btn" aria-label="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="a11y-content">
                    <div class="a11y-grid">
                        ${this.createFeatureCards()}
                    </div>
                    ${this.createSliders()}
                </div>
                <div class="a11y-footer">
                    <button class="a11y-btn a11y-btn-reset">
                        <i class="fas fa-undo"></i>
                        <span>${this.translations.reset}</span>
                    </button>
                </div>
                <div class="a11y-powered-by"></div>
            `;
    }

    createFeatureCards() {
      const features = [
        { id: "textToSpeech", icon: "fa-volume-up", label: this.translations.textToSpeech },
        { id: "highSaturation", icon: "fa-palette", label: this.translations.highSaturation },
        { id: "protanopia", icon: "fa-eye-slash", label: this.translations.protanopia },
        { id: "deuteranopia", icon: "fa-eye-slash", label: this.translations.deuteranopia },
        { id: "tritanopia", icon: "fa-eye-slash", label: this.translations.tritanopia },
        { id: "monochrome", icon: "fa-tint-slash", label: this.translations.monochrome },
        { id: "readingMask", icon: "fa-eye", label: this.translations.readingMask },
        { id: "blueLight", icon: "fa-sun", label: this.translations.blueLight },
        { id: "highContrast", icon: "fa-adjust", label: this.translations.highContrast },
        { id: "darkMode", icon: "fa-moon", label: this.translations.darkMode },
        { id: "dyslexiaFont", icon: "fa-font", label: this.translations.dyslexiaFont },
        { id: "textAlignRight", icon: "fa-align-right", label: this.translations.textAlign },
        { id: "textAlignCenter", icon: "fa-align-center", label: this.translations.textAlignCenter },
        { id: "textAlignLeft", icon: "fa-align-left", label: this.translations.textAlignLeft },
        { id: "highlightLinks", icon: "fa-link", label: this.translations.highlightLinks },
        { id: "hideImages", icon: "fa-image", label: this.translations.hideImages },
        { id: "highlightHeadings", icon: "fa-heading", label: this.translations.highlightHeadings },
        { id: "textMagnifier", icon: "fa-search-plus", label: this.translations.textMagnifier },
        { id: "focusOutline", icon: "fa-square", label: this.translations.focusOutline },
        { id: "reduceMotion", icon: "fa-pause", label: this.translations.reduceMotion },
        { id: "cursorSize", icon: "fa-mouse-pointer", label: this.translations.cursorSize },
        { id: "stopAutoplay", icon: "fa-stop", label: this.translations.stopAutoplay },
        { id: "invertColors", icon: "fa-exchange-alt", label: this.translations.invertColors },
      ];

      return features
        .map((f) => {
          const isActive = this.isFeatureActive(f.id);
          return `
                    <div class="a11y-card ${isActive ? "active" : ""}" data-feature="${f.id}">
                        <div class="a11y-card-icon"><i class="fas ${f.icon}"></i></div>
                        <div class="a11y-card-label">${f.label}</div>
                    </div>
                `;
        })
        .join("");
    }

    createSliders() {
      const sliders = [
        { id: "fontSize", label: this.translations.fontSize, min: 80, max: 150 },
        { id: "lineHeight", label: this.translations.lineHeight, min: 100, max: 200 },
        { id: "letterSpacing", label: this.translations.letterSpacing, min: 100, max: 150 },
        { id: "contentScale", label: this.translations.contentScale, min: 80, max: 130 },
        { id: "columnWidth", label: this.translations.columnWidth, min: 400, max: 1200 },
      ];

      return sliders
        .map(
          (s) => `
                <div class="a11y-slider-group">
                    <div class="a11y-slider-header">
                        <span class="a11y-slider-label">${s.label}</span>
                        <span class="a11y-slider-value" id="${s.id}Value">${this.settings[s.id] || (s.id === "columnWidth" ? 600 : 100)}${s.id === "columnWidth" ? "px" : "%"}</span>
                    </div>
                    <div class="a11y-slider-controls">
                        <button class="a11y-slider-btn" data-action="decrease" data-target="${s.id}"><i class="fas fa-minus"></i></button>
                        <input type="range" class="a11y-slider" id="${s.id}" min="${s.min}" max="${s.max}" value="${this.settings[s.id] || (s.id === "columnWidth" ? 600 : 100)}">
                        <button class="a11y-slider-btn" data-action="increase" data-target="${s.id}"><i class="fas fa-plus"></i></button>
                    </div>
                </div>`
        )
        .join("");
    }

    createReadingMask() {
      if (!document.getElementById("a11y-reading-mask")) {
        const mask = document.createElement("div");
        mask.id = "a11y-reading-mask";
        document.body.appendChild(mask);
      }
    }

    createMagnifier() {
      if (!document.querySelector(".a11y-magnifier")) {
        const magnifier = document.createElement("div");
        magnifier.className = "a11y-magnifier";
        magnifier.setAttribute("aria-hidden", "true");
        document.body.appendChild(magnifier);
      }
    }

    isFeatureActive(feature) {
      if (feature.startsWith("textAlign")) {
        const align = feature.replace("textAlign", "").toLowerCase();
        return this.settings.textAlign === align;
      }
      return this.settings[feature] || false;
    }

    attachEventListeners() {
      document.getElementById("a11y-toggle-btn").addEventListener("click", () => this.togglePanel());
      document.querySelector(".a11y-close-btn").addEventListener("click", () => this.togglePanel());

      document.querySelectorAll(".a11y-lang-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => this.changeLanguage(e.target.dataset.lang));
      });

      document.querySelectorAll(".a11y-card").forEach((card) => {
        card.addEventListener("click", () => this.toggleFeature(card.dataset.feature, card));
      });

      document.querySelectorAll(".a11y-slider").forEach((slider) => {
        slider.addEventListener("input", (e) => {
          const id = e.target.id;
          const value = e.target.value;
          const suffix = id === "columnWidth" ? "px" : "%";
          document.getElementById(id + "Value").textContent = value + suffix;
          this.settings[id] = parseInt(value);
          this.applySettings();
          this.saveSettings();
        });
      });

      document.querySelectorAll(".a11y-slider-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          const target = btn.dataset.target;
          const slider = document.getElementById(target);
          const current = parseInt(slider.value);
          const step = target === "columnWidth" ? 50 : 1;
          slider.value = action === "increase" ? Math.min(current + step, parseInt(slider.max)) : Math.max(current - step, parseInt(slider.min));
          slider.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });

      document.querySelector(".a11y-btn-reset").addEventListener("click", () => this.resetSettings());
      this.initMouseTracking();
    }

    initMouseTracking() {
      let magnifierTimeout;
      document.addEventListener("mousemove", (e) => {
        if (this.settings.readingMask) {
          const mask = document.getElementById("a11y-reading-mask");
          if (mask) mask.style.top = e.clientY - 60 + "px";
        }
        if (this.settings.textMagnifier) {
          clearTimeout(magnifierTimeout);
          magnifierTimeout = setTimeout(() => this.updateMagnifier(e), 10);
        }
      });
    }

    updateMagnifier(e) {
      const magnifier = document.querySelector(".a11y-magnifier");
      if (!magnifier) return;

      magnifier.style.display = "none";
      const targetElement = document.elementFromPoint(e.clientX, e.clientY);
      magnifier.style.display = "block";

      if (!targetElement || targetElement === document.body || targetElement === document.documentElement || targetElement.closest("#a11y-widget-container")) {
        magnifier.style.display = "none";
        return;
      }

      let textContainer = targetElement;
      const blockTags = ["P", "DIV", "ARTICLE", "SECTION", "LI", "TD", "TH", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "A"];
      while (textContainer && textContainer.textContent.trim().length === 0) {
        textContainer = textContainer.parentElement;
      }
      if (textContainer && !blockTags.includes(textContainer.tagName)) {
        const parent = textContainer.closest(blockTags.join(","));
        if (parent) textContainer = parent;
      }

      if (!textContainer || !textContainer.textContent.trim()) {
        magnifier.style.display = "none";
        return;
      }

      const fullText = textContainer.textContent.trim().replace(/\s+/g, " ");
      const words = fullText.split(" ");
      if (words.length === 0) {
        magnifier.style.display = "none";
        return;
      }

      const rect = textContainer.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = (e.clientY - rect.top) / rect.height;
      const estimatedPosition = Math.floor(words.length * (relativeY * 0.7 + relativeX * 0.3));
      const wordIndex = Math.max(0, Math.min(estimatedPosition, words.length - 1));

      const wordsToShow = 20;
      const wordsBeforeCursor = 8;
      let startIndex = Math.max(0, wordIndex - wordsBeforeCursor);
      let endIndex = Math.min(words.length, startIndex + wordsToShow);

      if (endIndex - startIndex < wordsToShow && startIndex > 0) startIndex = Math.max(0, endIndex - wordsToShow);

      let displayText = words.slice(startIndex, endIndex).join(" ");
      if (startIndex > 0) displayText = "... " + displayText;
      if (endIndex < words.length) displayText = displayText + " ...";

      magnifier.textContent = displayText;

      let left = e.clientX + 20;
      let top = e.clientY - magnifier.offsetHeight - 10;
      const magnifierWidth = magnifier.offsetWidth;
      const magnifierHeight = magnifier.offsetHeight;

      if (left + magnifierWidth > window.innerWidth - 20) left = e.clientX - magnifierWidth - 20;
      if (top < 20) top = e.clientY + 20;
      if (top + magnifierHeight > window.innerHeight - 20) top = window.innerHeight - magnifierHeight - 20;

      magnifier.style.left = left + "px";
      magnifier.style.top = top + "px";
    }

    toggleFeature(feature, card) {
      if (feature === "textToSpeech") {
        this.toggleTTS(card);
        return;
      }

      const colorModes = ["monochrome", "highSaturation", "protanopia", "deuteranopia", "tritanopia"];
      if (colorModes.includes(feature)) {
        if (!this.settings[feature]) {
          colorModes.forEach((mode) => {
            if (mode !== feature && this.settings[mode]) {
              this.settings[mode] = false;
              const modeCard = document.querySelector(`[data-feature="${mode}"]`);
              if (modeCard) modeCard.classList.remove("active");
            }
          });
        }
      }

      if (feature.startsWith("textAlign")) {
        document.querySelectorAll('[data-feature^="textAlign"]').forEach((c) => c.classList.remove("active"));
        const align = feature.replace("textAlign", "").toLowerCase();
        if (this.settings.textAlign === align) {
          this.settings.textAlign = "default";
        } else {
          this.settings.textAlign = align;
          card.classList.add("active");
        }
      } else {
        this.settings[feature] = !this.settings[feature];
        card.classList.toggle("active");
      }

      this.applySettings();
      this.saveSettings();
    }

    toggleTTS(card) {
      if (this.speechSynthesis.speaking) {
        this.speechSynthesis.cancel();
        this.settings.textToSpeech = false;
        card.classList.remove("active");
      } else {
        const text = document.body.innerText;
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.onend = () => {
          this.settings.textToSpeech = false;
          card.classList.remove("active");
        };
        this.speechSynthesis.speak(this.currentUtterance);
        this.settings.textToSpeech = true;
        card.classList.add("active");
      }
    }

    changeLanguage(lang) {
      this.currentLang = lang;
      this.translations = WIDGET_CONFIG.translations[lang];
      this.settings.language = lang;
      document.querySelectorAll(".a11y-lang-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === lang));
      this.updateUITexts();
      this.saveSettings();
    }

    updateUITexts() {
      document.querySelector(".a11y-header h3").textContent = this.translations.title;
      const cardMappings = {
        readingMask: this.translations.readingMask,
        highContrast: this.translations.highContrast,
        darkMode: this.translations.darkMode,
        dyslexiaFont: this.translations.dyslexiaFont,
        textAlignRight: this.translations.textAlign,
        textAlignCenter: this.translations.textAlignCenter,
        textAlignLeft: this.translations.textAlignLeft,
        highlightLinks: this.translations.highlightLinks,
        hideImages: this.translations.hideImages,
        highlightHeadings: this.translations.highlightHeadings,
        textMagnifier: this.translations.textMagnifier,
        focusOutline: this.translations.focusOutline,
        reduceMotion: this.translations.reduceMotion,
        cursorSize: this.translations.cursorSize,
        stopAutoplay: this.translations.stopAutoplay,
        invertColors: this.translations.invertColors,
        textToSpeech: this.translations.textToSpeech,
        monochrome: this.translations.monochrome,
        blueLight: this.translations.blueLight,
        highSaturation: this.translations.highSaturation,
        protanopia: this.translations.protanopia,
        deuteranopia: this.translations.deuteranopia,
        tritanopia: this.translations.tritanopia,
      };

      Object.entries(cardMappings).forEach(([feature, text]) => {
        const label = document.querySelector(`[data-feature="${feature}"] .a11y-card-label`);
        if (label) label.textContent = text;
      });

      const sliderMappings = {
        fontSize: this.translations.fontSize,
        lineHeight: this.translations.lineHeight,
        letterSpacing: this.translations.letterSpacing,
        contentScale: this.translations.contentScale,
        columnWidth: this.translations.columnWidth,
      };

      Object.entries(sliderMappings).forEach(([id, text]) => {
        const slider = document.getElementById(id);
        if (slider) {
          const label = slider.closest(".a11y-slider-group").querySelector(".a11y-slider-label");
          if (label) label.textContent = text;
        }
      });

      const resetBtn = document.querySelector(".a11y-btn-reset span");
      if (resetBtn) resetBtn.textContent = this.translations.reset;
    }

    togglePanel() {
      this.isOpen = !this.isOpen;
      const panel = document.getElementById("a11y-panel");
      panel.classList.toggle("active", this.isOpen);
    }

    applySettings() {
      document.body.classList.remove(
        "a11y-dyslexia",
        "a11y-highlight-links",
        "a11y-hide-images",
        "a11y-highlight-headings",
        "a11y-reading-mask",
        "a11y-text-magnifier",
        "a11y-high-contrast",
        "a11y-dark-mode",
        "a11y-focus-outline",
        "a11y-reduce-motion",
        "a11y-cursor-size",
        "a11y-stop-autoplay",
        "a11y-monochrome",
        "a11y-blue-light",
        "a11y-high-saturation",
        "a11y-protanopia",
        "a11y-deuteranopia",
        "a11y-tritanopia"
      );

      document.documentElement.style.fontSize = "";
      document.body.style.lineHeight = "";
      document.body.style.letterSpacing = "";
      document.body.style.zoom = "";

      const flarumSelectors = [
        "p",
        'div:not([class*="a11y"])',
        "li",
        "td",
        "th",
        "article",
        "section",
        "span",
        "a",
        ".Post-body",
        ".PostUser-name",
        ".PostUser",
        ".UserCard",
        ".DiscussionHero-title",
        ".TagLabel-name",
        ".TagItem",
        ".Post-header",
        ".CommentPost",
        ".PostMeta",
        ".Composer",
        ".UserCard-name",
        ".item-count",
        ".Notification-content",
        ".DiscussionListItem-title",
        ".DiscussionListItem-info",
        ".DiscussionListItem-excerpt",
        ".Header-title",
        ".Alert",
        ".container",
        ".sp_footer",
        ".App-header",
        ".App-footer",
        ".App-composer",
        ".Header-primary",
        ".Header-secondary",
        ".App-drawer",
        ".App-navigation",
        ".App-content",
        ".item-excerpt",
        ".Post-stream",
        ".Post",
        ".DiscussionListItem",
        ".DiscussionList",
        ".Button-label",
        ".Dropdown-toggle",
        ".FormControl",
        ".TextEditor-editor",
        ".NotificationList",
        ".Badge",
        ".Tooltip",
        ".Modal-content",
        ".Alert-body",
        ".Search-input",
        ".IndexPage-nav",
        ".DiscussionPage-nav",
        ".UserPage-content",
        ".SettingsPage-content",
        ".ExtensionPage-content",
        ".TagsPage-content",
        '[class*="Post"]',
        '[class*="Discussion"]',
        '[class*="User"]',
        '[class*="Tag"]',
        '[class*="Comment"]',
        '[class*="Stream"]',
        '[class*="List"]',
      ];

      const textElements = document.querySelectorAll(flarumSelectors.join(", "));
      textElements.forEach((el) => {
        el.style.fontSize = "";
        el.style.textAlign = "";
        el.style.maxWidth = "";
        el.classList.remove("a11y-flarum-text");
      });

      if (this.settings.fontSize && this.settings.fontSize !== 100) {
        const fontSizePercent = this.settings.fontSize + "%";
        document.documentElement.style.setProperty("font-size", fontSizePercent, "important");
        document.body.style.setProperty("font-size", fontSizePercent, "important");
        textElements.forEach((el) => {
          el.style.setProperty("font-size", fontSizePercent, "important");
          el.classList.add("a11y-flarum-text");
        });
        this.injectDynamicFontSizeCSS(this.settings.fontSize);
      } else {
        this.removeDynamicFontSizeCSS();
      }

      if (this.settings.lineHeight && this.settings.lineHeight !== 100) {
        const value = this.settings.lineHeight / 100;
        document.body.style.setProperty("line-height", value, "important");
        textElements.forEach((el) => {
          el.style.setProperty("line-height", value, "important");
        });
      }

      if (this.settings.letterSpacing && this.settings.letterSpacing !== 100) {
        const value = (this.settings.letterSpacing - 100) * 0.05;
        document.body.style.setProperty("letter-spacing", value + "em", "important");
        textElements.forEach((el) => {
          el.style.setProperty("letter-spacing", value + "em", "important");
        });
      }

      if (this.settings.contentScale && this.settings.contentScale !== 100) {
        document.body.style.zoom = this.settings.contentScale + "%";
      }

      if (this.settings.columnWidth && this.settings.columnWidth !== 600) {
        textElements.forEach((el) => {
          el.style.maxWidth = this.settings.columnWidth + "px";
        });
      }

      if (this.settings.textAlign && this.settings.textAlign !== "default") {
        textElements.forEach((el) => {
          el.style.setProperty("text-align", this.settings.textAlign, "important");
        });
      }

      if (this.settings.dyslexiaFont) document.body.classList.add("a11y-dyslexia");
      if (this.settings.highlightLinks) document.body.classList.add("a11y-highlight-links");
      if (this.settings.hideImages) document.body.classList.add("a11y-hide-images");
      if (this.settings.highlightHeadings) document.body.classList.add("a11y-highlight-headings");
      if (this.settings.readingMask) document.body.classList.add("a11y-reading-mask");
      if (this.settings.textMagnifier) document.body.classList.add("a11y-text-magnifier");
      if (this.settings.highContrast) document.body.classList.add("a11y-high-contrast");
      if (this.settings.darkMode) document.body.classList.add("a11y-dark-mode");
      if (this.settings.focusOutline) document.body.classList.add("a11y-focus-outline");
      if (this.settings.reduceMotion) document.body.classList.add("a11y-reduce-motion");
      if (this.settings.cursorSize) document.body.classList.add("a11y-cursor-size");
      if (this.settings.blueLight) document.body.classList.add("a11y-blue-light");

      if (this.settings.monochrome) document.body.classList.add("a11y-monochrome");
      if (this.settings.highSaturation) document.body.classList.add("a11y-high-saturation");
      if (this.settings.protanopia) document.body.classList.add("a11y-protanopia");
      if (this.settings.deuteranopia) document.body.classList.add("a11y-deuteranopia");
      if (this.settings.tritanopia) document.body.classList.add("a11y-tritanopia");

      if (this.settings.stopAutoplay) {
        document.body.classList.add("a11y-stop-autoplay");
        document.querySelectorAll("video[autoplay], audio[autoplay]").forEach((media) => {
          media.pause();
          media.removeAttribute("autoplay");
        });
      }

      if (this.settings.invertColors) {
        document.documentElement.classList.add("a11y-invert");
      } else {
        document.documentElement.classList.remove("a11y-invert");
      }
    }

    injectDynamicFontSizeCSS(fontSize) {
      this.removeDynamicFontSizeCSS();
      const style = document.createElement("style");
      style.id = "a11y-dynamic-fontsize";
      style.textContent = `
        .Post-body *, .DiscussionListItem *, .UserCard *, .CommentPost *, .Header-title *, .App-content *, .Post-stream *, .DiscussionList *, [class*="Post"] *, [class*="Discussion"] *, [class*="User"] *, [class*="Comment"] *, [class*="Stream"] *, [class*="List"] * { font-size: ${fontSize}% !important; }
        .Post-body, .PostUser-name, .PostUser, .UserCard, .DiscussionHero-title, .TagLabel-name, .TagItem, .Post-header, .CommentPost, .PostMeta, .UserCard-name, .item-count, .Notification-content, .DiscussionListItem-title, .DiscussionListItem-info, .DiscussionListItem-excerpt, .Header-title, .Button-label, .Dropdown-toggle, .FormControl, .TextEditor-editor { font-size: ${fontSize}% !important; }
      `;
      document.head.appendChild(style);
    }

    removeDynamicFontSizeCSS() {
      const existingStyle = document.getElementById("a11y-dynamic-fontsize");
      if (existingStyle) existingStyle.remove();
    }

    resetSettings() {
      this.settings.fontSize = 100;
      this.settings.lineHeight = 100;
      this.settings.letterSpacing = 100;
      this.settings.contentScale = 100;
      this.settings.columnWidth = 600;
      this.settings.textAlign = "default";
      this.settings.readingMask = false;
      this.settings.highContrast = false;
      this.settings.darkMode = false;
      this.settings.dyslexiaFont = false;
      this.settings.highlightLinks = false;
      this.settings.hideImages = false;
      this.settings.highlightHeadings = false;
      this.settings.textMagnifier = false;
      this.settings.focusOutline = false;
      this.settings.reduceMotion = false;
      this.settings.cursorSize = false;
      this.settings.stopAutoplay = false;
      this.settings.invertColors = false;
      this.settings.textToSpeech = false;
      this.settings.monochrome = false;
      this.settings.blueLight = false;
      this.settings.highSaturation = false;
      this.settings.protanopia = false;
      this.settings.deuteranopia = false;
      this.settings.tritanopia = false;

      if (this.speechSynthesis.speaking) this.speechSynthesis.cancel();

      ["fontSize", "lineHeight", "letterSpacing", "contentScale"].forEach((id) => {
        const slider = document.getElementById(id);
        if (slider) {
          slider.value = 100;
          document.getElementById(id + "Value").textContent = "100%";
        }
      });

      const columnSlider = document.getElementById("columnWidth");
      if (columnSlider) {
        columnSlider.value = 600;
        document.getElementById("columnWidthValue").textContent = "600px";
      }

      document.querySelectorAll(".a11y-card").forEach((card) => card.classList.remove("active"));
      this.removeDynamicFontSizeCSS();
      this.applySettings();
      this.saveSettings();
    }

    getDefaultSettings() {
      return {
        fontSize: 100,
        lineHeight: 100,
        letterSpacing: 100,
        contentScale: 100,
        columnWidth: 600,
        textAlign: "default",
        language: this.currentLang,
        readingMask: false,
        highContrast: false,
        darkMode: false,
        dyslexiaFont: false,
        highlightLinks: false,
        hideImages: false,
        highlightHeadings: false,
        textMagnifier: false,
        focusOutline: false,
        reduceMotion: false,
        cursorSize: false,
        stopAutoplay: false,
        invertColors: false,
        textToSpeech: false,
        monochrome: false,
        blueLight: false,
        highSaturation: false,
        protanopia: false,
        deuteranopia: false,
        tritanopia: false,
      };
    }

    saveSettings() {
      try {
        localStorage.setItem(WIDGET_CONFIG.storageKey, JSON.stringify(this.settings));
      } catch (e) {
        console.warn("Could not save accessibility settings:", e);
      }
    }

    loadSettings() {
      try {
        const saved = localStorage.getItem(WIDGET_CONFIG.storageKey);
        if (saved) return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
      } catch (e) {
        console.warn("Could not load accessibility settings:", e);
      }
      return this.getDefaultSettings();
    }

    destroy() {
      this.observers.forEach((observer) => observer.disconnect());
      this.observers = [];
      if (this.reapplyInterval) clearInterval(this.reapplyInterval);
      this.removeDynamicFontSizeCSS();
      if (this.speechSynthesis.speaking) this.speechSynthesis.cancel();
    }
  }

  function initAccessibilityWidget() {
    if (window.accessibilityWidget) return;
    window.accessibilityWidget = new AccessibilityWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccessibilityWidget);
  } else {
    initAccessibilityWidget();
  }
})();
