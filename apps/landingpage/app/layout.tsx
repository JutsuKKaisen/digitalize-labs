import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
    title: "Digitalize Labs - Hệ thống số hóa hồ sơ pháp lý chuyên biệt có AI hỗ trợ",
    description:
        "Nền tảng quản trị dữ liệu pháp lý cấu trúc XML tiên phong tại Việt Nam, tích hợp AI chuyên sâu cho lĩnh vực Kinh doanh - Thương mại.",
    openGraph: {
        title: "Digitalize Labs - Đánh thức di sản số pháp lý",
        description:
            "Số hóa chuẩn, vững pháp lý. Tra cứu và rà soát rủi ro hợp đồng bằng AI trong 2 giây.",
        type: "website",
    },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} className="scroll-smooth" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <NextIntlClientProvider messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
