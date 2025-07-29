import { Settings } from '../entity/Settings.entity';
import { DataSource, Repository, In } from 'typeorm';
import { lowDb } from '@main/lowdb';
import { SettingsType } from '../types';
import { taskManager } from '@main/modules/taskManager';

export class SettingsOperator {
  Repository: Repository<Settings>;
  AppDataSource: DataSource;

  constructor(source: DataSource) {
    this.AppDataSource = source;
    this.Repository = this.AppDataSource.getRepository(Settings);
  }

  async getSettings(): Promise<SettingsType> {
    const settings = lowDb.get('settings').value();
    return settings;
  }

  async updateSettings(settings: SettingsType): Promise<void> {
    const oldSettings = lowDb.get('settings').value();
    lowDb.set('settings', { ...oldSettings, ...settings }).write();
  }

  async updateRunFlag(runFlag: boolean): Promise<void> {
    const oldSettings = lowDb.get('settings').value();
    lowDb.set('settings', { ...oldSettings, runFlag }).write();

    if (runFlag) {
      taskManager.enable();
    } else {
      taskManager.disable();
    }
  }
}
