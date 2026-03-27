/**
 * 文档处理模块 - 解析、分块
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

// 文档解析库（需要安装）
let pdfParse, mammoth, marked;

try {
  pdfParse = require('pdf-parse');
  mammoth = require('mammoth');
  marked = require('marked');
} catch (e) {
  console.warn('⚠️ 文档解析库未安装，请运行: npm install pdf-parse mammoth marked');
}

/**
 * 根据文件类型提取文本
 */
async function extractText(filePath, fileType) {
  try {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return await extractPDF(filePath);
      
      case 'doc':
      case 'docx':
        return await extractDOC(filePath);
      
      case 'md':
        return await extractMarkdown(filePath);
      
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }
  } catch (error) {
    console.error(`❌ 文本提取失败 (${fileType}):`, error.message);
    throw error;
  }
}

/**
 * 提取 PDF 文本
 */
async function extractPDF(filePath) {
  if (!pdfParse) {
    throw new Error('pdf-parse 未安装');
  }
  
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  
  return {
    text: data.text,
    pages: data.numpages,
    metadata: data.info
  };
}

/**
 * 提取 DOC/DOCX 文本
 */
async function extractDOC(filePath) {
  if (!mammoth) {
    throw new Error('mammoth 未安装');
  }
  
  const result = await mammoth.extractRawText({ path: filePath });
  
  return {
    text: result.value,
    pages: 1,
    metadata: {}
  };
}

/**
 * 提取 Markdown 文本
 */
async function extractMarkdown(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // 保留原始文本（不转HTML）
  return {
    text: content,
    pages: 1,
    metadata: {}
  };
}

/**
 * 文本分块
 * @param {string} text - 原始文本
 * @param {object} options - 分块选项
 */
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || config.document.chunkSize;
  const overlap = options.overlap || config.document.chunkOverlap;
  
  // 1. 按段落分割
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // 如果段落本身就很长，需要进一步分割
    if (paragraph.length > chunkSize * 1.5) {
      // 保存当前chunk
      if (currentChunk.length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: currentChunk.trim(),
          length: currentChunk.length
        });
        currentChunk = '';
      }
      
      // 分割长段落
      const sentences = paragraph.match(/[^。！？.!?]+[。！？.!?]+/g) || [paragraph];
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize) {
          if (currentChunk.length > 0) {
            chunks.push({
              index: chunkIndex++,
              text: currentChunk.trim(),
              length: currentChunk.length
            });
            
            // 保留重叠部分
            const words = currentChunk.split('');
            currentChunk = words.slice(-overlap).join('');
          }
        }
        currentChunk += sentence;
      }
    } else {
      // 正常段落
      if (currentChunk.length + paragraph.length > chunkSize) {
        // 当前chunk已满，保存
        if (currentChunk.length > 0) {
          chunks.push({
            index: chunkIndex++,
            text: currentChunk.trim(),
            length: currentChunk.length
          });
          
          // 保留重叠部分
          const words = currentChunk.split('');
          currentChunk = words.slice(-overlap).join('') + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
      }
    }
  }
  
  // 保存最后一个chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex++,
      text: currentChunk.trim(),
      length: currentChunk.length
    });
  }
  
  return chunks;
}

/**
 * 处理文档（完整流程）
 */
async function processDocument(filePath, metadata = {}) {
  console.log(`📄 开始处理文档: ${path.basename(filePath)}`);
  
  // 1. 提取文本
  const fileType = path.extname(filePath).slice(1);
  const extracted = await extractText(filePath, fileType);
  
  console.log(`✅ 文本提取完成: ${extracted.text.length} 字符, ${extracted.pages} 页`);
  
  // 2. 文本分块
  const chunks = chunkText(extracted.text);
  
  console.log(`✅ 文本分块完成: ${chunks.length} 个块`);
  
  // 3. 返回处理结果
  return {
    text: extracted.text,
    chunks: chunks,
    metadata: {
      ...metadata,
      pages: extracted.pages,
      originalMetadata: extracted.metadata,
      chunkCount: chunks.length,
      totalLength: extracted.text.length
    }
  };
}

module.exports = {
  extractText,
  chunkText,
  processDocument
};
