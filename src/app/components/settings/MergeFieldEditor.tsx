import { useState, useRef, useEffect } from 'react';

interface MergeFieldEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onEditorReady?: (insertField: (fieldName: string) => void) => void;
}

export const MergeFieldEditor = ({
  value,
  onChange,
  placeholder,
  rows = 8,
  className = '',
  onEditorReady,
}: MergeFieldEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Convert plain text with {{}} to HTML with styled tags
  const renderContent = (text: string) => {
    if (!text) return '';
    
    const parts = text.split(/({{[^}]+}})/g);
    return parts
      .map((part) => {
        if (part.match(/^{{[^}]+}}$/)) {
          const fieldName = part.slice(2, -2);
          return `<span class="merge-field" contenteditable="false" data-field="${fieldName}">${part}<button class="merge-field-remove" data-field="${fieldName}">×</button></span>`;
        }
        return part.replace(/\n/g, '<br>');
      })
      .join('');
  };

  // Convert HTML back to plain text with {{}}
  const extractPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Replace merge field spans with {{}} syntax
    temp.querySelectorAll('.merge-field').forEach((span) => {
      const fieldName = span.getAttribute('data-field');
      span.replaceWith(`{{${fieldName}}}`);
    });
    
    // Get text content and preserve line breaks
    let text = temp.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<div>/gi, '\n');
    text = text.replace(/<\/div>/gi, '');
    
    // Create a temporary element to decode HTML entities
    const textTemp = document.createElement('textarea');
    textTemp.innerHTML = text;
    return textTemp.value;
  };

  // Update editor content when value changes externally
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = renderContent(value);
    }
  }, [value]);

  // Initial render
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = renderContent(value);
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const plainText = extractPlainText(editorRef.current.innerHTML);
      onChange(plainText);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Handle remove button clicks
    const target = e.target as HTMLElement;
    if (target.classList.contains('merge-field-remove')) {
      e.preventDefault();
      e.stopPropagation();
      const fieldName = target.getAttribute('data-field');
      const mergeField = target.parentElement;
      if (mergeField && editorRef.current) {
        mergeField.remove();
        handleInput();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const insertMergeField = (fieldName: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      // Create the merge field element
      const span = document.createElement('span');
      span.className = 'merge-field';
      span.contentEditable = 'false';
      span.setAttribute('data-field', fieldName);
      span.innerHTML = `{{${fieldName}}}<button class="merge-field-remove" data-field="${fieldName}">×</button>`;
      
      // Insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        
        // Add a space after the merge field
        const space = document.createTextNode('\u00A0');
        range.insertNode(space);
        
        // Move cursor after the space
        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, append to end
        editorRef.current.appendChild(span);
        editorRef.current.appendChild(document.createTextNode('\u00A0'));
      }
      
      handleInput();
    }
  };

  // Expose insertMergeField method to parent via callback
  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(insertMergeField);
    }
  }, [onEditorReady]);

  const heightStyle = {
    minHeight: `${rows * 1.5}rem`,
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onClick={handleClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        className={`
          w-full px-3 py-2 text-sm rounded-md border
          ${isFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300'}
          focus:outline-none overflow-auto
          ${!value && !isFocused ? 'empty:before:content-[attr(data-placeholder)] before:text-slate-400' : ''}
          ${className}
        `}
        style={heightStyle}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style>{`
        .merge-field {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8125rem;
          font-weight: 600;
          margin: 0 2px;
          white-space: nowrap;
          cursor: default;
          user-select: none;
        }
        .merge-field-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 3px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          margin-left: 2px;
          transition: background 0.15s;
        }
        .merge-field-remove:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};
