import express from 'express';
import { verifyTelegramSecret, verifyGsInternalToken } from '../services/security.js';
import { ENV } from '../config/env.js';
import { AppCache } from '../services/cache.js';
import { escapeMd } from '../services/validator.js';
import { logger } from '../services/logger.js';

export function routes(bot) {
  const router = express.Router();

  // Health check for Render
  router.get('/health', (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cache: AppCache.stats()
    };
    
    res.json(health);
  });

  // Root endpoint
  router.get('/', (req, res) => {
    res.send('🎓 Kabou School Bot is Running');
  });

  // Telegram webhook
  router.post(
    ENV.WEBHOOK_PATH,
    verifyTelegramSecret,
    express.json(),
    async (req, res) => {
      try {
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
      } catch (error) {
        logger.error({ error: error.message }, 'Webhook processing error');
        res.sendStatus(500);
      }
    }
  );

  // Google Sheets notification webhook
  router.post(
    '/gs-hook',
    verifyGsInternalToken,
    express.json(),
    async (req, res) => {
      try {
        const { studentPhone, studentId, message, target } = req.body || {};

        if (!message || (!studentPhone && !studentId)) {
          return res.status(400).json({ error: 'Invalid payload' });
        }

        const students = await SheetsRepo.listStudentsCached(AppCache);
        let student;

        if (studentPhone) {
          student = students.find(s => s['الهاتف'] === studentPhone);
        }

        if (!student && studentId) {
          student = students.find(s => s['StudentID'] === studentId);
        }

        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }

        const parents = await SheetsRepo.listParentsCached(AppCache);
        const relatedParents = parents.filter(
          p => p['رقم ابن'] === student['الهاتف']
        );

        const md = escapeMd(message);
        const notifications = [];

        if (target === 'student' || target === 'both' || !target) {
          if (student['TelegramID']) {
            notifications.push(
              bot.telegram.sendMessage(student['TelegramID'], md, {
                parse_mode: 'MarkdownV2'
              })
            );
          }
        }

        if (target === 'parent' || target === 'both' || !target) {
          for (const parent of relatedParents) {
            if (parent['TelegramID']) {
              notifications.push(
                bot.telegram.sendMessage(parent['TelegramID'], md, {
                  parse_mode: 'MarkdownV2'
                })
              );
            }
          }
        }

        await Promise.allSettled(notifications);

        logger.info({
          studentId: student['StudentID'],
          notificationsSent: notifications.length
        }, 'Notifications sent from Google Sheets');

        res.json({ success: true, sent: notifications.length });

      } catch (error) {
        logger.error({ error: error.message }, 'GS webhook error');
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // 404 handler
  router.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return router;
}

