// import winston from 'winston'

// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.errors({ stack: true }),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.simple()
//       )
//     }),
//     new winston.transports.File({
//       filename: 'logs/error.log',
//       level: 'error'
//     }),
//     new winston.transports.File({
//       filename: 'logs/combined.log'
//     })
//   ]
// })

// export default logger




import winston from 'winston'

// Vercel (and most serverless platforms) have a read-only filesystem,
// except for /tmp. File-based logging would crash the app on startup,
// so only enable file transports when running in a normal server environment.
const isServerless = !!process.env.VERCEL

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
]

if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  )
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
})

export default logger