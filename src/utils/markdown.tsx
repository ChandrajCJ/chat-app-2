import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Custom markdown components with Tailwind styling
const markdownComponents = {
  // Paragraphs
  p: ({ children, ...props }: any) => (
    <p className="mb-2 last:mb-0" {...props}>{children}</p>
  ),
  
  // Bold text
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-gray-900 dark:text-white" {...props}>{children}</strong>
  ),
  
  // Italic text
  em: ({ children, ...props }: any) => (
    <em className="italic" {...props}>{children}</em>
  ),
  
  // Strikethrough
  del: ({ children, ...props }: any) => (
    <del className="line-through opacity-70" {...props}>{children}</del>
  ),
  
  // Inline code
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code 
          className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
          {...props}
        >
          {children}
        </code>
      );
    }
    // Code block
    return (
      <code 
        className="block p-2 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono overflow-x-auto my-2"
        {...props}
      >
        {children}
      </code>
    );
  },
  
  // Pre (for code blocks)
  pre: ({ children, ...props }: any) => (
    <pre className="bg-gray-200 dark:bg-gray-700 rounded p-3 overflow-x-auto my-2" {...props}>
      {children}
    </pre>
  ),
  
  // Links
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href}
      className="text-blue-500 dark:text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  
  // Lists
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-2 space-y-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="ml-2" {...props}>{children}</li>
  ),
  
  // Blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote 
      className="border-l-4 border-gray-400 dark:border-gray-600 pl-4 italic my-2 text-gray-700 dark:text-gray-300"
      {...props}
    >
      {children}
    </blockquote>
  ),
  
  // Headings
  h1: ({ children, ...props }: any) => (
    <h1 className="text-2xl font-bold mb-2" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-xl font-bold mb-2" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-bold mb-2" {...props}>{children}</h3>
  ),
  
  // Horizontal rule
  hr: (props: any) => (
    <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />
  ),
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with custom styling
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/**
 * Quick markdown formatting toolbar helper
 * Returns formatted text for common markdown patterns
 */
export const markdownHelpers = {
  bold: (text: string) => `**${text}**`,
  italic: (text: string) => `*${text}*`,
  strikethrough: (text: string) => `~~${text}~~`,
  code: (text: string) => `\`${text}\``,
  codeBlock: (text: string, language = '') => `\`\`\`${language}\n${text}\n\`\`\``,
  link: (text: string, url: string) => `[${text}](${url})`,
  quote: (text: string) => `> ${text}`,
  unorderedList: (items: string[]) => items.map(item => `- ${item}`).join('\n'),
  orderedList: (items: string[]) => items.map((item, i) => `${i + 1}. ${item}`).join('\n'),
  heading1: (text: string) => `# ${text}`,
  heading2: (text: string) => `## ${text}`,
  heading3: (text: string) => `### ${text}`,
};

/**
 * Wraps selection with markdown syntax
 */
export const wrapSelection = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string = prefix
): void => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  
  const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
  
  textarea.value = newText;
  textarea.focus();
  textarea.setSelectionRange(
    start + prefix.length,
    end + prefix.length
  );
  
  // Trigger input event to update React state
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

/**
 * Insert markdown text at cursor position
 */
export const insertAtCursor = (
  textarea: HTMLTextAreaElement,
  textToInsert: string
): void => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  
  const newText = text.substring(0, start) + textToInsert + text.substring(end);
  
  textarea.value = newText;
  textarea.focus();
  textarea.setSelectionRange(
    start + textToInsert.length,
    start + textToInsert.length
  );
  
  // Trigger input event to update React state
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

