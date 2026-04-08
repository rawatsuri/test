import { NextFunction, Request, Response } from 'express';

import { CreateUserBodyInput, UpdateUserInput } from '../schemas/user.schema';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  create = async (
    req: Request<{ tenantId: string }, {}, CreateUserBodyInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const result = await this.userService.createUser({ ...req.body, tenantId });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request<{ tenantId: string; userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId, userId } = req.params;
      const result = await this.userService.getTenantUserById(tenantId, userId);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getAll = async (
    req: Request<{ tenantId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const result = await this.userService.getUsersByTenant(tenantId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request<{ tenantId: string; userId: string }, {}, UpdateUserInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId, userId } = req.params;
      const result = await this.userService.updateUser(tenantId, userId, req.body);

      if (!result.success) {
        res.status(result.error === 'User not found' ? 404 : 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request<{ tenantId: string; userId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId, userId } = req.params;
      const result = await this.userService.deleteUser(tenantId, userId);

      if (!result.success) {
        res.status(result.error === 'User not found' ? 404 : 400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
