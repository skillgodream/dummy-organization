import type { Request, Response } from 'express';
import { getEvidenceHandler } from '../../src/api/routes.js';

export default function handler(req: Request, res: Response) {
  return getEvidenceHandler(req, res);
}
