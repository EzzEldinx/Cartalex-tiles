import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import compression from 'compression';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

// Import the new router and error handler
import router from './routes.js';
import { errorHandler } from './middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist_dir = path.join(__dirname, '..', '..', 'dist');

const app = express();
// in src/server/server.js
app.use(express.static('dist'));
app.use(express.static('public')); // <--- Ensure this line is present
app.use(morgan('dev'));

// Set the view engine and views directory correctly
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);
app.set('views', dist_dir);

// CORS configuration
const allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:5000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use(express.static(dist_dir));
app.use(compression());

// --- Use the new, corrected router for all API and page routes ---
// All the old, buggy middleware and route handlers that were here are now GONE.
app.use('/', router);

// Swagger setup
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App listening to ${port}....`);
    console.log('Press Ctrl+C to quit.');
});