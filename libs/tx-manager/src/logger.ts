import { createLogger, format, Logger, LoggerOptions, transports } from 'winston';

export function getLogger(options: LoggerOptions): Logger {
  const defaultOptions: LoggerOptions = {
    level: 'info',
    format: format.simple(),
    defaultMeta: { service: 'tx-manager' },
    transports: [new transports.Console()]
  };

  const logger = createLogger({
    ...defaultOptions,
    ...options
  });

  return logger;
}
