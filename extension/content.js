/**
 * Content Script - التفاعل المباشر مع صفحة Amadeus
 * يعمل داخل صفحة Amadeus ويدير العملية الكاملة لاستخراج الأوامر
 */

class AmadeusExtractor {
  constructor() {
    this.sessionManager = new SessionManager();
    this.apiClient = new AmadeusAPIClient(this.sessionManager);
    this.commandProcessor = new CommandProcessor(this.apiClient, this.sessionManager);
    
    this.isInitialized = false;
    this.extractionStatus = 'idle'; // idle, running, paused, completed, error
    this.currentOperation = null;
    
    // واجهة الحالة المعروضة في الصفحة
    this.statusDisplay = null;
    this.progressBar = null;
    
    console.log('🔍 Amadeus Command Extractor تم تحميله');
  }

  /**
   * تهيئة الExtractor
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('⚠️ Extractor مهيأ مسبقاً');
        return true;
      }

      console.log('🚀 تهيئة Amadeus Extractor...');
      
      // التحقق من أن الصفحة هي Amadeus
      if (!this.isAmadeusPage()) {
        console.log('ℹ️ هذه الصفحة ليست صفحة Amadeus');
        return false;
      }

      // إنشاء واجهة الحالة
      this.createStatusDisplay();
      
      // محاولة استخراج بيانات الجلسة
      this.updateStatus('جاري استخراج بيانات الجلسة...');
      const sessionExtracted = await this.sessionManager.extractSessionData();
      
      if (!sessionExtracted) {
        this.updateStatus('❌ فشل في استخراج بيانات الجلسة', 'error');
        return false;
      }
      
      this.updateStatus('✅ تم استخراج بيانات الجلسة بنجاح');
      
      // تحميل قائمة الأوامر
      this.updateStatus('جاري تحميل قائمة الأوامر...');
      await this.commandProcessor.loadCommands();
      this.updateStatus('✅ تم تحميل قائمة الأوامر بنجاح');
      
      // إعداد المستمعين
      this.setupEventListeners();
      
      // إعداد callbacks
      this.setupCallbacks();
      
      this.isInitialized = true;
      this.extractionStatus = 'ready';
      this.updateStatus('🎯 جاهز لبدء الاستخراج');
      
      // إشعار popup بأن النظام جاهز
      this.notifyPopup({ type: 'ready', sessionData: this.sessionManager.getSessionData() });
      
      console.log('✅ تم تهيئة Amadeus Extractor بنجاح');
      return true;
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة Extractor:', error);
      this.updateStatus(`❌ خطأ في التهيئة: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * التحقق من أن الصفحة هي Amadeus
   */
  isAmadeusPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    // فحص URL
    if (url.includes('amadeus.com') || 
        url.includes('altea.amadeus.com') || 
        hostname.includes('amadeus')) {
      return true;
    }
    
    // فحص محتوى الصفحة
    const title = document.title.toLowerCase();
    if (title.includes('amadeus') || title.includes('selling platform')) {
      return true;
    }
    
    // فحص وجود عناصر Amadeus المعروفة
    const amadeusElements = document.querySelectorAll('[id*="amadeus"], [class*="amadeus"], [name*="amadeus"]');
    if (amadeusElements.length > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * إنشاء واجهة عرض الحالة
   */
  createStatusDisplay() {
    // التحقق من وجود العنصر مسبقاً
    if (document.getElementById('amadeus-extractor-status')) {
      return;
    }

    // إنشاء container رئيسي
    const statusContainer = document.createElement('div');
    statusContainer.id = 'amadeus-extractor-status';
    statusContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      z-index: 999999;
      transition: all 0.3s ease;
      display: none;
    `;

    // العنوان
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      font-weight: bold;
      font-size: 14px;
    `;
    header.innerHTML = `
      <span style="margin-right: 8px;">🔍</span>
      Amadeus Commands Extractor
      <button id="extractor-close" style="
        margin-left: auto;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 20px;
        height: 20px;
      ">×</button>
    `;

    // منطقة الحالة
    const statusArea = document.createElement('div');
    statusArea.id = 'extractor-status-text';
    statusArea.style.cssText = `
      margin-bottom: 10px;
      padding: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 5px;
      min-height: 20px;
    `;
    statusArea.textContent = 'جاري التهيئة...';

    // شريط التقدم
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      height: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'extractor-progress-bar';
    progressBar.style.cssText = `
      background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
      height: 100%;
      width: 0%;
      border-radius: 10px;
      transition: width 0.3s ease;
    `;
    progressContainer.appendChild(progressBar);

    // منطقة الإحصائيات
    const statsArea = document.createElement('div');
    statsArea.id = 'extractor-stats';
    statsArea.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      font-size: 11px;
    `;
    statsArea.innerHTML = `
      <div>نجح: <span id="success-count">0</span></div>
      <div>فشل: <span id="failed-count">0</span></div>
      <div>الإجمالي: <span id="total-count">0</span></div>
      <div>المعدل: <span id="success-rate">0%</span></div>
    `;

    // تجميع العناصر
    statusContainer.appendChild(header);
    statusContainer.appendChild(statusArea);
    statusContainer.appendChild(progressContainer);
    statusContainer.appendChild(statsArea);

    // إضافة للصفحة
    document.body.appendChild(statusContainer);

    // حفظ المراجع
    this.statusDisplay = statusContainer;
    this.progressBar = progressBar;

    // إعداد زر الإغلاق
    document.getElementById('extractor-close').addEventListener('click', () => {
      this.hideStatusDisplay();
    });
  }

  /**
   * تحديث نص الحالة
   */
  updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('extractor-status-text');
    if (statusElement) {
      statusElement.textContent = message;
      
      // تغيير اللون حسب النوع
      switch (type) {
        case 'error':
          statusElement.style.background = 'rgba(255,0,0,0.3)';
          break;
        case 'success':
          statusElement.style.background = 'rgba(0,255,0,0.3)';
          break;
        case 'warning':
          statusElement.style.background = 'rgba(255,255,0,0.3)';
          break;
        default:
          statusElement.style.background = 'rgba(255,255,255,0.1)';
      }
    }
    
    console.log(`📱 حالة: ${message}`);
  }

  /**
   * تحديث شريط التقدم
   */
  updateProgress(current, total, additionalStats = {}) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    if (this.progressBar) {
      this.progressBar.style.width = `${percentage}%`;
    }
    
    // تحديث الإحصائيات
    const elements = {
      'success-count': additionalStats.successful || 0,
      'failed-count': additionalStats.failed || 0,
      'total-count': total,
      'success-rate': additionalStats.successRate || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = typeof value === 'number' && id === 'success-rate' 
          ? `${value}%` 
          : value;
      }
    });
  }

  /**
   * إظهار واجهة الحالة
   */
  showStatusDisplay() {
    if (this.statusDisplay) {
      this.statusDisplay.style.display = 'block';
    }
  }

  /**
   * إخفاء واجهة الحالة
   */
  hideStatusDisplay() {
    if (this.statusDisplay) {
      this.statusDisplay.style.display = 'none';
    }
  }

  /**
   * إعداد المستمعين للأحداث
   */
  setupEventListeners() {
    // مستمع رسائل من popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // للاستجابة غير المتزامنة
    });

    // مستمع تغيير الصفحة
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // مستمع تغيير حالة الشبكة
    window.addEventListener('online', () => {
      console.log('🌐 الاتصال بالإنترنت متوفر');
    });

    window.addEventListener('offline', () => {
      console.log('🚫 انقطع الاتصال بالإنترنت');
      this.updateStatus('❌ انقطع الاتصال بالإنترنت', 'error');
    });
  }

  /**
   * إعداد callbacks للمعالج
   */
  setupCallbacks() {
    // callback التقدم
    this.commandProcessor.setProgressCallback((progress) => {
      this.updateProgress(progress.current, progress.total, {
        successful: progress.successful,
        failed: progress.failed,
        successRate: progress.successRate
      });
      
      this.updateStatus(`جاري المعالجة: ${progress.currentCommand} (${progress.current}/${progress.total})`);
      
      // إشعار popup
      this.notifyPopup({
        type: 'progress',
        progress: progress
      });
    });

    // callback الإكمال
    this.commandProcessor.setCompletionCallback((result) => {
      this.extractionStatus = 'completed';
      this.updateStatus(`✅ اكتمل الاستخراج: ${result.summary.successfulCommands}/${result.summary.totalCommands} أمر`, 'success');
      
      // إشعار popup بالإكمال
      this.notifyPopup({
        type: 'completed',
        result: result
      });
      
      // حفظ النتائج
      this.saveResults(result);
    });

    // callback الأخطاء
    this.commandProcessor.setErrorCallback((error) => {
      this.extractionStatus = 'error';
      this.updateStatus(`❌ خطأ: ${error.message}`, 'error');
      
      // إشعار popup بالخطأ
      this.notifyPopup({
        type: 'error',
        error: error.message
      });
    });
  }

  /**
   * معالجة الرسائل من popup
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('📨 رسالة واردة:', request);

      switch (request.action) {
        case 'getStatus':
          sendResponse({
            success: true,
            status: {
              isInitialized: this.isInitialized,
              extractionStatus: this.extractionStatus,
              processorStatus: this.commandProcessor.getStatus(),
              sessionValid: this.sessionManager.isSessionValid()
            }
          });
          break;

        case 'startExtraction':
          if (!this.isInitialized) {
            await this.initialize();
          }
          
          this.showStatusDisplay();
          await this.startExtraction(request.options);
          
          sendResponse({ success: true, message: 'تم بدء الاستخراج' });
          break;

        case 'pauseExtraction':
          this.commandProcessor.pause();
          this.extractionStatus = 'paused';
          this.updateStatus('⏸️ تم إيقاف الاستخراج مؤقتاً', 'warning');
          sendResponse({ success: true, message: 'تم إيقاف الاستخراج مؤقتاً' });
          break;

        case 'resumeExtraction':
          this.commandProcessor.resume();
          this.extractionStatus = 'running';
          this.updateStatus('▶️ تم استكمال الاستخراج');
          sendResponse({ success: true, message: 'تم استكمال الاستخراج' });
          break;

        case 'stopExtraction':
          this.commandProcessor.stop();
          this.extractionStatus = 'idle';
          this.updateStatus('🛑 تم إيقاف الاستخراج');
          sendResponse({ success: true, message: 'تم إيقاف الاستخراج' });
          break;

        case 'testConnection':
          const testResult = await this.apiClient.testConnection();
          sendResponse(testResult);
          break;

        case 'updateSettings':
          this.commandProcessor.updateSettings(request.settings);
          sendResponse({ success: true, message: 'تم تحديث الإعدادات' });
          break;

        case 'exportResults':
          const exportResult = await this.exportResults(request.format);
          sendResponse(exportResult);
          break;

        case 'getResults':
          const results = await this.getStoredResults();
          sendResponse({ success: true, results: results });
          break;

        default:
          sendResponse({ success: false, error: 'أمر غير معروف' });
      }

    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * بدء عملية الاستخراج
   */
  async startExtraction(options = {}) {
    try {
      console.log('🚀 بدء عملية الاستخراج...');
      
      this.extractionStatus = 'running';
      this.updateStatus('🚀 بدء استخراج أوامر HE...');
      
      // تحديث إعدادات المعالج
      if (options) {
        this.commandProcessor.updateSettings(options);
      }
      
      // بدء المعالجة
      const result = await this.commandProcessor.startProcessing();
      
      console.log('✅ اكتملت عملية الاستخراج');
      return result;
      
    } catch (error) {
      console.error('❌ خطأ في عملية الاستخراج:', error);
      this.extractionStatus = 'error';
      throw error;
    }
  }

  /**
   * حفظ النتائج
   */
  async saveResults(results) {
    try {
      const saveData = {
        timestamp: new Date().toISOString(),
        results: results,
        sessionInfo: this.sessionManager.getSessionData(),
        extractorVersion: '1.0.0'
      };

      // حفظ في chrome.storage
      if (chrome && chrome.storage) {
        await chrome.storage.local.set({
          'amadeus_extraction_results': saveData
        });
        console.log('💾 تم حفظ النتائج في storage');
      }

      // حفظ كملف محلي
      this.downloadResults(saveData, 'json');
      
    } catch (error) {
      console.error('❌ خطأ في حفظ النتائج:', error);
    }
  }

  /**
   * تصدير النتائج
   */
  async exportResults(format = 'markdown') {
    try {
      const results = await this.getStoredResults();
      
      if (!results) {
        return { success: false, error: 'لا توجد نتائج للتصدير' };
      }

      switch (format) {
        case 'markdown':
          await this.downloadResults(results, 'markdown');
          break;
        case 'json':
          await this.downloadResults(results, 'json');
          break;
        case 'csv':
          await this.downloadResults(results, 'csv');
          break;
        default:
          return { success: false, error: 'صيغة تصدير غير مدعومة' };
      }

      return { success: true, message: `تم تصدير النتائج بصيغة ${format}` };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * تحميل النتائج كملف
   */
  downloadResults(data, format) {
    let content, filename, mimeType;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        filename = `amadeus_commands_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;
        
      case 'markdown':
        content = this.generateMarkdown(data);
        filename = `amadeus_commands_guide_${new Date().toISOString().split('T')[0]}.md`;
        mimeType = 'text/markdown';
        break;
        
      case 'csv':
        content = this.generateCSV(data);
        filename = `amadeus_commands_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
    }

    // إنشاء وتحميل الملف
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`📥 تم تحميل الملف: ${filename}`);
  }

  /**
   * إنشاء محتوى Markdown
   */
  generateMarkdown(data) {
    // سيتم إنشاء هذا في ملف منفصل
    return `# Amadeus Commands Guide\n\nGenerated on: ${new Date().toLocaleString()}\n\n## Summary\n\nTotal Commands: ${data.results?.summary?.totalCommands || 0}\nSuccessful: ${data.results?.summary?.successfulCommands || 0}\n\n## Commands\n\n${this.formatCommandsForMarkdown(data)}`;
  }

  /**
   * تنسيق الأوامر لـ Markdown
   */
  formatCommandsForMarkdown(data) {
    if (!data.results || !data.results.results) {
      return 'No data available.';
    }

    return data.results.results
      .filter(result => result.success && result.responseText)
      .map(result => `### ${result.command}\n\n\`\`\`\n${result.responseText}\n\`\`\`\n`)
      .join('\n');
  }

  /**
   * إنشاء محتوى CSV
   */
  generateCSV(data) {
    const headers = ['Command', 'Success', 'Category', 'Priority', 'Error', 'Timestamp'];
    const rows = [headers];

    if (data.results && data.results.results) {
      data.results.results.forEach(result => {
        rows.push([
          result.command || '',
          result.success ? 'Yes' : 'No',
          result.category || '',
          result.priority || '',
          result.error || '',
          result.timestamp || ''
        ]);
      });
    }

    return rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * الحصول على النتائج المحفوظة
   */
  async getStoredResults() {
    try {
      if (chrome && chrome.storage) {
        const result = await chrome.storage.local.get('amadeus_extraction_results');
        return result.amadeus_extraction_results || null;
      }
      return null;
    } catch (error) {
      console.error('❌ خطأ في قراءة النتائج المحفوظة:', error);
      return null;
    }
  }

  /**
   * إشعار popup بالتحديثات
   */
  notifyPopup(message) {
    try {
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage(message).catch(() => {
          // تجاهل الأخطاء إذا كان popup مغلق
        });
      }
    } catch (error) {
      // تجاهل أخطاء الإرسال
    }
  }

  /**
   * تنظيف الموارد
   */
  cleanup() {
    if (this.commandProcessor.getStatus().isRunning) {
      this.commandProcessor.stop();
    }
    
    if (this.statusDisplay) {
      this.statusDisplay.remove();
    }
    
    console.log('🧹 تم تنظيف موارد Extractor');
  }
}

// تهيئة Extractor عند تحميل الصفحة
let amadeusExtractor = null;

// انتظار تحميل DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtractor);
} else {
  initializeExtractor();
}

async function initializeExtractor() {
  try {
    // تأخير قصير للتأكد من تحميل جميع الموارد
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    amadeusExtractor = new AmadeusExtractor();
    
    // محاولة التهيئة التلقائية
    const initialized = await amadeusExtractor.initialize();
    
    if (initialized) {
      console.log('✅ Amadeus Extractor جاهز للاستخدام');
    } else {
      console.log('ℹ️ Amadeus Extractor في وضع الانتظار');
    }
    
  } catch (error) {
    console.error('❌ خطأ في تهيئة Amadeus Extractor:', error);
  }
}

// تصدير للوصول العام إذا احتيج
window.amadeusExtractor = amadeusExtractor;