/**
 * Command Processor - معالج الأوامر بالدفعات
 * يدير تنفيذ جميع أوامر HE مع التحكم في السرعة والإيقاف
 */

class CommandProcessor {
  constructor(apiClient, sessionManager) {
    this.apiClient = apiClient;
    this.sessionManager = sessionManager;
    
    // حالة المعالج
    this.isRunning = false;
    this.isPaused = false;
    this.currentCommand = null;
    this.currentIndex = 0;
    
    // إعدادات المعالجة
    this.settings = {
      batchSize: 5,
      delayBetweenCommands: 1000,
      delayBetweenBatches: 2000,
      maxRetries: 3,
      timeoutPerCommand: 10000,
      skipOnError: false,
      savePartialResults: true
    };
    
    // النتائج والإحصائيات
    this.results = [];
    this.errors = [];
    this.statistics = {
      totalCommands: 0,
      processedCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      startTime: null,
      endTime: null,
      estimatedTimeRemaining: 0
    };
    
    // callbacks للتحديثات
    this.progressCallback = null;
    this.completionCallback = null;
    this.errorCallback = null;
    
    // قائمة الأوامر
    this.commandsList = [];
    this.priorityCommands = [];
  }

  /**
   * تحميل قائمة الأوامر من ملف JSON
   */
  async loadCommands() {
    try {
      console.log('📋 تحميل قائمة أوامر HE...');
      
      // محاولة تحميل من Extension resources
      const commandsData = await this.loadCommandsData();
      
      if (commandsData && commandsData.categories) {
        // استخراج جميع الأوامر من التصنيفات
        this.commandsList = [];
        this.priorityCommands = [];
        
        Object.entries(commandsData.categories).forEach(([categoryKey, category]) => {
          category.commands.forEach(command => {
            this.commandsList.push({
              command: command,
              category: categoryKey,
              categoryName: category.name,
              priority: this.getCommandPriority(command, commandsData.command_details)
            });
            
            // إضافة الأوامر عالية الأولوية لقائمة منفصلة
            const priority = this.getCommandPriority(command, commandsData.command_details);
            if (priority === 'high') {
              this.priorityCommands.push(command);
            }
          });
        });
        
        // ترتيب الأوامر حسب الأولوية
        this.commandsList.sort((a, b) => {
          const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
        
        this.statistics.totalCommands = this.commandsList.length;
        
        console.log(`✅ تم تحميل ${this.commandsList.length} أمر من ${Object.keys(commandsData.categories).length} تصنيف`);
        console.log(`🔥 أوامر عالية الأولوية: ${this.priorityCommands.length}`);
        
        return true;
      } else {
        throw new Error('تنسيق ملف الأوامر غير صحيح');
      }
      
    } catch (error) {
      console.error('❌ خطأ في تحميل قائمة الأوامر:', error);
      
      // استخدام قائمة احتياطية في حالة الفشل
      this.useBackupCommandsList();
      return false;
    }
  }

  /**
   * تحميل بيانات الأوامر
   */
  async loadCommandsData() {
    try {
      // محاولة تحميل من Extension
      if (chrome && chrome.runtime) {
        const response = await fetch(chrome.runtime.getURL('data/he-commands.json'));
        return await response.json();
      }
      
      // محاولة تحميل من مسار نسبي
      const response = await fetch('../data/he-commands.json');
      return await response.json();
      
    } catch (error) {
      console.warn('تعذر تحميل ملف الأوامر، استخدام القائمة الاحتياطية');
      return null;
    }
  }

  /**
   * الحصول على أولوية الأمر
   */
  getCommandPriority(command, commandDetails) {
    if (commandDetails && commandDetails[command]) {
      return commandDetails[command].priority || 'medium';
    }
    
    // تحديد الأولوية بناءً على الأمر نفسه
    if (['HE AN', 'HE SS', 'HE FXP', 'HE TTP', 'HE NM'].includes(command)) {
      return 'high';
    } else if (command.startsWith('HE HELP') || command.startsWith('HE SYS')) {
      return 'low';
    } else {
      return 'medium';
    }
  }

  /**
   * استخدام قائمة احتياطية للأوامر
   */
  useBackupCommandsList() {
    console.log('📋 استخدام القائمة الاحتياطية للأوامر...');
    
    // قائمة الأوامر الأساسية كاحتياط
    const backupCommands = [
      // أوامر عالية الأولوية
      'HE AN', 'HE SS', 'HE FXP', 'HE TTP', 'HE NM', 'HE AP', 'HE SSR',
      // أوامر متوسطة الأولوية  
      'HE NN', 'HE HK', 'HE SA', 'HE SB', 'HE FXX', 'HE TTM', 'HE TTC',
      'HE QUE', 'HE QC', 'HE RM', 'HE RC', 'HE FP', 'HE SM', 'HE ST',
      // أوامر منخفضة الأولوية
      'HE HELP', 'HE SYS', 'HE ERROR', 'HE WARNING', 'HE EXAMPLES'
    ];
    
    this.commandsList = backupCommands.map((command, index) => ({
      command: command,
      category: 'backup',
      categoryName: 'Backup Commands',
      priority: index < 7 ? 'high' : (index < 15 ? 'medium' : 'low')
    }));
    
    this.priorityCommands = backupCommands.slice(0, 7);
    this.statistics.totalCommands = this.commandsList.length;
    
    console.log(`✅ تم تحميل ${this.commandsList.length} أمر من القائمة الاحتياطية`);
  }

  /**
   * بدء معالجة جميع الأوامر
   */
  async startProcessing(options = {}) {
    try {
      console.log('🚀 بدء معالجة أوامر HE...');
      
      // دمج الإعدادات
      this.settings = { ...this.settings, ...options };
      
      // التحقق من تحميل الأوامر
      if (this.commandsList.length === 0) {
        await this.loadCommands();
      }
      
      // التحقق من صحة الجلسة
      if (!this.sessionManager.isSessionValid()) {
        console.log('🔄 استخراج بيانات الجلسة...');
        await this.sessionManager.extractSessionData();
        
        if (!this.sessionManager.isSessionValid()) {
          throw new Error('لا يمكن الحصول على بيانات جلسة صحيحة');
        }
      }
      
      // إعداد المعالجة
      this.isRunning = true;
      this.isPaused = false;
      this.currentIndex = 0;
      this.results = [];
      this.errors = [];
      
      this.statistics = {
        ...this.statistics,
        processedCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        startTime: new Date(),
        endTime: null
      };
      
      console.log(`📊 إجمالي الأوامر: ${this.statistics.totalCommands}`);
      console.log(`⚙️ حجم الدفعة: ${this.settings.batchSize}`);
      console.log(`⏱️ التأخير بين الأوامر: ${this.settings.delayBetweenCommands}ms`);
      
      // بدء المعالجة
      const result = await this.processBatches();
      
      this.statistics.endTime = new Date();
      this.isRunning = false;
      
      console.log('✅ اكتملت معالجة جميع الأوامر');
      
      // استدعاء callback الإكمال
      if (this.completionCallback) {
        this.completionCallback(result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ خطأ في معالجة الأوامر:', error);
      
      this.isRunning = false;
      this.statistics.endTime = new Date();
      
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      
      throw error;
    }
  }

  /**
   * معالجة الأوامر بالدفعات
   */
  async processBatches() {
    const totalBatches = Math.ceil(this.commandsList.length / this.settings.batchSize);
    console.log(`📦 إجمالي الدفعات: ${totalBatches}`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // التحقق من الإيقاف
      if (!this.isRunning) {
        console.log('🛑 تم إيقاف المعالجة');
        break;
      }
      
      // التحقق من الإيقاف المؤقت
      while (this.isPaused && this.isRunning) {
        console.log('⏸️ المعالجة متوقفة مؤقتاً...');
        await this.delay(1000);
      }
      
      const startIndex = batchIndex * this.settings.batchSize;
      const endIndex = Math.min(startIndex + this.settings.batchSize, this.commandsList.length);
      const batch = this.commandsList.slice(startIndex, endIndex);
      
      console.log(`📦 معالجة دفعة ${batchIndex + 1}/${totalBatches}: ${batch.map(c => c.command).join(', ')}`);
      
      // معالجة الدفعة الحالية
      const batchResults = await this.processBatch(batch, batchIndex + 1);
      
      // تحديث النتائج
      this.results.push(...batchResults.results);
      this.errors.push(...batchResults.errors);
      
      // تحديث الإحصائيات
      this.updateStatistics();
      
      // تأخير بين الدفعات (إلا الدفعة الأخيرة)
      if (batchIndex < totalBatches - 1 && this.isRunning) {
        console.log(`⏳ انتظار ${this.settings.delayBetweenBatches}ms قبل الدفعة التالية...`);
        await this.delay(this.settings.delayBetweenBatches);
      }
    }
    
    return this.generateFinalReport();
  }

  /**
   * معالجة دفعة واحدة من الأوامر
   */
  async processBatch(batch, batchNumber) {
    const batchResults = [];
    const batchErrors = [];
    
    for (const commandInfo of batch) {
      // التحقق من الإيقاف
      if (!this.isRunning) break;
      
      // التحقق من الإيقاف المؤقت
      while (this.isPaused && this.isRunning) {
        await this.delay(500);
      }
      
      this.currentCommand = commandInfo.command;
      this.currentIndex++;
      
      console.log(`📤 [${this.currentIndex}/${this.statistics.totalCommands}] تنفيذ: ${this.currentCommand}`);
      
      try {
        // تنفيذ الأمر مع timeout
        const result = await Promise.race([
          this.apiClient.sendHECommand(this.currentCommand),
          this.createTimeout(this.settings.timeoutPerCommand)
        ]);
        
        // إضافة معلومات إضافية للنتيجة
        const enhancedResult = {
          ...result,
          category: commandInfo.category,
          categoryName: commandInfo.categoryName,
          priority: commandInfo.priority,
          batchNumber: batchNumber,
          indexInBatch: batch.indexOf(commandInfo),
          globalIndex: this.currentIndex
        };
        
        batchResults.push(enhancedResult);
        
        if (result.success) {
          this.statistics.successfulCommands++;
          console.log(`✅ [${this.currentIndex}/${this.statistics.totalCommands}] نجح: ${this.currentCommand}`);
        } else {
          this.statistics.failedCommands++;
          batchErrors.push(enhancedResult);
          console.warn(`⚠️ [${this.currentIndex}/${this.statistics.totalCommands}] فشل: ${this.currentCommand} - ${result.error}`);
          
          if (!this.settings.skipOnError && result.error && result.error.includes('CRITICAL')) {
            throw new Error(`خطأ حرج في الأمر ${this.currentCommand}: ${result.error}`);
          }
        }
        
      } catch (error) {
        this.statistics.failedCommands++;
        
        const errorResult = {
          success: false,
          command: this.currentCommand,
          error: error.message,
          category: commandInfo.category,
          categoryName: commandInfo.categoryName,
          priority: commandInfo.priority,
          batchNumber: batchNumber,
          timestamp: new Date().toISOString()
        };
        
        batchErrors.push(errorResult);
        batchResults.push(errorResult);
        
        console.error(`❌ [${this.currentIndex}/${this.statistics.totalCommands}] خطأ: ${this.currentCommand} - ${error.message}`);
      }
      
      this.statistics.processedCommands++;
      
      // تحديث التقدم
      this.updateProgress();
      
      // تأخير بين الأوامر (إلا الأمر الأخير في الدفعة)
      if (batch.indexOf(commandInfo) < batch.length - 1 && this.isRunning) {
        await this.delay(this.settings.delayBetweenCommands);
      }
    }
    
    return { results: batchResults, errors: batchErrors };
  }

  /**
   * تحديث إحصائيات المعالجة
   */
  updateStatistics() {
    const elapsed = new Date() - this.statistics.startTime;
    const averageTimePerCommand = elapsed / this.statistics.processedCommands;
    const remainingCommands = this.statistics.totalCommands - this.statistics.processedCommands;
    
    this.statistics.estimatedTimeRemaining = Math.round(averageTimePerCommand * remainingCommands);
    this.statistics.successRate = this.statistics.processedCommands > 0 
      ? Math.round((this.statistics.successfulCommands / this.statistics.processedCommands) * 100)
      : 0;
    this.statistics.elapsedTime = elapsed;
    this.statistics.averageTimePerCommand = Math.round(averageTimePerCommand);
  }

  /**
   * تحديث التقدم وإشعار المستمعين
   */
  updateProgress() {
    const progress = {
      current: this.statistics.processedCommands,
      total: this.statistics.totalCommands,
      percentage: Math.round((this.statistics.processedCommands / this.statistics.totalCommands) * 100),
      currentCommand: this.currentCommand,
      successful: this.statistics.successfulCommands,
      failed: this.statistics.failedCommands,
      estimatedTimeRemaining: this.statistics.estimatedTimeRemaining,
      successRate: this.statistics.successRate
    };
    
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * إنشاء تقرير نهائي
   */
  generateFinalReport() {
    const duration = this.statistics.endTime - this.statistics.startTime;
    
    const report = {
      success: true,
      summary: {
        totalCommands: this.statistics.totalCommands,
        processedCommands: this.statistics.processedCommands,
        successfulCommands: this.statistics.successfulCommands,
        failedCommands: this.statistics.failedCommands,
        successRate: this.statistics.successRate,
        duration: duration,
        averageTimePerCommand: this.statistics.averageTimePerCommand
      },
      results: this.results,
      errors: this.errors,
      categoryBreakdown: this.generateCategoryBreakdown(),
      priorityBreakdown: this.generatePriorityBreakdown(),
      startTime: this.statistics.startTime,
      endTime: this.statistics.endTime,
      settings: this.settings
    };
    
    console.log('📊 ملخص المعالجة:', report.summary);
    
    return report;
  }

  /**
   * إنشاء تحليل حسب التصنيف
   */
  generateCategoryBreakdown() {
    const breakdown = {};
    
    this.results.forEach(result => {
      const category = result.category || 'unknown';
      
      if (!breakdown[category]) {
        breakdown[category] = {
          total: 0,
          successful: 0,
          failed: 0,
          commands: []
        };
      }
      
      breakdown[category].total++;
      breakdown[category].commands.push(result.command);
      
      if (result.success) {
        breakdown[category].successful++;
      } else {
        breakdown[category].failed++;
      }
    });
    
    // حساب معدل النجاح لكل تصنيف
    Object.keys(breakdown).forEach(category => {
      const cat = breakdown[category];
      cat.successRate = cat.total > 0 ? Math.round((cat.successful / cat.total) * 100) : 0;
    });
    
    return breakdown;
  }

  /**
   * إنشاء تحليل حسب الأولوية
   */
  generatePriorityBreakdown() {
    const breakdown = { high: { total: 0, successful: 0, failed: 0 }, 
                      medium: { total: 0, successful: 0, failed: 0 }, 
                      low: { total: 0, successful: 0, failed: 0 } };
    
    this.results.forEach(result => {
      const priority = result.priority || 'medium';
      
      breakdown[priority].total++;
      
      if (result.success) {
        breakdown[priority].successful++;
      } else {
        breakdown[priority].failed++;
      }
    });
    
    // حساب معدل النجاح لكل أولوية
    Object.keys(breakdown).forEach(priority => {
      const pri = breakdown[priority];
      pri.successRate = pri.total > 0 ? Math.round((pri.successful / pri.total) * 100) : 0;
    });
    
    return breakdown;
  }

  /**
   * إيقاف مؤقت للمعالجة
   */
  pause() {
    this.isPaused = true;
    console.log('⏸️ تم إيقاف المعالجة مؤقتاً');
  }

  /**
   * استكمال المعالجة
   */
  resume() {
    this.isPaused = false;
    console.log('▶️ تم استكمال المعالجة');
  }

  /**
   * إيقاف المعالجة نهائياً
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentCommand = null;
    console.log('🛑 تم إيقاف المعالجة نهائياً');
  }

  /**
   * تحديث إعدادات المعالجة
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ تم تحديث إعدادات المعالجة:', newSettings);
  }

  /**
   * تعيين callback للتقدم
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * تعيين callback للإكمال
   */
  setCompletionCallback(callback) {
    this.completionCallback = callback;
  }

  /**
   * تعيين callback للأخطاء
   */
  setErrorCallback(callback) {
    this.errorCallback = callback;
  }

  /**
   * الحصول على حالة المعالج الحالية
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentCommand: this.currentCommand,
      currentIndex: this.currentIndex,
      statistics: this.statistics,
      settings: this.settings,
      totalCommands: this.commandsList.length
    };
  }

  /**
   * حفظ النتائج الجزئية
   */
  savePartialResults() {
    if (this.settings.savePartialResults && this.results.length > 0) {
      try {
        const partialData = {
          timestamp: new Date().toISOString(),
          processedCommands: this.statistics.processedCommands,
          results: this.results,
          errors: this.errors,
          statistics: this.statistics
        };
        
        // حفظ في chrome.storage إذا متوفر
        if (chrome && chrome.storage) {
          chrome.storage.local.set({ 'amadeus_partial_results': partialData });
        }
        
        console.log('💾 تم حفظ النتائج الجزئية');
      } catch (error) {
        console.error('❌ خطأ في حفظ النتائج الجزئية:', error);
      }
    }
  }

  /**
   * إنشاء timeout promise
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('انتهت مهلة تنفيذ الأمر')), ms);
    });
  }

  /**
   * تأخير بالميللي ثانية
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// تصدير الكلاس للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandProcessor;
} else {
  window.CommandProcessor = CommandProcessor;
}