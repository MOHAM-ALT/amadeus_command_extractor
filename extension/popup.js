/**
 * Popup Script - منطق واجهة المستخدم
 * يدير التفاعل مع واجهة Extension والتواصل مع content script
 */

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.extractionStatus = 'idle';
    this.isConnected = false;
    this.settings = this.getDefaultSettings();
    this.progressInterval = null;
    
    // Elements
    this.elements = {};
    
    // State
    this.state = {
      isInitialized: false,
      extractionRunning: false,
      hasResults: false,
      lastUpdate: null
    };
  }

  /**
   * تهيئة Popup
   */
  async initialize() {
    try {
      console.log('🚀 تهيئة Popup Manager...');
      
      // ربط العناصر
      this.bindElements();
      
      // إعداد المستمعين
      this.setupEventListeners();
      
      // تحميل الإعدادات
      await this.loadSettings();
      
      // الحصول على التبويب الحالي
      await this.getCurrentTab();
      
      // فحص حالة النظام
      await this.checkStatus();
      
      // تحديث الواجهة
      this.updateUI();
      
      this.state.isInitialized = true;
      console.log('✅ تم تهيئة Popup Manager بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة Popup:', error);
      this.showNotification('خطأ في تهيئة الواجهة', 'error');
    }
  }

  /**
   * ربط العناصر بالمتغيرات
   */
  bindElements() {
    const elementIds = [
      'status-icon', 'status-text', 'session-status', 'commands-count',
      'progress-section', 'progress-percentage', 'progress-bar', 'current-command',
      'processed-count', 'total-count', 'stats-section', 'success-count',
      'failed-count', 'success-rate', 'estimated-time', 'export-section',
      'start-btn', 'pause-btn', 'stop-btn', 'test-btn', 'settings-btn',
      'export-markdown', 'export-json', 'export-csv', 'settings-panel',
      'batch-size', 'batch-size-value', 'command-delay', 'command-delay-value',
      'batch-delay', 'batch-delay-value', 'max-retries', 'max-retries-value',
      'skip-errors', 'save-partial', 'notification', 'notification-icon',
      'notification-text', 'loading-overlay'
    ];

    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // أزرار التحكم الرئيسية
    this.elements['start-btn']?.addEventListener('click', () => this.startExtraction());
    this.elements['pause-btn']?.addEventListener('click', () => this.pauseExtraction());
    this.elements['stop-btn']?.addEventListener('click', () => this.stopExtraction());
    this.elements['test-btn']?.addEventListener('click', () => this.testConnection());
    
    // أزرار الإعدادات
    this.elements['settings-btn']?.addEventListener('click', () => this.showSettings());
    document.getElementById('close-settings')?.addEventListener('click', () => this.hideSettings());
    document.getElementById('save-settings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('reset-settings')?.addEventListener('click', () => this.resetSettings());
    
    // أزرار التصدير
    this.elements['export-markdown']?.addEventListener('click', () => this.exportResults('markdown'));
    this.elements['export-json']?.addEventListener('click', () => this.exportResults('json'));
    this.elements['export-csv']?.addEventListener('click', () => this.exportResults('csv'));
    
    // روابط المساعدة
    document.getElementById('help-link')?.addEventListener('click', () => this.showHelp());
    document.getElementById('about-link')?.addEventListener('click', () => this.showAbout());
    document.getElementById('github-link')?.addEventListener('click', () => this.openGitHub());
    
    // إعدادات المتغيرات
    this.setupSettingsControls();
    
    // إغلاق الإشعارات
    document.getElementById('notification-close')?.addEventListener('click', () => this.hideNotification());
    
    // مستمع رسائل من content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
    
    // إغلاق الإعدادات عند النقر خارجها
    this.elements['settings-panel']?.addEventListener('click', (e) => {
      if (e.target === this.elements['settings-panel']) {
        this.hideSettings();
      }
    });
  }

  /**
   * إعداد تحكم الإعدادات
   */
  setupSettingsControls() {
    // Sliders
    const sliders = [
      { id: 'batch-size', valueId: 'batch-size-value' },
      { id: 'command-delay', valueId: 'command-delay-value' },
      { id: 'batch-delay', valueId: 'batch-delay-value' },
      { id: 'max-retries', valueId: 'max-retries-value' }
    ];

    sliders.forEach(({ id, valueId }) => {
      const slider = document.getElementById(id);
      const valueDisplay = document.getElementById(valueId);
      
      if (slider && valueDisplay) {
        slider.addEventListener('input', (e) => {
          valueDisplay.textContent = e.target.value;
        });
      }
    });
  }

  /**
   * الحصول على التبويب الحالي
   */
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      // التحقق من أن التبويب هو Amadeus
      if (this.isAmadeusTab(tab)) {
        this.isConnected = true;
        this.updateConnectionStatus(true);
      } else {
        this.isConnected = false;
        this.updateConnectionStatus(false);
      }
      
    } catch (error) {
      console.error('خطأ في الحصول على التبويب الحالي:', error);
      this.isConnected = false;
      this.updateConnectionStatus(false);
    }
  }

  /**
   * التحقق من أن التبويب هو Amadeus
   */
  isAmadeusTab(tab) {
    if (!tab || !tab.url) return false;
    
    const amadeusUrls = [
      'amadeus.com',
      'altea.amadeus.com',
      'uat10.resdesktop.altea.amadeus.com'
    ];
    
    return amadeusUrls.some(url => tab.url.includes(url));
  }

  /**
   * فحص حالة النظام
   */
  async checkStatus() {
    try {
      if (!this.isConnected) {
        this.updateStatus('غير متصل بـ Amadeus', 'error');
        return;
      }

      this.updateStatus('جاري فحص الحالة...', 'info');
      
      const response = await this.sendMessageToContentScript({ action: 'getStatus' });
      
      if (response && response.success) {
        const status = response.status;
        
        this.extractionStatus = status.extractionStatus;
        this.updateStatus('متصل ومتاح', 'success');
        this.updateSessionInfo(status.sessionValid);
        this.updateCommandsCount(status.processorStatus?.totalCommands || 0);
        
        // تحديث الواجهة حسب الحالة
        this.updateUIForStatus(status);
        
      } else {
        this.updateStatus('خطأ في الاتصال', 'error');
      }
      
    } catch (error) {
      console.error('خطأ في فحص الحالة:', error);
      this.updateStatus('خطأ في فحص الحالة', 'error');
    }
  }

  /**
   * تحديث حالة الاتصال
   */
  updateConnectionStatus(connected) {
    this.isConnected = connected;
    
    if (connected) {
      this.elements['status-icon'].textContent = '🟢';
      this.elements['status-text'].textContent = 'متصل';
    } else {
      this.elements['status-icon'].textContent = '🔴';
      this.elements['status-text'].textContent = 'غير متصل';
    }
  }

  /**
   * تحديث نص الحالة
   */
  updateStatus(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    this.elements['status-icon'].textContent = icons[type] || icons.info;
    this.elements['status-text'].textContent = message;
  }

  /**
   * تحديث معلومات الجلسة
   */
  updateSessionInfo(isValid) {
    this.elements['session-status'].textContent = isValid ? 'صالحة' : 'غير صالحة';
    this.elements['session-status'].className = `value ${isValid ? 'text-success' : 'text-error'}`;
  }

  /**
   * تحديث عدد الأوامر
   */
  updateCommandsCount(count) {
    this.elements['commands-count'].textContent = count;
  }

  /**
   * تحديث واجهة المستخدم حسب الحالة
   */
  updateUIForStatus(status) {
    const isRunning = status.extractionStatus === 'running';
    const isPaused = status.extractionStatus === 'paused';
    const isCompleted = status.extractionStatus === 'completed';
    
    // إظهار/إخفاء الأزرار
    this.elements['start-btn'].style.display = (!isRunning && !isPaused) ? 'flex' : 'none';
    this.elements['pause-btn'].style.display = isRunning ? 'flex' : 'none';
    this.elements['stop-btn'].style.display = (isRunning || isPaused) ? 'flex' : 'none';
    
    // إظهار/إخفاء الأقسام
    this.elements['progress-section'].style.display = (isRunning || isPaused) ? 'block' : 'none';
    this.elements['stats-section'].style.display = (isRunning || isPaused || isCompleted) ? 'block' : 'none';
    this.elements['export-section'].style.display = isCompleted ? 'block' : 'none';
    
    // تحديث نص الأزرار
    if (isPaused) {
      this.elements['pause-btn'].querySelector('.btn-text').textContent = 'استكمال';
      this.elements['pause-btn'].querySelector('.btn-icon').textContent = '▶️';
    } else {
      this.elements['pause-btn'].querySelector('.btn-text').textContent = 'إيقاف مؤقت';
      this.elements['pause-btn'].querySelector('.btn-icon').textContent = '⏸️';
    }
  }

  /**
   * تحديث شريط التقدم
   */
  updateProgress(progress) {
    if (!progress) return;
    
    this.elements['progress-percentage'].textContent = `${progress.percentage || 0}%`;
    this.elements['progress-bar'].style.width = `${progress.percentage || 0}%`;
    this.elements['current-command'].textContent = progress.currentCommand || '-';
    this.elements['processed-count'].textContent = progress.current || 0;
    this.elements['total-count'].textContent = progress.total || 0;
    this.elements['success-count'].textContent = progress.successful || 0;
    this.elements['failed-count'].textContent = progress.failed || 0;
    this.elements['success-rate'].textContent = `${progress.successRate || 0}%`;
    
    // تحديث الوقت المتبقي
    if (progress.estimatedTimeRemaining) {
      const minutes = Math.floor(progress.estimatedTimeRemaining / 60000);
      const seconds = Math.floor((progress.estimatedTimeRemaining % 60000) / 1000);
      this.elements['estimated-time'].textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * بدء الاستخراج
   */
  async startExtraction() {
    try {
      if (!this.isConnected) {
        this.showNotification('يجب الاتصال بصفحة Amadeus أولاً', 'error');
        return;
      }

      this.showLoading(true);
      
      const response = await this.sendMessageToContentScript({
        action: 'startExtraction',
        options: this.settings
      });
      
      this.showLoading(false);
      
      if (response && response.success) {
        this.extractionStatus = 'running';
        this.state.extractionRunning = true;
        this.updateUIForStatus({ extractionStatus: 'running' });
        this.showNotification('تم بدء الاستخراج بنجاح', 'success');
        
        // بدء مراقبة التقدم
        this.startProgressMonitoring();
        
      } else {
        this.showNotification(response?.error || 'فشل في بدء الاستخراج', 'error');
      }
      
    } catch (error) {
      this.showLoading(false);
      console.error('خطأ في بدء الاستخراج:', error);
      this.showNotification('خطأ في بدء الاستخراج', 'error');
    }
  }

  /**
   * إيقاف مؤقت للاستخراج
   */
  async pauseExtraction() {
    try {
      const action = this.extractionStatus === 'paused' ? 'resumeExtraction' : 'pauseExtraction';
      
      const response = await this.sendMessageToContentScript({ action });
      
      if (response && response.success) {
        this.extractionStatus = this.extractionStatus === 'paused' ? 'running' : 'paused';
        this.updateUIForStatus({ extractionStatus: this.extractionStatus });
        
        const message = this.extractionStatus === 'paused' ? 'تم إيقاف الاستخراج مؤقتاً' : 'تم استكمال الاستخراج';
        this.showNotification(message, 'info');
        
      } else {
        this.showNotification(response?.error || 'فشل في تغيير حالة الاستخراج', 'error');
      }
      
    } catch (error) {
      console.error('خطأ في إيقاف/استكمال الاستخراج:', error);
      this.showNotification('خطأ في العملية', 'error');
    }
  }

  /**
   * إيقاف الاستخراج نهائياً
   */
  async stopExtraction() {
    try {
      const response = await this.sendMessageToContentScript({ action: 'stopExtraction' });
      
      if (response && response.success) {
        this.extractionStatus = 'idle';
        this.state.extractionRunning = false;
        this.updateUIForStatus({ extractionStatus: 'idle' });
        this.stopProgressMonitoring();
        this.showNotification('تم إيقاف الاستخراج', 'warning');
        
      } else {
        this.showNotification(response?.error || 'فشل في إيقاف الاستخراج', 'error');
      }
      
    } catch (error) {
      console.error('خطأ في إيقاف الاستخراج:', error);
      this.showNotification('خطأ في إيقاف الاستخراج', 'error');
    }
  }

  /**
   * اختبار الاتصال
   */
  async testConnection() {
    try {
      this.showLoading(true);
      
      const response = await this.sendMessageToContentScript({ action: 'testConnection' });
      
      this.showLoading(false);
      
      if (response && response.success) {
        this.showNotification('الاتصال يعمل بشكل صحيح', 'success');
      } else {
        this.showNotification(response?.message || 'فشل اختبار الاتصال', 'error');
      }
      
    } catch (error) {
      this.showLoading(false);
      console.error('خطأ في اختبار الاتصال:', error);
      this.showNotification('خطأ في اختبار الاتصال', 'error');
    }
  }

  /**
   * تصدير النتائج
   */
  async exportResults(format) {
    try {
      this.showLoading(true);
      
      const response = await this.sendMessageToContentScript({
        action: 'exportResults',
        format: format
      });
      
      this.showLoading(false);
      
      if (response && response.success) {
        this.showNotification(`تم تصدير النتائج بصيغة ${format.toUpperCase()}`, 'success');
      } else {
        this.showNotification(response?.error || 'فشل في تصدير النتائج', 'error');
      }
      
    } catch (error) {
      this.showLoading(false);
      console.error('خطأ في التصدير:', error);
      this.showNotification('خطأ في التصدير', 'error');
    }
  }

  /**
   * إظهار الإعدادات
   */
  showSettings() {
    this.populateSettings();
    this.elements['settings-panel'].style.display = 'flex';
  }

  /**
   * إخفاء الإعدادات
   */
  hideSettings() {
    this.elements['settings-panel'].style.display = 'none';
  }

  /**
   * ملء الإعدادات الحالية
   */
  populateSettings() {
    document.getElementById('batch-size').value = this.settings.batchSize;
    document.getElementById('batch-size-value').textContent = this.settings.batchSize;
    document.getElementById('command-delay').value = this.settings.delayBetweenCommands;
    document.getElementById('command-delay-value').textContent = this.settings.delayBetweenCommands;
    document.getElementById('batch-delay').value = this.settings.delayBetweenBatches;
    document.getElementById('batch-delay-value').textContent = this.settings.delayBetweenBatches;
    document.getElementById('max-retries').value = this.settings.maxRetries;
    document.getElementById('max-retries-value').textContent = this.settings.maxRetries;
    document.getElementById('skip-errors').checked = this.settings.skipOnError;
    document.getElementById('save-partial').checked = this.settings.savePartialResults;
  }

  /**
   * حفظ الإعدادات
   */
  async saveSettings() {
    try {
      this.settings = {
        batchSize: parseInt(document.getElementById('batch-size').value),
        delayBetweenCommands: parseInt(document.getElementById('command-delay').value),
        delayBetweenBatches: parseInt(document.getElementById('batch-delay').value),
        maxRetries: parseInt(document.getElementById('max-retries').value),
        skipOnError: document.getElementById('skip-errors').checked,
        savePartialResults: document.getElementById('save-partial').checked
      };
      
      // حفظ في storage
      await chrome.storage.local.set({ amadeus_settings: this.settings });
      
      // إرسال للـ content script
      await this.sendMessageToContentScript({
        action: 'updateSettings',
        settings: this.settings
      });
      
      this.hideSettings();
      this.showNotification('تم حفظ الإعدادات بنجاح', 'success');
      
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      this.showNotification('خطأ في حفظ الإعدادات', 'error');
    }
  }

  /**
   * إعادة تعيين الإعدادات
   */
  async resetSettings() {
    try {
      this.settings = this.getDefaultSettings();
      this.populateSettings();
      await chrome.storage.local.set({ amadeus_settings: this.settings });
      this.showNotification('تم إعادة تعيين الإعدادات', 'info');
      
    } catch (error) {
      console.error('خطأ في إعادة تعيين الإعدادات:', error);
      this.showNotification('خطأ في إعادة التعيين', 'error');
    }
  }

  /**
   * الحصول على الإعدادات الافتراضية
   */
  getDefaultSettings() {
    return {
      batchSize: 5,
      delayBetweenCommands: 1000,
      delayBetweenBatches: 2000,
      maxRetries: 3,
      skipOnError: true,
      savePartialResults: true
    };
  }

  /**
   * تحميل الإعدادات المحفوظة
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('amadeus_settings');
      if (result.amadeus_settings) {
        this.settings = { ...this.getDefaultSettings(), ...result.amadeus_settings };
      } else {
        this.settings = this.getDefaultSettings();
      }
    } catch (error) {
      console.error('خطأ في تحميل الإعدادات:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * بدء مراقبة التقدم
   */
  startProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    this.progressInterval = setInterval(async () => {
      try {
        const response = await this.sendMessageToContentScript({ action: 'getStatus' });
        if (response && response.success && response.status.extractionStatus === 'completed') {
          this.onExtractionCompleted();
          this.stopProgressMonitoring();
        }
      } catch (error) {
        // تجاهل الأخطاء في المراقبة
      }
    }, 2000);
  }

  /**
   * إيقاف مراقبة التقدم
   */
  stopProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * عند اكتمال الاستخراج
   */
  onExtractionCompleted() {
    this.extractionStatus = 'completed';
    this.state.extractionRunning = false;
    this.state.hasResults = true;
    this.updateUIForStatus({ extractionStatus: 'completed' });
    this.showNotification('اكتمل الاستخراج بنجاح! 🎉', 'success');
  }

  /**
   * معالجة الرسائل من content script
   */
  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'progress':
        this.updateProgress(message.progress);
        break;
        
      case 'completed':
        this.onExtractionCompleted();
        break;
        
      case 'error':
        this.showNotification(`خطأ: ${message.error}`, 'error');
        this.extractionStatus = 'error';
        this.state.extractionRunning = false;
        this.updateUIForStatus({ extractionStatus: 'error' });
        this.stopProgressMonitoring();
        break;
        
      case 'ready':
        this.updateStatus('النظام جاهز', 'success');
        break;
    }
  }

  /**
   * إرسال رسالة إلى content script
   */
  async sendMessageToContentScript(message) {
    try {
      if (!this.currentTab || !this.currentTab.id) {
        throw new Error('لا يوجد تبويب نشط');
      }

      const response = await chrome.tabs.sendMessage(this.currentTab.id, message);
      return response;
      
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      throw error;
    }
  }

  /**
   * إظهار الإشعار
   */
  showNotification(message, type = 'info') {
    const notification = this.elements['notification'];
    const icon = this.elements['notification-icon'];
    const text = this.elements['notification-text'];
    
    if (!notification || !icon || !text) return;
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    icon.textContent = icons[type] || icons.info;
    text.textContent = message;
    
    // إزالة الكلاسات السابقة وإضافة الجديدة
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // إخفاء تلقائي بعد 5 ثوان
    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  /**
   * إخفاء الإشعار
   */
  hideNotification() {
    const notification = this.elements['notification'];
    if (notification) {
      notification.style.display = 'none';
    }
  }

  /**
   * إظهار/إخفاء شاشة التحميل
   */
  showLoading(show = true) {
    const overlay = this.elements['loading-overlay'];
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * تحديث واجهة المستخدم
   */
  updateUI() {
    // تحديث الواجهة حسب الحالة الحالية
    if (!this.isConnected) {
      // إخفاء عناصر التحكم إذا لم نكن متصلين
      this.elements['start-btn'].disabled = true;
      this.elements['test-btn'].disabled = true;
      
      // إظهار رسالة عدم الاتصال
      this.updateStatus('يرجى فتح صفحة Amadeus أولاً', 'warning');
    } else {
      // تفعيل عناصر التحكم
      this.elements['start-btn'].disabled = false;
      this.elements['test-btn'].disabled = false;
    }
    
    // تحديث الواجهة حسب حالة الاستخراج
    this.updateUIForStatus({ extractionStatus: this.extractionStatus });
  }

  /**
   * إظهار المساعدة
   */
  showHelp() {
    this.showNotification('يمكنك العثور على المساعدة الشاملة في ملف README.md', 'info');
  }

  /**
   * إظهار معلومات المشروع
   */
  showAbout() {
    this.showNotification('مشروع مفتوح المصدر لاستخراج أوامر Amadeus - الإصدار 1.0.0', 'info');
  }

  /**
   * فتح GitHub
   */
  openGitHub() {
    chrome.tabs.create({ url: 'https://github.com/amadeus-command-extractor' });
  }

  /**
   * تنظيف الموارد
   */
  cleanup() {
    this.stopProgressMonitoring();
    
    // إزالة المستمعين إذا لزم الأمر
    if (this.elements) {
      Object.values(this.elements).forEach(element => {
        if (element && element.removeEventListener) {
          // يمكن إضافة إزالة محددة للمستمعين هنا
        }
      });
    }
  }
}

// تهيئة Popup Manager عند تحميل الصفحة
let popupManager = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    popupManager = new PopupManager();
    await popupManager.initialize();
  } catch (error) {
    console.error('فشل في تهيئة Popup:', error);
  }
});

// تنظيف عند إغلاق النافذة
window.addEventListener('beforeunload', () => {
  if (popupManager) {
    popupManager.cleanup();
  }
});

// تصدير للوصول العام إذا احتيج
window.popupManager = popupManager;