/**
 * Utils - دوال مساعدة عامة ومشتركة
 * مجموعة من الدوال المفيدة المستخدمة عبر المشروع
 */

const Utils = {
  
  /**
   * دوال التحقق والتصديق
   */
  validation: {
    /**
     * التحقق من صحة أمر Amadeus
     */
    isValidAmadeusCommand(command) {
      if (!command || typeof command !== 'string') return false;
      
      const trimmed = command.trim().toUpperCase();
      
      // يجب أن يبدأ بـ HE
      if (!trimmed.startsWith('HE ')) return false;
      
      // طول الأمر يجب أن يكون معقول
      if (trimmed.length < 4 || trimmed.length > 50) return false;
      
      // لا يحتوي على رموز غير مسموحة
      const allowedPattern = /^HE [A-Z0-9\s\/\*\-_]+$/;
      return allowedPattern.test(trimmed);
    },

    /**
     * التحقق من صحة استجابة Amadeus
     */
    isValidResponse(response) {
      if (!response) return false;
      
      // التحقق من الهيكل الأساسي
      if (typeof response === 'string') {
        return response.trim().length > 0;
      }
      
      if (typeof response === 'object') {
        return response.model && 
               response.model.output && 
               response.model.output.crypticResponse;
      }
      
      return false;
    },

    /**
     * التحقق من بيانات الجلسة
     */
    isValidSessionData(sessionData) {
      if (!sessionData || typeof sessionData !== 'object') return false;
      
      const requiredFields = ['jSessionId', 'contextId', 'userId', 'gds'];
      return requiredFields.every(field => 
        sessionData[field] && typeof sessionData[field] === 'string'
      );
    },

    /**
     * التحقق من URL
     */
    isValidURL(url) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * التحقق من أن النص يحتوي على محتوى مفيد
     */
    hasValidContent(text) {
      if (!text || typeof text !== 'string') return false;
      
      const cleaned = text.trim();
      if (cleaned.length < 10) return false;
      
      // فحص وجود كلمات مفيدة
      const meaningfulWords = ['TASK', 'FORMAT', 'REFERENCE', 'EXPLANATION', 'COMMAND'];
      return meaningfulWords.some(word => cleaned.includes(word));
    }
  },

  /**
   * دوال التنسيق والتحويل
   */
  formatting: {
    /**
     * تنسيق أمر Amadeus
     */
    formatCommand(command) {
      if (!command) return '';
      return command.toString().trim().toUpperCase();
    },

    /**
     * تنسيق الوقت بصيغة قابلة للقراءة
     */
    formatDuration(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}س ${minutes % 60}د ${seconds % 60}ث`;
      } else if (minutes > 0) {
        return `${minutes}د ${seconds % 60}ث`;
      } else {
        return `${seconds}ث`;
      }
    },

    /**
     * تنسيق حجم الملف
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 بايت';
      
      const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      
      return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    },

    /**
     * تنسيق التاريخ والوقت
     */
    formatDateTime(date, locale = 'ar-SA') {
      if (!date) return '';
      
      const dateObj = date instanceof Date ? date : new Date(date);
      
      return {
        date: dateObj.toLocaleDateString(locale),
        time: dateObj.toLocaleTimeString(locale),
        full: dateObj.toLocaleString(locale),
        iso: dateObj.toISOString(),
        relative: this.getRelativeTime(dateObj)
      };
    },

    /**
     * حساب الوقت النسبي
     */
    getRelativeTime(date) {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays < 30) return `منذ ${diffDays} يوم`;
      
      return date.toLocaleDateString('ar-SA');
    },

    /**
     * تنسيق النسبة المئوية
     */
    formatPercentage(value, decimals = 1) {
      if (isNaN(value)) return '0%';
      return `${Number(value).toFixed(decimals)}%`;
    },

    /**
     * تنظيف النص من الرموز الخاصة
     */
    sanitizeText(text) {
      if (!text) return '';
      
      return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // رموز التحكم
        .replace(/\s+/g, ' ') // مسافات متعددة
        .trim();
    },

    /**
     * اختصار النص
     */
    truncateText(text, maxLength = 100, suffix = '...') {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength - suffix.length) + suffix;
    }
  },

  /**
   * دوال المعالجة والتحليل
   */
  processing: {
    /**
     * تجميع العناصر حسب خاصية
     */
    groupBy(array, key) {
      return array.reduce((result, item) => {
        const group = typeof key === 'function' ? key(item) : item[key];
        if (!result[group]) result[group] = [];
        result[group].push(item);
        return result;
      }, {});
    },

    /**
     * ترتيب العناصر حسب عدة معايير
     */
    sortBy(array, ...keys) {
      return array.slice().sort((a, b) => {
        for (const key of keys) {
          let aVal, bVal;
          
          if (typeof key === 'function') {
            aVal = key(a);
            bVal = key(b);
          } else if (typeof key === 'string') {
            aVal = a[key];
            bVal = b[key];
          } else {
            continue;
          }
          
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
        }
        return 0;
      });
    },

    /**
     * إزالة المعلومات الحساسة من النص
     */
    sanitizeForLogging(text) {
      if (!text) return '';
      
      return text
        .replace(/jSessionId["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'jSessionId: [REDACTED]')
        .replace(/contextId["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'contextId: [REDACTED]')
        .replace(/password["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'password: [REDACTED]')
        .replace(/token["\s]*[:=]["\s]*[^"'\s,}]+/gi, 'token: [REDACTED]');
    }
  },

  /**
   * دوال غير متزامنة ومساعدة
   */
  async: {
    /**
     * تأخير لفترة محددة
     */
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * تنفيذ دالة مع timeout
     */
    withTimeout(promise, timeoutMs, timeoutMessage = 'انتهت مهلة العملية') {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        )
      ]);
    },

    /**
     * إعادة المحاولة مع تأخير متزايد
     */
    async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (attempt === maxRetries) throw error;
          
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`المحاولة ${attempt} فشلت، إعادة المحاولة خلال ${delay}ms...`);
          await this.delay(delay);
        }
      }
    },

    /**
     * تنفيذ مهام متوازية مع تحديد عدد أقصى
     */
    async parallelLimit(tasks, limit = 5) {
      const results = [];
      const executing = [];

      for (const task of tasks) {
        const promise = Promise.resolve().then(task);
        results.push(promise);

        if (tasks.length >= limit) {
          executing.push(promise.then(() => 
            executing.splice(executing.indexOf(promise), 1)
          ));
        }

        if (executing.length >= limit) {
          await Promise.race(executing);
        }
      }

      return Promise.all(results);
    },

    /**
     * دبوقنس - تأخير تنفيذ الدالة
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * ثروتل - تحديد معدل تنفيذ الدالة
     */
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  },

  /**
   * دوال الملفات والتصدير
   */
  files: {
    /**
     * تحميل ملف نصي
     */
    downloadText(content, filename, mimeType = 'text/plain') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /**
     * تحميل ملف JSON
     */
    downloadJSON(data, filename) {
      const content = JSON.stringify(data, null, 2);
      this.downloadText(content, filename, 'application/json');
    },

    /**
     * تحميل ملف CSV
     */
    downloadCSV(data, filename) {
      let csv = '';
      
      if (Array.isArray(data) && data.length > 0) {
        // استخراج العناوين
        const headers = Object.keys(data[0]);
        csv += headers.join(',') + '\n';
        
        // إضافة البيانات
        data.forEach(row => {
          const values = headers.map(header => {
            let value = row[header] || '';
            // تنظيف القيم وإضافة علامات الاقتباس إذا لزم الأمر
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
          });
          csv += values.join(',') + '\n';
        });
      }
      
      this.downloadText(csv, filename, 'text/csv');
    },

    /**
     * قراءة ملف محلي
     */
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },

    /**
     * ضغط البيانات (تحويل إلى base64 مضغوط)
     */
    compressData(data) {
      try {
        const jsonString = JSON.stringify(data);
        return btoa(jsonString);
      } catch (error) {
        console.error('خطأ في ضغط البيانات:', error);
        return null;
      }
    },

    /**
     * إلغاء ضغط البيانات
     */
    decompressData(compressedData) {
      try {
        const jsonString = atob(compressedData);
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('خطأ في إلغاء ضغط البيانات:', error);
        return null;
      }
    }
  },

  /**
   * دوال السجلات والمراقبة
   */
  logging: {
    /**
     * إنشاء logger مخصص
     */
    createLogger(prefix = 'AmadeusExtractor') {
      const timestamp = () => new Date().toISOString();
      
      return {
        info: (message, ...args) => {
          console.log(`[${timestamp()}] [${prefix}] ℹ️ ${message}`, ...args);
        },
        warn: (message, ...args) => {
          console.warn(`[${timestamp()}] [${prefix}] ⚠️ ${message}`, ...args);
        },
        error: (message, ...args) => {
          console.error(`[${timestamp()}] [${prefix}] ❌ ${message}`, ...args);
        },
        debug: (message, ...args) => {
          if (console.debug) {
            console.debug(`[${timestamp()}] [${prefix}] 🐛 ${message}`, ...args);
          }
        },
        success: (message, ...args) => {
          console.log(`[${timestamp()}] [${prefix}] ✅ ${message}`, ...args);
        }
      };
    },

    /**
     * قياس وقت تنفيذ العملية
     */
    measureTime(label) {
      const start = performance.now();
      
      return {
        end: () => {
          const duration = performance.now() - start;
          console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
          return duration;
        }
      };
    },

    /**
     * مراقب الأداء
     */
    performanceMonitor: {
      marks: new Map(),
      
      mark(name) {
        this.marks.set(name, performance.now());
      },
      
      measure(name, startMark) {
        const startTime = this.marks.get(startMark);
        if (startTime) {
          const duration = performance.now() - startTime;
          console.log(`📊 ${name}: ${duration.toFixed(2)}ms`);
          return duration;
        }
        return null;
      },
      
      getMemoryUsage() {
        if (performance.memory) {
          return {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          };
        }
        return null;
      }
    }
  },

  /**
   * دوال التحليل والإحصائيات
   */
  analytics: {
    /**
     * حساب الإحصائيات الأساسية
     */
    calculateStats(numbers) {
      if (!Array.isArray(numbers) || numbers.length === 0) {
        return null;
      }
      
      const sorted = numbers.slice().sort((a, b) => a - b);
      const sum = numbers.reduce((a, b) => a + b, 0);
      const mean = sum / numbers.length;
      
      return {
        count: numbers.length,
        sum: sum,
        mean: mean,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        range: sorted[sorted.length - 1] - sorted[0],
        variance: numbers.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / numbers.length,
        standardDeviation: Math.sqrt(numbers.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / numbers.length)
      };
    },

    /**
     * حساب معدل النجاح
     */
    calculateSuccessRate(successful, total) {
      if (total === 0) return 0;
      return Math.round((successful / total) * 100 * 100) / 100; // دقة عشرية
    },

    /**
     * تحليل الاتجاهات
     */
    analyzeTrend(data, timeField = 'timestamp') {
      if (!Array.isArray(data) || data.length < 2) return null;
      
      const sorted = data.slice().sort((a, b) => 
        new Date(a[timeField]) - new Date(b[timeField])
      );
      
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const timeDiff = new Date(last[timeField]) - new Date(first[timeField]);
      
      return {
        timeSpan: timeDiff,
        dataPoints: sorted.length,
        trend: last.value > first.value ? 'increasing' : 
               last.value < first.value ? 'decreasing' : 'stable',
        changeRate: (last.value - first.value) / timeDiff * (1000 * 60 * 60 * 24) // per day
      };
    }
  },

  /**
   * دوال متنوعة ومفيدة
   */
  misc: {
    /**
     * إنشاء نطاق من الأرقام
     */
    range(start, end, step = 1) {
      const result = [];
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
      return result;
    },

    /**
     * خلط عشوائي للمصفوفة
     */
    shuffle(array) {
      const shuffled = array.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },

    /**
     * اختيار عشوائي من المصفوفة
     */
    randomChoice(array) {
      return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * تحويل النص إلى slug
     */
    slugify(text) {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    /**
     * تحويل الكلمة الأولى لحرف كبير
     */
    capitalize(text) {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    /**
     * تحويل النص إلى camelCase
     */
    camelCase(text) {
      return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');
    },

    /**
     * فحص ما إذا كان المتغير دالة
     */
    isFunction(value) {
      return typeof value === 'function';
    },

    /**
     * فحص ما إذا كان المتغير promise
     */
    isPromise(value) {
      return value && typeof value.then === 'function';
    },

    /**
     * تحويل قائمة إلى خريطة
     */
    arrayToMap(array, keyField = 'id') {
      return array.reduce((map, item) => {
        const key = typeof keyField === 'function' ? keyField(item) : item[keyField];
        map[key] = item;
        return map;
      }, {});
    },

    /**
     * دمج المصفوفات وإزالة المكررات
     */
    mergeArrays(...arrays) {
      return [...new Set(arrays.flat())];
    },

    /**
     * تحويل كائن إلى query string
     */
    objectToQueryString(obj) {
      return Object.entries(obj)
        .filter(([_, value]) => value != null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    },

    /**
     * تحويل query string إلى كائن
     */
    queryStringToObject(queryString) {
      const params = new URLSearchParams(queryString);
      const obj = {};
      for (const [key, value] of params) {
        obj[key] = value;
      }
      return obj;
    }
  },

  /**
   * دوال التوافق مع المتصفحات
   */
  browser: {
    /**
     * فحص دعم ميزة معينة
     */
    supportsFeature(feature) {
      const features = {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof Storage !== 'undefined',
        webWorkers: typeof Worker !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        modules: 'import' in document.createElement('script'),
        chromeExtensions: typeof chrome !== 'undefined' && chrome.runtime
      };
      
      return features[feature] || false;
    },

    /**
     * الحصول على معلومات المتصفح
     */
    getBrowserInfo() {
      const ua = navigator.userAgent;
      
      return {
        userAgent: ua,
        isChrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
        isFirefox: /Firefox/.test(ua),
        isEdge: /Edg/.test(ua),
        isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    },

    /**
     * فحص ما إذا كان Extension
     */
    isExtensionContext() {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id;
    },

    /**
     * فحص ما إذا كان content script
     */
    isContentScript() {
      return this.isExtensionContext() && 
             typeof document !== 'undefined' && 
             document.location.protocol.startsWith('http');
    }
  }
};

// تصدير للاستخدام
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
}ة العناصر المكررة
     */
    unique(array, key) {
      if (!key) return [...new Set(array)];
      
      const seen = new Set();
      return array.filter(item => {
        const value = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    },

    /**
     * تقسيم المصفوفة إلى دفعات
     */
    chunk(array, size) {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    },

    /**
     * تصفية وتنظيف البيانات
     */
    cleanData(data, options = {}) {
      const {
        removeEmpty = true,
        removeNull = true,
        trimStrings = true,
        convertNumbers = false
      } = options;

      if (Array.isArray(data)) {
        return data
          .map(item => this.cleanData(item, options))
          .filter(item => {
            if (removeEmpty && (item === '' || (Array.isArray(item) && item.length === 0))) return false;
            if (removeNull && (item === null || item === undefined)) return false;
            return true;
          });
      }

      if (data && typeof data === 'object') {
        const cleaned = {};
        Object.entries(data).forEach(([key, value]) => {
          const cleanedValue = this.cleanData(value, options);
          if (removeEmpty && cleanedValue === '') return;
          if (removeNull && (cleanedValue === null || cleanedValue === undefined)) return;
          cleaned[key] = cleanedValue;
        });
        return cleaned;
      }

      if (typeof data === 'string') {
        let result = trimStrings ? data.trim() : data;
        if (convertNumbers && !isNaN(result) && result !== '') {
          return Number(result);
        }
        return result;
      }

      return data;
    },

    /**
     * دمج الكائنات بعمق
     */
    deepMerge(target, ...sources) {
      if (!sources.length) return target;
      const source = sources.shift();

      if (this.isObject(target) && this.isObject(source)) {
        Object.keys(source).forEach(key => {
          if (this.isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            this.deepMerge(target[key], source[key]);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        });
      }

      return this.deepMerge(target, ...sources);
    },

    /**
     * نسخ عميقة للكائن
     */
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => this.deepClone(item));
      if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
          cloned[key] = this.deepClone(obj[key]);
        });
        return cloned;
      }
      return obj;
    },

    /**
     * فحص ما إذا كان الكائن فارغ
     */
    isEmpty(value) {
      if (value == null) return true;
      if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    },

    /**
     * فحص نوع الكائن
     */
    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    }
  },

  /**
   * دوال التخزين والاسترجاع
   */
  storage: {
    /**
     * حفظ في Chrome Storage
     */
    async save(key, data) {
      try {
        if (chrome && chrome.storage) {
          await chrome.storage.local.set({ [key]: data });
          return true;
        } else {
          // Fallback إلى localStorage
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        }
      } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        return false;
      }
    },

    /**
     * قراءة من Chrome Storage
     */
    async load(key) {
      try {
        if (chrome && chrome.storage) {
          const result = await chrome.storage.local.get(key);
          return result[key] || null;
        } else {
          // Fallback إلى localStorage
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        }
      } catch (error) {
        console.error('خطأ في قراءة البيانات:', error);
        return null;
      }
    },

    /**
     * حذف من Chrome Storage
     */
    async remove(key) {
      try {
        if (chrome && chrome.storage) {
          await chrome.storage.local.remove(key);
        } else {
          localStorage.removeItem(key);
        }
        return true;
      } catch (error) {
        console.error('خطأ في حذف البيانات:', error);
        return false;
      }
    },

    /**
     * مسح جميع البيانات
     */
    async clear() {
      try {
        if (chrome && chrome.storage) {
          await chrome.storage.local.clear();
        } else {
          localStorage.clear();
        }
        return true;
      } catch (error) {
        console.error('خطأ في مسح البيانات:', error);
        return false;
      }
    },

    /**
     * الحصول على حجم البيانات المحفوظة
     */
    async getStorageSize() {
      try {
        let totalSize = 0;
        
        if (chrome && chrome.storage) {
          const data = await chrome.storage.local.get();
          totalSize = JSON.stringify(data).length;
        } else {
          for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              totalSize += localStorage[key].length;
            }
          }
        }
        
        return totalSize;
      } catch (error) {
        console.error('خطأ في حساب حجم البيانات:', error);
        return 0;
      }
    }
  },

  /**
   * دوال الشبكة والاتصال
   */
  network: {
    /**
     * إرسال طلب HTTP مع إعادة المحاولة
     */
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
      const {
        retryDelay = 1000,
        timeout = 10000,
        ...fetchOptions
      } = options;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return response;
          } else if (attempt === maxRetries) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          if (attempt === maxRetries) {
            throw error;
          }
          
          console.warn(`محاولة ${attempt} فشلت، إعادة المحاولة خلال ${retryDelay}ms...`);
          await Utils.async.delay(retryDelay);
        }
      }
    },

    /**
     * فحص حالة الاتصال
     */
    isOnline() {
      return navigator.onLine;
    },

    /**
     * انتظار عودة الاتصال
     */
    async waitForConnection(timeout = 30000) {
      return new Promise((resolve, reject) => {
        if (this.isOnline()) {
          resolve(true);
          return;
        }

        const timeoutId = setTimeout(() => {
          window.removeEventListener('online', onOnline);
          reject(new Error('انتهت مهلة انتظار الاتصال'));
        }, timeout);

        const onOnline = () => {
          clearTimeout(timeoutId);
          window.removeEventListener('online', onOnline);
          resolve(true);
        };

        window.addEventListener('online', onOnline);
      });
    }
  },

  /**
   * دوال التشفير والأمان
   */
  security: {
    /**
     * إنشاء هاش من النص
     */
    async generateHash(text) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * إنشاء معرف فريد
     */
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    /**
     * تشفير بسيط للبيانات الحساسة
     */
    encode(text) {
      return btoa(encodeURIComponent(text));
    },

    /**
     * فك التشفير
     */
    decode(encodedText) {
      try {
        return decodeURIComponent(atob(encodedText));
      } catch (error) {
        return null;
      }
    },

    /**
     * إزال