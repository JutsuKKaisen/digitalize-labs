"use client";

import React, { useState } from "react";
import { UploadCloud, File, ArrowRight } from "lucide-react";
import { Topbar, Button } from "@/components/ui/LayoutComponents";
import { Link, useRouter } from "@/lib/router-shim";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function Home() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { push } = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0])
      setFile(e.dataTransfer.files[0]);
  };

  const simulateUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      toast.success("File uploaded successfully!");
      setFile(null);
      push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const t = useTranslations("Home");
  const tSidebar = useTranslations("Sidebar");
  const tTopbar = useTranslations("Topbar");

  return (
    <div className="flex flex-col h-screen bg-background transition-colors duration-300">
      <Topbar>
        <h1 className="text-lg font-semibold text-foreground">
          {tSidebar("home")}
        </h1>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="mb-12 text-center pt-8">
          <h2 className="text-4xl font-bold text-foreground mb-6 tracking-tight leading-snug">
            {t("title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${dragActive ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(59,130,246,0.2)]" : "border-border hover:border-primary/50 bg-card"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => e.target.files && setFile(e.target.files[0])}
          />

          <div className="flex flex-col items-center pointer-events-none">
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                    <File size={32} />
                  </div>
                  <p className="text-xl font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                    <UploadCloud size={32} />
                  </div>
                  <p className="text-xl font-medium text-foreground">
                    {t("uploadPrompt")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("supportedFormats")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 flex flex-col items-center"
            >
              <Button
                size="lg"
                onClick={simulateUpload}
                disabled={uploading}
                className="shadow-lg shadow-primary/20 relative overflow-hidden"
              >
                <span className="relative z-10">
                  {uploading ? t("ingesting") : t("startProcessing")}
                </span>
                {uploading && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-primary-foreground/20 z-0"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                  />
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/dashboard"
            className="group p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-foreground font-semibold text-lg group-hover:text-primary transition-colors">
                {t("dashboardTitle")}
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground">{t("dashboardDesc")}</p>
          </Link>

          <Link
            href="/graph"
            className="group p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-foreground font-semibold text-lg group-hover:text-primary transition-colors">
                {t("graphTitle")}
              </span>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-muted-foreground">{t("graphDesc")}</p>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-center text-center">
            <span className="font-semibold text-primary">{t("metric1")}</span>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-center text-center">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {t("metric2")}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium border border-border">
            {t("keyword1")}
          </span>
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium border border-border">
            {t("keyword2")}
          </span>
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium border border-border">
            {t("keyword3")}
          </span>
        </div>

        <footer className="mt-20 pt-8 border-t border-border text-center text-xs text-muted-foreground pb-8">
          {t("footer")}
        </footer>
      </div>
    </div>
  );
}
