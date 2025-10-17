import pino from 'pino';
import { ENV } from '../config/env.js';

const transport = ENV.IS_PRODUCTION 
  ? undefined 
  : { target: 'pino-pretty', options: { colorize: true } };

export const logger = pino({
  level: ENV.IS_PRODUCTION ? 'info' : 'debug',
  transport
});
