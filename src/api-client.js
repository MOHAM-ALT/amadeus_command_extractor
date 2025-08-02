/**
 * API Client - التواصل مع Amadeus API
 * إرسال أوامر HE واستقبال الاستجابات
 */

class AmadeusAPIClient {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.baseURL = 'https://uat10.resdesktop.altea.amadeus.com/cryptic/apfplus/modules/cryptic/cryptic';
    this.defaultParams = 'SITE=ASVBASVB&LANGUAGE=GB&OCTX=ARDW_PDT_WBP';
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimitDelay = 1000; // تأخير بين الطلبات (بالميللي ثانية)
    this.maxRetries = 3;
    this.requestHistory = [];
  }

  /**
   * إرسال أمر HE واحد إلى Amadeus
   * @param {string} command - الأمر المراد تنفيذه (مثل: "HE AN")
   * @returns {Promise<Object>} استجابة الأمر
   */
  async sendHECommand(command) {
    try {
      console.log(`📤 إرسال أمر: ${command}`);

      // التحقق من صحة الجلسة
      if (!this.sessionManager.isSessionValid()) {
        console.log('🔄 إعادة استخراج بيانات الجلسة...');
        await this.sessionManager.extractSessionData();
        
        if (!this.sessionManager.isSessionValid()) {
          throw new Error('بيانات الجلسة غير صحيحة أو منتهية الصلاحية');
        }
      }

      const sessionData = this.sessionManager.getSessionData();
      
      // إنشاء payload للطلب
      const requestPayload = this.buildRequestPayload(command, sessionData);
      
      // إرسال الطلب
      const response = await this.makeRequest(requestPayload);
      
      // معالجة الاستجابة
      const processedResponse = this.processResponse(command, response);
      
      // حفظ في التاريخ
      this.addToHistory(command, requestPayload, processedResponse);
      
      return processedResponse;

    } catch (error) {
      console.error(`❌ خطأ في إرسال أمر ${command}:`, error);
      
      // حفظ الخطأ في التاريخ
      this.addToHistory(command, null, { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { 
        success: false, 
        command: command,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * إنشاء payload للطلب
   */
  buildRequestPayload(command, sessionData) {
    return {
      jSessionId: sessionData.jSessionId,
      contextId: sessionData.contextId,
      userId: sessionData.userId,
      organization: sessionData.organization,
      officeId: sessionData.officeId,
      gds: sessionData.gds,
      tasks: [{
        type: "CRY",
        command: {
          command: command,
          prohibitedList: sessionData.prohibitedList
        }
      }]
    };
  }

  /**
   * إرسال الطلب الفعلي
   */
  async makeRequest(payload, retryCount = 0) {
    try {
      const fullURL = `${this.baseURL}?${this.defaultParams}`;
      
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload),
        credentials: 'include' // لإرسال cookies الجلسة
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`❌ خطأ في الطلب (محاولة ${retryCount + 1}/${this.maxRetries}):`, error);
      
      // إعادة المحاولة في حالة الفشل
      if (retryCount < this.maxRetries - 1) {
        console.log(`🔄 إعادة المحاولة بعد ${this.rateLimitDelay}ms...`);
        await this.delay(this.rateLimitDelay);
        return this.makeRequest(payload, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * معالجة استجابة API
   */
  processResponse(command, rawResponse) {
    try {
      const processedResponse = {
        success: true,
        command: command,
        timestamp: new Date().toISOString(),
        rawResponse: rawResponse
      };

      // استخراج النص من الاستجابة
      if (rawResponse && 
          rawResponse.model && 
          rawResponse.model.output && 
          rawResponse.model.output.crypticResponse) {
        
        const crypticResponse = rawResponse.model.output.crypticResponse;
        
        processedResponse.responseText = crypticResponse.response;
        processedResponse.commandEcho = crypticResponse.command;
        processedResponse.hasContent = !!(crypticResponse.response && crypticResponse.response.trim());
        
        // تحليل نوع الاستجابة
        processedResponse.responseType = this.analyzeResponseType(crypticResponse.response);
        
        // استخراج المعلومات المهمة
        processedResponse.extractedInfo = this.extractImportantInfo(crypticResponse.response);
        
        console.log(`✅ تم معالجة استجابة ${command} بنجاح`);
        
      } else {
        processedResponse.success = false;
        processedResponse.error = 'تنسيق استجابة غير متوقع';
        processedResponse.hasContent = false;
        
        console.warn(`⚠️ تنسيق استجابة غير متوقع للأمر ${command}`);
      }

      return processedResponse;

    } catch (error) {
      console.error(`❌ خطأ في معالجة استجابة ${command}:`, error);
      
      return {
        success: false,
        command: command,
        error: `خطأ في معالجة الاستجابة: ${error.message}`,
        timestamp: new Date().toISOString(),
        rawResponse: rawResponse
      };
    }
  }

  /**
   * تحليل نوع الاستجابة
   */
  analyzeResponseType(responseText) {
    if (!responseText || typeof responseText !== 'string') {
      return 'empty';
    }

    const text = responseText.toLowerCase();
    
    if (text.includes('command not recognized') || 
        text.includes('invalid entry') ||
        text.includes('not authorized')) {
      return 'error';
    }
    
    if (text.includes('format') && text.includes('reference')) {
      return 'help_documentation';
    }
    
    if (text.includes('explanation') && text.includes('ms106')) {
      return 'standard_help';
    }
    
    if (text.includes('task') && text.includes('----')) {
      return 'command_list';
    }
    
    return 'unknown';
  }

  /**
   * استخراج المعلومات المهمة من الاستجابة
   */
  extractImportantInfo(responseText) {
    const info = {
      title: null,
      tasks: [],
      examples: [],
      references: [],
      notes: []
    };

    if (!responseText) return info;

    try {
      const lines = responseText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // استخراج العنوان
        if (line.includes('EN ') && line.includes('Z') && !info.title) {
          info.title = line;
        }
        
        // استخراج المهام
        if (line.includes('TASK') || line.includes('FORMAT') || line.includes('REFERENCE')) {
          // تجاهل سطر العناوين
          continue;
        }
        
        if (line.includes('----')) {
          // تجاهل سطر الفواصل
          continue;
        }
        
        // استخراج الأمثلة والمراجع
        if (line.length > 10 && !line.includes('>')) {
          const parts = line.split(/\s{2,}/); // تقسيم على أساس مسافات متعددة
          
          if (parts.length >= 2) {
            const task = parts[0]?.trim();
            const format = parts[1]?.trim();
            const reference = parts[2]?.trim();
            
            if (task && format) {
              info.tasks.push({
                task: task,
                format: format,
                reference: reference || ''
              });
            }
          }
        }
        
        // استخراج الملاحظات
        if (line.startsWith('NOTE:') || line.includes('PLEASE ENTER:')) {
          info.notes.push(line);
        }
      }
      
    } catch (error) {
      console.error('خطأ في استخراج المعلومات:', error);
    }

    return info;
  }

  /**
   * إضافة سجل للتاريخ
   */
  addToHistory(command, request, response) {
    const historyEntry = {
      command: command,
      timestamp: new Date().toISOString(),
      request: request,
      response: response,
      success: response && response.success,
      duration: null
    };

    this.requestHistory.push(historyEntry);
    
    // الاحتفاظ بآخر 1000 سجل فقط
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }
  }

  /**
   * إرسال متعدد للأوامر مع التحكم في المعدل
   * @param {Array<string>} commands - قائمة الأوامر
   * @param {Function} progressCallback - دالة لتتبع التقدم
   * @param {Object} options - خيارات الإرسال
   */
  async sendMultipleCommands(commands, progressCallback = null, options = {}) {
    const {
      batchSize = 5,
      delayBetweenBatches = 1000,
      stopOnError = false,
      maxConcurrent = 3
    } = options;

    console.log(`🚀 بدء إرسال ${commands.length} أمر...`);
    
    const results = [];
    const errors = [];
    let processed = 0;

    try {
      // تقسيم الأوامر إلى دفعات
      for (let i = 0; i < commands.length; i += batchSize) {
        const batch = commands.slice(i, i + batchSize);
        console.log(`📦 معالجة دفعة ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
        
        // معالجة الدفعة الحالية
        const batchPromises = batch.map(async (command) => {
          try {
            const result = await this.sendHECommand(command);
            processed++;
            
            // تحديث التقدم
            if (progressCallback) {
              progressCallback({
                current: processed,
                total: commands.length,
                command: command,
                success: result.success,
                percentage: Math.round((processed / commands.length) * 100)
              });
            }
            
            return result;
          } catch (error) {
            processed++;
            const errorResult = {
              success: false,
              command: command,
              error: error.message,
              timestamp: new Date().toISOString()
            };
            
            errors.push(errorResult);
            
            if (progressCallback) {
              progressCallback({
                current: processed,
                total: commands.length,
                command: command,
                success: false,
                error: error.message,
                percentage: Math.round((processed / commands.length) * 100)
              });
            }
            
            if (stopOnError) {
              throw error;
            }
            
            return errorResult;
          }
        });

        // انتظار اكتمال الدفعة
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // تأخير بين الدفعات (إلا في الدفعة الأخيرة)
        if (i + batchSize < commands.length) {
          console.log(`⏳ انتظار ${delayBetweenBatches}ms قبل الدفعة التالية...`);
          await this.delay(delayBetweenBatches);
        }
      }

      console.log(`✅ تم الانتهاء من معالجة جميع الأوامر. النجاح: ${results.filter(r => r.success).length}/${commands.length}`);
      
      return {
        success: true,
        totalCommands: commands.length,
        successfulCommands: results.filter(r => r.success).length,
        failedCommands: errors.length,
        results: results,
        errors: errors,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ خطأ في معالجة الأوامر المتعددة:', error);
      
      return {
        success: false,
        error: error.message,
        totalCommands: commands.length,
        processedCommands: processed,
        results: results,
        errors: errors,
        failedAt: new Date().toISOString()
      };
    }
  }

  /**
   * تأخير بالميللي ثانية
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * اختبار الاتصال مع API
   */
  async testConnection() {
    try {
      console.log('🔍 اختبار الاتصال مع Amadeus API...');
      
      // اختبار بأمر بسيط
      const testResult = await this.sendHECommand('HE HELP');
      
      if (testResult.success) {
        console.log('✅ الاتصال مع API يعمل بشكل صحيح');
        return { success: true, message: 'الاتصال ناجح' };
      } else {
        console.warn('⚠️ مشكلة في الاتصال مع API');
        return { success: false, message: testResult.error };
      }
      
    } catch (error) {
      console.error('❌ فشل اختبار الاتصال:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * الحصول على إحصائيات الطلبات
   */
  getRequestStatistics() {
    const total = this.requestHistory.length;
    const successful = this.requestHistory.filter(r => r.success).length;
    const failed = total - successful;
    
    const recentRequests = this.requestHistory.slice(-10);
    const averageResponseTime = this.calculateAverageResponseTime();
    
    return {
      total: total,
      successful: successful,
      failed: failed,
      successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      recentRequests: recentRequests,
      averageResponseTime: averageResponseTime,
      lastRequest: this.requestHistory[this.requestHistory.length - 1] || null
    };
  }

  /**
   * حساب متوسط وقت الاستجابة
   */
  calculateAverageResponseTime() {
    const requestsWithDuration = this.requestHistory.filter(r => r.duration !== null);
    
    if (requestsWithDuration.length === 0) {
      return 0;
    }
    
    const totalDuration = requestsWithDuration.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(totalDuration / requestsWithDuration.length);
  }

  /**
   * مسح تاريخ الطلبات
   */
  clearHistory() {
    this.requestHistory = [];
    console.log('🧹 تم مسح تاريخ الطلبات');
  }

  /**
   * تحديث معدل التأخير
   */
  setRateLimit(delayMs) {
    this.rateLimitDelay = Math.max(100, Math.min(10000, delayMs));
    console.log(`⚙️ تم تحديث معدل التأخير إلى ${this.rateLimitDelay}ms`);
  }

  /**
   * الحصول على حالة العميل
   */
  getClientStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.requestQueue.length,
      rateLimitDelay: this.rateLimitDelay,
      maxRetries: this.maxRetries,
      sessionValid: this.sessionManager.isSessionValid(),
      requestHistory: this.requestHistory.length,
      lastActivity: this.requestHistory.length > 0 
        ? this.requestHistory[this.requestHistory.length - 1].timestamp 
        : null
    };
  }

  /**
   * إيقاف جميع العمليات الجارية
   */
  stop() {
    this.isProcessing = false;
    this.requestQueue = [];
    console.log('🛑 تم إيقاف جميع عمليات API Client');
  }
}

// تصدير الكلاس للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmadeusAPIClient;
} else {
  window.AmadeusAPIClient = AmadeusAPIClient;
}