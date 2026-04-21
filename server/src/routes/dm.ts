import { Router, Request, Response } from 'express';
import { getOrCreateDm, getDmsForUserSafe } from '../db/queries';

const router = Router();

// Get all DM conversations for a user
router.get('/', (req: Request, res: Response) => {
  const username = req.query.username;

  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username query parameter is required' });
    return;
  }

  const dms = getDmsForUserSafe(username);
  res.json(dms);
});

// Create or get existing DM between two users
router.post('/', (req: Request, res: Response) => {
  const { user1, user2 } = req.body;

  if (!user1 || !user2 || typeof user1 !== 'string' || typeof user2 !== 'string') {
    res.status(400).json({ error: 'Both user1 and user2 are required' });
    return;
  }

  if (user1.trim() === user2.trim()) {
    res.status(400).json({ error: 'Cannot create a DM with yourself' });
    return;
  }

  const dm = getOrCreateDm(user1.trim(), user2.trim());
  res.status(201).json(dm);
});

export default router;
