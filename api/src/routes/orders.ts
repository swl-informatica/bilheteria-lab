import { Router } from 'express';
import { currentUser, requireAuth } from '../auth';
import {
  cancelOrder,
  createOrder,
  getOrder,
  listOrders,
  payOrder,
  quoteOrder,
  refundQuote,
} from '../orders';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post('/quote', async (req, res) => {
  res.json(await quoteOrder(currentUser(req), req.body));
});

ordersRouter.post('/', async (req, res) => {
  res.json(await createOrder(currentUser(req), req.body));
});

ordersRouter.get('/', async (req, res) => {
  res.json(await listOrders(currentUser(req)));
});

ordersRouter.get('/:id', async (req, res) => {
  res.json(await getOrder(currentUser(req), req.params.id));
});

ordersRouter.post('/:id/payment', async (req, res) => {
  console.info(`Pagamento do pedido ${req.params.id}: ${JSON.stringify(req.body)}`);
  res.json(await payOrder(currentUser(req), req.params.id, req.body));
});

ordersRouter.get('/:id/refund-quote', async (req, res) => {
  res.json(await refundQuote(currentUser(req), req.params.id));
});

ordersRouter.post('/:id/cancel', async (req, res) => {
  res.json(await cancelOrder(currentUser(req), req.params.id));
});
