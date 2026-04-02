'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface HtmlPreviewProps {
  html: string;
  conversationId: string;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';
const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

export function HtmlPreview({ html, conversationId }: HtmlPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState(html);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const expandedIframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Update edited HTML when source changes
  useEffect(() => {
    setEditedHtml(html);
  }, [html]);

  const getIframeContent = useCallback(
    (source: string, addHighlightScript: boolean) => {
      const highlightScript = addHighlightScript
        ? `<script>
          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Remove previous highlights
            document.querySelectorAll('[data-highlight]').forEach(el => {
              el.style.outline = '';
              el.removeAttribute('data-highlight');
            });
            // Highlight clicked element
            e.target.style.outline = '2px dashed #2383E2';
            e.target.setAttribute('data-highlight', 'true');
            // Send info to parent
            const tag = e.target.tagName.toLowerCase();
            const cls = e.target.className ? '.' + e.target.className.split(' ').join('.') : '';
            const id = e.target.id ? '#' + e.target.id : '';
            window.parent.postMessage({
              type: 'element-selected',
              selector: tag + id + cls,
              text: e.target.textContent?.slice(0, 50) || '',
            }, '*');
          }, true);
        <\/script>`
        : '';
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${source}${highlightScript}</body></html>`;
    },
    []
  );

  // Listen for element selection from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        setHighlightedElement(
          `${e.data.selector}${e.data.text ? ` ("${e.data.text}")` : ''}`
        );
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const writeToIframe = useCallback(
    (iframe: HTMLIFrameElement | null, source: string, enableHighlight: boolean) => {
      if (!iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(getIframeContent(source, enableHighlight));
      doc.close();
    },
    [getIframeContent]
  );

  // Write HTML to inline iframe
  useEffect(() => {
    writeToIframe(iframeRef.current, editedHtml, false);
  }, [editedHtml, writeToIframe]);

  // Write HTML to expanded iframe
  useEffect(() => {
    if (isExpanded) {
      writeToIframe(expandedIframeRef.current, editedHtml, true);
    }
  }, [isExpanded, editedHtml, viewport, writeToIframe]);

  // Live update preview from editor
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      writeToIframe(expandedIframeRef.current, editedHtml, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [editedHtml, isEditing, writeToIframe]);

  return (
    <>
      {/* Inline thumbnail */}
      <div className="relative mt-3 rounded-lg border border-border overflow-hidden group/preview">
        <iframe
          ref={iframeRef}
          className="w-full h-[300px] bg-white pointer-events-none"
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
        />
        <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/5 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/preview:opacity-100">
          <button
            onClick={() => {
              const newTab = window.open('', '_blank');
              if (newTab) {
                newTab.document.open();
                newTab.document.write(getIframeContent(editedHtml, false));
                newTab.document.close();
              }
            }}
            className="px-3 py-1.5 text-xs font-medium bg-card-bg border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            Expand
          </button>
          <button
            onClick={() => {
              setIsExpanded(true);
              setIsEditing(true);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-card-bg border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Full-screen modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-card-bg border-b border-border">
            <div className="flex items-center gap-2">
              {/* Viewport switcher */}
              {(['desktop', 'tablet', 'mobile'] as Viewport[]).map((vp) => (
                <button
                  key={vp}
                  onClick={() => setViewport(vp)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    viewport === vp
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:bg-sidebar'
                  }`}
                >
                  {vp.charAt(0).toUpperCase() + vp.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  isEditing
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-sidebar border border-border'
                }`}
              >
                {isEditing ? 'Preview Only' : 'Edit Code'}
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(editedHtml);
                }}
                className="px-2.5 py-1 text-xs rounded-md text-text-secondary hover:bg-sidebar border border-border transition-colors"
              >
                Copy HTML
              </button>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setIsEditing(false);
                  setHighlightedElement(null);
                }}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Code editor (when editing) */}
            {isEditing && (
              <div className="w-1/2 flex flex-col border-r border-border bg-code-bg">
                <textarea
                  ref={editorRef}
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="flex-1 p-4 font-mono text-xs bg-transparent text-text-primary resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Preview iframe */}
            <div className={`${isEditing ? 'w-1/2' : 'flex-1'} flex items-start justify-center overflow-auto bg-[#f0f0f0] dark:bg-[#1a1a1a] p-4`}>
              <div
                style={{
                  width: isEditing ? '100%' : VIEWPORT_WIDTHS[viewport],
                  maxWidth: '100%',
                  transition: 'width 300ms ease',
                }}
              >
                <iframe
                  ref={expandedIframeRef}
                  className="w-full bg-white rounded-lg shadow-lg"
                  style={{ minHeight: '80vh' }}
                  sandbox="allow-scripts allow-same-origin"
                  title="HTML Preview Expanded"
                />
              </div>
            </div>
          </div>

          {/* Refine bar (when element is highlighted) */}
          {highlightedElement && (
            <div className="flex items-center gap-3 px-4 py-2 bg-card-bg border-t border-border">
              <span className="text-xs text-text-secondary truncate flex-1">
                Selected: <code className="text-accent">{highlightedElement}</code>
              </span>
              <button
                onClick={() => {
                  // This will be handled by the parent ChatArea through a callback
                  const event = new CustomEvent('chat-refine-element', {
                    detail: { selector: highlightedElement, html: editedHtml },
                  });
                  window.dispatchEvent(event);
                  setIsExpanded(false);
                  setHighlightedElement(null);
                }}
                className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Refine this
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
