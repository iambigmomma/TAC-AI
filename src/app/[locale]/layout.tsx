import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import '../globals.css'; // Adjust path for globals.css
import { cn } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'sonner';
import ThemeProvider from '@/components/theme/Provider';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { routing } from '@/i18n/routing'; // Import routing object

const montserrat = Montserrat({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});

// Note: Metadata generation might need locale adjustment later
export const metadata: Metadata = {
  title: 'Perplexica', // Simplified title for now
  description:
    'Perplexica is an AI powered chatbot that is connected to the internet.',
};

// Needed for static generation with dynamic routes if used
export function generateStaticParams() {
  // Access locales via the imported routing object
  return routing.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  // Renamed to LocaleLayout for clarity
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = useMessages();

  return (
    <html className="h-full" lang={locale} suppressHydrationWarning>
      <body className={cn('h-full', montserrat.className)}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            {/* Sidebar now fetches pathname internally */}
            <Sidebar>{children}</Sidebar>
            <Toaster
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    'bg-light-primary dark:bg-dark-secondary dark:text-white/70 text-black-70 rounded-lg p-4 flex flex-row items-center space-x-2',
                },
              }}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
