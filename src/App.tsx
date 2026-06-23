import React, { useState, useRef, useEffect } from "react";
import {
  Braces,
  Check,
  Copy,
  Download,
  Trash2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileCode,
  Search,
  ExternalLink,
  Info,
  Layers,
  Undo,
  FileJson,
  Upload,
  Database,
  Shuffle,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { samples } from "./samples";
import {
  validateJSON,
  validateSchema,
  queryByPath,
  formatJSON,
  escapeString,
  unescapeString,
  autoFixJSON,
  LintIssue,
  SchemaIssue
} from "./jsonUtils";
import JSONHighlighter from "./components/JSONHighlighter";
import JSONTreeView from "./components/JSONTreeView";

export default function App() {
  const [inputText, setInputText] = useState<string>(samples[0].content);
  const [indentSpace, setIndentSpace] = useState<"2" | "4" | "tab" | "compress">("2");
  const [queryPath, setQueryPath] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"formatted" | "tree" | "schema">("formatted");
  const [schemaInput, setSchemaInput] = useState<string>(samples[0].schema || "");
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [exportFileName, setExportFileName] = useState("data.json");
  const [treeSearch, setTreeSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Sync scroll references
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  // Parse & validate input on changes
  const validation = validateJSON(inputText);
  const parsedCount = inputText.split("\n").length;
  const lineCount = Math.max(parsedCount, 1);

  // Compute stats
  const charCount = inputText.length;
  const byteSizeKB = (charCount / 1024).toFixed(2);

  // Run JSON Path queries if valid
  let finalJSONData = validation.parsedObject;
  let hasActiveQuery = false;
  if (validation.isValid && validation.parsedObject && queryPath.trim() !== "") {
    finalJSONData = queryByPath(validation.parsedObject, queryPath);
    hasActiveQuery = true;
  }

  // Format valid JSON
  let formattedOutput = "";
  if (validation.isValid && validation.parsedObject) {
    formattedOutput = formatJSON(finalJSONData, indentSpace);
  } else if (!validation.isValid && inputText.trim()) {
    // If invalid, formatted output can show a guide or the raw text
    formattedOutput = inputText;
  }

  // Run schema validation
  let schemaIssues: SchemaIssue[] = [];
  let isSchemaValidJSON = false;
  let parsedSchema: any = null;

  try {
    if (schemaInput.trim()) {
      parsedSchema = JSON.parse(schemaInput);
      isSchemaValidJSON = true;
      if (validation.isValid && validation.parsedObject) {
        schemaIssues = validateSchema(validation.parsedObject, parsedSchema);
      }
    }
  } catch {
    isSchemaValidJSON = false;
  }

  // Automatically scroll gutter line numbers
  const handleScroll = () => {
    if (textareaRef.current && linesRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [inputText]);

  // Load sample json and corresponding schema if available
  const handleLoadSample = (index: number) => {
    const sample = samples[index];
    setInputText(sample.content);
    setSchemaInput(sample.schema || "");
    setQueryPath("");
    setTreeSearch("");
  };

  // Trigger file upload selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    }
  };

  // Actions
  const handleCopyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(formattedOutput || inputText);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", exportFileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleEscapeString = () => {
    setInputText(escapeString(inputText));
  };

  const handleUnescapeString = () => {
    setInputText(unescapeString(inputText));
  };

  const handleFormatAction = () => {
    if (validation.isValid && validation.parsedObject) {
      setInputText(formatJSON(validation.parsedObject, indentSpace === "compress" ? "2" : indentSpace));
    }
  };

  const handleMinifyAction = () => {
    if (validation.isValid && validation.parsedObject) {
      setInputText(JSON.stringify(validation.parsedObject));
    }
  };

  const handleAutoFixAction = () => {
    const repaired = autoFixJSON(inputText);
    setInputText(repaired);
  };

  const handleLineClick = (lineNum: number) => {
    if (textareaRef.current) {
      const linesArr = inputText.split("\n");
      let charIndex = 0;
      for (let i = 0; i < Math.min(lineNum - 1, linesArr.length); i++) {
        charIndex += linesArr[i].length + 1; // plus newline char
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charIndex, charIndex + (linesArr[lineNum - 1]?.length || 0));
    }
  };

  // Calculate deep nesting level safely
  const calculateMaxDepth = (val: any): number => {
    if (val === null || typeof val !== "object") return 0;
    const keys = Object.keys(val);
    if (keys.length === 0) return 1;
    return 1 + Math.max(...keys.map((k) => calculateMaxDepth(val[k])));
  };

  const maxNestingDepth = validation.isValid ? calculateMaxDepth(validation.parsedObject) : 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col p-4 md:p-6" id="applet-viewport">
      {/* Absolute background visual ambient elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Dashboard Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10" id="header-widget">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950/80 border border-indigo-500/30 rounded-xl shadow-lg shadow-indigo-500/5">
            <Braces className="w-6 h-6 text-indigo-400" id="header-icon" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
              JSON Formatter & Validator
              <span className="text-[10px] bg-indigo-900/60 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono text-indigo-300 font-normal">
                v1.1
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Beautiful developer tool for editing, instant syntax debugging, and tree inspection.
            </p>
          </div>
        </div>

        {/* Global Stats bar */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 py-1">
          {/* Validation state badge */}
          {inputText.trim() === "" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-900/40 border border-slate-800" id="status-empty">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
              Empty Input
            </span>
          ) : validation.isValid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/20 border border-emerald-500/20" id="status-valid">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Valid JSON
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-950/25 border border-rose-500/20" id="status-invalid">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
              Malformed JSON ({validation.issues.length} {validation.issues.length === 1 ? "issue" : "issues"})
            </span>
          )}

          {/* Quick telemetry */}
          <div className="flex items-center divide-x divide-slate-800 bg-slate-900/40 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 shadow-sm" id="stats-pill">
            <span className="px-2.5 py-1.5 flex items-center gap-1">
              <strong>{charCount}</strong> chars
            </span>
            <span className="px-2.5 py-1.5 flex items-center gap-1">
              <strong>{byteSizeKB}</strong> KB
            </span>
            {validation.isValid && (
              <span className="px-2.5 py-1.5 flex items-center gap-1">
                depth: <strong>{maxNestingDepth}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Panel grid: Left Editor, Right Output */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 relative z-10" id="main-editor-stage">
        {/* LEFT COLUMN: Input and Controls (5 Cols on large, 12 on mobile) */}
        <div className="lg:col-span-6 flex flex-col gap-4 h-full" id="left-column">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl shadow-black/30 flex flex-col h-[650px] relative">
            {/* Title Bar containing Sample selector & upload */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-200">Raw JSON Input</span>
              </div>

              {/* Sample loader */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Quick Samples:</label>
                <select
                  onChange={(e) => handleLoadSample(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  defaultValue="0"
                  id="sample-selector"
                >
                  {samples.map((sample, idx) => (
                    <option key={idx} value={idx}>
                      {sample.name} ({sample.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editing quick action toolbar */}
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-850/50 flex flex-wrap items-center gap-2 justify-between">
              {/* Left Action group */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFormatAction}
                  disabled={!validation.isValid}
                  title="Beautify spaces in the source textarea"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                  id="btn-beautify"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Format
                </button>
                <button
                  type="button"
                  onClick={handleMinifyAction}
                  disabled={!validation.isValid}
                  title="Minify and compress source JSON text to one line"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                  id="btn-minify"
                >
                  <Layers className="w-3 h-3 text-sky-400" />
                  Minify
                </button>
                <div className="h-4 w-px bg-slate-800" />
                <button
                  type="button"
                  onClick={handleEscapeString}
                  title="Escape double quotes & add backslashes inside JSON"
                  className="px-2 py-1 bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors"
                  id="btn-escape"
                >
                  Escape
                </button>
                <button
                  type="button"
                  onClick={handleUnescapeString}
                  title="Remove string escaping and backslashes"
                  className="px-2 py-1 bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors"
                  id="btn-unescape"
                >
                  Unescape
                </button>
              </div>

              {/* Right Action buttons */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  title="Clear source code"
                  className="p-1 px-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-md transition-all flex items-center gap-1"
                  id="btn-clear"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>

                {/* File Upload trigger */}
                <label className="p-1 px-2.5 cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-all flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  Upload
                  <input
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="input-upload-raw"
                  />
                </label>
              </div>
            </div>

            {/* Draggables wrapper */}
            <div
              className={`flex-1 flex items-stretch overflow-hidden relative ${dragOver ? "opacity-75 bg-slate-950" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag over overlay visual */}
              {dragOver && (
                <div className="absolute inset-0 z-30 bg-indigo-950/90 flex flex-col items-center justify-center border-2 border-indigo-500 border-dashed m-3 rounded-lg pointer-events-none">
                  <Upload className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
                  <p className="text-sm font-semibold text-white">Drop JSON File Here</p>
                  <p className="text-xs text-slate-400 mt-1">Accepts .json and text files</p>
                </div>
              )}

              {/* Sync line numbers column */}
              <div
                ref={linesRef}
                className="w-11 select-none text-right pr-2.5 pt-3 border-r border-slate-800 text-slate-600 bg-slate-950/30 font-mono text-[10px] overflow-hidden leading-relaxed"
                id="editor-line-numbers"
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="h-[21px] flex items-center justify-end">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Primary input editor */}
              <textarea
                ref={textareaRef}
                onScroll={handleScroll}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='Paste or type raw JSON here... e.g. {"key": "value"}'
                spellCheck="false"
                className="flex-1 p-3 pt-3 bg-transparent font-mono text-xs text-indigo-100 placeholder-slate-500 focus:outline-none resize-none overflow-y-auto custom-scrollbar leading-relaxed"
                id="textarea-json-input"
              />
            </div>

            {/* Auto Fix floating block (if there are syntax errors) */}
            {validation.issues.length > 0 && (
              <div className="p-3 bg-amber-950/30 border-t border-amber-500/20 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-200">
                    Auto-fixable syntax issues detected (Comments, single quotes, or trailing commas).
                  </span>
                </div>
                <button
                  onClick={handleAutoFixAction}
                  className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg shadow-md hover:shadow-indigo-500/10 transition-all flex items-center gap-1 whitespace-nowrap"
                  id="btn-autofix"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Fix Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Views, Formatting controls, Trees (7 Cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4" id="right-column">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl shadow-black/30 flex flex-col h-[650px]">
            {/* Options bar: Tab bar controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-850">
                <button
                  type="button"
                  onClick={() => setActiveTab("formatted")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "formatted" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  id="tab-formatted"
                >
                  Formatted JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("tree");
                    // Clear search inside tree on tab shift
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "tree" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  id="tab-tree"
                >
                  Interactive Tree
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("schema")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "schema" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  id="tab-schema"
                >
                  Schema Validator
                </button>
              </div>

              {/* Utility configuration options */}
              {activeTab === "formatted" && validation.isValid && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Spacer:</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                    {(["2", "4", "tab", "compress"] as const).map((space) => (
                      <button
                        key={space}
                        onClick={() => setIndentSpace(space)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-all ${indentSpace === space ? "bg-indigo-650 text-white" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {space === "tab" ? "Tab" : space === "compress" ? "Min" : `${space}s`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Panel for the active tab (Download and copy output) */}
            <div className="bg-slate-900/30 px-4 py-2 border-b border-slate-850/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-grow max-w-xs md:max-w-md">
                {activeTab === "tree" ? (
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                      placeholder="Search within tree keys or values..."
                      value={treeSearch}
                      onChange={(e) => setTreeSearch(e.target.value)}
                      id="input-tree-search"
                    />
                  </div>
                ) : (
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                      value={queryPath}
                      onChange={(e) => setQueryPath(e.target.value)}
                      placeholder="Filter by JSONPath (e.g. preferences.theme)..."
                      disabled={!validation.isValid}
                      id="input-jsonpath-filter"
                    />
                    {queryPath && (
                      <button
                        onClick={() => setQueryPath("")}
                        className="absolute right-2 top-1.5 text-[9px] bg-slate-800 text-slate-400 hover:text-white px-1.5 py-0.5 rounded"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Export actions */}
              {activeTab !== "schema" && (
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    onClick={() => handleCopyToClipboard(formattedOutput || inputText, setCopiedOutput)}
                    className="p-1 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-md transition-all flex items-center gap-1"
                    id="btn-copy-output"
                  >
                    {copiedOutput ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={exportFileName}
                      onChange={(e) => setExportFileName(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded text-[11px] px-1.5 py-1 w-24 focus:outline-none text-slate-300 font-mono"
                      placeholder="data.json"
                    />
                    <button
                      onClick={handleDownloadFile}
                      className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-200 transition-all flex items-center gap-1"
                      title="Download as JSON file"
                      id="btn-download-output"
                    >
                      <Download className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Render Active Tab Space */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950/40" id="output-pane-wrapper">
              <AnimatePresence mode="wait">
                {activeTab === "formatted" && (
                  <motion.div
                    key="formatted-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="h-full"
                  >
                    {!inputText.trim() ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                        <FileCode className="w-10 h-10 mb-2 stroke-1" />
                        <span className="text-xs font-mono">Output display will appear here</span>
                      </div>
                    ) : validation.isValid ? (
                      <JSONHighlighter
                        code={formattedOutput}
                        errorLine={undefined}
                        highlightedLine={hasActiveQuery ? 1 : undefined}
                      />
                    ) : (
                      <div className="p-4 flex flex-col gap-4">
                        <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl">
                          <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            Syntax Error Diagnostics
                          </h3>
                          <p className="text-xs font-mono mt-1 text-slate-300">
                            {validation.error?.message}
                          </p>
                          {validation.error?.line && (
                            <div className="text-xs font-mono mt-2 text-rose-300">
                              Error detected surrounding Line{" "}
                              <button
                                onClick={() => handleLineClick(validation.error?.line || 1)}
                                className="underline hover:text-rose-100 font-bold"
                              >
                                {validation.error?.line}
                              </button>
                              , Column {validation.error?.column}.
                            </div>
                          )}
                        </div>

                        {/* Displays unformatted parsed highlight to preview where it broke */}
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                          <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400">
                            Source Highlight Map
                          </div>
                          <JSONHighlighter code={inputText} errorLine={validation.error?.line} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "tree" && (
                  <motion.div
                    key="tree-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="p-3"
                  >
                    {!inputText.trim() ? (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                        <FileCode className="w-10 h-10 mb-2 stroke-1" />
                        <span className="text-xs font-mono">No data to parse tree model</span>
                      </div>
                    ) : validation.isValid ? (
                      <JSONTreeView data={finalJSONData} searchTerm={treeSearch} />
                    ) : (
                      <div className="p-4 text-center text-slate-400 py-12">
                        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-stone-200">Unable to Render Interactive Tree</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          The JSON input contains compilation errors. Please fix syntax errors first in the Formatting tab.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "schema" && (
                  <motion.div
                    key="schema-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="p-4 flex flex-col gap-4 h-full"
                    id="schema-workspace"
                  >
                    {/* Schema validation instructions */}
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-300">
                      <div className="flex items-center gap-1.5 font-semibold text-indigo-400 mb-1">
                        <Info className="w-3.5 h-3.5" />
                        JSON Schema Constraints Solver
                      </div>
                      Write or select a schema blueprint to test the parsed JSON records structure against object fields, numerical ranges, array bounds, and optional property key dependencies.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                      {/* Left: Schema input */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-400">Target Schema Definition:</label>
                          <button
                            onClick={() => {
                              // Load currently matching template schema if available
                              const sampleWithSchema = samples.find(s => s.schema && inputText.includes(s.name.split(" ")[0]));
                              if (sampleWithSchema?.schema) {
                                setSchemaInput(sampleWithSchema.schema);
                              } else {
                                setSchemaInput(samples[0].schema || "");
                              }
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/20"
                          >
                            Load Template Schema
                          </button>
                        </div>
                        <textarea
                          value={schemaInput}
                          onChange={(e) => setSchemaInput(e.target.value)}
                          placeholder="Place your JSON schema here..."
                          className="w-full h-80 bg-slate-950 border border-slate-850 p-2.5 font-mono text-xs rounded-lg text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar"
                          id="textarea-schema-input"
                        />
                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <span>Status: {isSchemaValidJSON ? "Valid Schema JSON" : "Invalid/Empty Schema"}</span>
                          <button
                            onClick={() => setSchemaInput("")}
                            className="text-rose-400 hover:underline"
                          >
                            Clear Schema
                          </button>
                        </div>
                      </div>

                      {/* Right: Validation outcome diagnostics */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-400">Compliancy Report:</label>
                        <div className="flex-1 bg-slate-950/60 border border-slate-850 rounded-lg p-3 overflow-y-auto custom-scrollbar font-mono text-xs">
                          {!inputText.trim() ? (
                            <span className="text-slate-500">Awaiting document input</span>
                          ) : !validation.isValid ? (
                            <span className="text-rose-400 block p-1">
                              ⚠️ JSON source document must compile before schema checking can resume.
                            </span>
                          ) : !schemaInput.trim() ? (
                            <span className="text-slate-500 block p-1">
                              Schema empty. Paste constraints on the left to inspect variables.
                            </span>
                          ) : !isSchemaValidJSON ? (
                            <span className="text-rose-400 block p-1">
                              ⚠️ Schema code is not valid JSON. Ensure keys are double-quoted.
                            </span>
                          ) : schemaIssues.length === 0 ? (
                            <div className="text-emerald-400 p-2 bg-emerald-950/15 border border-emerald-500/20 rounded-md">
                              <span className="font-bold">✔ Pass:</span> Document meets all schema constraints with zero structure variance.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="text-amber-400 font-bold block pb-1">
                                ✘ Structural anomalies found ({schemaIssues.length}):
                              </span>
                              {schemaIssues.map((issue, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-amber-950/20 border-l-2 border-amber-500 text-stone-200 rounded"
                                >
                                  <div className="font-bold text-amber-500">
                                    {issue.path}
                                  </div>
                                  <div className="text-slate-300 mt-0.5 text-[11px]">
                                    {issue.message}
                                  </div>
                                  <div className="flex gap-4 mt-1 text-[10px] text-slate-500 divide-x divide-slate-800">
                                    <span>Expected: {issue.expected}</span>
                                    <span className="pl-4">Got: {issue.actual}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER: Diagnostics center to resolve complaints */}
      <footer className="mt-6 border-t border-slate-800/80 pt-5 relative z-10" id="footer-linter-suite">
        <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          JSON Debugging Diagnostics & Interactive Console
        </h2>

        {!inputText.trim() ? (
          <div className="p-4 text-center bg-slate-900/20 border border-slate-850 rounded-xl text-xs text-slate-500">
            Paste some JSON in the editor map above to populate automated diagnostics checks.
          </div>
        ) : validation.isValid ? (
          <div className="p-4 bg-emerald-950/10 border border-emerald-500/10 rounded-xl flex items-center gap-3">
            <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-md">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-emerald-400">Pristine Syntax Compiled!</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Standard JavaScript parsers digested this file successfully. Character structures and quotes match JSON specifications.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Detailed list of complaints */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-slate-300 border-b border-slate-850 pb-2 flex items-center justify-between">
                <span>Identified Issues ({validation.issues.length})</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-rose-950/40 text-rose-400 rounded border border-rose-500/10">
                  Linter Alerts
                </span>
              </div>

              <div className="overflow-y-auto max-h-36 custom-scrollbar pr-1 flex flex-col gap-2.5">
                {validation.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleLineClick(issue.line)}
                    className="group border border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/80 p-2.5 rounded-lg cursor-pointer transition-all flex items-start gap-2.5"
                  >
                    <div className="p-1 bg-rose-950 text-rose-400 rounded text-[10px] font-mono font-semibold">
                      L{issue.line}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-200 leading-tight">
                        {issue.message}
                      </div>
                      {issue.context && (
                        <div className="font-mono text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded mt-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                          {issue.context}
                        </div>
                      )}
                      {issue.fixSuggestion && (
                        <div className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
                          <span className="font-semibold">💡 Try:</span> {issue.fixSuggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick-tips & specifications resolver */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-300 mb-2">Standard JSON Specification Quick-Sheet</h3>
                <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                  <li>Double quotes <code className="text-indigo-400 bg-slate-950 px-1 rounded">"key"</code> are required for both properties and string values.</li>
                  <li>In-line comments <code className="text-stone-500 font-mono">// ...</code> are forbidden by standard specifications.</li>
                  <li>Trailing commas list items e.g., <code className="text-rose-400">[1, 2, 3,]</code> are illegal.</li>
                  <li>Object properties must end with closing colons <code className="text-indigo-400 font-semibold">:</code>.</li>
                  <li>Capitalization of values must be strictly lowercase: <code className="text-emerald-400">true</code>, <code className="text-emerald-400">false</code>, <code className="text-rose-400">null</code>.</li>
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-850/50 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  Diagnostics engine automatically compiles on updates.
                </span>
                <button
                  onClick={handleAutoFixAction}
                  className="px-3 py-1.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-400 rounded-lg font-semibold transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Perform Standard Repair
                </button>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
