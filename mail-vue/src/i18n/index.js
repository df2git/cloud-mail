import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
import zh_tw from './zh_tw.js'
const i18n = createI18n({
    legacy: false,
    messages: {
        zh,
        en,
        zh_tw
    },
});

export default i18n;