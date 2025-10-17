import { escapeMd } from './validator.js';
import { logger } from './logger.js';

export function Notifier(bot) {
  return {
    async sendToChat(chatId, text, options = {}) {
      try {
        await bot.telegram.sendMessage(chatId, text, {
          parse_mode: 'MarkdownV2',
          ...options
        });
        logger.debug({ chatId }, 'Message sent successfully');
      } catch (error) {
        logger.error({ chatId, error: error.message }, 'Failed to send message');
      }
    },
    
    async notifyStudentAndParents(studentRow, parentsRows, message) {
      const md = escapeMd(message);
      const tasks = [];
      
      if (studentRow?.TelegramID) {
        tasks.push(this.sendToChat(studentRow.TelegramID, md));
      }
      
      for (const parent of parentsRows || []) {
        if (parent?.TelegramID) {
          tasks.push(this.sendToChat(parent.TelegramID, md));
        }
      }
      
      await Promise.allSettled(tasks);
      logger.info({ count: tasks.length }, 'Notifications sent');
    }
  };
}
