import { createLogger, format, Logger, LoggerOptions, transports } from 'winston';

export function getLogger(options: LoggerOptions): Logger {
  const colorizer = format.colorize();
  const defaultOptions: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    format: format.combine(
      format.timestamp(),
      format.simple(),
      format.printf((msg) =>
        colorizer.colorize(msg.level, `${msg.timestamp} - ${msg.level}[${msg.service}]: ${msg.message}`)
      )
    ),
    defaultMeta: { service: 'alphavantage-fetcher' },
    transports: [new transports.Console()]
  };

  const logger = createLogger({
    ...defaultOptions,
    ...options
  });

  return logger;
}
