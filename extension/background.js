/**
 * Background Service Worker - خدمة الخلفية للـ Extension
 * يدير العمليات الخلفية، التخزين، والإشعارات
 */

class BackgroundService {
  constructor() {
    this.activeExtractions = new Map();
    this.notificationId = 'amadeus-extractor';
    this.updateInterval = null;
    this.isInitialized = false;
    
    console.log('🔧 Background Service Worker بدأ التشغيل');
  }

  /**
   * تهيئة الخدمة
   */
  async initialize() {
    try {
      console.log('🚀 تهيئة Background Service...');
      
      // إعداد المستمعين
      this.setupEventListeners();
      
      // تنظيف البيانات القديمة
      await this.cleanupOldData();
      
      // إعداد المراقبة الدورية
      this.setupPeriodicTasks();
      
      this.isInitialized = true;
      console.log('✅ تم تهيئة Background Service بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تهيئة Background Service:', error);
    }
  }

  /**
   * إعداد مستمعي الأحداث
   */
  setupEventListeners() {
    // مستمع تثبيت Extension
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // مستمع بدء تشغيل Extension
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // مستمع الرسائل من content scripts و popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // للاستجابة غير المتزامنة
    });

    // مستمع تحديث التبويبات
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // مستمع إغلاق التبويبات
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.handleTabRemoved(tabId, removeInfo);
    });

    // مستمع النقر على أيقونة Extension
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    // مستمع الإنذارات (للمهام الدورية)
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  /**
   * معالجة تثبيت Extension
   */
  async handleInstall(details) {
    try {
      console.log('📦 Extension تم تثبيته:', details);
      
      if (details.reason === 'install') {
        // تثبيت جديد
        console.log('🆕 تثبيت جديد لـ Amadeus Command Extractor');
        
        // إعداد الإعدادات الافتراضية
        await this.setupDefaultSettings();
        
        // إنشاء إشعار ترحيب
        this.showWelcomeNotification();
        
      } else if (details.reason === 'update') {
        // تحديث
        console.log('🔄 تم تحديث Extension إلى النسخة الجديدة');
        
        // تنظيف البيانات القديمة إذا لزم الأمر
        await this.handleUpdate(details.previousVersion);
      }
      
    } catch (error) {
      console.error('خطأ في معالجة التثبيت:', error);
    }
  }

  /**
   * معالجة بدء التشغيل
   */
  handleStartup() {
    console.log('🚀 Extension بدأ التشغيل');
    this.initialize();
  }

  /**
   * معالجة الرسائل
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('📨 رسالة واردة:', request);

      switch (request.action) {
        case 'registerExtraction':
          await this.registerExtraction(request.tabId, request.data);
          sendResponse({ success: true });
          break;

        case 'updateExtractionProgress':
          await this.updateExtractionProgress(request.tabId, request.progress);
          sendResponse({ success: true });
          break;

        case 'completeExtraction':
          await this.completeExtraction(request.tabId, request.results);
          sendResponse({ success: true });
          break;

        case 'getStoredData':
          const data = await this.getStoredData(request.key);
          sendResponse({ success: true, data: data });
          break;

        case 'saveData':
          await this.saveData(request.key, request.data);
          sendResponse({ success: true });
          break;

        case 'clearData':
          await this.clearData(request.key);
          sendResponse({ success: true });
          break;

        case 'getExtensionInfo':
          const info = await this.getExtensionInfo();
          sendResponse({ success: true, info: info });
          break;

        case 'showNotification':
          this.showNotification(request.title, request.message, request.type);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'أمر غير معروف' });
      }

    } catch (error) {
      console.error('خطأ في معالجة الرسالة:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * معالجة تحديث التبويب
   */
  handleTabUpdate(tabId, changeInfo, tab) {
    // التحقق من أن التبويب هو صفحة Amadeus
    if (changeInfo.status === 'complete' && this.isAmadeusTab(tab)) {
      console.log('🌐 تم تحميل صفحة Amadeus في التبويب:', tabId);
      
      // تحديث أيقونة Extension
      this.updateExtensionIcon(tabId, true);
      
      // إرسال إشعار للـ content script إذا لزم الأمر
      this.notifyContentScript(tabId, { type: 'pageLoaded' });
    } else if (changeInfo.status === 'complete') {
      // تحديث الأيقونة للصفحات الأخرى
      this.updateExtensionIcon(tabId, false);
    }
  }

  /**
   * معالجة إغلاق التبويب
   */
  handleTabRemoved(tabId, removeInfo) {
    // تنظيف البيانات المتعلقة بالتبويب المغلق
    if (this.activeExtractions.has(tabId)) {
      console.log('🗑️ تنظيف بيانات الاستخراج للتبويب المغلق:', tabId);
      this.activeExtractions.delete(tabId);
    }
  }

  /**
   * معالجة النقر على أيقونة Extension
   */
  async handleActionClick(tab) {
    try {
      if (this.isAmadeusTab(tab)) {
        // فتح popup إذا كان التبويب هو Amadeus
        console.log('🖱️ فتح popup لصفحة Amadeus');
      } else {
        // إظهار إشعار إذا لم يكن التبويب Amadeus
        this.showNotification(
          'Amadeus Command Extractor',
          'يرجى الانتقال إلى صفحة Amadeus لاستخدام الأداة',
          'info'
        );
      }
    } catch (error) {
      console.error('خطأ في معالجة النقر على الأيقونة:', error);
    }
  }

  /**
   * معالجة الإنذارات
   */
  handleAlarm(alarm) {
    switch (alarm.name) {
      case 'cleanup':
        this.performCleanup();
        break;
      case 'backup':
        this.performBackup();
        break;
      default:
        console.log('إنذار غير معروف:', alarm.name);
    }
  }

  /**
   * تسجيل عملية استخراج جديدة
   */
  async registerExtraction(tabId, data) {
    try {
      const extraction = {
        id: Date.now().toString(),
        tabId: tabId,
        startTime: new Date(),
        status: 'running',
        progress: 0,
        totalCommands: data.totalCommands || 0,
        processedCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        settings: data.settings || {}
      };

      this.activeExtractions.set(tabId, extraction);
      
      // حفظ في storage
      await this.saveExtractionData(extraction);
      
      console.log('📝 تم تسجيل عملية استخراج جديدة:', extraction.id);
      
    } catch (error) {
      console.error('خطأ في تسجيل الاستخراج:', error);
      throw error;
    }
  }

  /**
   * تحديث تقدم الاستخراج
   */
  async updateExtractionProgress(tabId, progress) {
    try {
      const extraction = this.activeExtractions.get(tabId);
      if (!extraction) return;

      // تحديث البيانات
      extraction.progress = progress.percentage || 0;
      extraction.processedCommands = progress.current || 0;
      extraction.successfulCommands = progress.successful || 0;
      extraction.failedCommands = progress.failed || 0;
      extraction.lastUpdate = new Date();

      // حفظ التحديث
      await this.saveExtractionData(extraction);
      
      // تحديث الأيقونة مع التقدم
      this.updateExtensionIconWithProgress(tabId, extraction.progress);
      
    } catch (error) {
      console.error('خطأ في تحديث التقدم:', error);
    }
  }

  /**
   * إكمال الاستخراج
   */
  async completeExtraction(tabId, results) {
    try {
      const extraction = this.activeExtractions.get(tabId);
      if (!extraction) return;

      // تحديث الحالة
      extraction.status = 'completed';
      extraction.endTime = new Date();
      extraction.results = results;
      extraction.duration = extraction.endTime - extraction.startTime;

      // حفظ النتائج النهائية
      await this.saveExtractionData(extraction);
      await this.saveExtractionResults(extraction);
      
      // إظهار إشعار الإكمال
      this.showCompletionNotification(extraction);
      
      // تحديث الأيقونة
      this.updateExtensionIcon(tabId, true, 'completed');
      
      console.log('✅ اكتمل الاستخراج:', extraction.id);
      
    } catch (error) {
      console.error('خطأ في إكمال الاستخراج:', error);
    }
  }

  /**
   * إعداد الإعدادات الافتراضية
   */
  async setupDefaultSettings() {
    try {
      const defaultSettings = {
        batchSize: 5,
        delayBetweenCommands: 1000,
        delayBetweenBatches: 2000,
        maxRetries: 3,
        skipOnError: true,
        savePartialResults: true,
        notifications: true,
        autoBackup: true
      };

      await chrome.storage.local.set({
        amadeus_settings: defaultSettings,
        amadeus_first_run: true,
        amadeus_version: chrome.runtime.getManifest().version
      });

      console.log('✅ تم إعداد الإعدادات الافتراضية');
      
    } catch (error) {
      console.error('خطأ في إعداد الإعدادات الافتراضية:', error);
    }
  }

  /**
   * تنظيف البيانات القديمة
   */
  async cleanupOldData() {
    try {
      console.log('🧹 تنظيف البيانات القديمة...');
      
      // حذف البيانات الأقدم من 30 يوم
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const result = await chrome.storage.local.get();
      const keysToRemove = [];
      
      Object.keys(result).forEach(key => {
        if (key.startsWith('amadeus_extraction_') && result[key].timestamp < thirtyDaysAgo) {
          keysToRemove.push(key);
        }
      });
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🗑️ تم حذف ${keysToRemove.length} من البيانات القديمة`);
      }
      
    } catch (error) {
      console.error('خطأ في تنظيف البيانات:', error);
    }
  }

  /**
   * إعداد المهام الدورية
   */
  setupPeriodicTasks() {
    // تنظيف دوري كل 24 ساعة
    chrome.alarms.create('cleanup', { 
      delayInMinutes: 1440, // 24 ساعة
      periodInMinutes: 1440 
    });
    
    // نسخ احتياطي دوري كل أسبوع
    chrome.alarms.create('backup', { 
      delayInMinutes: 10080, // أسبوع
      periodInMinutes: 10080 
    });
    
    console.log('⏰ تم إعداد المهام الدورية');
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
   * تحديث أيقونة Extension
   */
  async updateExtensionIcon(tabId, isAmadeus, status = 'ready') {
    try {
      let iconPath, title;
      
      if (!isAmadeus) {
        iconPath = 'icons/icon-gray-';
        title = 'Amadeus Command Extractor - غير متاح';
      } else {
        switch (status) {
          case 'running':
            iconPath = 'icons/icon-blue-';
            title = 'Amadeus Command Extractor - يعمل';
            break;
          case 'completed':
            iconPath = 'icons/icon-green-';
            title = 'Amadeus Command Extractor - مكتمل';
            break;
          default:
            iconPath = 'icons/icon-';
            title = 'Amadeus Command Extractor - جاهز';
        }
      }
      
      await chrome.action.setIcon({
        tabId: tabId,
        path: {
          '16': iconPath + '16.png',
          '32': iconPath + '32.png',
          '48': iconPath + '48.png',
          '128': iconPath + '128.png'
        }
      });
      
      await chrome.action.setTitle({
        tabId: tabId,
        title: title
      });
      
    } catch (error) {
      console.error('خطأ في تحديث الأيقونة:', error);
    }
  }

  /**
   * تحديث أيقونة Extension مع التقدم
   */
  async updateExtensionIconWithProgress(tabId, progress) {
    try {
      // يمكن رسم التقدم على الأيقونة أو تحديث النص
      await chrome.action.setBadgeText({
        tabId: tabId,
        text: `${Math.round(progress)}%`
      });
      
      await chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#4f46e5'
      });
      
    } catch (error) {
      console.error('خطأ في تحديث أيقونة التقدم:', error);
    }
  }

  /**
   * إظهار إشعار الترحيب
   */
  showWelcomeNotification() {
    this.showNotification(
      'مرحباً بك في Amadeus Command Extractor! 🎉',
      'تم تثبيت الأداة بنجاح. انتقل إلى صفحة Amadeus لبدء الاستخدام.',
      'info'
    );
  }

  /**
   * إظهار إشعار الإكمال
   */
  showCompletionNotification(extraction) {
    const duration = Math.round(extraction.duration / 1000 / 60); // بالدقائق
    
    this.showNotification(
      'اكتمل استخراج أوامر Amadeus! ✅',
      `تم معالجة ${extraction.processedCommands} أمر في ${duration} دقيقة. النجاح: ${extraction.successfulCommands}`,
      'success'
    );
  }

  /**
   * إظهار إشعار عام
   */
  showNotification(title, message, type = 'info') {
    try {
      const iconPath = this.getNotificationIcon(type);
      
      chrome.notifications.create(this.notificationId, {
        type: 'basic',
        iconUrl: iconPath,
        title: title,
        message: message,
        priority: type === 'error' ? 2 : 1
      });
      
    } catch (error) {
      console.error('خطأ في إظهار الإشعار:', error);
    }
  }

  /**
   * الحصول على أيقونة الإشعار
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'icons/icon-green-48.png';
      case 'error': return 'icons/icon-red-48.png';
      case 'warning': return 'icons/icon-yellow-48.png';
      default: return 'icons/icon-48.png';
    }
  }

  /**
   * إشعار content script
   */
  async notifyContentScript(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      // تجاهل الأخطاء إذا لم يكن content script موجود
    }
  }

  /**
   * حفظ بيانات الاستخراج
   */
  async saveExtractionData(extraction) {
    try {
      const key = `amadeus_extraction_${extraction.id}`;
      await chrome.storage.local.set({ [key]: extraction });
    } catch (error) {
      console.error('خطأ في حفظ بيانات الاستخراج:', error);
    }
  }

  /**
   * حفظ نتائج الاستخراج
   */
  async saveExtractionResults(extraction) {
    try {
      const resultsKey = `amadeus_results_${extraction.id}`;
      const resultsData = {
        id: extraction.id,
        timestamp: extraction.endTime,
        summary: {
          totalCommands: extraction.totalCommands,
          processedCommands: extraction.processedCommands,
          successfulCommands: extraction.successfulCommands,
          failedCommands: extraction.failedCommands,
          duration: extraction.duration
        },
        results: extraction.results,
        settings: extraction.settings
      };
      
      await chrome.storage.local.set({ [resultsKey]: resultsData });
      
      // حفظ مرجع في قائمة النتائج
      await this.addToResultsList(resultsData);
      
    } catch (error) {
      console.error('خطأ في حفظ النتائج:', error);
    }
  }

  /**
   * إضافة إلى قائمة النتائج
   */
  async addToResultsList(resultsData) {
    try {
      const result = await chrome.storage.local.get('amadeus_results_list');
      const resultsList = result.amadeus_results_list || [];
      
      // إضافة النتيجة الجديدة
      resultsList.unshift({
        id: resultsData.id,
        timestamp: resultsData.timestamp,
        summary: resultsData.summary
      });
      
      // الاحتفاظ بآخر 50 نتيجة فقط
      const trimmedList = resultsList.slice(0, 50);
      
      await chrome.storage.local.set({ amadeus_results_list: trimmedList });
      
    } catch (error) {
      console.error('خطأ في إضافة النتيجة للقائمة:', error);
    }
  }

  /**
   * الحصول على البيانات المحفوظة
   */
  async getStoredData(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('خطأ في قراءة البيانات:', error);
      return null;
    }
  }

  /**
   * حفظ البيانات
   */
  async saveData(key, data) {
    try {
      await chrome.storage.local.set({ [key]: data });
    } catch (error) {
      console.error('خطأ في حفظ البيانات:', error);
      throw error;
    }
  }

  /**
   * مسح البيانات
   */
  async clearData(key) {
    try {
      if (key) {
        await chrome.storage.local.remove(key);
      } else {
        // مسح جميع البيانات المتعلقة بـ Amadeus
        const result = await chrome.storage.local.get();
        const keysToRemove = Object.keys(result).filter(k => k.startsWith('amadeus_'));
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      console.error('خطأ في مسح البيانات:', error);
      throw error;
    }
  }

  /**
   * الحصول على معلومات Extension
   */
  async getExtensionInfo() {
    try {
      const manifest = chrome.runtime.getManifest();
      const storage = await chrome.storage.local.get();
      
      // حساب حجم البيانات المحفوظة
      const amadeusKeys = Object.keys(storage).filter(key => key.startsWith('amadeus_'));
      const dataSize = JSON.stringify(amadeusKeys.map(key => storage[key])).length;
      
      // عدد النتائج المحفوظة
      const resultsList = storage.amadeus_results_list || [];
      
      return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        permissions: manifest.permissions,
        activeExtractions: this.activeExtractions.size,
        savedResults: resultsList.length,
        dataSize: this.formatBytes(dataSize),
        isInitialized: this.isInitialized
      };
      
    } catch (error) {
      console.error('خطأ في الحصول على معلومات Extension:', error);
      return null;
    }
  }

  /**
   * تنسيق حجم البيانات
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * معالجة التحديث
   */
  async handleUpdate(previousVersion) {
    try {
      console.log(`🔄 تحديث من النسخة ${previousVersion}`);
      
      // تنفيذ مهام التحديث حسب النسخة
      if (this.isVersionLower(previousVersion, '1.0.0')) {
        // ترقية من نسخة أقل من 1.0.0
        await this.migrateToV1();
      }
      
      // تحديث رقم النسخة
      await chrome.storage.local.set({
        amadeus_version: chrome.runtime.getManifest().version
      });
      
    } catch (error) {
      console.error('خطأ في معالجة التحديث:', error);
    }
  }

  /**
   * مقارنة الإصدارات
   */
  isVersionLower(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return true;
      if (v1part > v2part) return false;
    }
    
    return false;
  }

  /**
   * ترقية إلى النسخة 1.0.0
   */
  async migrateToV1() {
    try {
      console.log('🔄 ترقية البيانات إلى النسخة 1.0.0...');
      
      // إضافة أي مهام ترقية مطلوبة هنا
      
      console.log('✅ تمت الترقية بنجاح');
    } catch (error) {
      console.error('خطأ في الترقية:', error);
    }
  }

  /**
   * تنفيذ التنظيف الدوري
   */
  async performCleanup() {
    try {
      console.log('🧹 تنفيذ التنظيف الدوري...');
      
      await this.cleanupOldData();
      
      // تنظيف الاستخراجات المعطلة
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      for (const [tabId, extraction] of this.activeExtractions) {
        if (extraction.lastUpdate && extraction.lastUpdate.getTime() < oneDayAgo) {
          console.log(`🗑️ إزالة استخراج معطل: ${extraction.id}`);
          this.activeExtractions.delete(tabId);
        }
      }
      
      console.log('✅ اكتمل التنظيف الدوري');
      
    } catch (error) {
      console.error('خطأ في التنظيف الدوري:', error);
    }
  }

  /**
   * تنفيذ النسخ الاحتياطي
   */
  async performBackup() {
    try {
      console.log('💾 تنفيذ النسخ الاحتياطي...');
      
      const storage = await chrome.storage.local.get();
      const amadeusData = {};
      
      // استخراج البيانات المتعلقة بـ Amadeus فقط
      Object.keys(storage).forEach(key => {
        if (key.startsWith('amadeus_')) {
          amadeusData[key] = storage[key];
        }
      });
      
      // حفظ النسخة الاحتياطية
      const backupKey = `amadeus_backup_${Date.now()}`;
      await chrome.storage.local.set({
        [backupKey]: {
          timestamp: new Date().toISOString(),
          data: amadeusData
        }
      });
      
      // الاحتفاظ بآخر 5 نسخ احتياطية فقط
      await this.cleanupOldBackups();
      
      console.log('✅ تم إنشاء النسخة الاحتياطية');
      
    } catch (error) {
      console.error('خطأ في النسخ الاحتياطي:', error);
    }
  }

  /**
   * تنظيف النسخ الاحتياطية القديمة
   */
  async cleanupOldBackups() {
    try {
      const storage = await chrome.storage.local.get();
      const backupKeys = Object.keys(storage)
        .filter(key => key.startsWith('amadeus_backup_'))
        .sort()
        .reverse(); // الأحدث أولاً
      
      // حذف النسخ الزائدة عن 5
      if (backupKeys.length > 5) {
        const keysToRemove = backupKeys.slice(5);
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🗑️ تم حذف ${keysToRemove.length} نسخة احتياطية قديمة`);
      }
      
    } catch (error) {
      console.error('خطأ في تنظيف النسخ الاحتياطية:', error);
    }
  }

  /**
   * الحصول على إحصائيات الاستخدام
   */
  async getUsageStatistics() {
    try {
      const storage = await chrome.storage.local.get();
      const resultsList = storage.amadeus_results_list || [];
      
      const stats = {
        totalExtractions: resultsList.length,
        totalCommands: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        averageDuration: 0,
        lastExtraction: null
      };
      
      if (resultsList.length > 0) {
        stats.lastExtraction = resultsList[0].timestamp;
        
        // حساب الإجماليات
        resultsList.forEach(result => {
          stats.totalCommands += result.summary.processedCommands || 0;
          stats.totalSuccessful += result.summary.successfulCommands || 0;
          stats.totalFailed += result.summary.failedCommands || 0;
        });
        
        // حساب متوسط المدة
        const durations = resultsList
          .map(r => r.summary.duration)
          .filter(d => d && d > 0);
        
        if (durations.length > 0) {
          stats.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        }
      }
      
      return stats;
      
    } catch (error) {
      console.error('خطأ في الحصول على الإحصائيات:', error);
      return null;
    }
  }
}

// إنشاء وتهيئة خدمة الخلفية
const backgroundService = new BackgroundService();
backgroundService.initialize();

// تصدير للوصول العام إذا احتيج
self.backgroundService = backgroundService;