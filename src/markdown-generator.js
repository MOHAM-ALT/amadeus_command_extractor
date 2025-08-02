/**
   * تحضير البيانات للمعالجة
   */
  preprocessData(extractionResults) {
    const processed = {
      metadata: {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        categories: new Set(),
        generationDate: new Date(),
        extractionDuration: 0,
        version: '1.0.0'
      },
      commands: {},
      categories: {},
      statistics: {},
      rawResults: extractionResults
    };

    try {
      // معالجة النتائج الأساسية
      if (extractionResults.summary) {
        processed.metadata.totalCommands = extractionResults.summary.totalCommands || 0;
        processed.metadata.successfulCommands = extractionResults.summary.successfulCommands || 0;
        processed.metadata.failedCommands = extractionResults.summary.failedCommands || 0;
        processed.metadata.extractionDuration = extractionResults.summary.duration || 0;
      }

      // معالجة الأوامر
      if (extractionResults.results && Array.isArray(extractionResults.results)) {
        extractionResults.results.forEach(result => {
          if (result.success && result.responseText) {
            // تحليل الاستجابة إذا لم تكن محللة مسبقاً
            const parsedResponse = result.parsedResponse || this.parseResponse(result);
            
            processed.commands[result.command] = {
              ...result,
              parsedResponse: parsedResponse,
              category: result.category || this.inferCategory(result.command),
              priority: result.priority || 'medium'
            };

            // إضافة للتصنيف
            const category = result.category || 'other';
            processed.metadata.categories.add(category);
            
            if (!processed.categories[category]) {
              processed.categories[category] = [];
            }
            processed.categories[category].push(result.command);
          }
        });
      }

      // حساب الإحصائيات
      processed.statistics = this.calculateStatistics(processed);

      return processed;

    } catch (error) {
      console.error('خطأ في تحضير البيانات:', error);
      return processed;
    }
  }

  /**
   * إنشاء العنوان والمقدمة
   */
  generateHeader(data) {
    const emoji = this.options.addEmojis ? this.emojis.main : '';
    const date = data.metadata.generationDate.toLocaleDateString('ar-SA');
    const time = data.metadata.generationDate.toLocaleTimeString('ar-SA');

    return `# ${emoji} دليل أوامر Amadeus الشامل

> **دليل مرجعي كامل لجميع أوامر المساعدة (HE Commands) في نظام Amadeus**

## ${this.emojis.info} معلومات الدليل

- **📅 تاريخ الإنشاء:** ${date} في ${time}
- **📊 إجمالي الأوامر:** ${data.metadata.totalCommands}
- **✅ أوامر ناجحة:** ${data.metadata.successfulCommands}
- **❌ أوامر فاشلة:** ${data.metadata.failedCommands}
- **🎯 معدل النجاح:** ${data.statistics.successRate}%
- **⏱️ مدة الاستخراج:** ${this.formatDuration(data.metadata.extractionDuration)}
- **📱 الإصدار:** ${data.metadata.version}

## ${this.emojis.purpose} الهدف من الدليل

هذا الدليل هو مرجع شامل لجميع أوامر المساعدة المتوفرة في نظام **Amadeus Selling Platform**. تم إنشاؤه تلقائياً باستخدام أداة **Amadeus Command Extractor** بهدف:

- 📚 توفير مرجع سهل الوصول لجميع أوامر النظام
- 🔍 تسهيل البحث والعثور على الأوامر المطلوبة
- 📖 تحسين عملية التعلم والتدريب
- 🌐 مشاركة المعرفة مع مجتمع مستخدمي Amadeus

## ${this.emojis.usage} كيفية استخدام الدليل

- **🔗 الروابط السريعة:** استخدم جدول المحتويات للانتقال المباشر
- **🏷️ التصنيفات:** الأوامر مرتبة حسب الوظيفة والاستخدام
- **🔍 البحث:** استخدم Ctrl+F للبحث عن أمر محدد
- **📋 النسخ:** يمكن نسخ الأوامر مباشرة من الأمثلة
- **📱 التنقل:** استخدم الروابط للانتقال بين الأقسام`;
  }

  /**
   * إنشاء جدول المحتويات
   */
  generateTableOfContents(data) {
    let toc = `## ${this.emojis.toc} جدول المحتويات

### ${this.emojis.sections} الأقسام الرئيسية
- [📊 الإحصائيات والملخص](#الإحصائيات-والملخص)
- [⚡ دليل مرجعي سريع](#دليل-مرجعي-سريع)
- [📂 الأوامر مصنفة حسب الفئة](#الأوامر-مصنفة-حسب-الفئة)`;

    if (this.options.includeIndex) {
      toc += `\n- [🔤 فهرس الأوامر الأبجدي](#فهرس-الأوامر-الأبجدي)`;
    }

    toc += `\n- [ℹ️ معلومات إضافية](#معلومات-إضافية)`;

    // إضافة التصنيفات
    if (Object.keys(data.categories).length > 0) {
      toc += `\n\n### ${this.emojis.categories} التصنيفات المتوفرة\n`;
      
      Object.keys(data.categories).sort().forEach(category => {
        const categoryName = this.getCategoryDisplayName(category);
        const emoji = this.getCategoryEmoji(category);
        const count = data.categories[category].length;
        const anchor = this.createAnchor(categoryName);
        
        toc += `- [${emoji} ${categoryName}](#${anchor}) (${count} أمر)\n`;
      });
    }

    return toc;
  }

  /**
   * إنشاء الإحصائيات
   */
  generateStatistics(data) {
    const stats = data.statistics;
    
    return `## ${this.emojis.stats} الإحصائيات والملخص

### ${this.emojis.overview} نظرة عامة

| 📊 المؤشر | 📈 القيمة | 📝 الوصف |
|-----------|----------|----------|
| **إجمالي الأوامر** | ${data.metadata.totalCommands} | العدد الكلي للأوامر المختبرة |
| **أوامر ناجحة** | ${data.metadata.successfulCommands} | الأوامر التي تم استخراجها بنجاح |
| **أوامر فاشلة** | ${data.metadata.failedCommands} | الأوامر التي فشل في استخراجها |
| **معدل النجاح** | ${stats.successRate}% | نسبة النجاح في الاستخراج |
| **التصنيفات** | ${data.metadata.categories.size} | عدد فئات الأوامر المختلفة |

### ${this.emojis.categoryStats} إحصائيات التصنيفات

| 🏷️ التصنيف | 📊 عدد الأوامر | 📈 النسبة |
|------------|---------------|----------|`;

    Object.entries(data.categories).forEach(([category, commands]) => {
      const displayName = this.getCategoryDisplayName(category);
      const percentage = Math.round((commands.length / data.metadata.successfulCommands) * 100);
      
      return `| **${displayName}** | ${commands.length} | ${percentage}% |`;
    });

    return stats + `

### ${this.emojis.quality} تحليل الجودة

- **🏆 أوامر عالية الجودة:** ${stats.highQualityCommands || 0}
- **⭐ أوامر متوسطة الجودة:** ${stats.mediumQualityCommands || 0}  
- **📝 أوامر بسيطة:** ${stats.lowQualityCommands || 0}
- **🔗 أوامر تحتوي على مراجع:** ${stats.commandsWithReferences || 0}
- **📋 أوامر تحتوي على أمثلة:** ${stats.commandsWithExamples || 0}`;
  }

  /**
   * إنشاء دليل مرجعي سريع
   */
  generateQuickReference(data) {
    const topCommands = this.getTopCommands(data);
    
    let quickRef = `## ${this.emojis.quick} دليل مرجعي سريع

### ${this.emojis.popular} الأوامر الأكثر استخداماً

| 🔧 الأمر | 📝 الوصف | 🏷️ الفئة |
|----------|----------|----------|`;

    topCommands.forEach(command => {
      const cmd = data.commands[command.name];
      if (cmd && cmd.parsedResponse) {
        const description = cmd.parsedResponse.extractedInfo.description || 
                          this.getCommandDescription(command.name);
        const category = this.getCategoryDisplayName(cmd.category);
        
        quickRef += `\n| \`${command.name}\` | ${description} | ${category} |`;
      }
    });

    quickRef += `\n\n### ${this.emojis.shortcuts} اختصارات مفيدة

| 🔑 الاختصار | 📖 الشرح |
|-------------|----------|
| \`HE\` | جميع الأوامر تبدأ بـ HE متبوعة بالأمر |
| \`HE HELP\` | عرض المساعدة العامة |
| \`HE [COMMAND]\` | عرض مساعدة لأمر محدد |
| \`MD\` | المزيد من المعلومات (More Details) |
| \`MS[رقم]\` | مرجع دليل النظام |`;

    return quickRef;
  }

  /**
   * إنشاء الأوامر مصنفة حسب الفئة
   */
  generateCategorizedCommands(data) {
    let content = `## ${this.emojis.commands} الأوامر مصنفة حسب الفئة\n\n`;

    // ترتيب التصنيفات حسب الأولوية
    const sortedCategories = this.sortCategoriesByPriority(Object.keys(data.categories));

    sortedCategories.forEach(category => {
      const commands = data.categories[category];
      const categoryName = this.getCategoryDisplayName(category);
      const categoryEmoji = this.getCategoryEmoji(category);
      
      content += `### ${categoryEmoji} ${categoryName}\n\n`;
      content += this.getCategoryDescription(category) + '\n\n';
      
      // ترتيب الأوامر داخل التصنيف
      const sortedCommands = commands.sort();
      
      sortedCommands.forEach(commandName => {
        const command = data.commands[commandName];
        if (command && command.parsedResponse) {
          content += this.generateCommandSection(command);
        }
      });
      
      content += '\n';
    });

    return content;
  }

  /**
   * إنشاء قسم أمر واحد
   */
  generateCommandSection(command) {
    const parsed = command.parsedResponse;
    const info = parsed.extractedInfo;
    
    let section = `#### \`${command.command}\`\n\n`;
    
    // الوصف
    if (info.title || info.description) {
      section += `**📝 الوصف:** ${info.title || info.description}\n\n`;
    }
    
    // النص الأساسي (مختصر)
    if (parsed.cleanedText) {
      const truncatedText = this.truncateText(parsed.cleanedText, 500);
      section += `\`\`\`\n${truncatedText}\n\`\`\`\n\n`;
    }
    
    // المهام والأوامر
    if (info.tasks && info.tasks.length > 0) {
      section += `**🔧 المهام المتوفرة:**\n\n`;
      section += `| المهمة | الصيغة | المرجع |\n|--------|--------|--------|\n`;
      
      info.tasks.slice(0, 5).forEach(task => {
        section += `| ${task.task} | \`${task.format}\` | ${task.reference} |\n`;
      });
      
      if (info.tasks.length > 5) {
        section += `| ... | *${info.tasks.length - 5} مهام إضافية* | ... |\n`;
      }
      section += '\n';
    }
    
    // الأمثلة
    if (info.examples && info.examples.length > 0) {
      section += `**📋 أمثلة:**\n\n`;
      info.examples.slice(0, 3).forEach(example => {
        section += `- \`${example.text}\`\n`;
      });
      if (info.examples.length > 3) {
        section += `- *و ${info.examples.length - 3} أمثلة أخرى*\n`;
      }
      section += '\n';
    }
    
    // المراجع
    if (info.references && info.references.length > 0) {
      section += `**🔗 المراجع:** ${info.references.join(', ')}\n\n`;
    }
    
    // الملاحظات
    if (info.notes && info.notes.length > 0) {
      section += `**ℹ️ ملاحظات:**\n`;
      info.notes.forEach(note => {
        section += `> ${note}\n`;
      });
      section += '\n';
    }
    
    // معلومات التصنيف والجودة
    const quality = parsed.metadata.quality || 0;
    const complexity = parsed.metadata.complexity || 0;
    
    section += `<details>\n<summary>📊 معلومات إضافية</summary>\n\n`;
    section += `- **🏷️ الفئة:** ${this.getCategoryDisplayName(command.category)}\n`;
    section += `- **⭐ الجودة:** ${quality}/10\n`;
    section += `- **🔬 التعقيد:** ${complexity}/10\n`;
    section += `- **📏 الطول:** ${parsed.metadata.length} حرف\n`;
    section += `- **📝 الكلمات:** ${parsed.metadata.wordCount} كلمة\n`;
    section += `</details>\n\n`;
    
    return section;
  }

  /**
   * إنشاء فهرس الأوامر
   */
  generateCommandIndex(data) {
    let index = `## ${this.emojis.index} فهرس الأوامر الأبجدي\n\n`;
    
    const sortedCommands = Object.keys(data.commands).sort();
    const groups = this.groupCommandsAlphabetically(sortedCommands);
    
    Object.entries(groups).forEach(([letter, commands]) => {
      index += `### ${letter}\n\n`;
      
      commands.forEach(commandName => {
        const command = data.commands[commandName];
        const description = command.parsedResponse?.extractedInfo?.description || 
                          this.getCommandDescription(commandName);
        const category = this.getCategoryDisplayName(command.category);
        const anchor = this.createAnchor(commandName);
        
        index += `- [\`${commandName}\`](#${anchor}) - ${description} *(${category})*\n`;
      });
      
      index += '\n';
    });
    
    return index;
  }

  /**
   * إنشاء التذييل
   */
  generateFooter(data) {
    const date = data.metadata.generationDate.toLocaleDateString('ar-SA');
    
    return `## ${this.emojis.footer} معلومات إضافية

### ${this.emojis.about} حول هذا الدليل

تم إنشاء هذا الدليل تلقائياً باستخدام **Amadeus Command Extractor**، وهو مشروع مفتوح المصدر يهدف إلى توثيق وتنظيم جميع أوامر نظام Amadeus.

### ${this.emojis.contributing} المساهمة

- 🐛 **إبلاغ عن خطأ:** إذا وجدت معلومات غير صحيحة
- 💡 **اقتراح تحسين:** لجعل الدليل أفضل
- 📝 **إضافة محتوى:** معلومات أو أمثلة إضافية
- 🔄 **تحديث البيانات:** للحصول على أحدث المعلومات

### ${this.emojis.disclaimer} إخلاء المسئولية

- هذا الدليل للأغراض التعليمية والمرجعية فقط
- المعلومات مستخرجة من نظام Amadeus وقد تحتاج تحديث
- يُنصح بالرجوع للوثائق الرسمية للحصول على أحدث المعلومات
- المشروع غير مرتبط رسمياً بشركة Amadeus

### ${this.emojis.license} الترخيص

هذا المشروع مرخص تحت رخصة MIT وهو مفتوح المصدر للجميع.

---

**📅 آخر تحديث:** ${date}  
**🔧 أداة الإنشاء:** Amadeus Command Extractor v${data.metadata.version}  
**📊 إجمالي الأوامر:** ${data.metadata.successfulCommands} أمر  
**⭐ معدل النجاح:** ${data.statistics.successRate}%

---

*تم إنشاء هذا الدليل بـ ${this.emojis.heart} لخدمة مجتمع مستخدمي Amadeus*`;
  }

  /**
   * حساب الإحصائيات
   */
  calculateStatistics(data) {
    const stats = {
      successRate: 0,
      highQualityCommands: 0,
      mediumQualityCommands: 0,
      lowQualityCommands: 0,
      commandsWithReferences: 0,
      commandsWithExamples: 0,
      averageComplexity: 0,
      averageQuality: 0
    };

    const commands = Object.values(data.commands);
    const totalCommands = commands.length;

    if (totalCommands > 0) {
      stats.successRate = Math.round((data.metadata.successfulCommands / data.metadata.totalCommands) * 100);
      
      let totalComplexity = 0;
      let totalQuality = 0;

      commands.forEach(command => {
        const parsed = command.parsedResponse;
        if (parsed && parsed.metadata) {
          const quality = parsed.metadata.quality || 0;
          const complexity = parsed.metadata.complexity || 0;
          
          totalQuality += quality;
          totalComplexity += complexity;
          
          if (quality >= 7) stats.highQualityCommands++;
          else if (quality >= 4) stats.mediumQualityCommands++;
          else stats.lowQualityCommands++;
          
          if (parsed.extractedInfo.references.length > 0) {
            stats.commandsWithReferences++;
          }
          
          if (parsed.extractedInfo.examples.length > 0) {
            stats.commandsWithExamples++;
          }
        }
      });

      stats.averageComplexity = Math.round(totalComplexity / totalCommands);
      stats.averageQuality = Math.round(totalQuality / totalCommands);
    }

    return stats;
  }

  /**
   * دوال مساعدة
   */
  
  parseResponse(result) {
    // استخدام ResponseParser إذا كان متوفر
    if (typeof ResponseParser !== 'undefined') {
      const parser = new ResponseParser();
      return parser.parseResponse(result.responseText, result.command);
    }
    
    // معالجة بسيطة إذا لم يكن متوفر
    return {
      extractedInfo: {
        title: null,
        description: result.responseText.split('\n')[0],
        tasks: [],
        examples: [],
        references: [],
        notes: []
      },
      metadata: {
        quality: 5,
        complexity: 3,
        length: result.responseText.length,
        wordCount: result.responseText.split(' ').length
      }
    };
  }

  inferCategory(command) {
    const patterns = {
      'core_operations': /^HE (AN|SS|NN|HK|SA|SB)/,
      'pricing_fares': /^HE FX/,
      'ticketing_documents': /^HE TT/,
      'refunds_exchanges': /^HE TR/,
      'pnr_management': /^HE (NM|AP|RM|RT)/,
      'queue_management': /^HE Q/,
      'special_services': /^HE (SSR|SR|SM|ST)/,
      'system_technical': /^HE (SYS|HELP|STEPS)/
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(command)) {
        return category;
      }
    }

    return 'other';
  }

  getTopCommands(data) {
    // قائمة الأوامر الأكثر استخداماً
    const popularCommands = [
      'HE AN', 'HE SS', 'HE FXP', 'HE TTP', 'HE NM', 
      'HE AP', 'HE QUE', 'HE RM', 'HE SSR', 'HE HELP'
    ];

    return popularCommands
      .filter(cmd => data.commands[cmd])
      .map(cmd => ({ name: cmd, usage: 'high' }));
  }

  getCategoryDisplayName(category) {
    const names = {
      'core_operations': 'العمليات الأساسية والحجوزات',
      'pricing_fares': 'التسعير والأسعار',
      'ticketing_documents': 'إصدار التذاكر والوثائق',
      'refunds_exchanges': 'المبالغ المستردة والتبديل',
      'pnr_management': 'إدارة ملفات الحجز',
      'contact_information': 'معلومات الاتصال',
      'special_services': 'الخدمات الخاصة',
      'remarks_information': 'الملاحظات والمعلومات',
      'payment_financial': 'الدفع والمعاملات المالية',
      'queue_management': 'إدارة القوائم',
      'other_services': 'خدمات أخرى',
      'reporting_analysis': 'التقارير والتحليل',
      'system_technical': 'النظام والتقنيات',
      'geographic_codes': 'الرموز الجغرافية والكودات',
      'error_troubleshooting': 'الأخطاء وحل المشاكل',
      'other': 'أوامر أخرى'
    };

    return names[category] || category;
  }

  getCategoryEmoji(category) {
    const emojis = {
      'core_operations': '🏢',
      'pricing_fares': '💰',
      'ticketing_documents': '🎫',
      'refunds_exchanges': '💸',
      'pnr_management': '👥',
      'contact_information': '📞',
      'special_services': '✈️',
      'remarks_information': '📝',
      'payment_financial': '💳',
      'queue_management': '📋',
      'other_services': '🏨',
      'reporting_analysis': '📊',
      'system_technical': '🔧',
      'geographic_codes': '🌐',
      'error_troubleshooting': '⚠️',
      'other': '📂'
    };

    return emojis[category] || '📄';
  }

  getCategoryDescription(category) {
    const descriptions = {
      'core_operations': 'أوامر العمليات الأساسية مثل البحث عن الرحلات، الحجز، وإدارة المقاعد.',
      'pricing_fares': 'أوامر حساب الأسعار، إنشاء TST، وإدارة التعريفات.',
      'ticketing_documents': 'أوامر إصدار التذاكر، EMD، وإدارة الوثائق الإلكترونية.',
      'refunds_exchanges': 'أوامر معالجة المبالغ المستردة وتبديل التذاكر.',
      'pnr_management': 'أوامر إدارة ملفات الحجز وإضافة أسماء المسافرين.',
      'contact_information': 'أوامر إضافة وإدارة معلومات الاتصال للمسافرين.',
      'special_services': 'أوامر الخدمات الخاصة مثل SSR وخرائط المقاعد.',
      'remarks_information': 'أوامر إضافة الملاحظات والمعلومات الإضافية.',
      'payment_financial': 'أوامر أشكال الدفع والمعاملات المالية.',
      'queue_management': 'أوامر إدارة القوائم وسير العمل.',
      'other_services': 'أوامر الخدمات الأخرى مثل الفنادق والسيارات.',
      'reporting_analysis': 'أوامر التقارير والتحليلات المالية.',
      'system_technical': 'أوامر النظام والمساعدة التقنية.',
      'geographic_codes': 'أوامر الرموز الجغرافية ومعلومات المطارات.',
      'error_troubleshooting': 'أوامر التعامل مع الأخطاء وحل المشاكل.',
      'other': 'أوامر متنوعة أخرى.'
    };

    return descriptions[category] || 'أوامر متنوعة.';
  }

  sortCategoriesByPriority(categories) {
    const priority = [
      'core_operations',
      'pricing_fares', 
      'ticketing_documents',
      'pnr_management',
      'payment_financial',
      'queue_management',
      'special_services',
      'contact_information',
      'remarks_information',
      'refunds_exchanges',
      'system_technical',
      'reporting_analysis',
      'geographic_codes',
      'other_services',
      'error_troubleshooting',
      'other'
    ];

    return categories.sort((a, b) => {
      const priorityA = priority.indexOf(a);
      const priorityB = priority.indexOf(b);
      
      if (priorityA === -1 && priorityB === -1) return a.localeCompare(b);
      if (priorityA === -1) return 1;
      if (priorityB === -1) return -1;
      
      return priorityA - priorityB;
    });
  }

  groupCommandsAlphabetically(commands) {
    const groups = {};
    
    commands.forEach(command => {
      const firstLetter = command.charAt(3) || 'A'; // بعد "HE "
      
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      
      groups[firstLetter].push(command);
    });

    return groups;
  }

  getCommandDescription(command) {
    const descriptions = {
      'HE AN': 'عرض الرحلات المتاحة والبحث',
      'HE SS': 'بيع الرحلات وعمليات الحجز',
      'HE FXP': 'تسعير ملف الحجز وإنشاء TST',
      'HE TTP': 'إصدار التذاكر ووثائق السفر',
      'HE NM': 'عناصر الأسماء ومعلومات المسافرين',
      'HE AP': 'معلومات الاتصال وإدارة العناوين',
      'HE QUE': 'عمليات القوائم وإدارة سير العمل',
      'HE SSR': 'طلبات الخدمات الخاصة',
      'HE RM': 'الملاحظات العامة والمعلومات',
      'HE HELP': 'المساعدة العامة والإرشاد'
    };

    return descriptions[command] || 'مساعدة وتوثيق الأمر';
  }

  createAnchor(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, '') // إزالة الرموز الخاصة والاحتفاظ بالعربية
      .replace(/\s+/g, '-')
      .trim();
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');
    
    if (lastNewline > maxLength - 100) {
      return truncated.substring(0, lastNewline) + '\n\n... (تم الاختصار)';
    }
    
    return truncated + '\n\n... (تم الاختصار)';
  }

  formatDuration(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes} دقيقة و ${seconds} ثانية`;
    } else {
      return `${seconds} ثانية`;
    }
  }

  /**
   * إنشاء الأوامر مرتبة أبجدياً
   */
  generateAlphabeticalCommands(data) {
    let content = `## ${this.emojis.commands} الأوامر مرتبة أبجدياً\n\n`;

    const sortedCommands = Object.keys(data.commands).sort();
    
    sortedCommands.forEach(commandName => {
      const command = data.commands[commandName];
      if (command && command.parsedResponse) {
        content += this.generateCommandSection(command);
      }
    });

    return content;
  }

  /**
   * إنشاء مستند خطأ
   */
  generateErrorDocument(error, originalData) {
    return `# ❌ خطأ في إنشاء دليل Amadeus

## 🔍 تفاصيل الخطأ

**رسالة الخطأ:** ${error.message}

**الوقت:** ${new Date().toLocaleString('ar-SA')}

## 📊 البيانات المتوفرة

${originalData ? `- **إجمالي النتائج:** ${originalData.results?.length || 0}
- **النتائج الناجحة:** ${originalData.summary?.successfulCommands || 0}
- **النتائج الفاشلة:** ${originalData.summary?.failedCommands || 0}` : 'لا توجد بيانات متوفرة'}

## 🔧 اقتراحات الحل

1. تأكد من صحة بيانات الاستخراج
2. تحقق من توفر جميع الملفات المطلوبة
3. أعد المحاولة مرة أخرى
4. راجع سجل الأخطاء للمزيد من التفاصيل

---

*تم إنشاء هذا المستند تلقائياً عند حدوث خطأ في نظام إنشاء الدليل*`;
  }

  /**
   * تهيئة الرموز التعبيرية
   */
  initializeEmojis() {
    return {
      main: '🔍',
      info: 'ℹ️',
      purpose: '🎯',
      usage: '📖',
      toc: '📑',
      sections: '📂',
      categories: '🏷️',
      stats: '📊',
      overview: '👁️',
      categoryStats: '📈',
      quality: '⭐',
      quick: '⚡',
      popular: '🔥',
      shortcuts: '🔑',
      commands: '📋',
      index: '🔤',
      footer: 'ℹ️',
      about: '📄',
      contributing: '🤝',
      disclaimer: '⚠️',
      license: '📜',
      heart: '💝'
    };
  }

  /**
   * تهيئة القوالب
   */
  initializeTemplates() {
    return {
      command: {
        header: '#### `{command}`\n\n',
        description: '**📝 الوصف:** {description}\n\n',
        content: '```\n{content}\n```\n\n',
        tasks: '**🔧 المهام المتوفرة:**\n\n{tasks}\n\n',
        examples: '**📋 أمثلة:**\n\n{examples}\n\n',
        references: '**🔗 المراجع:** {references}\n\n',
        notes: '**ℹ️ ملاحظات:**\n{notes}\n\n',
        metadata: '<details>\n<summary>📊 معلومات إضافية</summary>\n\n{metadata}\n</details>\n\n'
      }
    };
  }

  /**
   * إنشاء ملفات منفصلة لكل تصنيف
   */
  generateSeparateFiles(data) {
    const files = {};
    
    // ملف رئيسي
    files['README.md'] = this.generateMainFile(data);
    
    // ملف لكل تصنيف
    Object.entries(data.categories).forEach(([category, commands]) => {
      const categoryData = {
        ...data,
        categories: { [category]: commands },
        commands: Object.fromEntries(
          commands.map(cmd => [cmd, data.commands[cmd]]).filter(([, command]) => command)
        )
      };
      
      const categoryName = this.getCategoryDisplayName(category);
      const fileName = `${category.replace(/_/g, '-')}.md`;
      
      files[fileName] = this.generateCategoryFile(categoryData, category);
    });
    
    return files;
  }

  /**
   * إنشاء الملف الرئيسي
   */
  generateMainFile(data) {
    const sections = [];
    
    sections.push(this.generateHeader(data));
    sections.push(this.generateTableOfContents(data));
    sections.push(this.generateStatistics(data));
    sections.push(this.generateQuickReference(data));
    
    // روابط للملفات المنفصلة
    let categoryLinks = `## ${this.emojis.categories} التصنيفات التفصيلية\n\n`;
    
    Object.keys(data.categories).forEach(category => {
      const categoryName = this.getCategoryDisplayName(category);
      const emoji = this.getCategoryEmoji(category);
      const fileName = `${category.replace(/_/g, '-')}.md`;
      const count = data.categories[category].length;
      
      categoryLinks += `- [${emoji} ${categoryName}](${fileName}) (${count} أمر)\n`;
    });
    
    sections.push(categoryLinks);
    sections.push(this.generateFooter(data));
    
    return sections.join('\n\n---\n\n');
  }

  /**
   * إنشاء ملف تصنيف
   */
  generateCategoryFile(data, category) {
    const categoryName = this.getCategoryDisplayName(category);
    const emoji = this.getCategoryEmoji(category);
    
    const sections = [];
    
    // عنوان التصنيف
    sections.push(`# ${emoji} ${categoryName}\n\n${this.getCategoryDescription(category)}\n\n[← العودة للدليل الرئيسي](README.md)`);
    
    // الأوامر
    sections.push(this.generateCategorizedCommands(data));
    
    return sections.join('\n\n---\n\n');
  }

  /**
   * تصدير البيانات المعالجة كـ JSON
   */
  exportProcessedData(data) {
    const exportData = {
      metadata: data.metadata,
      statistics: data.statistics,
      categories: Object.keys(data.categories).map(category => ({
        name: category,
        displayName: this.getCategoryDisplayName(category),
        description: this.getCategoryDescription(category),
        commands: data.categories[category].length,
        commandList: data.categories[category]
      })),
      commands: Object.entries(data.commands).map(([name, command]) => ({
        name: name,
        category: command.category,
        success: command.success,
        quality: command.parsedResponse?.metadata?.quality || 0,
        complexity: command.parsedResponse?.metadata?.complexity || 0,
        hasExamples: command.parsedResponse?.extractedInfo?.examples?.length > 0,
        hasReferences: command.parsedResponse?.extractedInfo?.references?.length > 0,
        responseLength: command.parsedResponse?.metadata?.length || 0
      })),
      generatedAt: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}

// تصدير الكلاس
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownGenerator;
} else {
  window.MarkdownGenerator = MarkdownGenerator;
}/**
 * Markdown Generator - إنشاء دليل Markdown شامل
 * ينتج دليل منظم وقابل للقراءة لجميع أوامر Amadeus المستخرجة
 */

class MarkdownGenerator {
  constructor() {
    this.options = {
      includeTableOfContents: true,
      includeStatistics: true,
      includeIndex: true,
      groupByCategory: true,
      addEmojis: true,
      includeMetadata: true,
      addNavigation: true,
      generateSeparateFiles: false
    };
    
    this.emojis = this.initializeEmojis();
    this.templates = this.initializeTemplates();
  }

  /**
   * إنشاء دليل Markdown كامل
   * @param {Object} extractionResults - نتائج الاستخراج
   * @param {Object} options - خيارات التوليد
   * @returns {string} محتوى Markdown
   */
  generateCompleteGuide(extractionResults, options = {}) {
    try {
      // دمج الخيارات
      this.options = { ...this.options, ...options };
      
      console.log('📝 بدء إنشاء دليل Markdown...');
      
      // تحضير البيانات
      const processedData = this.preprocessData(extractionResults);
      
      // إنشاء أجزاء المستند
      const sections = [];
      
      // العنوان والمقدمة
      sections.push(this.generateHeader(processedData));
      
      // جدول المحتويات
      if (this.options.includeTableOfContents) {
        sections.push(this.generateTableOfContents(processedData));
      }
      
      // الإحصائيات
      if (this.options.includeStatistics) {
        sections.push(this.generateStatistics(processedData));
      }
      
      // دليل سريع
      sections.push(this.generateQuickReference(processedData));
      
      // الأوامر مجمعة حسب التصنيف
      if (this.options.groupByCategory) {
        sections.push(this.generateCategorizedCommands(processedData));
      } else {
        sections.push(this.generateAlphabeticalCommands(processedData));
      }
      
      // فهرس الأوامر
      if (this.options.includeIndex) {
        sections.push(this.generateCommandIndex(processedData));
      }
      
      // التذييل
      sections.push(this.generateFooter(processedData));
      
      const fullDocument = sections.join('\n\n---\n\n');
      
      console.log('✅ تم إنشاء دليل Markdown بنجاح');
      return fullDocument;
      
    } catch (error) {
      console.error('❌ خطأ في إنشاء دليل Markdown:', error);
      return this.generateErrorDocument(error, extractionResults);
    }