const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'mono-report-bot' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }),
        // Write all logs with level 'info' and below to 'data/app.log'
        new winston.transports.File({ 
            filename: path.join('data', 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // Write all logs with level 'error' and below to 'data/error.log'
        new winston.transports.File({ 
            filename: path.join('data', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Create data directory if it doesn't exist
const fs = require('fs');
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

module.exports = logger; 