"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AlertCircle, FolderOpen, Scale, FileSearch, Network, Clock, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export default function LandingPage() {
    const t = useTranslations("LandingPage");
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [headerScrolled, setHeaderScrolled] = useState(false);
    const [currentLocale, setCurrentLocale] = useState("vi");
    const [hasMounted, setHasMounted] = useState(false);

    // Sticky header + hydration guard
    useEffect(() => {
        setHasMounted(true);
        const onScroll = () => setHeaderScrolled(window.scrollY > 50);
        window.addEventListener("scroll", onScroll);
        setCurrentLocale(document.cookie.includes("NEXT_LOCALE=en") ? "en" : "vi");
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const toggleLang = () => {
        const nextLocale = currentLocale === "en" ? "vi" : "en";
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
        setCurrentLocale(nextLocale);
        router.refresh();
    };

    // Close modal on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && modalOpen) setModalOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [modalOpen]);

    const showToast = () => {
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 4000);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        const form = e.currentTarget;
        const formData = {
            name: (form.elements.namedItem("name") as HTMLInputElement).value,
            email: (form.elements.namedItem("email") as HTMLInputElement).value,
            phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
            company: (form.elements.namedItem("company") as HTMLInputElement).value,
            interest: (form.elements.namedItem("demand") as HTMLSelectElement).value,
        };

        try {
            const res = await fetch("/api/trial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                showToast();
                form.reset();
                setModalOpen(false);
            }
        } catch (err) {
            console.error("Submit error:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const challenges = [
        { titleKey: "challenge1Title", descKey: "challenge1Desc", color: "red", icon: <AlertCircle className="w-6 h-6 text-red-500" /> },
        { titleKey: "challenge2Title", descKey: "challenge2Desc", color: "orange", icon: <FolderOpen className="w-6 h-6 text-orange-500" /> },
        { titleKey: "challenge3Title", descKey: "challenge3Desc", color: "yellow", icon: <Scale className="w-6 h-6 text-yellow-500" /> },
        { titleKey: "challenge4Title", descKey: "challenge4Desc", color: "gray", icon: <FileSearch className="w-6 h-6 text-gray-500" /> },
        { titleKey: "challenge5Title", descKey: "challenge5Desc", color: "blue", icon: <Network className="w-6 h-6 text-blue-500" /> },
        { titleKey: "challenge6Title", descKey: "challenge6Desc", color: "purple", icon: <Clock className="w-6 h-6 text-purple-500" /> },
    ];

    const coreValues = [
        { badge: "XML", titleKey: "core1Title", descKey: "core1Desc" },
        { badge: "AI", titleKey: "core2Title", descKey: "core2Desc" },
        { badge: "DATA", titleKey: "core3Title", descKey: "core3Desc" },
        { badge: "REV", titleKey: "core4Title", descKey: "core4Desc" },
        { badge: "LAW", titleKey: "core5Title", descKey: "core5Desc" },
        { badge: "SEC", titleKey: "core6Title", descKey: "core6Desc" },
    ];

    const features = [
        { titleKey: "feature1Title", descKey: "feature1Desc" },
        { titleKey: "feature2Title", descKey: "feature2Desc" },
        { titleKey: "feature3Title", descKey: "feature3Desc" },
        { titleKey: "feature4Title", descKey: "feature4Desc" },
        { titleKey: "feature5Title", descKey: "feature5Desc" },
        { titleKey: "feature6Title", descKey: "feature6Desc" },
    ];

    const apps = [
        { emoji: "🏛️", labelKey: "app1" },
        { emoji: "🏦", labelKey: "app2" },
        { emoji: "🏗️", labelKey: "app3" },
        { emoji: "🎓", labelKey: "app4" },
        { emoji: "🏥", labelKey: "app5" },
        { emoji: "🛒", labelKey: "app6" },
        { emoji: "🏭", labelKey: "app7" },
        { emoji: "⚖️", labelKey: "app8" },
    ];

    // Prevent hydration mismatch: show skeleton until client mount
    if (!hasMounted) {
        return <div className="min-h-screen bg-white" />;
    }

    return (
        <>
            {/* Header */}
            <header
                className={`fixed w-full top-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-sm border-b border-gray-100 ${headerScrolled ? "shadow-md" : ""}`}
            >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                            <img src="/assets/logo-main.jpg" alt="Digitalize Labs Logo" className="h-10 w-auto" />
                            <span className="font-bold text-2xl text-slate-800 tracking-tight">
                                Digitalize<span className="text-primary">Labs</span>
                            </span>
                        </div>

                        <nav className="hidden md:flex space-x-8 items-center">
                            <a href="#loi-ich" className="text-slate-600 hover:text-primary font-medium transition">{t("navCore")}</a>
                            <a href="#tinh-nang" className="text-slate-600 hover:text-primary font-medium transition">{t("navFeatures")}</a>
                            <a href="#khach-hang" className="text-slate-600 hover:text-primary font-medium transition">{t("navUtilities")}</a>
                            <a href="#bang-gia" className="text-slate-600 hover:text-primary font-medium transition">{t("navPricing")}</a>
                            <button onClick={toggleLang} className="text-slate-600 hover:text-primary transition flex items-center gap-1 ml-4 border-l border-gray-200 pl-4" title={t("langHover")}>
                                <Globe size={18} /> {t("langToggle")}
                            </button>
                        </nav>

                        <div className="flex items-center gap-4">
                            <button onClick={() => setModalOpen(true)} className="hidden md:inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-blue-700 shadow-md transition-all hover:-translate-y-0.5">
                                {t("registerTrial")}
                            </button>
                            <button onClick={toggleLang} className="md:hidden p-2 text-slate-600">
                                <Globe size={20} />
                            </button>
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <a href="#loi-ich" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-gray-50">{t("navCore")}</a>
                            <a href="#tinh-nang" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-gray-50">{t("navFeatures")}</a>
                            <a href="#khach-hang" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-primary hover:bg-gray-50">{t("navUtilities")}</a>
                            <button onClick={() => { setModalOpen(true); setMobileMenuOpen(false); }} className="w-full text-left block px-3 py-2 mt-4 text-base font-medium text-white bg-primary rounded-md">{t("registerTrial")}</button>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
                        <div className="lg:col-span-5 text-center lg:text-left mb-12 lg:mb-0">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-semibold uppercase tracking-wide mb-6">
                                {t("heroBadge")}
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                                {t("heroTitle1")} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{t("heroTitle2")}</span>
                            </h1>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                {t("heroDesc")}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <button onClick={() => setModalOpen(true)} className="px-8 py-3.5 rounded-lg bg-primary text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1">
                                    {t("btnPoC")}
                                </button>
                                <a href="#tinh-nang" className="px-8 py-3.5 rounded-lg bg-white text-slate-700 border border-slate-200 font-semibold hover:bg-gray-50 hover:text-primary transition-all">
                                    {t("btnFeatures")}
                                </a>
                            </div>
                            <p className="mt-4 text-sm text-slate-500 flex items-center justify-center lg:justify-start gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                {t("bullet1")}
                                <svg className="w-4 h-4 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                {t("bullet2")}
                            </p>
                        </div>
                        <div className="lg:col-span-7 relative">
                            <div className="relative rounded-xl shadow-2xl border border-gray-200 bg-white p-2 animate-fade-in-up">
                                <img src="/assets/hero-product.png" alt={t("heroImgAlt")} className="w-full h-auto rounded-lg" loading="lazy" />
                                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-xl border border-gray-100 hidden md:block">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t("heroAiSearch")}</p>
                                            <p className="font-bold text-gray-800">{t("heroAiTime")}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 -right-4 -z-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                            <div className="absolute -bottom-8 left-20 -z-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Challenges */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("challengesTitle")}</h2>
                        <p className="text-slate-600">{t("challengesDesc")}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {challenges.map((item) => (
                            <div key={item.titleKey} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition h-full flex flex-col">
                                <div className={`w-12 h-12 bg-${item.color}-100 rounded-lg flex items-center justify-center mb-6`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">{t(item.titleKey)}</h3>
                                <p className="text-slate-500 flex-1">{t(item.descKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="py-20 bg-white" id="loi-ich">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("coreTitle")}</h2>
                        <div className="w-20 h-1 bg-primary mx-auto rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreValues.map((item) => (
                            <div key={item.badge} className="p-6 border border-gray-200 rounded-2xl hover:border-primary transition group bg-white">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-primary transition duration-300">{item.badge}</div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-2 text-slate-800">{t(item.titleKey)}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{t(item.descKey)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="lg:flex items-center justify-between gap-12">
                        <div className="lg:w-1/2 mb-10 lg:mb-0">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("statsTitle")}</h2>
                            <ul className="space-y-6">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mt-1">
                                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-xl font-bold text-green-400">{t("stat1Title")}</h4>
                                        <p className="text-slate-300 text-sm mt-1">{t("stat1Desc")}</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mt-1">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-xl font-bold">{t("stat2Title")}</h4>
                                        <p className="text-slate-300 text-sm mt-1">{t("stat2Desc")}</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mt-1">
                                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-xl font-bold">{t("stat3Title")}</h4>
                                        <p className="text-slate-300 text-sm mt-1">{t("stat3Desc")}</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="lg:w-1/2">
                            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-slate-400 text-sm">{t("statsOcrLabel")}</p>
                                        <p className="text-3xl font-bold text-white">99.9%</p>
                                    </div>
                                    <div className="text-green-400 text-sm font-semibold">{t("statsOcrBadge")}</div>
                                </div>
                                <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden mb-6">
                                    <div className="bg-gradient-to-r from-primary to-secondary w-[99%] h-full rounded-full" />
                                </div>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-slate-400 text-sm">{t("statsSpeedLabel")}</p>
                                        <p className="text-3xl font-bold text-white">{t("statsSpeedValue")}</p>
                                    </div>
                                    <div className="text-green-400 text-sm font-semibold">{t("statsSpeedBadge")}</div>
                                </div>
                                <div className="w-full bg-slate-700 h-4 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-500 to-green-300 w-[95%] h-full rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-gray-50" id="tinh-nang">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("featuresTitle")}</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">{t("featuresDesc")}</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                        {features.map((item) => (
                            <div key={item.titleKey} className="flex gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm text-primary">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{t(item.titleKey)}</h4>
                                    <p className="text-sm text-slate-600 mt-2">{t(item.descKey)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Applications */}
            <section className="py-20 bg-gray-50" id="khach-hang">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">{t("appsTitle")}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {apps.map((item) => (
                            <div key={item.emoji} className="bg-white p-6 rounded-lg text-center hover:shadow-lg transition cursor-pointer group">
                                <span className="text-4xl mb-3 block group-hover:scale-110 transition">{item.emoji}</span>
                                <h4 className="font-bold text-slate-800 text-sm">{t(item.labelKey)}</h4>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 bg-white" id="bang-gia">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t("pricingTitle")}</h2>
                        <p className="text-slate-600">{t("pricingDesc")}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-primary transition group relative">
                            <h3 className="text-xl font-bold text-slate-800">Starter</h3>
                            <p className="text-3xl font-bold text-primary my-4">{t("starterPrice")} <span className="text-sm text-slate-500 font-normal">{t("pricingPerMonth")}</span></p>
                            <ul className="space-y-3 mb-8 text-sm text-slate-600">
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("starterF1")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("starterF2")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("starterF3")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("starterF4")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("starterF5")}</li>
                            </ul>
                            <button onClick={() => setModalOpen(true)} className="w-full py-2 border border-primary text-primary rounded font-semibold group-hover:bg-primary group-hover:text-white transition">{t("starterBtn")}</button>
                        </div>
                        <div className="bg-white p-8 rounded-xl border-2 border-primary shadow-lg relative transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">{t("pricingRecommended")}</div>
                            <h3 className="text-xl font-bold text-slate-800">Enterprise</h3>
                            <p className="text-3xl font-bold text-primary my-4">{t("enterprisePrice")} <span className="text-sm text-slate-500 font-normal">{t("pricingPerMonth")}</span></p>
                            <ul className="space-y-3 mb-8 text-sm text-slate-600">
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("enterpriseF1")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("enterpriseF2")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("enterpriseF3")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("enterpriseF4")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("enterpriseF5")}</li>
                            </ul>
                            <button onClick={() => setModalOpen(true)} className="w-full py-3 bg-primary text-white rounded font-semibold hover:bg-blue-700 transition shadow-lg">{t("enterpriseBtn")}</button>
                        </div>
                        <div className="bg-white p-8 rounded-xl border border-gray-200 hover:border-primary transition group">
                            <h3 className="text-xl font-bold text-slate-800">Business Standard</h3>
                            <p className="text-3xl font-bold text-primary my-4">{t("businessPrice")} <span className="text-sm text-slate-500 font-normal">{t("pricingPerMonth")}</span></p>
                            <ul className="space-y-3 mb-8 text-sm text-slate-600">
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("businessF1")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("businessF2")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("businessF3")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("businessF4")}</li>
                                <li className="flex items-center"><span className="text-green-500 mr-2">✔</span> {t("businessF5")}</li>
                            </ul>
                            <button onClick={() => setModalOpen(true)} className="w-full py-2 border border-primary text-primary rounded font-semibold group-hover:bg-primary group-hover:text-white transition">{t("businessBtn")}</button>
                        </div>
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-6" dangerouslySetInnerHTML={{ __html: t.raw("pricingNote") }} />
                </div>
            </section>

            {/* FAQ */}
            <FAQSection />

            {/* CTA */}
            <section className="py-20 bg-primary text-white text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">{t("ctaTitle")}</h2>
                    <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">{t("ctaDesc")}</p>
                    <button onClick={() => setModalOpen(true)} className="px-10 py-4 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition shadow-xl transform hover:scale-105">
                        {t("registerTrial")}
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
                <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <span className="font-bold text-2xl text-white tracking-tight block mb-4">
                            Digitalize<span className="text-primary">Labs</span>
                        </span>
                        <p className="mb-4 max-w-sm">{t("footerDesc")}</p>
                        <div className="flex space-x-4">
                            <a href="https://www.facebook.com/profile.php?id=61588659746027" className="hover:text-white">Facebook</a>
                            <a href="#" className="hover:text-white">LinkedIn</a>
                            <a href="#" className="hover:text-white">Youtube</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">{t("footerProducts")}</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#tinh-nang" className="hover:text-primary">{t("footerAiFeatures")}</a></li>
                            <li><a href="#loi-ich" className="hover:text-primary">{t("footerSecurity")}</a></li>
                            <li><a href="#khach-hang" className="hover:text-primary">{t("footerLegalTools")}</a></li>
                            <li><a href="#bang-gia" className="hover:text-primary">{t("footerQuote")}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-4">{t("footerContact")}</h4>
                        <ul className="space-y-2 text-sm">
                            <li>{t("footerProject")}</li>
                            <li>{t("footerDept")}</li>
                            <li>{t("footerUniv")}</li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-sm">
                    <p>{t("footerCopy")}</p>
                </div>
            </footer>

            {/* Trial Registration Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={() => setModalOpen(false)} />
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl leading-6 font-bold text-gray-900">{t("modalTitle")}</h3>
                                        <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <form id="demo-form" className="space-y-4" onSubmit={handleSubmit}>
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t("modalName")}</label>
                                            <input type="text" id="name" name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t("modalEmail")}</label>
                                                <input type="email" id="email" name="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2" />
                                            </div>
                                            <div>
                                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t("modalPhone")}</label>
                                                <input type="tel" id="phone" name="phone" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="company" className="block text-sm font-medium text-gray-700">{t("modalCompany")}</label>
                                            <input type="text" id="company" name="company" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2" />
                                        </div>
                                        <div>
                                            <label htmlFor="demand" className="block text-sm font-medium text-gray-700">{t("modalInterest")}</label>
                                            <select id="demand" name="demand" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2 bg-white">
                                                <option value="store">{t("modalOpt1")}</option>
                                                <option value="dispatch">{t("modalOpt2")}</option>
                                                <option value="digitize">{t("modalOpt3")}</option>
                                                <option value="process">{t("modalOpt4")}</option>
                                            </select>
                                        </div>
                                        <div className="flex items-start mt-4">
                                            <div className="flex items-center h-5">
                                                <input id="policy" name="policy" type="checkbox" required className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded" />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="policy" className="font-medium text-gray-700">{t("modalPolicy")}</label>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <button type="submit" disabled={submitting} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition ${submitting ? "opacity-75 cursor-not-allowed" : ""}`}>
                                                {submitting ? <><span className="spinner" /> {t("modalSubmitting")}</> : t("modalSubmit")}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            <div className={`fixed bottom-5 right-5 z-[101] transform transition-all duration-300 ${toastVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}`}>
                <div className="bg-slate-800 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <div>
                        <h4 className="font-bold text-sm">{t("toastTitle")}</h4>
                        <p className="text-xs text-slate-300">{t("toastDesc")}</p>
                    </div>
                </div>
            </div>
        </>
    );
}

function FAQSection() {
    const t = useTranslations("LandingPage");
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const faqs = [
        { q: t("faq1Q"), a: t("faq1A") },
        { q: t("faq2Q"), a: t("faq2A") },
        { q: t("faq3Q"), a: t("faq3A") },
        { q: t("faq4Q"), a: t("faq4A") },
    ];

    return (
        <section className="py-20 bg-gray-50 border-t border-gray-100">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">{t("faqTitle")}</h2>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full px-6 py-4 text-left font-semibold text-slate-800 bg-white hover:bg-gray-50 flex justify-between items-center focus:outline-none"
                            >
                                <span>{faq.q}</span>
                                <span className={`transform transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}>▼</span>
                            </button>
                            {openIndex === i && (
                                <div className="px-6 py-4 text-slate-600 bg-white">{faq.a}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
