"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
  title?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied!",
  className = "",
  iconOnly = false,
  title = "Copy to clipboard",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`relative inline-flex items-center justify-center rounded-lg p-1.5 transition-all ${
          copied
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "text-gray-400 hover:bg-white/[0.06] hover:text-white"
        } ${className}`}
        title={copied ? copiedLabel : title}
        aria-label={copied ? copiedLabel : title}
      >
        {copied ? (
          <Icon name="check" className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" />
        ) : (
          <Icon name="copy" className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
        copied
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
      } ${className}`}
      title={title}
    >
      {copied ? (
        <>
          <Icon name="check" className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <Icon name="copy" className="h-3.5 w-3.5 text-gray-400" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
