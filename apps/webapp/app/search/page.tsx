"use client";

import React, { useState } from "react";
import { Topbar, Button } from "@/components/ui/LayoutComponents";
import { Search as SearchIcon, FileText, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function SearchPage() {
  const t = useTranslations("Search");
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: () => api.search(searchTerm),
    enabled: searchTerm.length > 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  return (
    <div className="flex flex-col h-screen bg-background transition-colors duration-300">
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative shadow-sm">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("placeholder")}
              className="w-full bg-card border border-border rounded-lg py-4 pl-12 pr-24 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="absolute right-2 top-2 bottom-2">
              {t("button")}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {isLoading && (
            <div className="text-center text-muted-foreground">
              {t("searching")}
            </div>
          )}

          {data?.results.map((result, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                  <FileText size={14} />
                  {result.docTitle}
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground">
                    Page {result.pageNo}
                  </span>
                </div>
                <Link
                  href={`/doc/${result.docId}/view`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                >
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div
                className="text-muted-foreground text-sm leading-relaxed font-serif"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </div>
          ))}

          {data?.results.length === 0 && (
            <div className="text-center text-muted-foreground mt-12 bg-muted/50 p-8 rounded-lg border border-border">
              {t("noResults")} &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
