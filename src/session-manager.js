/**
 * Session Manager - استخراج وإدارة بيانات جلسة Amadeus
 * يستخرج jSessionId, contextId وبيانات المستخدم من الصفحة الحالية
 */

class SessionManager {
  constructor() {
    this.sessionData = null;
    this.isValid = false;
    this.lastExtracted = null;
  }

  /**
   * استخراج بيانات الجلسة من الصفحة الحالية
   * @returns {Object|null} بيانات الجلسة أو null في حالة الفشل
   */
  async extractSessionData() {
    try {
      console.log('🔍 بدء استخراج بيانات الجلسة...');
      
      // طريقة 1: البحث في Network Requests المتاحة
      const sessionFromRequests = this.extractFromNetworkRequests();
      if (sessionFromRequests) {
        this.sessionData = sessionFromRequests;
        this.isValid = true;
        this.lastExtracted = new Date();
        console.log('✅ تم استخراج بيانات الجلسة من Network Requests');
        return this.sessionData;
      }

      // طريقة 2: البحث في DOM Elements
      const sessionFromDOM = this.extractFromDOM();
      if (sessionFromDOM) {
        this.sessionData = sessionFromDOM;
        this.isValid = true;
        this.lastExtracted = new Date();
        console.log('✅ تم استخراج بيانات الجلسة من DOM');
        return this.sessionData;
      }

      // طريقة 3: البحث في JavaScript Variables
      const sessionFromJS = this.extractFromJavaScript();
      if (sessionFromJS) {
        this.sessionData = sessionFromJS;
        this.isValid = true;
        this.lastExtracted = new Date();
        console.log('✅ تم استخراج بيانات الجلسة من JavaScript');
        return this.sessionData;
      }

      // طريقة 4: البحث في Local/Session Storage
      const sessionFromStorage = this.extractFromStorage();
      if (sessionFromStorage) {
        this.sessionData = sessionFromStorage;
        this.isValid = true;
        this.lastExtracted = new Date();
        console.log('✅ تم استخراج بيانات الجلسة من Storage');
        return this.sessionData;
      }

      console.error('❌ فشل في استخراج بيانات الجلسة من جميع الطرق');
      return null;

    } catch (error) {
      console.error('❌ خطأ في استخراج بيانات الجلسة:', error);
      return null;
    }
  }

  /**
   * استخراج البيانات من Network Requests (أفضل طريقة)
   */
  extractFromNetworkRequests() {
    try {
      // البحث في Performance API للطلبات الحديثة
      const entries = performance.getEntriesByType('navigation');
      
      // محاولة الوصول للطلبات المحفوظة في الذاكرة
      if (window.lastAmadeusRequest) {
        const requestData = window.lastAmadeusRequest;
        return this.parseRequestData(requestData);
      }

      // البحث في XMLHttpRequest intercepted data
      if (window.amadeusSessionData) {
        return window.amadeusSessionData;
      }

      return null;
    } catch (error) {
      console.error('خطأ في استخراج البيانات من Network:', error);
      return null;
    }
  }

  /**
   * استخراج البيانات من DOM Elements
   */
  extractFromDOM() {
    try {
      const sessionData = {};

      // البحث في input fields مخفية
      const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
      hiddenInputs.forEach(input => {
        const name = input.name || input.id;
        if (name && name.toLowerCase().includes('session')) {
          sessionData.jSessionId = input.value;
        }
        if (name && name.toLowerCase().includes('context')) {
          sessionData.contextId = input.value;
        }
        if (name && name.toLowerCase().includes('user')) {
          sessionData.userId = input.value;
        }
        if (name && name.toLowerCase().includes('office')) {
          sessionData.officeId = input.value;
        }
        if (name && name.toLowerCase().includes('org')) {
          sessionData.organization = input.value;
        }
      });

      // البحث في meta tags
      const metaTags = document.querySelectorAll('meta[name*="session"], meta[name*="context"], meta[name*="user"]');
      metaTags.forEach(meta => {
        const name = meta.name.toLowerCase();
        if (name.includes('session')) sessionData.jSessionId = meta.content;
        if (name.includes('context')) sessionData.contextId = meta.content;
        if (name.includes('user')) sessionData.userId = meta.content;
      });

      // البحث في data attributes
      const bodyElement = document.body;
      if (bodyElement) {
        if (bodyElement.dataset.sessionId) sessionData.jSessionId = bodyElement.dataset.sessionId;
        if (bodyElement.dataset.contextId) sessionData.contextId = bodyElement.dataset.contextId;
        if (bodyElement.dataset.userId) sessionData.userId = bodyElement.dataset.userId;
        if (bodyElement.dataset.officeId) sessionData.officeId = bodyElement.dataset.officeId;
        if (bodyElement.dataset.organization) sessionData.organization = bodyElement.dataset.organization;
      }

      // التحقق من وجود البيانات الأساسية
      if (sessionData.jSessionId || sessionData.contextId) {
        // إضافة القيم الافتراضية إذا لم تكن موجودة
        sessionData.gds = sessionData.gds || 'AMADEUS';
        
        return this.validateAndCompleteSession(sessionData);
      }

      return null;
    } catch (error) {
      console.error('خطأ في استخراج البيانات من DOM:', error);
      return null;
    }
  }

  /**
   * استخراج البيانات من JavaScript Variables
   */
  extractFromJavaScript() {
    try {
      const sessionData = {};

      // البحث في المتغيرات العامة
      const globalVars = [
        'sessionId', 'jSessionId', 'contextId', 'userId', 'officeId', 'organization',
        'amadeusSession', 'userSession', 'appSession'
      ];

      globalVars.forEach(varName => {
        if (window[varName]) {
          if (varName.includes('session') || varName.includes('Session')) {
            sessionData.jSessionId = window[varName];
          } else if (varName.includes('context')) {
            sessionData.contextId = window[varName];
          } else if (varName.includes('user') || varName.includes('User')) {
            sessionData.userId = window[varName];
          }
        }
      });

      // البحث في كائنات عامة معروفة
      const globalObjects = ['app', 'config', 'session', 'user', 'amadeus'];
      globalObjects.forEach(objName => {
        if (window[objName] && typeof window[objName] === 'object') {
          const obj = window[objName];
          
          // البحث في خصائص الكائن
          Object.keys(obj).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('session') && obj[key]) {
              sessionData.jSessionId = obj[key];
            }
            if (lowerKey.includes('context') && obj[key]) {
              sessionData.contextId = obj[key];
            }
            if (lowerKey.includes('user') && obj[key]) {
              sessionData.userId = obj[key];
            }
            if (lowerKey.includes('office') && obj[key]) {
              sessionData.officeId = obj[key];
            }
            if (lowerKey.includes('org') && obj[key]) {
              sessionData.organization = obj[key];
            }
          });
        }
      });

      if (Object.keys(sessionData).length > 0) {
        return this.validateAndCompleteSession(sessionData);
      }

      return null;
    } catch (error) {
      console.error('خطأ في استخراج البيانات من JavaScript:', error);
      return null;
    }
  }

  /**
   * استخراج البيانات من Storage
   */
  extractFromStorage() {
    try {
      const sessionData = {};

      // البحث في localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        if (key && value) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('session')) sessionData.jSessionId = value;
          if (lowerKey.includes('context')) sessionData.contextId = value;
          if (lowerKey.includes('user')) sessionData.userId = value;
          if (lowerKey.includes('office')) sessionData.officeId = value;
          if (lowerKey.includes('org')) sessionData.organization = value;
        }
      }

      // البحث في sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        
        if (key && value) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('session')) sessionData.jSessionId = value;
          if (lowerKey.includes('context')) sessionData.contextId = value;
          if (lowerKey.includes('user')) sessionData.userId = value;
          if (lowerKey.includes('office')) sessionData.officeId = value;
          if (lowerKey.includes('org')) sessionData.organization = value;
        }
      }

      if (Object.keys(sessionData).length > 0) {
        return this.validateAndCompleteSession(sessionData);
      }

      return null;
    } catch (error) {
      console.error('خطأ في استخراج البيانات من Storage:', error);
      return null;
    }
  }

  /**
   * تحليل بيانات الطلب المعطى
   */
  parseRequestData(requestData) {
    try {
      if (typeof requestData === 'string') {
        requestData = JSON.parse(requestData);
      }

      const sessionData = {
        jSessionId: requestData.jSessionId,
        contextId: requestData.contextId,
        userId: requestData.userId,
        organization: requestData.organization,
        officeId: requestData.officeId,
        gds: requestData.gds || 'AMADEUS'
      };

      return this.validateAndCompleteSession(sessionData);
    } catch (error) {
      console.error('خطأ في تحليل بيانات الطلب:', error);
      return null;
    }
  }

  /**
   * التحقق من صحة البيانات وإكمال الناقص منها
   */
  validateAndCompleteSession(sessionData) {
    try {
      // التحقق من البيانات الأساسية المطلوبة
      if (!sessionData.jSessionId && !sessionData.contextId) {
        console.warn('⚠️ لا توجد بيانات جلسة أساسية');
        return null;
      }

      // إضافة القيم الافتراضية
      const completeSession = {
        jSessionId: sessionData.jSessionId || '',
        contextId: sessionData.contextId || '',
        userId: sessionData.userId || 'UNKNOWN',
        organization: sessionData.organization || 'SV',
        officeId: sessionData.officeId || 'RUHSV0401',
        gds: sessionData.gds || 'AMADEUS',
        prohibitedList: 'SITE_JCPCRYPTIC_PROHIBITED_COMMANDS_LIST_1',
        extractedAt: new Date().toISOString(),
        isValid: true
      };

      // التحقق من صحة تنسيق البيانات
      if (completeSession.jSessionId && !this.isValidSessionId(completeSession.jSessionId)) {
        console.warn('⚠️ تنسيق jSessionId غير صحيح');
      }

      if (completeSession.contextId && !this.isValidContextId(completeSession.contextId)) {
        console.warn('⚠️ تنسيق contextId غير صحيح');
      }

      console.log('✅ تم التحقق من بيانات الجلسة بنجاح:', {
        hasSessionId: !!completeSession.jSessionId,
        hasContextId: !!completeSession.contextId,
        userId: completeSession.userId,
        organization: completeSession.organization
      });

      return completeSession;
    } catch (error) {
      console.error('خطأ في التحقق من بيانات الجلسة:', error);
      return null;
    }
  }

  /**
   * التحقق من صحة تنسيق Session ID
   */
  isValidSessionId(sessionId) {
    // تنسيق Session ID المتوقع: حروف وأرقام مع رموز خاصة
    const sessionIdPattern = /^[A-Za-z0-9_\-!]+$/;
    return sessionIdPattern.test(sessionId) && sessionId.length > 10;
  }

  /**
   * التحقق من صحة تنسيق Context ID
   */
  isValidContextId(contextId) {
    // تنسيق Context ID المتوقع: يحتوي على نقاط وفواصل
    return contextId.includes('.') && contextId.length > 10;
  }

  /**
   * الحصول على بيانات الجلسة الحالية
   */
  getSessionData() {
    return this.sessionData;
  }

  /**
   * التحقق من صحة الجلسة
   */
  isSessionValid() {
    if (!this.sessionData || !this.isValid) {
      return false;
    }

    // التحقق من انتهاء صلاحية الجلسة (بعد ساعة من الاستخراج)
    if (this.lastExtracted) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (this.lastExtracted < oneHourAgo) {
        console.warn('⚠️ انتهت صلاحية بيانات الجلسة');
        return false;
      }
    }

    return true;
  }

  /**
   * تحديث بيانات الجلسة يدوياً
   */
  updateSessionData(newData) {
    try {
      if (newData && typeof newData === 'object') {
        this.sessionData = { ...this.sessionData, ...newData };
        this.lastExtracted = new Date();
        this.isValid = true;
        console.log('✅ تم تحديث بيانات الجلسة يدوياً');
        return true;
      }
      return false;
    } catch (error) {
      console.error('خطأ في تحديث بيانات الجلسة:', error);
      return false;
    }
  }

  /**
   * مسح بيانات الجلسة
   */
  clearSession() {
    this.sessionData = null;
    this.isValid = false;
    this.lastExtracted = null;
    console.log('🧹 تم مسح بيانات الجلسة');
  }
}

// تصدير الكلاس للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
} else {
  window.SessionManager = SessionManager;
}