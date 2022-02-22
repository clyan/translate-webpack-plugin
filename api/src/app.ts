import Fastify from 'fastify';
import PagePool from './pagepool';
import puppeteer from './puppeteer';

const fastify = Fastify({ logger: true });

const { PUPPETEER_WS_ENDPOINT, PAGE_COUNT = '5', PORT = 8999 } = process.env;

(async () => {
  const browser = PUPPETEER_WS_ENDPOINT
    ? await puppeteer.connect({ browserWSEndpoint: PUPPETEER_WS_ENDPOINT })
    : await puppeteer.launch({ headless: true });

  console.log('connected');

  console.log('initializing pages...');
  await new PagePool(browser, parseInt(PAGE_COUNT, 10)).init();

  console.log('ready');

  fastify.register(require('./routers/api').default, { prefix: '/api' });
  fastify.register(require('./routers/api').post, { prefix: '/api/post' });
  fastify.register(require('./routers/index').default, { prefix: '/' });

  try {
    await fastify.listen(PORT, '127.0.0.1');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
