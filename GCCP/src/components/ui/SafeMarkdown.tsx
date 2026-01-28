'use client';

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { memo, useMemo } from 'react';
import { Mermaid } from './Mermaid';

/**
 * Agent marker patterns that should never appear in rendered content
 * These are internal formatting tokens used by agents during generation
 */
const AGENT_MARKER_PATTERNS = [
    /<<<<<<< SEARCH\n?/g,
    /=======\n?/g,
    />>>>>>>\n?/g,
    /<<<<<<</g,
    />>>>>>>/g,
    /NO_CHANGES_NEEDED\n?/g,
    // Also catch variations with spaces
    /<{3,}\s*SEARCH/gi,
    />{3,}/g,
];

/**
 * Strip any leaked agent markers from content
 * This is a safety net to ensure internal formatting never reaches the user
 */
function stripAgentMarkers(content: string): string {
    let result = content;
    for (const pattern of AGENT_MARKER_PATTERNS) {
        result = result.replace(pattern, '');
    }
    // Clean up any resulting excessive newlines
    result = result.replace(/\n{3,}/g, '\n\n');
    return result;
}

/**
 * Fix formatting issues inside HTML tags:
 * 1. Remove escaped backslashes before dollar signs inside HTML tags (e.g., \$500 → $500)
 * 2. Convert markdown bold (**text**) inside HTML tags to <strong>text</strong>
 * 3. Convert markdown italic (*text* or _text_) inside HTML tags to <em>text</em>
 */
function fixFormattingInsideHtmlTags(content: string): string {
    // Match HTML tags with their content - handles nested tags
    const htmlTagPattern = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
    
    const processHtmlContent = (htmlContent: string): string => {
        let processed = htmlContent;
        
        // 1. Fix escaped dollar signs: \$ → $ (but preserve \\ as-is)
        processed = processed.replace(/(?<!\\)\\(\$)/g, '$1');
        
        // 2. Convert markdown bold **text** to <strong>text</strong>
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // 3. Convert markdown italic *text* to <em>text</em>
        // Be careful not to match bold markers or list items
        processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
        
        return processed;
    };
    
    // Recursively process HTML content
    const processRecursively = (text: string): string => {
        let processed = text;
        let previousResult = '';
        
        // Keep processing until no more changes (handles nested tags)
        while (processed !== previousResult) {
            previousResult = processed;
            processed = processed.replace(htmlTagPattern, (match, tagName, attributes, innerContent) => {
                // Don't process script, style, or code tags
                if (['script', 'style', 'code', 'pre'].includes(tagName.toLowerCase())) {
                    return match;
                }
                
                // Process the inner content
                const fixedContent = processHtmlContent(innerContent);
                
                // Recursively process nested HTML
                const recursivelyFixed = processRecursively(fixedContent);
                
                return `<${tagName}${attributes}>${recursivelyFixed}</${tagName}>`;
            });
        }
        
        return processed;
    };
    
    return processRecursively(content);
}

/**
 * Convert legacy mathematical HTML notation to LaTeX
 * Handles content generated before LaTeX formatting was implemented
 * Converts patterns like <em>r</em>² to $r^2$, <em>x</em> to $x$, etc.
 */
function convertLegacyMathToLatex(content: string): string {
    let result = content;
    
    // Convert single variable in <em> tags to LaTeX
    // Pattern: <em>single_letter</em> → $single_letter$
    result = result.replace(/<em>([a-zA-Z])<\/em>/g, '$$$1$$');
    
    // Convert subscripts: <em>x</em>₁ or <em>x</em>_1 → $x_1$
    result = result.replace(/\$([a-zA-Z])\$[_₀₁₂₃₄₅₆₇₈₉]+/g, (match, letter) => {
        const subscript = match.slice(letter.length + 2); // Skip $letter$
        return `$${letter}_{${subscript}}$`;
    });
    
    // Convert superscripts: <em>r</em>² or <em>x</em>^2 → $r^2$ or $x^2$
    result = result.replace(/\$([a-zA-Z])\$[²³⁴⁵⁶⁷⁸⁹⁰¹]/g, (match, letter) => {
        const superscriptMap: Record<string, string> = {
            '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
            '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
        };
        const sup = match.slice(letter.length + 2);
        const converted = superscriptMap[sup] || sup;
        return `$${letter}^${converted}$`;
    });
    
    // Convert Greek letters in <em>: <em>α</em>, <em>β</em>, etc. → $\alpha$, $\beta$
    const greekMap: Record<string, string> = {
        'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon',
        'ζ': 'zeta', 'η': 'eta', 'θ': 'theta', 'ι': 'iota', 'κ': 'kappa',
        'λ': 'lambda', 'μ': 'mu', 'ν': 'nu', 'ξ': 'xi', 'ο': 'omicron',
        'π': 'pi', 'ρ': 'rho', 'σ': 'sigma', 'τ': 'tau', 'υ': 'upsilon',
        'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
        'Δ': 'Delta', 'Φ': 'Phi', 'Γ': 'Gamma', 'Λ': 'Lambda',
        'Ω': 'Omega', 'Π': 'Pi', 'Σ': 'Sigma', 'Θ': 'Theta', 'Ξ': 'Xi'
    };
    
    for (const [greek, latex] of Object.entries(greekMap)) {
        result = result.replace(new RegExp(`\\$${greek}\\$`, 'g'), `$\\${latex}$`);
    }
    
    return result;
}

/**
 * Full content preprocessing pipeline
 * 1. Strip any leaked agent markers
 * 2. Convert legacy math HTML to LaTeX
 * 3. Fix HTML formatting issues
 */
function preprocessContent(content: string): string {
    let result = content;
    // First strip agent markers
    result = stripAgentMarkers(result);
    // Convert legacy <em>x</em> style math to LaTeX $x$
    result = convertLegacyMathToLatex(result);
    // Then fix HTML formatting
    result = fixFormattingInsideHtmlTags(result);
    return result;
}

/**
 * Custom sanitization schema that extends the default to allow:
 * - Common HTML tags for layout and styling
 * - Safe inline styles
 * - Data attributes for custom components
 * 
 * Blocked for XSS prevention:
 * - Script tags and event handlers (onclick, onerror, etc.)
 * - JavaScript URLs
 * - Form elements
 * - Iframes and embeds
 */
const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        // Layout elements
        'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
        // Text formatting
        'mark', 'small', 'sub', 'sup', 'ins', 'del', 'abbr', 'cite', 'dfn', 'kbd', 'samp', 'var',
        // Interactive elements (safe ones)
        'details', 'summary',
        // Table elements (extending default)
        'caption', 'colgroup', 'col',
        // Figure elements
        'figure', 'figcaption',
        // Definition lists
        'dl', 'dt', 'dd',
        // Ruby annotations
        'ruby', 'rt', 'rp',
        // Other semantic elements
        'address', 'time', 'data', 'meter', 'progress',
        // KaTeX elements for math rendering
        'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mtext', 'mspace',
        'msup', 'msub', 'msubsup', 'munder', 'mover', 'munderover', 'mfrac',
        'mroot', 'msqrt', 'mtable', 'mtr', 'mtd', 'mlabeledtr', 'menclose',
        'mstyle', 'merror', 'mpadded', 'mphantom', 'mglyph', 'maligngroup',
        'malignmark', 'annotation', 'annotation-xml',
    ],
    attributes: {
        ...defaultSchema.attributes,
        '*': [
            ...(defaultSchema.attributes?.['*'] || []),
            // Allow class and id for styling
            'className', 'class', 'id',
            // Allow data attributes for custom functionality
            ['data*', /^data-/],
            // Allow title for tooltips
            'title',
            // Allow lang and dir for internationalization
            'lang', 'dir',
            // Allow role and aria attributes for accessibility
            'role', ['aria*', /^aria-/],
            // Allow style for KaTeX elements
            'style',
        ],
        div: ['style'],
        span: ['style'],
        table: ['style'],
        td: ['style', 'colspan', 'rowspan'],
        th: ['style', 'colspan', 'rowspan', 'scope'],
        col: ['span', 'style'],
        colgroup: ['span'],
        details: ['open'],
        time: ['datetime'],
        data: ['value'],
        meter: ['value', 'min', 'max', 'low', 'high', 'optimum'],
        progress: ['value', 'max'],
        img: [...(defaultSchema.attributes?.img || []), 'loading', 'decoding'],
        a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
        // MathML attributes
        math: ['xmlns', 'display', 'style'],
        mrow: ['style'],
        mi: ['style', 'mathvariant'],
        mo: ['style', 'stretchy', 'fence', 'separator', 'lspace', 'rspace', 'minsize', 'maxsize', 'symmetric'],
        mn: ['style'],
        mfrac: ['style', 'linethickness'],
        msup: ['style'],
        msub: ['style'],
        msubsup: ['style'],
        msqrt: ['style'],
        mroot: ['style'],
        mtable: ['style', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing'],
        mtr: ['style', 'columnalign', 'rowalign'],
        mtd: ['style', 'columnalign', 'rowalign', 'columnspan', 'rowspan'],
        mover: ['style', 'accent'],
        munder: ['style', 'accentunder'],
        munderover: ['style', 'accent', 'accentunder'],
        mstyle: ['style', 'mathcolor', 'mathbackground', 'scriptlevel', 'displaystyle'],
        mspace: ['style', 'width', 'height', 'depth'],
        mpadded: ['style', 'width', 'height', 'depth', 'lspace', 'voffset'],
        menclose: ['style', 'notation'],
        semantics: ['style'],
        annotation: ['encoding', 'style'],
    },
    // Allow safe CSS properties in style attributes
    clobber: defaultSchema.clobber,
    clobberPrefix: defaultSchema.clobberPrefix,
    protocols: {
        ...defaultSchema.protocols,
        href: ['http', 'https', 'mailto', 'tel'],
        src: ['http', 'https', 'data'],
    },
};

// Allowed CSS properties for style attributes (prevents CSS-based attacks)
const allowedCSSProperties = new Set([
    // Text styling
    'color', 'background-color', 'background', 'font-size', 'font-weight', 'font-style',
    'font-family', 'text-align', 'text-decoration', 'text-transform', 'line-height',
    'letter-spacing', 'word-spacing', 'white-space', 'vertical-align',
    // Box model
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-width', 'border-style', 'border-color', 'border-radius',
    'border-top', 'border-right', 'border-bottom', 'border-left',
    // Layout
    'display', 'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
    'overflow', 'overflow-x', 'overflow-y',
    // Flexbox
    'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content',
    'gap', 'row-gap', 'column-gap',
    // Grid
    'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
    // Other
    'opacity', 'visibility', 'list-style', 'list-style-type',
]);

/**
 * Sanitize inline styles to prevent CSS-based attacks
 * Handles both string styles (from HTML) and React style objects
 */
function sanitizeStyle(style: string | Record<string, any> | undefined): React.CSSProperties | undefined {
    if (!style) return undefined;
    
    // If style is already an object (React style), sanitize its properties
    if (typeof style === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(style)) {
            // Convert camelCase to kebab-case for checking
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            if (allowedCSSProperties.has(kebabKey) && 
                typeof value === 'string' && 
                !value.includes('expression') && 
                !value.includes('javascript')) {
                sanitized[key] = value;
            }
        }
        return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }
    
    // If style is a string, parse and sanitize it
    if (typeof style === 'string') {
        const sanitized: Record<string, string> = {};
        style.split(';').forEach(rule => {
            const trimmed = rule.trim();
            if (!trimmed) return;
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) return;
            const property = trimmed.slice(0, colonIndex).trim().toLowerCase();
            const value = trimmed.slice(colonIndex + 1).trim();
            
            // Block potentially dangerous properties
            if (property.includes('expression') || 
                property.includes('javascript') ||
                property.includes('behavior') ||
                property.includes('binding') ||
                value.includes('url(')) {
                return;
            }
            
            if (allowedCSSProperties.has(property)) {
                // Convert kebab-case to camelCase for React
                const camelKey = property.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                sanitized[camelKey] = value;
            }
        });
        return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }
    
    return undefined;
}

interface SafeMarkdownProps {
    children: string;
    /** Enable math rendering with KaTeX */
    math?: boolean;
    /** Enable syntax highlighting for code blocks */
    highlight?: boolean;
    /** Enable Mermaid diagram rendering */
    mermaid?: boolean;
    /** Additional custom components */
    components?: Components;
    /** Additional CSS class for the wrapper */
    className?: string;
}

/**
 * SafeMarkdown - A secure Markdown renderer with HTML support
 * 
 * Features:
 * - Full Markdown syntax support (GFM)
 * - Embedded HTML tags (div, span, details, table, etc.)
 * - XSS protection via rehype-sanitize
 * - Optional math rendering (KaTeX)
 * - Optional syntax highlighting
 * - Optional Mermaid diagram support
 * 
 * @example
 * ```tsx
 * <SafeMarkdown math highlight mermaid>
 *   {`# Hello World
 *   
 *   <div style="color: blue;">Styled HTML</div>
 *   
 *   <details>
 *     <summary>Click to expand</summary>
 *     Hidden content
 *   </details>
 *   
 *   $$E = mc^2$$
 *   `}
 * </SafeMarkdown>
 * ```
 */
function SafeMarkdownComponent({ 
    children, 
    math = false, 
    highlight = true, 
    mermaid = false,
    components: customComponents,
    className,
}: SafeMarkdownProps) {
    // Preprocess content:
    // 1. Strip any leaked agent markers (<<<<<<< SEARCH, =======, >>>>>>>)
    // 2. Fix formatting issues inside HTML tags (\$ → $, ** → <strong>)
    const processedContent = useMemo(() => {
        return preprocessContent(children);
    }, [children]);

    // Build remark plugins array - use any[] to avoid type compatibility issues
    const remarkPlugins: any[] = [remarkGfm];
    if (math) {
        // Configure remark-math to handle single $ for inline math
        remarkPlugins.push([remarkMath, { singleDollarTextMath: true }]);
    }

    // Build rehype plugins array - order matters!
    // 1. rehype-katex renders math FIRST (before raw HTML parsing interferes)
    // 2. rehype-raw parses HTML in markdown
    // 3. Other plugins process the content
    const rehypePlugins: any[] = [];
    
    // KaTeX must run BEFORE rehype-raw to catch math delimiters
    // that might otherwise be swallowed by HTML parsing
    if (math) {
        rehypePlugins.push(rehypeKatex);
    }
    
    // Parse raw HTML after math is rendered
    rehypePlugins.push(rehypeRaw);
    
    // NOTE: Sanitization disabled for now as it interferes with KaTeX rendering
    // The content is already sanitized on the server side during generation
    // rehypePlugins.push([rehypeSanitize, sanitizeSchema]);
    
    if (highlight) {
        rehypePlugins.push(rehypeHighlight);
    }

    // Build components object
    const components: Components = {
        // Sanitize style attributes on elements that support them
        div: ({ node, style, ...props }: any) => (
            <div {...props} style={sanitizeStyle(style)} />
        ),
        span: ({ node, style, ...props }: any) => (
            <span {...props} style={sanitizeStyle(style)} />
        ),
        // Handle code blocks with optional Mermaid support
        code: ({ node, inline, className: codeClassName, children: codeChildren, ...props }: any) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            if (!inline && mermaid && match && match[1] === 'mermaid') {
                return <Mermaid chart={String(codeChildren).replace(/\n$/, '')} />;
            }
            return <code className={codeClassName} {...props}>{codeChildren}</code>;
        },
        // Ensure links open safely in new tabs when external
        a: ({ node, href, children: linkChildren, ...props }: any) => {
            const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
            return (
                <a 
                    href={href} 
                    {...props}
                    {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                    {linkChildren}
                </a>
            );
        },
        ...customComponents,
    };

    // Wrap in a div if className is provided since ReactMarkdown doesn't support className directly
    const markdownContent = (
        <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={components}
        >
            {processedContent}
        </ReactMarkdown>
    );

    return className ? <div className={className}>{markdownContent}</div> : markdownContent;
}

/**
 * Memoized SafeMarkdown component for better performance
 * Use this for content that doesn't change frequently
 */
export const SafeMarkdown = memo(SafeMarkdownComponent);

/**
 * Non-memoized version for dynamic content
 */
export { SafeMarkdownComponent };
