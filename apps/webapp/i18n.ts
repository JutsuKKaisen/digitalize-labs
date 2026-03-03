import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
    // Read locale from cookie, set vi as default.
    // Using typical locale cookie. This allows the client Language Switcher to toggle without sub-paths.
    const localeCookie = cookies().get('NEXT_LOCALE')?.value;
    const locale = localeCookie === 'en' ? 'en' : 'vi';

    return {
        locale,
        messages: (await import(`./messages/${locale}.json`)).default
    };
});
