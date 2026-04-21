import { Router, Request, Response } from 'express';
import { getMessages, getRoomById } from '../db/queries';

const router = Router();

router.get('/:roomId/messages', (req: Request<{ roomId: string }>, res: Response) => {
  const roomId = req.params.roomId;
  const beforeParam = req.query.before;
  const before = typeof beforeParam === 'string' ? parseInt(beforeParam, 10) : undefined;

  if (!getRoomById(roomId)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (before !== undefined && (isNaN(before) || before < 1)) {
    res.status(400).json({ error: 'Invalid "before" parameter' });
    return;
  }

  const result = getMessages(roomId, before);
  res.json(result);
});

export default router;
