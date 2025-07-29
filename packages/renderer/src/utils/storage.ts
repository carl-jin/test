interface StoredData<T> {
  value: T;
  expiresIn: number; // 过期时间戳
}

class Storage {
  static setItem<T>(key: string, value: T, expiresInMinutes = 0): void {
    const data: StoredData<T> = {
      value,
      expiresIn: 0, // 默认情况下，永不过期
    };

    if (expiresInMinutes > 0) {
      const expirationDate = new Date().getTime() + expiresInMinutes * 60 * 1000;
      data.expiresIn = expirationDate;
    }

    localStorage.setItem(key, JSON.stringify(data));
  }

  static getItem<T>(key: string, defaultValue: T): T {
    const storedData = localStorage.getItem(key);

    if (!storedData) {
      return defaultValue;
    }

    const data: StoredData<T> = JSON.parse(storedData);

    if (data.expiresIn > 0 && new Date().getTime() > data.expiresIn) {
      // 数据已过期
      localStorage.removeItem(key);
      return defaultValue;
    }

    return data.value;
  }

  static setObject<T>(key: string, value: T, expiresInMinutes = 0): void {
    this.setItem(key, value, expiresInMinutes);
  }

  static getObject<T>(key: string, defaultValue: T = {} as T): T {
    const storedValue = this.getItem<StoredData<T>>(key, undefined as any);

    if (storedValue) {
      try {
        return storedValue.value;
      } catch (error) {
        console.error('Error parsing JSON data:', error);
      }
    }

    return defaultValue;
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }
}

export default Storage;
