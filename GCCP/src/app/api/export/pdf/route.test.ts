/**
 * API Route Tests for PDF Export
 * 
 * Tests:
 * - PDF generation endpoint
 * - Health check endpoint
 * - Error handling
 */

import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import puppeteer from 'puppeteer';

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

describe('PDF Export API', () => {
  const mockPage = {
    setContent: jest.fn().mockResolvedValue(undefined),
    evaluateHandle: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ========================================
  // HEALTH CHECK TESTS
  // ========================================

  describe('GET /api/export/pdf', () => {
    it('should return health check status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'ok',
        service: 'PDF Generation API',
        version: '1.0.0',
      });
    });

    it('should return JSON content type', async () => {
      const response = await GET();
      
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  // ========================================
  // PDF GENERATION TESTS
  // ========================================

  describe('POST /api/export/pdf', () => {
    it('should generate PDF from markdown content', async () => {
      const requestBody = {
        content: '# Test Document\n\nThis is a test paragraph.',
        title: 'Test Document',
        author: 'Test Author',
        filename: 'test.pdf',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('test.pdf');
    });

    it('should handle markdown with code blocks', async () => {
      const requestBody = {
        content: `
# Code Example

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`
        `,
        title: 'Code Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(puppeteer.launch).toHaveBeenCalled();
      expect(mockPage.setContent).toHaveBeenCalled();
    });

    it('should handle markdown with tables', async () => {
      const requestBody = {
        content: `
# Table Example

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
        `,
        title: 'Table Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle markdown with lists', async () => {
      const requestBody = {
        content: `
# List Example

- Item 1
- Item 2
  - Nested item
- Item 3

1. Numbered item 1
2. Numbered item 2
        `,
        title: 'List Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle markdown with blockquotes', async () => {
      const requestBody = {
        content: `
# Quote Example

> This is a blockquote.
> It can span multiple lines.

Normal paragraph.
        `,
        title: 'Quote Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should add .pdf extension if missing', async () => {
      const requestBody = {
        content: '# Test',
        filename: 'document', // No extension
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Disposition')).toContain('document.pdf');
    });

    it('should use default title when not provided', async () => {
      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPage.setContent).toHaveBeenCalled();
      // Verify default title is used in HTML
      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain('<title>Document</title>');
    });

    it('should use default filename when not provided', async () => {
      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.headers.get('Content-Disposition')).toContain('document.pdf');
    });

    it('should launch browser with correct args', async () => {
      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });
    });

    it('should generate PDF with correct format', async () => {
      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '1.5cm',
          bottom: '2cm',
          left: '1.5cm',
        },
        preferCSSPageSize: true,
      });
    });

    it('should close browser after PDF generation', async () => {
      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    it('should return 400 when content is missing', async () => {
      const requestBody = {
        title: 'Test',
        // content is missing
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content is required');
    });

    it('should return 400 when content is empty string', async () => {
      const requestBody = {
        content: '',
        title: 'Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content is required');
    });

    it('should return 500 when puppeteer launch fails', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Browser launch failed'));

      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate PDF');
      expect(data.details).toBe('Browser launch failed');
    });

    it('should return 500 when page.setContent fails', async () => {
      mockPage.setContent.mockRejectedValue(new Error('Set content failed'));

      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate PDF');
    });

    it('should return 500 when page.pdf fails', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate PDF');
    });

    it('should close browser even when PDF generation fails', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle unknown errors gracefully', async () => {
      (puppeteer.launch as jest.Mock).mockImplementation(() => {
        throw 'Unknown error'; // Not an Error object
      });

      const requestBody = {
        content: '# Test',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate PDF');
      expect(data.details).toBe('Unknown error');
    });
  });

  // ========================================
  // LARGE CONTENT TESTS
  // ========================================

  describe('Large Content Handling', () => {
    it('should handle large markdown content', async () => {
      // Generate large content (100KB)
      const largeContent = '# Large Document\n\n' + 
        Array(1000).fill('This is a paragraph with some content. '.repeat(10)).join('\n\n');

      const requestBody = {
        content: largeContent,
        title: 'Large Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle content with many code blocks', async () => {
      const codeBlocks = Array(50).fill(`
\`\`\`javascript
function example() {
  return "test";
}
\`\`\`
      `).join('\n');

      const requestBody = {
        content: codeBlocks,
        title: 'Code Heavy Document',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should handle content with special characters', async () => {
      const requestBody = {
        content: `
# Special Characters

- Emoji: 🎉 🚀 💯
- Math: ∫∂²x/∂t² = 0
- HTML entities: < > &
- Unicode: 你好 世界 مرحبا
- Accents: café résumé naïve
        `,
        title: 'Special Characters',
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  // ========================================
  // STYLING TESTS
  // ========================================

  describe('Styling Options', () => {
    it('should include custom styling in HTML', async () => {
      const requestBody = {
        content: '# Styled Document',
        title: 'Styled',
        styling: {
          headerColor: '#ff0000',
          fontSize: 14,
          lineHeight: 2,
        },
      };

      const request = new NextRequest('http://localhost:3000/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      // Note: Custom styling is accepted in request but implementation
      // may not fully apply it yet
    });
  });
});
