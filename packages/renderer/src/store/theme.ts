import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeStore {
  isDarkMode: boolean;
  toggleTheme: (isDark: boolean) => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: (isDark) => set((state) => ({ isDarkMode: isDark })),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// 订阅状态变化并更新 body 的 theme 属性
useThemeStore.subscribe((state) => {
  document.body.setAttribute('theme', state.isDarkMode ? 'dark' : 'light');
});

// 初始化时设置 body 的 theme 属性
const initializeTheme = () => {
  const { isDarkMode } = useThemeStore.getState();
  document.body.setAttribute('theme', isDarkMode ? 'dark' : 'light');
};

initializeTheme();

export default useThemeStore;
