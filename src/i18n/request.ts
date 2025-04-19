import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from './routing'; // Import routing config

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a promise, so we need to await it
  const requestedLocale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  // If the resolved locale is different from the requested one (e.g., fallback),
  // and the requested one wasn't empty, maybe show notFound or log.
  // For simplicity, we trust hasLocale correctly gives us a valid locale.
  // if (!locale) {
  //   notFound();
  // }

  try {
    // Load messages for the determined locale
    // Path is now ../../messages because this file is inside src/i18n/
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return {
      locale,
      messages,
    };
  } catch (error) {
    console.error(`Could not load messages for locale "${locale}":`, error);
    // If messages fail to load for a valid locale, show not found.
    notFound();
  }
});
