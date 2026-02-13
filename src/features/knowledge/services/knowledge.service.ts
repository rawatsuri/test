import { KnowledgeItem, Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '../../../config/prisma.config';
import { CreateKnowledgeItemInput, UpdateKnowledgeItemInput } from '../schemas/knowledge.schema';

export class KnowledgeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaService.getInstance().client;
  }

  async create(
    tenantId: string,
    data: CreateKnowledgeItemInput,
  ): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
    try {
      const item = await this.prisma.knowledgeItem.create({
        data: {
          tenantId,
          title: data.title,
          content: data.content,
          category: data.category,
        },
      });

      return { success: true, data: item };
    } catch (error) {
      console.error('Error creating knowledge item:', error);
      return { success: false, error: 'Failed to create knowledge item' };
    }
  }

  async findById(
    id: string,
    tenantId: string,
  ): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
    try {
      const item = await this.prisma.knowledgeItem.findFirst({
        where: { id, tenantId },
      });

      if (!item) {
        return { success: false, error: 'Knowledge item not found' };
      }

      return { success: true, data: item };
    } catch (error) {
      console.error('Error finding knowledge item:', error);
      return { success: false, error: 'Failed to find knowledge item' };
    }
  }

  async findByTenant(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
    },
  ): Promise<{ success: boolean; data?: KnowledgeItem[]; total?: number; error?: string }> {
    try {
      const where: any = { tenantId };

      if (options?.category) {
        where.category = options.category;
      }

      const [items, total] = await Promise.all([
        this.prisma.knowledgeItem.findMany({
          where,
          skip: options?.page && options?.limit ? (options.page - 1) * options.limit : undefined,
          take: options?.limit,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.knowledgeItem.count({ where }),
      ]);

      return { success: true, data: items, total };
    } catch (error) {
      console.error('Error listing knowledge items:', error);
      return { success: false, error: 'Failed to list knowledge items' };
    }
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateKnowledgeItemInput,
  ): Promise<{ success: boolean; data?: KnowledgeItem; error?: string }> {
    try {
      const existing = await this.prisma.knowledgeItem.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return { success: false, error: 'Knowledge item not found' };
      }

      const item = await this.prisma.knowledgeItem.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.content && { content: data.content }),
          ...(data.category !== undefined && { category: data.category }),
        },
      });

      return { success: true, data: item };
    } catch (error) {
      console.error('Error updating knowledge item:', error);
      return { success: false, error: 'Failed to update knowledge item' };
    }
  }

  async delete(id: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.prisma.knowledgeItem.findFirst({
        where: { id, tenantId },
      });
      if (!existing) {
        return { success: false, error: 'Knowledge item not found' };
      }

      await this.prisma.knowledgeItem.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      return { success: false, error: 'Failed to delete knowledge item' };
    }
  }

  /**
   * Search knowledge items using pgvector similarity search
   * Requires vector embeddings to be stored
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 5,
  ): Promise<{ success: boolean; data?: KnowledgeItem[]; error?: string }> {
    try {
      // Full-text ranking with ILIKE fallback in one query.
      const rows = await this.prisma.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`
        SELECT k.id
        FROM "KnowledgeItem" k
        WHERE k."tenantId" = ${tenantId}
          AND (
            to_tsvector('simple', COALESCE(k.title, '') || ' ' || COALESCE(k.content, ''))
            @@ plainto_tsquery('simple', ${query})
            OR k.title ILIKE ${`%${query}%`}
            OR k.content ILIKE ${`%${query}%`}
          )
        ORDER BY
          ts_rank(
            to_tsvector('simple', COALESCE(k.title, '') || ' ' || COALESCE(k.content, '')),
            plainto_tsquery('simple', ${query})
          ) DESC,
          k."updatedAt" DESC
        LIMIT ${limit};
      `);

      const ids = rows.map(row => row.id);
      if (ids.length === 0) {
        return { success: true, data: [] };
      }

      const items = await this.prisma.knowledgeItem.findMany({
        where: {
          tenantId,
          id: { in: ids },
        },
      });

      const orderIndex = new Map(ids.map((id, index) => [id, index]));
      items.sort(
        (a: KnowledgeItem, b: KnowledgeItem) =>
          (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
      );

      return { success: true, data: items };
    } catch (error) {
      console.error('Error searching knowledge:', error);
      return { success: false, error: 'Failed to search knowledge' };
    }
  }

  /**
   * Get knowledge items formatted for Vocode context
   */
  async getContextForVocode(
    tenantId: string,
    query?: string,
  ): Promise<{ success: boolean; context?: string; error?: string }> {
    try {
      let items: KnowledgeItem[];

      if (query) {
        const result = await this.search(tenantId, query, 10);
        if (!result.success) {
          return { success: false, error: result.error };
        }
        items = result.data || [];
      } else {
        const result = await this.findByTenant(tenantId, { limit: 10 });
        if (!result.success) {
          return { success: false, error: result.error };
        }
        items = result.data || [];
      }

      // Format as context string
      const context = items.map(item => `${item.title}: ${item.content}`).join('\n\n');

      return { success: true, context };
    } catch (error) {
      console.error('Error getting Vocode context:', error);
      return { success: false, error: 'Failed to get context' };
    }
  }
}
