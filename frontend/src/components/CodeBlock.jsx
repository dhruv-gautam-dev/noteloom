import React, { useState, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { Copy, Check, FileCode2 } from 'lucide-react';

export default function CodeBlock({
  code = '',
  language = 'python',
  filename = 'example.py',
}) {
  const [copied, setCopied] = useState(false);

  // Normalize code and lines
  const normalizedCode = useMemo(() => {
    return (code || '').replace(/\r\n/g, '\n').trimEnd();
  }, [code]);

  const lines = useMemo(() => {
    if (!normalizedCode) return [''];
    return normalizedCode.split('\n');
  }, [normalizedCode]);

  // Syntax highlight with Prism
  const highlightedHtml = useMemo(() => {
    if (!normalizedCode) return '';
    const langMap = {
      py: 'python',
      python: 'python',
      js: 'javascript',
      javascript: 'javascript',
      ts: 'typescript',
      typescript: 'typescript',
      sh: 'bash',
      bash: 'bash',
      shell: 'bash',
      json: 'json',
    };
    const targetLang = langMap[language?.toLowerCase()] || 'python';
    const grammar = Prism.languages[targetLang] || Prism.languages.python;

    try {
      return Prism.highlight(normalizedCode, grammar, targetLang);
    } catch {
      return normalizedCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [normalizedCode, language]);

  const handleCopy = () => {
    if (!normalizedCode) return;
    navigator.clipboard.writeText(normalizedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = language?.toUpperCase() || 'PYTHON';
  const displayFilename = filename || (language === 'bash' ? 'terminal.sh' : 'main.py');

  return (
    <div className="rounded-2xl overflow-hidden border border-[#333333] shadow-xl my-4 vscode-theme bg-[#1e1e1e]">
      {/* VS Code Window Top Bar */}
      <div className="bg-[#252526] px-4 py-2.5 border-b border-[#333333] flex items-center justify-between select-none">
        {/* Left: Window Control Dots & File Tab */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 inline-block" />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e1e1e] border border-[#333333] text-[#cccccc] text-xs font-mono font-medium">
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{displayFilename}</span>
          </div>
        </div>

        {/* Right: Language Badge & Copy Button */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#333333] text-[#9cdcfe]">
            {displayLang}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-[#cccccc] hover:text-white px-2.5 py-1 rounded hover:bg-[#333333] transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ec9b0]" />
                <span className="text-[#4ec9b0] font-medium text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body: Line Numbers Gutter + Highlighted Code */}
      <div className="flex overflow-x-auto text-[13px] leading-6 font-mono p-4">
        {/* Gutter: Line Numbers */}
        <div
          className="select-none text-right pr-4 mr-4 border-r border-[#333333] text-[#858585] text-xs flex flex-col opacity-60"
          aria-hidden="true"
        >
          {lines.map((_, idx) => (
            <span key={idx} className="h-6 leading-6 min-w-[1.75rem]">
              {idx + 1}
            </span>
          ))}
        </div>

        {/* Highlighted Code */}
        <pre className="flex-1 overflow-x-auto m-0 p-0 bg-transparent text-[#d4d4d4] leading-6 whitespace-pre">
          <code
            className="font-mono text-[13px] leading-6 block"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
}

