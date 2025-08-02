/**
 * Response Parser - تنظيف وتحليل استجابات Amadeus
 * يقوم بتنظيف النصوص وتنظيمها وتحليلها لاستخراج المعلومات المفيدة
 */

class ResponseParser {
  constructor() {
    this.patterns = this.initializePatterns();
    this.cleaningRules = this.initializeCleaningRules();
    this.categorizations = this.initializeCategorizations();
  }

  /**
   * تنظيف وتحليل الاستجابة الخام
   * @param {string} rawResponse - النص الخام من Amadeus
   * @param {string} command - الأمر المرسل
   * @returns {Object} الاستجابة المنظفة والمحللة
   */
  parseResponse(rawResponse, command) {
    try {
      if (!rawResponse || typeof rawResponse !== 'string') {
        return this.createEmptyResponse(command, 'empty_response');
      }

      // تنظيف النص الأساسي
      const cleanedText = this.cleanResponse(rawResponse);
      
      // تحليل نوع الاستجابة
      const responseType = this.analyzeResponseType(cleanedText, command);
      
      // استخراج المعلومات المنظمة
      const extractedInfo = this.extractStructuredInfo(cleanedText, responseType);
      
      // تحليل المحتوى
      const contentAnalysis = this.analyzeContent(cleanedText);
      
      // إنشاء الاستجابة النهائية
      const parsedResponse = {
        command: command,
        originalText: rawResponse,
        cleanedText: cleanedText,
        responseType: responseType,
        extractedInfo: extractedInfo,
        contentAnalysis: contentAnalysis,
        metadata: {
          length: cleanedText.length,
          wordCount: this.countWords(cleanedText),
          lineCount: cleanedText.split('\n').length,
          hasExamples: extractedInfo.examples.length > 0,
          hasReferences: extractedInfo.references.length > 0,
          complexity: this.assessComplexity(cleanedText),
          quality: this.assessQuality(extractedInfo, contentAnalysis)
        },
        timestamp: new Date().toISOString()
      };

      return parsedResponse;

    } catch (error) {
      console.error(`خطأ في تحليل استجابة ${command}:`, error);
      return this.createErrorResponse(command, error.message, rawResponse);
    }
  }

  /**
   * تنظيف النص الخام
   */
  cleanResponse(rawText) {
    let cleaned = rawText;

    // تطبيق قواعد التنظيف
    this.cleaningRules.forEach(rule => {
      cleaned = cleaned.replace(rule.pattern, rule.replacement);
    });

    // تنظيف المسافات والأسطر الزائدة
    cleaned = cleaned
      .replace(/\r\n/g, '\n') // توحيد أسطر جديدة
      .replace(/\n{3,}/g, '\n\n') // تقليل الأسطر الفارغة المتعددة
      .replace(/[ \t]+/g, ' ') // تنظيف المسافات المتعددة
      .replace(/^\s+|\s+$/gm, '') // إزالة المسافات من بداية ونهاية كل سطر
      .trim(); // إزالة المسافات من البداية والنهاية

    return cleaned;
  }

  /**
   * تحليل نوع الاستجابة
   */
  analyzeResponseType(text, command) {
    const textLower = text.toLowerCase();

    // فحص الأنماط المختلفة
    for (const [type, pattern] of Object.entries(this.patterns.responseTypes)) {
      if (pattern.test(text) || pattern.test(textLower)) {
        return type;
      }
    }

    // تحليل بناءً على الأمر
    if (command.startsWith('HE ')) {
      return 'help_documentation';
    }

    return 'unknown';
  }

  /**
   * استخراج المعلومات المنظمة
   */
  extractStructuredInfo(text, responseType) {
    const info = {
      title: null,
      description: null,
      sections: [],
      tasks: [],
      examples: [],
      references: [],
      syntax: [],
      notes: [],
      warnings: [],
      seeAlso: []
    };

    try {
      // استخراج العنوان
      info.title = this.extractTitle(text);
      
      // استخراج الوصف
      info.description = this.extractDescription(text);
      
      // استخراج الأقسام
      info.sections = this.extractSections(text);
      
      // استخراج المهام والأوامر
      info.tasks = this.extractTasks(text);
      
      // استخراج الأمثلة
      info.examples = this.extractExamples(text);
      
      // استخراج المراجع
      info.references = this.extractReferences(text);
      
      // استخراج الصيغة النحوية
      info.syntax = this.extractSyntax(text);
      
      // استخراج الملاحظات
      info.notes = this.extractNotes(text);
      
      // استخراج التحذيرات
      info.warnings = this.extractWarnings(text);
      
      // استخراج "انظر أيضاً"
      info.seeAlso = this.extractSeeAlso(text);

    } catch (error) {
      console.error('خطأ في استخراج المعلومات المنظمة:', error);
    }

    return info;
  }

  /**
   * استخراج العنوان
   */
  extractTitle(text) {
    const titlePatterns = [
      /^([A-Z\s/]+)\s+\d+\s+EN\s+\d{2}[A-Z]{3}\d{2}\s+\d{4}Z?$/m,
      /^([A-Z\s&/-]+)\s+\d+/m,
      /^\s*([A-Z][A-Z\s&/-]{10,})\s*$/m
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // استخراج من السطر الأول إذا بدا كعنوان
    const firstLine = text.split('\n')[0];
    if (firstLine && firstLine.length > 10 && firstLine.length < 100 && 
        /^[A-Z\s&/-]+$/.test(firstLine)) {
      return firstLine.trim();
    }

    return null;
  }

  /**
   * استخراج الوصف
   */
  extractDescription(text) {
    const lines = text.split('\n');
    
    // البحث عن وصف بعد العنوان
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (line.length > 20 && line.length < 200 && 
          !line.includes('----') && !line.includes('TASK') &&
          !line.includes('FORMAT') && !line.includes('REFERENCE')) {
        return line;
      }
    }

    return null;
  }

  /**
   * استخراج الأقسام
   */
  extractSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // فحص بداية قسم جديد
      if (this.isSectionHeader(line)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title: line,
          content: [],
          startLine: i
        };
      } else if (currentSection && line) {
        currentSection.content.push(line);
      }
    }

    // إضافة القسم الأخير
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * فحص ما إذا كان السطر عنوان قسم
   */
  isSectionHeader(line) {
    const headerPatterns = [
      /^[A-Z\s]{3,}:$/,
      /^[A-Z][A-Z\s&/-]{5,}$/,
      /^\s*[A-Z]+\s+[A-Z]+.*:?\s*$/
    ];

    return headerPatterns.some(pattern => pattern.test(line));
  }

  /**
   * استخراج المهام
   */
  extractTasks(text) {
    const tasks = [];
    const lines = text.split('\n');
    
    let inTasksSection = false;
    let currentTask = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // فحص بداية قسم المهام
      if (line.includes('TASK') && line.includes('FORMAT') && line.includes('REFERENCE')) {
        inTasksSection = true;
        continue;
      }
      
      // فحص سطر الفواصل
      if (line.includes('----')) {
        continue;
      }
      
      if (inTasksSection && line) {
        // تحليل سطر المهمة
        const taskInfo = this.parseTaskLine(line);
        if (taskInfo) {
          tasks.push(taskInfo);
        }
      }
      
      // نهاية قسم المهام
      if (inTasksSection && (line.includes('>MD') || line.includes('>'))) {
        break;
      }
    }

    return tasks;
  }

  /**
   * تحليل سطر المهمة
   */
  parseTaskLine(line) {
    // تقسيم السطر بناءً على المسافات المتعددة
    const parts = line.split(/\s{2,}/).map(part => part.trim()).filter(part => part);
    
    if (parts.length >= 2) {
      return {
        task: parts[0],
        format: parts[1],
        reference: parts[2] || '',
        fullLine: line
      };
    }
    
    return null;
  }

  /**
   * استخراج الأمثلة
   */
  extractExamples(text) {
    const examples = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // فحص الأنماط المختلفة للأمثلة
      if (this.isExample(trimmed)) {
        examples.push({
          text: trimmed,
          type: this.classifyExample(trimmed)
        });
      }
    }

    return examples;
  }

  /**
   * فحص ما إذا كان السطر مثال
   */
  isExample(line) {
    const examplePatterns = [
      /^[A-Z]{2}\d+[A-Z]{3}[A-Z0-9\/\*]+/, // أمثلة الأوامر
      /^\w+\d+\w+/, // أنماط الرموز
      /^[A-Z]{2}\/[A-Z0-9]+/, // أنماط الخطوط
      /^\*[A-Z0-9]+/ // أنماط خاصة
    ];

    return examplePatterns.some(pattern => pattern.test(line)) && 
           line.length > 5 && line.length < 100;
  }

  /**
   * تصنيف نوع المثال
   */
  classifyExample(example) {
    if (example.includes('*')) return 'round_trip';
    if (/^[A-Z]{2}\d+/.test(example)) return 'availability';
    if (example.includes('/')) return 'route';
    return 'general';
  }

  /**
   * استخراج المراجع
   */
  extractReferences(text) {
    const references = [];
    const referencePattern = /MS\d+/g;
    
    let match;
    while ((match = referencePattern.exec(text)) !== null) {
      if (!references.includes(match[0])) {
        references.push(match[0]);
      }
    }

    return references;
  }

  /**
   * استخراج الصيغة النحوية
   */
  extractSyntax(text) {
    const syntax = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // فحص أنماط الصيغة النحوية
      if (this.isSyntaxLine(trimmed)) {
        syntax.push(trimmed);
      }
    }

    return syntax;
  }

  /**
   * فحص سطر الصيغة النحوية
   */
  isSyntaxLine(line) {
    const syntaxPatterns = [
      /^[A-Z]{2,}[\[\]\/\*\w\s]+$/,
      /.*\[.*\].*/, // يحتوي على أقواس مربعة
      /.*\{.*\}.*/, // يحتوي على أقواس مجعدة
    ];

    return syntaxPatterns.some(pattern => pattern.test(line)) &&
           line.length > 10 && line.length < 150;
  }

  /**
   * استخراج الملاحظات
   */
  extractNotes(text) {
    const notes = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().startsWith('note:') ||
          trimmed.toLowerCase().includes('please enter:') ||
          trimmed.toLowerCase().includes('for an explanation')) {
        notes.push(trimmed);
      }
    }

    return notes;
  }

  /**
   * استخراج التحذيرات
   */
  extractWarnings(text) {
    const warnings = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().includes('warning') ||
          trimmed.toLowerCase().includes('caution') ||
          trimmed.toLowerCase().includes('important')) {
        warnings.push(trimmed);
      }
    }

    return warnings;
  }

  /**
   * استخراج "انظر أيضاً"
   */
  extractSeeAlso(text) {
    const seeAlso = [];
    const seeAlsoPattern = /see\s+also[:\s]+([A-Z\s,]+)/gi;
    
    let match;
    while ((match = seeAlsoPattern.exec(text)) !== null) {
      const items = match[1].split(',').map(item => item.trim()).filter(item => item);
      seeAlso.push(...items);
    }

    return [...new Set(seeAlso)]; // إزالة المكررات
  }

  /**
   * تحليل المحتوى
   */
  analyzeContent(text) {
    return {
      hasFormatInformation: text.includes('FORMAT'),
      hasExamples: /^[A-Z]{2}\d+/.test(text),
      hasReferences: /MS\d+/.test(text),
      hasSyntax: text.includes('[') || text.includes('{'),
      hasNotes: text.toLowerCase().includes('note:'),
      hasWarnings: text.toLowerCase().includes('warning'),
      isMultiSection: text.split('\n\n').length > 3,
      languageIndicators: this.detectLanguageIndicators(text),
      contentDensity: this.calculateContentDensity(text),
      technicalLevel: this.assessTechnicalLevel(text)
    };
  }

  /**
   * كشف مؤشرات اللغة
   */
  detectLanguageIndicators(text) {
    const indicators = {
      english: /\b(enter|display|format|reference|explanation)\b/gi.test(text),
      hasAbbreviations: /\b[A-Z]{2,}\b/.test(text),
      hasNumbers: /\d+/.test(text),
      hasCodes: /[A-Z]\d+[A-Z]/.test(text)
    };

    return indicators;
  }

  /**
   * حساب كثافة المحتوى
   */
  calculateContentDensity(text) {
    const totalChars = text.length;
    const meaningfulChars = text.replace(/\s/g, '').length;
    const lines = text.split('\n').filter(line => line.trim().length > 0).length;
    
    return {
      textDensity: totalChars > 0 ? meaningfulChars / totalChars : 0,
      averageLineLength: lines > 0 ? totalChars / lines : 0,
      informationRatio: this.calculateInformationRatio(text)
    };
  }

  /**
   * حساب نسبة المعلومات
   */
  calculateInformationRatio(text) {
    const totalWords = this.countWords(text);
    const technicalWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    const numbers = (text.match(/\d+/g) || []).length;
    const symbols = (text.match(/[\/\*\[\]{}]/g) || []).length;
    
    return totalWords > 0 ? (technicalWords + numbers + symbols) / totalWords : 0;
  }

  /**
   * تقييم المستوى التقني
   */
  assessTechnicalLevel(text) {
    let score = 0;
    
    // وجود رموز تقنية
    if (/[A-Z]{2}\d+/.test(text)) score += 2;
    if (/MS\d+/.test(text)) score += 1;
    if (/[\[\]{}]/.test(text)) score += 1;
    if (text.includes('FORMAT')) score += 1;
    if (text.includes('REFERENCE')) score += 1;
    
    // طول ومعقدة النص
    if (text.length > 500) score += 1;
    if (text.split('\n').length > 10) score += 1;
    
    if (score >= 6) return 'advanced';
    if (score >= 4) return 'intermediate';
    if (score >= 2) return 'basic';
    return 'minimal';
  }

  /**
   * تقييم التعقيد
   */
  assessComplexity(text) {
    let complexity = 0;
    
    // العوامل المختلفة للتعقيد
    complexity += Math.min(text.length / 100, 5); // الطول
    complexity += text.split('\n').length / 5; // عدد الأسطر
    complexity += (text.match(/[A-Z]{2,}/g) || []).length / 10; // المصطلحات التقنية
    complexity += (text.match(/\d+/g) || []).length / 10; // الأرقام
    complexity += (text.match(/[\[\]{}\/\*]/g) || []).length / 5; // الرموز الخاصة
    
    return Math.min(Math.round(complexity), 10); // تحديد بـ 10
  }

  /**
   * تقييم الجودة
   */
  assessQuality(extractedInfo, contentAnalysis) {
    let quality = 0;
    
    // وجود عناصر مهمة
    if (extractedInfo.title) quality += 2;
    if (extractedInfo.examples.length > 0) quality += 2;
    if (extractedInfo.references.length > 0) quality += 1;
    if (extractedInfo.syntax.length > 0) quality += 1;
    if (extractedInfo.tasks.length > 0) quality += 2;
    if (extractedInfo.notes.length > 0) quality += 1;
    
    // تحليل المحتوى
    if (contentAnalysis.hasFormatInformation) quality += 1;
    
    return Math.min(quality, 10); // تحديد بـ 10
  }

  /**
   * عد الكلمات
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * إنشاء استجابة فارغة
   */
  createEmptyResponse(command, reason) {
    return {
      command: command,
      originalText: '',
      cleanedText: '',
      responseType: 'empty',
      extractedInfo: this.getEmptyExtractedInfo(),
      contentAnalysis: this.getEmptyContentAnalysis(),
      metadata: {
        length: 0,
        wordCount: 0,
        lineCount: 0,
        hasExamples: false,
        hasReferences: false,
        complexity: 0,
        quality: 0,
        emptyReason: reason
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * إنشاء استجابة خطأ
   */
  createErrorResponse(command, errorMessage, originalText = '') {
    return {
      command: command,
      originalText: originalText,
      cleanedText: '',
      responseType: 'error',
      extractedInfo: this.getEmptyExtractedInfo(),
      contentAnalysis: this.getEmptyContentAnalysis(),
      metadata: {
        length: originalText.length,
        wordCount: 0,
        lineCount: 0,
        hasExamples: false,
        hasReferences: false,
        complexity: 0,
        quality: 0,
        error: errorMessage
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * الحصول على معلومات مستخرجة فارغة
   */
  getEmptyExtractedInfo() {
    return {
      title: null,
      description: null,
      sections: [],
      tasks: [],
      examples: [],
      references: [],
      syntax: [],
      notes: [],
      warnings: [],
      seeAlso: []
    };
  }

  /**
   * الحصول على تحليل محتوى فارغ
   */
  getEmptyContentAnalysis() {
    return {
      hasFormatInformation: false,
      hasExamples: false,
      hasReferences: false,
      hasSyntax: false,
      hasNotes: false,
      hasWarnings: false,
      isMultiSection: false,
      languageIndicators: {
        english: false,
        hasAbbreviations: false,
        hasNumbers: false,
        hasCodes: false
      },
      contentDensity: {
        textDensity: 0,
        averageLineLength: 0,
        informationRatio: 0
      },
      technicalLevel: 'minimal'
    };
  }

  /**
   * تهيئة الأنماط
   */
  initializePatterns() {
    return {
      responseTypes: {
        help_documentation: /TASK.*FORMAT.*REFERENCE|FOR AN EXPLANATION.*MS\d+/i,
        command_list: /TASK\s+FORMAT\s+REFERENCE[\s\S]*----/i,
        error_message: /COMMAND NOT RECOGNIZED|INVALID ENTRY|NOT AUTHORIZED/i,
        partial_help: /LIMITED|PARTIAL|BASIC/i,
        system_message: /SYSTEM|STATUS|CONNECTION/i
      }
    };
  }

  /**
   * تهيئة قواعد التنظيف
   */
  initializeCleaningRules() {
    return [
      // إزالة الرموز الخاصة الغير مرغوبة
      { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, replacement: '' },
      
      // تنظيف المسافات الزائدة
      { pattern: /[ \t]{2,}/g, replacement: '  ' },
      
      // إزالة الأسطر الفارغة المتعددة
      { pattern: /\n\s*\n\s*\n/g, replacement: '\n\n' },
      
      // تنظيف رموز التحكم في النص
      { pattern: /\u003e$/gm, replacement: '' }, // إزالة > في نهاية السطر
      
      // تنظيف المسافات في بداية ونهاية الأسطر
      { pattern: /^[ \t]+|[ \t]+$/gm, replacement: '' }
    ];
  }

  /**
   * تهيئة التصنيفات
   */
  initializeCategorizations() {
    return {
      commandCategories: {
        availability: ['AN', 'SA', 'AA', 'AD', 'AE'],
        booking: ['SS', 'NN', 'HK', 'HL', 'HN'],
        pricing: ['FXP', 'FXX', 'FXG', 'FXB', 'FXL'],
        ticketing: ['TTP', 'TTM', 'TTC', 'TTR'],
        queue: ['QUE', 'QC', 'QR', 'QD'],
        pnr: ['NM', 'AP', 'RM', 'RT']
      }
    };
  }
}

// تصدير الكلاس
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponseParser;
} else {
  window.ResponseParser = ResponseParser;
}