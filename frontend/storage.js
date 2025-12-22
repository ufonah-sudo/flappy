// Только session cache, НЕ экономика

export const storage = {
  getInitData() {
    return window.Telegram.WebApp.initData;
  },

  getUser() {
    return window.Telegram.WebApp.initDataUnsafe?.user || null;
  }
};
