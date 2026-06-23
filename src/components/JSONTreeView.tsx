import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check, FileCode, List, Hash, HelpCircle, Braces } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface JSONTreeViewProps {
  data: any;
  searchTerm?: string;
}

export default function JSONTreeView({ data, searchTerm = "" }: JSONTreeViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    "root": true // expand root initially
  });
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleCopyPath = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    // Remove "root." prefix to make it standard JSON Path
    const cleanPath = path.startsWith("root.") ? path.substring(5) : path === "root" ? "" : path;
    navigator.clipboard.writeText(cleanPath);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const renderValueNode = (val: any, path: string) => {
    if (val === null) {
      return <span id="node-null" className="text-rose-500 font-mono text-xs select-all">null</span>;
    }
    if (typeof val === "boolean") {
      return (
        <span id="node-bool" className="text-amber-500 font-mono text-xs font-semibold select-all">
          {val ? "true" : "false"}
        </span>
      );
    }
    if (typeof val === "number") {
      return <span id="node-num" className="text-emerald-500 font-mono text-xs select-all">{val}</span>;
    }
    if (typeof val === "string") {
      return (
        <span id="node-str" className="text-indigo-400 font-mono text-xs whitespace-pre-wrap break-all select-all">
          "{val}"
        </span>
      );
    }
    return <span id="node-unknown" className="text-slate-400 font-mono text-xs">{typeof val}</span>;
  };

  const renderTree = (node: any, currentPath: string, keyName?: string, isLast = true): React.ReactNode => {
    const isObject = node !== null && typeof node === "object";
    const isArray = Array.isArray(node);
    const hasChildren = isObject && Object.keys(node).length > 0;
    const isExpanded = !!expandedPaths[currentPath];

    // Determine the type icon
    let typeIcon = <HelpCircle className="w-3.5 h-3.5 text-slate-500" />;
    if (isArray) {
      typeIcon = <List className="w-3.5 h-3.5 text-sky-400" id="icon-array" />;
    } else if (isObject) {
      typeIcon = <Braces className="w-3.5 h-3.5 text-purple-400" id="icon-object" />;
    } else {
      const t = typeof node;
      if (t === "string") typeIcon = <FileCode className="w-3.5 h-3.5 text-indigo-400" id="icon-string" />;
      else if (t === "number") typeIcon = <Hash className="w-3.5 h-3.5 text-emerald-400" id="icon-number" />;
    }

    // Check search term match within keyName or primitives
    const matchesSearch = () => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (keyName && keyName.toLowerCase().includes(term)) return true;
      if (!isObject && String(node).toLowerCase().includes(term)) return true;
      return false;
    };

    if (!isObject) {
      if (!matchesSearch()) return null;
      return (
        <div
          id={`tree-node-${currentPath}`}
          className="group flex items-start gap-1 py-0.5 px-2 hover:bg-slate-800/40 rounded transition-colors"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {typeIcon}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {keyName && (
              <span className="text-slate-300 font-mono text-xs font-medium">
                "{keyName}":
              </span>
            )}
            {renderValueNode(node, currentPath)}
            {!isLast && <span className="text-slate-500 font-mono text-xs">,</span>}
          </div>

          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pl-4">
            <button
              onClick={(e) => handleCopyPath(e, currentPath)}
              title="Copy JSON Path"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded transition-all"
            >
              {copiedPath === currentPath ? (
                <Check className="w-3 h-3 text-emerald-500" id="checkmark-copied" />
              ) : (
                <Copy className="w-3 h-3" id="icon-copy" />
              )}
            </button>
          </div>
        </div>
      );
    }

    const keys = Object.keys(node);
    const childNodesCount = keys.length;

    // Filter children for rendering
    const hasMatchingDescendants = () => {
      if (!searchTerm) return true;
      const searchDescendant = (obj: any): boolean => {
        if (!obj) return false;
        if (typeof obj !== "object") {
          return String(obj).toLowerCase().includes(searchTerm.toLowerCase());
        }
        for (const k in obj) {
          if (k.toLowerCase().includes(searchTerm.toLowerCase())) return true;
          if (searchDescendant(obj[k])) return true;
        }
        return false;
      };
      return searchDescendant(node);
    };

    if (!hasMatchingDescendants() && !matchesSearch()) {
      return null;
    }

    return (
      <div key={currentPath} id={`tree-branch-${currentPath}`} className="pl-1">
        <div
          onClick={() => toggleExpand(currentPath)}
          className="group flex items-center gap-1 py-1 px-2 hover:bg-slate-800/65 rounded cursor-pointer transition-colors"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" id="expanded-chevron" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" id="collapsed-chevron" />
              )
            ) : (
              <span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
            )}
          </div>

          <div className="w-4 h-4 flex items-center justify-center mr-1">
            {typeIcon}
          </div>

          <div className="flex items-center gap-1">
            {keyName && (
              <span className="text-slate-300 font-mono text-xs font-semibold">
                "{keyName}":
              </span>
            )}
            <span className="text-slate-500 font-mono text-xs">
              {isArray ? `[ Array(${childNodesCount}) ]` : `{ Object(${childNodesCount}) }`}
            </span>
          </div>

          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pl-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleCopyPath(e, currentPath)}
              title="Copy JSON Path"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded transition-all"
            >
              {copiedPath === currentPath ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden border-l border-slate-755/50 ml-3.5 pl-2 mt-0.5 flex flex-col gap-0.5"
            >
              {keys.map((key, index) => {
                const isLastItem = index === keys.length - 1;
                const pathSuffix = isArray ? `[${key}]` : `.${key}`;
                const childPath = `${currentPath}${pathSuffix}`;
                return renderTree(node[key], childPath, key, isLastItem);
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div id="tree-container" className="py-2 px-1 max-h-[500px] overflow-y-auto custom-scrollbar select-none">
      {data === undefined || data === null ? (
        <span className="text-slate-500 font-mono text-xs p-3 block">Null or Empty dataset</span>
      ) : (
        renderTree(data, "root", undefined, true)
      )}
    </div>
  );
}
