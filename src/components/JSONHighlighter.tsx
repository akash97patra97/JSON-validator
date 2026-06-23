import React from "react";

interface JSONHighlighterProps {
  code: string;
  errorLine?: number;
  highlightedLine?: number;
}

export default function JSONHighlighter({ code, errorLine, highlightedLine }: JSONHighlighterProps) {
  const lines = code.split("\n");

  // Regex tokenizer for JSON elements
  // Group 1: key (includes ending colon)
  // Group 2: string (without colon)
  // Group 3: number
  // Group 4: boolean/null
  // Group 5: brackets/braces/commas
  const tokenRegex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)|("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([{}[\],])/g;

  const tokenizeLine = (lineText: string, lineIndex: number) => {
    if (lineText.trim() === "") {
      return <span>&nbsp;</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex index
    tokenRegex.lastIndex = 0;

    while ((match = tokenRegex.exec(lineText)) !== null) {
      const matchIndex = match.index;

      // Add unmatched text leading up to the match (usually whitespaces/tabs)
      if (matchIndex > lastIndex) {
        elements.push(
          <span key={`text-${lineIndex}-${lastIndex}`} className="text-slate-400">
            {lineText.substring(lastIndex, matchIndex)}
          </span>
        );
      }

      const [
        fullMatch,
        keyStr,
        keyColon,
        valStr,
        numStr,
        boolStr,
        puncStr
      ] = match;

      if (keyStr) {
        // It's a JSON key
        elements.push(
          <span key={`key-${lineIndex}-${matchIndex}`} className="text-sky-300 font-semibold">
            {keyStr}
          </span>
        );
        if (keyColon) {
          elements.push(
            <span key={`colon-${lineIndex}-${matchIndex}`} className="text-slate-300">
              {keyColon}
            </span>
          );
        }
      } else if (valStr) {
        // It's a string value
        elements.push(
          <span key={`val-${lineIndex}-${matchIndex}`} className="text-orange-300">
            {valStr}
          </span>
        );
      } else if (numStr) {
        // It's a number value
        elements.push(
          <span key={`num-${lineIndex}-${matchIndex}`} className="text-amber-400">
            {numStr}
          </span>
        );
      } else if (boolStr) {
        // It's boolean or null
        const color = boolStr === "null" ? "text-slate-500" : "text-indigo-400 font-semibold";
        elements.push(
          <span key={`bool-${lineIndex}-${matchIndex}`} className={color}>
            {boolStr}
          </span>
        );
      } else if (puncStr) {
        // It's punctuation (brackets, bracing, commas)
        elements.push(
          <span key={`punc-${lineIndex}-${matchIndex}`} className="text-slate-400">
            {puncStr}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    // Add remaining unmatched text at the end of the line
    if (lastIndex < lineText.length) {
      elements.push(
        <span key={`text-end-${lineIndex}`} className="text-slate-400">
          {lineText.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div id="highlighter-workspace" className="font-mono text-xs overflow-x-auto select-text py-2 max-h-[500px] custom-scrollbar text-slate-100">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const isErrorLine = errorLine === lineNum;
            const isHighlighted = highlightedLine === lineNum;

            let rowBgClass = "hover:bg-slate-800/40";
            if (isErrorLine) {
              rowBgClass = "bg-rose-950/40 hover:bg-rose-950/50 border-l-2 border-rose-500 animate-pulse";
            } else if (isHighlighted) {
              rowBgClass = "bg-amber-950/30 hover:bg-amber-950/40 border-l-2 border-amber-500";
            }

            return (
              <tr key={`row-${lineNum}`} className={`group flex items-stretch leading-relaxed ${rowBgClass}`} id={`highlighter-row-${lineNum}`}>
                {/* Gutter / Line numbers */}
                <td className="w-10 select-none text-right pr-3 border-r border-slate-800 text-slate-600 font-mono text-[10px] flex items-center justify-end">
                  {lineNum}
                </td>
                {/* Line Code */}
                <td className="pl-4 py-0.5 whitespace-pre pr-4 text-slate-300 flex-1 overflow-x-auto">
                  {tokenizeLine(lineText, idx)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
