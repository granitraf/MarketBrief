import React, { useEffect, useMemo, useRef, useState } from "react";

type Suggestion = { ticker: string; name?: string };

interface TickerSearchInputProps {
  value?: string;
  onChange?: (v: string) => void;
  onSelect: (ticker: string) => void;
  fetchSuggestions: (q: string) => Promise<Suggestion[]>;
  placeholder?: string;
}

const isLikelyTicker = (s: string) =>
  /^[A-Z][A-Z0-9.\-\/]{0,9}$/i.test(s.trim());

export default function TickerSearchInput({
  value = "",
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder = "Search ticker (e.g., AAPL)",
}: TickerSearchInputProps) {
  const [q, setQ] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [listId, setListId] = useState('ticker-list-ssr');
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Generate unique ID only on client side to avoid hydration mismatch
  useEffect(() => {
    setListId(`ticker-list-${Math.random().toString(36).slice(2)}`);
  }, []);

  // keep controlled if parent passes value
  useEffect(() => setQ(value), [value]);

  // outside click closes
  useEffect(() => {
    function onOutside(e: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, []);

  // fetch suggestions (debounced)
  useEffect(() => {
    if (!q) {
      setSuggestions([]);
      return;
    }
    setIsOpen(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetchSuggestions(q);
        setSuggestions(res ?? []);
        setActiveIndex(0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, fetchSuggestions]);

  const handleChange = (v: string) => {
    setQ(v);
    onChange?.(v);
    setIsOpen(true);
  };

  const commit = (ticker: string) => {
    const t = ticker.trim();
    if (!t) return;
    onSelect(t.toUpperCase());
    setIsOpen(false);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && suggestions.length > 0) {
        commit(suggestions[activeIndex]?.ticker ?? suggestions[0].ticker);
      } else if (isLikelyTicker(q)) {
        commit(q);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      role="combobox"
      aria-expanded={isOpen}
      aria-owns={listId}
      aria-haspopup="listbox"
    >
      <input
        className="w-full bg-zinc-800/60 border border-zinc-700 rounded-md px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        placeholder={placeholder}
        value={q}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => q && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={
          isOpen && suggestions[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined
        }
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg"
        >
          {suggestions.map((s, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={isActive}
                key={`${s.ticker}-${idx}`}
                className={`w-full text-left px-3 py-2 text-sm cursor-pointer ${
                  isActive ? "bg-zinc-800" : "hover:bg-zinc-800"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()} // keep focus
                onClick={() => commit(s.ticker)}
              >
                <span className="font-medium mr-2">{s.ticker}</span>
                {s.name && <span className="text-zinc-400">{s.name}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}



