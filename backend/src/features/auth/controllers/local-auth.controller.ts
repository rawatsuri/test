import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { generateToken } from '../../../middleware/auth.middleware';

type LoginBody = {
  email: string;
  password: string;
};

function buildSessionUser(user: {
  id: string;
  tenantId: string;
  email: string;
  role: string;
}) {
  return {
    accountNo: user.tenantId,
    email: user.email,
    role: [user.role],
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
}

export class LocalAuthController {
  private prisma = PrismaService.getInstance().client;

  login = async (
    req: Request<{}, {}, LoginBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const email = req.body.email?.trim().toLowerCase();
      const password = req.body.password ?? '';

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const matches = await this.prisma.user.findMany({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
          active: true,
        },
      });

      if (matches.length !== 1) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      const user = matches[0];

      if (!user.passwordHash) {
        res.status(401).json({
          success: false,
          error: 'This user does not have local password login enabled',
        });
        return;
      }

      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      const token = generateToken(user.id, user.tenantId, user.role);
      res.status(200).json({
        success: true,
        data: {
          token,
          user: buildSessionUser(user),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user || !user.active) {
        res.status(401).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: buildSessionUser(user),
      });
    } catch (error) {
      next(error);
    }
  };
}
