import express from 'express';
import cookieParser from 'cookie-parser';
import adminRouter from './routes/admin.js';
import productsRouter from './routes/products.js';
import userRouter from './routes/user.js';
import marketingRouter from './routes/marketing.js';
import Router from './routes/index.js';
import dashboardRouter from './routes/dashboard.js';
import APIRouter from './routes/api.js';
import { rateLimiter } from './model/redis.js';
import morgan from 'morgan';
import cloudwatch from './utils/logger.js';

const app = express();
const SSLPORT = 3000;
const port = 3001;

// const privateKey = fs.readFileSync('private.key', 'utf8');
// const certificate = fs.readFileSync('certificate.crt', 'utf8');
// const server = https.createServer(
//   {
//     key: privateKey,
//     cert: certificate,
//   },
//   app
// );

// const server = createServer({
//     key: readFileSync('../etc/nginx/ssl/private.key'),
//     cert: readFileSync('../etc/nginx/ssl/cert.crt'),
// });

app.set('view engine', 'ejs');
app.set('trust proxy', true);

//log console
console.log = cloudwatch.writeConsole;

//log morgan
app.use(
    morgan('Morgan - :method :status :remote-addr HTTP/:http-version (:response-time ms) => :url', {
        stream: {
            write: (line) => {
                cloudwatch.writeMorgan(line);
            },
        },
    }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(rateLimiter);
app.use('/', Router);
app.use('/user', userRouter);
app.use('/admin', adminRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/marketing', marketingRouter);
app.use('/api', APIRouter);
app.use('/dashboard', dashboardRouter);

app.use((req, res, next) => {
    const err = new Error('Not found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    if (err.status) {
        const status = err.status;
        const msg = err.message;
        return res.render('error', { status, msg });
    }
    return res.status(500).send({ error: err.message });
});

// Start the web server
app.listen(port, () => {
    console.log(`Web server running on port ${port}`);
});
// server.listen(SSLPORT, function () {
//   console.log('HTTPS Server is running on: https://localhost:%s', SSLPORT);
// });
