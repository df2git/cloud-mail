import i18next from 'i18next';
import zh from './zh.js'
import zh_tw from './zh_tw.js'
import en from './en.js'
import app from '../hono/hono';

app.use('*', async (c, next) => {
	const acceptLang = c.req.header('accept-language') || ''
	let lang = 'zh'
	if (acceptLang.startsWith('zh-TW') || acceptLang.startsWith('zh-HK') || acceptLang.startsWith('zh-MO')) {
		lang = 'zh_tw'
	} else if (acceptLang.startsWith('zh')) {
		lang = 'zh'
	} else {
		lang = 'en'
	}
	i18next.init({
		lng: lang,
	});
	return await next()
})

const resources = {
	en: {
		translation: en
	},
	zh: {
		translation: zh,
	},
	zh_tw: {
		translation: zh_tw,
	},
};

i18next.init({
	fallbackLng: 'zh',
	resources,
});

export const t = (key, values) => i18next.t(key, values)

export default i18next;
