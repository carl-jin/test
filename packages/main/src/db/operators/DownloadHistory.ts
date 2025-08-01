import { DownloadHistory } from '../entity/DownloadHistory.entity';
import { DataSource, Repository } from 'typeorm';
import { basename } from 'path';

export class DownloadHistoryOperator {
  Repository: Repository<DownloadHistory>;
  AppDataSource: DataSource;

  constructor(source: DataSource) {
    this.AppDataSource = source;
    this.Repository = this.AppDataSource.getRepository(DownloadHistory);
  }

  /**
   * 获取所有下载历史记录
   */
  async getAll(): Promise<DownloadHistory[]> {
    return (
      await this.Repository.find({
        order: {
          createdAt: 'DESC', // 按创建时间倒序排列
        },
      })
    ).map((file) => {
      return {
        ...file,
        filename: basename(file.filePath),
      };
    });
  }

  /**
   * 添加新的下载历史记录
   */
  async add(downloadHistory: Pick<DownloadHistory, 'filePath' | 'accountEmail'>): Promise<void> {
    await this.Repository.save({
      ...downloadHistory,
    });
  }

  /**
   * 根据ID删除特定的下载历史记录
   */
  async deleteById(id: number): Promise<void> {
    await this.Repository.delete(id);
  }

  /**
   * 删除所有下载历史记录
   */
  async deleteAll(): Promise<void> {
    await this.Repository.clear();
  }
}
