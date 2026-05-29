<template>
  <el-config-provider :locale="elLocale">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch, computed } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import zhTw from 'element-plus/es/locale/lang/zh-tw';
import('@/icons/index.js')
const { locale } = useI18n()
const elLocale = computed(() => {
  if (settingStore.lang === 'zh') return zhCn
  if (settingStore.lang === 'zh_tw') return zhTw
  return null
})
locale.value = settingStore.lang
watch(() => settingStore.lang, () => locale.value = settingStore.lang)
</script>
