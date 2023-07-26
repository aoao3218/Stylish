import winston from 'winston';
import morgan from 'morgan';
import dotenv from "dotenv";
import WinstonCloudWatch from "winston-cloudwatch";
dotenv.config();

const loggerMorgan = new winston.createLogger({
    format: winston.format.json(),
  });
  
const loggerConsole = new winston.createLogger({
    format: winston.format.json(),
  });

  if (process.env.NODE_ENV === "production") {
    const cloudwatchConfig = {
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP,
      awsOptions: {
        credentials: {
          accessKeyId: process.env.CLOUDWATCH_ACCESS_KEY,
          secretAccessKey: process.env.CLOUDWATCH_SECRET_ACCESS_KEY,
        },
        region: process.env.CLOUDWATCH_REGION,
      },
      messageFormatter: ({ level, message }) => `${message}`,
    };
  
    loggerMorgan.add(
      new WinstonCloudWatch({
        ...cloudwatchConfig,
        logStreamName: process.env.CLOUDWATCH_STREAM_MORGAN,
      })
    );
    loggerConsole.add(
      new WinstonCloudWatch({
        ...cloudwatchConfig,
        logStreamName: process.env.CLOUDWATCH_STREAM_CONSOLE,
      })
    );
  }
  
  export default {
    writeMorgan: (message) => loggerMorgan.log("info", message),
    writeConsole: (message) => loggerConsole.log("info", message),
  };
  