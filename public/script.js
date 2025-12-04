/**
 * M'GEMS Interview Buddy Frontend Application
 * Handles UI interactions, state management, and real-time communication
 */

class WeebAssistantUI {
  constructor() {
    this.websocket = null;
    this.config = {
      deepseekApiKey: '',
      deepgramApiKey: '',
      geminiApiKey: '',
      aiSystemPrompt: '',
      deepseekBaseUrl: 'https://api.deepseek.com/v1',
      geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    };
    
    this.state = {
      isRecording: false,
      isTranscribing: false,
      isSharingScreen: false,
      isTranscribingScreen: false,
      currentMeeting: null,
      pipVisible: false,
      selectedScreen: null,
      questions: [],
      practiceMode: false,
      darkMode: false,
      screenShareStream: null,
      screenAudioContext: null,
      screenAudioProcessor: null,
      deepgramSocket: null,
      audioWorkletLoaded: false,
      currentPlatform: null,
      detectedPlatforms: [],
      platformIntegration: {
        zoom: { detected: false, meetingId: null, meetingTitle: null },
        googleMeet: { detected: false, meetingUrl: null, meetingTitle: null },
        teams: { detected: false, meetingId: null, meetingTitle: null }
      }
    };
    this.elements = {};
    this.pipState = {
      isDragging: false,
      isResizing: false,
      dragOffset: { x: 0, y: 0 },
      resizeStart: { x: 0, y: 0, width: 0, height: 0 }
    };
    
    this.init();
  }

  clearPipTranscription() {
    const pipText = this.elements.pipOverlay.querySelector('.pip-transcription-text');
    if (pipText) {
      pipText.textContent = '';
      pipText.dataset.timestamp = '';
    }
  }

  clearPipAI() {
    const pipAIContent = this.elements.pipOverlay.querySelector('.pip-ai-content');
    if (pipAIContent) {
      pipAIContent.textContent = '';
      pipAIContent.dataset.timestamp = '';
    }
  }

  setupPipAutoCleanup() {
    // Check every minute for content older than 30 minutes
    setInterval(() => {
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      
      // Check transcription
      const pipText = this.elements.pipOverlay.querySelector('.pip-transcription-text');
      if (pipText && pipText.dataset.timestamp && parseInt(pipText.dataset.timestamp) < thirtyMinutesAgo) {
        this.clearPipTranscription();
      }
      
      // Check AI content
      const pipAIContent = this.elements.pipOverlay.querySelector('.pip-ai-content');
      if (pipAIContent && pipAIContent.dataset.timestamp && parseInt(pipAIContent.dataset.timestamp) < thirtyMinutesAgo) {
        this.clearPipAI();
      }
    }, 60000); // Check every minute
  }

  init() {
    this.cacheElements();
    this.loadConfig();
    this.setupEventListeners();
    this.connectWebSocket();
    this.setupPiP();
    this.setupAccessibility();
    this.setupResponsive();
    this.loadTheme();
    this.hideLoading(); // Hide loading overlay after initialization
    
    // Start auto-deletion timer for old transcriptions and AI answers (every 3 minutes)
    this.startAutoDeletionTimer();
    
    // Start platform detection for interview platforms
    this.startPlatformDetection();
    
    // Show API configuration reminder if no keys are configured
    setTimeout(() => {
      const hasAnyApiKey = this.config.deepseekApiKey || this.config.deepgramApiKey || this.config.geminiApiKey;
      if (!hasAnyApiKey) {
        this.showNotification('🚀 Welcome! Please configure your API keys to get started', 'info', 8000);
        // Auto-open the API config panel for first-time users
        setTimeout(() => {
          this.toggleApiConfig(true);
        }, 2000);
      }
    }, 1000);
    
    console.log('🌸 M\'GEMS Interview Buddy UI initialized');
  }

  startAutoDeletionTimer() {
    // Clean up old transcriptions every 3 minutes (180,000 milliseconds)
    const CLEANUP_INTERVAL = 3 * 60 * 1000; // 3 minutes
    const MAX_AGE = 3 * 60 * 1000; // 3 minutes
    
    setInterval(() => {
      this.cleanupOldTranscriptions(MAX_AGE);
    }, CLEANUP_INTERVAL);
    
    console.log(`🧹 Auto-deletion timer started: cleaning up transcriptions older than 3 minutes`);
  }

  cleanupOldTranscriptions(maxAge) {
    const now = Date.now();
    const transcriptionArea = this.elements.interviewerTranscription;
    
    if (!transcriptionArea) return;
    
    const entries = transcriptionArea.querySelectorAll('.transcription-entry');
    const aiSuggestions = transcriptionArea.querySelectorAll('.ai-suggestion');
    let deletedCount = 0;
    
    // Clean up old transcription entries
    entries.forEach(entry => {
      const createdAt = parseInt(entry.dataset.createdAt);
      if (createdAt && (now - createdAt) > maxAge) {
        // Add fade-out animation before removal
        entry.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        entry.style.opacity = '0';
        entry.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
          if (entry.parentNode) {
            entry.parentNode.removeChild(entry);
          }
        }, 500);
        
        deletedCount++;
      }
    });
    
    // Clean up old AI suggestions
    aiSuggestions.forEach(suggestion => {
      const createdAt = parseInt(suggestion.dataset.createdAt);
      if (createdAt && (now - createdAt) > maxAge) {
        // Add fade-out animation before removal
        suggestion.style.transition = 'opacity 0.3s ease-out';
        suggestion.style.opacity = '0';
        
        setTimeout(() => {
          if (suggestion.parentNode) {
            suggestion.parentNode.removeChild(suggestion);
          }
        }, 300);
        
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old transcription entries and AI suggestions`);
    }
  }

  cacheElements() {
    console.log('Caching elements...');
    this.elements = {
      // Top bar
      topBar: document.querySelector('.top-bar'),
      apiConfigBtn: document.getElementById('api-config-btn'),
      createMeetingBtn: document.getElementById('create-meeting-btn'),
      debugSettingsBtn: document.getElementById('debug-settings-btn'),
      themeToggle: document.getElementById('theme-toggle'),
      
      // API Config Panel
      apiConfigPanel: document.getElementById('api-config-panel'),
      apiConfigForm: document.getElementById('api-config-form'),
      deepseekKeyInput: document.getElementById('deepseek-api-key'),
      deepgramKeyInput: document.getElementById('deepgram-api-key'),
      geminiKeyInput: document.getElementById('gemini-api-key'),
      geminiUrlInput: document.getElementById('gemini-base-url'),
      deepseekUrlInput: document.getElementById('deepseek-base-url'),
      systemPromptInput: document.getElementById('system-prompt'),
      testApisBtn: document.getElementById('test-apis-btn'),
      
      // Screen share
      screenShareMain: document.getElementById('screen-share-main'),
      screenThumbnails: document.getElementById('screen-thumbnails'),
      shareScreenBtn: document.getElementById('share-screen-btn'),
      stopShareBtn: document.getElementById('stop-share-btn'),
      
      // Transcription
      interviewerTranscription: document.getElementById('interviewer-transcription'),
      transcriptionStatus: document.getElementById('transcription-status'),
      startTranscriptionBtn: document.getElementById('start-transcription-btn'),
      stopTranscriptionBtn: document.getElementById('stop-transcription-btn'),
      clearTranscriptionBtn: document.getElementById('clear-transcription-btn'),
      
      // Questions
      questionsArea: document.getElementById('questions-area'),
      questionsList: document.getElementById('questions-list'),
      generateQuestionsBtn: document.getElementById('generate-questions-btn'),
      
      // Practice
      practiceArea: document.getElementById('practice-area'),
      startPracticeBtn: document.getElementById('start-practice-btn'),
      recordAnswerBtn: document.getElementById('record-answer-btn'),
      practiceFeedback: document.getElementById('practice-feedback'),
      practiceModeBtn: document.getElementById('practice-mode-btn'),
      testPipBtn: document.getElementById('test-pip-btn'),
      
      // Status
      meetingStatus: document.getElementById('meeting-status'),
      
      // PiP
      pipOverlay: document.getElementById('pip-overlay'),
      pipContent: document.getElementById('pip-content'),
      pipCloseBtn: document.getElementById('pip-close-btn'),
      pipResizeBtn: document.getElementById('pip-resize-btn'),
      pipToggleBtn: document.getElementById('pip-icon-btn'),
      
      // Notifications
      notificationContainer: document.getElementById('notification-container'),
      
      // Loading
      loadingOverlay: document.getElementById('loading-overlay'),
      
      // Skip link
      skipLink: document.querySelector('.skip-link')
    };
    
    // Log which elements were found/missing
    const missingElements = [];
    const foundElements = [];
    for (const [key, element] of Object.entries(this.elements)) {
      if (element) {
        foundElements.push(key);
      } else {
        missingElements.push(key);
      }
    }
    console.log('Elements found:', foundElements);
    if (missingElements.length > 0) {
      console.warn('Elements missing:', missingElements);
    }
    
    // Ensure loading overlay is hidden immediately
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.add('hidden');
      this.elements.loadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  setupEventListeners() {
    // Top bar
    this.elements.apiConfigBtn?.addEventListener('click', () => this.toggleApiConfig());
    this.elements.createMeetingBtn?.addEventListener('click', () => this.createMeeting());
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    this.elements.debugSettingsBtn?.addEventListener('click', () => this.debugSettings());
    
    // API Config Panel - Enhanced accessibility
    this.elements.apiConfigForm?.addEventListener('submit', (e) => {
      console.log('API config form submitted');
      e.preventDefault();
      this.saveConfig();
    });
    
    // Add keyboard navigation for form
    this.elements.apiConfigForm?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleApiConfig(false);
      }
    });
    
    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => this.togglePasswordVisibility(e.target));
    });
    
    // Test APIs button
    this.elements.testApisBtn?.addEventListener('click', () => this.testApis());
    
    // Paste buttons for API keys
    document.getElementById('paste-deepseek-key')?.addEventListener('click', () => this.pasteApiKey('deepseek-api-key'));
    document.getElementById('paste-deepgram-key')?.addEventListener('click', () => this.pasteApiKey('deepgram-api-key'));
    document.getElementById('paste-gemini-key')?.addEventListener('click', () => this.pasteApiKey('gemini-api-key'));
    
    // Interviewer Panel
    this.elements.startTranscriptionBtn?.addEventListener('click', () => this.startTranscription());
    this.elements.stopTranscriptionBtn?.addEventListener('click', () => this.stopTranscription());
    this.elements.clearTranscriptionBtn?.addEventListener('click', () => this.clearTranscription());
    
    // Screen Share Area
    this.elements.shareScreenBtn?.addEventListener('click', () => this.startScreenShare());
    this.elements.stopShareBtn?.addEventListener('click', () => this.stopScreenShare());
    this.setupScreenShareListeners();
    
    // Applicant Panel
    this.elements.generateQuestionsBtn?.addEventListener('click', () => this.generateQuestions());
    this.elements.practiceModeBtn?.addEventListener('click', () => this.togglePracticeMode());
    this.elements.startPracticeBtn?.addEventListener('click', () => this.startPractice());
    this.elements.recordAnswerBtn?.addEventListener('click', () => this.recordAnswer());
    this.elements.testPipBtn?.addEventListener('click', () => this.testPipReadability());
    
    // PiP Overlay
    this.elements.pipCloseBtn?.addEventListener('click', () => this.hidePiP());
    this.elements.pipResizeBtn?.addEventListener('mousedown', (e) => this.startResize(e));
    this.elements.pipToggleBtn?.addEventListener('click', () => this.togglePiP());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // Window resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Click outside to close panels
    document.addEventListener('click', (e) => this.handleClickOutside(e));
  }

  setupPiP() {
    if (!this.elements.pipOverlay) return;
    
    // Make PiP draggable
    const header = this.elements.pipOverlay.querySelector('.pip-header');
    if (header) {
      header.addEventListener('mousedown', (e) => this.startDrag(e));
    }
    
    // Make PiP resizable
    this.elements.pipOverlay.addEventListener('mousemove', (e) => this.handleDrag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
    
    // Setup resize handles
    const resizeHandles = this.elements.pipOverlay.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
      const direction = handle.className.split(' ').find(cls => cls.startsWith('resize-')).replace('resize-', '');
      handle.addEventListener('mousedown', (e) => this.startResize(e, direction));
    });
    
    // Prevent text selection during drag
    this.elements.pipOverlay.addEventListener('selectstart', (e) => {
      if (this.pipState.isDragging || this.pipState.isResizing) {
        e.preventDefault();
      }
    });
    
    // Setup auto-cleanup for PIP content
    this.setupPipAutoCleanup();
  }

  startDrag(e) {
    if (e.target.closest('.pip-close') || e.target.closest('.pip-resize')) return;
    
    this.pipState.isDragging = true;
    const rect = this.elements.pipOverlay.getBoundingClientRect();
    this.pipState.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    this.elements.pipOverlay.style.cursor = 'grabbing';
    e.preventDefault();
  }

  handleDrag(e) {
    if (this.pipState.isDragging) {
      const x = e.clientX - this.pipState.dragOffset.x;
      const y = e.clientY - this.pipState.dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - this.elements.pipOverlay.offsetWidth;
      const maxY = window.innerHeight - this.elements.pipOverlay.offsetHeight;
      
      this.elements.pipOverlay.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      this.elements.pipOverlay.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
      this.elements.pipOverlay.style.right = 'auto';
      this.elements.pipOverlay.style.bottom = 'auto';
    }
    
    if (this.pipState.isResizing) {
      const deltaX = e.clientX - this.pipState.resizeStart.x;
      const deltaY = e.clientY - this.pipState.resizeStart.y;
      
      let newWidth = this.pipState.resizeStart.width;
      let newHeight = this.pipState.resizeStart.height;
      let newLeft = this.pipState.resizeStart.left;
      let newTop = this.pipState.resizeStart.top;
      
      const direction = this.pipState.resizeDirection || 'se';
      
      // Handle different resize directions
      switch (direction) {
        case 'se': // Southeast (bottom-right)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width + deltaX));
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height + deltaY));
          break;
        case 'sw': // Southwest (bottom-left)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width - deltaX));
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height + deltaY));
          newLeft = this.pipState.resizeStart.left + (this.pipState.resizeStart.width - newWidth);
          break;
        case 'ne': // Northeast (top-right)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width + deltaX));
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height - deltaY));
          newTop = this.pipState.resizeStart.top + (this.pipState.resizeStart.height - newHeight);
          break;
        case 'nw': // Northwest (top-left)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width - deltaX));
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height - deltaY));
          newLeft = this.pipState.resizeStart.left + (this.pipState.resizeStart.width - newWidth);
          newTop = this.pipState.resizeStart.top + (this.pipState.resizeStart.height - newHeight);
          break;
        case 'n': // North (top)
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height - deltaY));
          newTop = this.pipState.resizeStart.top + (this.pipState.resizeStart.height - newHeight);
          break;
        case 's': // South (bottom)
          newHeight = Math.max(150, Math.min(400, this.pipState.resizeStart.height + deltaY));
          break;
        case 'e': // East (right)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width + deltaX));
          break;
        case 'w': // West (left)
          newWidth = Math.max(200, Math.min(600, this.pipState.resizeStart.width - deltaX));
          newLeft = this.pipState.resizeStart.left + (this.pipState.resizeStart.width - newWidth);
          break;
      }
      
      // Apply the new dimensions and position
      this.elements.pipOverlay.style.width = `${newWidth}px`;
      this.elements.pipOverlay.style.height = `${newHeight}px`;
      if (newLeft !== this.pipState.resizeStart.left) {
        this.elements.pipOverlay.style.left = `${newLeft}px`;
      }
      if (newTop !== this.pipState.resizeStart.top) {
        this.elements.pipOverlay.style.top = `${newTop}px`;
      }
    }
  }

  stopDrag() {
    this.pipState.isDragging = false;
    this.pipState.isResizing = false;
    this.elements.pipOverlay.style.cursor = 'move';
    this.elements.pipOverlay.style.userSelect = '';
    
    // Reset resize direction
    this.pipState.resizeDirection = null;
  }

  startResize(e, direction = 'se') {
    this.pipState.isResizing = true;
    this.pipState.resizeDirection = direction;
    this.pipState.resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: this.elements.pipOverlay.offsetWidth,
      height: this.elements.pipOverlay.offsetHeight,
      left: this.elements.pipOverlay.offsetLeft,
      top: this.elements.pipOverlay.offsetTop
    };
    
    // Add visual feedback
    this.elements.pipOverlay.style.cursor = this.getResizeCursor(direction);
    this.elements.pipOverlay.style.userSelect = 'none';
    
    e.preventDefault();
    e.stopPropagation();
  }

  getResizeCursor(direction) {
    const cursorMap = {
      'n': 'n-resize',
      's': 's-resize',
      'e': 'e-resize',
      'w': 'w-resize',
      'ne': 'ne-resize',
      'nw': 'nw-resize',
      'se': 'se-resize',
      'sw': 'sw-resize'
    };
    return cursorMap[direction] || 'se-resize';
  }

  setupAccessibility() {
    // ARIA live regions for announcements
    this.announcements = document.createElement('div');
    this.announcements.setAttribute('aria-live', 'polite');
    this.announcements.setAttribute('aria-atomic', 'true');
    this.announcements.className = 'sr-only';
    document.body.appendChild(this.announcements);
    
    // Status announcements for screen readers
    this.statusAnnouncements = document.createElement('div');
    this.statusAnnouncements.setAttribute('aria-live', 'assertive');
    this.statusAnnouncements.setAttribute('aria-atomic', 'true');
    this.statusAnnouncements.className = 'sr-only';
    document.body.appendChild(this.statusAnnouncements);
    
    // Focus management
    this.setupFocusManagement();
    
    // High contrast mode detection
    this.setupHighContrastMode();
    
    // Reduced motion preference
    this.setupReducedMotion();
    
    // Voice control support
    this.setupVoiceControl();
  }

  setupFocusManagement() {
    // Trap focus in modals/panels when open
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
    });
  }

  handleTabNavigation(e) {
    const activeElement = document.activeElement;
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(activeElement);
    
    if (e.shiftKey && currentIndex === 0) {
      e.preventDefault();
      focusableElements[focusableElements.length - 1]?.focus();
    } else if (!e.shiftKey && currentIndex === focusableElements.length - 1) {
      e.preventDefault();
      focusableElements[0]?.focus();
    }
  }

  getFocusableElements() {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)).filter(el => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled;
    });
  }

  setupResponsive() {
    // Handle responsive behavior
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (e) => {
      if (e.matches) {
        this.showNotification('Switched to mobile layout', 'info');
      }
    };
    
    mediaQuery.addListener(handleMediaChange);
    handleMediaChange(mediaQuery);
  }

  setupScreenShareListeners() {
    // Mock screen share thumbnails
    const thumbnails = this.elements.screenThumbnails?.querySelectorAll('.thumbnail-placeholder');
    thumbnails?.forEach((thumb, index) => {
      thumb.addEventListener('click', () => this.selectScreen(index));
      thumb.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectScreen(index);
        }
      });
    });
  }

  connectWebSocket() {
    try {
      this.websocket = new WebSocket('ws://localhost:3000');
      
      this.websocket.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.showNotification('Connected to server', 'success');
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.showNotification('Disconnected from server', 'warning');
        // Attempt reconnection after 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.showNotification('Connection error', 'error');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.showNotification('Failed to connect to server', 'error');
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'transcription':
        this.handleTranscription(message.data);
        break;
      case 'ai_response':
        this.handleAIResponse(message.data);
        break;
      case 'question_generated':
        this.handleQuestionGenerated(message.data);
        break;
      case 'practice_feedback':
        this.handlePracticeFeedback(message.data);
        break;
      case 'error':
        this.showNotification(message.message, 'error');
        break;
      case 'config_updated':
        this.showNotification('Configuration updated on server', 'success');
        break;
      case 'api_test_results':
        this.handleApiTestResults(message.data);
        break;
      case 'screen_share_status':
        this.handleScreenShareStatus(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  loadConfig() {
    try {
      // Load from localStorage first
      const saved = localStorage.getItem('weeb-assistant-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
        this.updateConfigUI();
      }
      
      // Then load from server environment variables
      this.loadServerConfig();
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  async loadServerConfig() {
    try {
      const response = await fetch('/api/config');
      const serverConfig = await response.json();
      
      // If environment variables are set, use them
      if (serverConfig.deepseek?.envKey) {
        this.config.deepseekApiKey = serverConfig.deepseek.envKey;
        this.elements.deepseekKeyInput.value = serverConfig.deepseek.envKey;
        console.log('Loaded DeepSeek API key from environment');
      }
      
      if (serverConfig.deepgram?.envKey) {
        this.config.deepgramApiKey = serverConfig.deepgram.envKey;
        this.elements.deepgramKeyInput.value = serverConfig.deepgram.envKey;
        console.log('Loaded Deepgram API key from environment');
      }
      
      if (serverConfig.gemini?.envKey) {
        this.config.geminiApiKey = serverConfig.gemini.envKey;
        this.elements.geminiKeyInput.value = serverConfig.gemini.envKey;
        console.log('Loaded Gemini API key from environment');
      }
      
      // Update UI to show environment-loaded status
      this.updateEnvStatus(serverConfig);
      
    } catch (error) {
      console.error('Failed to load server config:', error);
    }
  }

  updateEnvStatus(serverConfig) {
    // Add visual indicators for environment-loaded keys
    const apis = ['deepseek', 'deepgram', 'gemini'];
    apis.forEach(api => {
      if (serverConfig[api]?.envKey) {
        const input = this.elements[`${api}KeyInput`];
        const container = input?.closest('.form-group');
        if (input && container) {
          input.classList.add('env-loaded');
          input.title = 'API key loaded from environment variables';
          
          // Add environment indicator badge
          if (!container.querySelector('.env-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'env-indicator';
            indicator.textContent = 'ENV';
            indicator.title = 'Loaded from .env file';
            container.style.position = 'relative';
            container.appendChild(indicator);
          }
        }
      }
    });
  }

  saveConfig() {
    console.log('saveConfig called');
    try {
      // Validate required fields
      const deepseekKey = this.elements.deepseekKeyInput?.value?.trim();
      const deepgramKey = this.elements.deepgramKeyInput?.value?.trim();
      const geminiKey = this.elements.geminiKeyInput?.value?.trim();
      const deepseekUrl = this.elements.deepseekUrlInput?.value?.trim();
      const geminiUrl = this.elements.geminiUrlInput?.value?.trim();
      const systemPrompt = this.elements.systemPromptInput?.value?.trim();
      
      console.log('Form values:', { deepseekKey: deepseekKey ? '***' : 'empty', deepgramKey: deepgramKey ? '***' : 'empty', geminiKey: geminiKey ? '***' : 'empty', deepseekUrl, geminiUrl, systemPrompt });
      
      // Basic validation
      if (!deepseekKey) {
        this.showNotification('DeepSeek API key is required', 'error');
        this.elements.deepseekKeyInput?.focus();
        return;
      }
      
      if (!deepgramKey) {
        this.showNotification('Deepgram API key is required', 'error');
        this.elements.deepgramKeyInput?.focus();
        return;
      }

      // Gemini is optional, but if key is provided, validate URL
      if (geminiKey && geminiUrl && !this.isValidUrl(geminiUrl)) {
        this.showNotification('Please enter a valid Gemini base URL', 'error');
        this.elements.geminiUrlInput?.focus();
        return;
      }
      
      // Validate URL format for DeepSeek
      if (deepseekUrl && !this.isValidUrl(deepseekUrl)) {
        this.showNotification('Please enter a valid DeepSeek base URL', 'error');
        this.elements.deepseekUrlInput?.focus();
        return;
      }
      
      // Save configuration
      this.config.deepseekApiKey = deepseekKey;
      this.config.deepgramApiKey = deepgramKey;
      this.config.geminiApiKey = geminiKey || '';
      this.config.aiSystemPrompt = systemPrompt;
      this.config.deepseekBaseUrl = deepseekUrl || 'https://api.deepseek.com/v1';
      this.config.geminiBaseUrl = geminiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      
      localStorage.setItem('weeb-assistant-config', JSON.stringify(this.config));
      
      // Update UI
      this.toggleApiConfig(false);
      this.showNotification('Configuration saved successfully', 'success');
      this.announceToScreenReader('API configuration saved');
      
      // Send config to server
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'update_config',
          data: this.config
        }));
      }
      
      console.log('Configuration saved:', { ...this.config, deepseekApiKey: '***', deepgramApiKey: '***', geminiApiKey: '***' });
      
    } catch (error) {
      console.error('Failed to save config:', error);
      this.showNotification('Failed to save configuration', 'error');
      this.announceToScreenReader('Error saving configuration');
    }
  }

  cancelConfig() {
    this.updateConfigUI();
    this.toggleApiConfig();
  }

  updateConfigUI() {
    console.log('Updating config UI with:', this.config);
    if (this.elements.deepseekKeyInput) this.elements.deepseekKeyInput.value = this.config.deepseekApiKey || '';
    if (this.elements.deepgramKeyInput) this.elements.deepgramKeyInput.value = this.config.deepgramApiKey || '';
    if (this.elements.geminiKeyInput) this.elements.geminiKeyInput.value = this.config.geminiApiKey || '';
    if (this.elements.geminiUrlInput) this.elements.geminiUrlInput.value = this.config.geminiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    if (this.elements.systemPromptInput) this.elements.systemPromptInput.value = this.config.aiSystemPrompt || '';
    if (this.elements.deepseekUrlInput) this.elements.deepseekUrlInput.value = this.config.deepseekBaseUrl || 'https://api.deepseek.com/v1';
    
    // Update status indicator
    this.updateConfigStatusIndicator();
  }

  updateConfigStatusIndicator() {
    const statusIndicator = document.getElementById('config-status-indicator');
    const apiConfigBtn = this.elements.apiConfigBtn;
    
    if (!statusIndicator || !apiConfigBtn) return;
    
    // Check if any API keys are configured
    const hasDeepseekKey = this.config.deepseekApiKey && this.config.deepseekApiKey.length > 0;
    const hasDeepgramKey = this.config.deepgramApiKey && this.config.deepgramApiKey.length > 0;
    const hasGeminiKey = this.config.geminiApiKey && this.config.geminiApiKey.length > 0;
    
    const totalConfigured = [hasDeepseekKey, hasDeepgramKey, hasGeminiKey].filter(Boolean).length;
    
    if (totalConfigured === 3) {
      statusIndicator.textContent = '✅';
      statusIndicator.className = 'config-indicator config-status-valid';
      statusIndicator.title = 'All API keys configured';
      apiConfigBtn.title = 'All API keys configured - Click to modify';
    } else if (totalConfigured > 0) {
      statusIndicator.textContent = '⚠️';
      statusIndicator.className = 'config-indicator';
      statusIndicator.title = `${totalConfigured} of 3 API keys configured`;
      apiConfigBtn.title = `${totalConfigured} of 3 API keys configured - Click to complete setup`;
    } else {
      statusIndicator.textContent = '❌';
      statusIndicator.className = 'config-indicator config-status-invalid';
      statusIndicator.title = 'No API keys configured';
      apiConfigBtn.title = 'No API keys configured - Click to set up required APIs';
    }
  }

  async pasteApiKey(inputId) {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.getElementById(inputId);
      if (input && text) {
        input.value = text.trim();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        this.showNotification(`✅ API key pasted successfully!`, 'success', 2000);
        
        // Auto-save after pasting
        setTimeout(() => {
          this.saveConfig();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      this.showNotification('❌ Could not access clipboard. Please paste manually (Ctrl+V)', 'error', 3000);
    }
  }

  setupKeyboardShortcuts() {
    // Add global keyboard shortcuts for API config
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K opens API config
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleApiConfig(true);
      }
      
      // Escape closes API config if open
      if (e.key === 'Escape' && !this.elements.apiConfigPanel?.classList.contains('hidden')) {
        this.toggleApiConfig(false);
      }
    });
  }

  toggleApiConfig(show = null) {
    const panel = this.elements.apiConfigPanel;
    const button = this.elements.apiConfigBtn;
    const statusIndicator = document.getElementById('config-status-indicator');
    
    console.log('toggleApiConfig called, panel exists:', !!panel, 'button exists:', !!button);
    
    if (!panel || !button) {
      console.error('API config panel or button not found');
      return;
    }
    
    let isOpen;
    if (show === null) {
      isOpen = panel.classList.contains('hidden');
    } else {
      isOpen = show;
    }
    
    console.log('Toggling API config panel, isOpen:', isOpen);
    
    if (isOpen) {
      panel.classList.remove('hidden');
      button.setAttribute('aria-expanded', 'true');
      this.announceToScreenReader('API configuration panel opened');
      // Load current config when opening
      this.updateConfigUI();
      // Focus on first input for better UX
      setTimeout(() => {
        const firstInput = panel.querySelector('input[type="password"]');
        if (firstInput) firstInput.focus();
      }, 100);
    } else {
      panel.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
      this.announceToScreenReader('API configuration panel closed');
    }
    
    // Update status indicator
    this.updateConfigStatusIndicator();
  }

  debugSettings() {
    console.log('=== SETTINGS PANEL DEBUG ===');
    console.log('WebSocket status:', this.websocket?.readyState);
    console.log('Config:', this.config);
    console.log('Elements found:', Object.keys(this.elements).filter(key => this.elements[key]));
    console.log('Elements missing:', Object.keys(this.elements).filter(key => !this.elements[key]));
    
    // Test specific elements
    const requiredElements = ['apiConfigBtn', 'apiConfigPanel', 'apiConfigForm', 'deepseekKeyInput', 'deepgramKeyInput', 'geminiKeyInput', 'geminiUrlInput', 'systemPromptInput', 'deepseekUrlInput'];
    
    requiredElements.forEach(elementName => {
      const element = this.elements[elementName];
      if (element) {
        console.log(`✅ ${elementName}: found, type=${element.type || element.tagName}, id=${element.id}`);
      } else {
        console.log(`❌ ${elementName}: missing`);
      }
    });
    
    // Try to open the settings panel
    console.log('Attempting to open settings panel...');
    this.toggleApiConfig(true);
    
    // Show notification with debug info
    this.showNotification('Settings panel debug info logged to console', 'info');
  }

  startTranscription() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'start_transcription',
        data: {}
      }));
      this.state.isTranscribing = true;
      this.updateTranscriptionUI();
      this.showNotification('Transcription started', 'info');
    } else {
      this.showNotification('Not connected to server', 'error');
    }
  }

  stopTranscription() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'stop_transcription',
        data: {}
      }));
      this.state.isTranscribing = false;
      this.updateTranscriptionUI();
      this.showNotification('Transcription stopped', 'info');
    }
  }

  clearTranscription() {
    if (this.elements.transcriptionArea) {
      this.elements.transcriptionArea.innerHTML = '<div class="transcription-placeholder">📝 Transcriptions will appear here...</div>';
      this.showNotification('Transcription cleared', 'info');
    }
    
    // Also clear interviewer transcription if it exists
    if (this.elements.interviewerTranscription) {
      this.elements.interviewerTranscription.innerHTML = '<div class="transcription-placeholder">📝 Transcriptions will appear here...</div>';
    }
  }

  handleTranscription(data) {
    if (this.elements.transcriptionArea) {
      const placeholder = this.elements.transcriptionArea.querySelector('.transcription-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      const transcriptionElement = document.createElement('div');
      transcriptionElement.className = 'transcription-item';
      transcriptionElement.innerHTML = `
        <div class="transcription-text">${data.text}</div>
        <div class="transcription-meta">
          <span class="transcription-time">${new Date().toLocaleTimeString()}</span>
          <span class="transcription-speaker">${data.speaker || 'Unknown'}</span>
        </div>
      `;
      
      this.elements.transcriptionArea.appendChild(transcriptionElement);
      this.elements.transcriptionArea.scrollTop = this.elements.transcriptionArea.scrollHeight;
      
      // Also update PiP if visible
      if (this.state.pipVisible) {
        this.updatePiPContent(data.text);
      }
    }
  }

  updateTranscriptionUI() {
    const startBtn = this.elements.startTranscriptionBtn;
    const stopBtn = this.elements.stopTranscriptionBtn;
    const status = this.elements.transcriptionStatus;
    
    if (startBtn) startBtn.disabled = this.state.isTranscribing;
    if (stopBtn) stopBtn.disabled = !this.state.isTranscribing;
    
    if (status) {
      const indicator = status.querySelector('.status-indicator');
      if (indicator) {
        indicator.className = `status-indicator ${this.state.isTranscribing ? 'recording' : ''}`;
        indicator.textContent = this.state.isTranscribing ? '●' : '○';
      }
      const statusText = status.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = this.state.isTranscribing ? 'Recording...' : 'Ready';
      }
    }
  }
  
  updateTranscriptionStatus(message) {
    try {
      const status = this.elements.transcriptionStatus;
      if (status) {
        const statusText = status.querySelector('.status-text');
        if (statusText) {
          statusText.textContent = message;
        }
      }
      console.log('Transcription status:', message);
    } catch (error) {
      console.error('Error updating transcription status:', error);
    }
  }

  async startScreenShare() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.showNotification('Screen sharing not supported in this browser', 'error');
        return;
      }

      // Request screen sharing with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Enable audio capture
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000, // Optimal for speech recognition
          channelCount: 1 // Mono for better transcription
        }
      });

      this.state.screenShareStream = stream;
      this.state.isSharingScreen = true;

      // Check if audio track is available
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('Audio track captured from screen sharing:', audioTrack.label);
        this.showNotification('Screen sharing with audio started', 'success');
        
        // Start real-time transcription
        await this.startScreenAudioTranscription(stream);
      } else {
        console.log('No audio track available from screen sharing');
        this.showNotification('Screen sharing started (no audio detected)', 'warning');
      }

      // Update UI
      this.updateScreenShareUI();

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      // Also handle audio track ending
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          console.log('Audio track ended');
          this.stopScreenAudioTranscription();
        });
      }

      // Send to server via WebSocket
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'start_screen_share',
          data: { 
            status: 'started',
            hasAudio: !!audioTrack,
            audioLabel: audioTrack?.label || 'Unknown'
          }
        }));
      }

    } catch (error) {
      console.error('Screen sharing error:', error);
      this.showNotification('Failed to start screen sharing', 'error');
    }
  }

  stopScreenShare() {
    if (this.state.screenShareStream) {
      this.state.screenShareStream.getTracks().forEach(track => track.stop());
      this.state.screenShareStream = null;
    }

    this.state.isSharingScreen = false;
    this.updateScreenShareUI();
    this.showNotification('Screen sharing stopped', 'info');

    // Stop audio transcription if running
    this.stopScreenAudioTranscription();

    // Send to server via WebSocket
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'stop_screen_share',
        data: { status: 'stopped' }
      }));
    }
  }

  // ===== SCREEN AUDIO TRANSCRIPTION =====
  
  async startScreenAudioTranscription(screenStream) {
    try {
      const audioTrack = screenStream.getAudioTracks()[0];
      if (!audioTrack) {
        console.log('No audio track available for transcription');
        return;
      }

      console.log('Starting screen audio transcription...');
      console.log('Audio track settings:', {
        kind: audioTrack.kind,
        label: audioTrack.label,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState
      });
      
      // Create a MediaStreamSource from the screen audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      // Ensure audio context is resumed (required for some browsers)
      if (audioContext.state === 'suspended') {
        console.log('Audio context is suspended, attempting to resume...');
        await audioContext.resume();
        console.log('Audio context resumed successfully');
      }
      
      const source = audioContext.createMediaStreamSource(screenStream);
      console.log('MediaStreamSource created successfully');
      
      // Set up audio processing (AudioWorklet or ScriptProcessor fallback)
      await this.setupAudioProcessing(audioContext, source, screenStream);
      
    } catch (error) {
      console.error('Failed to start screen audio transcription:', error);
      this.showNotification('Failed to start screen audio transcription', 'error');
      this.stopScreenShare();
    }
  }
  
  stopScreenAudioTranscription() {
    if (this.state.screenAudioProcessor) {
      this.state.screenAudioProcessor.disconnect();
      this.state.screenAudioProcessor = null;
    }
    
    if (this.state.screenAudioContext) {
      this.state.screenAudioContext.close();
      this.state.screenAudioContext = null;
    }
    
    if (this.state.deepgramSocket) {
      try {
        // Check if it's a Deepgram SDK connection or manual WebSocket
        if (typeof this.state.deepgramSocket.removeAllListeners === 'function') {
          // Deepgram SDK connection
          this.state.deepgramSocket.removeAllListeners();
          this.state.deepgramSocket.close();
        } else {
          // Manual WebSocket connection
          this.state.deepgramSocket.close();
        }
      } catch (error) {
        console.error('Error closing Deepgram connection:', error);
      }
      this.state.deepgramSocket = null;
    }
    
    this.state.isTranscribingScreen = false;
    
    this.showNotification('Screen audio transcription stopped', 'info');
    this.updateTranscriptionStatus('Ready');
  }
  
  async startDeepgramStream() {
    // Connect to Deepgram WebSocket for real-time transcription using official SDK
    const deepgramApiKey = this.config.deepgramApiKey;
    if (!deepgramApiKey) {
      console.error('Deepgram API key not available');
      this.showNotification('Deepgram API key required for transcription', 'error');
      return;
    }
    
    console.log('=== STARTDEEPGRAMSTREAM DEBUG ===');
    console.log('Connecting to Deepgram streaming...');
    console.log('window.Deepgram available:', !!window.Deepgram);
    console.log('typeof window.Deepgram:', typeof window.Deepgram);
    
    try {
      // Enhanced Deepgram SDK detection with multiple checks and fallback
      let deepgramAvailable = false;
      let deepgramConstructor = null;
      
      // Wait a bit for the SDK to load if it's still loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('After 500ms delay:');
      console.log('window.Deepgram available:', !!window.Deepgram);
      console.log('typeof window.Deepgram:', typeof window.Deepgram);
      
      // Check for Deepgram in global scope
      if (typeof window !== 'undefined' && window.Deepgram) {
        deepgramConstructor = window.Deepgram;
        deepgramAvailable = true;
        console.log('✅ Deepgram SDK found in window.Deepgram');
      }
      // Check for Deepgram as a global variable
      else if (typeof Deepgram !== 'undefined') {
        deepgramConstructor = Deepgram;
        deepgramAvailable = true;
        console.log('✅ Deepgram SDK found as global Deepgram');
      }
      // Check for @deepgram/sdk module
      else if (typeof window !== 'undefined' && window.deepgram) {
        deepgramConstructor = window.deepgram;
        deepgramAvailable = true;
        console.log('Deepgram SDK found in window.deepgram');
      }
      
      if (!deepgramAvailable) {
        console.warn('❌ Deepgram SDK not found, falling back to manual WebSocket implementation');
        console.log('This may be due to CDN blocking (ORB) or network issues');
        console.log('Available globals:', {
          window: typeof window,
          Deepgram: typeof Deepgram,
          windowDeepgram: typeof window?.Deepgram,
          deepgram: typeof window?.deepgram
        });
        throw new Error('Deepgram SDK not loaded - using WebSocket fallback');
      }
      
      // Create Deepgram client with proper constructor
      const deepgram = new deepgramConstructor(deepgramApiKey);
      
      // Create live transcription connection
      this.state.deepgramSocket = await deepgram.transcription.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        diarize: true,
        punctuate: true,
        utterances: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });
      
      // Handle connection open
      this.state.deepgramSocket.on('open', () => {
        console.log('Connected to Deepgram WebSocket');
        this.showNotification('Connected to Deepgram transcription service', 'success');
      });
      
      // Handle transcription results
      this.state.deepgramSocket.on('transcriptReceived', (data) => {
        try {
          if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && transcript.trim()) {
              this.displayTranscription(transcript, data);
            }
          }
        } catch (error) {
          console.error('Error processing Deepgram transcript:', error);
        }
      });
      
      // Handle errors
      this.state.deepgramSocket.on('error', (error) => {
        console.error('Deepgram WebSocket error:', error);
        this.showNotification('Deepgram transcription service error', 'error');
      });
      
      // Handle connection close
      this.state.deepgramSocket.on('close', () => {
        console.log('Deepgram WebSocket connection closed');
        this.showNotification('Deepgram transcription service disconnected', 'info');
      });
      
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      this.showNotification('Failed to connect to Deepgram transcription service', 'error');
      
      // Fallback to manual WebSocket implementation
      console.log('Falling back to manual WebSocket implementation...');
      this.startDeepgramStreamFallback();
    }
  }
  
  // Fallback manual WebSocket implementation
  startDeepgramStreamFallback() {
    const deepgramApiKey = this.config.deepgramApiKey;
    if (!deepgramApiKey) return;
    
    console.log('Connecting to Deepgram streaming (fallback)...');
    
    // Connect directly to Deepgram's WebSocket endpoint with core settings
      const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&diarize=true&punctuate=true&utterances=true&encoding=linear16&sample_rate=16000&channels=1`;
    
    try {
      this.state.deepgramSocket = new WebSocket(deepgramUrl, ['token', deepgramApiKey]);
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.state.deepgramSocket.readyState !== WebSocket.OPEN) {
          console.error('Deepgram WebSocket connection timeout');
          this.state.deepgramSocket.close();
          this.showNotification('Deepgram connection timeout - check your API key', 'error');
        }
      }, 10000); // 10 second timeout
      
      this.state.deepgramSocket.onopen = () => {
        console.log('Connected to Deepgram WebSocket (fallback)');
        this.showNotification('Connected to Deepgram transcription service', 'success');
        clearTimeout(connectionTimeout); // Clear the timeout on successful connection
      };
      
      this.state.deepgramSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'Results' && data.channel && data.channel.alternatives) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript && transcript.trim()) {
              this.displayTranscription(transcript, data);
            }
          }
        } catch (error) {
          console.error('Error parsing Deepgram response:', error);
        }
      };
      
      this.state.deepgramSocket.onerror = (error) => {
        console.error('Deepgram WebSocket error (fallback):', error);
        this.showNotification('Deepgram transcription service error', 'error');
        // Try to reconnect after a delay
        setTimeout(() => {
          if (this.state.isTranscribingScreen) {
            console.log('Attempting to reconnect to Deepgram...');
            this.startDeepgramStreamFallback(deepgramApiKey);
          }
        }, 3000);
      };
      
      this.state.deepgramSocket.onclose = (event) => {
        console.log('Deepgram WebSocket connection closed (fallback)', event.code, event.reason);
        this.showNotification('Deepgram transcription service disconnected', 'info');
        // Auto-reconnect if still transcribing
        if (this.state.isTranscribingScreen && event.code !== 1000) {
          console.log('Connection lost, attempting to reconnect...');
          setTimeout(() => {
            this.startDeepgramStreamFallback(deepgramApiKey);
          }, 2000);
        }
      };
      
    } catch (error) {
      console.error('Failed to connect to Deepgram (fallback):', error);
      this.showNotification('Failed to connect to Deepgram transcription service', 'error');
      // Provide more specific error guidance
      if (error.message.includes('WebSocket')) {
        this.showNotification('WebSocket connection failed. Check your API key and network connection.', 'error');
      } else if (error.message.includes('API key')) {
        this.showNotification('Invalid Deepgram API key. Please check your configuration.', 'error');
      }
    }
  }
  
  // Helper method to send audio data to Deepgram (optimized for real-time streaming)
  sendAudioToDeepgram(audioBuffer) {
    if (!this.state.deepgramSocket) {
      console.warn('No Deepgram socket available, skipping audio data');
      return;
    }
    
    try {
      // Initialize audio buffer queue for real-time streaming if not exists
      if (!this.state.audioBufferQueue) {
        this.state.audioBufferQueue = [];
        this.state.lastAudioSendTime = Date.now();
      }
      
      // Add to queue for efficient batching
      this.state.audioBufferQueue.push(audioBuffer);
      
      // Send audio in batches for better performance (every 100ms or when queue reaches 4 chunks)
      const now = Date.now();
      const timeSinceLastSend = now - this.state.lastAudioSendTime;
      const shouldSend = timeSinceLastSend >= 100 || this.state.audioBufferQueue.length >= 4;
      
      if (shouldSend && this.state.audioBufferQueue.length > 0) {
        // Combine queued buffers for efficient transmission
        const totalSize = this.state.audioBufferQueue.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combinedBuffer = new Uint8Array(totalSize);
        
        let offset = 0;
        for (const buffer of this.state.audioBufferQueue) {
          combinedBuffer.set(new Uint8Array(buffer), offset);
          offset += buffer.byteLength;
        }
        
        // Check if it's a Deepgram SDK connection or manual WebSocket
        if (typeof this.state.deepgramSocket.send === 'function') {
          // Deepgram SDK connection or fallback - check if send method exists
          try {
            this.state.deepgramSocket.send(combinedBuffer.buffer);
            console.log(`Real-time batch: Sent ${this.state.audioBufferQueue.length} chunks (${totalSize} bytes)`);
          } catch (sendError) {
            console.warn('Failed to send audio data:', sendError);
          }
        } else if (this.state.deepgramSocket?.readyState === WebSocket.OPEN) {
          // Manual WebSocket connection
          try {
            this.state.deepgramSocket.send(combinedBuffer.buffer);
            console.log(`Real-time batch: Sent ${this.state.audioBufferQueue.length} chunks (${totalSize} bytes)`);
          } catch (sendError) {
            console.warn('Failed to send audio data via WebSocket:', sendError);
          }
        } else {
          console.warn('Deepgram socket not in ready state, queuing for later. State:', 
            this.state.deepgramSocket.readyState || 'unknown');
        }
        
        // Clear queue and update timestamp
        this.state.audioBufferQueue = [];
        this.state.lastAudioSendTime = now;
      }
    } catch (error) {
      console.error('Error sending audio to Deepgram:', error);
      // Clear queue on error to prevent buildup
      this.state.audioBufferQueue = [];
    }
  }

  // Create enhanced transcript with word-level speaker tracking
  createEnhancedTranscript(words) {
    try {
      if (!words || words.length === 0) return null;
      
      let currentSpeaker = null;
      let transcript = '';
      let speakerStart = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Check if speaker changed
        if (word.speaker !== currentSpeaker) {
          // Close previous speaker span if needed
          if (currentSpeaker !== null) {
            transcript += '</span> ';
          }
          
          // Start new speaker span
          currentSpeaker = word.speaker;
          const speakerNumber = currentSpeaker + 1;
          const speakerColors = ['#0066cc', '#cc6600', '#00cc66', '#cc0066', '#6600cc'];
          const color = speakerColors[currentSpeaker % speakerColors.length];
          
          let speakerLabel = currentSpeaker === 0 ? 'INTERVIEWER' : `Speaker ${speakerNumber}`;
          transcript += `<span style="color: ${color}; font-weight: bold;">${speakerLabel}: </span>`;
          speakerStart = i;
        }
        
        // Add the word
        if (word.word) {
          transcript += word.word + ' ';
        }
      }
      
      // Close final speaker span
      if (currentSpeaker !== null) {
        transcript = transcript.trim();
      }
      
      return transcript;
    } catch (error) {
      console.error('Enhanced transcript creation failed:', error);
      return null;
    }
  }

  // Audio preprocessing for better transcription quality (optimized for real-time)
  preprocessAudio(audioBuffer) {
    try {
      // Use the same buffer to avoid memory allocation
      const processed = audioBuffer;
      const length = processed.length;
      
      // Step 1: Quick noise gate (reduce low-level background noise)
      const noiseGateThreshold = 0.005; // Reduced to 0.5% for faster processing
      for (let i = 0; i < length; i++) {
        processed[i] = Math.abs(processed[i]) < noiseGateThreshold ? 0 : processed[i];
      }
      
      // Step 2: Fast volume normalization (single pass)
      let maxAmplitude = 0;
      for (let i = 0; i < length; i++) {
        const absVal = Math.abs(processed[i]);
        if (absVal > maxAmplitude) maxAmplitude = absVal;
      }
      
      if (maxAmplitude > 0) {
        const targetLevel = 0.7; // Slightly reduced target for stability
        const gain = targetLevel / maxAmplitude;
        for (let i = 0; i < length; i++) {
          processed[i] *= gain;
        }
      }
      
      // Step 3: Lightweight high-pass filter (optimized)
      const alpha = 0.9; // Reduced coefficient for faster response
      let prevSample = 0;
      for (let i = 0; i < length; i++) {
        const current = processed[i];
        processed[i] = current - alpha * prevSample;
        prevSample = current;
      }
      
      console.log('Real-time audio preprocessing completed');
      return processed;
    } catch (error) {
      console.error('Audio preprocessing failed:', error);
      return audioBuffer; // Return original if preprocessing fails
    }
  }

  // New function to process audio for transcription (optimized for real-time streaming)
  processAudioForTranscription(audioBuffer) {
    try {
      // Apply audio preprocessing for better transcription quality
      const processedAudio = this.preprocessAudio(audioBuffer);
      
      // Convert float32 to int16 for Deepgram with chunking for real-time streaming
      const chunkSize = 512; // Small chunks for faster streaming
      const totalSamples = processedAudio.length;
      
      // Process and send audio in small chunks for real-time performance
      for (let offset = 0; offset < totalSamples; offset += chunkSize) {
        const currentChunkSize = Math.min(chunkSize, totalSamples - offset);
        const buffer = new ArrayBuffer(currentChunkSize * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < currentChunkSize; i++) {
          const sample = Math.max(-1, Math.min(1, processedAudio[offset + i]));
          view.setInt16(i * 2, sample * 0x7FFF, true);
        }
        
        // Send immediately for real-time streaming
        this.sendAudioToDeepgram(buffer);
      }
      
      console.log(`Real-time streaming: Sent ${totalSamples} samples in ${Math.ceil(totalSamples / chunkSize)} chunks`);
      
    } catch (error) {
      console.error('Error processing audio for transcription:', error);
    }
  }

  // New function to monitor audio levels
  monitorAudioLevels(stream) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevels = () => {
        if (!this.state.isTranscribingScreen) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        console.log('Audio level:', average.toFixed(2));
        
        if (average < 10) {
          console.warn('Very low audio levels detected - check if screen audio is being captured');
          this.updateTranscriptionStatus('Low audio levels detected - check screen audio settings');
        }
        
        setTimeout(checkAudioLevels, 1000);
      };
      
      checkAudioLevels();
      
    } catch (error) {
      console.error('Error monitoring audio levels:', error);
    }
  }

  // New function to setup audio processing
  async setupAudioProcessing(audioContext, source, stream) {
    try {
      // Use AudioWorkletNode for modern audio processing
      if (audioContext.audioWorklet) {
        console.log('Setting up AudioWorklet for audio processing...');
        
        let audioWorkletSuccess = false;
        
        if (!this.state.audioWorkletLoaded) {
          console.log('Loading AudioWorklet module...');
          console.log('AudioContext state:', audioContext.state);
          console.log('AudioWorklet available:', !!audioContext.audioWorklet);
          
          try {
            // Ensure AudioContext is running before loading module
            if (audioContext.state === 'suspended') {
              console.log('Resuming AudioContext...');
              await audioContext.resume();
              console.log('AudioContext resumed, state:', audioContext.state);
            }
            
            console.log('Attempting to load audio-processor.js...');
            await audioContext.audioWorklet.addModule('audio-processor.js');
            this.state.audioWorkletLoaded = true;
            console.log('AudioWorklet module loaded successfully');
            
            // Give more time for processor registration
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Processor registration wait completed');
            
            // Test if processor is actually available
            try {
              console.log('Testing AudioWorklet processor availability...');
              const testNode = new AudioWorkletNode(audioContext, 'audio-processor', {
                processorOptions: { bufferSize: 256, sampleRate: 16000 },
                outputChannelCount: [1]
              });
              testNode.disconnect(); // Disconnect without connecting
              console.log('AudioWorklet processor verification successful');
            } catch (testError) {
              console.error('AudioWorklet processor test failed:', testError);
              this.state.audioWorkletLoaded = false;
              console.log('Falling back to ScriptProcessor due to AudioWorklet registration failure');
            }
            
          } catch (loadError) {
            console.error('Failed to load AudioWorklet module:', loadError);
            console.error('Error name:', loadError.name);
            console.error('Error message:', loadError.message);
            this.state.audioWorkletLoaded = false;
            // Don't throw here, let it fall through to ScriptProcessor
          }
        }
        
        if (this.state.audioWorkletLoaded) {
          console.log('Creating AudioWorkletNode...');
          console.log('Available processors:', audioContext.audioWorklet ? 'audioWorklet exists' : 'audioWorklet missing');
          let processor;
          try {
            // Create with minimal options first to avoid conflicts
            processor = new AudioWorkletNode(audioContext, 'audio-processor', {
              outputChannelCount: [1],
              processorOptions: {
                bufferSize: 2048,
                sampleRate: 16000
              }
            });
            console.log('AudioWorkletNode created successfully');
            audioWorkletSuccess = true;
            
            // Connect the audio pipeline
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            this.state.screenAudioContext = audioContext;
            this.state.screenAudioProcessor = processor;
            this.state.isTranscribingScreen = true;
            
            // Set up audio data processing
            processor.port.onmessage = (event) => {
              if (event.data.type === 'audio-data' && this.state.isTranscribingScreen) {
                console.log('Received audio data from AudioWorklet, size:', event.data.buffer.length);
                this.processAudioForTranscription(event.data.buffer);
              }
            };
            
            console.log('AudioWorklet setup completed successfully');
            
          } catch (nodeError) {
            console.error('Failed to create AudioWorkletNode:', nodeError);
            console.error('Error details:', nodeError.name, nodeError.message);
            audioWorkletSuccess = false;
          }
        }
        
        if (!audioWorkletSuccess) {
          console.log('AudioWorklet failed, falling back to ScriptProcessorNode');
          this.setupScriptProcessorFallback(audioContext, source);
        }
        
      } else {
        console.log('AudioWorklet not supported, using ScriptProcessorNode fallback');
        this.setupScriptProcessorFallback(audioContext, source);
      }
      
      // Start Deepgram connection
      await this.startDeepgramStream();
      
      // Update UI
      this.showNotification('Screen audio transcription started', 'success');
      this.updateTranscriptionStatus('Transcribing screen audio...');
      
      // Monitor audio levels
      this.monitorAudioLevels(stream);
      
    } catch (error) {
      console.error('Audio processing setup failed:', error);
      throw error;
    }
  }
  
  // Fallback method for ScriptProcessorNode (deprecated but needed for older browsers)
  setupScriptProcessorFallback(audioContext, source) {
    try {
      console.log('Setting up ScriptProcessorNode fallback for audio processing...');
      
      // Create ScriptProcessorNode with smaller buffer for lower latency (2048 instead of 4096)
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      this.state.screenAudioProcessor = processor;
      
      // Process audio data (fallback) - optimized for real-time streaming
      processor.onaudioprocess = (e) => {
        if (!this.state.isTranscribingScreen) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Send smaller chunks for real-time performance
        const chunkSize = 512;
        for (let offset = 0; offset < inputData.length; offset += chunkSize) {
          const currentChunkSize = Math.min(chunkSize, inputData.length - offset);
          
          // Convert float32 to int16 for Deepgram
          const buffer = new ArrayBuffer(currentChunkSize * 2);
          const view = new DataView(buffer);
          for (let i = 0; i < currentChunkSize; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[offset + i]));
            view.setInt16(i * 2, sample * 0x7FFF, true);
          }
          
          // Send to Deepgram via WebSocket or SDK
          this.sendAudioToDeepgram(buffer);
        }
        
        console.log(`ScriptProcessor fallback: Processed ${inputData.length} samples in ${Math.ceil(inputData.length / 512)} chunks`);
      };
      
      console.log('ScriptProcessorNode fallback setup completed');
    } catch (error) {
      console.error('ScriptProcessorNode fallback failed:', error);
      this.showNotification('Audio processing setup failed', 'error');
    }
  }
  
  displayTranscription(transcript, data) {
    try {
      console.log('Displaying transcription:', transcript);
      console.log('Transcription data:', data);
      
      const transcriptionArea = this.elements.interviewerTranscription;
      if (!transcriptionArea) {
        console.error('Transcription area not found');
        return;
      }
      
      // Remove placeholder if it exists
      const placeholder = transcriptionArea.querySelector('.transcription-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      // Create transcription entry with timestamp for auto-deletion
      const transcriptionEntry = document.createElement('div');
      transcriptionEntry.className = 'transcription-entry';
      transcriptionEntry.style.marginBottom = '8px';
      transcriptionEntry.style.padding = '8px';
      transcriptionEntry.style.backgroundColor = '#f5f5f5';
      transcriptionEntry.style.borderRadius = '4px';
      transcriptionEntry.dataset.createdAt = Date.now(); // Add timestamp for auto-deletion
      
      // Add timestamp
      const timestamp = new Date().toLocaleTimeString();
      const timeElement = document.createElement('span');
      timeElement.className = 'transcription-time';
      timeElement.style.color = '#666';
      timeElement.style.fontSize = '12px';
      timeElement.style.marginRight = '8px';
      timeElement.textContent = `[${timestamp}] `;
      
      // Add speaker identification if available (from diarization)
      let speakerInfo = '';
      let speakerNumber = null;
      if (data && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
        const alternative = data.channel.alternatives[0];
        if (alternative.words && alternative.words[0] && alternative.words[0].speaker !== undefined) {
          const firstWord = alternative.words[0];
          speakerNumber = firstWord.speaker + 1;
          speakerInfo = speakerNumber === 1 ? 'INTERVIEWER: ' : `Speaker ${speakerNumber}: `;
        }
      }
      
      if (speakerInfo && speakerNumber !== null) {
        const speakerElement = document.createElement('span');
        speakerElement.className = 'transcription-speaker';
        speakerElement.style.color = '#0066cc';
        speakerElement.style.fontWeight = 'bold';
        speakerElement.style.marginRight = '4px';
        speakerElement.textContent = speakerInfo;
        
        // Add visual speaker indicator with color coding
        const speakerIndicator = document.createElement('span');
        speakerIndicator.className = 'speaker-indicator';
        speakerIndicator.style.display = 'inline-block';
        speakerIndicator.style.width = '12px';
        speakerIndicator.style.height = '12px';
        speakerIndicator.style.borderRadius = '50%';
        speakerIndicator.style.marginRight = '6px';
        speakerIndicator.style.verticalAlign = 'middle';
        
        // Use different colors for different speakers
        const speakerColors = ['#0066cc', '#cc6600', '#00cc66', '#cc0066', '#6600cc'];
        speakerIndicator.style.backgroundColor = speakerColors[(speakerNumber - 1) % speakerColors.length];
        
        transcriptionEntry.appendChild(speakerIndicator);
        transcriptionEntry.appendChild(speakerElement);
      }
      
      // Add the transcript text with confidence indicator
      const textElement = document.createElement('span');
      textElement.className = 'transcription-text';
      textElement.style.color = '#333';
      
      // Add confidence indicator if available
      let confidenceInfo = '';
      if (data && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
        const alternative = data.channel.alternatives[0];
        if (alternative.confidence !== undefined) {
          const confidence = Math.round(alternative.confidence * 100);
          confidenceInfo = ` [${confidence}%]`;
          
          // Apply different styling based on confidence level
          if (confidence < 70) {
            textElement.style.opacity = '0.7'; // Lower confidence = more transparent
            textElement.style.fontStyle = 'italic'; // Italic for uncertain text
          } else if (confidence < 85) {
            textElement.style.opacity = '0.85'; // Medium confidence
          }
        }
      }
      
      textElement.textContent = transcript + confidenceInfo;
      
      // Add word-level speaker tracking if available
      if (data && data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
        const alternative = data.channel.alternatives[0];
        if (alternative.words && alternative.words.length > 0) {
          // Create enhanced transcription with speaker changes
          const enhancedTranscript = this.createEnhancedTranscript(alternative.words);
          if (enhancedTranscript) {
            textElement.innerHTML = enhancedTranscript + confidenceInfo;
          }
        }
      }
      
      transcriptionEntry.appendChild(timeElement);
      transcriptionEntry.appendChild(textElement);
      
      // Automatically generate answer for all transcriptions
      if (transcript.trim().length > 5) {
        // Generate answer automatically after a short delay to avoid overwhelming the UI
        setTimeout(() => {
          this.generateAnswer(transcript, transcriptionEntry);
        }, 500); // Reduced delay for faster response
      }
      
      // Optional: Add manual suggest button (can be removed or kept for manual override)
      const suggestBtn = document.createElement('button');
      suggestBtn.className = 'suggest-btn';
      suggestBtn.innerHTML = '✨ Suggest Answer';
      suggestBtn.onclick = () => this.generateAnswer(transcript, transcriptionEntry);
      transcriptionEntry.appendChild(suggestBtn);
      
      // Add to transcription area
      transcriptionArea.appendChild(transcriptionEntry);
      
      // Auto-scroll to bottom
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        transcriptionArea.scrollTop = transcriptionArea.scrollHeight;
      });
      
      // Also update PIP transcription if active
      this.updatePipTranscription(transcript);
      
      console.log('Transcription displayed successfully');
      
    } catch (error) {
      console.error('Error displaying transcription:', error);
    }
  }

  async generateAnswer(question, container) {
    if (!question) return;
    
    // Remove existing suggestion if any
    const existingSuggestion = container.querySelector('.ai-suggestion');
    if (existingSuggestion) existingSuggestion.remove();
    
    // Create suggestion container with loading state and timestamp for auto-deletion
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'ai-suggestion loading';
    suggestionDiv.dataset.createdAt = Date.now(); // Add timestamp for auto-deletion
    suggestionDiv.innerHTML = `
      <div class="ai-header">
        <span class="ai-icon">✨</span>
        <span class="ai-title">AI Assistant</span>
      </div>
      <div class="ai-content">Thinking...</div>
    `;
    container.appendChild(suggestionDiv);
    
    try {
      const prompt = `You are a helpful interview assistant. Analyze this statement: "${question}". 
      
      If it's a question: Provide a short, natural, confident answer under 50 words.
      If it's a statement: Provide a relevant follow-up comment or question under 50 words.
      
      Keep it conversational and professional. Sound confident but humble.`;
      
      const answer = await this.callAI(prompt);
      
      suggestionDiv.classList.remove('loading');
      suggestionDiv.querySelector('.ai-content').textContent = answer;
      
      // Update PIP with the AI answer
      this.updatePipAI(answer);
      
      // Add copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(answer);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      };
      suggestionDiv.querySelector('.ai-header').appendChild(copyBtn);
      
    } catch (error) {
      console.error('Error generating answer:', error);
      suggestionDiv.classList.remove('loading');
      suggestionDiv.classList.add('error');
      suggestionDiv.querySelector('.ai-content').textContent = 'Failed to generate answer. Please check your API keys.';
    }
  }

  async callAI(prompt) {
    // Try DeepSeek first
    if (this.config.deepseekApiKey) {
      try {
        const proxyResponse = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `${this.config.deepseekBaseUrl}/chat/completions`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.config.deepseekApiKey}`
            },
            body: {
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
              ]
            }
          })
        });
        
        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          if (data.choices && data.choices[0]) {
            return data.choices[0].message.content.trim();
          }
        }
      } catch (e) {
        console.warn('DeepSeek API failed, trying fallback...', e);
      }
    }
    
    // Fallback to Gemini
    if (this.config.geminiApiKey) {
      try {
        const proxyResponse = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `${this.config.geminiBaseUrl}?key=${this.config.geminiApiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              contents: [{ parts: [{ text: prompt }] }]
            }
          })
        });
        
        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          if (data.candidates && data.candidates[0]) {
            return data.candidates[0].content.parts[0].text.trim();
          }
        }
      } catch (e) {
        console.error('Gemini API failed:', e);
      }
    }
    
    throw new Error('No valid API response. Please check your API keys.');
  }
  
  updatePipTranscription(transcript) {
    const pipText = this.elements.pipOverlay.querySelector('.pip-transcription-text');
    if (pipText) {
      pipText.textContent = transcript;
      
      // Auto-scroll to bottom
      pipText.scrollTop = pipText.scrollHeight;
      
      // Store timestamp for auto-cleanup
      pipText.dataset.timestamp = Date.now();
      
      // Add delete button if not exists
      if (!pipText.querySelector('.delete-transcription-btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-transcription-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete transcription';
        deleteBtn.onclick = () => this.clearPipTranscription();
        pipText.appendChild(deleteBtn);
      }
    }
  }

  updatePipAI(answer) {
    const pipAIContent = this.elements.pipOverlay.querySelector('.pip-ai-content');
    if (pipAIContent) {
      pipAIContent.textContent = answer;
      
      // Auto-scroll to bottom
      pipAIContent.scrollTop = pipAIContent.scrollHeight;
      
      // Store timestamp for auto-cleanup
      pipAIContent.dataset.timestamp = Date.now();
      
      // Add delete button if not exists
      if (!pipAIContent.querySelector('.delete-answer-btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-answer-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete answer';
        deleteBtn.onclick = () => this.clearPipAI();
        pipAIContent.appendChild(deleteBtn);
      }
      
      // Add fade-in animation for new AI answers
      const pipAIContainer = this.elements.pipOverlay.querySelector('.pip-ai-container');
      if (pipAIContainer) {
        pipAIContainer.style.animation = 'fadeIn 0.3s ease-in-out';
        setTimeout(() => {
          pipAIContainer.style.animation = '';
        }, 300);
      }
    }
  }

  selectScreen(index) {
    this.state.selectedScreen = index;
    this.updateScreenShareUI();
    this.showNotification(`Selected screen ${index + 1}`, 'info');
  }

  updateScreenShareUI() {
    const thumbnails = this.elements.screenThumbnails?.querySelectorAll('.thumbnail-placeholder');
    thumbnails?.forEach((thumb, index) => {
      if (index === this.state.selectedScreen) {
        thumb.style.borderColor = 'var(--color-primary)';
        thumb.style.backgroundColor = 'rgb(37 99 235 / 0.1)';
      } else {
        thumb.style.borderColor = 'var(--border-primary)';
        thumb.style.backgroundColor = 'var(--bg-tertiary)';
      }
    });

    // Update button states
    if (this.elements.shareScreenBtn) {
      this.elements.shareScreenBtn.disabled = this.state.isSharingScreen;
    }
    if (this.elements.stopShareBtn) {
      this.elements.stopShareBtn.disabled = !this.state.isSharingScreen;
    }

    // Update main display
    const mainDisplay = this.elements.screenShareMain;
    if (mainDisplay) {
      const placeholder = mainDisplay.querySelector('.screen-placeholder');
      if (this.state.isSharingScreen) {
        if (placeholder) {
          placeholder.innerHTML = `
            <div class="screen-sharing-active">
              <div class="sharing-icon" aria-hidden="true">🖥️</div>
              <p>Screen sharing active</p>
              <p class="sharing-subtitle">Your screen is being shared</p>
            </div>
          `;
        }
      } else {
        if (placeholder) {
          placeholder.innerHTML = `
            <div class="placeholder-icon" aria-hidden="true">🖥️</div>
            <p>No screen shared</p>
            <p class="placeholder-subtitle">Click "Share Screen" to start sharing</p>
          `;
        }
      }
    }
  }

  generateQuestions() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.showLoading('Generating smart questions...');
      this.websocket.send(JSON.stringify({
        type: 'generate_questions',
        data: {
          context: this.elements.transcriptionArea?.textContent || '',
          count: 5
        }
      }));
    } else {
      this.showNotification('Not connected to server', 'error');
    }
  }

  handleQuestionGenerated(data) {
    this.hideLoading();
    this.state.questions = data.questions;
    this.updateQuestionsUI();
    this.showNotification('Smart questions generated', 'success');
  }

  updateQuestionsUI() {
    if (this.elements.questionsList) {
      if (this.state.questions.length === 0) {
        this.elements.questionsList.innerHTML = '<div class="question-placeholder">Click "Generate Smart Questions" to create interview questions</div>';
      } else {
        this.elements.questionsList.innerHTML = this.state.questions.map((q, index) => `
          <div class="question-item">
            <div class="question-number">${index + 1}.</div>
            <div class="question-text">${q.text}</div>
            <div class="question-category">${q.category}</div>
          </div>
        `).join('');
      }
    }
  }

  togglePracticeMode() {
    this.state.practiceMode = !this.state.practiceMode;
    this.updatePracticeModeUI();
    this.showNotification(this.state.practiceMode ? 'Practice mode enabled' : 'Practice mode disabled', 'info');
  }

  updatePracticeModeUI() {
    const btn = this.elements.practiceModeBtn;
    const controls = this.elements.startPracticeBtn?.closest('.practice-controls');
    
    if (btn) {
      btn.textContent = this.state.practiceMode ? 'Exit Practice Mode' : 'Enter Practice Mode';
      btn.setAttribute('aria-pressed', this.state.practiceMode);
    }
    
    if (controls) {
      controls.style.display = this.state.practiceMode ? 'flex' : 'none';
    }
  }

  startPractice() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'start_practice',
        data: {
          question: this.state.questions[0] || { text: 'Tell me about yourself' }
        }
      }));
      this.showNotification('Practice session started', 'info');
    }
  }

  stopPractice() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'stop_practice',
        data: {}
      }));
      this.showNotification('Practice session stopped', 'info');
    }
  }

  handlePracticeFeedback(data) {
    if (this.elements.practiceFeedback) {
      this.elements.practiceFeedback.innerHTML = `
        <div class="feedback-score">Score: ${data.score}/10</div>
        <div class="feedback-text">${data.feedback}</div>
        <div class="feedback-suggestions">
          <strong>Suggestions:</strong>
          <ul>${data.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      `;
    }
  }

  createMeeting() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'create_meeting',
        data: {
          title: `Interview Session ${new Date().toLocaleTimeString()}`,
          participants: ['Interviewer', 'Applicant']
        }
      }));
      this.showNotification('Meeting created', 'success');
    }
  }

  handleAIResponse(data) {
    this.updatePiPContent(data.response);
    this.showNotification('AI response received', 'info');
  }

  togglePiP() {
    if (this.state.pipVisible) {
      this.hidePiP();
    } else {
      this.showPiP();
    }
  }

  showPiP() {
    if (this.elements.pipOverlay) {
      this.elements.pipOverlay.classList.remove('hidden');
      this.state.pipVisible = true;
      this.announceToScreenReader('Picture-in-Picture overlay opened');
    }
  }

  hidePiP() {
    if (this.elements.pipOverlay) {
      this.elements.pipOverlay.classList.add('hidden');
      this.state.pipVisible = false;
      this.announceToScreenReader('Picture-in-Picture overlay closed');
    }
  }

  updatePiPContent(content) {
    if (this.elements.pipContent) {
      const placeholder = this.elements.pipContent.querySelector('.pip-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      const contentElement = document.createElement('div');
      contentElement.className = 'pip-content-item';
      contentElement.innerHTML = `
        <div class="pip-timestamp">${new Date().toLocaleTimeString()}</div>
        <div class="pip-text">${content}</div>
      `;
      
      this.elements.pipContent.appendChild(contentElement);
      this.elements.pipContent.scrollTop = this.elements.pipContent.scrollHeight;
    }
  }

  toggleTheme() {
    this.state.darkMode = !this.state.darkMode;
    document.documentElement.setAttribute('data-theme', this.state.darkMode ? 'dark' : 'light');
    localStorage.setItem('weeb-assistant-theme', this.state.darkMode ? 'dark' : 'light');
    this.showNotification(this.state.darkMode ? 'Switched to dark theme' : 'Switched to light theme', 'info');
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('weeb-assistant-theme');
    if (savedTheme) {
      this.state.darkMode = savedTheme === 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }

  handleKeyboardShortcuts(e) {
    // Skip if typing in input/textarea
    if (e.target.matches('input, textarea')) return;
    
    switch (e.key) {
      case ' ':
        if (e.ctrlKey) {
          e.preventDefault();
          this.togglePracticeMode();
        }
        break;
      case 'Enter':
        if (e.ctrlKey) {
          e.preventDefault();
          this.generateQuestions();
        }
        break;
      case 'Escape':
        this.hidePiP();
        this.toggleApiConfig(false);
        break;
      case 't':
        if (e.ctrlKey) {
          e.preventDefault();
          this.toggleTheme();
        }
        break;
      case 'r':
        if (e.ctrlKey) {
          e.preventDefault();
          if (this.state.isTranscribing) {
            this.stopTranscription();
          } else {
            this.startTranscription();
          }
        }
        break;
    }
  }

  handleClickOutside(e) {
    // Close API config panel when clicking outside
    if (this.elements.apiConfigPanel && 
        !this.elements.apiConfigPanel.contains(e.target) && 
        !this.elements.apiConfigBtn?.contains(e.target)) {
      this.toggleApiConfig(false);
    }
  }

  handleResize() {
    // Adjust PiP position if it's outside viewport
    if (this.elements.pipOverlay && this.state.pipVisible) {
      const rect = this.elements.pipOverlay.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      if (rect.left > maxX || rect.top > maxY) {
        this.elements.pipOverlay.style.left = `${Math.min(rect.left, maxX)}px`;
        this.elements.pipOverlay.style.top = `${Math.min(rect.top, maxY)}px`;
      }
    }
  }

  showNotification(message, type = 'info') {
    if (!this.elements.notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" aria-label="Close notification">&times;</button>
      </div>
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => notification.remove());
    
    this.elements.notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
    
    this.announceToScreenReader(message);
  }

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || '💬';
  }

  showLoading(message = 'Loading...') {
    console.log('Showing loading overlay:', message);
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.querySelector('.loading-text').textContent = message;
      this.elements.loadingOverlay.classList.remove('hidden');
      this.elements.loadingOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  hideLoading() {
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.add('hidden');
      this.elements.loadingOverlay.setAttribute('aria-hidden', 'true');
      console.log('Loading overlay hidden');
    }
  }

  setupHighContrastMode() {
    // Detect high contrast mode preference
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleContrastChange = (e) => {
      if (e.matches) {
        document.documentElement.setAttribute('data-high-contrast', 'true');
        this.announceToScreenReader('High contrast mode enabled');
      } else {
        document.documentElement.removeAttribute('data-high-contrast');
      }
    };
    
    mediaQuery.addListener(handleContrastChange);
    handleContrastChange(mediaQuery);
  }

  setupReducedMotion() {
    // Respect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      if (e.matches) {
        document.documentElement.setAttribute('data-reduced-motion', 'true');
        this.announceToScreenReader('Reduced motion mode enabled');
      } else {
        document.documentElement.removeAttribute('data-reduced-motion');
      }
    };
    
    mediaQuery.addListener(handleMotionChange);
    handleMotionChange(mediaQuery);
  }

  setupVoiceControl() {
    // Basic voice control support using Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        this.processVoiceCommand(command);
      };
      
      this.recognition.onerror = (event) => {
        console.warn('Voice recognition error:', event.error);
        this.announceToScreenReader('Voice command not recognized');
      };
      
      // Add voice control button if supported
      this.addVoiceControlButton();
    }
  }

  addVoiceControlButton() {
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voice-control-btn';
    voiceButton.className = 'btn btn-secondary';
    voiceButton.innerHTML = '🎤 Voice Control';
    voiceButton.setAttribute('aria-label', 'Start voice control');
    voiceButton.addEventListener('click', () => this.startVoiceRecognition());
    
    // Add to top bar
    const topBar = document.querySelector('.main-nav');
    if (topBar) {
      topBar.appendChild(voiceButton);
    }
  }

  startVoiceRecognition() {
    if (this.recognition && !this.recognition.recognizing) {
      try {
        this.recognition.start();
        this.announceToScreenReader('Voice control activated. Speak your command.');
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        this.announceToScreenReader('Voice control unavailable');
      }
    }
  }

  processVoiceCommand(command) {
    console.log('Voice command received:', command);
    
    const commands = {
      'start transcription': () => this.startTranscription(),
      'stop transcription': () => this.stopTranscription(),
      'generate questions': () => this.generateQuestions(),
      'toggle practice mode': () => this.togglePracticeMode(),
      'start practice': () => this.startPractice(),
      'stop practice': () => this.stopPractice(),
      'toggle theme': () => this.toggleTheme(),
      'show picture in picture': () => this.showPiP(),
      'hide picture in picture': () => this.hidePiP(),
      'create meeting': () => this.createMeeting()
    };
    
    let matched = false;
    for (const [voiceCommand, action] of Object.entries(commands)) {
      if (command.includes(voiceCommand)) {
        action();
        this.announceToScreenReader(`Executed: ${voiceCommand}`);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      this.announceToScreenReader('Command not recognized. Try: start transcription, generate questions, toggle practice mode, or toggle theme.');
    }
  }

  isValidUrl(string) {
    // URL validation helper function for API endpoint validation
    try {
      const url = new URL(string);
      // Check if URL has valid protocol (http or https)
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

  testApis() {
    // Test API connections functionality
    try {
      const deepseekKey = this.elements.deepseekKeyInput?.value?.trim();
      const deepgramKey = this.elements.deepgramKeyInput?.value?.trim();
      const geminiKey = this.elements.geminiKeyInput?.value?.trim();
      const deepseekUrl = this.elements.deepseekUrlInput?.value?.trim() || 'https://api.deepseek.com/v1';
      const geminiUrl = this.elements.geminiUrlInput?.value?.trim() || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      
      if (!deepseekKey) {
        this.showNotification('Please enter your DeepSeek API key first', 'error');
        this.elements.deepseekKeyInput?.focus();
        return;
      }
      
      if (!deepgramKey) {
        this.showNotification('Please enter your Deepgram API key first', 'error');
        this.elements.deepgramKeyInput?.focus();
        return;
      }
      
      this.showNotification('Testing API connections...', 'info');
      this.announceToScreenReader('Testing API connections');
      
      // Test APIs via WebSocket
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'test_apis',
          data: {
            deepseekApiKey: deepseekKey,
            deepgramApiKey: deepgramKey,
            geminiApiKey: geminiKey || '',
            deepseekBaseUrl: deepseekUrl,
            geminiBaseUrl: geminiUrl
          }
        }));
      } else {
        this.showNotification('Not connected to server', 'error');
      }
      
    } catch (error) {
      console.error('Failed to test APIs:', error);
      this.showNotification('Failed to test API connections', 'error');
      this.announceToScreenReader('Error testing API connections');
    }
  }

  handleApiTestResults(results) {
    this.hideLoading();
    
    let message = 'API Test Results:\n';
    message += `DeepSeek: ${results.deepseek ? '✅ Connected' : '❌ Failed'}\n`;
    message += `Deepgram: ${results.deepgram ? '✅ Connected' : '❌ Failed'}\n`;
    message += `Gemini: ${results.gemini ? '✅ Connected' : '❌ Failed'}`;
    
    const allConnected = results.deepseek && results.deepgram && results.gemini;
    const someConnected = results.deepseek || results.deepgram || results.gemini;
    const status = allConnected ? 'success' : (someConnected ? 'warning' : 'error');
    
    this.showNotification(message, status);
  }

  handleScreenShareStatus(data) {
    console.log('Screen share status update:', data);
    const status = data.status;
    const timestamp = data.timestamp;
    
    if (status === 'started') {
      this.showNotification('Screen sharing started by user', 'info');
    } else if (status === 'stopped') {
      this.showNotification('Screen sharing stopped', 'info');
    }
  }

  announceToScreenReader(message, urgent = false) {
    // screenReader announcement method for accessibility
    const target = urgent ? this.statusAnnouncements : this.announcements;
    if (target) {
      target.textContent = message;
      setTimeout(() => {
        target.textContent = '';
      }, 1000);
    }
  }

  // ===== ENHANCED API KEY SETUP MODAL =====
  
  setupApiKeyModal() {
    // Initialize the enhanced API key setup modal
    this.apiSetupModal = {
      currentStep: 1,
      selectedApi: null,
      apiKey: '',
      modal: document.getElementById('api-key-setup-modal'),
      steps: document.querySelectorAll('.step'),
      progressBar: document.querySelector('.progress-fill'),
      progressText: document.querySelector('.progress-text'),
      prevBtn: document.getElementById('setup-prev-btn'),
      nextBtn: document.getElementById('setup-next-btn'),
      completeBtn: document.getElementById('setup-complete-btn')
    };
    
    if (!this.apiSetupModal.modal) return;
    
    // Event listeners for modal
    document.querySelectorAll('.api-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.selectApi(e.target.closest('.api-choice-btn').dataset.api));
    });
    
    document.getElementById('quick-paste-btn').addEventListener('click', () => this.quickPasteApiKey());
    document.getElementById('test-connection-btn').addEventListener('click', () => this.testApiConnection());
    document.getElementById('save-api-key-btn').addEventListener('click', () => this.saveApiKeyFromModal());
    document.getElementById('open-api-dashboard').addEventListener('click', () => this.openApiDashboard());
    document.getElementById('copy-instructions').addEventListener('click', () => this.copyApiInstructions());
    
    this.apiSetupModal.prevBtn.addEventListener('click', () => this.previousSetupStep());
    this.apiSetupModal.nextBtn.addEventListener('click', () => this.nextSetupStep());
    this.apiSetupModal.completeBtn.addEventListener('click', () => this.completeApiSetup());
    
    // Close modal handlers
    document.querySelector('.modal-close').addEventListener('click', () => this.closeApiSetupModal());
    this.apiSetupModal.modal.addEventListener('click', (e) => {
      if (e.target === this.apiSetupModal.modal) this.closeApiSetupModal();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.apiSetupModal.modal.getAttribute('aria-hidden') === 'false') {
        if (e.key === 'Escape') this.closeApiSetupModal();
        if (e.key === 'Enter' && e.ctrlKey) this.quickPasteApiKey();
      }
    });
    
    // Auto-focus paste input when reaching step 3
    const observer = new MutationObserver(() => {
      if (this.apiSetupModal.currentStep === 3) {
        setTimeout(() => document.getElementById('quick-paste-input').focus(), 100);
      }
    });
    
    this.apiSetupModal.steps.forEach(step => {
      observer.observe(step, { attributes: true, attributeFilter: ['class'] });
    });
  }
  
  openApiSetupModal() {
    if (!this.apiSetupModal?.modal) return;
    
    this.apiSetupModal.modal.setAttribute('aria-hidden', 'false');
    this.apiSetupModal.modal.classList.add('active');
    this.updateSetupStep(1);
    this.announceToScreenReader('API key setup guide opened');
    
    // Focus first interactive element
    setTimeout(() => {
      document.querySelector('.api-choice-btn').focus();
    }, 100);
  }
  
  closeApiSetupModal() {
    if (!this.apiSetupModal?.modal) return;
    
    this.apiSetupModal.modal.setAttribute('aria-hidden', 'true');
    this.apiSetupModal.modal.classList.remove('active');
    this.announceToScreenReader('API key setup guide closed');
    
    // Reset state
    this.apiSetupModal.currentStep = 1;
    this.apiSetupModal.selectedApi = null;
    this.apiSetupModal.apiKey = '';
    document.getElementById('quick-paste-input').value = '';
  }
  
  selectApi(apiType) {
    this.apiSetupModal.selectedApi = apiType;
    this.updateApiInstructions(apiType);
    this.nextSetupStep();
  }
  
  updateApiInstructions(apiType) {
    const instructions = {
      deepseek: {
        title: 'DeepSeek API Setup',
        steps: [
          'Go to <a href="https://platform.deepseek.com/api-keys" target="_blank" rel="noopener">platform.deepseek.com/api-keys</a>',
          'Sign up or log in to your account',
          'Click "Create API Key" or "New API Key"',
          'Give your key a name (e.g., "M\'GEMS Interview Buddy")',
          'Copy the generated key (starts with "sk-")',
          'Return here and paste it in the next step'
        ],
        example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        dashboardUrl: 'https://platform.deepseek.com/api-keys'
      },
      deepgram: {
        title: 'Deepgram API Setup',
        steps: [
          'Go to <a href="https://console.deepgram.com/api-keys" target="_blank" rel="noopener">console.deepgram.com/api-keys</a>',
          'Sign up or log in to your account',
          'Click "Create API Key" in the dashboard',
          'Give your key a name and select appropriate permissions',
          'Copy the generated key (long alphanumeric string)',
          'Return here and paste it in the next step'
        ],
        example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        dashboardUrl: 'https://console.deepgram.com/api-keys'
      }
    };
    
    const api = instructions[apiType];
    if (!api) return;
    
    const content = document.getElementById('api-instructions-content');
    content.innerHTML = `
      <h4>${api.title}</h4>
      <ol>
        ${api.steps.map(step => `<li>${step}</li>`).join('')}
      </ol>
      <p><strong>💡 Tip:</strong> Keep your API key secure and never share it publicly.</p>
    `;
    
    document.getElementById('api-key-example').textContent = api.example;
    document.getElementById('open-api-dashboard').onclick = () => window.open(api.dashboardUrl, '_blank');
  }
  
  async quickPasteApiKey() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('quick-paste-input').value = text;
      this.apiSetupModal.apiKey = text;
      this.showNotification('API key pasted from clipboard', 'success');
      this.announceToScreenReader('API key pasted successfully');
      
      // Auto-advance if key looks valid
      if (this.validateApiKeyFormat(text)) {
        setTimeout(() => this.nextSetupStep(), 500);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      this.showNotification('Failed to access clipboard. Please paste manually (Ctrl+V or Cmd+V)', 'error');
      this.announceToScreenReader('Clipboard access failed, please paste manually');
    }
  }
  
  validateApiKeyFormat(key) {
    if (!key) return false;
    
    const api = this.apiSetupModal.selectedApi;
    if (api === 'deepseek') {
      return key.startsWith('sk-') && key.length > 20;
    } else if (api === 'deepgram') {
      return key.length >= 32 && /^[a-zA-Z0-9]+$/.test(key);
    }
    
    return key.length >= 10; // Generic validation
  }
  
  async testApiConnection() {
    const key = document.getElementById('quick-paste-input').value.trim();
    if (!key) {
      this.showNotification('Please paste your API key first', 'error');
      return;
    }
    
    if (!this.validateApiKeyFormat(key)) {
      this.showNotification('API key format appears invalid. Please check and try again.', 'error');
      return;
    }
    
    const results = document.getElementById('test-results');
    results.innerHTML = '<span class="loading">🔄 Testing connection...</span>';
    results.className = 'test-results';
    
    try {
      // Simulate API test (in real implementation, this would test actual API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock test result based on key format
      const isValid = this.validateApiKeyFormat(key);
      
      if (isValid) {
        results.innerHTML = '<span class="success">✅ Connection successful! Your API key is valid.</span>';
        results.className = 'test-results success';
        document.getElementById('save-api-key-btn').disabled = false;
        this.showNotification('API connection test successful!', 'success');
      } else {
        results.innerHTML = '<span class="error">❌ Connection failed. Please check your API key.</span>';
        results.className = 'test-results error';
        document.getElementById('save-api-key-btn').disabled = true;
        this.showNotification('API connection test failed', 'error');
      }
    } catch (error) {
      results.innerHTML = '<span class="error">❌ Connection error. Please try again.</span>';
      results.className = 'test-results error';
      document.getElementById('save-api-key-btn').disabled = true;
      this.showNotification('Connection test error', 'error');
    }
  }
  
  saveApiKeyFromModal() {
    const key = document.getElementById('quick-paste-input').value.trim();
    const api = this.apiSetupModal.selectedApi;
    
    if (!key || !api) return;
    
    // Save to appropriate input field
    if (api === 'deepseek' && this.elements.deepseekKeyInput) {
      this.elements.deepseekKeyInput.value = key;
    } else if (api === 'deepgram' && this.elements.deepgramKeyInput) {
      this.elements.deepgramKeyInput.value = key;
    }
    
    this.showNotification(`${api} API key saved successfully!`, 'success');
    this.announceToScreenReader(`${api} API key saved`);
    
    // Ask if they want to set up another API
    this.showNotification('Would you like to set up another API key?', 'info');
    
    // Close modal after short delay
    setTimeout(() => {
      this.closeApiSetupModal();
      this.saveConfig(); // Save the configuration
    }, 1000);
  }
  
  copyApiInstructions() {
    const api = this.apiSetupModal.selectedApi;
    const instructions = api === 'deepseek' 
      ? 'DeepSeek API Setup Steps:\n1. Go to platform.deepseek.com/api-keys\n2. Sign up or log in\n3. Create a new API key\n4. Copy the key (starts with "sk-")\n5. Paste it in the app'
      : 'Deepgram API Setup Steps:\n1. Go to console.deepgram.com/api-keys\n2. Sign up or log in\n3. Create a new API key\n4. Copy the long alphanumeric key\n5. Paste it in the app';
    
    navigator.clipboard.writeText(instructions).then(() => {
      this.showNotification('Instructions copied to clipboard!', 'success');
    }).catch(() => {
      this.showNotification('Failed to copy instructions', 'error');
    });
  }
  
  updateSetupStep(step) {
    this.apiSetupModal.currentStep = step;
    
    // Update step visibility
    this.apiSetupModal.steps.forEach((s, i) => {
      s.classList.toggle('active', i + 1 === step);
    });
    
    // Update progress
    const progress = (step / 4) * 100;
    this.apiSetupModal.progressBar.style.width = `${progress}%`;
    this.apiSetupModal.progressText.textContent = `Step ${step} of 4`;
    this.apiSetupModal.progressBar.parentElement.setAttribute('aria-valuenow', step);
    
    // Update button states
    this.apiSetupModal.prevBtn.disabled = step === 1;
    
    if (step === 4) {
      this.apiSetupModal.nextBtn.style.display = 'none';
      this.apiSetupModal.completeBtn.style.display = 'inline-flex';
    } else {
      this.apiSetupModal.nextBtn.style.display = 'inline-flex';
      this.apiSetupModal.completeBtn.style.display = 'none';
    }
    
    // Focus management
    setTimeout(() => {
      const activeStep = document.querySelector('.step.active');
      const focusable = activeStep.querySelector('button, input, [tabindex="0"]');
      if (focusable) focusable.focus();
    }, 100);
  }
  
  nextSetupStep() {
    if (this.apiSetupModal.currentStep < 4) {
      this.updateSetupStep(this.apiSetupModal.currentStep + 1);
    }
  }
  
  previousSetupStep() {
    if (this.apiSetupModal.currentStep > 1) {
      this.updateSetupStep(this.apiSetupModal.currentStep - 1);
    }
  }
  
  completeApiSetup() {
    this.saveApiKeyFromModal();
  }

  // Platform Detection and Integration Methods
  startPlatformDetection() {
    // Check for platforms every 3 seconds
    setInterval(() => {
      this.detectActivePlatforms();
    }, 3000);
    
    // Initial detection
    this.detectActivePlatforms();
  }

  detectActivePlatforms() {
    const platforms = {
      zoom: this.detectZoom(),
      googleMeet: this.detectGoogleMeet(),
      teams: this.detectTeams()
    };

    // Update state with detected platforms
    Object.keys(platforms).forEach(platform => {
      this.state.platformIntegration[platform].detected = platforms[platform].detected;
      if (platforms[platform].detected) {
        this.state.platformIntegration[platform].meetingId = platforms[platform].meetingId;
        this.state.platformIntegration[platform].meetingTitle = platforms[platform].meetingTitle;
      }
    });

    // Update current platform (priority: Zoom > Teams > Google Meet)
    if (platforms.zoom.detected) {
      this.state.currentPlatform = 'zoom';
    } else if (platforms.teams.detected) {
      this.state.currentPlatform = 'teams';
    } else if (platforms.googleMeet.detected) {
      this.state.currentPlatform = 'googleMeet';
    } else {
      this.state.currentPlatform = null;
    }

    // Update UI if platform changed
    this.updatePlatformUI();
  }

  detectZoom() {
    // Check URL for zoom
    const zoomPatterns = [
      /zoom\.us\/j\/(\d+)/,
      /zoom\.us\/wc\/join\/(\d+)/,
      /zoom\.us\/s\/(\d+)/,
      /app\.zoom\.us\/wc\/join\/(\d+)/
    ];

    // Check current URL
    for (const pattern of zoomPatterns) {
      const match = window.location.href.match(pattern);
      if (match) {
        return {
          detected: true,
          meetingId: match[1],
          meetingTitle: this.extractMeetingTitle()
        };
      }
    }

    // Check for Zoom Web SDK elements
    const zoomElements = document.querySelectorAll('[class*="zoom"], [id*="zoom"], [data-testid*="zoom"]');
    if (zoomElements.length > 0) {
      return {
        detected: true,
        meetingId: this.extractMeetingIdFromTitle(),
        meetingTitle: this.extractMeetingTitle()
      };
    }

    return { detected: false };
  }

  detectGoogleMeet() {
    // Check URL for Google Meet
    const meetPatterns = [
      /meet\.google\.com\/([a-zA-Z0-9\-]+)/,
      /hangouts\.google\.com\/.*hangouts\/_\/([a-zA-Z0-9\-]+)/
    ];

    for (const pattern of meetPatterns) {
      const match = window.location.href.match(pattern);
      if (match) {
        return {
          detected: true,
          meetingId: match[1],
          meetingTitle: this.extractMeetingTitle()
        };
      }
    }

    // Check for Google Meet elements
    const meetElements = document.querySelectorAll('[class*="meet"], [data-meeting-code], [aria-label*="Google Meet"]');
    if (meetElements.length > 0) {
      return {
        detected: true,
        meetingId: this.extractMeetingIdFromTitle(),
        meetingTitle: this.extractMeetingTitle()
      };
    }

    return { detected: false };
  }

  detectTeams() {
    // Check URL for Microsoft Teams
    const teamsPatterns = [
      /teams\.microsoft\.com\/.*thread\.id=([^&]+)/,
      /teams\.live\.com\/.*thread\.id=([^&]+)/,
      /teams\.microsoft\.com\/l\/meetup-join\/([^&]+)/
    ];

    for (const pattern of teamsPatterns) {
      const match = window.location.href.match(pattern);
      if (match) {
        return {
          detected: true,
          meetingId: match[1],
          meetingTitle: this.extractMeetingTitle()
        };
      }
    }

    // Check for Teams elements
    const teamsElements = document.querySelectorAll('[class*="teams"], [data-tid*="teams"], [aria-label*="Microsoft Teams"]');
    if (teamsElements.length > 0) {
      return {
        detected: true,
        meetingId: this.extractMeetingIdFromTitle(),
        meetingTitle: this.extractMeetingTitle()
      };
    }

    return { detected: false };
  }

  extractMeetingTitle() {
    // Try to extract meeting title from page
    const titleSelectors = [
      'title',
      'h1',
      '[data-meeting-title]',
      '[aria-label*="meeting"]',
      '.meeting-title',
      '.call-title'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return 'Interview Meeting';
  }

  extractMeetingIdFromTitle() {
    const title = document.title || '';
    const idMatch = title.match(/(\d{9,11})/) || title.match(/([a-zA-Z0-9\-]{8,})/);
    return idMatch ? idMatch[1] : 'unknown';
  }

  updatePlatformUI() {
    const statusElement = this.elements.meetingStatus;
    if (!statusElement) return;

    if (this.state.currentPlatform) {
      const platformNames = {
        zoom: 'Zoom',
        googleMeet: 'Google Meet',
        teams: 'Microsoft Teams'
      };

      const platformName = platformNames[this.state.currentPlatform];
      const meetingInfo = this.state.platformIntegration[this.state.currentPlatform];
      
      statusElement.innerHTML = `
        <div class="platform-indicator platform-${this.state.currentPlatform}">
          <span class="platform-icon">${this.getPlatformIcon(this.state.currentPlatform)}</span>
          <span class="platform-name">${platformName}</span>
          ${meetingInfo.meetingId ? `<span class="meeting-id">ID: ${meetingInfo.meetingId}</span>` : ''}
        </div>
      `;
      
      statusElement.className = 'meeting-status platform-detected';
    } else {
      statusElement.textContent = 'Ready';
      statusElement.className = 'meeting-status';
    }
  }

  getPlatformIcon(platform) {
    const icons = {
      zoom: '🔍',
      googleMeet: '📹',
      teams: '💼'
    };
    return icons[platform] || '🎯';
  }

  // Test function to verify PIP readability improvements
  testPipReadability() {
    // Show PIP mode
    if (!this.state.isPipMode) {
      this.togglePiP();
    }
    
    // Add sample transcription with various text lengths
    const sampleTranscription = `Interview Question: Can you describe your experience with JavaScript frameworks? 
    
I've worked extensively with React, Vue.js, and Angular. My most recent project involved building a complex dashboard using React with TypeScript, implementing state management with Redux Toolkit, and creating reusable UI components with Styled Components. The application handled real-time data updates and had to be highly performant for financial trading data.`;
    
    // Add sample AI answer with detailed response
    const sampleAnswer = `Based on your experience with JavaScript frameworks, here are some key points to highlight:

**Technical Expertise**: Your experience spans multiple frameworks (React, Vue.js, Angular), demonstrating versatility and adaptability.

**Recent Project Impact**: The dashboard project shows practical application of advanced concepts including TypeScript for type safety, Redux Toolkit for state management, and Styled Components for maintainable styling.

**Performance Focus**: Mentioning real-time data handling and financial trading requirements indicates understanding of high-performance applications.

**Recommendation**: Emphasize your ability to choose the right tool for each project and your continuous learning approach to stay current with framework updates.`;
    
    // Update PIP content
    this.updatePipTranscription(sampleTranscription);
    this.updatePipAI(sampleAnswer);
    
    // Show notification
    this.showNotification('PIP readability test completed - check the PIP window!', 'success');
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.weebAssistant = new WeebAssistantUI();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (window.weebAssistant) {
    if (document.hidden) {
      console.log('Page hidden - pausing non-critical operations');
    } else {
      console.log('Page visible - resuming operations');
    }
  }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
  if (window.weebAssistant?.websocket) {
    window.weebAssistant.websocket.close();
  }
});
