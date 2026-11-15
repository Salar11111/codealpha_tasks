import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Newsletter from '../models/Newsletter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.post(
  '/',
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    try {
      await Newsletter.updateOne(
        { email: req.body.email },
        { $setOnInsert: { email: req.body.email, source: String(req.body.source || 'footer') } },
        { upsert: true }
      );
    } catch {
      // A concurrent subscribe for the same address is fine.
    }
    res.status(201).json({ ok: true, message: 'You are on the list.' });
  })
);

export default router;
