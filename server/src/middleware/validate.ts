import { Request, Response, NextFunction } from "express";
import { z } from "zod/v4";

export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Datos inválidos",
        details: z.prettifyError(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
